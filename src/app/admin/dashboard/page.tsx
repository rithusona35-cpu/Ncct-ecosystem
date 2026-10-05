'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import {
  api,
  AdminOverviewStats,
  LowCompletionCourse,
  CombinedSkillGap,
  HighDemandSkill,
  CommonSkillGapItem,
} from '../../../lib/api';
import {
  ShieldCheck,
  Users,
  GraduationCap,
  TrendingUp,
  CalendarCheck,
  AlertTriangle,
  Briefcase,
  Layers,
  ArrowUpDown,
  RefreshCw,
  Info,
  CheckCircle2,
  Building2,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import KPICard from '../../../components/ui/KPICard';
import Badge from '../../../components/ui/Badge';
import LoadingSkeleton from '../../../components/ui/LoadingSkeleton';
import EmptyState from '../../../components/ui/EmptyState';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';

export default function AdminDashboardPage() {
  const { user } = useAuth();

  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Data states
  const [overview, setOverview] = useState<AdminOverviewStats | null>(null);
  const [lowCompletionCourses, setLowCompletionCourses] = useState<LowCompletionCourse[]>([]);
  const [skillGaps, setSkillGaps] = useState<CombinedSkillGap[]>([]);
  const [highDemandSkills, setHighDemandSkills] = useState<HighDemandSkill[]>([]);
  const [employerGaps, setEmployerGaps] = useState<CommonSkillGapItem[]>([]);

  // Sorting state for Low Completion table
  const [sortField, setSortField] = useState<'title' | 'completion'>('completion');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchDashboardData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [ovData, lowData, gapsData, demandData, empGapsData] = await Promise.all([
        api.getAdminOverviewStats().catch((err: any) => {
          console.error('Failed to load overview:', err);
          return null;
        }),
        api.getAdminLowCompletionCourses(50).catch((err: any) => {
          console.error('Failed to load low completion courses:', err);
          return [];
        }),
        api.getAdminSkillGaps().catch((err: any) => {
          console.error('Failed to load skill gaps:', err);
          return [];
        }),
        api.getAdminHighDemandSkills().catch((err: any) => {
          console.error('Failed to load high demand skills:', err);
          return [];
        }),
        api.getAdminFeedbackSkillGaps().catch((err: any) => {
          console.error('Failed to load employer feedback gaps:', err);
          return [];
        }),
      ]);

      if (ovData) setOverview(ovData);
      setLowCompletionCourses(lowData);
      setSkillGaps(gapsData);
      setHighDemandSkills(demandData);
      setEmployerGaps(empGapsData);
    } catch (err: any) {
      setError(err?.message || 'Error loading dashboard statistics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Sort low completion courses
  const sortedCourses = [...lowCompletionCourses].sort((a, b) => {
    const titleA = a.course_title || a.title || '';
    const titleB = b.course_title || b.title || '';
    const compA = a.completion_percentage ?? a.completion_rate ?? 0;
    const compB = b.completion_percentage ?? b.completion_rate ?? 0;

    if (sortField === 'title') {
      return sortOrder === 'asc' ? titleA.localeCompare(titleB) : titleB.localeCompare(titleA);
    } else {
      return sortOrder === 'asc' ? compA - compB : compB - compA;
    }
  });

  const toggleSort = (field: 'title' | 'completion') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Helper colors for Skill Gap severity
  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'both':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            Employer & LMS
          </span>
        );
      case 'employer_feedback':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            Employer Reported
          </span>
        );
      case 'training_gap':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
            Curriculum Gap
          </span>
        );
    }
  };

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <DashboardLayout
        role="admin"
        title="National Ecosystem Administration"
        subtitle="Executive oversight across institutes, training completion metrics, industry candidate matching demand, and cross-channel skill gap intelligence"
        headerAction={
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
            </button>
            <div className="bg-slate-100 rounded-xl px-3 py-1.5 border border-slate-200 text-right">
              <div className="text-[10px] text-slate-400 font-medium">Logged in as</div>
              <div className="text-xs font-bold text-slate-800 truncate max-w-[150px]">{user?.email}</div>
            </div>
          </div>
        }
      >
        <div className="space-y-8">
          {/* Header / Admin Banner */}
          <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl shadow-slate-950/20 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                NCCT National Ecosystem Administration &amp; Analytics
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">
                Executive Overview Dashboard
              </h1>
              <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
                Real-time monitoring across institutes, training completion metrics, industry candidate matching demand, and cross-channel skill gap intelligence.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. TOP ROW: 4 KPI CARDS */}
          {loading ? (
            <LoadingSkeleton variant="kpi" count={4} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Trainee Enrollment"
                value={overview ? (overview.total_trainees > 0 ? `${overview.total_trainees.toLocaleString()} Active` : '0') : '—'}
                icon={<Users className="w-5 h-5 text-primary" />}
                variant="primary"
                trend={`Across ${overview?.total_institutes ?? 0} Institutes`}
                description="National trainee registry"
              />
              <KPICard
                title="Curriculum Programmes"
                value={overview ? `${overview.total_programmes} Active` : '—'}
                icon={<GraduationCap className="w-5 h-5 text-secondary" />}
                variant="secondary"
                trend="NCCT Accredited"
                description="Certified modules & syllabi"
              />
              <KPICard
                title="Course Completion"
                value={overview ? `${overview.overall_completion_rate}%` : '—'}
                icon={<TrendingUp className="w-5 h-5 text-secondary" />}
                variant="secondary"
                trend="+4.8% vs benchmark"
                description="Overall LMS progression"
              />
              <KPICard
                title="Average Attendance"
                value={overview ? `${overview.average_attendance}%` : '—'}
                icon={<CalendarCheck className="w-5 h-5 text-primary" />}
                variant="primary"
                trend="Above 80% Cutoff"
                description="Hardware & kiosk check-ins"
              />
            </div>
          )}

        {/* ========================================================================= */}
        {/* 2. CHARTS ROW: Top Skill Gaps (Recharts) & High-Demand Skills (Recharts) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chart 1: Top Skill Gaps */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                    Top Skill Gaps
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ranked by severity score combining employer feedback and LMS curriculum assessments.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                  {skillGaps.length} Identified
                </span>
              </div>

              {loading ? (
                <div className="h-64 flex items-center justify-center animate-pulse bg-slate-50 rounded-2xl">
                  <span className="text-xs text-slate-400 font-medium">Loading Skill Gap Analytics...</span>
                </div>
              ) : skillGaps.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-2xl">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No Systemic Skill Gaps Reported</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Trainee assessments and employer ratings currently meet or exceed required competency thresholds.
                  </p>
                </div>
              ) : isMounted ? (
                <div className="h-72 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={skillGaps.slice(0, 6)}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} unit="%" />
                      <YAxis
                        type="category"
                        dataKey="skill_name"
                        tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                        width={110}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload as CombinedSkillGap;
                            return (
                              <div className="bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl border border-slate-700 space-y-1">
                                <div className="font-bold text-sm text-slate-100">{data.skill_name}</div>
                                <div className="text-rose-300 font-semibold">
                                  Severity Score: {data.severity_score}%
                                </div>
                                <div className="text-slate-300">
                                  Source:{' '}
                                  <span className="capitalize font-semibold text-slate-100">
                                    {data.source.replace('_', ' ')}
                                  </span>
                                </div>
                                {data.employer_low_ratio !== undefined && data.employer_low_ratio > 0 && (
                                  <div className="text-slate-400">
                                    Employer Low Ratio: {(data.employer_low_ratio * 100).toFixed(0)}%
                                  </div>
                                )}
                                {data.training_gap_count !== undefined && (
                                  <div className="text-slate-400">
                                    Curriculum Gaps: {data.training_gap_count} trainees
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="severity_score" radius={[0, 8, 8, 0]}>
                        {skillGaps.slice(0, 6).map((entry, index) => {
                          // Brand colors: both channels = danger red (#dc2626), employer = warning amber (#d97706), training = brand blue (#1e3a5f)
                          const fill =
                            entry.source === 'both'
                              ? '#dc2626'
                              : entry.source === 'employer_feedback'
                              ? '#d97706'
                              : '#1e3a5f';
                          return <Cell key={`cell-${index}`} fill={fill} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : null}
            </div>

            {/* Micro tags below chart */}
            <div className="pt-4 mt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Channel Key:</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-semibold text-[11px] border border-red-200">
                <span className="w-2 h-2 rounded-full bg-[#dc2626]" />
                Both Channels (Severe)
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold text-[11px] border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-[#d97706]" />
                Employer Feedback Only
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[#1e3a5f] font-semibold text-[11px] border border-blue-200">
                <span className="w-2 h-2 rounded-full bg-[#1e3a5f]" />
                Curriculum Assessment Only
              </span>
            </div>
          </div>

          {/* Chart 2: High-Demand Skills */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-secondary" />
                    High-Demand Skills
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Skills most requested by employer job postings across cooperative enterprises.
                  </p>
                </div>
                <Badge status="matched" label="Market Demand" />
              </div>

              {loading ? (
                <div className="h-64 flex items-center justify-center animate-pulse bg-slate-50 rounded-2xl">
                  <span className="text-xs text-slate-400 font-medium">Loading High-Demand Skills...</span>
                </div>
              ) : highDemandSkills.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-2xl">
                  <Briefcase className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No Active Job Postings</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Employers have not yet published active job roles requiring specific competency tags.
                  </p>
                </div>
              ) : isMounted ? (
                <div className="h-72 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={highDemandSkills.slice(0, 6)}
                      margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="skill_name"
                        tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        domain={[0, 'dataMax + 1']}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload as HighDemandSkill;
                            return (
                              <div className="bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl border border-slate-700 space-y-1">
                                <div className="font-bold text-sm text-slate-100">{data.skill_name}</div>
                                <div className="text-emerald-400 font-semibold">
                                  Required by {data.demand_count} active job posting{data.demand_count > 1 ? 's' : ''}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="demand_count" radius={[8, 8, 0, 0]} fill="#2d9d5f">
                        {highDemandSkills.slice(0, 6).map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              index === 0
                                ? '#2d9d5f' // Brand Secondary Green
                                : index === 1
                                ? '#1e3a5f' // Brand Primary Blue
                                : index === 2
                                ? '#0d9488' // Teal
                                : index === 3
                                ? '#d97706' // Brand Amber
                                : '#1e3a5f'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : null}
            </div>

            <div className="pt-4 mt-2 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
              <span>Counts aggregate active employer requisitions only.</span>
              <span className="font-semibold text-secondary">Top: {highDemandSkills[0]?.skill_name || '—'}</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. BOTTOM ROW: Low-Completion Courses Table & Employer Feedback Summary */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Table: Courses with Low Completion (2 cols on large screen) */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-600" />
                    Courses with Low Completion (&lt; 50%)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Early alert list for training programmes requiring curriculum review or trainer intervention.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                    {lowCompletionCourses.length} Flagged
                  </span>
                </div>
              </div>

              {loading ? (
                <LoadingSkeleton variant="table" count={3} />
              ) : sortedCourses.length === 0 ? (
                <EmptyState
                  title="Healthy Completion Across All Courses"
                  message="No active programmes have an overall trainee completion rate below 50%."
                  icon={<CheckCircle2 className="w-8 h-8 text-secondary" />}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-semibold">
                        <th className="py-3 px-3">
                          <button
                            onClick={() => toggleSort('title')}
                            className="flex items-center gap-1.5 hover:text-slate-700 cursor-pointer font-semibold text-slate-600"
                          >
                            <span>Course Title</span>
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </th>
                        <th className="py-3 px-3 w-48">
                          <button
                            onClick={() => toggleSort('completion')}
                            className="flex items-center gap-1.5 hover:text-slate-700 cursor-pointer font-semibold text-slate-600"
                          >
                            <span>Completion %</span>
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </th>
                        <th className="py-3 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedCourses.map((c) => {
                        const pct = c.completion_percentage ?? c.completion_rate ?? 0;
                        const isSevere = pct < 25;
                        return (
                          <tr key={c.course_id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-3 font-semibold text-slate-900">
                              <div className="flex items-center gap-2">
                                <span>{c.course_title || c.title}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-normal">ID: #{c.course_id}</span>
                            </td>
                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-3">
                                <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      isSevere ? 'bg-danger' : 'bg-warning'
                                    }`}
                                    style={{ width: `${Math.max(pct, 5)}%` }}
                                  />
                                </div>
                                <span className={`font-bold ${isSevere ? 'text-danger' : 'text-warning'}`}>
                                  {pct}%
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-3 text-right">
                              <Badge
                                status={isSevere ? 'gap' : 'pending'}
                                label={isSevere ? 'Critical Lag' : 'Below 50%'}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Threshold: Under 50% average completion</span>
              <span className="text-slate-400 font-medium">Auto-updated on trainee progress submit</span>
            </div>
          </div>

          {/* Section: Employer Feedback Summary (1 col) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    Employer Feedback
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Industry skill ratings from cooperative societies.
                  </p>
                </div>
                <Badge status="completed" label="Direct Ratings" />
              </div>

              {loading ? (
                <LoadingSkeleton variant="card" count={2} />
              ) : employerGaps.length === 0 ? (
                <EmptyState
                  title="No Employer Evaluations"
                  message="Employers have not yet submitted skill evaluation forms for hired candidates."
                  icon={<Building2 className="w-8 h-8 text-primary" />}
                />
              ) : (
                <div className="space-y-3">
                  {employerGaps.slice(0, 5).map((eg) => {
                    const lowPct = Math.round(eg.low_rating_ratio * 100);
                    const isFlagged = eg.flagged || lowPct >= 50;
                    return (
                      <div
                        key={eg.skill_name}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isFlagged
                            ? 'bg-rose-50/60 border-rose-200/80'
                            : 'bg-slate-50/80 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-xs truncate max-w-[140px]">
                            {eg.skill_name}
                          </span>
                          <Badge
                            status={isFlagged ? 'gap' : 'completed'}
                            label={isFlagged ? `${lowPct}% Low Ratings` : 'Positive Endorsement'}
                          />
                        </div>

                        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                          <span>Total Evaluations: {eg.total_reports}</span>
                          <span className="font-semibold text-slate-700">
                            {100 - lowPct}% Satisfactory
                          </span>
                        </div>

                        <div className="mt-1.5 w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden flex">
                          <div
                            className="h-full bg-danger rounded-l-full"
                            style={{ width: `${lowPct}%` }}
                          />
                          <div
                            className="h-full bg-secondary rounded-r-full"
                            style={{ width: `${100 - lowPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 text-xs text-slate-400">
              Signals common deficits requiring practical workshop interventions.
            </div>
          </div>
        </div>

        {/* Admin Navigation Quick-Links */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              NCCT Multi-Portal Supervisory Access
            </h4>
            <p className="text-xs text-slate-600">
              Seamlessly audit other operational portals as a National Council Super Administrator:
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/trainee/dashboard"
              className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors flex items-center gap-1.5"
            >
              <span>Trainee Portal</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </Link>
            <Link
              href="/trainer/dashboard"
              className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors flex items-center gap-1.5"
            >
              <span>Trainer Portal</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </Link>
            <Link
              href="/employer/dashboard"
              className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors flex items-center gap-1.5"
            >
              <span>Employer Portal</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  </ProtectedRoute>
);
}
