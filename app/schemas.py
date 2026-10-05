from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from app.models import UserRole

class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, examples=["John Doe"])
    email: EmailStr = Field(..., examples=["john.doe@ncct.edu"])
    role: UserRole = Field(default=UserRole.TRAINEE, examples=["TRAINEE"])

class UserRegisterRequest(UserBase):
    password: str = Field(..., min_length=6, max_length=128, description="Password at least 6 characters")

class UserLoginRequest(BaseModel):
    email: EmailStr = Field(..., examples=["john.doe@ncct.edu"])
    password: str = Field(..., description="User password")

class UserResponse(UserBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class TokenRefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

from typing import Optional, List

class TraineeProfileCreateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    institution: str = Field(..., min_length=2, max_length=255, examples=["National Institute of Cooperative Management"])
    course_enrolled: str = Field(..., min_length=2, max_length=255, examples=["PG Diploma in Cooperative Business Management"])
    education: Optional[str] = Field(None, max_length=255, examples=["Bachelor of Commerce (Honors)"])
    preferred_language: Optional[str] = Field(None, max_length=100, examples=["English"])
    previous_skills: List[str] = Field(default_factory=list, examples=[["Accounting", "Financial Analysis", "Python"]])
    phone: Optional[str] = Field(None, max_length=50, examples=["+91 98765 43210"])
    address: Optional[str] = Field(None, max_length=500, examples=["Sector 12, Gandhinagar, Gujarat"])

class TraineeProfileResponse(BaseModel):
    id: int
    user_id: int
    trainee_id: str
    name: Optional[str] = None
    email: Optional[str] = None
    institution: Optional[str] = None
    course_enrolled: Optional[str] = None
    education: Optional[str] = None
    preferred_language: Optional[str] = None
    previous_skills: List[str] = []
    phone: Optional[str] = None
    address: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None

# Course & Training Programme Schemas
class InstitutionBase(BaseModel):
    name: str
    code: Optional[str] = None
    location: Optional[str] = None

class InstitutionResponse(InstitutionBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class ContentItemCreate(BaseModel):
    type: str = Field(..., description="video, pdf, note")
    title: str = Field(..., min_length=2, max_length=255)
    url_or_file_path: str = Field(..., description="URL or static file path")
    order: int = 1

class ContentItemResponse(BaseModel):
    id: int
    module_id: int
    type: str
    title: str
    url_or_file_path: str
    url: Optional[str] = None
    order: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ModuleCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    order: int = 1

class ModuleResponse(BaseModel):
    id: int
    programme_id: int
    title: str
    order: int
    created_at: datetime
    content_items: List[ContentItemResponse] = []
    model_config = ConfigDict(from_attributes=True)

class BatchCreate(BaseModel):
    batch_name: str = Field(..., min_length=2, max_length=100)

class BatchResponse(BaseModel):
    id: int
    programme_id: int
    batch_name: str
    trainee_count: int = 0
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class BatchAddTraineesRequest(BaseModel):
    trainee_ids: List[str] = Field(..., description="List of trainee_id strings (e.g. NCCT-TR-2026-00001) or integer IDs")

class BatchTraineeItem(BaseModel):
    id: int
    trainee_id: str
    name: str
    email: str
    institution: Optional[str] = None
    course_enrolled: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class TrainingProgrammeCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    institution_id: int
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class TrainingProgrammeResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    institution_id: int
    institution_name: Optional[str] = None
    trainer_id: int
    trainer_name: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    created_at: datetime
    modules: List[ModuleResponse] = []
    batches: List[BatchResponse] = []
    model_config = ConfigDict(from_attributes=True)

class EnrolledCourseResponse(BaseModel):
    programme_id: int
    batch_id: int
    batch_name: str
    title: str
    description: Optional[str] = None
    institution_name: Optional[str] = None
    trainer_name: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    modules: List[ModuleResponse] = []
    model_config = ConfigDict(from_attributes=True)

# --- LMS & Quiz Schemas ---

class QuestionPublic(BaseModel):
    id: int
    quiz_id: int
    text: str
    options: List[str]
    marks: int = 1
    model_config = ConfigDict(from_attributes=True)

class QuestionCreate(BaseModel):
    text: str
    options: List[str]
    correct_option: int
    marks: int = 1

class QuizCreate(BaseModel):
    title: str
    questions: Optional[List[QuestionCreate]] = []

class QuizResponse(BaseModel):
    id: int
    module_id: int
    title: str
    created_at: datetime
    questions: List[QuestionPublic] = []
    model_config = ConfigDict(from_attributes=True)

class QuizSubmitRequest(BaseModel):
    answers: Dict[str, int] = Field(..., description="Dict of question_id -> selected_option_index")

class QuestionResult(BaseModel):
    question_id: int
    text: str
    selected_option: Optional[int] = None
    correct_option: int
    is_correct: bool
    marks_earned: int
    marks_possible: int

class QuizSubmitResponse(BaseModel):
    attempt_id: int
    quiz_id: int
    score: int
    total_marks: int
    percentage: float
    passed: bool
    submitted_at: datetime
    question_results: List[QuestionResult] = []

class MarkCompleteRequest(BaseModel):
    content_item_id: int
    module_id: Optional[int] = None

class ProgressItemResponse(BaseModel):
    id: int
    trainee_id: int
    module_id: int
    content_item_id: Optional[int] = None
    status: str
    completed_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class ContentItemWithStatus(BaseModel):
    id: int
    module_id: int
    type: str
    title: str
    url_or_file_path: str
    url: Optional[str] = None
    order: int
    created_at: datetime
    status: str = "not_started"
    completed_at: Optional[datetime] = None

class QuizWithStatus(BaseModel):
    id: int
    module_id: int
    title: str
    total_questions: int
    total_marks: int
    is_completed: bool = False
    best_score: Optional[int] = None
    best_percentage: Optional[float] = None
    last_attempt_at: Optional[datetime] = None

class ModuleContentStatusResponse(BaseModel):
    module_id: int
    module_title: str
    programme_id: int
    programme_title: str
    content_items: List[ContentItemWithStatus] = []
    quizzes: List[QuizWithStatus] = []

class ModuleProgressSummary(BaseModel):
    module_id: int
    title: str
    total_items: int
    completed_items: int
    completion_percentage: int

class CourseProgressResponse(BaseModel):
    programme_id: int
    batch_id: int
    batch_name: str
    programme_title: str
    total_items: int
    completed_items: int
    completion_percentage: int
    modules: List[ModuleProgressSummary] = []

# --- Attendance Schemas ---

class AttendanceMarkRequest(BaseModel):
    device_id: str = Field(default="KIOSK-SIM-01", description="Identifier of the scanner node or kiosk")
    trainee_qr_code: str = Field(..., description="Scanned QR code content (e.g. NCCT-TR-2026-00001)")
    timestamp: Optional[str] = Field(default=None, description="ISO timestamp of scan")
    session_id: Optional[str] = Field(default="SESSION-MAIN", description="Session identifier")
    programme_id: Optional[int] = Field(default=None, description="Course programme ID")

class AttendanceMarkResponse(BaseModel):
    status: str = Field(..., description="OK, DUPLICATE, or INVALID")
    buzzer: str = Field(..., description="BEEP_SUCCESS, BEEP_WARN, or BEEP_ERROR")
    message: str
    trainee_id: Optional[str] = None
    trainee_name: Optional[str] = None
    check_in_time: Optional[datetime] = None
    attendance_id: Optional[int] = None
    synced_from: Optional[str] = "web"

class SyncBatchItem(BaseModel):
    device_id: str
    trainee_qr_code: str
    timestamp: str
    session_id: Optional[str] = "SESSION-MAIN"
    programme_id: Optional[int] = None

class SyncBatchRequest(BaseModel):
    records: List[SyncBatchItem]

class SyncBatchResponse(BaseModel):
    synced_count: int
    duplicate_count: int
    invalid_count: int
    results: List[AttendanceMarkResponse] = []

class AttendanceRecordResponse(BaseModel):
    id: int
    trainee_id: str
    trainee_name: str
    session_id: str
    date: str
    check_in_time: datetime
    device_id: str
    synced_from: str
    status: str
    institution: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class TraineeAttendanceSummary(BaseModel):
    trainee_id: str
    name: str
    institution: Optional[str] = None
    total_sessions: int
    attended_sessions: int
    attendance_percentage: float
    records: List[AttendanceRecordResponse] = []

class SessionAttendanceResponse(BaseModel):
    session_id: str
    date: str
    total_marked: int
    attendees: List[AttendanceRecordResponse] = []

# --- Skill-Linked Assessment Schemas ---

class SkillResponse(BaseModel):
    id: int
    name: str
    category: Optional[str] = "Technical"
    model_config = ConfigDict(from_attributes=True)

class AssessmentQuestionCreate(BaseModel):
    text: str
    skill_id: int
    options: List[str]
    correct_option: int
    marks: int = 1

class AssessmentQuestionPublic(BaseModel):
    id: int
    assessment_id: int
    skill_id: int
    skill_name: str
    text: str
    options: List[str]
    marks: int
    model_config = ConfigDict(from_attributes=True)

class AssessmentCreate(BaseModel):
    course_id: int
    title: str
    type: str = "quiz"
    questions: List[AssessmentQuestionCreate] = []

class AssessmentResponse(BaseModel):
    id: int
    course_id: int
    course_title: Optional[str] = None
    title: str
    type: str
    created_at: datetime
    questions: List[AssessmentQuestionPublic] = []
    total_questions: int = 0
    total_marks: int = 0
    model_config = ConfigDict(from_attributes=True)

class AssessmentAnswerItem(BaseModel):
    question_id: int
    selected_option: Union[int, str]

class AssessmentSubmitRequest(BaseModel):
    answers: Union[List[AssessmentAnswerItem], Dict[str, Union[int, str]]]

class SkillScoreItem(BaseModel):
    skill_id: int
    skill_name: str
    marks_obtained: int
    total_marks: int
    percentage: float
    score: Optional[float] = None
    model_config = ConfigDict(from_attributes=True)

class AssessmentSubmitResponse(BaseModel):
    result_id: int
    assessment_id: int
    trainee_id: Optional[str] = None
    overall_score: float
    total_marks_earned: int
    total_marks_possible: int
    skill_wise_score: Dict[str, Any]
    submitted_at: datetime

class TraineeSkillScoreSummary(BaseModel):
    trainee_id: str
    trainee_name: str
    skills: List[SkillScoreItem]

# --- AI Skill-Gap Engine Schemas ---

class JobRoleSkillReqResponse(BaseModel):
    id: int
    skill_id: int
    skill_name: str
    required_level: str  # HIGH, MEDIUM, LOW
    required_threshold: float  # e.g. 70.0, 60.0, 40.0
    model_config = ConfigDict(from_attributes=True)

class JobRoleResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class JobRoleDetailResponse(JobRoleResponse):
    requirements: List[JobRoleSkillReqResponse] = []

class SkillGapComparisonItem(BaseModel):
    skill_id: int
    skill: str  # skill name
    skill_name: str
    trainee_level: float  # e.g. 52.0
    required_level: str   # HIGH, MEDIUM, LOW
    required_threshold: float  # e.g. 60.0
    gap: bool  # True if trainee_level < required_threshold
    gap_percentage: float  # positive gap distance (e.g. 8.0%), 0 if matched
    status: str  # "GAP" or "MATCHED"

class SkillGapAnalysisResponse(BaseModel):
    trainee_id: str
    trainee_name: str
    job_role_id: int
    job_role_title: str
    job_role_description: Optional[str] = None
    overall_match_percentage: float
    total_skills_required: int
    skills_matched: int
    skills_gap_count: int
    skills: List[SkillGapComparisonItem]

class RecommendedModuleItem(BaseModel):
    skill_id: int
    skill_name: str
    module_id: int
    module_title: str
    course_id: int
    course_title: Optional[str] = None
    order: int = 1
    recommendation_text: str  # e.g. "Complete ERP Module: PACS Digital ERP Operations & Tally Prime Integration"
    player_url: str
    gap_percentage: float = 0.0

class TraineeRecommendationsResponse(BaseModel):
    trainee_id: str
    trainee_name: str
    job_role_id: Optional[int] = None
    job_role_title: Optional[str] = None
    total_gaps_identified: int
    recommendations: List[RecommendedModuleItem]

# --- Dynamic Skill Passport Schemas ---

class PassportSkillItem(BaseModel):
    skill_id: int
    skill_name: str
    category: str
    level: int  # 1 to 5
    level_label: str  # e.g. "Level 4 (Advanced)"
    display_format: str  # e.g. "Accounting: Level 4"
    percentage: float  # e.g. 88.0

class CertificateItem(BaseModel):
    id: int
    title: str
    certificate_code: str
    issued_date: datetime
    programme_title: Optional[str] = None
    pdf_url: Optional[str] = None

class SkillPassportResponse(BaseModel):
    trainee_id: str
    user_id: int
    name: str
    email: str
    institution: Optional[str] = None
    education: Optional[str] = None
    preferred_language: Optional[str] = None
    passport_code: str
    skills: List[PassportSkillItem]
    certificates_count: int
    completed_courses_count: int
    completed_projects_count: int
    overall_score: float
    overall_level: int
    overall_level_label: str
    certificates: List[CertificateItem] = []
    issued_at: datetime
    shareable_url: str


# --- Digital Certificate Schemas ---

class CertificateDetailResponse(BaseModel):
    id: int
    certificate_id: str
    certificate_code: Optional[str] = None
    trainee_id: int
    trainee_name: str
    trainee_code: Optional[str] = None
    course_id: Optional[int] = None
    course_title: str
    institution_id: Optional[int] = None
    institution_name: str
    title: str
    completion_date: datetime
    issued_date: datetime
    assessment_status: str
    issued_by: str
    is_verified: bool
    verification_url: str
    pdf_download_url: str
    pdf_url: Optional[str] = None

class CertificateVerificationResponse(BaseModel):
    is_valid: bool
    message: str
    certificate: Optional[CertificateDetailResponse] = None

class CertificateEligibilityCheckResponse(BaseModel):
    eligible: bool
    course_id: int
    course_title: str
    course_completion_pct: int
    assessment_passed: bool
    assessment_score: Optional[float] = None
    certificate_id: Optional[str] = None
    message: str


# --- Employer Portal & Candidate Matching Schemas ---

class JobPostingCreate(BaseModel):
    job_role_id: int
    title: str
    description: Optional[str] = None
    location: Optional[str] = "National / Hybrid"
    is_active: Optional[bool] = True

class JobPostingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    job_role_id: Optional[int] = None
    is_active: Optional[bool] = None

class JobRoleSkillRequirementResponse(BaseModel):
    skill_id: int
    skill_name: str
    required_level: str  # HIGH, MEDIUM, LOW
    threshold_pct: float

class JobPostingResponse(BaseModel):
    id: int
    employer_id: int
    employer_name: str
    job_role_id: int
    job_role_title: str
    title: str
    description: Optional[str] = None
    location: str
    posted_at: datetime
    is_active: bool = True
    required_skills: List[JobRoleSkillRequirementResponse] = []
    total_candidates_matched: Optional[int] = 0


class CandidateMatch(BaseModel):
    trainee_id: str
    name: str
    match_percentage: float
    matched_skills: List[str]
    gap_skills: List[str]


class CandidateMatchItem(BaseModel):
    rank: int
    trainee_id: str
    user_id: int
    candidate_name: str
    institution: Optional[str] = None
    education: Optional[str] = None
    match_percentage: float
    average_score: float
    matched_skills: List[str]
    gap_skills: List[str]
    skill_breakdown: List[Dict[str, Any]]
    certificates_count: int
    passport_code: str
    has_been_contacted: bool = False
    contact_date: Optional[datetime] = None

class JobMatchesResponse(BaseModel):
    job_posting_id: int
    job_title: str
    job_role_title: str
    location: str
    total_candidates: int
    matches: List[CandidateMatchItem]

class PublicSkillPassportResponse(BaseModel):
    trainee_id: str
    name: str
    institution: Optional[str] = None
    education: Optional[str] = None
    passport_code: str
    skills: List[PassportSkillItem]
    certificates_count: int
    completed_courses_count: int
    completed_projects_count: int
    overall_score: float
    overall_level: int
    overall_level_label: str
    certificates: List[CertificateItem] = []
    issued_at: datetime
    is_public_view: bool = True

class ContactCandidateRequest(BaseModel):
    trainee_id: str
    job_posting_id: int
    message: str

class ContactCandidateResponse(BaseModel):
    success: bool
    message: str
    contact_id: int
    trainee_name: str
    created_at: datetime


# --- Employment Record & Employer Feedback Schemas ---

class EmploymentRecordCreate(BaseModel):
    trainee_id: Union[int, str] = Field(..., description="Trainee user ID integer or trainee code string (e.g., NCCT-TR-RAVI-001)")
    job_posting_id: int
    hired_date: Optional[datetime] = None
    status: Optional[str] = "ACTIVE"


class EmploymentRecordResponse(BaseModel):
    id: int
    trainee_id: int
    trainee_code: Optional[str] = None
    trainee_name: str
    employer_id: int
    employer_name: str
    job_posting_id: int
    job_title: str
    hired_date: datetime
    status: str
    model_config = ConfigDict(from_attributes=True)


class SkillFeedbackItem(BaseModel):
    skill_id: int
    rating: str = Field(..., description="Rating: LOW, MEDIUM, GOOD, HIGH")
    comments: Optional[str] = None


class EmployerFeedbackSubmission(BaseModel):
    employment_record_id: Optional[int] = None
    feedback: Optional[List[SkillFeedbackItem]] = None


class EmployerFeedbackResponse(BaseModel):
    id: int
    employment_record_id: int
    skill_id: int
    skill_name: Optional[str] = None
    rating: str
    comments: Optional[str] = None
    submitted_at: datetime
    model_config = ConfigDict(from_attributes=True)


class CommonSkillGapResponse(BaseModel):
    skill_name: str
    total_reports: int
    low_rating_ratio: float
    flagged: bool
    model_config = ConfigDict(from_attributes=True)


# --- Admin Overview & Analytics Stats Schemas ---

class AdminOverviewStatsResponse(BaseModel):
    total_trainees: int
    total_programmes: int
    total_institutes: int
    overall_completion_rate: float
    average_attendance: float
    model_config = ConfigDict(from_attributes=True)


class LowCompletionCourseResponse(BaseModel):
    course_id: Optional[int] = None
    course_title: str
    completion_percentage: float
    title: Optional[str] = None
    completion_rate: Optional[float] = None
    model_config = ConfigDict(from_attributes=True)


class CombinedSkillGapResponse(BaseModel):
    skill_name: str
    source: str  # "employer_feedback", "training_gap", "both"
    severity_score: float
    skill_id: Optional[int] = None
    employer_low_ratio: Optional[float] = None
    training_gap_count: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)


class HighDemandSkillResponse(BaseModel):
    skill_id: Optional[int] = None
    skill_name: str
    demand_count: int
    count: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)


class ChatbotMessageRequest(BaseModel):
    message: str


class ChatbotMessageResponse(BaseModel):
    intent: str
    response: str
    is_fallback: bool = False




