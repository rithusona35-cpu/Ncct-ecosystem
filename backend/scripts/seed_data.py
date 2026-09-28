"""
NCCT Ecosystem Seed Data Script
Creates realistic baseline data matching the project spec's 'Ravi Kumar' example.
Idempotent: Safe to execute repeatedly without duplicating data or crashing.

Usage:
    python -m scripts.seed_data
"""

import sys
from datetime import datetime, timedelta
from typing import Dict, Any, List

from app.database import SessionLocal
from app.models import (
    User, UserRole, TraineeProfile, Institution,
    TrainingProgramme, Batch, Module, ContentItem, Progress,
    Quiz, Question, QuizAttempt,
    Skill, CourseSkillMap, Attendance,
    Assessment, AssessmentQuestion, AssessmentResult,
    JobRole, JobRoleSkillRequirement, JobPosting
)
from app.security import hash_password


def seed_all():
    db = SessionLocal()
    summary = {
        "admin": 0,
        "institutions": 0,
        "trainers": 0,
        "employers": 0,
        "trainees": 0,
        "programmes": 0,
        "modules": 0,
        "content_items": 0,
        "batches": 0,
        "skills": 0,
        "course_skill_maps": 0,
        "attendance": 0,
        "progress": 0,
        "assessments": 0,
        "assessment_questions": 0,
        "assessment_results": 0,
        "job_roles": 0,
        "job_postings": 0,
    }

    try:
        print("\n=======================================================")
        print("  NCCT ECOSYSTEM: SEEDING REALISTIC BASELINE DATA")
        print("=======================================================\n")

        # -------------------------------------------------------------
        # 1. USERS & ROLES
        # -------------------------------------------------------------
        print("[1/11] Seeding Users, Roles, and Institution...")

        # 1a. Admin
        admin_email = "admin@ncct.gov.in"
        admin = db.query(User).filter(User.email == admin_email).first()
        if not admin:
            admin = User(
                name="NCCT Central Administrator",
                email=admin_email,
                hashed_password=hash_password("admin123"),
                role=UserRole.ADMIN
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            summary["admin"] += 1
            print(f"  + Admin created: {admin.email} (ID: {admin.id})")
        else:
            print(f"  = Admin exists: {admin.email} (ID: {admin.id})")

        # 1b. Institution
        inst_name = "Regional Cooperative Training Institute, Chennai"
        inst = db.query(Institution).filter(Institution.name == inst_name).first()
        if not inst:
            inst = Institution(
                name=inst_name,
                code="RCTI-CHN",
                location="Chennai, Tamil Nadu"
            )
            db.add(inst)
            db.commit()
            db.refresh(inst)
            summary["institutions"] += 1
            print(f"  + Institution created: {inst.name} (Code: {inst.code})")
        else:
            print(f"  = Institution exists: {inst.name} (Code: {inst.code})")

        # 1c. 2 Trainers
        trainer1_email = "trainer1@ncct.gov.in"
        trainer1 = db.query(User).filter(User.email == trainer1_email).first()
        if not trainer1:
            trainer1 = User(
                name="Dr. K. Ramanathan",
                email=trainer1_email,
                hashed_password=hash_password("trainer123"),
                role=UserRole.TRAINER
            )
            db.add(trainer1)
            db.commit()
            db.refresh(trainer1)
            summary["trainers"] += 1
            print(f"  + Trainer 1 created: {trainer1.email} (ID: {trainer1.id})")
        else:
            print(f"  = Trainer 1 exists: {trainer1.email} (ID: {trainer1.id})")

        trainer2_email = "trainer2@ncct.gov.in"
        trainer2 = db.query(User).filter(User.email == trainer2_email).first()
        if not trainer2:
            trainer2 = User(
                name="Prof. S. Meenakshi",
                email=trainer2_email,
                hashed_password=hash_password("trainer123"),
                role=UserRole.TRAINER
            )
            db.add(trainer2)
            db.commit()
            db.refresh(trainer2)
            summary["trainers"] += 1
            print(f"  + Trainer 2 created: {trainer2.email} (ID: {trainer2.id})")
        else:
            print(f"  = Trainer 2 exists: {trainer2.email} (ID: {trainer2.id})")

        # 1d. 2 Employers
        employer1_email = "employer1@example.com"
        employer1 = db.query(User).filter(User.email == employer1_email).first()
        if not employer1:
            employer1 = User(
                name="Tamil Nadu State Apex Cooperative Bank",
                email=employer1_email,
                hashed_password=hash_password("employer123"),
                role=UserRole.EMPLOYER
            )
            db.add(employer1)
            db.commit()
            db.refresh(employer1)
            summary["employers"] += 1
            print(f"  + Employer 1 created: {employer1.name} ({employer1.email})")
        else:
            print(f"  = Employer 1 exists: {employer1.name} ({employer1.email})")

        employer2_email = "employer2@example.com"
        employer2 = db.query(User).filter(User.email == employer2_email).first()
        if not employer2:
            employer2 = User(
                name="Aavin District Cooperative Milk Producers Union",
                email=employer2_email,
                hashed_password=hash_password("employer123"),
                role=UserRole.EMPLOYER
            )
            db.add(employer2)
            db.commit()
            db.refresh(employer2)
            summary["employers"] += 1
            print(f"  + Employer 2 created: {employer2.name} ({employer2.email})")
        else:
            print(f"  = Employer 2 exists: {employer2.name} ({employer2.email})")

        # 1e. 1 Trainee (Ravi Kumar)
        trainee_email = "ravi.kumar@example.com"
        ravi = db.query(User).filter(User.email == trainee_email).first()
        if not ravi:
            ravi = User(
                name="Ravi Kumar",
                email=trainee_email,
                hashed_password=hash_password("trainee123"),
                role=UserRole.TRAINEE
            )
            db.add(ravi)
            db.commit()
            db.refresh(ravi)
            summary["trainees"] += 1
            print(f"  + Trainee created: {ravi.name} ({ravi.email})")
        else:
            print(f"  = Trainee exists: {ravi.name} ({ravi.email})")

        # -------------------------------------------------------------
        # 2. SKILLS
        # -------------------------------------------------------------
        print("\n[2/11] Seeding Skills...")
        skills_to_seed = [
            ("Accounting", "Technical"),
            ("Cooperative Accounting", "Technical"),
            ("ERP", "Technical"),
            ("Excel", "Technical"),
            ("GST", "Technical"),
            ("Communication", "Soft Skills"),
            ("Digital Literacy", "Domain"),
            ("Dairy Management", "Domain")
        ]
        skill_objects: Dict[str, Skill] = {}
        for s_name, s_cat in skills_to_seed:
            s_obj = db.query(Skill).filter(Skill.name == s_name).first()
            if not s_obj:
                s_obj = Skill(name=s_name, category=s_cat)
                db.add(s_obj)
                db.commit()
                db.refresh(s_obj)
                summary["skills"] += 1
                print(f"  + Skill created: {s_obj.name} (Category: {s_obj.category})")
            else:
                print(f"  = Skill exists: {s_obj.name}")
            skill_objects[s_name] = s_obj

        # -------------------------------------------------------------
        # 3. TRAINING PROGRAMME, MODULES, CONTENT & BATCH
        # -------------------------------------------------------------
        print("\n[3/11] Seeding Training Programme, Modules, and Batch...")
        prog_title = "Cooperative Accounting and Digital ERP"
        programme = db.query(TrainingProgramme).filter(
            TrainingProgramme.institution_id == inst.id,
            TrainingProgramme.trainer_id == trainer1.id
        ).first()

        if not programme:
            programme = TrainingProgramme(
                title=prog_title,
                description="Comprehensive professional certification covering double-entry cooperative accounting, digital ERP systems, and GST compliance standards.",
                institution_id=inst.id,
                trainer_id=trainer1.id,
                start_date="2025-01-05",
                end_date="2025-03-30"
            )
            db.add(programme)
            db.commit()
            db.refresh(programme)
            summary["programmes"] += 1
            print(f"  + Programme created: {programme.title} (ID: {programme.id}) by Trainer {trainer1.id}")
        else:
            programme.title = prog_title
            db.commit()
            print(f"  = Programme exists: {programme.title} (ID: {programme.id}) by Trainer {trainer1.id}")

        # 3 Modules with 1 video and 1 PDF content item each
        modules_def = [
            {
                "title": "Accounting Fundamentals",
                "order": 1,
                "skill_name": "Accounting",
                "items": [
                    {"type": "video", "title": "Double-Entry Bookkeeping for Cooperatives", "url": "https://ncct.gov.in/courses/acc-fund-lecture.mp4", "order": 1},
                    {"type": "pdf", "title": "Cooperative Accounting Principles Guide", "url": "https://ncct.gov.in/courses/acc-fund-guide.pdf", "order": 2},
                ]
            },
            {
                "title": "ERP Systems",
                "order": 2,
                "skill_name": "ERP",
                "items": [
                    {"type": "video", "title": "Digital ERP Architecture & Ledger Workflow", "url": "https://ncct.gov.in/courses/erp-systems-lecture.mp4", "order": 1},
                    {"type": "pdf", "title": "ERP System Implementation Manual", "url": "https://ncct.gov.in/courses/erp-manual.pdf", "order": 2},
                ]
            },
            {
                "title": "GST & Compliance",
                "order": 3,
                "skill_name": "GST",
                "items": [
                    {"type": "video", "title": "GST Filing & Statutory Compliance for PACS", "url": "https://ncct.gov.in/courses/gst-compliance-lecture.mp4", "order": 1},
                    {"type": "pdf", "title": "GST Reference Handbook for Cooperatives", "url": "https://ncct.gov.in/courses/gst-handbook.pdf", "order": 2},
                ]
            }
        ]

        module_objects: Dict[str, Module] = {}
        all_content_items: List[ContentItem] = []

        for m_def in modules_def:
            mod = db.query(Module).filter(
                Module.programme_id == programme.id,
                Module.title == m_def["title"]
            ).first()
            target_skill = skill_objects.get(m_def["skill_name"])

            if not mod:
                mod = Module(
                    programme_id=programme.id,
                    title=m_def["title"],
                    order=m_def["order"],
                    skill_id=target_skill.id if target_skill else None
                )
                db.add(mod)
                db.commit()
                db.refresh(mod)
                summary["modules"] += 1
                print(f"  + Module created: {mod.title} (Order: {mod.order})")
            else:
                if target_skill and not mod.skill_id:
                    mod.skill_id = target_skill.id
                    db.commit()
                print(f"  = Module exists: {mod.title} (ID: {mod.id})")

            module_objects[m_def["title"]] = mod

            # Seed items for this module
            for i_def in m_def["items"]:
                item = db.query(ContentItem).filter(
                    ContentItem.module_id == mod.id,
                    ContentItem.title == i_def["title"]
                ).first()
                if not item:
                    item = ContentItem(
                        module_id=mod.id,
                        type=i_def["type"],
                        title=i_def["title"],
                        url_or_file_path=i_def["url"],
                        order=i_def["order"]
                    )
                    db.add(item)
                    db.commit()
                    db.refresh(item)
                    summary["content_items"] += 1
                    print(f"    + Content Item created: {item.title} ({item.type})")
                else:
                    print(f"    = Content Item exists: {item.title}")
                all_content_items.append(item)

        # 1 Batch: Batch-2025-01
        batch_name = "Batch-2025-01"
        batch = db.query(Batch).filter(
            Batch.programme_id == programme.id,
            Batch.batch_name == batch_name
        ).first()
        if not batch:
            batch = Batch(
                programme_id=programme.id,
                batch_name=batch_name
            )
            db.add(batch)
            db.commit()
            db.refresh(batch)
            summary["batches"] += 1
            print(f"  + Batch created: {batch.batch_name} (ID: {batch.id})")
        else:
            print(f"  = Batch exists: {batch.batch_name} (ID: {batch.id})")

        # -------------------------------------------------------------
        # 4. RAVI'S TRAINEE PROFILE & BATCH ENROLLMENT
        # -------------------------------------------------------------
        print("\n[4/11] Seeding Ravi Kumar's Trainee Profile...")
        ravi_profile = db.query(TraineeProfile).filter(TraineeProfile.user_id == ravi.id).first()
        if not ravi_profile:
            ravi_profile = TraineeProfile(
                user_id=ravi.id,
                trainee_id="NCCT-TR-2025-00101",
                institution=inst.name,
                course_enrolled=programme.title,
                education="B.Com",
                preferred_language="Tamil",
                previous_skills=["Basic Accounting"],
                phone="+91 98765 43210",
                address="142 Anna Salai, Chennai, Tamil Nadu"
            )
            db.add(ravi_profile)
            db.commit()
            db.refresh(ravi_profile)
            print(f"  + TraineeProfile created for {ravi.name} (Trainee ID: {ravi_profile.trainee_id})")
        else:
            ravi_profile.institution = inst.name
            ravi_profile.course_enrolled = programme.title
            ravi_profile.education = "B.Com"
            ravi_profile.preferred_language = "Tamil"
            ravi_profile.previous_skills = ["Basic Accounting"]
            db.commit()
            print(f"  = TraineeProfile verified for {ravi.name} (Trainee ID: {ravi_profile.trainee_id})")

        # Enroll Ravi into Batch-2025-01
        if ravi_profile not in batch.trainees:
            batch.trainees.append(ravi_profile)
            db.commit()
            print(f"  + Enrolled {ravi.name} into {batch.batch_name}")
        else:
            print(f"  = {ravi.name} already enrolled in {batch.batch_name}")

        # -------------------------------------------------------------
        # 5. COURSE-SKILL MAPPING
        # -------------------------------------------------------------
        print("\n[5/11] Seeding Course-Skill Mappings...")
        # Map: Accounting Fundamentals -> Accounting, Cooperative Accounting
        # Map: ERP Systems -> ERP
        # Map: GST & Compliance -> GST
        mappings = [
            (programme.id, skill_objects["Accounting"].id, 2),
            (programme.id, skill_objects["Cooperative Accounting"].id, 2),
            (programme.id, skill_objects["ERP"].id, 2),
            (programme.id, skill_objects["GST"].id, 2),
        ]
        for c_id, s_id, w in mappings:
            existing_map = db.query(CourseSkillMap).filter(
                CourseSkillMap.course_id == c_id,
                CourseSkillMap.skill_id == s_id
            ).first()
            if not existing_map:
                c_map = CourseSkillMap(course_id=c_id, skill_id=s_id, weight=w)
                db.add(c_map)
                db.commit()
                summary["course_skill_maps"] += 1
                print(f"  + CourseSkillMap created: Course {c_id} -> Skill {s_id} (weight {w})")
            else:
                print(f"  = CourseSkillMap exists: Course {c_id} -> Skill {s_id}")

        # -------------------------------------------------------------
        # 6. ATTENDANCE (8 records for Ravi out of 9 total sessions -> ~88.9%)
        # -------------------------------------------------------------
        print("\n[6/11] Seeding Attendance Records (8 attended out of 9 sessions -> ~88.9%)...")
        session_dates = [
            ("SESSION-2025-01", "2025-01-10", "09:02:15"),
            ("SESSION-2025-02", "2025-01-12", "08:58:30"),
            ("SESSION-2025-03", "2025-01-15", "09:05:00"),
            ("SESSION-2025-04", "2025-01-17", "09:01:20"),
            ("SESSION-2025-05", "2025-01-19", "08:55:45"),
            ("SESSION-2025-06", "2025-01-22", "09:03:10"),
            ("SESSION-2025-07", "2025-01-24", "09:00:00"),
            ("SESSION-2025-08", "2025-01-26", "08:57:30"),
        ]

        for sess_id, s_date, s_time in session_dates:
            att = db.query(Attendance).filter(
                Attendance.trainee_id == ravi.id,
                Attendance.session_id == sess_id,
                Attendance.date == s_date
            ).first()
            if not att:
                check_in_dt = datetime.fromisoformat(f"{s_date}T{s_time}")
                att = Attendance(
                    trainee_id=ravi.id,
                    trainee_profile_id=ravi_profile.id,
                    session_id=sess_id,
                    programme_id=programme.id,
                    date=s_date,
                    check_in_time=check_in_dt,
                    device_id="ESP32-S3-GATE-01",
                    synced_from="hardware",
                    status="PRESENT"
                )
                db.add(att)
                db.commit()
                summary["attendance"] += 1
                print(f"  + Attendance record: {sess_id} on {s_date} at {s_time}")
            else:
                print(f"  = Attendance record exists: {sess_id} on {s_date}")

        # Ensure Session 9 exists in the programme schedule so total scheduled sessions = 9
        # (Session 9 was held on 2025-01-29; recorded for trainer or peer attendee)
        sess9_id = "SESSION-2025-09"
        sess9_date = "2025-01-29"
        sess9_record = db.query(Attendance).filter(
            Attendance.session_id == sess9_id,
            Attendance.programme_id == programme.id
        ).first()
        if not sess9_record:
            sess9_record = Attendance(
                trainee_id=trainer1.id,  # session conducted by trainer
                session_id=sess9_id,
                programme_id=programme.id,
                date=sess9_date,
                check_in_time=datetime.fromisoformat(f"{sess9_date}T09:00:00"),
                device_id="ESP32-S3-GATE-01",
                synced_from="hardware",
                status="PRESENT"
            )
            db.add(sess9_record)
            db.commit()
            print(f"  + Scheduled Session 9 registered ({sess9_id} on {sess9_date})")

        # -------------------------------------------------------------
        # 7. PROGRESS (100% course completion)
        # -------------------------------------------------------------
        print("\n[7/11] Seeding LMS Course Progress (100% completion for Ravi)...")
        for item in all_content_items:
            prog = db.query(Progress).filter(
                Progress.trainee_id == ravi.id,
                Progress.content_item_id == item.id
            ).first()
            if not prog:
                prog = Progress(
                    trainee_id=ravi.id,
                    module_id=item.module_id,
                    content_item_id=item.id,
                    status="completed",
                    completed_at=datetime.utcnow() - timedelta(days=2)
                )
                db.add(prog)
                db.commit()
                summary["progress"] += 1
                print(f"  + Progress marked completed: Content Item '{item.title}'")
            else:
                if prog.status != "completed":
                    prog.status = "completed"
                    prog.completed_at = datetime.utcnow()
                    db.commit()
                print(f"  = Progress already completed: Content Item '{item.title}'")

        # Also complete any quizzes within these modules for 100% course completion
        for m_obj in module_objects.values():
            for qz in m_obj.quizzes:
                q_attempt = db.query(QuizAttempt).filter(
                    QuizAttempt.trainee_id == ravi.id,
                    QuizAttempt.quiz_id == qz.id
                ).first()
                if not q_attempt:
                    q_attempt = QuizAttempt(
                        trainee_id=ravi.id,
                        quiz_id=qz.id,
                        score=10,
                        total_marks=10,
                        answers={"q_1": 0, "q_2": 1},
                        submitted_at=datetime.utcnow() - timedelta(days=2)
                    )
                    db.add(q_attempt)
                    db.commit()
                    print(f"  + Quiz completed with passing score: '{qz.title}'")

        # -------------------------------------------------------------
        # 8. ASSESSMENT (Skill-tagged questions)
        # -------------------------------------------------------------
        print("\n[8/11] Seeding Assessment and Skill-Tagged Questions...")
        ass_title = "Final Assessment - Cooperative Accounting & ERP"
        assessment = db.query(Assessment).filter(
            Assessment.course_id == programme.id,
            Assessment.title == ass_title
        ).first()
        if not assessment:
            assessment = Assessment(
                course_id=programme.id,
                title=ass_title,
                type="quiz"
            )
            db.add(assessment)
            db.commit()
            db.refresh(assessment)
            summary["assessments"] += 1
            print(f"  + Assessment created: {assessment.title} (ID: {assessment.id})")
        else:
            print(f"  = Assessment exists: {assessment.title} (ID: {assessment.id})")

        # Questions to seed: 5 Accounting, 5 ERP, 5 GST, 3 Communication, 2 Excel (Total 20)
        questions_spec = [
            # 5 Accounting questions
            ("Accounting", "Under cooperative double-entry rules, how is statutory reserve allocation recorded?"),
            ("Accounting", "What financial statement records the assets, liabilities, and member equity of a PACS?"),
            ("Accounting", "Which account is credited when dividend equalization funds are appropriated from net profit?"),
            ("Accounting", "How are bad debt provisions classified under standard cooperative accounting guidelines?"),
            ("Accounting", "What is the primary difference between cooperative surplus distribution and corporate dividends?"),
            # 5 ERP questions
            ("ERP", "In a cooperative enterprise ERP, which sub-ledger handles crop loan disbursements?"),
            ("ERP", "How does role-based access control prevent unauthorized ledger adjustments in an ERP?"),
            ("ERP", "What process verifies data integrity between decentralized PACS nodes and District Central Bank ERP?"),
            ("ERP", "Which ERP module manages inventory valuation using weighted average cost for fertilizer stocks?"),
            ("ERP", "How are daily end-of-day automated batch reconciliations triggered in a core cooperative ERP?"),
            # 5 GST questions
            ("GST", "What is the GST exemption threshold for agricultural marketing cooperative societies?"),
            ("GST", "Under GST law, how is Input Tax Credit claimed on administrative software subscriptions by PACS?"),
            ("GST", "Which return form must a cooperative enterprise file for monthly outward supply summary?"),
            ("GST", "What rate of GST applies to warehousing services for unbranded agricultural produce?"),
            ("GST", "How does Reverse Charge Mechanism (RCM) apply to legal consultancy services availed by a cooperative?"),
            # 3 Communication questions
            ("Communication", "What is the most effective approach for presenting audit findings to the General Body?"),
            ("Communication", "How should member grievance redressal documentation be drafted to ensure statutory clarity?"),
            ("Communication", "Which protocol governs formal communication between PACS management and District Registrars?"),
            # 2 Excel questions
            ("Excel", "Which Excel formula is best suited for reconciling bank statement balances with the cash book?"),
            ("Excel", "How can Excel pivot tables be utilized to analyze delinquent loan aging categories by village ward?"),
        ]

        for s_name, q_text in questions_spec:
            skill = skill_objects[s_name]
            q_obj = db.query(AssessmentQuestion).filter(
                AssessmentQuestion.assessment_id == assessment.id,
                AssessmentQuestion.text == q_text
            ).first()
            if not q_obj:
                q_obj = AssessmentQuestion(
                    assessment_id=assessment.id,
                    skill_id=skill.id,
                    text=q_text,
                    options=[
                        "Option A: Standard statutory procedure conforming to cooperative bylaws",
                        "Option B: Discretionary allocation under registrar oversight",
                        "Option C: Ad-hoc reserve transfer based on quarterly committee review",
                        "Option D: Direct operational debit against current member deposits"
                    ],
                    correct_option=0,
                    marks=5
                )
                db.add(q_obj)
                db.commit()
                summary["assessment_questions"] += 1
            else:
                pass
        print(f"  + Verified 20 skill-tagged questions (5 Accounting, 5 ERP, 5 GST, 3 Communication, 2 Excel)")

        # -------------------------------------------------------------
        # 9. ASSESSMENT RESULT (Ravi's FIRST attempt: Exact Spec Scores)
        # -------------------------------------------------------------
        print("\n[9/11] Seeding Ravi's Assessment Result (Exact Spec: Acc=88%, ERP=52%, GST=48%, Comm=65%, Excel=85%)...")
        skill_wise_score_spec = {
            str(skill_objects["Accounting"].id): {
                "skill_id": skill_objects["Accounting"].id,
                "skill_name": "Accounting",
                "marks_obtained": 88,
                "total_marks": 100,
                "percentage": 88.0
            },
            str(skill_objects["ERP"].id): {
                "skill_id": skill_objects["ERP"].id,
                "skill_name": "ERP",
                "marks_obtained": 52,
                "total_marks": 100,
                "percentage": 52.0
            },
            str(skill_objects["GST"].id): {
                "skill_id": skill_objects["GST"].id,
                "skill_name": "GST",
                "marks_obtained": 48,
                "total_marks": 100,
                "percentage": 48.0
            },
            str(skill_objects["Communication"].id): {
                "skill_id": skill_objects["Communication"].id,
                "skill_name": "Communication",
                "marks_obtained": 65,
                "total_marks": 100,
                "percentage": 65.0
            },
            str(skill_objects["Excel"].id): {
                "skill_id": skill_objects["Excel"].id,
                "skill_name": "Excel",
                "marks_obtained": 85,
                "total_marks": 100,
                "percentage": 85.0
            }
        }

        # Overall: 338 out of 500 = 68%
        res = db.query(AssessmentResult).filter(
            AssessmentResult.trainee_id == ravi.id,
            AssessmentResult.assessment_id == assessment.id
        ).first()

        if not res:
            res = AssessmentResult(
                trainee_id=ravi.id,
                assessment_id=assessment.id,
                skill_wise_score=skill_wise_score_spec,
                overall_score=68,
                total_marks_earned=338,
                total_marks_possible=500,
                answers={f"q_{i}": 0 for i in range(1, 21)},
                submitted_at=datetime.utcnow() - timedelta(days=1)
            )
            db.add(res)
            db.commit()
            db.refresh(res)
            summary["assessment_results"] += 1
            print(f"  + AssessmentResult created for {ravi.name} (Overall: {res.overall_score}%)")
        else:
            res.skill_wise_score = skill_wise_score_spec
            res.overall_score = 68
            res.total_marks_earned = 338
            res.total_marks_possible = 500
            db.commit()
            print(f"  = AssessmentResult verified for {ravi.name} (Overall: {res.overall_score}%)")

        # -------------------------------------------------------------
        # 10. JOB ROLE & REQUIREMENTS
        # -------------------------------------------------------------
        print("\n[10/11] Seeding Job Role 'Cooperative Accountant' & Competency Requirements...")
        job_role_title = "Cooperative Accountant"
        job_role = db.query(JobRole).filter(JobRole.title == job_role_title).first()
        if not job_role:
            job_role = JobRole(
                title=job_role_title,
                description="Manages statutory double-entry accounting, ledger reconciliations, cooperative ERP systems, and GST compliance for primary and apex cooperative societies."
            )
            db.add(job_role)
            db.commit()
            db.refresh(job_role)
            summary["job_roles"] += 1
            print(f"  + JobRole created: {job_role.title} (ID: {job_role.id})")
        else:
            print(f"  = JobRole exists: {job_role.title} (ID: {job_role.id})")

        # Competency Requirements:
        # Accounting=HIGH, Cooperative Accounting=HIGH, ERP=HIGH, Excel=MEDIUM, GST=HIGH, Communication=MEDIUM
        requirements_spec = [
            ("Accounting", "HIGH"),
            ("Cooperative Accounting", "HIGH"),
            ("ERP", "HIGH"),
            ("Excel", "MEDIUM"),
            ("GST", "HIGH"),
            ("Communication", "MEDIUM"),
        ]

        for s_name, req_level in requirements_spec:
            target_skill = skill_objects[s_name]
            existing_req = db.query(JobRoleSkillRequirement).filter(
                JobRoleSkillRequirement.job_role_id == job_role.id,
                JobRoleSkillRequirement.skill_id == target_skill.id
            ).first()
            if not existing_req:
                req_obj = JobRoleSkillRequirement(
                    job_role_id=job_role.id,
                    skill_id=target_skill.id,
                    required_level=req_level
                )
                db.add(req_obj)
                db.commit()
                print(f"  + Requirement created: {s_name} = {req_level}")
            else:
                existing_req.required_level = req_level
                db.commit()
                print(f"  = Requirement exists: {s_name} = {req_level}")

        # -------------------------------------------------------------
        # 11. JOB POSTING (by employer1)
        # -------------------------------------------------------------
        print("\n[11/11] Seeding Job Posting by Employer 1...")
        posting_title = "Cooperative Accountant - Chennai Branch"
        posting = db.query(JobPosting).filter(
            JobPosting.employer_id == employer1.id,
            JobPosting.title == posting_title
        ).first()

        if not posting:
            posting = JobPosting(
                employer_id=employer1.id,
                job_role_id=job_role.id,
                title=posting_title,
                description="We are seeking a qualified Cooperative Accountant to manage core ledger accounting, ERP reconciliations, and monthly GST filing for our Chennai main branch.",
                location="Chennai",
                is_active=True,
                status="ACTIVE",
                posted_at=datetime.utcnow() - timedelta(days=3)
            )
            db.add(posting)
            db.commit()
            db.refresh(posting)
            summary["job_postings"] += 1
            print(f"  + JobPosting created: '{posting.title}' (Employer: {employer1.name})")
        else:
            posting.is_active = True
            posting.status = "ACTIVE"
            posting.location = "Chennai"
            db.commit()
            print(f"  = JobPosting exists: '{posting.title}' (ID: {posting.id})")

        # -------------------------------------------------------------
        # FINAL SUMMARY
        # -------------------------------------------------------------
        print("\n=======================================================")
        print("  NCCT SEED DATA EXECUTION SUMMARY")
        print("=======================================================")
        print(f"Created: {summary['admin']} admin, {summary['institutions']} institution, "
              f"{summary['trainers']} trainers, {summary['employers']} employers, "
              f"{summary['trainees']} trainee (Ravi Kumar - Trainee ID: {ravi_profile.trainee_id}), "
              f"{summary['programmes']} programme, {summary['modules']} modules, "
              f"{summary['skills']} skills, {summary['job_roles']} job role, "
              f"{summary['job_postings']} job posting")
        print("Verified Active Entities:")
        print(f"  - Admin:       {admin.email}")
        print(f"  - Institution: {inst.name} ({inst.code})")
        print(f"  - Trainers:    {trainer1.email}, {trainer2.email}")
        print(f"  - Employers:   {employer1.email}, {employer2.email}")
        print(f"  - Trainee:     {ravi.name} ({ravi.email}) | ID: {ravi_profile.trainee_id}")
        print(f"  - Programme:   {programme.title} (3 Modules, 6 Content Items)")
        print(f"  - Attendance:  8 attended of 9 total sessions (~88.9%)")
        print(f"  - Progress:    100% completed (6/6 items)")
        print(f"  - Assessment:  {assessment.title} (20 questions tagged across 5 skills)")
        print(f"  - Scores:      Accounting=88%, ERP=52%, GST=48%, Communication=65%, Excel=85%")
        print(f"  - Job Role:    {job_role.title} (6 Competency Requirements)")
        print(f"  - Job Posting: {posting.title} (Location: {posting.location})")
        print("=======================================================\n")

        # Ensure memorable demo credentials exist
        from scripts.demo_seed import seed_demo_accounts
        seed_demo_accounts()

        return {
            "ravi_user": ravi,
            "ravi_profile": ravi_profile,
            "assessment_result": res,
            "programme": programme,
            "job_role": job_role,
            "job_posting": posting,
        }

    finally:
        db.close()


if __name__ == "__main__":
    seed_all()
