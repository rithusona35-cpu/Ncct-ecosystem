'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import { authApi } from '../../../lib/api';
import { TrainingProgramme, Institution } from '../../../lib/types';
import RbacTester from '../../../components/RbacTester';
import {
  Briefcase,
  Plus,
  BookOpen,
  Users,
  Calendar,
  Building2,
  ArrowRight,
  Loader2,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  FolderPlus,
  X,
  Layers,
  GraduationCap,
  Award
} from 'lucide-react';
import Link from 'next/link';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import KPICard from '../../../components/ui/KPICard';
import Badge from '../../../components/ui/Badge';
import LoadingSkeleton from '../../../components/ui/LoadingSkeleton';
import EmptyState from '../../../components/ui/EmptyState';

export default function TrainerDashboard() {
  const { user } = useAuth();
  const [programmes, setProgrammes] = useState<TrainingProgramme[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      console.error('Failed to load trainer data:', err);
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

  // Quick preset helper
  const fillPresetProgramme = () => {
    setTitle('Cooperative Accounting and Digital ERP');
    setDescription('Comprehensive training in cooperative accounting practices, financial statements, statutory audits, and digital ERP systems.');
    setStartDate('2026-10-01');
    setEndDate('2026-12-15');
  };

  const totalModules = programmes.reduce((sum, p) => sum + (p.modules?.length || 0), 0);
  const totalBatches = programmes.reduce((sum, p) => sum + (p.batches?.length || 0), 0);

  return (
    <ProtectedRoute allowedRoles={['TRAINER', 'ADMIN']}>
      <DashboardLayout
        role="trainer"
        title="Faculty & Course Portal"
        subtitle="Manage curriculum modules, batch rosters, IoT attendance, and skill assessments"
        headerAction={
          <div className="flex items-center gap-2">
            <Link
              href="/trainer/assessments/new"
              className="px-3.5 py-2 rounded-xl bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border border-amber-300 font-bold text-xs transition-all flex items-center gap-1.5"
              id="btn-nav-create-assessment"
            >
              <Award className="w-4 h-4 text-amber-600" />
              <span>New Assessment</span>
            </Link>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Programme</span>
            </button>
          </div>
        }
      >
        <div className="space-y-8">
          {/* Welcome Banner */}
          <div className="rounded-3xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 p-8 text-white shadow-xl shadow-amber-900/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-xs">
                <Briefcase className="w-4 h-4" />
                Faculty &amp; Training Course Management
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">
                Welcome, Trainer {user?.name}!
              </h1>
              <p className="text-amber-100 text-sm max-w-xl">
                Create training programmes, publish course modules with videos &amp; PDFs, manage cohorts in batches, and enroll certified NCCT trainees.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 text-right">
                <div className="text-[10px] text-amber-200">Current Role</div>
                <div className="text-sm font-bold font-mono">{user?.role}</div>
              </div>
            </div>
          </div>

          {/* Dashboard Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Active Programmes"
              value={`${programmes.length} Active`}
              icon={<BookOpen className="w-5 h-5 text-primary" />}
              variant="primary"
              trend="Curriculum"
              description="NCCT-approved syllabi"
            />
            <KPICard
              title="Curriculum Modules"
              value={`${totalModules} Modules`}
              icon={<Layers className="w-5 h-5 text-secondary" />}
              variant="secondary"
              trend="LMS Ready"
              description="Course materials & docs"
            />
            <KPICard
              title="Active Batches"
              value={`${totalBatches} Cohorts`}
              icon={<Users className="w-5 h-5 text-secondary" />}
              variant="secondary"
              trend="Live Rosters"
              description="Enrolled student cohorts"
            />
            <KPICard
              title="NCCT Centers"
              value={`${institutions.length} Institutes`}
              icon={<Building2 className="w-5 h-5 text-primary" />}
              variant="primary"
              trend="Apex Council"
              description="Authorized training centers"
            />
          </div>

          {/* Attendance & Kiosk Gateway Action Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 shadow-md border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-300">
                Attendance &amp; IoT Node Gateway
              </span>
            </div>
            <h3 className="text-base font-bold text-white">
              Today's Session Attendance &amp; Kiosk Simulator
            </h3>
            <p className="text-xs text-emerald-100/70 max-w-xl">
              Inspect real-time student check-ins, verify ESP32-S3 hardware syncs, or launch the interactive kiosk QR scanner simulator.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              href="/kiosk"
              target="_blank"
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <span>Kiosk Simulator</span>
              <span className="text-[10px] bg-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded">Live</span>
            </Link>

            <Link
              href="/trainer/attendance"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>Today's Attendance Roster</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Training Programmes List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Training Programmes</h2>
              <p className="text-xs text-slate-500">
                Manage curriculum modules, upload video/PDF materials, and configure batch rosters.
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Programme</span>
            </button>
          </div>

          {isLoading ? (
            <LoadingSkeleton variant="card" count={3} />
          ) : programmes.length === 0 ? (
            <EmptyState
              title="No Programmes Created Yet"
              message="Click the button below to create your first training programme like 'Cooperative Accounting and Digital ERP'."
              actionLabel="Create Programme (Sample Preset)"
              onAction={() => {
                fillPresetProgramme();
                setShowCreateModal(true);
              }}
              icon={<FolderPlus className="w-8 h-8 text-primary" />}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {programmes.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge status="active" label={`Prog #${p.id}`} />
                      {p.start_date && (
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {p.start_date}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-1">
                        {p.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {p.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-600">
                      <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate font-medium">{p.institution_name}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-slate-400 block">Modules:</span>
                        <span className="font-bold text-slate-800 text-xs">
                          {p.modules?.length || 0} Modules
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-slate-400 block">Batches:</span>
                        <span className="font-bold text-slate-800 text-xs">
                          {p.batches?.length || 0} Batches
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    <Link
                      href={`/trainer/programmes/${p.id}`}
                      className="flex-1 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>Manage Modules &amp; Batches</span>
                      <ArrowRight className="w-3.5 h-3.5" />
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
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
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
                      className="text-[11px] text-amber-600 hover:underline font-semibold"
                    >
                      Fill Sample Title
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Cooperative Accounting and Digital ERP"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-600 text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">NCCT Institution *</label>
                  <select
                    required
                    value={institutionId}
                    onChange={(e) => setInstitutionId(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-600 text-slate-900"
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
                    placeholder="Provide overview of curriculum, target trainees, and certifications..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-600 text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-600 text-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-600 text-slate-900"
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
                    className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-200 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
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

          {/* Live RBAC Tester */}
          <RbacTester />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
