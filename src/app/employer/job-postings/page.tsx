'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/lib/api';
import { JobPosting, JobRole, JobPostingCreate } from '@/lib/types';
import { DashboardLayout } from '@/components/ui/DashboardLayout';
import { KPICard } from '@/components/ui/KPICard';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import {
  Briefcase,
  PlusCircle,
  MapPin,
  Calendar,
  Sparkles,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Users
} from 'lucide-react';
import Link from 'next/link';

export default function EmployerJobPostingsPage() {
  const { user } = useAuth();

  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');

  // Modal State for New Job Posting
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('Anand, Gujarat / Hybrid');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [postingsData, rolesData] = await Promise.all([
        authApi.getMyJobPostings(),
        authApi.getJobRoles().catch(() => []),
      ]);
      setPostings(postingsData);
      setJobRoles(rolesData);
    } catch (err: any) {
      console.error('Failed to load job postings', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const roleId = e.target.value ? Number(e.target.value) : '';
    setSelectedRoleId(roleId);
    if (roleId) {
      const role = jobRoles.find((r) => r.id === Number(roleId));
      if (role && (!title || title.trim() === '')) {
        setTitle(role.title);
      }
    }
  };

  const handleCreatePosting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoleId || !title.trim()) return;

    setIsSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

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
      setSelectedRoleId('');
      setTitle('');
      setDescription('');
      setLocation('Anand, Gujarat / Hybrid');
      await loadData();
      setTimeout(() => {
        setIsModalOpen(false);
        setFormSuccess(null);
      }, 1200);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create job posting');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter postings
  const filteredPostings = postings.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.job_role_title && p.job_role_title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.location.toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === 'active') return matchesSearch && p.is_active;
    if (statusFilter === 'archived') return matchesSearch && !p.is_active;
    return matchesSearch;
  });

  const activeCount = postings.filter((p) => p.is_active).length;
  const archivedCount = postings.filter((p) => !p.is_active).length;
  const selectedRole = jobRoles.find((r) => r.id === Number(selectedRoleId));

  return (
    <ProtectedRoute allowedRoles={['EMPLOYER', 'ADMIN']}>
      <DashboardLayout
        role="employer"
        activeRoute="/employer/job-postings"
        title="Job Postings & Requisitions"
        subtitle="Manage open cooperative job requisitions, view required competency tags, and track live candidate pipelines."
        headerActions={
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Requisition</span>
          </button>
        }
      >
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          {isLoading ? (
            <LoadingSkeleton variant="kpi" count={4} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Total Requisitions"
                value={postings.length}
                icon={<Briefcase className="w-5 h-5" />}
                variant="primary"
                description="Cumulative vacancies registered"
              />
              <KPICard
                title="Active Openings"
                value={activeCount}
                icon={<Sparkles className="w-5 h-5" />}
                variant="secondary"
                description="Currently matching with live trainees"
              />
              <KPICard
                title="Archived Requisitions"
                value={archivedCount}
                icon={<Filter className="w-5 h-5" />}
                variant="default"
                description="Filled or closed positions"
              />
              <KPICard
                title="Standardized Roles"
                value={jobRoles.length}
                icon={<ShieldCheck className="w-5 h-5" />}
                variant="warning"
                description="Competency matrix templates"
              />
            </div>
          )}

          {/* Search & Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search requisitions by title, role, location..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-xs focus:ring-2 focus:ring-primary focus:border-primary transition"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-medium text-slate-600">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    statusFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'hover:text-slate-900'
                  }`}
                >
                  All ({postings.length})
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    statusFilter === 'active'
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'hover:text-slate-900'
                  }`}
                >
                  Active ({activeCount})
                </button>
                <button
                  onClick={() => setStatusFilter('archived')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    statusFilter === 'archived'
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'hover:text-slate-900'
                  }`}
                >
                  Archived ({archivedCount})
                </button>
              </div>

              <button
                onClick={loadData}
                disabled={isLoading}
                className="p-2 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-xl transition"
                title="Refresh requisitions"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Requisitions Grid */}
          {isLoading ? (
            <LoadingSkeleton variant="card" count={4} />
          ) : filteredPostings.length === 0 ? (
            <EmptyState
              icon={<Briefcase className="w-8 h-8 text-primary" />}
              title="No Requisitions Found"
              message={
                searchQuery
                  ? `No job postings match "${searchQuery}". Try adjusting your keywords or filter.`
                  : "You haven't posted any job requisitions yet. Create one to begin matching candidates."
              }
              actionLabel="Create Requisition"
              onAction={() => setIsModalOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPostings.map((job) => (
                <div
                  key={job.id}
                  id={`job-card-${job.id}`}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition flex flex-col justify-between overflow-hidden group"
                >
                  <div className="p-5 space-y-4">
                    {/* Header */}
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

                    {/* Title & Desc */}
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

                    {/* Meta info */}
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

                    {/* Skills Preview */}
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

                  {/* Card Footer Actions */}
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
                      <span>Candidate Matches</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal: Create Job Posting */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full overflow-hidden animate-fade-in">
              <div className="p-5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary flex items-center justify-center">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Create Job Requisition</h3>
                    <p className="text-[11px] text-slate-500">Mappable to NCCT standardized competency matrices</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreatePosting} className="p-6 space-y-4">
                {formSuccess && (
                  <div className="p-3 bg-secondary-50 border border-secondary-200 rounded-xl text-secondary-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-secondary shrink-0" />
                    <span>{formSuccess}</span>
                  </div>
                )}
                {formError && (
                  <div className="p-3 bg-danger-50 border border-danger-200 rounded-xl text-danger text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-danger shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Standardized Job Role <span className="text-danger">*</span>
                  </label>
                  <select
                    value={selectedRoleId}
                    onChange={handleRoleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-primary focus:border-primary"
                    required
                  >
                    <option value="">-- Choose Standardized Role --</option>
                    {jobRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Posting Title <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Cooperative Bank Credit Officer"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-primary focus:border-primary"
                    required
                  />
                </div>

                {selectedRole && selectedRole.requirements && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                      Required Competencies ({selectedRole.requirements.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedRole.requirements.map((r) => (
                        <Badge
                          key={r.skill_id}
                          status="matched"
                          label={`${r.skill_name} (${r.required_level})`}
                          size="sm"
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Location / Work Mode
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Anand, Gujarat / Hybrid"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of requirements and tasks..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedRoleId}
                    className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-4 h-4" />
                        <span>Create Requisition</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
