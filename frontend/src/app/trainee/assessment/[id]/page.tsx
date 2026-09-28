'use client';

import React, { useEffect, useState, use } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { authApi } from '@/lib/api';
import { AssessmentResponse, AssessmentSubmitResponse } from '@/lib/types';
import SkillScoreBarChart from '@/components/SkillScoreBarChart';
import {
  Award,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  ArrowRight,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  GraduationCap
} from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TraineeAssessmentPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const assessmentId = Number(resolvedParams.id);

  const [assessment, setAssessment] = useState<AssessmentResponse | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssessmentSubmitResponse | null>(null);

  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        const data = await authApi.getAssessment(assessmentId);
        setAssessment(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load assessment.');
      } finally {
        setIsLoading(false);
      }
    };

    if (assessmentId) {
      fetchAssessment();
    }
  }, [assessmentId]);

  const handleSelectOption = (questionId: number, optionIdx: number) => {
    if (result) return; // Prevent changing answers after submit
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionIdx,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assessment) return;

    // Check if any question remains unanswered
    const unansweredCount = assessment.questions.filter(q => answers[q.id] === undefined).length;
    if (unansweredCount > 0) {
      if (!confirm(`You have ${unansweredCount} unanswered question(s). Are you sure you want to submit?`)) {
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Map to string keys for JSON submit
      const payloadAnswers: Record<string, number> = {};
      Object.entries(answers).forEach(([k, v]) => {
        payloadAnswers[k] = v;
      });

      const submissionResult = await authApi.submitAssessment(assessmentId, payloadAnswers);
      setResult(submissionResult);

      // Scroll smoothly to results card
      setTimeout(() => {
        const el = document.getElementById('skill-score-breakdown-card');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    } catch (err: any) {
      setError(err.message || 'Failed to submit assessment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = assessment?.questions.length || 0;
  const totalMarks = assessment?.questions.reduce((sum, q) => sum + q.marks, 0) || 0;

  return (
    <ProtectedRoute allowedRoles={['TRAINEE', 'TRAINER', 'ADMIN']}>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />

        <div className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full space-y-6">
          {/* Back breadcrumb */}
          <div className="flex items-center justify-between">
            <Link
              href="/trainee/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Trainee Dashboard
            </Link>

            {assessment && (
              <span className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full uppercase tracking-wider">
                {assessment.type} Assessment
              </span>
            )}
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="p-16 text-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
              Loading competency assessment...
            </div>
          ) : !assessment ? (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200">
              Assessment not found.
            </div>
          ) : (
            <>
              {/* Assessment Header Card */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                      {assessment.course_title || 'NCCT Programme'}
                    </span>
                    <h1 className="text-2xl font-black text-slate-900 mt-0.5">
                      {assessment.title}
                    </h1>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-100">
                    <div>
                      <span className="font-semibold text-slate-700">{totalQuestions}</span> Questions
                    </div>
                    <span>•</span>
                    <div>
                      <span className="font-semibold text-slate-700">{totalMarks}</span> Total Marks
                    </div>
                  </div>
                </div>

                {/* Progress indicator when taking assessment */}
                {!result && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span>Answered: {answeredCount} of {totalQuestions}</span>
                      <span>{Math.round((answeredCount / (totalQuestions || 1)) * 100)}% Completed</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${(answeredCount / (totalQuestions || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* POST-SUBMISSION RESULTS VIEW */}
              {result && (
                <div className="space-y-6" id="assessment-result-section">
                  {/* Visual Bar Chart Breakdown Component */}
                  <SkillScoreBarChart
                    skillScores={result.skill_wise_score}
                    overallScore={result.overall_score}
                    title="Skill-Wise Performance Breakdown"
                    subtitle="Detailed capability aggregation across all tagged competency domains"
                  />

                  {/* Actions after submission */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-slate-500">
                      Submitted at: <span className="font-semibold text-slate-700">{new Date(result.submitted_at).toLocaleString()}</span>
                      {' • '}Trainee ID: <span className="font-mono font-bold text-slate-700">{result.trainee_id}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setResult(null);
                          setAnswers({});
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Retake Assessment
                      </button>

                      <Link
                        href="/trainee/dashboard"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition shadow-sm"
                        id="btn-return-dashboard"
                      >
                        <GraduationCap className="w-4 h-4" />
                        View in Dashboard
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* QUESTION FORM */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {assessment.questions.map((q, idx) => {
                  const isAnswered = answers[q.id] !== undefined;

                  return (
                    <div
                      key={q.id}
                      className={`bg-white rounded-2xl p-6 border shadow-sm transition space-y-4 ${
                        isAnswered ? 'border-indigo-100 ring-1 ring-indigo-50' : 'border-slate-200'
                      }`}
                      id={`question-card-${q.id}`}
                    >
                      {/* Question meta: number + skill tag badge + marks */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-extrabold text-xs flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Question #{idx + 1}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Tagged Skill Badge */}
                          <span
                            className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1"
                            id={`skill-tag-q${idx + 1}`}
                          >
                            <Sparkles className="w-3 h-3 text-indigo-500" />
                            Skill: {q.skill_name || `Skill #${q.skill_id}`}
                          </span>

                          {/* Marks */}
                          <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600">
                            {q.marks} pts
                          </span>
                        </div>
                      </div>

                      {/* Question Text */}
                      <p className="text-base font-semibold text-slate-800 leading-relaxed">
                        {q.text}
                      </p>

                      {/* Options Radio List */}
                      <div className="space-y-2.5 pt-1">
                        {q.options.map((opt, optIdx) => {
                          const isSelected = answers[q.id] === optIdx;

                          return (
                            <label
                              key={optIdx}
                              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition select-none ${
                                isSelected
                                  ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                              } ${result ? 'cursor-default pointer-events-none' : ''}`}
                            >
                              <input
                                type="radio"
                                name={`q-${q.id}`}
                                checked={isSelected}
                                onChange={() => handleSelectOption(q.id, optIdx)}
                                disabled={!!result}
                                className="mt-0.5 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                                id={`radio-q${q.id}-opt${optIdx}`}
                              />
                              <div className="flex-1 text-sm text-slate-700 flex items-baseline gap-2">
                                <span className="font-bold text-slate-400 text-xs">
                                  {String.fromCharCode(65 + optIdx)}.
                                </span>
                                <span>{opt}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Submit action */}
                {!result && (
                  <div className="pt-4 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">
                      {answeredCount} of {totalQuestions} answered
                    </span>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-200 disabled:opacity-50 flex items-center gap-2"
                      id="btn-submit-assessment"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Grading Assessment...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Submit &amp; View Skill Breakdown
                        </>
                      )}
                    </button>
                  </div>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
