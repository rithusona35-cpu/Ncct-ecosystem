'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import { authApi } from '../../../../lib/api';
import { Quiz, QuizSubmitResponse } from '../../../../lib/types';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Award,
  RotateCcw,
  Sparkles,
  Loader2,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

export default function QuizTakingPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = Number(params.id);

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected answers: { [questionId: string]: selectedOptionIndex }
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<QuizSubmitResponse | null>(null);

  useEffect(() => {
    if (!quizId) return;

    const fetchQuiz = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await authApi.getQuiz(quizId);
        setQuiz(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load quiz');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuiz();
  }, [quizId]);

  const handleSelectOption = (questionId: number, optionIdx: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [String(questionId)]: optionIdx,
    }));
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await authApi.submitQuiz(quiz.id, selectedAnswers);
      setSubmitResult(result);
    } catch (err: any) {
      setError(err.message || 'Failed to submit quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setSubmitResult(null);
    setCurrentQuestionIndex(0);
  };

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={['TRAINEE', 'ADMIN', 'TRAINER']}>
        <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
          <p className="text-sm font-semibold text-slate-600">Loading Quiz Knowledge Check...</p>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !quiz) {
    return (
      <ProtectedRoute allowedRoles={['TRAINEE', 'ADMIN', 'TRAINER']}>
        <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-red-200 text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Unable to Load Quiz</h2>
          <p className="text-xs text-slate-500">{error || 'Quiz not found'}</p>
          <Link
            href="/trainee/courses"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Courses
          </Link>
        </div>
      </ProtectedRoute>
    );
  }

  const currentQ = quiz.questions[currentQuestionIndex];
  const totalQuestions = quiz.questions.length;
  const answeredCount = Object.keys(selectedAnswers).length;
  const isAllAnswered = answeredCount === totalQuestions;

  return (
    <ProtectedRoute allowedRoles={['TRAINEE', 'ADMIN', 'TRAINER']}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/trainee/courses"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to My Courses
          </Link>
          <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
            NCCT Knowledge Check Engine
          </span>
        </div>

        {submitResult ? (
          /* Quiz Results View */
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm space-y-8 animate-fadeIn">
            <div className="text-center space-y-3 pb-6 border-b border-slate-100">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-md ${
                  submitResult.passed ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                }`}
              >
                {submitResult.passed ? <Award className="w-8 h-8" /> : <RotateCcw className="w-8 h-8" />}
              </div>

              <div className="space-y-1">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                    submitResult.passed
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {submitResult.passed ? 'Assessment Passed' : 'Needs Improvement'}
                </span>
                <h1 className="text-2xl font-extrabold text-slate-900">
                  {quiz.title} - Score Report
                </h1>
              </div>

              {/* Score Display */}
              <div className="inline-flex items-baseline gap-2 bg-slate-50 border border-slate-200 px-6 py-3 rounded-2xl">
                <span className="text-3xl font-extrabold text-slate-900">
                  {submitResult.score} / {submitResult.total_marks}
                </span>
                <span className="text-sm font-bold text-emerald-600">
                  ({submitResult.percentage}%)
                </span>
              </div>
            </div>

            {/* Question Breakdown Review */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                Detailed Question Breakdown
              </h3>

              <div className="space-y-4">
                {submitResult.question_results.map((res, idx) => (
                  <div
                    key={res.question_id}
                    className={`p-5 rounded-2xl border ${
                      res.is_correct
                        ? 'border-emerald-200 bg-emerald-50/40'
                        : 'border-red-200 bg-red-50/40'
                    } space-y-3`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                            res.is_correct
                              ? 'bg-emerald-600 text-white'
                              : 'bg-red-600 text-white'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">{res.text}</h4>
                      </div>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          res.is_correct
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {res.marks_earned} / {res.marks_possible} pts
                      </span>
                    </div>

                    <div className="text-xs space-y-1 pl-8">
                      <p className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-500">Your Answer:</span>
                        {res.selected_option !== null && res.selected_option !== undefined ? (
                          <span
                            className={`font-medium ${
                              res.is_correct ? 'text-emerald-700' : 'text-red-700'
                            }`}
                          >
                            Option {res.selected_option + 1}
                          </span>
                        ) : (
                          <span className="italic text-slate-400">Not Answered</span>
                        )}
                        {res.is_correct ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                        )}
                      </p>

                      {!res.is_correct && (
                        <p className="flex items-center gap-1.5 text-emerald-800">
                          <span className="font-semibold text-slate-500">Correct Answer:</span>
                          <span className="font-medium">Option {res.correct_option + 1}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100">
              <button
                onClick={handleRetake}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Retake Quiz
              </button>

              <Link
                href="/trainee/courses"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
              >
                <span>Return to Courses &amp; Progress</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          /* Active Quiz Taking Interface */
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800">
                  Knowledge Assessment
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{quiz.title}</h1>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-auto">
                <span className="text-xs text-slate-500">
                  Answered: <strong className="text-slate-900">{answeredCount}</strong> of{' '}
                  <strong className="text-slate-900">{totalQuestions}</strong>
                </span>
              </div>
            </div>

            {/* Question Quick Selector Tabs */}
            <div className="flex flex-wrap gap-2">
              {quiz.questions.map((q, idx) => {
                const isAnswered = selectedAnswers[String(q.id)] !== undefined;
                const isCurrent = idx === currentQuestionIndex;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`w-9 h-9 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30'
                        : isAnswered
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Q{idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Current Question Card */}
            {currentQ && (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
                      Question {currentQuestionIndex + 1} of {totalQuestions}
                    </span>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                      {currentQ.text}
                    </h2>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-mono font-bold shrink-0">
                    {currentQ.marks} Marks
                  </span>
                </div>

                {/* Multiple Choice Options */}
                <div className="space-y-3">
                  {currentQ.options.map((opt, optIdx) => {
                    const isSelected = selectedAnswers[String(currentQ.id)] === optIdx;
                    return (
                      <div
                        key={optIdx}
                        onClick={() => handleSelectOption(currentQ.id, optIdx)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                          isSelected
                            ? 'border-emerald-600 bg-white ring-2 ring-emerald-500/20 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <span
                            className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                            }`}
                          >
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span
                            className={`text-xs sm:text-sm font-medium ${
                              isSelected ? 'text-slate-900 font-bold' : 'text-slate-700'
                            }`}
                          >
                            {opt}
                          </span>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-600 text-white'
                              : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Navigator Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous Question
              </button>

              {currentQuestionIndex < totalQuestions - 1 ? (
                <button
                  onClick={() => setCurrentQuestionIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  <span>Next Question</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Grading Assessment...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Submit &amp; View Score</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
