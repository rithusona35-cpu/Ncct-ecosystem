'use client';

import React, { useState } from 'react';
import { SkillPassportResponse, PassportSkillItem } from '@/lib/types';
import {
  Award,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Building2,
  BookOpen,
  FolderGit2,
  Share2,
  Copy,
  Check,
  Printer,
  Sparkles,
  ExternalLink,
  GraduationCap,
  Layers,
  Star,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

interface SkillPassportCardProps {
  passport: SkillPassportResponse;
  readOnly?: boolean;
  onRefresh?: () => void;
}

export default function SkillPassportCard({
  passport,
  readOnly = false,
  onRefresh,
}: SkillPassportCardProps) {
  const [copied, setCopied] = useState(false);

  const copyShareLink = () => {
    const url = `${window.location.origin}${passport.shareable_url}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper to render 5-segment level indicator
  const renderLevelGauge = (level: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((seg) => (
          <div
            key={seg}
            className={`h-2.5 w-6 rounded-sm transition-all ${
              seg <= level
                ? level >= 4
                  ? 'bg-emerald-500 shadow-xs'
                  : level >= 3
                  ? 'bg-indigo-500 shadow-xs'
                  : 'bg-amber-400'
                : 'bg-slate-200'
            }`}
            title={`Level ${seg}`}
          />
        ))}
      </div>
    );
  };

  const getLevelColor = (level: number) => {
    if (level >= 5) return 'bg-emerald-50 text-emerald-800 border-emerald-300';
    if (level === 4) return 'bg-teal-50 text-teal-800 border-teal-300';
    if (level === 3) return 'bg-blue-50 text-blue-800 border-blue-300';
    if (level === 2) return 'bg-amber-50 text-amber-800 border-amber-300';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div
      className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden print:border-none print:shadow-none transition-all"
      id="skill-passport-card"
    >
      {/* Top Credential Security Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white relative overflow-hidden">
        {/* Background decorative watermark */}
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-6">
          <ShieldCheck className="w-64 h-64 text-white" />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Verified NCCT Digital Credential
              </span>
              <span className="text-slate-400 text-xs font-mono">
                {passport.passport_code}
              </span>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight" id="passport-trainee-name">
                {passport.name}
              </h2>
              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-indigo-200 mt-1">
                <span>Trainee ID: <strong className="text-white font-mono">{passport.trainee_id}</strong></span>
                <span>•</span>
                <span>{passport.institution || 'NCCT Cooperative Training Institute'}</span>
              </div>
            </div>

            {passport.education && (
              <div className="text-xs text-slate-300 flex items-center gap-2 pt-1">
                <GraduationCap className="w-4 h-4 text-indigo-300" />
                <span>{passport.education}</span>
                {passport.preferred_language && (
                  <span className="text-slate-400">({passport.preferred_language})</span>
                )}
              </div>
            )}
          </div>

          {/* Overall Competency Rating Badge */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-3">
            <div>
              <div className="text-[10px] text-indigo-200 uppercase font-semibold tracking-wider">
                Overall Competency
              </div>
              <div className="text-xl sm:text-2xl font-black text-white mt-0.5" id="passport-overall-level">
                Level {passport.overall_level}
              </div>
              <div className="text-[11px] text-emerald-300 font-bold">
                {passport.overall_level_label}
              </div>
            </div>

            <div className="text-[11px] text-slate-300 sm:mt-1 font-mono">
              Avg: {Math.round(passport.overall_score)}%
            </div>
          </div>
        </div>
      </div>

      {/* 4 Summary Metrics Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 border-b border-slate-200 bg-slate-50/70 text-center">
        <div className="p-4 space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-semibold">
            <Award className="w-4 h-4 text-amber-500" />
            Certificates
          </div>
          <div className="text-xl font-black text-slate-900" id="passport-certs-count">
            {passport.certificates_count}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">Officially Issued</div>
        </div>

        <div className="p-4 space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-semibold">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            Courses Completed
          </div>
          <div className="text-xl font-black text-slate-900" id="passport-courses-count">
            {passport.completed_courses_count}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">Curriculums Mastered</div>
        </div>

        <div className="p-4 space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-semibold">
            <FolderGit2 className="w-4 h-4 text-teal-500" />
            Projects &amp; Practicals
          </div>
          <div className="text-xl font-black text-slate-900" id="passport-projects-count">
            {passport.completed_projects_count}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">Applied Evaluations</div>
        </div>

        <div className="p-4 space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-semibold">
            <Sparkles className="w-4 h-4 text-purple-500" />
            Skills Assessed
          </div>
          <div className="text-xl font-black text-slate-900">
            {passport.skills.length}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">NCCT Competencies</div>
        </div>
      </div>

      {/* Main Body: Skill Levels (1-5 format) */}
      <div className="p-6 sm:p-8 space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Star className="w-4 h-4" />
              </span>
              <h3 className="text-lg font-bold text-slate-900">
                Assessed Skill Competency Levels
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Calibrated Scale (Level 1 to 5)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Recomputed automatically on read from authenticated course and practical assessment submissions.
          </p>
        </div>

        {/* Skill Items List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="passport-skills-grid">
          {passport.skills.map((skill) => {
            const levelStyle = getLevelColor(skill.level);

            return (
              <div
                key={skill.skill_id}
                className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/80 hover:border-indigo-300 hover:bg-slate-50 transition-all space-y-3"
                id={`passport-skill-card-${skill.skill_name.toLowerCase()}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {/* Exact format: Skill: Level X */}
                    <div className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                      <span className="skill-display-format font-mono">
                        {skill.display_format}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                      {skill.category}
                    </div>
                  </div>

                  {/* Level Pill */}
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${levelStyle}`}>
                    {skill.level_label}
                  </span>
                </div>

                {/* Level Gauge & Percentage */}
                <div className="flex items-center justify-between pt-1">
                  {renderLevelGauge(skill.level)}
                  <span className="text-xs font-mono font-bold text-slate-700">
                    {Math.round(skill.percentage)}% Score
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Certificates Section */}
        {passport.certificates.length > 0 && (
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              Verified Issued Certificates ({passport.certificates.length})
            </h4>

            <div className="grid grid-cols-1 gap-2.5">
              {passport.certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="bg-amber-50/40 border border-amber-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-900">{cert.title}</div>
                    <div className="text-[11px] text-slate-500">
                      Code: <span className="font-mono font-bold text-amber-800">{cert.certificate_code}</span>
                      {' • '}Issued on {new Date(cert.issued_date).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 font-bold self-start sm:self-auto">
                    Verified
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer & Action Bar (Hidden when printed) */}
      <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Issued by National Council for Cooperative Training (NCCT)</span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={copyShareLink}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            id="btn-copy-passport-link"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Link Copied!' : 'Share Passport'}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            id="btn-print-passport"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / PDF
          </button>

          {!readOnly && (
            <Link
              href="/trainee/courses"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
              id="btn-level-up-skills"
            >
              <span>Take Assessments to Level Up</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
