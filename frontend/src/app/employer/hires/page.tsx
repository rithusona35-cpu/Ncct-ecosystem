'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { authApi } from '@/lib/api';
import {
  EmploymentRecord,
  EmployerFeedbackResponse,
  FeedbackRatingType,
  JobRoleSkillRequirement
} from '@/lib/types';
import { DashboardLayout } from '@/components/ui/DashboardLayout';
import { KPICard } from '@/components/ui/KPICard';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import {
  UserCheck,
  Briefcase,
  Calendar,
  MessageSquare,
  Eye,
  Star,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Check,
  X,
  Send,
  Building2,
  RefreshCw,
  Sparkles,
  HelpCircle,
  Award
} from 'lucide-react';
import Link from 'next/link';

interface SkillFeedbackState {
  skill_id: number;
  skill_name: string;
  rating: FeedbackRatingType;
  comments: string;
}

export default function EmployerHiresPage() {
  const [hires, setHires] = useState<EmploymentRecord[]>([]);
  const [feedbacksMap, setFeedbacksMap] = useState<Record<number, EmployerFeedbackResponse[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Give Feedback Modal State
  const [activeHireForFeedback, setActiveHireForFeedback] = useState<EmploymentRecord | null>(null);
  const [feedbackSkills, setFeedbackSkills] = useState<SkillFeedbackState[]>([]);
  const [isLoadingSkills, setIsLoadingSkills] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccessMsg, setFeedbackSuccessMsg] = useState<string | null>(null);

  // View Feedback Modal State
  const [activeHireForViewFeedback, setActiveHireForViewFeedback] = useState<EmploymentRecord | null>(null);
  const [viewFeedbackList, setViewFeedbackList] = useState<EmployerFeedbackResponse[]>([]);
  const [isLoadingViewFeedback, setIsLoadingViewFeedback] = useState(false);

  useEffect(() => {
    loadHiresAndFeedback();
  }, []);

  const loadHiresAndFeedback = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const records = await authApi.getEmploymentRecords();
      setHires(records);

      // Load feedback for each hire
      const fbPromises = records.map(async (rec) => {
        try {
          const fb = await authApi.getEmploymentRecordFeedback(rec.id);
          return { id: rec.id, feedback: fb };
        } catch {
          return { id: rec.id, feedback: [] };
        }
      });

      const fbResults = await Promise.all(fbPromises);
      const newMap: Record<number, EmployerFeedbackResponse[]> = {};
      fbResults.forEach((item) => {
        newMap[item.id] = item.feedback;
      });
      setFeedbacksMap(newMap);
    } catch (err: any) {
      console.error('Failed to load hires', err);
      setError(err.message || 'Failed to load employment records.');
    } finally {
      setIsLoading(false);
    }
  };

  // Open Give Feedback Modal
  const handleOpenGiveFeedback = async (hire: EmploymentRecord) => {
    setActiveHireForFeedback(hire);
    setFeedbackSuccessMsg(null);
    setIsLoadingSkills(true);

    try {
      let skillsToRate: { id: number; name: string }[] = [];
      try {
        const job = await authApi.getJobPosting(hire.job_posting_id);
        if (job && job.required_skills && job.required_skills.length > 0) {
          skillsToRate = job.required_skills.map((s: JobRoleSkillRequirement) => ({
            id: s.skill_id,
            name: s.skill_name,
          }));
        }
      } catch (err) {
        console.warn('Could not fetch job posting required skills, falling back to general registry', err);
      }

      if (skillsToRate.length === 0) {
        const allSkills = await authApi.getSkills();
        skillsToRate = allSkills.slice(0, 3).map((s) => ({ id: s.id, name: s.name }));
      }

      const existing = feedbacksMap[hire.id] || [];
      const existingMap: Record<number, EmployerFeedbackResponse> = {};
      existing.forEach((ef) => {
        existingMap[ef.skill_id] = ef;
      });

      const initialSkillsState: SkillFeedbackState[] = skillsToRate.map((s) => ({
        skill_id: s.id,
        skill_name: s.name,
        rating: existingMap[s.id]?.rating || 'GOOD',
        comments: existingMap[s.id]?.comments || '',
      }));

      setFeedbackSkills(initialSkillsState);
    } catch (err: any) {
      alert(`Could not load skills for evaluation: ${err.message || 'Error'}`);
      setActiveHireForFeedback(null);
    } finally {
      setIsLoadingSkills(false);
    }
  };

  const handleRatingChange = (skillId: number, rating: FeedbackRatingType) => {
    setFeedbackSkills((prev) =>
      prev.map((s) => (s.skill_id === skillId ? { ...s, rating } : s))
    );
  };

  const handleCommentChange = (skillId: number, comments: string) => {
    setFeedbackSkills((prev) =>
      prev.map((s) => (s.skill_id === skillId ? { ...s, comments } : s))
    );
  };

  const handleSubmitFeedback = async () => {
    if (!activeHireForFeedback) return;

    setIsSubmittingFeedback(true);
    try {
      const payload = {
        employment_record_id: activeHireForFeedback.id,
        feedback: feedbackSkills.map((s) => ({
          skill_id: s.skill_id,
          rating: s.rating,
          comments: s.comments.trim() || undefined,
        })),
      };

      const submitted = await authApi.submitEmployerFeedback(payload);

      setFeedbacksMap((prev) => ({
        ...prev,
        [activeHireForFeedback.id]: submitted,
      }));

      setFeedbackSuccessMsg('Feedback submitted successfully and added to NCCT skill analytics!');
      setTimeout(() => {
        setActiveHireForFeedback(null);
      }, 1500);
    } catch (err: any) {
      alert(`Failed to submit feedback: ${err.message || 'Network error'}`);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleOpenViewFeedback = async (hire: EmploymentRecord) => {
    setActiveHireForViewFeedback(hire);
    setIsLoadingViewFeedback(true);
    try {
      const fbList = await authApi.getEmploymentRecordFeedback(hire.id);
      setViewFeedbackList(fbList);
    } catch (err: any) {
      console.error('Failed to load feedback', err);
      setViewFeedbackList(feedbacksMap[hire.id] || []);
    } finally {
      setIsLoadingViewFeedback(false);
    }
  };

  const evaluatedCount = Object.values(feedbacksMap).filter((f) => f.length > 0).length;

  return (
    <ProtectedRoute allowedRoles={['EMPLOYER', 'ADMIN']}>
      <DashboardLayout
        role="employer"
        activeRoute="/employer/hires"
        title="Confirmed Hires & Post-Placement Feedback"
        subtitle="Track NCCT graduates onboarded into your organization and submit workplace competency ratings to update the national feedback loop."
        headerActions={
          <div className="flex items-center gap-3">
            <button
              onClick={loadHiresAndFeedback}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-2xs cursor-pointer"
              title="Refresh hires list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <Link
              href="/employer/matches"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-warning" />
              <span>Candidate Matches</span>
            </Link>
          </div>
        }
      >
        <div className="space-y-6">
          {/* KPI Cards */}
          {isLoading ? (
            <LoadingSkeleton variant="kpi" count={4} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Confirmed Placements"
                value={hires.length}
                icon={<UserCheck className="w-5 h-5" />}
                variant="secondary"
                description="Graduates active in cooperative roles"
              />
              <KPICard
                title="Evaluations Completed"
                value={evaluatedCount}
                icon={<MessageSquare className="w-5 h-5" />}
                variant="primary"
                description="Hires with post-placement ratings"
              />
              <KPICard
                title="Verified Passports"
                value={hires.length}
                icon={<ShieldCheck className="w-5 h-5" />}
                variant="default"
                description="Digital credentials verified at hire"
              />
              <KPICard
                title="Retention Index"
                value="100%"
                icon={<Award className="w-5 h-5" />}
                variant="warning"
                description="Active retention across placements"
              />
            </div>
          )}

          {error && (
            <div className="p-4 bg-danger-50 border border-danger-200 rounded-xl text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-danger shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Hires List */}
          {isLoading ? (
            <LoadingSkeleton variant="card" count={3} />
          ) : hires.length === 0 ? (
            <EmptyState
              icon={<UserCheck className="w-8 h-8 text-primary" />}
              title="No Employment Records Found"
              message="You have not marked any candidates as hired yet. To record a hire, visit Candidate Matches and click Mark as Hired."
              actionLabel="Find Candidates"
              actionHref="/employer/matches"
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span className="font-bold uppercase tracking-wider text-slate-700">
                  {hires.length} Registered Placements
                </span>
                <span>Click &quot;Give Feedback&quot; to submit workplace competency ratings</span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {hires.map((hire) => {
                  const feedbackItems = feedbacksMap[hire.id] || [];
                  const hasFeedback = feedbackItems.length > 0;

                  return (
                    <div
                      key={hire.id}
                      id={`hire-card-${hire.id}`}
                      className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs hover:shadow-md transition flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                    >
                      {/* Left: Candidate Details & Meta */}
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="w-10 h-10 rounded-xl bg-secondary-50 text-secondary border border-secondary-100 flex items-center justify-center font-bold text-sm">
                            {hire.trainee_name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                              {hire.trainee_name}
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                                {hire.trainee_code || `NCCT-TR-${hire.trainee_id}`}
                              </span>
                            </h3>
                            <div className="flex items-center gap-4 text-xs text-slate-500 pt-0.5 flex-wrap">
                              <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                                {hire.job_title}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                Hired {new Date(hire.hired_date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status & Feedback Preview Tag */}
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <Badge status="completed" label={hire.status} size="sm" />
                          {hasFeedback ? (
                            <Badge
                              status="matched"
                              label={`${feedbackItems.length} Competencies Evaluated`}
                              size="sm"
                            />
                          ) : (
                            <Badge
                              status="pending"
                              label="Feedback Pending"
                              size="sm"
                            />
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-row lg:flex-col gap-2 shrink-0 justify-end">
                        {hasFeedback && (
                          <button
                            id={`view-feedback-btn-${hire.id}`}
                            onClick={() => handleOpenViewFeedback(hire)}
                            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-primary" />
                            <span>View Submitted Feedback</span>
                          </button>
                        )}

                        <button
                          id={`give-feedback-btn-${hire.id}`}
                          onClick={() => handleOpenGiveFeedback(hire)}
                          className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
                        >
                          <Star className="w-3.5 h-3.5 text-warning" />
                          <span>{hasFeedback ? 'Update Feedback' : 'Give Feedback'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal: Give Feedback */}
        {activeHireForFeedback && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl border border-slate-200 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary flex items-center justify-center">
                    <Star className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Submit Competency Feedback
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      For {activeHireForFeedback.trainee_name} ({activeHireForFeedback.job_title})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveHireForFeedback(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {feedbackSuccessMsg && (
                <div className="p-3 bg-secondary-50 border border-secondary-200 rounded-xl text-secondary-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-secondary shrink-0" />
                  <span className="font-semibold">{feedbackSuccessMsg}</span>
                </div>
              )}

              {isLoadingSkills ? (
                <div className="p-8 text-center text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                  Loading job-role competency matrix...
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600">
                    Rate candidate performance across core role skills. Ratings directly update curriculum training benchmarks.
                  </p>

                  <div className="space-y-3">
                    {feedbackSkills.map((sk) => (
                      <div
                        key={sk.skill_id}
                        className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">{sk.skill_name}</span>
                          <Badge
                            status={sk.rating === 'HIGH' ? 'matched' : sk.rating === 'MEDIUM' ? 'gap' : 'pending'}
                            label={sk.rating}
                            size="sm"
                          />
                        </div>

                        {/* Rating pills */}
                        <div className="flex items-center gap-2">
                          {(['HIGH', 'GOOD', 'MEDIUM', 'LOW'] as FeedbackRatingType[]).map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => handleRatingChange(sk.skill_id, r)}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                sk.rating === r
                                  ? r === 'HIGH' || r === 'GOOD'
                                    ? 'bg-secondary text-white shadow-2xs'
                                    : 'bg-warning text-white shadow-2xs'
                                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>

                        <input
                          type="text"
                          value={sk.comments}
                          onChange={(e) => handleCommentChange(sk.skill_id, e.target.value)}
                          placeholder="Optional notes or feedback..."
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setActiveHireForFeedback(null)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingFeedback}
                      onClick={handleSubmitFeedback}
                      className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmittingFeedback ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Submit Evaluation</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: View Feedback */}
        {activeHireForViewFeedback && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary flex items-center justify-center">
                    <Eye className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Evaluated Competencies
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Feedback for {activeHireForViewFeedback.trainee_name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveHireForViewFeedback(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isLoadingViewFeedback ? (
                <div className="p-8 text-center text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                  Loading feedback records...
                </div>
              ) : viewFeedbackList.length === 0 ? (
                <EmptyState
                  icon={<MessageSquare className="w-7 h-7 text-primary" />}
                  title="No Feedback Records"
                  message="No feedback submitted for this hire yet."
                />
              ) : (
                <div className="space-y-2.5">
                  {viewFeedbackList.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-4"
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-slate-900">{item.skill_name}</div>
                        {item.comments && (
                          <div className="text-[11px] text-slate-600 italic">
                            &quot;{item.comments}&quot;
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400">
                          Submitted {new Date(item.submitted_at || item.created_at || Date.now()).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge
                        status={item.rating === 'HIGH' ? 'matched' : item.rating === 'MEDIUM' ? 'gap' : 'pending'}
                        label={item.rating}
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
