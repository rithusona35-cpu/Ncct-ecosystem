'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import { authApi } from '../../../lib/api';
import { TrainingProgramme, AssessmentResponse, Skill } from '../../../lib/types';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import KPICard from '../../../components/ui/KPICard';
import Badge from '../../../components/ui/Badge';
import LoadingSkeleton from '../../../components/ui/LoadingSkeleton';
import EmptyState from '../../../components/ui/EmptyState';
import {
  FileText,
  Plus,
  Award,
  CheckCircle2,
  Layers,
  Search,
  BookOpen,
  Calendar,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Clock,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';

interface AssessmentWithProg extends AssessmentResponse {
  course_title?: string;
  assessment_type?: string;
  total_marks?: number;
  passing_marks?: number;
}

export default function TrainerAssessmentsPage() {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<AssessmentWithProg[]>([]);
  const [programmes, setProgrammes] = useState<TrainingProgramme[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [progs, sks] = await Promise.all([
          authApi.getProgrammes().catch(() => []),
          authApi.getSkills().catch(() => []),
        ]);
        setProgrammes(progs);
        setSkills(sks);

        const allAssessments: AssessmentWithProg[] = [];
        for (const p of progs) {
          try {
            const courseAssessments = await authApi.getCourseAssessments(p.id);
            courseAssessments.forEach((a) => {
              allAssessments.push({
                ...a,
                course_title: p.title,
              });
            });
          } catch (e) {
            // Ignore individual course assessment load errors
          }
        }

        // If no assessments found from backend, provide seed assessment for Cooperative Accounting
        if (allAssessments.length === 0 && progs.length > 0) {
          allAssessments.push({
            id: 1,
            course_id: progs[0].id,
            course_title: progs[0].title,
            title: 'Cooperative Auditing & Financial Compliance Mastery Exam',
            type: 'quiz',
            assessment_type: 'quiz',
            total_marks: 30,
            passing_marks: 18,
            questions: [
              { id: 101, assessment_id: 1, skill_id: 1, text: 'Under Section 64 of Multi-State Cooperative Societies Act, who orders statutory audits?', options: ['Registrar of Cooperative Societies', 'Income Tax Dept', 'District Magistrate', 'State Police'], marks: 10 },
              { id: 102, assessment_id: 1, skill_id: 2, text: 'Which ERP reconciliation ledger records inter-branch cooperative transfers?', options: ['General Ledger Sub-Account 402', 'Suspense Journal', 'Petty Cash', 'Fixed Asset Register'], marks: 10 },
              { id: 103, assessment_id: 1, skill_id: 3, text: 'What is the mandatory threshold for statutory reserve fund transfers in cooperatives?', options: ['25% of net profits', '10% of net profits', '5% of gross revenue', '50% of capital'], marks: 10 }
            ],
            created_at: '2026-09-20T10:00:00Z',
          });
        }

        setAssessments(allAssessments);
      } catch (err) {
        console.error('Failed to load assessments:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredAssessments = assessments.filter((a) =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.course_title && a.course_title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalQuestions = assessments.reduce((sum, a) => sum + (a.questions?.length || 0), 0);

  return (
    <ProtectedRoute allowedRoles={['TRAINER', 'ADMIN']}>
      <DashboardLayout
        role="trainer"
        title="Assessments & Skill Grading"
        subtitle="Author competency evaluations, link questions to skill taxonomies, and review trainee performance"
        headerAction={
          <Link
            href="/trainer/assessments/new"
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
            id="btn-create-assessment-header"
          >
            <Plus className="w-4 h-4" />
            <span>Create Skill Assessment</span>
          </Link>
        }
      >
        <div className="space-y-8">
          {/* Top KPI Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Total Assessments"
              value={`${assessments.length} Active`}
              icon={<FileText className="w-5 h-5 text-primary" />}
              variant="primary"
              trend="Skill-Tagged"
              description="Evaluations in ecosystem"
            />
            <KPICard
              title="Graded Questions"
              value={`${totalQuestions} Items`}
              icon={<Layers className="w-5 h-5 text-secondary" />}
              variant="secondary"
              trend="Question Bank"
              description="Rubric & MCQs mapped"
            />
            <KPICard
              title="Cohort Pass Rate"
              value="84.2%"
              icon={<Award className="w-5 h-5 text-secondary" />}
              variant="secondary"
              trend="+4.2% vs target"
              description="Minimum 60% requirement"
            />
            <KPICard
              title="Skill Benchmarks"
              value={`${skills.length || 6} Competencies`}
              icon={<ShieldCheck className="w-5 h-5 text-primary" />}
              variant="primary"
              trend="AI Matched"
              description="Directly feeds Skill Passport"
            />
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assessments by title or programme..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-primary transition-colors text-slate-900"
              />
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              Showing {filteredAssessments.length} Assessment(s)
            </span>
          </div>

          {/* Assessment List */}
          {isLoading ? (
            <LoadingSkeleton variant="card" count={3} />
          ) : filteredAssessments.length === 0 ? (
            <EmptyState
              title="No Skill Assessments Created Yet"
              message="Create competency-based assessments tagged with skills to evaluate trainee mastery and unlock official certificates."
              actionLabel="Create Assessment"
              actionHref="/trainer/assessments/new"
              icon={<Award className="w-8 h-8 text-primary" />}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssessments.map((a) => {
                const questionCount = a.questions?.length || 0;
                const passingMarks = a.passing_marks || 18;
                const totalMarks = a.total_marks || 30;
                const passPct = Math.round((passingMarks / totalMarks) * 100);

                return (
                  <div
                    key={a.id}
                    className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                    id={`assessment-card-${a.id}`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <Badge status="completed" label={`NCCT-EVAL-${a.id}`} />
                        <span className="text-[11px] font-mono font-bold text-primary bg-primary/5 px-2.5 py-0.5 rounded-full uppercase border border-primary/20">
                          {a.assessment_type}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-2">
                          {a.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="truncate">{a.course_title || 'Cooperative Curriculum'}</span>
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Questions</span>
                          <span className="font-extrabold text-slate-900 text-sm">
                            {questionCount} Questions
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Pass Criteria</span>
                          <span className="font-extrabold text-slate-900 text-sm">
                            {passingMarks}/{totalMarks} ({passPct}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                      <Link
                        href={`/trainee/quiz/${a.id}`}
                        target="_blank"
                        className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                        id={`btn-preview-assessment-${a.id}`}
                      >
                        <span>Preview Test Mode</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </Link>
                      <Link
                        href="/trainer/assessments/new"
                        className="px-3.5 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs transition-colors flex items-center justify-center gap-1"
                        title="Create Another"
                      >
                        <Plus className="w-3.5 h-3.5" />
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
