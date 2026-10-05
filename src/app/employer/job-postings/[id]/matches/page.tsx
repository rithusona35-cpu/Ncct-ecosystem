'use client';

import React, { useEffect, useState, use } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { authApi } from '@/lib/api';
import { JobPosting, CandidateMatch, SkillPassportResponse } from '@/lib/types';
import SkillPassportCard from '@/components/SkillPassportCard';
import { DashboardLayout } from '@/components/ui/DashboardLayout';
import { KPICard } from '@/components/ui/KPICard';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import {
  ArrowLeft,
  Users,
  Award,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  MapPin,
  Calendar,
  Sparkles,
  Send,
  Loader2,
  ShieldCheck,
  Search,
  Check,
  X,
  FileBadge,
  Eye,
  UserCheck
} from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function JobMatchesPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.id;

  const [job, setJob] = useState<JobPosting | null>(null);
  const [matches, setMatches] = useState<CandidateMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Contact Candidate state
  const [activeContactCandidate, setActiveContactCandidate] = useState<CandidateMatch | null>(null);
  const [contactMessage, setContactMessage] = useState('');
  const [isSendingContact, setIsSendingContact] = useState(false);
  const [contactSuccessMap, setContactSuccessMap] = useState<Record<string, string>>({});

  // Mark as Hired state
  const [activeHireCandidate, setActiveHireCandidate] = useState<CandidateMatch | null>(null);
  const [hireDate, setHireDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isSubmittingHire, setIsSubmittingHire] = useState(false);
  const [hiredSuccessMap, setHiredSuccessMap] = useState<Record<string, boolean>>({});
  const [recentHiredAlert, setRecentHiredAlert] = useState<string | null>(null);

  // Inline Passport Preview Modal state
  const [previewPassportTraineeId, setPreviewPassportTraineeId] = useState<string | null>(null);
  const [previewPassportData, setPreviewPassportData] = useState<SkillPassportResponse | null>(null);
  const [isLoadingPassport, setIsLoadingPassport] = useState(false);
  const [passportError, setPassportError] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [jobData, matchesData, hiresData] = await Promise.all([
          authApi.getJobPosting(Number(jobId)),
          authApi.getJobMatches(Number(jobId)),
          authApi.getEmploymentRecords().catch(() => [])
        ]);
        setJob(jobData);
        setMatches(matchesData);

        // Pre-populate hired candidates
        const hiredMap: Record<string, boolean> = {};
        hiresData.forEach((h) => {
          if (h.job_posting_id === Number(jobId)) {
            if (h.trainee_code) hiredMap[h.trainee_code] = true;
            hiredMap[String(h.trainee_id)] = true;
          }
        });
        setHiredSuccessMap(hiredMap);
      } catch (err: any) {
        console.error('Failed to load job matches', err);
        setError(err.message || 'Failed to calculate candidate matches for this requisition.');
      } finally {
        setIsLoading(false);
      }
    };

    if (jobId) {
      fetchData();
    }
  }, [jobId]);

  // Open Contact modal
  const handleOpenContact = (candidate: CandidateMatch) => {
    setActiveContactCandidate(candidate);
    const defaultMsg = `Hello ${candidate.name},\n\nWe reviewed your verified NCCT Skill Passport for the ${
      job?.title || 'position'
    } requisition and were impressed by your certified competencies in ${candidate.matched_skills.join(
      ', '
    )}. We would like to invite you for an interview.`;
    setContactMessage(defaultMsg);
  };

  // Submit Contact message
  const handleSendContact = async () => {
    if (!activeContactCandidate || !job) return;

    setIsSendingContact(true);
    try {
      await authApi.contactCandidate({
        trainee_id: activeContactCandidate.trainee_id,
        job_posting_id: job.id,
        message: contactMessage,
      });

      setContactSuccessMap((prev) => ({
        ...prev,
        [activeContactCandidate.trainee_id]: contactMessage,
      }));
      setActiveContactCandidate(null);
    } catch (err: any) {
      alert(err.message || 'Failed to send interview invitation.');
    } finally {
      setIsSendingContact(false);
    }
  };

  // Open Mark as Hired modal
  const handleOpenHire = (candidate: CandidateMatch) => {
    setActiveHireCandidate(candidate);
  };

  // Submit Mark as Hired
  const handleConfirmHire = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHireCandidate || !job) return;

    setIsSubmittingHire(true);
    try {
      await authApi.createEmploymentRecord({
        job_posting_id: job.id,
        trainee_id: Number(activeHireCandidate.trainee_id) || 1,
        hired_date: hireDate,
      });

      setHiredSuccessMap((prev) => ({
        ...prev,
        [activeHireCandidate.trainee_id]: true,
      }));

      setRecentHiredAlert(
        `Placement recorded successfully! ${activeHireCandidate.name} has been marked as HIRED for "${job.title}".`
      );
      setActiveHireCandidate(null);
    } catch (err: any) {
      alert(err.message || 'Failed to record candidate placement.');
    } finally {
      setIsSubmittingHire(false);
    }
  };

  // Open Inline Passport Preview
  const handleOpenPassportPreview = async (candidate: CandidateMatch) => {
    setPreviewPassportTraineeId(candidate.trainee_id);
    setIsLoadingPassport(true);
    setPassportError(null);
    setPreviewPassportData(null);

    try {
      const passport = await authApi.getSkillPassport(candidate.trainee_id);
      setPreviewPassportData(passport);
    } catch (err: any) {
      console.error('Failed to preview skill passport', err);
      setPassportError('Could not load verifiable skill passport for this candidate.');
    } finally {
      setIsLoadingPassport(false);
    }
  };

  // Filter matches
  const filteredMatches = matches.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.trainee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.matched_skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const topMatch = matches.length > 0 ? Math.max(...matches.map((m) => m.match_percentage)) : 0;
  const avgMatch =
    matches.length > 0
      ? (matches.reduce((acc, m) => acc + m.match_percentage, 0) / matches.length).toFixed(1)
      : '0.0';
  const hiredCount = Object.keys(hiredSuccessMap).length;

  return (
    <ProtectedRoute allowedRoles={['EMPLOYER', 'ADMIN']}>
      <DashboardLayout
        role="employer"
        activeRoute="/employer/matches"
        title={job ? `Candidate Matches: ${job.title}` : 'Candidate Matches'}
        subtitle="Real-time competency matching against verified NCCT Trainee Skill Passports."
        breadcrumbs={[
          { label: 'Employer Dashboard', href: '/employer/dashboard' },
          { label: 'Job Postings', href: '/employer/job-postings' },
          { label: job ? job.title : `Requisition #${jobId}` },
        ]}
        headerActions={
          <div className="flex items-center gap-3">
            <Link
              href="/employer/job-postings"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Postings</span>
            </Link>
            <Link
              href="/employer/hires"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition shadow-xs"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Confirmed Hires</span>
            </Link>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Success Banner when candidate hired */}
          {recentHiredAlert && (
            <div className="p-4 bg-secondary-50 border border-secondary-200 rounded-xl flex items-center justify-between text-secondary-800 text-xs sm:text-sm">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-secondary shrink-0" />
                <span className="font-semibold">{recentHiredAlert}</span>
              </div>
              <Link
                href="/employer/hires"
                className="text-xs font-bold text-secondary underline ml-4 hover:text-secondary-800"
              >
                Go to Hires & Feedback &rarr;
              </Link>
            </div>
          )}

          {/* Job Overview Card */}
          {job && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-md bg-primary-50 text-primary border border-primary-100">
                      {job.job_role_title}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">Job #{job.id}</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    {job.title}
                  </h1>
                  <div className="flex items-center gap-4 text-xs text-slate-500 pt-0.5 flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {job.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Posted {new Date(job.posted_at).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      {job.employer_name}
                    </span>
                  </div>
                </div>

                <div className="bg-primary-50 border border-primary-100 rounded-xl p-3.5 text-center shrink-0">
                  <div className="text-[11px] text-primary font-semibold uppercase tracking-wider flex items-center justify-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-warning" />
                    AI Candidate Pipeline
                  </div>
                  <div className="text-xl font-black text-primary-900 mt-0.5">
                    {matches.length} Candidates
                  </div>
                  <div className="text-[10px] text-slate-500">Ranked by Match Score</div>
                </div>
              </div>

              {/* Required Skills Chips */}
              {job.required_skills && job.required_skills.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Benchmark Competency Matrix ({job.required_skills.length} Skills Required):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {job.required_skills.map((skill) => (
                      <span
                        key={skill.skill_id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                        <span className="font-semibold text-slate-900">{skill.skill_name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-bold uppercase bg-primary-50 text-primary border border-primary-200">
                          {skill.required_level}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* KPI Summary Cards */}
          {isLoading ? (
            <LoadingSkeleton variant="kpi" count={4} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Qualified Matches"
                value={matches.length}
                icon={<Users className="w-5 h-5" />}
                variant="primary"
                description="Trainees evaluated against matrix"
              />
              <KPICard
                title="Top Match Score"
                value={matches.length > 0 ? `${topMatch.toFixed(1)}%` : '0%'}
                icon={<Sparkles className="w-5 h-5" />}
                variant="secondary"
                description="Leading candidate alignment"
              />
              <KPICard
                title="Pool Average"
                value={`${avgMatch}%`}
                icon={<Award className="w-5 h-5" />}
                variant="default"
                description="Mean competency coverage"
              />
              <KPICard
                title="Placed Candidates"
                value={hiredCount}
                icon={<UserCheck className="w-5 h-5" />}
                variant="warning"
                description="Confirmed hires for this job"
              />
            </div>
          )}

          {/* Search Filter */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter candidates by name, ID, or skills..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-xs focus:ring-2 focus:ring-primary focus:border-primary transition"
              />
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Showing <strong className="text-slate-900">{filteredMatches.length}</strong> of{' '}
              {matches.length} candidates
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 bg-danger-50 border border-danger-200 rounded-xl text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-danger shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Candidate Match Cards */}
          {isLoading ? (
            <LoadingSkeleton variant="card" count={3} />
          ) : filteredMatches.length === 0 ? (
            <EmptyState
              icon={<Users className="w-8 h-8 text-primary" />}
              title="No Candidates Match Criteria"
              message={
                searchQuery
                  ? `No candidates match "${searchQuery}". Try a different keyword.`
                  : 'No trainees in the NCCT registry currently meet the threshold benchmark for this position.'
              }
            />
          ) : (
            <div className="space-y-4">
              {filteredMatches.map((candidate, idx) => {
                const rank = idx + 1;
                const hasBeenContacted = !!contactSuccessMap[candidate.trainee_id];
                const hasBeenHired = !!hiredSuccessMap[candidate.trainee_id];

                return (
                  <div
                    key={candidate.trainee_id}
                    id={`candidate-card-${candidate.trainee_id}`}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                  >
                    {/* Left Details */}
                    <div className="space-y-4 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="w-7 h-7 rounded-lg bg-primary text-white text-xs font-bold flex items-center justify-center">
                          #{rank}
                        </span>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                          {candidate.name}
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                            {candidate.trainee_id}
                          </span>
                        </h3>
                        {hasBeenHired && (
                          <Badge status="completed" label="Hired for this Role" size="sm" />
                        )}
                      </div>

                      {/* Match Score & Progress Bar */}
                      <div className="space-y-1.5 max-w-md">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-warning" />
                            Competency Match Score
                          </span>
                          <span className="text-primary font-extrabold">
                            {candidate.match_percentage.toFixed(1)}%
                          </span>
                        </div>
                        <ProgressBar
                          value={candidate.match_percentage}
                          variant="auto"
                          size="md"
                          showPercentage={false}
                        />
                      </div>

                      {/* Special Attention: Matched vs Gap Skills with <Badge status="matched" /> and <Badge status="gap" /> */}
                      <div className="space-y-2 pt-1">
                        {/* Matched Skills */}
                        <div className="flex items-start gap-2 flex-wrap text-xs">
                          <span className="font-bold text-secondary min-w-28 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                            <Check className="w-3.5 h-3.5 text-secondary shrink-0" />
                            Matched Skills:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {candidate.matched_skills.length > 0 ? (
                              candidate.matched_skills.map((skill) => (
                                <Badge
                                  key={skill}
                                  status="matched"
                                  label={skill}
                                  size="sm"
                                />
                              ))
                            ) : (
                              <span className="text-slate-400 italic text-xs">None</span>
                            )}
                          </div>
                        </div>

                        {/* Gap Skills */}
                        <div className="flex items-start gap-2 flex-wrap text-xs">
                          <span className="font-bold text-warning min-w-28 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                            <AlertCircle className="w-3.5 h-3.5 text-warning shrink-0" />
                            Gap Skills:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {candidate.gap_skills.length > 0 ? (
                              candidate.gap_skills.map((skill) => (
                                <Badge
                                  key={skill}
                                  status="gap"
                                  label={skill}
                                  size="sm"
                                />
                              ))
                            ) : (
                              <Badge
                                status="matched"
                                label="Zero Gap - Full Alignment!"
                                size="sm"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex flex-row lg:flex-col gap-2 shrink-0 justify-end">
                      <button
                        id={`preview-passport-btn-${candidate.trainee_id}`}
                        onClick={() => handleOpenPassportPreview(candidate)}
                        className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-primary" />
                        <span>Skill Passport</span>
                      </button>

                      <button
                        id={`contact-candidate-btn-${candidate.trainee_id}`}
                        onClick={() => handleOpenContact(candidate)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-2xs ${
                          hasBeenContacted
                            ? 'bg-primary-50 text-primary border border-primary-200'
                            : 'bg-primary hover:bg-primary-hover text-white cursor-pointer'
                        }`}
                      >
                        {hasBeenContacted ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                            <span>Interest Logged</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Contact Candidate</span>
                          </>
                        )}
                      </button>

                      <button
                        id={`mark-hired-btn-${candidate.trainee_id}`}
                        onClick={() => handleOpenHire(candidate)}
                        disabled={hasBeenHired}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-2xs ${
                          hasBeenHired
                            ? 'bg-secondary-50 text-secondary border border-secondary-200 cursor-default'
                            : 'bg-secondary hover:bg-secondary-hover text-white cursor-pointer'
                        }`}
                      >
                        {hasBeenHired ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />
                            <span>Hired ✓</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Mark as Hired</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Mark as Hired Modal */}
        {activeHireCandidate && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-xl border border-slate-200 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-secondary-50 text-secondary flex items-center justify-center">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Record Placement & Mark as Hired
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Creating formal employment record in NCCT registry
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveHireCandidate(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmHire} className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Candidate:</span>
                    <span className="font-bold text-slate-900">{activeHireCandidate.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Trainee Code:</span>
                    <span className="font-mono text-slate-700">{activeHireCandidate.trainee_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Position / Job:</span>
                    <span className="font-semibold text-slate-900">{job?.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Location:</span>
                    <span className="text-slate-700">{job?.location}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Official Hired Date <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    value={hireDate}
                    onChange={(e) => setHireDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-secondary focus:border-secondary shadow-2xs"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveHireCandidate(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingHire}
                    className="px-5 py-2 rounded-xl bg-secondary hover:bg-secondary-hover text-white text-xs font-semibold shadow-xs transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingHire ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Recording Placement...</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4" />
                        <span>Confirm Placement</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Contact Candidate Modal */}
        {activeContactCandidate && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary flex items-center justify-center">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Contact {activeContactCandidate.name}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Send direct interview invitation via NCCT Candidate Notification Service
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveContactCandidate(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Invitation Note
                  </label>
                  <textarea
                    rows={4}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-primary focus:border-primary shadow-2xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setActiveContactCandidate(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendContact}
                  disabled={isSendingContact}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSendingContact ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Invitation</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Inline Skill Passport Preview Modal */}
        {previewPassportTraineeId && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl border border-slate-200 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary flex items-center justify-center">
                    <FileBadge className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Verified Trainee Skill Passport
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      NCCT Digital Skill Credential Registry
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewPassportTraineeId(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isLoadingPassport ? (
                <div className="p-12 text-center text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-2" />
                  Loading verifiable Skill Passport...
                </div>
              ) : passportError ? (
                <div className="p-4 bg-danger-50 border border-danger-200 rounded-xl text-danger text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-danger shrink-0" />
                  <span>{passportError}</span>
                </div>
              ) : previewPassportData ? (
                <SkillPassportCard passport={previewPassportData} />
              ) : null}
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
