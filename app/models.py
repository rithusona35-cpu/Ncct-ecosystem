import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Table, Boolean, Float, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base

class UserRole(str, enum.Enum):
    TRAINEE = "TRAINEE"
    TRAINER = "TRAINER"
    ADMIN = "ADMIN"
    EMPLOYER = "EMPLOYER"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole, name="user_roles", native_enum=False), nullable=False, default=UserRole.TRAINEE)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    trainee_profile = relationship("TraineeProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"

class TraineeProfile(Base):
    __tablename__ = "trainee_profiles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    trainee_id = Column(String(32), unique=True, index=True, nullable=False)
    institution = Column(String(255), nullable=True)
    course_enrolled = Column(String(255), nullable=True)
    education = Column(String(255), nullable=True)
    preferred_language = Column(String(100), nullable=True)
    previous_skills = Column(JSON, default=list, nullable=True)
    phone = Column(String(50), nullable=True)
    address = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="trainee_profile")

    def __repr__(self):
        return f"<TraineeProfile(trainee_id={self.trainee_id}, institution={self.institution})>"

class Institution(Base):
    __tablename__ = "institutions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), nullable=True, unique=True)
    location = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    programmes = relationship("TrainingProgramme", back_populates="institution", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Institution(name={self.name}, code={self.code})>"

# Association table for Batch <-> TraineeProfile (Many-to-Many)
batch_trainees = Table(
    "batch_trainees",
    Base.metadata,
    Column("batch_id", Integer, ForeignKey("batches.id", ondelete="CASCADE"), primary_key=True),
    Column("trainee_profile_id", Integer, ForeignKey("trainee_profiles.id", ondelete="CASCADE"), primary_key=True)
)

class TrainingProgramme(Base):
    __tablename__ = "training_programmes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    description = Column(String(2000), nullable=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False)
    trainer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    start_date = Column(String(50), nullable=True)
    end_date = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    institution = relationship("Institution", back_populates="programmes")
    trainer = relationship("User")
    batches = relationship("Batch", back_populates="programme", cascade="all, delete-orphan")
    modules = relationship("Module", back_populates="programme", cascade="all, delete-orphan", order_by="Module.order")

    def __repr__(self):
        return f"<TrainingProgramme(id={self.id}, title={self.title})>"

class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    programme_id = Column(Integer, ForeignKey("training_programmes.id", ondelete="CASCADE"), nullable=False)
    batch_name = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    programme = relationship("TrainingProgramme", back_populates="batches")
    trainees = relationship("TraineeProfile", secondary=batch_trainees, backref="enrolled_batches")

    def __repr__(self):
        return f"<Batch(id={self.id}, batch_name={self.batch_name})>"

class Module(Base):
    __tablename__ = "modules"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    programme_id = Column(Integer, ForeignKey("training_programmes.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    order = Column(Integer, default=1, nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    programme = relationship("TrainingProgramme", back_populates="modules")
    skill = relationship("Skill")
    content_items = relationship("ContentItem", back_populates="module", cascade="all, delete-orphan", order_by="ContentItem.order")
    quizzes = relationship("Quiz", back_populates="module", cascade="all, delete-orphan", order_by="Quiz.id")

    def __repr__(self):
        return f"<Module(id={self.id}, title={self.title}, order={self.order})>"

class ContentItem(Base):
    __tablename__ = "content_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    module_id = Column(Integer, ForeignKey("modules.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(20), nullable=False)  # "video", "pdf", "note"
    title = Column(String(255), nullable=False)
    url_or_file_path = Column(String(500), nullable=False)
    url = Column(String(500), nullable=True)
    order = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    module = relationship("Module", back_populates="content_items")

    def __repr__(self):
        return f"<ContentItem(id={self.id}, type={self.type}, title={self.title})>"

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    module_id = Column(Integer, ForeignKey("modules.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    module = relationship("Module", back_populates="quizzes")
    questions = relationship("Question", back_populates="quiz", cascade="all, delete-orphan", order_by="Question.id")
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Quiz(id={self.id}, title={self.title})>"

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
    text = Column(String(1000), nullable=False)
    options = Column(JSON, default=list, nullable=False)  # list of strings
    correct_option = Column(Integer, nullable=False)       # 0-indexed int
    marks = Column(Integer, default=1, nullable=False)

    quiz = relationship("Quiz", back_populates="questions")

    def __repr__(self):
        return f"<Question(id={self.id}, text={self.text[:30]})>"

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    trainee_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
    score = Column(Integer, nullable=False)
    total_marks = Column(Integer, nullable=False)
    answers = Column(JSON, default=dict, nullable=False)   # {"question_id": selected_option}
    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    quiz = relationship("Quiz", back_populates="attempts")
    trainee = relationship("User")

    def __repr__(self):
        return f"<QuizAttempt(id={self.id}, trainee_id={self.trainee_id}, score={self.score}/{self.total_marks})>"

class Progress(Base):
    __tablename__ = "progress"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    trainee_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    module_id = Column(Integer, ForeignKey("modules.id", ondelete="CASCADE"), nullable=False, index=True)
    content_item_id = Column(Integer, ForeignKey("content_items.id", ondelete="CASCADE"), nullable=True, index=True)
    status = Column(String(30), default="not_started", nullable=False)  # not_started, in_progress, completed
    completed_at = Column(DateTime, nullable=True)

    trainee = relationship("User")
    module = relationship("Module")
    content_item = relationship("ContentItem")

    def __repr__(self):
        return f"<Progress(id={self.id}, trainee_id={self.trainee_id}, content_item_id={self.content_item_id}, status={self.status})>"

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    trainee_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    trainee_profile_id = Column(Integer, ForeignKey("trainee_profiles.id", ondelete="CASCADE"), nullable=True, index=True)
    session_id = Column(String(100), default="SESSION-MAIN", nullable=False, index=True)
    programme_id = Column(Integer, ForeignKey("training_programmes.id", ondelete="SET NULL"), nullable=True, index=True)
    date = Column(String(20), nullable=False, index=True)  # YYYY-MM-DD
    check_in_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    device_id = Column(String(100), default="KIOSK-SIM-01", nullable=False)
    synced_from = Column(String(20), default="web", nullable=False)  # "web" or "hardware"
    status = Column(String(20), default="PRESENT", nullable=False)  # "PRESENT", "LATE", "EXCUSED"

    trainee = relationship("User")
    trainee_profile = relationship("TraineeProfile")
    programme = relationship("TrainingProgramme")

    def __repr__(self):
        return f"<Attendance(id={self.id}, trainee_id={self.trainee_id}, session_id={self.session_id}, status={self.status})>"

class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    category = Column(String(100), default="Technical", nullable=True)

    course_mappings = relationship("CourseSkillMap", back_populates="skill", cascade="all, delete-orphan")
    questions = relationship("AssessmentQuestion", back_populates="skill")

    def __repr__(self):
        return f"<Skill(id={self.id}, name={self.name}, category={self.category})>"

class CourseSkillMap(Base):
    __tablename__ = "course_skill_maps"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("training_programmes.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False, index=True)
    weight = Column(Integer, default=1, nullable=False)

    programme = relationship("TrainingProgramme")
    skill = relationship("Skill", back_populates="course_mappings")

    def __repr__(self):
        return f"<CourseSkillMap(course_id={self.course_id}, skill_id={self.skill_id}, weight={self.weight})>"

class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("training_programmes.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    type = Column(String(50), default="quiz", nullable=False)  # quiz, practical, project
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    programme = relationship("TrainingProgramme")
    questions = relationship("AssessmentQuestion", back_populates="assessment", cascade="all, delete-orphan", order_by="AssessmentQuestion.id")
    results = relationship("AssessmentResult", back_populates="assessment", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Assessment(id={self.id}, title={self.title}, type={self.type})>"

class AssessmentQuestion(Base):
    __tablename__ = "assessment_questions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False, index=True)
    text = Column(String(1000), nullable=False)
    options = Column(JSON, default=list, nullable=False)  # list of strings
    correct_option = Column(Integer, nullable=False)       # 0-indexed int
    marks = Column(Integer, default=1, nullable=False)

    assessment = relationship("Assessment", back_populates="questions")
    skill = relationship("Skill", back_populates="questions")

    def __repr__(self):
        return f"<AssessmentQuestion(id={self.id}, text={self.text[:30]}, skill_id={self.skill_id})>"

class AssessmentResult(Base):
    __tablename__ = "assessment_results"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    trainee_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_wise_score = Column(JSON, default=dict, nullable=False)  # { "skill_id": {"skill_name": str, "marks_obtained": int, "total_marks": int, "percentage": float} }
    overall_score = Column(Integer, nullable=False)  # overall percentage (0-100)
    total_marks_earned = Column(Integer, default=0, nullable=False)
    total_marks_possible = Column(Integer, default=0, nullable=False)
    answers = Column(JSON, default=dict, nullable=False)  # { question_id: selected_option }
    is_current = Column(Boolean, default=True, nullable=False)
    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    trainee = relationship("User")
    assessment = relationship("Assessment", back_populates="results")

    def __repr__(self):
        return f"<AssessmentResult(id={self.id}, trainee_id={self.trainee_id}, overall_score={self.overall_score}%)>"


class JobRole(Base):
    __tablename__ = "job_roles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), unique=True, nullable=False)
    description = Column(String(1000), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    requirements = relationship("JobRoleSkillRequirement", back_populates="job_role", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<JobRole(id={self.id}, title={self.title})>"


class JobRoleSkillRequirement(Base):
    __tablename__ = "job_role_skill_requirements"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    job_role_id = Column(Integer, ForeignKey("job_roles.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False, index=True)
    required_level = Column(String(20), nullable=False)  # HIGH, MEDIUM, LOW

    job_role = relationship("JobRole", back_populates="requirements")
    skill = relationship("Skill")

    def __repr__(self):
        return f"<JobRoleSkillRequirement(job_role_id={self.job_role_id}, skill_id={self.skill_id}, required_level={self.required_level})>"


class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    certificate_id = Column(String(100), unique=True, nullable=False, index=True)
    certificate_code = Column(String(100), nullable=True, index=True)  # alias for backwards compatibility
    trainee_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("training_programmes.id", ondelete="SET NULL"), nullable=True, index=True)
    programme_id = Column(Integer, ForeignKey("training_programmes.id", ondelete="SET NULL"), nullable=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    completion_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    issued_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    assessment_status = Column(String(50), default="PASSED", nullable=False)
    issued_by = Column(String(255), default="National Council for Cooperative Training (NCCT)", nullable=False)
    is_verified = Column(Boolean, default=True, nullable=False)
    pdf_url = Column(String(500), nullable=True)

    trainee = relationship("User")
    course = relationship("TrainingProgramme", foreign_keys=[course_id])
    programme = relationship("TrainingProgramme", foreign_keys=[programme_id])
    institution = relationship("Institution", foreign_keys=[institution_id])

    def __repr__(self):
        return f"<Certificate(id={self.id}, cert_id={self.certificate_id}, trainee={self.trainee_id}, status={self.assessment_status})>"


class SkillPassport(Base):
    __tablename__ = "skill_passports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    trainee_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    passport_code = Column(String(100), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    metadata_json = Column(JSON, default=dict, nullable=False)

    trainee = relationship("User")

    def __repr__(self):
        return f"<SkillPassport(id={self.id}, code={self.passport_code}, trainee_id={self.trainee_id})>"


class JobPosting(Base):
    __tablename__ = "job_postings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    job_role_id = Column(Integer, ForeignKey("job_roles.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(String(2000), nullable=True)
    location = Column(String(255), default="National / Hybrid", nullable=False)
    posted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    status = Column(String(50), default="ACTIVE", nullable=False)

    employer = relationship("User")
    job_role = relationship("JobRole")
    contacts = relationship("EmployerCandidateContact", back_populates="job_posting", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<JobPosting(id={self.id}, title={self.title}, role_id={self.job_role_id})>"


class EmployerCandidateContact(Base):
    __tablename__ = "employer_candidate_contacts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    trainee_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    job_posting_id = Column(Integer, ForeignKey("job_postings.id", ondelete="SET NULL"), nullable=True, index=True)
    message = Column(String(2000), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(String(50), default="SENT", nullable=False)

    employer = relationship("User", foreign_keys=[employer_id])
    trainee = relationship("User", foreign_keys=[trainee_id])
    job_posting = relationship("JobPosting", back_populates="contacts")

    def __repr__(self):
        return f"<EmployerCandidateContact(id={self.id}, employer={self.employer_id}, trainee={self.trainee_id})>"


class FeedbackRating(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    GOOD = "GOOD"
    HIGH = "HIGH"


class EmploymentRecord(Base):
    __tablename__ = "employment_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    trainee_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    employer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    job_posting_id = Column(Integer, ForeignKey("job_postings.id", ondelete="CASCADE"), nullable=False, index=True)
    hired_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(String(50), default="ACTIVE", nullable=False)  # ACTIVE, ENDED

    trainee = relationship("User", foreign_keys=[trainee_id])
    employer = relationship("User", foreign_keys=[employer_id])
    job_posting = relationship("JobPosting")
    feedback = relationship("EmployerFeedback", back_populates="employment_record", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<EmploymentRecord(id={self.id}, trainee_id={self.trainee_id}, employer_id={self.employer_id}, status={self.status})>"


class EmployerFeedback(Base):
    __tablename__ = "employer_feedback"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employment_record_id = Column(Integer, ForeignKey("employment_records.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False, index=True)
    rating = Column(SQLEnum(FeedbackRating, name="feedback_rating", native_enum=False), nullable=False)
    comments = Column(String(2000), nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    employment_record = relationship("EmploymentRecord", back_populates="feedback")
    skill = relationship("Skill")

    def __repr__(self):
        return f"<EmployerFeedback(id={self.id}, record_id={self.employment_record_id}, skill_id={self.skill_id}, rating={self.rating})>"
