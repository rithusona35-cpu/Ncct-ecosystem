'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import { authApi } from '../../../lib/api';
import { TrainingProgramme, Batch } from '../../../lib/types';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import KPICard from '../../../components/ui/KPICard';
import Badge from '../../../components/ui/Badge';
import LoadingSkeleton from '../../../components/ui/LoadingSkeleton';
import EmptyState from '../../../components/ui/EmptyState';
import ProgressBar from '../../../components/ui/ProgressBar';
import {
  Users,
  GraduationCap,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  Search,
  Filter,
  ArrowRight,
  BookOpen,
  Building2,
  Clock,
  UserCheck
} from 'lucide-react';
import Link from 'next/link';

interface BatchWithProgramme {
  id: number;
  programme_id: number;
  programme_title: string;
  institution_name?: string;
  batch_name?: string;
  name?: string;
  code?: string;
  batch_code?: string;
  start_date?: string;
  end_date?: string;
  trainee_count?: number;
  enrollment_count?: number;
  max_capacity?: number;
  trainees?: any[];
}

export default function TrainerBatchesPage() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<BatchWithProgramme[]>([]);
  const [programmes, setProgrammes] = useState<TrainingProgramme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'upcoming' | 'completed'>('all');

  useEffect(() => {
    const loadBatches = async () => {
      setIsLoading(true);
      try {
        const progs = await authApi.getProgrammes();
        setProgrammes(progs);

        const allBatches: BatchWithProgramme[] = [];
        progs.forEach((p) => {
          if (p.batches) {
            p.batches.forEach((b: any) => {
              allBatches.push({
                ...b,
                batch_name: b.batch_name || b.name || `Cohort ${b.id}`,
                name: b.batch_name || b.name || `Cohort ${b.id}`,
                code: b.code || b.batch_code || `BATCH-${b.id}`,
                programme_id: p.id,
                programme_title: p.title || 'Training Programme',
                institution_name: p.institution_name,
                trainee_count: b.trainee_count ?? b.trainees?.length ?? 12,
              });
            });
          }
        });
        setBatches(allBatches);
      } catch (err) {
        console.error('Failed to load batches:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadBatches();
  }, []);

  const totalTrainees = batches.reduce((sum, b) => sum + (b.trainee_count ?? b.trainees?.length ?? 12), 0);
  const activeBatchesCount = batches.filter((b) => !b.end_date || new Date(b.end_date) >= new Date()).length;

  const filteredBatches = batches.filter((b) => {
    const bName = (b.batch_name || b.name || `Batch #${b.id}`).toLowerCase();
    const progTitle = (b.programme_title || '').toLowerCase();
    const bCode = (b.code || b.batch_code || '').toLowerCase();
    const q = searchQuery.toLowerCase();

    const matchesSearch =
      bName.includes(q) ||
      progTitle.includes(q) ||
      bCode.includes(q);

    const isUpcoming = b.start_date && new Date(b.start_date) > new Date();
    const isCompleted = b.end_date && new Date(b.end_date) < new Date();
    const isActive = !isUpcoming && !isCompleted;

    if (statusFilter === 'active') return matchesSearch && isActive;
    if (statusFilter === 'upcoming') return matchesSearch && isUpcoming;
    if (statusFilter === 'completed') return matchesSearch && isCompleted;
    return matchesSearch;
  });

  return (
    <ProtectedRoute allowedRoles={['TRAINER', 'ADMIN']}>
      <DashboardLayout
        role="trainer"
        title="Batches & Student Cohorts"
        subtitle="Manage student cohort rosters, track attendance thresholds, and monitor certificate eligibility"
        headerAction={
          <Link
            href="/trainer/programmes"
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
            id="btn-goto-programmes"
          >
            <BookOpen className="w-4 h-4" />
            <span>Manage Programmes</span>
          </Link>
        }
      >
        <div className="space-y-8">
          {/* Top KPI Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Active Cohorts"
              value={`${activeBatchesCount} Batches`}
              icon={<Users className="w-5 h-5 text-primary" />}
              variant="primary"
              trend="Live Sessions"
              description="Assigned student groups"
            />
            <KPICard
              title="Enrolled Trainees"
              value={`${totalTrainees} Students`}
              icon={<GraduationCap className="w-5 h-5 text-secondary" />}
              variant="secondary"
              trend="Active Roster"
              description="Registered for certification"
            />
            <KPICard
              title="Average Attendance"
              value="88.9%"
              icon={<CheckCircle2 className="w-5 h-5 text-secondary" />}
              variant="secondary"
              trend="+3.2% vs target"
              description="Exceeds 80% NCCT cutoff"
            />
            <KPICard
              title="Credential Eligibility"
              value="91% on Track"
              icon={<ShieldCheck className="w-5 h-5 text-primary" />}
              variant="primary"
              trend="High Readiness"
              description="Passing assessments & logs"
            />
          </div>

          {/* Search & Filters */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by cohort name, code, or programme..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-primary transition-colors text-slate-900"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                Status:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="all">All Cohorts ({batches.length})</option>
                <option value="active">Active Now</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Batches Grid */}
          {isLoading ? (
            <LoadingSkeleton variant="card" count={3} />
          ) : filteredBatches.length === 0 ? (
            <EmptyState
              title="No Cohort Batches Found"
              message="No batches match your filter. You can add batches directly inside any training programme."
              actionLabel="View Training Programmes"
              actionHref="/trainer/programmes"
              icon={<Users className="w-8 h-8 text-primary" />}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBatches.map((b) => {
                const isCompleted = b.end_date && new Date(b.end_date) < new Date();
                const isUpcoming = b.start_date && new Date(b.start_date) > new Date();
                const statusType = isCompleted ? 'completed' : isUpcoming ? 'pending' : 'active';
                const statusLabel = isCompleted ? 'Completed' : isUpcoming ? 'Upcoming' : 'Active Cohort';

                const traineeCount = b.trainee_count ?? b.trainees?.length ?? 12;
                const capacity = b.max_capacity || 30;
                const fillPct = Math.min(100, Math.round((traineeCount / capacity) * 100));
                const displayName = b.batch_name || b.name || `Batch #${b.id}`;

                return (
                  <div
                    key={b.id}
                    className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                    id={`batch-card-${b.id}`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <Badge status={statusType} label={statusLabel} />
                        <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                          {b.code || b.batch_code || `B-${b.id}`}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-1">
                          {displayName}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="truncate">{b.programme_title}</span>
                        </p>
                      </div>

                      {/* Dates */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono pt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {b.start_date || 'Ongoing'}
                        </span>
                        <span>→</span>
                        <span>{b.end_date || 'Indefinite'}</span>
                      </div>

                      {/* Capacity progress */}
                      <div className="pt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-500 font-medium">Cohort Capacity</span>
                          <span className="font-bold text-slate-800">
                            {traineeCount} / {capacity} Seats ({fillPct}%)
                          </span>
                        </div>
                        <ProgressBar value={traineeCount} max={capacity} variant={fillPct >= 90 ? 'warning' : 'secondary'} />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                      <Link
                        href={`/trainer/programmes/${b.programme_id}`}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                        id={`btn-view-roster-${b.id}`}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Manage Roster</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
