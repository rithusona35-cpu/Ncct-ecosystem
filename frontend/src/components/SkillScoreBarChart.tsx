'use client';

import React from 'react';
import { SkillScoreItem } from '@/lib/types';

interface SkillScoreBarChartProps {
  skillScores: Record<string, SkillScoreItem> | SkillScoreItem[];
  overallScore?: number;
  title?: string;
  subtitle?: string;
}

export default function SkillScoreBarChart({
  skillScores,
  overallScore,
  title = 'Skill-Wise Competency Breakdown',
  subtitle = 'Assessment results aggregated per skill dimension for targeted capability building',
}: SkillScoreBarChartProps) {
  const rawList = Array.isArray(skillScores) ? skillScores : Object.values(skillScores || {});
  const seenSkills = new Set<string>();
  const skillsList: SkillScoreItem[] = [];
  for (const item of rawList) {
    if (!item) continue;
    const key = (typeof item === 'object' && item.skill_id !== undefined) 
      ? String(item.skill_id) 
      : (typeof item === 'object' && item.skill_name ? item.skill_name : String(item));
    if (!seenSkills.has(key)) {
      seenSkills.add(key);
      if (typeof item === 'object') {
        skillsList.push(item);
      } else {
        skillsList.push({
          skill_id: 0,
          skill_name: key,
          marks_obtained: 0,
          total_marks: 10,
          percentage: Number(item) || 0,
        });
      }
    }
  }

  if (skillsList.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center text-slate-500">
        No skill score data available.
      </div>
    );
  }

  // Calculate high-level stats
  const totalEarned = skillsList.reduce((acc, s) => acc + (s.marks_obtained || 0), 0);
  const totalPossible = skillsList.reduce((acc, s) => acc + (s.total_marks || 0), 0);
  const computedAvg = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;
  const displayOverall = overallScore !== undefined ? Math.round(overallScore) : computedAvg;

  const proficientCount = skillsList.filter(s => (s.percentage || 0) >= 75).length;
  const needsImprovementCount = skillsList.filter(s => (s.percentage || 0) < 50).length;

  const getBarColor = (pct: number) => {
    if (pct >= 75) return 'from-emerald-500 to-teal-400';
    if (pct >= 50) return 'from-amber-500 to-yellow-400';
    return 'from-rose-500 to-red-400';
  };

  const getBadgeStyle = (pct: number) => {
    if (pct >= 75) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (pct >= 50) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-rose-50 text-rose-700 border-rose-200';
  };

  const getTierLabel = (pct: number) => {
    if (pct >= 85) return 'Advanced Mastery';
    if (pct >= 70) return 'Proficient';
    if (pct >= 50) return 'Developing';
    return 'Skill Gap Identified';
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6" id="skill-score-breakdown-card">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </span>
            <h3 className="text-xl font-bold text-slate-800">{title}</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        </div>

        {/* Overall Score Badge */}
        <div className="flex items-center gap-3 bg-gradient-to-br from-slate-50 to-indigo-50/40 px-4 py-2.5 rounded-xl border border-indigo-100/60">
          <div className="text-right">
            <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Overall Score</div>
            <div className="text-xs text-slate-400">{totalEarned} / {totalPossible} Marks</div>
          </div>
          <div className="text-2xl font-black text-indigo-700 bg-white px-3 py-1 rounded-lg shadow-xs border border-indigo-100">
            {displayOverall}%
          </div>
        </div>
      </div>

      {/* Quick Summary Pill Bar */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <div className="text-xs text-slate-500 font-medium">Skills Evaluated</div>
          <div className="text-lg font-bold text-slate-800 mt-0.5">{skillsList.length}</div>
        </div>
        <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100">
          <div className="text-xs text-emerald-700 font-medium">Proficient (≥75%)</div>
          <div className="text-lg font-bold text-emerald-800 mt-0.5">{proficientCount}</div>
        </div>
        <div className="bg-rose-50/50 rounded-xl p-3 border border-rose-100">
          <div className="text-xs text-rose-700 font-medium">Skill Gaps (&lt;50%)</div>
          <div className="text-lg font-bold text-rose-800 mt-0.5">{needsImprovementCount}</div>
        </div>
      </div>

      {/* Skill Bar Visuals */}
      <div className="space-y-5 pt-2" id="skill-bars-container">
        {skillsList.map((skill) => {
          const pct = Math.round(skill.percentage);
          const barColorClass = getBarColor(pct);
          const badgeClass = getBadgeStyle(pct);
          const tierLabel = getTierLabel(pct);

          return (
            <div key={skill.skill_id} className="space-y-2 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-base">{skill.skill_name}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${badgeClass}`}>
                    {tierLabel}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-slate-400 font-medium">
                    {skill.marks_obtained}/{skill.total_marks} pts
                  </span>
                  <span className="text-lg font-extrabold text-slate-800 min-w-[50px] text-right">
                    {pct}%
                  </span>
                </div>
              </div>

              {/* Progress Track */}
              <div className="w-full bg-slate-100 rounded-full h-3.5 p-0.5 overflow-hidden shadow-inner">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${barColorClass} transition-all duration-700 ease-out`}
                  style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                  title={`${skill.skill_name}: ${pct}%`}
                />
              </div>

              {/* Scale marks */}
              <div className="flex justify-between text-[10px] text-slate-400 px-0.5">
                <span>0% (Beginner)</span>
                <span>50% (Competent)</span>
                <span>100% (Mastery)</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Skill-Gap Engine Link Note */}
      <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center gap-3 text-xs text-blue-700">
        <svg className="w-4 h-4 flex-shrink-0 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <span>
          These skill ratings are stored in the NCCT ecosystem database and feed into the <strong>Skill-Gap Engine</strong> for personalized curriculum recommendations.
        </span>
      </div>
    </div>
  );
}
