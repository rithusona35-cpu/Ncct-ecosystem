'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { authApi } from '@/lib/api';
import {
  JobRole,
  SkillGapAnalysisResponse,
  SkillGapComparisonItem,
  TraineeRecommendationsResponse,
  RecommendedModuleItem
} from '@/lib/types';
import {
  Briefcase,
  Target,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  BookOpen,
  Award,
  Layers,
  ChevronRight,
  TrendingUp,
  GraduationCap,
  ExternalLink,
  Info
} from 'lucide-react';
import Link from 'next/link';
import {
  DashboardLayout,
  KPICard,
  Badge,
  EmptyState,
  LoadingSkeleton,
} from '@/components/ui';

export default function SkillGapPage() {
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<SkillGapAnalysisResponse | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedModuleItem[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available Job Roles on mount
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const roles = await authApi.getJobRoles();
        setJobRoles(roles);
        if (roles.length > 0) {
          // Default to "Cooperative Accountant" if present, otherwise first
          const defaultRole = roles.find(r => r.title.toLowerCase().includes('accountant')) || roles[0];
          setSelectedRoleId(defaultRole.id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load job roles');
      } finally {
        setIsLoadingRoles(false);
      }
    };

    fetchRoles();
  }, []);

  // Whenever selectedRoleId changes, run gap analysis and fetch recommendations
  useEffect(() => {
    if (!selectedRoleId) return;

    const runAnalysis = async () => {
      setIsLoadingAnalysis(true);
      setError(null);
      try {
        const [gapData, recData] = await Promise.all([
          authApi.getSkillGapAnalysis('me', selectedRoleId),
          authApi.getSkillRecommendations('me', selectedRoleId),
        ]);
        setAnalysis(gapData);
        setRecommendations(recData.recommendations || []);
      } catch (err: any) {
        setError(err.message || 'Failed to perform skill-gap analysis');
      } finally {
        setIsLoadingAnalysis(false);
      }
    };

    runAnalysis();
  }, [selectedRoleId]);

  const selectedRole = jobRoles.find(r => r.id === selectedRoleId);

  return (
    <ProtectedRoute allowedRoles={['TRAINEE', 'ADMIN', 'TRAINER']}>
      <DashboardLayout
        role="trainee"
        activeRoute="/trainee/skill-gap"
        title="AI Skill-Gap Engine & Career Role Fit"
        subtitle="Benchmark evaluated competencies against industry cooperative job profiles to identify skill gaps and tailored learning paths."
        badge={<Badge status="gap" label="AI Engine Active" size="sm" dot />}
        breadcrumbs={[
          { label: 'NCCT Portal', href: '/' },
          { label: 'Trainee Hub', href: '/trainee/dashboard' },
          { label: 'Skill Gap Analysis' },
        ]}
        headerActions={
          <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2">
            <label htmlFor="select-job-role" className="text-xs font-bold text-slate-500 pl-2 shrink-0">
              Target Role:
            </label>
            <select
              id="select-job-role"
              value={selectedRoleId || ''}
              onChange={(e) => setSelectedRoleId(Number(e.target.value))}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-800 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] cursor-pointer"
            >
              {jobRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-danger-50 border border-danger-100 rounded-xl text-danger text-sm flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Top KPI Cards for Role Fit Analysis */}
          {isLoadingAnalysis ? (
            <LoadingSkeleton variant="kpi" count={4} />
          ) : analysis ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Role Match Percentage"
                value={`${Math.round(analysis.overall_match_percentage)}%`}
                icon={<Target className="w-5 h-5 text-secondary" />}
                variant="secondary"
                trend={{
                  value: `${analysis.skills_matched}/${analysis.total_skills_required} Matched`,
                  isPositive: analysis.overall_match_percentage >= 60,
                }}
                description={selectedRole?.title || 'Cooperative Accountant'}
              />
              <KPICard
                title="Matched Skills"
                value={`${analysis.skills_matched} Competencies`}
                icon={<CheckCircle2 className="w-5 h-5 text-secondary" />}
                variant="secondary"
                trend="Meets Required Threshold"
                description="Accounting, Excel, Comm"
              />
              <KPICard
                title="Flagged Skill Gaps"
                value={`${analysis.skills_gap_count} Gaps`}
                icon={<AlertTriangle className="w-5 h-5 text-warning" />}
                variant="warning"
                trend={{
                  value: 'Action Required',
                  isPositive: false,
                  label: 'ERP & GST',
                }}
                description="Remedial modules available"
              />
              <KPICard
                title="Targeted Recommendations"
                value={`${recommendations.length} Modules`}
                icon={<BookOpen className="w-5 h-5 text-primary" />}
                variant="primary"
                trend="Direct Curriculum Links"
                description="Closing competency gap"
              />
            </div>
          ) : null}

          {isLoadingRoles ? (
            <LoadingSkeleton variant="card" count={2} />
          ) : (
            <>
              {/* Role Overview & Metric Banner */}
              {selectedRole && (
                <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-indigo-900/50">
                  <div className="space-y-2 max-w-2xl">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-400/20">
                      <Briefcase className="w-3.5 h-3.5" />
                      Target NCCT Job Role
                    </div>
                    <h2 className="text-2xl font-black tracking-tight" id="active-job-role-title">
                      {selectedRole.title}
                    </h2>
                    <p className="text-indigo-200 text-xs sm:text-sm leading-relaxed">
                      {selectedRole.description}
                    </p>
                  </div>

                  {/* Overall Match Circle / Stats */}
                  {analysis && (
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/15 flex items-center gap-5 shrink-0" id="role-fit-stats-card">
                      <div className="text-right">
                        <div className="text-xs text-indigo-200 font-semibold uppercase tracking-wider">Role Readiness</div>
                        <div className="text-xs text-slate-300 mt-0.5">
                          {analysis.skills_matched} of {analysis.total_skills_required} Skills Matched
                        </div>
                        {analysis.skills_gap_count > 0 ? (
                          <div className="text-[11px] text-rose-300 font-bold mt-1">
                            {analysis.skills_gap_count} Skill Gap(s) Flagged
                          </div>
                        ) : (
                          <div className="text-[11px] text-emerald-300 font-bold mt-1">
                            Fully Qualified
                          </div>
                        )}
                      </div>

                      <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex flex-col items-center justify-center font-black shadow-md border border-indigo-400/40">
                        <span className="text-xl leading-none" id="overall-match-pct">
                          {Math.round(analysis.overall_match_percentage)}%
                        </span>
                        <span className="text-[9px] uppercase tracking-wider font-semibold opacity-80 mt-1">
                          Match
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 1: SKILL GAP MATRIX TABLE */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="skill-gap-table-section">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-indigo-600" />
                      Role Competency Benchmark Matrix
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Direct comparison between your assessed performance and required threshold levels
                    </p>
                  </div>

                  {isLoadingAnalysis && (
                    <div className="inline-flex items-center gap-2 text-xs text-indigo-600 font-semibold">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing competency match...
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm" id="skill-gap-table">
                    <thead className="bg-slate-50/70 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-3.5 px-6">Skill / Subject</th>
                        <th className="py-3.5 px-6">Your Assessed Level</th>
                        <th className="py-3.5 px-6">Required Level (Threshold)</th>
                        <th className="py-3.5 px-6 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {analysis?.skills.map((item) => {
                        const isGap = item.gap;
                        const traineeLevel = Math.round(item.trainee_level);
                        const requiredThreshold = Math.round(item.required_threshold);

                        return (
                          <tr
                            key={item.skill_id}
                            className={`hover:bg-slate-50/50 transition-colors ${
                              isGap ? 'bg-rose-50/20' : 'bg-emerald-50/10'
                            }`}
                            id={`row-skill-${item.skill.toLowerCase()}`}
                          >
                            {/* Skill Name */}
                            <td className="py-4 px-6 font-bold text-slate-900">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                                <span>{item.skill}</span>
                              </div>
                            </td>

                            {/* Trainee Level with Bar */}
                            <td className="py-4 px-6">
                              <div className="space-y-1.5 max-w-[180px]">
                                <div className="flex items-baseline justify-between text-xs">
                                  <span className="font-extrabold text-slate-800 text-sm">
                                    {traineeLevel}%
                                  </span>
                                  {traineeLevel === 0 && (
                                    <span className="text-[10px] text-slate-400 italic">Not Assessed</span>
                                  )}
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                                  <div
                                    className={`h-full rounded-full ${
                                      isGap
                                        ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                                        : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(0, traineeLevel))}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Required Level */}
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-xs font-extrabold tracking-wide uppercase ${
                                    item.required_level === 'HIGH'
                                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                      : item.required_level === 'MEDIUM'
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {item.required_level}
                                </span>
                                <span className="text-xs text-slate-500 font-medium">
                                  (≥ {requiredThreshold}%)
                                </span>
                              </div>
                            </td>

                            {/* Status: Matched vs Gap */}
                            <td className="py-4 px-6 text-center">
                              {isGap ? (
                                <Badge
                                  status="gap"
                                  label={`Gap (-${Math.round(item.gap_percentage)}%)`}
                                  size="sm"
                                  id={`badge-status-${item.skill.toLowerCase()}`}
                                />
                              ) : (
                                <Badge
                                  status="matched"
                                  label="Matched"
                                  size="sm"
                                  id={`badge-status-${item.skill.toLowerCase()}`}
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                  <span>
                    Threshold calibration: <strong>HIGH ≥ 70%</strong> • <strong>MEDIUM ≥ 60%</strong> • <strong>LOW ≥ 40%</strong>
                  </span>
                  <Link
                    href="/trainee/courses"
                    className="text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                  >
                    <span>Take assessments to boost levels</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* SECTION 2: RECOMMENDED FOR YOU CARDS */}
              <div className="space-y-4" id="recommended-modules-section">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-600" />
                      Recommended for You
                    </h3>
                    <p className="text-xs text-slate-500">
                      Curated curriculum modules tailored to bridge your identified skill gaps in{' '}
                      <strong>{selectedRole?.title}</strong>
                    </p>
                  </div>

                  <span className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
                    {recommendations.length} Actionable Course Modules
                  </span>
                </div>

                {recommendations.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                    <h4 className="text-base font-bold text-slate-800">
                      Congratulations! No Skill Gaps Identified
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Your current competencies meet or exceed all thresholds required for{' '}
                      <strong>{selectedRole?.title}</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="recommendation-cards-container">
                    {recommendations.map((rec, rIdx) => (
                      <div
                        key={rIdx}
                        className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between gap-4 group"
                        id={`rec-card-${rec.skill_name.toLowerCase()}`}
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Layers className="w-3.5 h-3.5 text-indigo-600" />
                              Skill Focus: {rec.skill_name}
                            </span>
                            {rec.gap_percentage > 0 && (
                              <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                                Bridges {rec.gap_percentage}% Gap
                              </span>
                            )}
                          </div>

                          <div>
                            <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                              {rec.course_title}
                            </div>
                            <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mt-0.5">
                              {rec.recommendation_text}
                            </h4>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs text-slate-500">
                            Module #{rec.order} • Direct Learning Link
                          </span>

                          <Link
                            href={rec.player_url}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                            id={`btn-open-rec-module-${rec.skill_name.toLowerCase()}`}
                          >
                            <span>Open Module</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
