"""
NCCT Ecosystem Demo Seed Script
Ensures the 4 EXACT memorable demo credentials exist with Ravi Kumar's full journey:
  - Trainee:  demo.trainee@ncct.gov.in  / Demo@123 (Ravi Kumar - complete journey, cert issued)
  - Trainer:  demo.trainer@ncct.gov.in  / Demo@123
  - Admin:    demo.admin@ncct.gov.in    / Demo@123
  - Employer: demo.employer@ncct.gov.in / Demo@123 (with active job posting & Ravi matched)

Usage:
    python -m scripts.demo_seed
"""

import sys
from datetime import datetime, timedelta
from typing import Dict, Any

from app.database import SessionLocal
from app.models import (
    User, UserRole, TraineeProfile, Institution,
    TrainingProgramme, Batch, Module, ContentItem, Progress,
    Quiz, Question, QuizAttempt,
    Skill, CourseSkillMap, Attendance,
    Assessment, AssessmentQuestion, AssessmentResult,
    JobRole, JobRoleSkillRequirement, JobPosting,
    Certificate, SkillPassport
)
from app.security import hash_password
from app.services.certificate_service import check_and_issue_certificate
from app.services.skill_passport_service import get_skill_passport


def seed_demo_accounts():
    db = SessionLocal()
    try:
        print("\n=======================================================")
        print("  NCCT ECOSYSTEM: SEEDING MEMORABLE DEMO CREDENTIALS")
        print("=======================================================\n")

        DEMO_PASSWORD = "Demo@123"
        hashed_demo_pw = hash_password(DEMO_PASSWORD)

        # -------------------------------------------------------------
        # 1. INSTITUTION & TRAINING PROGRAMME
        # -------------------------------------------------------------
        inst = db.query(Institution).filter(
            Institution.name == "Regional Cooperative Training Institute, Chennai"
        ).first()
        if not inst:
            inst = Institution(
                name="Regional Cooperative Training Institute, Chennai",
                code="RCTI-CHN",
                location="Chennai, Tamil Nadu"
            )
            db.add(inst)
            db.commit()
            db.refresh(inst)

        # -------------------------------------------------------------
        # 2. DEMO ADMIN
        # -------------------------------------------------------------
        admin_email = "demo.admin@ncct.gov.in"
        admin = db.query(User).filter(User.email == admin_email).first()
        if not admin:
            admin = User(
                name="NCCT Central Administrator (Demo)",
                email=admin_email,
                hashed_password=hashed_demo_pw,
                role=UserRole.ADMIN
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            print(f"  + Demo Admin created: {admin.email} (ID: {admin.id})")
        else:
            admin.hashed_password = hashed_demo_pw
            db.commit()
            print(f"  = Demo Admin password updated: {admin.email}")

        # -------------------------------------------------------------
        # 3. DEMO TRAINER
        # -------------------------------------------------------------
        trainer_email = "demo.trainer@ncct.gov.in"
        trainer = db.query(User).filter(User.email == trainer_email).first()
        if not trainer:
            trainer = User(
                name="Dr. K. Ramanathan (Demo Trainer)",
                email=trainer_email,
                hashed_password=hashed_demo_pw,
                role=UserRole.TRAINER
            )
            db.add(trainer)
            db.commit()
            db.refresh(trainer)
            print(f"  + Demo Trainer created: {trainer.email} (ID: {trainer.id})")
        else:
            trainer.hashed_password = hashed_demo_pw
            db.commit()
            print(f"  = Demo Trainer password updated: {trainer.email}")

        # -------------------------------------------------------------
        # 4. TRAINING PROGRAMME & BATCH
        # -------------------------------------------------------------
        prog_title = "Cooperative Accounting and Digital ERP"
        prog = db.query(TrainingProgramme).filter(
            TrainingProgramme.title == prog_title
        ).first()
        if not prog:
            prog = TrainingProgramme(
                title=prog_title,
                description="Comprehensive professional certification covering double-entry bookkeeping, cooperative accounting acts, statutory ERP reconciliation, and GST compliance.",
                institution_id=inst.id,
                trainer_id=trainer.id,
                start_date="2025-01-10",
                end_date="2025-04-10"
            )
            db.add(prog)
            db.commit()
            db.refresh(prog)

        batch_name = "Batch-2025-01"
        batch = db.query(Batch).filter(
            Batch.programme_id == prog.id,
            Batch.batch_name == batch_name
        ).first()
        if not batch:
            batch = Batch(
                programme_id=prog.id,
                batch_name=batch_name
            )
            db.add(batch)
            db.commit()
            db.refresh(batch)

        # -------------------------------------------------------------
        # 5. DEMO TRAINEE (Ravi Kumar - Full Journey)
        # -------------------------------------------------------------
        trainee_email = "demo.trainee@ncct.gov.in"
        trainee = db.query(User).filter(User.email == trainee_email).first()
        if not trainee:
            trainee = User(
                name="Ravi Kumar",
                email=trainee_email,
                hashed_password=hashed_demo_pw,
                role=UserRole.TRAINEE
            )
            db.add(trainee)
            db.commit()
            db.refresh(trainee)
            print(f"  + Demo Trainee created: {trainee.name} ({trainee.email})")
        else:
            trainee.name = "Ravi Kumar"
            trainee.hashed_password = hashed_demo_pw
            db.commit()
            print(f"  = Demo Trainee updated: {trainee.name} ({trainee.email})")

        # Trainee Profile
        profile = db.query(TraineeProfile).filter(TraineeProfile.user_id == trainee.id).first()
        if not profile:
            profile = TraineeProfile(
                user_id=trainee.id,
                trainee_id="NCCT-TR-2026-DEMO01",
                institution="Regional Cooperative Training Institute, Chennai",
                course_enrolled="Cooperative Accounting and Digital ERP",
                education="B.Com",
                preferred_language="Tamil",
                previous_skills=["Basic Accounting", "General Office Tools"]
            )
            db.add(profile)
            db.commit()
            db.refresh(profile)
            print(f"  + Trainee Profile created: {profile.trainee_id}")
        else:
            profile.institution = "Regional Cooperative Training Institute, Chennai"
            profile.course_enrolled = "Cooperative Accounting and Digital ERP"
            db.commit()

        # Batch enrollment
        if profile not in batch.trainees:
            batch.trainees.append(profile)
            db.commit()
            print(f"  + Trainee assigned to Batch: {batch.batch_name}")

        # -------------------------------------------------------------
        # 6. COURSE MODULES & 100% PROGRESS
        # -------------------------------------------------------------
        modules = db.query(Module).filter(Module.programme_id == prog.id).order_by(Module.order).all()
        for mod in modules:
            items = db.query(ContentItem).filter(ContentItem.module_id == mod.id).all()
            for itm in items:
                prg = db.query(Progress).filter(
                    Progress.trainee_id == trainee.id,
                    Progress.content_item_id == itm.id
                ).first()
                if not prg:
                    prg = Progress(
                        trainee_id=trainee.id,
                        module_id=mod.id,
                        content_item_id=itm.id,
                        status="completed",
                        completed_at=datetime.utcnow() - timedelta(days=15)
                    )
                    db.add(prg)
                else:
                    prg.status = "completed"
                    prg.completed_at = datetime.utcnow() - timedelta(days=15)
        db.commit()
        print("  + Course Progress: 100% completed for Ravi Kumar")

        # -------------------------------------------------------------
        # 7. ATTENDANCE SESSIONS (~88.9%)
        # -------------------------------------------------------------
        base_date = datetime.utcnow().date() - timedelta(days=14)
        for i in range(9):
            session_date = (base_date + timedelta(days=i)).isoformat()
            status = "ABSENT" if i == 4 else "PRESENT"
            existing_att = db.query(Attendance).filter(
                Attendance.trainee_id == trainee.id,
                Attendance.session_id == f"DEMO-SESSION-{i+1}"
            ).first()
            if not existing_att:
                att = Attendance(
                    trainee_id=trainee.id,
                    trainee_profile_id=profile.id,
                    session_id=f"DEMO-SESSION-{i+1}",
                    programme_id=prog.id,
                    date=session_date,
                    status=status,
                    device_id="ESP32-NODE-CHN-01",
                    synced_from="hardware"
                )
                db.add(att)
        db.commit()
        print("  + Attendance seeded: 8 of 9 sessions (~88.9% attendance)")

        # -------------------------------------------------------------
        # 8. SKILLS & ASSESSMENT RESULTS (Acc=88%, ERP=52%, GST=48%, Comm=65%, Excel=85%)
        # -------------------------------------------------------------
        skills_dict: Dict[str, Skill] = {}
        for s in db.query(Skill).all():
            skills_dict[s.name] = s

        assessment = db.query(Assessment).filter(Assessment.course_id == prog.id).first()
        if not assessment:
            assessment = db.query(Assessment).first()

        if assessment:
            spec_scores = {
                str(skills_dict["Accounting"].id): {
                    "skill_id": skills_dict["Accounting"].id,
                    "skill_name": "Accounting",
                    "marks_obtained": 88,
                    "total_marks": 100,
                    "percentage": 88.0
                },
                str(skills_dict["ERP"].id): {
                    "skill_id": skills_dict["ERP"].id,
                    "skill_name": "ERP",
                    "marks_obtained": 52,
                    "total_marks": 100,
                    "percentage": 52.0
                },
                str(skills_dict["GST"].id): {
                    "skill_id": skills_dict["GST"].id,
                    "skill_name": "GST",
                    "marks_obtained": 48,
                    "total_marks": 100,
                    "percentage": 48.0
                },
                str(skills_dict["Communication"].id): {
                    "skill_id": skills_dict["Communication"].id,
                    "skill_name": "Communication",
                    "marks_obtained": 65,
                    "total_marks": 100,
                    "percentage": 65.0
                },
                str(skills_dict["Excel"].id): {
                    "skill_id": skills_dict["Excel"].id,
                    "skill_name": "Excel",
                    "marks_obtained": 85,
                    "total_marks": 100,
                    "percentage": 85.0
                }
            }

            res = db.query(AssessmentResult).filter(
                AssessmentResult.trainee_id == trainee.id,
                AssessmentResult.assessment_id == assessment.id
            ).first()
            if not res:
                res = AssessmentResult(
                    trainee_id=trainee.id,
                    assessment_id=assessment.id,
                    skill_wise_score=spec_scores,
                    overall_score=68,
                    total_marks_earned=338,
                    total_marks_possible=500,
                    answers={f"q_{i}": 0 for i in range(1, 21)},
                    submitted_at=datetime.utcnow() - timedelta(days=2)
                )
                db.add(res)
            else:
                res.skill_wise_score = spec_scores
                res.overall_score = 68
                res.total_marks_earned = 338
                res.total_marks_possible = 500
            db.commit()
            print("  + Assessment Result: Acc=88%, ERP=52%, GST=48%, Comm=65%, Excel=85% (Overall 68%)")

        # -------------------------------------------------------------
        # 9. CERTIFICATE ISSUANCE
        # -------------------------------------------------------------
        cert_id = "NCCT-CERT-2026-000101"
        cert = db.query(Certificate).filter(
            (Certificate.trainee_id == trainee.id) | (Certificate.certificate_id == cert_id)
        ).first()
        if not cert:
            cert = Certificate(
                certificate_id=cert_id,
                certificate_code=cert_id,
                trainee_id=trainee.id,
                programme_id=prog.id,
                course_id=prog.id,
                institution_id=inst.id,
                title="NCCT Certified Cooperative Accounting & Technology Practitioner",
                completion_date=datetime.utcnow() - timedelta(days=5),
                issued_date=datetime.utcnow() - timedelta(days=5),
                assessment_status="PASSED",
                issued_by="National Council for Cooperative Training (NCCT)",
                is_verified=True
            )
            db.add(cert)
            db.commit()
            db.refresh(cert)
            print(f"  + Certificate Issued & Verified: {cert.certificate_id}")
        else:
            cert.trainee_id = trainee.id
            cert.is_verified = True
            cert.assessment_status = "PASSED"
            db.commit()
            print(f"  = Certificate exists for trainee: {cert.certificate_id}")

        # -------------------------------------------------------------
        # 10. SKILL PASSPORT
        # -------------------------------------------------------------
        sp = db.query(SkillPassport).filter(SkillPassport.trainee_id == trainee.id).first()
        if not sp:
            sp = SkillPassport(
                trainee_id=trainee.id,
                passport_code=f"NCCT-SP-2026-{trainee.id:04d}"
            )
            db.add(sp)
            db.commit()
            print("  + Skill Passport registered for Ravi Kumar")

        # Trigger skill passport read to populate and cache
        get_skill_passport(trainee.id, db)

        # -------------------------------------------------------------
        # 11. DEMO EMPLOYER & ACTIVE JOB POSTING
        # -------------------------------------------------------------
        emp_email = "demo.employer@ncct.gov.in"
        emp = db.query(User).filter(User.email == emp_email).first()
        if not emp:
            emp = User(
                name="Tamil Nadu Apex Cooperative Bank (Demo Employer)",
                email=emp_email,
                hashed_password=hashed_demo_pw,
                role=UserRole.EMPLOYER
            )
            db.add(emp)
            db.commit()
            db.refresh(emp)
            print(f"  + Demo Employer created: {emp.name} ({emp.email})")
        else:
            emp.hashed_password = hashed_demo_pw
            db.commit()
            print(f"  = Demo Employer updated: {emp.name} ({emp.email})")

        job_role = db.query(JobRole).filter(JobRole.title == "Cooperative Accountant").first()

        posting_title = "Cooperative Accountant - Chennai Branch"
        posting = db.query(JobPosting).filter(
            JobPosting.employer_id == emp.id,
            JobPosting.title == posting_title
        ).first()
        if not posting:
            posting = JobPosting(
                employer_id=emp.id,
                job_role_id=job_role.id if job_role else 1,
                title=posting_title,
                description="We are seeking a qualified Cooperative Accountant to manage core ledger accounting, ERP reconciliations, and monthly GST filing for our Chennai main branch.",
                location="Chennai",
                is_active=True,
                status="ACTIVE",
                posted_at=datetime.utcnow() - timedelta(days=2)
            )
            db.add(posting)
            db.commit()
            db.refresh(posting)
            print(f"  + Demo Job Posting created: '{posting.title}' for Employer {emp.name}")
        else:
            posting.is_active = True
            posting.status = "ACTIVE"
            db.commit()
            print(f"  = Demo Job Posting verified: '{posting.title}'")

        print("\n=======================================================")
        print("  DEMO CREDENTIALS READY FOR LIVE STAGE PRESENTATION")
        print("=======================================================")
        print(f"1. Trainee:  {trainee_email} / {DEMO_PASSWORD}")
        print(f"2. Trainer:  {trainer_email} / {DEMO_PASSWORD}")
        print(f"3. Admin:    {admin_email} / {DEMO_PASSWORD}")
        print(f"4. Employer: {emp_email} / {DEMO_PASSWORD}")
        print(f"   Certificate: {cert.certificate_id} (Publicly Verifiable)")
        print(f"   Posting:     #{posting.id} - {posting.title}")
        print("=======================================================\n")

        return {
            "admin": admin,
            "trainer": trainer,
            "trainee": trainee,
            "employer": emp,
            "posting": posting,
            "certificate": cert
        }

    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_accounts()
