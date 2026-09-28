import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import Attendance, TraineeProfile, User, UserRole, TrainingProgramme
from app.schemas import (
    AttendanceMarkRequest, AttendanceMarkResponse,
    SyncBatchRequest, SyncBatchResponse,
    AttendanceRecordResponse, TraineeAttendanceSummary,
    SessionAttendanceResponse
)
from app.dependencies import get_current_user, require_role

router = APIRouter(prefix="/api/attendance", tags=["Attendance & Hardware Sync"])


def resolve_trainee_from_qr(db: Session, qr_content: str) -> Optional[TraineeProfile]:
    """
    Parses QR code string and matches against TraineeProfile.
    Supports raw Trainee ID (NCCT-TR-2026-00001), JSON payloads, emails, or numeric IDs.
    """
    trimmed = qr_content.strip()
    
    # Check if JSON payload
    if trimmed.startswith("{") and trimmed.endswith("}"):
        try:
            data = json.loads(trimmed)
            candidate = data.get("trainee_id") or data.get("id") or data.get("code")
            if candidate:
                trimmed = str(candidate).strip()
        except Exception:
            pass

    # 1. Match by unique trainee_id string
    profile = db.query(TraineeProfile).filter(TraineeProfile.trainee_id == trimmed).first()
    if profile:
        return profile

    # 2. Match by email
    user = db.query(User).filter(User.email.ilike(trimmed)).first()
    if user and user.trainee_profile:
        return user.trainee_profile

    # 3. Match by user ID if numeric
    if trimmed.isdigit():
        user = db.query(User).filter(User.id == int(trimmed)).first()
        if user and user.trainee_profile:
            return user.trainee_profile

    return None


@router.post("/mark", response_model=AttendanceMarkResponse)
def mark_attendance(
    req: AttendanceMarkRequest,
    db: Session = Depends(get_db)
):
    """
    Validates trainee QR code, checks for duplicate scans, and records check-in.
    Returns buzzer-style response code: OK (success), DUPLICATE (already scanned), or INVALID.
    """
    profile = resolve_trainee_from_qr(db, req.trainee_qr_code)
    if not profile:
        return AttendanceMarkResponse(
            status="INVALID",
            buzzer="BEEP_ERROR",
            message=f"Invalid Trainee QR Code: '{req.trainee_qr_code}' does not match any registered trainee.",
            trainee_id=None,
            trainee_name=None
        )

    # Determine check-in timestamp and date
    check_in_dt = datetime.utcnow()
    if req.timestamp:
        try:
            check_in_dt = datetime.fromisoformat(req.timestamp.replace("Z", "+00:00")).replace(tzinfo=None)
        except Exception:
            check_in_dt = datetime.utcnow()

    date_str = check_in_dt.strftime("%Y-%m-%d")
    session_id = req.session_id or "SESSION-MAIN"

    # Check for duplicate scan on this date for this session (or exact matching timestamp)
    existing = db.query(Attendance).filter(
        Attendance.trainee_id == profile.user_id,
        Attendance.session_id == session_id,
        (Attendance.date == date_str) | (Attendance.check_in_time == check_in_dt)
    ).first()

    if existing:
        return AttendanceMarkResponse(
            status="DUPLICATE",
            buzzer="BEEP_WARN",
            message=f"Attendance already marked for {profile.user.name} today at {existing.check_in_time.strftime('%H:%M:%S')}",
            trainee_id=profile.trainee_id,
            trainee_name=profile.user.name,
            check_in_time=existing.check_in_time,
            attendance_id=existing.id,
            synced_from=existing.synced_from
        )

    # Determine sync source
    is_hardware = "ESP" in req.device_id.upper() or "NODE" in req.device_id.upper()
    synced_from = "hardware" if is_hardware else "web"

    attendance = Attendance(
        trainee_id=profile.user_id,
        trainee_profile_id=profile.id,
        session_id=session_id,
        programme_id=req.programme_id,
        date=date_str,
        check_in_time=check_in_dt,
        device_id=req.device_id,
        synced_from=synced_from,
        status="PRESENT"
    )
    db.add(attendance)
    db.commit()
    db.refresh(attendance)

    return AttendanceMarkResponse(
        status="OK",
        buzzer="BEEP_SUCCESS",
        message=f"Check-in verified: {profile.user.name} ({profile.trainee_id})",
        trainee_id=profile.trainee_id,
        trainee_name=profile.user.name,
        check_in_time=attendance.check_in_time,
        attendance_id=attendance.id,
        synced_from=synced_from
    )


@router.post("/sync-batch", response_model=SyncBatchResponse)
def sync_batch_attendance(
    req: SyncBatchRequest,
    db: Session = Depends(get_db)
):
    """
    Accepts an array of offline-queued attendance records (e.g. from an ESP32-S3 hardware gateway
    or Kiosk Simulator IndexedDB queue) and batch inserts them, safely skipping duplicates
    (idempotent on trainee_id + session_id + timestamp/date).
    """
    synced_count = 0
    duplicate_count = 0
    invalid_count = 0
    results: List[AttendanceMarkResponse] = []
    seen_in_batch = set()

    for item in req.records:
        batch_key = (
            item.trainee_qr_code.strip(),
            (item.session_id or "SESSION-MAIN").strip(),
            item.timestamp.strip() if item.timestamp else ""
        )
        if batch_key in seen_in_batch:
            duplicate_count += 1
            results.append(AttendanceMarkResponse(
                status="DUPLICATE",
                buzzer="BEEP_WARN",
                message=f"Duplicate attendance record in batch for '{item.trainee_qr_code}' at {item.timestamp}",
                trainee_id=item.trainee_qr_code,
                synced_from="hardware" if ("ESP" in item.device_id.upper() or "NODE" in item.device_id.upper()) else "web"
            ))
            continue
        seen_in_batch.add(batch_key)

        mark_req = AttendanceMarkRequest(
            device_id=item.device_id,
            trainee_qr_code=item.trainee_qr_code,
            timestamp=item.timestamp,
            session_id=item.session_id,
            programme_id=item.programme_id
        )
        res = mark_attendance(mark_req, db)
        results.append(res)

        if res.status == "OK":
            synced_count += 1
        elif res.status == "DUPLICATE":
            duplicate_count += 1
        else:
            invalid_count += 1

    return SyncBatchResponse(
        synced_count=synced_count,
        duplicate_count=duplicate_count,
        invalid_count=invalid_count,
        results=results
    )


@router.get("/trainee/{id}", response_model=TraineeAttendanceSummary)
def get_trainee_attendance(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns attendance history and overall percentage for a trainee.
    Accepts 'me', user integer ID, or Trainee ID string (NCCT-TR-2026-00001).
    """
    target_user: Optional[User] = None
    if id == "me":
        target_user = current_user
    elif id.isdigit():
        target_user = db.query(User).filter(User.id == int(id)).first()
    else:
        profile = db.query(TraineeProfile).filter(TraineeProfile.trainee_id == id).first()
        if profile:
            target_user = profile.user

    if not target_user:
        raise HTTPException(status_code=404, detail=f"Trainee '{id}' not found")

    profile = db.query(TraineeProfile).filter(TraineeProfile.user_id == target_user.id).first()
    trainee_code = profile.trainee_id if profile else f"TR-{target_user.id}"
    institution = profile.institution if profile else None

    # Query attendance records
    records = db.query(Attendance).filter(
        Attendance.trainee_id == target_user.id
    ).order_by(desc(Attendance.check_in_time)).all()

    attended_count = len(records)
    # Determine scheduled sessions for this trainee's enrolled programme if available
    programme_id = records[0].programme_id if (records and records[0].programme_id) else None
    if not programme_id and profile and profile.course_enrolled:
        prog = db.query(TrainingProgramme).filter(TrainingProgramme.title == profile.course_enrolled).first()
        if prog:
            programme_id = prog.id

    programme_sessions = 0
    if programme_id:
        programme_sessions = db.query(Attendance.session_id).filter(
            Attendance.programme_id == programme_id
        ).distinct().count()

    total_sessions = max(programme_sessions, attended_count) if programme_sessions > 0 else max(10, attended_count)
    attendance_pct = round((attended_count / total_sessions * 100), 1) if total_sessions > 0 else 0.0

    history: List[AttendanceRecordResponse] = [
        AttendanceRecordResponse(
            id=r.id,
            trainee_id=trainee_code,
            trainee_name=target_user.name,
            session_id=r.session_id,
            date=r.date,
            check_in_time=r.check_in_time,
            device_id=r.device_id,
            synced_from=r.synced_from,
            status=r.status,
            institution=institution
        ) for r in records
    ]

    return TraineeAttendanceSummary(
        trainee_id=trainee_code,
        name=target_user.name,
        institution=institution,
        total_sessions=total_sessions,
        attended_sessions=attended_count,
        attendance_percentage=attendance_pct,
        records=history
    )


@router.get("/session/{session_id}", response_model=SessionAttendanceResponse)
def get_session_attendance(
    session_id: str,
    date: Optional[str] = Query(default=None, description="Optional filter by date YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns full attendance list for a specific training session.
    """
    query = db.query(Attendance).filter(Attendance.session_id == session_id)
    if date:
        query = query.filter(Attendance.date == date)

    records = query.order_by(desc(Attendance.check_in_time)).all()
    target_date = date or (records[0].date if records else datetime.utcnow().strftime("%Y-%m-%d"))

    attendees: List[AttendanceRecordResponse] = []
    for r in records:
        t_name = r.trainee.name if r.trainee else "Trainee"
        t_id = r.trainee_profile.trainee_id if r.trainee_profile else f"TR-{r.trainee_id}"
        t_inst = r.trainee_profile.institution if r.trainee_profile else None

        attendees.append(AttendanceRecordResponse(
            id=r.id,
            trainee_id=t_id,
            trainee_name=t_name,
            session_id=r.session_id,
            date=r.date,
            check_in_time=r.check_in_time,
            device_id=r.device_id,
            synced_from=r.synced_from,
            status=r.status,
            institution=t_inst
        ))

    return SessionAttendanceResponse(
        session_id=session_id,
        date=target_date,
        total_marked=len(attendees),
        attendees=attendees
    )


@router.get("/today", response_model=List[AttendanceRecordResponse])
def get_today_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns all attendance records recorded today across all sessions.
    """
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    records = db.query(Attendance).filter(Attendance.date == today_str).order_by(desc(Attendance.check_in_time)).all()

    results: List[AttendanceRecordResponse] = []
    for r in records:
        t_name = r.trainee.name if r.trainee else "Trainee"
        t_id = r.trainee_profile.trainee_id if r.trainee_profile else f"TR-{r.trainee_id}"
        t_inst = r.trainee_profile.institution if r.trainee_profile else None

        results.append(AttendanceRecordResponse(
            id=r.id,
            trainee_id=t_id,
            trainee_name=t_name,
            session_id=r.session_id,
            date=r.date,
            check_in_time=r.check_in_time,
            device_id=r.device_id,
            synced_from=r.synced_from,
            status=r.status,
            institution=t_inst
        ))
    return results
