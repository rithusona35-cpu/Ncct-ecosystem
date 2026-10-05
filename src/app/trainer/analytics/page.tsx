'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import { authApi } from '../../../lib/api';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import KPICard from '../../../components/ui/KPICard';
import Badge from '../../../components/ui/Badge';
import LoadingSkeleton from '../../../components/ui/LoadingSkeleton';
import EmptyState from '../../../components/ui/EmptyState';
import ProgressBar from '../../../components/ui/ProgressBar';
import {
  BarChart3,
  TrendingUp,
  Users,
  CheckCircle2,
  AlertTriangle,
  Award,
  BookOpen,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';

interface TraineeCohortMetric {
  id: string;
  name: string;
  attendancePct: number;
  assessmentScore: number;
  skillsMastered: number;
  status: 'excellent' | 'good' | 'at_risk';
}

export default function TrainerAnalyticsPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  // Sample analytics data reflecting NCCT ecosystem performance
  const [cohortMetrics, setCohortMetrics] = useState<TraineeCohortMetric[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCohortMetrics([
        { id: 'TR-101', name: 'Ravi Kumar', attendancePct: 88.9, assessmentScore: 85, skillsMastered: 5, status: 'good' },
        { id: 'TR-102', name: 'Priya Sundaram', attendancePct: 96.0, assessmentScore: 92, skillsMastered: 6, status: 'excellent' },
        { id: 'TR-103', name: 'Amitabh Sharma', attendancePct: 92.5, assessmentScore: 78, skillsMastered: 4, status: 'good' },
        { id: 'TR-104', name: 'Kavita Patel', attendancePct: 76.0, assessmentScore: 58, skillsMastered: 2, status: 'at_risk' },
        { id: 'TR-105', name: 'Manoj Verma', attendancePct: 84.0, assessmentScore: 74, skillsMastered: 4, status: 'good' },
      ]);
      setIsLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  const totalTrainees = cohortMetrics.length;
  const avgAttendance = cohortMetrics.length > 0
    ? (cohortMetrics.reduce((s, t) => s + t.attendancePct, 0) / totalTrainees).toFixed(1)
    : '88.9';
  const avgScore = cohortMetrics.length > 0
    ? Math.round(cohortMetrics.reduce((s, t) => s + t.assessmentScore, 0) / totalTrainees)
    : 78;
  const atRiskCount = cohortMetrics.filter((t) => t.status === 'at_risk').length;

  return (
    <ProtectedRoute allowedRoles={['TRAINER', 'ADMIN']}>
      <DashboardLayout
        role="trainer"
        title="Faculty Performance Analytics"
        subtitle="Cohort completion trends, attendance compliance rates, and competency mastery distributions"
        headerAction={
          <div className="flex items-center gap-2">
            <Link
              href="/trainer/attendance"
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors shadow-2xs flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-primary" />
              <span>Attendance Roster</span>
            </Link>
            <Link
              href="/trainer/assessments"
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs transition-colors shadow-2xs flex items-center gap-1.5"
            >
              <Award className="w-3.5 h-3.5 text-secondary" />
              <span>Assessment Results</span>
            </Link>
          </div>
        }
      >
        <div className="space-y-8">
          {/* Top KPI Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Cohort Attendance Rate"
              value={`${avgAttendance}%`}
              icon={<Users className="w-5 h-5 text-secondary" />}
              variant="secondary"
              trend="+8.9% over cutoff"
              description="Minimum 80% threshold required"
            />
            <KPICard
              title="Average Exam Score"
              value={`${avgScore}%`}
              icon={<Award className="w-5 h-5 text-primary" />}
              variant="primary"
              trend="Passing: >= 60%"
              description="First-attempt assessment passes"
            />
            <KPICard
              title="Completion Readiness"
              value="92.4%"
              icon={<ShieldCheck className="w-5 h-5 text-secondary" />}
              variant="secondary"
              trend="High Qualification"
              description="Eligible for NCCT certification"
            />
            <KPICard
              title="At-Risk Trainees"
              value={`${atRiskCount} Student`}
              icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
              variant="warning"
              trend={{
                value: 'Needs Attention',
                isPositive: false,
                label: '< 80% attendance',
              }}
              description="Remedial modules assigned"
            />
          </div>

          {/* Section 1: Skill Attainment Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    Skill Mastery Distribution across Cohorts
                  </h3>
                  <p className="text-xs text-slate-500">
                    Average trainee competency benchmarks evaluated via practical quizzes.
                  </p>
                </div>
                <Badge status="matched" label="Live Attainment" />
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-800">Cooperative Society Law & Regulations</span>
                    <span className="font-mono font-bold text-emerald-700">92% High Mastery</span>
                  </div>
                  <ProgressBar value={92} max={100} variant="secondary" />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-800">Credit Society Financial Accounting</span>
                    <span className="font-mono font-bold text-emerald-700">84% Proficient</span>
                  </div>
                  <ProgressBar value={84} max={100} variant="secondary" />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-800">Statutory Audit & Balance Sheet Verification</span>
                    <span className="font-mono font-bold text-emerald-700">76% Competent</span>
                  </div>
                  <ProgressBar value={76} max={100} variant="primary" />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-800">Digital Cooperative ERP & GST Filing</span>
                    <span className="font-mono font-bold text-amber-700">48% Needs Remediation</span>
                  </div>
                  <ProgressBar value={48} max={100} variant="warning" />
                </div>
              </div>
            </div>

            {/* Attendance & Certification Funnel */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-secondary" />
                    Certification Eligibility Funnel
                  </h3>
                  <p className="text-xs text-slate-500">
                    NCCT automated dual-condition graduation criteria.
                  </p>
                </div>
                <Badge status="completed" label="Apex Criteria" />
              </div>

              <div className="space-y-3.5">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-900">Attendance Adherence (&gt;= 80%)</div>
                    <div className="text-[11px] text-slate-500">Hardware QR scanner &amp; Kiosk verified logs</div>
                  </div>
                  <span className="text-base font-extrabold text-emerald-700 font-mono">4 / 5 (80%)</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-900">Assessment Scores (&gt;= 60%)</div>
                    <div className="text-[11px] text-slate-500">Passing grades on curriculum question sets</div>
                  </div>
                  <span className="text-base font-extrabold text-emerald-700 font-mono">4 / 5 (80%)</span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/60 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-emerald-900">Certified Award Recipients</div>
                    <div className="text-[11px] text-emerald-700">Cryptographically signed credentials conferred</div>
                  </div>
                  <Badge status="completed" label="4 Conferred" />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Trainee Performance Roster Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Trainee Academic &amp; Attendance Adherence</h3>
                <p className="text-xs text-slate-500">
                  Individual performance breakdown for active batch cohort.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                5 Enrolled Students
              </span>
            </div>

            {isLoading ? (
              <LoadingSkeleton variant="table" count={5} />
            ) : cohortMetrics.length === 0 ? (
              <EmptyState
                title="No Cohort Performance Data"
                message="Enroll trainees in batches and capture attendance sessions to begin generating analytics."
                icon={<BarChart3 className="w-8 h-8 text-primary" />}
              />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Trainee</th>
                      <th className="py-3 px-4">Attendance Adherence</th>
                      <th className="py-3 px-4">Assessment Grade</th>
                      <th className="py-3 px-4">Competencies Mastered</th>
                      <th className="py-3 px-4">Certification Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cohortMetrics.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{t.name}</div>
                          <div className="text-[11px] font-mono text-slate-400">{t.id}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <span className={`font-bold ${t.attendancePct >= 80 ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {t.attendancePct}%
                          </span>
                          <span className="text-slate-400 text-[10px] ml-1">
                            ({t.attendancePct >= 80 ? 'In Good Standing' : 'Below Cutoff'})
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                          {t.assessmentScore}%
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-700">{t.skillsMastered} / 6 Skills</span>
                        </td>
                        <td className="py-3.5 px-4">
                          {t.status === 'excellent' ? (
                            <Badge status="completed" label="Excellence • Certified" />
                          ) : t.status === 'good' ? (
                            <Badge status="completed" label="Qualified" />
                          ) : (
                            <Badge status="gap" label="At-Risk • Remedial Required" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
