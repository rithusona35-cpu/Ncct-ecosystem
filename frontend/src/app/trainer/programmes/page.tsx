'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import { authApi } from '../../../lib/api';
import { TrainingProgramme, Institution } from '../../../lib/types';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import KPICard from '../../../components/ui/KPICard';
import Badge from '../../../components/ui/Badge';
import LoadingSkeleton from '../../../components/ui/LoadingSkeleton';
import EmptyState from '../../../components/ui/EmptyState';
import {
  GraduationCap,
  Plus,
  BookOpen,
  Users,
  Calendar,
  Building2,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FolderPlus,
  X,
  Layers,
  Search,
  Filter,
  Eye
} from 'lucide-react';
import Link from 'next/link';

export default function TrainerProgrammesPage() {
  const { user } = useAuth();
  const [programmes, setProgrammes] = useState<TrainingProgramme[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInst, setSelectedInst] = useState<string>('all');

  // Create Programme Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [institutionId, setInstitutionId] = useState<number | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [progs, insts] = await Promise.all([
        authApi.getProgrammes(),
        authApi.getInstitutions(),
      ]);
      setProgrammes(progs);
      setInstitutions(insts);
      if (insts.length > 0 && !institutionId) {
        setInstitutionId(insts[0].id);
      }
    } catch (err) {
      console.error('Failed to load trainer programmes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProgramme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !institutionId) {
      setError('Please provide title and select an institution');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await authApi.createProgramme({
        title,
        description,
        institution_id: Number(institutionId),
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create programme');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillPresetProgramme = () => {
    setTitle('Cooperative Banking Management & Financial Compliance');
    setDescription('Comprehensive training in cooperative credit society administration, RBI guidelines, statutory audits, and financial risk mitigation.');
    setStartDate('2026-11-01');
    setEndDate('2027-01-30');
  };

  const totalModules = programmes.reduce((sum, p) => sum + (p.modules?.length || 0), 0);
  const totalBatches = programmes.reduce((sum, p) => sum + (p.batches?.length || 0), 0);

  const filteredProgrammes = programmes.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.institution_name && p.institution_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesInst = selectedInst === 'all' || p.institution_id === Number(selectedInst);

    return matchesSearch && matchesInst;
  });

  return (
    <ProtectedRoute allowedRoles={['TRAINER', 'ADMIN']}>
      <DashboardLayout
        role="trainer"
        title="Training Programmes"
        subtitle="Manage official NCCT syllabi, video lectures, reading materials, and batch cohorts"
        headerAction={
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            id="btn-create-prog-header"
          >
            <Plus className="w-4 h-4" />
            <span>Create Programme</span>
          </button>
        }
      >
        <div className="space-y-8">
          {/* Top KPI Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Total Programmes"
              value={`${programmes.length} Syllabi`}
              icon={<GraduationCap className="w-5 h-5 text-primary" />}
              variant="primary"
              trend="NCCT Accredited"
              description="Standardized curriculum"
            />
            <KPICard
              title="Curriculum Modules"
              value={`${totalModules} Units`}
              icon={<Layers className="w-5 h-5 text-secondary" />}
              variant="secondary"
              trend="LMS Content"
              description="Video, PDF & notes"
            />
            <KPICard
              title="Active Cohorts"
              value={`${totalBatches} Batches`}
              icon={<Users className="w-5 h-5 text-secondary" />}
              variant="secondary"
              trend="Live Training"
              description="Assigned trainee groups"
            />
            <KPICard
              title="Partner Institutions"
              value={`${institutions.length} Centers`}
              icon={<Building2 className="w-5 h-5 text-primary" />}
              variant="primary"
              trend="Apex Network"
              description="RICMs and ICMs"
            />
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search programmes by title or keyword..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-primary transition-colors text-slate-900"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                Institute:
              </span>
              <select
                value={selectedInst}
                onChange={(e) => setSelectedInst(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="all">All Institutes ({programmes.length})</option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Programmes List */}
          {isLoading ? (
            <LoadingSkeleton variant="card" count={3} />
          ) : filteredProgrammes.length === 0 ? (
            <EmptyState
              title="No Training Programmes Found"
              message="No programmes match your current filters. Create a new curriculum or clear filters to view all courses."
              actionLabel="Create Programme (Preset)"
              onAction={() => {
                fillPresetProgramme();
                setShowCreateModal(true);
              }}
              icon={<FolderPlus className="w-8 h-8 text-primary" />}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProgrammes.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                  id={`programme-card-${p.id}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge status="active" label={`NCCT-PRG-${p.id}`} />
                      {p.start_date && (
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {p.start_date}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-1">
                        {p.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {p.description || 'No detailed syllabus overview provided.'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-600">
                      <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate font-medium">{p.institution_name}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100/80">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Modules</span>
                        <span className="font-extrabold text-slate-900 text-sm">
                          {p.modules?.length || 0} Units
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100/80">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Batches</span>
                        <span className="font-extrabold text-slate-900 text-sm">
                          {p.batches?.length || 0} Cohorts
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    <Link
                      href={`/trainer/programmes/${p.id}`}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                      id={`btn-manage-prog-${p.id}`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Manage Curriculum</span>
                    </Link>
                    <Link
                      href={`/trainer/batches?programme=${p.id}`}
                      className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-1"
                      title="View Batches"
                    >
                      <Users className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Programme Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <FolderPlus className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Create Training Programme</h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleCreateProgramme} className="space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700">Programme Title *</label>
                    <button
                      type="button"
                      onClick={fillPresetProgramme}
                      className="text-[11px] text-primary hover:underline font-semibold"
                    >
                      Fill Sample Title
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Cooperative Banking & Risk Compliance"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">NCCT Institution *</label>
                  <select
                    required
                    value={institutionId}
                    onChange={(e) => setInstitutionId(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary text-slate-900"
                  >
                    {institutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} ({inst.location || inst.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Description</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide overview of curriculum, learning objectives, and skills imparted..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-primary text-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-primary text-slate-900"
                    />
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Create Programme</span>
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
