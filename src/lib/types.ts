export type UserRole = 'TRAINEE' | 'TRAINER' | 'ADMIN' | 'EMPLOYER';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface TraineeProfile {
  id: number;
  user_id: number;
  trainee_id: string;
  name?: string;
  email?: string;
  institution?: string;
  course_enrolled?: string;
  education?: string;
  preferred_language?: string;
  previous_skills: string[];
  phone?: string;
  address?: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
}

export const ROLE_DASHBOARDS: Record<UserRole, string> = {
  TRAINEE: '/trainee/dashboard',
  TRAINER: '/trainer/dashboard',
  ADMIN: '/admin/dashboard',
  EMPLOYER: '/employer/dashboard',
};

export interface Institution {
  id: number;
  name: string;
  code?: string;
  location?: string;
}

export interface ContentItem {
  id: number;
  module_id: number;
  type: 'video' | 'pdf' | 'note';
  title: string;
  url_or_file_path: string;
  order: number;
  created_at: string;
}

export interface Module {
  id: number;
  programme_id: number;
  title: string;
  order: number;
  created_at: string;
  content_items: ContentItem[];
}

export interface Batch {
  id: number;
  programme_id: number;
  batch_name: string;
  trainee_count: number;
  created_at: string;
}

export interface BatchTrainee {
  id: number;
  trainee_id: string;
  name: string;
  email: string;
  institution?: string;
  course_enrolled?: string;
}

export interface TrainingProgramme {
  id: number;
  title: string;
  description?: string;
  institution_id: number;
  institution_name?: string;
  trainer_id: number;
  trainer_name?: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
  modules: Module[];
  batches: Batch[];
}

export interface EnrolledCourse {
  programme_id: number;
  batch_id: number;
  batch_name: string;
  title: string;
  description?: string;
  institution_name?: string;
  trainer_name?: string;
  start_date?: string;
  end_date?: string;
  modules: Module[];
}

// --- LMS & Quiz Types ---

export interface QuestionPublic {
  id: number;
  quiz_id: number;
  text: string;
  options: string[];
  marks: number;
}

export interface Quiz {
  id: number;
  module_id: number;
  title: string;
  created_at: string;
  questions: QuestionPublic[];
}

export interface QuestionResult {
  question_id: number;
  text: string;
  selected_option?: number | null;
  correct_option: number;
  is_correct: boolean;
  marks_earned: number;
  marks_possible: number;
}

export interface QuizSubmitResponse {
  attempt_id: number;
  quiz_id: number;
  score: number;
  total_marks: number;
  percentage: number;
  passed: boolean;
  submitted_at: string;
  question_results: QuestionResult[];
}

export interface ContentItemWithStatus extends ContentItem {
  status: 'not_started' | 'in_progress' | 'completed';
  completed_at?: string | null;
}

export interface QuizWithStatus {
  id: number;
  module_id: number;
  title: string;
  total_questions: number;
  total_marks: number;
  is_completed: boolean;
  best_score?: number | null;
  best_percentage?: number | null;
  last_attempt_at?: string | null;
}

export interface ModuleContentStatus {
  module_id: number;
  module_title: string;
  programme_id: number;
  programme_title: string;
  content_items: ContentItemWithStatus[];
  quizzes: QuizWithStatus[];
}

export interface ModuleProgressSummary {
  module_id: number;
  title: string;
  total_items: number;
  completed_items: number;
  completion_percentage: number;
}

export interface CourseProgress {
  programme_id: number;
  batch_id: number;
  batch_name: string;
  programme_title: string;
  total_items: number;
  completed_items: number;
  completion_percentage: number;
  modules: ModuleProgressSummary[];
}

// --- Attendance Module Types ---

export interface AttendanceMarkRequest {
  device_id?: string;
  trainee_qr_code: string;
  timestamp?: string;
  session_id?: string;
  programme_id?: number;
}

export interface AttendanceMarkResponse {
  status: 'OK' | 'DUPLICATE' | 'INVALID' | 'OFFLINE_QUEUED';
  buzzer: 'BEEP_SUCCESS' | 'BEEP_WARN' | 'BEEP_ERROR';
  message: string;
  trainee_id?: string | null;
  trainee_name?: string | null;
  check_in_time?: string | null;
  attendance_id?: number | null;
  synced_from?: 'web' | 'hardware';
}

export interface SyncBatchItem {
  device_id: string;
  trainee_qr_code: string;
  timestamp: string;
  session_id?: string;
  programme_id?: number;
}

export interface SyncBatchResponse {
  synced_count: number;
  duplicate_count: number;
  invalid_count: number;
  results: AttendanceMarkResponse[];
}

export interface AttendanceRecord {
  id: number;
  trainee_id: string;
  trainee_name: string;
  session_id: string;
  date: string;
  check_in_time: string;
  device_id: string;
  synced_from: 'web' | 'hardware';
  status: string;
  institution?: string | null;
}

export interface TraineeAttendanceSummary {
  trainee_id: string;
  name: string;
  institution?: string | null;
  total_sessions: number;
  attended_sessions: number;
  attendance_percentage: number;
  records: AttendanceRecord[];
}

export interface SessionAttendanceResponse {
  session_id: string;
  date: string;
  total_marked: number;
  attendees: AttendanceRecord[];
}

// --- Skill-Linked Assessment Types ---

export interface Skill {
  id: number;
  name: string;
  category: string;
}

export interface AssessmentQuestionCreate {
  skill_id: number;
  text: string;
  options: string[];
  correct_option: number;
  marks: number;
}

export interface AssessmentQuestionPublic {
  id: number;
  assessment_id: number;
  skill_id: number;
  skill_name?: string | null;
  text: string;
  options: string[];
  marks: number;
}

export interface AssessmentCreate {
  course_id: number;
  title: string;
  type: 'quiz' | 'practical' | 'project';
  questions: AssessmentQuestionCreate[];
}

export interface AssessmentResponse {
  id: number;
  course_id: number;
  course_title?: string | null;
  title: string;
  type: string;
  created_at: string;
  questions: AssessmentQuestionPublic[];
  total_questions?: number;
  total_marks?: number;
}

export interface SkillScoreItem {
  skill_id: number;
  skill_name: string;
  marks_obtained: number;
  total_marks: number;
  percentage: number;
}

export interface AssessmentAnswerItem {
  question_id: number;
  selected_option: number | string;
}

export interface AssessmentSubmitRequest {
  answers: AssessmentAnswerItem[] | Record<string, number>;
}

export interface AssessmentSubmitResponse {
  result_id: number;
  assessment_id: number;
  trainee_id: string;
  overall_score: number;
  total_marks_earned: number;
  total_marks_possible: number;
  skill_wise_score: Record<string, SkillScoreItem>;
  submitted_at: string;
}

export interface TraineeSkillScoreSummary {
  trainee_id: string;
  trainee_name?: string;
  name?: string;
  skills: SkillScoreItem[];
  updated_at?: string;
}

// --- AI Skill-Gap Engine Types ---

export interface JobRoleSkillReq {
  id: number;
  skill_id: number;
  skill_name: string;
  required_level: 'HIGH' | 'MEDIUM' | 'LOW';
  required_threshold: number;
}

export interface JobRole {
  id: number;
  title: string;
  description?: string;
  created_at?: string;
  requirements?: JobRoleSkillReq[];
}

export interface SkillGapComparisonItem {
  skill_id: number;
  skill: string;
  skill_name: string;
  trainee_level: number;
  required_level: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  required_threshold: number;
  gap: boolean;
  gap_percentage: number;
  status: 'GAP' | 'MATCHED';
}

export interface SkillGapAnalysisResponse {
  trainee_id: string;
  trainee_name: string;
  job_role_id: number;
  job_role_title: string;
  job_role_description?: string;
  overall_match_percentage: number;
  total_skills_required: number;
  skills_matched: number;
  skills_gap_count: number;
  skills: SkillGapComparisonItem[];
}

export interface RecommendedModuleItem {
  skill_id: number;
  skill_name: string;
  module_id: number;
  module_title: string;
  course_id: number;
  course_title?: string;
  order: number;
  recommendation_text: string;
  player_url: string;
  gap_percentage: number;
}

export interface TraineeRecommendationsResponse {
  trainee_id: string;
  trainee_name: string;
  job_role_id?: number | null;
  job_role_title?: string | null;
  total_gaps_identified: number;
  recommendations: RecommendedModuleItem[];
}

// --- Dynamic Skill Passport Types ---

export interface PassportSkillItem {
  skill_id: number;
  skill_name: string;
  category: string;
  level: number; // 1 to 5
  level_label: string; // e.g. "Level 4 (Advanced)"
  display_format: string; // e.g. "Accounting: Level 4"
  percentage: number;
}

export interface CertificateItem {
  id: number;
  title: string;
  certificate_code: string;
  issued_date: string;
  programme_title?: string | null;
}

export interface SkillPassportResponse {
  trainee_id: string;
  user_id: number;
  name: string;
  email: string;
  institution?: string | null;
  education?: string | null;
  preferred_language?: string | null;
  passport_code: string;
  skills: PassportSkillItem[];
  certificates_count: number;
  completed_courses_count: number;
  completed_projects_count: number;
  overall_score: number;
  overall_level: number;
  overall_level_label: string;
  certificates: CertificateItem[];
  issued_at: string;
  shareable_url: string;
}

// --- Verified Digital Certificate Types ---

export interface CertificateDetail {
  id: number;
  certificate_id: string;
  certificate_code?: string | null;
  trainee_id: number;
  trainee_name: string;
  trainee_code?: string | null;
  course_id?: number | null;
  course_title: string;
  institution_id?: number | null;
  institution_name: string;
  title: string;
  completion_date: string;
  issued_date: string;
  assessment_status: string;
  issued_by: string;
  is_verified: boolean;
  verification_url: string;
  pdf_download_url: string;
}

export interface CertificateVerificationResult {
  is_valid: boolean;
  message: string;
  certificate?: CertificateDetail | null;
}

export interface CertificateEligibility {
  eligible: boolean;
  course_id: number;
  course_title: string;
  course_completion_pct: number;
  assessment_passed: boolean;
  assessment_score?: number | null;
  certificate_id?: string | null;
  message: string;
}

export interface JobRoleSkillRequirement {
  skill_id: number;
  skill_name: string;
  required_level: string;
  threshold_pct: number;
}

export interface JobPostingCreate {
  job_role_id: number;
  title: string;
  description?: string;
  location?: string;
  is_active?: boolean;
}

export interface JobPosting {
  id: number;
  employer_id: number;
  employer_name: string;
  job_role_id: number;
  job_role_title: string;
  title: string;
  description?: string;
  location: string;
  posted_at: string;
  is_active: boolean;
  required_skills: JobRoleSkillRequirement[];
  total_candidates_matched?: number;
}

export interface CandidateMatch {
  trainee_id: string;
  name: string;
  match_percentage: number;
  matched_skills: string[];
  gap_skills: string[];
}

export interface ContactCandidateRequest {
  trainee_id: string;
  job_posting_id: number;
  message: string;
}

export interface ContactCandidateResponse {
  success: boolean;
  message: string;
  contact_id: number;
  trainee_name: string;
  created_at: string;
}

export interface EmploymentRecordCreate {
  trainee_id: string | number;
  job_posting_id: number;
  hired_date?: string;
  status?: string;
}

export interface EmploymentRecord {
  id: number;
  trainee_id: number;
  trainee_code?: string;
  trainee_name: string;
  employer_id: number;
  employer_name: string;
  job_posting_id: number;
  job_title: string;
  hired_date: string;
  status: string;
}

export type FeedbackRatingType = 'LOW' | 'MEDIUM' | 'GOOD' | 'HIGH';

export interface SkillFeedbackItem {
  skill_id: number;
  rating: FeedbackRatingType;
  comments?: string;
}

export interface EmployerFeedbackSubmission {
  employment_record_id: number;
  feedback: SkillFeedbackItem[];
}

export interface EmployerFeedbackResponse {
  id: number;
  employment_record_id: number;
  skill_id: number;
  skill_name?: string;
  rating: FeedbackRatingType;
  comments?: string;
  submitted_at: string;
  created_at?: string;
}

