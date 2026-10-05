'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/lib/api';
import { JobRole, JobPosting, JobPostingCreate } from '@/lib/types';
import { DashboardLayout } from '@/components/ui/DashboardLayout';
import { KPICard } from '@/components/ui/KPICard';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import {
  Building2,
  Briefcase,
  PlusCircle,
  MapPin,
  Calendar,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  UserCheck,
  Award,
  ChevronRight,
  Filter
} from 'lucide-react';
import Link from 'next/link';

export default function EmployerDashboard() {
  const { user } = useAuth();

  // State
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [hiresCount, setHiresCount] = useState(0);

  // Form State
  const [selectedRoleId, setSelectedRoleId] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('Anand, Gujarat / Hybrid');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadJobRoles();
    loadJobPostings();
  }, []);

  const loadJobRoles = async () => {
    setIsLoadingRoles(true);
    try {
      const roles = await authApi.getJobRoles();
      setJobRoles(roles);
    } catch (err: any) {
      console.error('Failed to load job roles', err);
    } finally {
      setIsLoadingRoles(false);
    }
  };

  const loadJobPostings = async () => {
    setIsLoadingJobs(true);
    try {
      const postings = await authApi.getMyJobPostings();
      setJobPostings(postings);
      authApi.getEmploymentRecords().then((h) => setHiresCount(h.length)).catch(() => {});
    } catch (err: any) {
      console.error('Failed to load job postings', err);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  // Selected job role details
  const selectedRole = jobRoles.find((r) => r.id === Number(selectedRoleId));

  // Handle role selection change
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const roleId = e.target.value ? Number(e.target.value) : '';
    setSelectedRoleId(roleId);
    setFormSuccess(null);
    setFormError(null);

    if (roleId) {
      const role = jobRoles.find((r) => r.id === Number(roleId));
      if (role && (!title || title.trim() === '')) {
        setTitle(role.title);
      }
    }
  };

  // Handle form submission
  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!selectedRoleId) {
      setFormError('Please select a target Job Role.');
      return;
    }
    if (!title.trim()) {
      setFormError('Please enter a job title.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: JobPostingCreate = {
        job_role_id: Number(selectedRoleId),
        title: title.trim(),
        location: location.trim() || 'National / Hybrid',
        description: description.trim() || undefined,
        is_active: true,
      };

      const newPosting = await authApi.createJobPosting(payload);
      setFormSuccess(`Job posting "${newPosting.title}" created successfully!`);
      // Reset form
      setSelectedRoleId('');
      setTitle('');
      setDescription('');
      setLocation('Anand, Gujarat / Hybrid');

      // Refresh postings
      await loadJobPostings();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create job posting. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['EMPLOYER', 'ADMIN']}>
      <DashboardLayout
        role="employer"
        activeRoute="/employer/dashboard"
        title="Employer Partner Dashboard"
        subtitle="Post requisitions mapped to standardized cooperative competencies and match with verified NCCT graduates in real time."
        headerActions={
          <div className="flex items-center gap-3">
            <Link
              href="/employer/matches"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover shadow-xs transition"
            >
              <Sparkles className="w-4 h-4 text-warning" />
              <span>AI Candidate Matches</span>
            </Link>
          </div>
        }
      >
        <div className="space-y-8">
          {/* Top Hero Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-primary-900 via-primary to-primary-800 p-6 sm:p-8 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 border border-primary-700/40">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-xs border border-white/20">
                <Building2 className="w-4 h-4 text-secondary-300" />
                Verified Cooperative Recruiter
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Welcome, {user?.name || 'Recruiter'}
              </h1>
              <p className="text-slate-200 text-xs sm:text-sm max-w-xl leading-relaxed">
                Connect directly with certified cooperative talent. All candidates possess tamper-proof NCCT Skill Passports verified across training institutions.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-left sm:text-right shrink-0">
              <div className="text-[11px] text-slate-300 uppercase tracking-wider font-semibold">Active Enterprise</div>
              <div className="text-base font-bold text-white mt-0.5">{user?.name}</div>
              <div className="text-xs text-secondary-200 mt-0.5 font-mono">{user?.email}</div>
            </div>
          </div>

          {/* Quick Stats Grid using KPICard */}
          {isLoadingJobs ? (
            <LoadingSkeleton variant="kpi" count={4} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Active Requisitions"
                value={jobPostings.filter((j) => j.is_active).length}
                icon={<Briefcase className="w-5 h-5" />}
                variant="primary"
                description="Live job postings receiving candidate matches"
              />
              <KPICard
                title="Standardized Roles"
                value={jobRoles.length}
                icon={<ShieldCheck className="w-5 h-5" />}
                variant="default"
                description="Standardized NCCT competency frameworks"
              />
              <KPICard
                title="Confirmed Hires"
                value={hiresCount}
                icon={<UserCheck className="w-5 h-5" />}
                variant="secondary"
                description="Graduates placed & post-placement feedback active"
              />
              <KPICard
                title="Match Accuracy"
                value="96.4%"
                icon={<Sparkles className="w-5 h-5" />}
                variant="warning"
                description="Competency threshold alignment with trainees"
              />
            </div>
          )}

          {/* Section 1: "Post a Job" Form */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-6 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-xs">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">Post a New Job Requisition</h2>
                  <p className="text-xs text-slate-500">
                    Select a standardized NCCT role to automatically bind benchmark competency tags and trigger candidate matching.
                  </p>
                </div>
              </div>
              <Badge status="matched" label="AI Matching Enabled" />
            </div>

            <form onSubmit={handlePostJob} className="p-6 space-y-6">
              {formSuccess && (
                <div className="p-4 bg-secondary-50 border border-secondary-200 rounded-xl text-secondary-800 text-sm flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-secondary shrink-0" />
                  <span className="font-medium">{formSuccess}</span>
                </div>
              )}

              {formError && (
                <div className="p-4 bg-danger-50 border border-danger-200 rounded-xl text-danger text-sm flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-danger shrink-0" />
                  <span className="font-medium">{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Job Role Dropdown */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="job-role-select"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                  >
                    Standardized Job Role <span className="text-danger">*</span>
                  </label>
                  <select
                    id="job-role-select"
                    value={selectedRoleId}
                    onChange={handleRoleChange}
                    disabled={isLoadingRoles || isSubmitting}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition shadow-2xs"
                    required
                  >
                    <option value="">-- Choose Job Role --</option>
                    {jobRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.title}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Defines the competency matrix used to score candidate skill passports.
                  </p>
                </div>

                {/* Job Title */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="job-title-input"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                  >
                    Posting Title <span className="text-danger">*</span>
                  </label>
                  <input
                    id="job-title-input"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Senior Cooperative Accountant"
                    disabled={isSubmitting}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition shadow-2xs"
                    required
                  />
                  <p className="text-[11px] text-slate-500">
                    Displayed to candidates and in candidate recommendation notifications.
                  </p>
                </div>
              </div>

              {/* Read-Only Required Skills Preview */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    Required Competency Benchmarks (Auto-Generated Tags)
                  </span>
                  {selectedRole && (
                    <span className="text-xs text-slate-500 font-mono">
                      Role ID: {selectedRole.id}
                    </span>
                  )}
                </div>

                {selectedRole && selectedRole.requirements && selectedRole.requirements.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {selectedRole.requirements.map((req) => (
                      <div
                        key={req.id || req.skill_id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-800 shadow-2xs"
                      >
                        <span className="font-semibold text-slate-900">{req.skill_name}</span>
                        <Badge
                          status={req.required_level === 'HIGH' ? 'matched' : 'pending'}
                          label={`${req.required_level} (≥${req.required_threshold}%)`}
                          size="sm"
                        />
                      </div>
                    ))}
                  </div>
                ) : selectedRole ? (
                  <div className="text-xs text-warning italic py-1">
                    This role has no predefined skill benchmarks in the matrix yet.
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic py-1">
                    Select a Job Role from the dropdown above to inspect its benchmark skill tags.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Location */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="job-location-input"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                  >
                    Location / Work Mode
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      id="job-location-input"
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Anand, Gujarat / Hybrid"
                      disabled={isSubmitting}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition shadow-2xs"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="job-description-input"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                  >
                    Job Description / Responsibilities
                  </label>
                  <textarea
                    id="job-description-input"
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Outline key branch responsibilities, loan book management, or ERP tasks..."
                    disabled={isSubmitting}
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition shadow-2xs"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <button
                  id="submit-job-posting-btn"
                  type="submit"
                  disabled={isSubmitting || !selectedRoleId}
                  className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-sm shadow-xs transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Publishing Requisition...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      <span>Publish Job Requisition</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: List of Posted Jobs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary border border-primary-100 flex items-center justify-center">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Your Posted Requisitions</h2>
                  <p className="text-xs text-slate-500">
                    Manage positions, inspect matched candidate pipelines, and view verified passports.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadJobPostings}
                  disabled={isLoadingJobs}
                  className="p-2 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-xl transition"
                  title="Refresh job postings"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingJobs ? 'animate-spin' : ''}`} />
                </button>
                <Link
                  href="/employer/job-postings"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {isLoadingJobs ? (
              <LoadingSkeleton variant="card" count={3} />
            ) : jobPostings.length === 0 ? (
              <EmptyState
                icon={<Briefcase className="w-8 h-8 text-primary" />}
                title="No Job Postings Yet"
                message="Create your first job requisition using the form above. Once created, our AI engine will match qualified trainees with verified NCCT passports."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {jobPostings.map((job) => (
                  <div
                    key={job.id}
                    id={`job-card-${job.id}`}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition flex flex-col justify-between overflow-hidden group"
                  >
                    <div className="p-5 space-y-4">
                      {/* Header: Role badge & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] font-bold tracking-wide uppercase px-2.5 py-0.5 rounded-md bg-primary-50 text-primary border border-primary-100">
                          {job.job_role_title || 'Cooperative Role'}
                        </span>
                        <Badge
                          status={job.is_active ? 'active' : 'inactive'}
                          label={job.is_active ? 'Active' : 'Archived'}
                          size="sm"
                        />
                      </div>

                      {/* Job Title */}
                      <div>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-1">
                          {job.title}
                        </h3>
                        {job.description && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                            {job.description}
                          </p>
                        )}
                      </div>

                      {/* Meta info: Location, Posted Date */}
                      <div className="space-y-1.5 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{job.location}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            Posted on{' '}
                            {new Date(job.posted_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Required Skills Tags Preview */}
                      {job.required_skills && job.required_skills.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Target Competencies:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {job.required_skills.map((skill) => (
                              <span
                                key={skill.skill_id}
                                className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium"
                              >
                                {skill.skill_name}
                                <span className="text-[9px] text-primary font-bold ml-1">
                                  {skill.required_level}
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Action Footer */}
                    <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-mono">
                        Requisition #{job.id}
                      </span>
                      <Link
                        id={`view-matches-btn-${job.id}`}
                        href={`/employer/matches?jobId=${job.id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-2xs hover:shadow-xs transition"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-warning" />
                        <span>View Matches</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
