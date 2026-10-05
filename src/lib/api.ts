import { cookieStorage } from './cookies';
import {
  TokenResponse,
  User,
  TraineeProfile,
  Institution,
  TrainingProgramme,
  Module,
  ContentItem,
  Batch,
  BatchTrainee,
  EnrolledCourse,
  ModuleContentStatus,
  Quiz,
  QuizSubmitResponse,
  CourseProgress,
  AttendanceMarkRequest,
  AttendanceMarkResponse,
  SyncBatchItem,
  SyncBatchResponse,
  AttendanceRecord,
  TraineeAttendanceSummary,
  SessionAttendanceResponse,
  Skill,
  AssessmentCreate,
  AssessmentResponse,
  AssessmentSubmitResponse,
  AssessmentAnswerItem,
  TraineeSkillScoreSummary,
  JobRole,
  SkillGapAnalysisResponse,
  TraineeRecommendationsResponse,
  SkillPassportResponse,
  CertificateDetail,
  CertificateVerificationResult,
  CertificateEligibility,
  JobPosting,
  JobPostingCreate,
  CandidateMatch,
  ContactCandidateRequest,
  ContactCandidateResponse,
  EmploymentRecordCreate,
  EmploymentRecord,
  EmployerFeedbackSubmission,
  EmployerFeedbackResponse
} from './types';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = cookieStorage.getAccessToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  let response = await fetch(url, { ...options, headers });

  // Handle automatic token refresh if 401 Unauthorized
  if (response.status === 401 && cookieStorage.getRefreshToken()) {
    try {
      const refreshToken = cookieStorage.getRefreshToken();
      const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        cookieStorage.setAccessToken(refreshData.access_token);
        
        // Retry the original request with new token
        headers.set('Authorization', `Bearer ${refreshData.access_token}`);
        response = await fetch(url, { ...options, headers });
      } else {
        // Refresh token is also expired or invalid
        cookieStorage.clearAuth();
      }
    } catch {
      cookieStorage.clearAuth();
    }
  }

  return response;
}

export const authApi = {
  async register(data: { name: string; email: string; password: string; role: string }): Promise<TokenResponse> {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(err.detail || 'Registration failed');
    }
    return res.json();
  },

  async login(data: { email: string; password: string }): Promise<TokenResponse> {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Invalid credentials' }));
      throw new Error(err.detail || 'Login failed');
    }
    return res.json();
  },

  async getMe(): Promise<User> {
    const res = await fetchWithAuth('/api/auth/me');
    if (!res.ok) {
      throw new Error('Failed to fetch user profile');
    }
    return res.json();
  },

  async getMyProfile(): Promise<TraineeProfile | null> {
    const res = await fetchWithAuth('/api/trainee/profile/me');
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to load profile' }));
      throw new Error(err.detail || 'Failed to load profile');
    }
    return res.json();
  },

  async saveProfile(data: {
    name?: string;
    institution: string;
    course_enrolled: string;
    education?: string;
    preferred_language?: string;
    previous_skills: string[];
    phone?: string;
    address?: string;
  }): Promise<TraineeProfile> {
    const res = await fetchWithAuth('/api/trainee/profile', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to save profile' }));
      throw new Error(err.detail || 'Failed to save profile');
    }
    return res.json();
  },

  async getProfileById(identifier: string | number): Promise<TraineeProfile> {
    const res = await fetchWithAuth(`/api/trainee/profile/${identifier}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Profile not found' }));
      throw new Error(err.detail || 'Profile not found');
    }
    return res.json();
  },

  // Institutions
  async getInstitutions(): Promise<Institution[]> {
    const res = await fetch(`${API_BASE_URL}/api/institutions`);
    if (!res.ok) return [];
    return res.json();
  },

  // Training Programmes
  async createProgramme(data: {
    title: string;
    description?: string;
    institution_id: number;
    start_date?: string;
    end_date?: string;
  }): Promise<TrainingProgramme> {
    const res = await fetchWithAuth('/api/trainer/programmes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create programme' }));
      throw new Error(err.detail || 'Failed to create programme');
    }
    return res.json();
  },

  async getProgrammes(): Promise<TrainingProgramme[]> {
    const res = await fetchWithAuth('/api/trainer/programmes');
    if (!res.ok) throw new Error('Failed to load programmes');
    return res.json();
  },

  async getProgramme(id: number): Promise<TrainingProgramme> {
    const res = await fetchWithAuth(`/api/trainer/programmes/${id}`);
    if (!res.ok) throw new Error('Programme not found');
    return res.json();
  },

  // Modules & Content
  async addModule(programmeId: number, data: { title: string; order: number }): Promise<Module> {
    const res = await fetchWithAuth(`/api/trainer/programmes/${programmeId}/modules`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to add module');
    return res.json();
  },

  async addContent(moduleId: number, data: {
    type: 'video' | 'pdf' | 'note';
    title: string;
    url_or_file_path: string;
    order: number;
  }): Promise<ContentItem> {
    const res = await fetchWithAuth(`/api/trainer/modules/${moduleId}/content`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to add content item');
    return res.json();
  },

  async uploadContent(moduleId: number, formData: FormData): Promise<ContentItem> {
    const token = cookieStorage.getAccessToken();
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    // Do NOT set Content-Type header so browser sets multipart boundary automatically
    const res = await fetch(`${API_BASE_URL}/api/trainer/modules/${moduleId}/upload-content`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) throw new Error('File upload failed');
    return res.json();
  },

  // Batches
  async createBatch(programmeId: number, data: { batch_name: string }): Promise<Batch> {
    const res = await fetchWithAuth(`/api/trainer/programmes/${programmeId}/batches`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create batch');
    return res.json();
  },

  async addTraineesToBatch(batchId: number, traineeIds: string[]): Promise<BatchTrainee[]> {
    const res = await fetchWithAuth(`/api/trainer/batches/${batchId}/trainees`, {
      method: 'POST',
      body: JSON.stringify({ trainee_ids: traineeIds }),
    });
    if (!res.ok) throw new Error('Failed to add trainees to batch');
    return res.json();
  },

  async getBatchTrainees(batchId: number): Promise<BatchTrainee[]> {
    const res = await fetchWithAuth(`/api/trainer/batches/${batchId}/trainees`);
    if (!res.ok) return [];
    return res.json();
  },

  async searchTrainees(query: string): Promise<BatchTrainee[]> {
    const res = await fetchWithAuth(`/api/trainer/trainees/search?query=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    return res.json();
  },

  // Trainee Courses
  async getMyCourses(): Promise<EnrolledCourse[]> {
    const res = await fetchWithAuth('/api/courses/my-courses');
    if (!res.ok) return [];
    return res.json();
  },

  async getProtectedResource(roleRoute: 'trainee' | 'trainer' | 'admin' | 'employer'): Promise<{ message: string; user_id: number; role: string }> {
    const res = await fetchWithAuth(`/api/protected/${roleRoute}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Access denied' }));
      const error: any = new Error(err.detail || 'Access forbidden');
      error.status = res.status;
      throw error;
    }
    return res.json();
  },

  // LMS & Quiz Engine
  async getModuleContent(moduleId: number): Promise<ModuleContentStatus> {
    const res = await fetchWithAuth(`/api/lms/module/${moduleId}/content`);
    if (!res.ok) throw new Error('Failed to load module content');
    return res.json();
  },

  async markContentComplete(contentItemId: number, moduleId?: number): Promise<{ id: number; status: string; completed_at: string }> {
    const res = await fetchWithAuth('/api/lms/progress/mark-complete', {
      method: 'POST',
      body: JSON.stringify({ content_item_id: contentItemId, module_id: moduleId }),
    });
    if (!res.ok) throw new Error('Failed to mark content complete');
    return res.json();
  },

  async getQuiz(quizId: number): Promise<Quiz> {
    const res = await fetchWithAuth(`/api/lms/quiz/${quizId}`);
    if (!res.ok) throw new Error('Failed to load quiz');
    return res.json();
  },

  async submitQuiz(quizId: number, answers: Record<string, number>): Promise<QuizSubmitResponse> {
    const res = await fetchWithAuth(`/api/lms/quiz/${quizId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
    if (!res.ok) throw new Error('Failed to submit quiz');
    return res.json();
  },

  async getCourseProgress(traineeId: string = 'me'): Promise<CourseProgress[]> {
    const res = await fetchWithAuth(`/api/lms/progress/${traineeId}`);
    if (!res.ok) return [];
    return res.json();
  },

  // Attendance & Hardware Node Sync
  async markAttendance(data: AttendanceMarkRequest): Promise<AttendanceMarkResponse> {
    const res = await fetch(`${API_BASE_URL}/api/attendance/mark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Server error (${res.status}): ${errText || res.statusText}`);
    }
    return res.json();
  },

  async syncBatchAttendance(records: SyncBatchItem[]): Promise<SyncBatchResponse> {
    const res = await fetch(`${API_BASE_URL}/api/attendance/sync-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Server error (${res.status}): ${errText || res.statusText}`);
    }
    return res.json();
  },

  async getTraineeAttendance(traineeId: string = 'me'): Promise<TraineeAttendanceSummary> {
    const res = await fetchWithAuth(`/api/attendance/trainee/${traineeId}`);
    if (!res.ok) throw new Error('Failed to load attendance summary');
    return res.json();
  },

  async getSessionAttendance(sessionId: string, date?: string): Promise<SessionAttendanceResponse> {
    const url = date
      ? `/api/attendance/session/${sessionId}?date=${encodeURIComponent(date)}`
      : `/api/attendance/session/${sessionId}`;
    const res = await fetchWithAuth(url);
    if (!res.ok) throw new Error('Failed to load session attendance');
    return res.json();
  },

  async getTodayAttendance(): Promise<AttendanceRecord[]> {
    const res = await fetchWithAuth('/api/attendance/today');
    if (!res.ok) return [];
    return res.json();
  },

  // --- Skill-Linked Assessment Engine ---
  async getSkills(): Promise<Skill[]> {
    const res = await fetchWithAuth('/api/skills');
    if (!res.ok) throw new Error('Failed to load skills');
    return res.json();
  },

  async createAssessment(data: AssessmentCreate): Promise<AssessmentResponse> {
    const res = await fetchWithAuth('/api/assessment', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create assessment' }));
      throw new Error(err.detail || 'Failed to create assessment');
    }
    return res.json();
  },

  async getAssessment(id: number): Promise<AssessmentResponse> {
    const res = await fetchWithAuth(`/api/assessment/${id}`);
    if (!res.ok) throw new Error('Assessment not found');
    return res.json();
  },

  async getCourseAssessments(courseId: number): Promise<AssessmentResponse[]> {
    const res = await fetchWithAuth(`/api/assessment/course/${courseId}`);
    if (!res.ok) return [];
    return res.json();
  },

  async submitAssessment(id: number, answers: AssessmentAnswerItem[] | Record<string, number>): Promise<AssessmentSubmitResponse> {
    const res = await fetchWithAuth(`/api/assessment/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to submit assessment' }));
      throw new Error(err.detail || 'Failed to submit assessment');
    }
    return res.json();
  },

  async getTraineeSkillScores(traineeId: string = 'me'): Promise<TraineeSkillScoreSummary> {
    const res = await fetchWithAuth(`/api/assessment/trainee/${traineeId}/skill-scores`);
    if (!res.ok) throw new Error('Failed to fetch skill scores');
    return res.json();
  },

  // --- AI Skill-Gap Engine Client Methods ---
  async getJobRoles(): Promise<JobRole[]> {
    const res = await fetchWithAuth('/api/skills/job-roles');
    if (!res.ok) return [];
    return res.json();
  },

  async getJobRoleDetail(id: number): Promise<JobRole> {
    const res = await fetchWithAuth(`/api/skills/job-roles/${id}`);
    if (!res.ok) throw new Error('Job role not found');
    return res.json();
  },

  async getSkillGapAnalysis(traineeId: string | number = 'me', jobRoleId: number): Promise<SkillGapAnalysisResponse> {
    const res = await fetchWithAuth(`/api/skills/gap-analysis/${traineeId}/${jobRoleId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to calculate skill-gap analysis' }));
      throw new Error(err.detail || 'Failed to calculate skill-gap analysis');
    }
    return res.json();
  },

  async getSkillRecommendations(traineeId: string | number = 'me', jobRoleId?: number): Promise<TraineeRecommendationsResponse> {
    const url = jobRoleId
      ? `/api/skills/recommendations/${traineeId}?job_role_id=${jobRoleId}`
      : `/api/skills/recommendations/${traineeId}`;
    const res = await fetchWithAuth(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to load recommendations' }));
      throw new Error(err.detail || 'Failed to load recommendations');
    }
    return res.json();
  },

  // --- Dynamic Skill Passport Method ---
  async getSkillPassport(traineeId: string | number = 'me'): Promise<SkillPassportResponse> {
    const res = await fetchWithAuth(`/api/skill-passport/${traineeId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to load skill passport' }));
      throw new Error(err.detail || 'Failed to load skill passport');
    }
    return res.json();
  },

  // --- Digital Certificate Methods ---
  async getMyCertificates(): Promise<CertificateDetail[]> {
    const res = await fetchWithAuth('/api/certificates/my-certificates');
    if (!res.ok) return [];
    return res.json();
  },

  async verifyCertificate(certificateId: string): Promise<CertificateVerificationResult> {
    const cleanId = certificateId.trim();
    const res = await fetch(`${API_BASE_URL}/api/certificates/verify/${encodeURIComponent(cleanId)}`);
    if (!res.ok) {
      return {
        is_valid: false,
        message: 'Unable to connect to verification authority.'
      };
    }
    return res.json();
  },

  async getCertificateById(certificateId: string): Promise<CertificateDetail> {
    const res = await fetch(`${API_BASE_URL}/api/certificates/${encodeURIComponent(certificateId)}`);
    if (!res.ok) throw new Error('Certificate not found');
    return res.json();
  },

  async checkCertificateEligibility(courseId: number): Promise<CertificateEligibility> {
    const res = await fetchWithAuth(`/api/certificates/check-eligibility/${courseId}`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to verify eligibility' }));
      throw new Error(err.detail || 'Failed to verify eligibility');
    }
    return res.json();
  },

  getCertificatePdfDownloadUrl(certificateId: string): string {
    return `${API_BASE_URL}/api/certificates/${encodeURIComponent(certificateId)}/pdf`;
  },

  // --- Employer Portal & Candidate Matching Methods ---
  async getMyJobPostings(): Promise<JobPosting[]> {
    const res = await fetchWithAuth('/api/employer/job-postings');
    if (!res.ok) return [];
    return res.json();
  },

  async getJobPosting(id: number): Promise<JobPosting> {
    const res = await fetchWithAuth(`/api/employer/job-postings/${id}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to load job posting' }));
      throw new Error(err.detail || 'Failed to load job posting');
    }
    return res.json();
  },

  async createJobPosting(data: JobPostingCreate): Promise<JobPosting> {
    const res = await fetchWithAuth('/api/employer/job-postings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create job posting' }));
      throw new Error(err.detail || 'Failed to create job posting');
    }
    return res.json();
  },

  async getJobMatches(jobId: number): Promise<CandidateMatch[]> {
    const res = await fetchWithAuth(`/api/employer/job-postings/${jobId}/matches`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to calculate candidate matches' }));
      throw new Error(err.detail || 'Failed to calculate candidate matches');
    }
    return res.json();
  },

  async contactCandidate(data: ContactCandidateRequest): Promise<ContactCandidateResponse> {
    const res = await fetchWithAuth('/api/employer/contact-candidate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to contact candidate' }));
      throw new Error(err.detail || 'Failed to contact candidate');
    }
    return res.json();
  },

  async createEmploymentRecord(data: EmploymentRecordCreate): Promise<EmploymentRecord> {
    const res = await fetchWithAuth('/api/employer/employment-records', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to record hire' }));
      throw new Error(err.detail || 'Failed to record hire');
    }
    return res.json();
  },

  async getEmploymentRecords(): Promise<EmploymentRecord[]> {
    const res = await fetchWithAuth('/api/employer/employment-records');
    if (!res.ok) return [];
    return res.json();
  },

  async submitEmployerFeedback(data: EmployerFeedbackSubmission): Promise<EmployerFeedbackResponse[]> {
    const res = await fetchWithAuth('/api/employer/feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to submit feedback' }));
      throw new Error(err.detail || 'Failed to submit feedback');
    }
    return res.json();
  },

  async getEmploymentRecordFeedback(id: number): Promise<EmployerFeedbackResponse[]> {
    const res = await fetchWithAuth(`/api/employer/employment-records/${id}/feedback`);
    if (!res.ok) return [];
    return res.json();
  },

  // --- Admin Analytics & Overview Stats Methods ---
  async getAdminOverviewStats(): Promise<AdminOverviewStats> {
    const res = await fetchWithAuth('/api/admin/stats/overview');
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch overview stats' }));
      throw new Error(err.detail || 'Failed to fetch overview stats');
    }
    return res.json();
  },

  async getAdminLowCompletionCourses(threshold: number = 50): Promise<LowCompletionCourse[]> {
    const res = await fetchWithAuth(`/api/admin/stats/low-completion-courses?threshold=${threshold}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch low completion courses' }));
      throw new Error(err.detail || 'Failed to fetch low completion courses');
    }
    return res.json();
  },

  async getAdminSkillGaps(): Promise<CombinedSkillGap[]> {
    const res = await fetchWithAuth('/api/admin/stats/skill-gaps');
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch skill gaps' }));
      throw new Error(err.detail || 'Failed to fetch skill gaps');
    }
    return res.json();
  },

  async getAdminHighDemandSkills(): Promise<HighDemandSkill[]> {
    const res = await fetchWithAuth('/api/admin/stats/high-demand-skills');
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch high demand skills' }));
      throw new Error(err.detail || 'Failed to fetch high demand skills');
    }
    return res.json();
  },

  async getAdminFeedbackSkillGaps(): Promise<CommonSkillGapItem[]> {
    const res = await fetchWithAuth('/api/admin/feedback/skill-gaps');
    if (!res.ok) return [];
    return res.json();
  }
};

export const api = authApi;

export interface AdminOverviewStats {

  total_trainees: number;
  total_programmes: number;
  total_institutes: number;
  overall_completion_rate: number;
  average_attendance: number;
}

export interface LowCompletionCourse {
  course_id: number;
  course_title: string;
  title?: string;
  completion_percentage: number;
  completion_rate?: number;
}

export interface CombinedSkillGap {
  skill_name: string;
  source: 'employer_feedback' | 'training_gap' | 'both';
  severity_score: number;
  skill_id?: number;
  employer_low_ratio?: number;
  training_gap_count?: number;
}

export interface HighDemandSkill {
  skill_id?: number;
  skill_name: string;
  demand_count: number;
  count?: number;
}

export interface CommonSkillGapItem {
  skill_name: string;
  total_reports: number;
  low_rating_ratio: number;
  flagged: boolean;
}

export interface ChatbotMessageResponse {
  intent: string;
  response: string;
  is_fallback: boolean;
}

export async function sendChatMessage(message: string): Promise<ChatbotMessageResponse> {
  const res = await fetchWithAuth('/api/chatbot/message', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to communicate with NCCT AI Assistant');
  }
  return res.json();
}

export async function updateUserLanguage(language: string): Promise<{ success: boolean; language: string }> {
  try {
    const res = await fetchWithAuth('/api/auth/me/language', {
      method: 'POST',
      body: JSON.stringify({ language }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // gracefully fall back to local language switch
  }
  return { success: true, language };
}
