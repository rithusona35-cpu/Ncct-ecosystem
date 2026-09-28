'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { authApi } from '@/lib/api';
import { TrainingProgramme, Skill, AssessmentQuestionCreate, AssessmentResponse } from '@/lib/types';
import {
  Award,
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Layers,
  Check,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import DashboardLayout from '@/components/ui/DashboardLayout';

interface QuestionFormItem {
  skill_id: number;
  text: string;
  options: string[];
  correct_option: number;
  marks: number;
}

export default function CreateAssessmentPage() {
  const [programmes, setProgrammes] = useState<TrainingProgramme[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [assessmentType, setAssessmentType] = useState<'quiz' | 'practical' | 'project'>('quiz');
  const [questions, setQuestions] = useState<QuestionFormItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdAssessment, setCreatedAssessment] = useState<AssessmentResponse | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    const initData = async () => {
      try {
        const [progs, sks] = await Promise.all([
          authApi.getProgrammes(),
          authApi.getSkills(),
        ]);
        setProgrammes(progs);
        setSkills(sks);

        if (progs.length > 0) {
          setSelectedCourseId(progs[0].id);
        }

        // Initialize with default 3-skill NCCT questions template
        if (sks.length >= 3) {
          loadThreeSkillTemplate(sks, progs[0]?.id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to initialize assessment editor');
      } finally {
        setIsLoading(false);
      }
    };

    initData();
  }, []);

  const loadThreeSkillTemplate = (availableSkills: Skill[] = skills, courseId?: number) => {
    const accSkill = availableSkills.find(s => s.name.toLowerCase().includes('account')) || availableSkills[0];
    const erpSkill = availableSkills.find(s => s.name.toLowerCase().includes('erp')) || availableSkills[1];
    const gstSkill = availableSkills.find(s => s.name.toLowerCase().includes('gst')) || availableSkills[2];

    setTitle('NCCT Cooperative Competency Assessment (Accounting, ERP & GST)');
    setAssessmentType('quiz');
    if (courseId) setSelectedCourseId(courseId);

    setQuestions([
      {
        skill_id: accSkill?.id || 1,
        text: 'Under cooperative accounting standards, what is the mandatory percentage of net profit to be transferred to the Statutory Reserve Fund?',
        options: [
          'At least 25% of annual net profit',
          'Exactly 10% of gross surplus',
          'At least 50% of retained earnings',
          'Discretionary as per management board'
        ],
        correct_option: 0,
        marks: 10,
      },
      {
        skill_id: erpSkill?.id || 2,
        text: 'In an integrated Cooperative ERP system, what module synchronizes member share capital, credit limits, and PACS ledger entries?',
        options: [
          'Member Ledger & Share Capital Integration Subsystem',
          'Third-party Payroll Portal',
          'Isolated Spreadsheet Bridge',
          'External Webhook Gateway'
        ],
        correct_option: 0,
        marks: 10,
      },
      {
        skill_id: gstSkill?.id || 3,
        text: 'Which GST return is filed by registered cooperative societies to furnish monthly outward supplies of goods and services?',
        options: [
          'GSTR-1 (Outward Supplies Statement)',
          'GSTR-3B (Summary Return only)',
          'GSTR-9C (Reconciliation statement only)',
          'CMP-08 (Composition levy)'
        ],
        correct_option: 0,
        marks: 10,
      }
    ]);
  };

  const handleAddQuestion = () => {
    const defaultSkillId = skills.length > 0 ? skills[0].id : 1;
    setQuestions([
      ...questions,
      {
        skill_id: defaultSkillId,
        text: '',
        options: ['', '', '', ''],
        correct_option: 0,
        marks: 10,
      }
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) {
      setError('An assessment must have at least one question.');
      return;
    }
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleUpdateQuestion = (index: number, field: keyof QuestionFormItem, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const handleUpdateOption = (qIndex: number, optIndex: number, text: string) => {
    const updated = [...questions];
    const newOptions = [...updated[qIndex].options];
    newOptions[optIndex] = text;
    updated[qIndex].options = newOptions;
    setQuestions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) {
      setError('Please select a course for this assessment.');
      return;
    }
    if (!title.trim()) {
      setError('Please enter an assessment title.');
      return;
    }
    if (questions.length === 0) {
      setError('Please add at least one question.');
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        setError(`Question #${i + 1} text is empty.`);
        return;
      }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].trim()) {
          setError(`Question #${i + 1} has an empty option (${String.fromCharCode(65 + j)}).`);
          return;
        }
      }
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        course_id: Number(selectedCourseId),
        title,
        type: assessmentType,
        questions: questions.map(q => ({
          skill_id: Number(q.skill_id),
          text: q.text,
          options: q.options,
          correct_option: Number(q.correct_option),
          marks: Number(q.marks),
        })),
      };

      const res = await authApi.createAssessment(payload);
      setCreatedAssessment(res);
    } catch (err: any) {
      setError(err.message || 'Failed to create assessment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyAssessmentLink = (id: number) => {
    const url = `${window.location.origin}/trainee/assessment/${id}`;
    navigator.clipboard.writeText(url);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const distinctSkillsInForm = Array.from(new Set(questions.map(q => q.skill_id)))
    .map(sid => skills.find(s => s.id === sid)?.name)
    .filter(Boolean);

  const totalPossibleMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);

  return (
    <ProtectedRoute allowedRoles={['TRAINER', 'ADMIN']}>
      <DashboardLayout
        role="trainer"
        title="Create Skill Assessment"
        subtitle="Author question banks, tag competencies to skill taxonomy, and configure certification criteria"
      >
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                <Link href="/trainer/dashboard" className="hover:text-indigo-600 transition-colors">
                  Trainer Dashboard
                </Link>
                <ChevronRight className="w-4 h-4 text-slate-400" />
                <span className="text-slate-800 font-medium">Create Assessment</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-3">
                <span className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
                  <Award className="w-6 h-6" />
                </span>
                Skill-Linked Assessment Creator
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Design comprehensive assessments tagged with core competencies to evaluate trainee skill mastery
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadThreeSkillTemplate()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 font-semibold text-xs rounded-xl border border-indigo-200 hover:from-indigo-100 hover:to-blue-100 transition shadow-xs"
              id="btn-load-3skill-template"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Load 3-Skill Template (Accounting, ERP, GST)
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Banner */}
          {createdAssessment && (
            <div className="mb-8 p-6 bg-emerald-50/90 border border-emerald-200 rounded-2xl shadow-sm text-emerald-900 space-y-4" id="assessment-created-success-banner">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-600 text-white">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-emerald-950">
                      Assessment Created Successfully!
                    </h3>
                    <p className="text-xs text-emerald-700">
                      Assessment ID: <span className="font-mono font-bold">#{createdAssessment.id}</span> • Course: {createdAssessment.course_title}
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-emerald-200/60 text-emerald-800 text-xs font-bold rounded-full uppercase tracking-wider">
                  {createdAssessment.type}
                </span>
              </div>

              <div className="bg-white/80 p-4 rounded-xl border border-emerald-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm">
                  <span className="font-semibold text-slate-700">Trainee Access Link: </span>
                  <code className="bg-slate-100 text-slate-800 px-2 py-1 rounded text-xs">
                    /trainee/assessment/{createdAssessment.id}
                  </code>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyAssessmentLink(createdAssessment.id)}
                    className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 rounded-lg text-xs font-semibold hover:bg-emerald-50 transition flex items-center gap-1.5"
                  >
                    {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : null}
                    {copySuccess ? 'Copied URL!' : 'Copy Link'}
                  </button>

                  <Link
                    href={`/trainee/assessment/${createdAssessment.id}`}
                    target="_blank"
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-xs"
                    id="btn-take-as-trainee"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open as Trainee
                  </Link>
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="p-12 text-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
              Loading programmes and skills...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Card 1: Assessment Meta */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  Assessment Details
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Course select */}
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Target Training Programme / Course *
                    </label>
                    <select
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value ? Number(e.target.value) : '')}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      id="select-assessment-course"
                    >
                      {programmes.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title} ({p.institution_name || 'NCCT'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Assessment Type */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Assessment Type
                    </label>
                    <select
                      value={assessmentType}
                      onChange={(e: any) => setAssessmentType(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      id="select-assessment-type"
                    >
                      <option value="quiz">Objective Quiz (MCQ)</option>
                      <option value="practical">Practical Evaluation</option>
                      <option value="project">Project Defense</option>
                    </select>
                  </div>

                  {/* Title */}
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Assessment Title *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., NCCT Cooperative Financial & ERP Readiness Assessment"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      id="input-assessment-title"
                    />
                  </div>
                </div>

                {/* Skill summary badge list */}
                <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-500 font-medium">Tagged Skills ({distinctSkillsInForm.length}):</span>
                  {distinctSkillsInForm.map((sname, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full font-semibold"
                    >
                      {sname}
                    </span>
                  ))}
                  <span className="ml-auto text-slate-500 font-medium">
                    Total Marks: <strong className="text-slate-800 font-bold">{totalPossibleMarks} pts</strong>
                  </span>
                </div>
              </div>

              {/* Card 2: Questions List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                    Questions &amp; Skill Tagging ({questions.length})
                  </h2>

                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition shadow-sm"
                    id="btn-add-question"
                  >
                    <Plus className="w-4 h-4" />
                    Add Question
                  </button>
                </div>

                {questions.map((q, qIdx) => (
                  <div
                    key={qIdx}
                    className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 relative group"
                    id={`question-form-card-${qIdx}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-extrabold text-sm flex items-center justify-center">
                          {qIdx + 1}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Question #{qIdx + 1}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Skill Dropdown */}
                        <div className="flex items-center gap-1.5">
                          <label className="text-xs font-bold text-slate-600">Skill:</label>
                          <select
                            value={q.skill_id}
                            onChange={(e) => handleUpdateQuestion(qIdx, 'skill_id', Number(e.target.value))}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500"
                            id={`select-question-skill-${qIdx}`}
                          >
                            {skills.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.category})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Marks */}
                        <div className="flex items-center gap-1.5">
                          <label className="text-xs font-bold text-slate-600">Marks:</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={q.marks}
                            onChange={(e) => handleUpdateQuestion(qIdx, 'marks', Number(e.target.value))}
                            className="w-16 px-2 py-1 rounded-lg border border-slate-300 text-xs font-bold text-center text-slate-800"
                            id={`input-question-marks-${qIdx}`}
                          />
                        </div>

                        {/* Delete button */}
                        {questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(qIdx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Remove Question"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Question Text */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Question Text</label>
                      <textarea
                        rows={2}
                        value={q.text}
                        onChange={(e) => handleUpdateQuestion(qIdx, 'text', e.target.value)}
                        placeholder="Enter the question prompt..."
                        required
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500"
                        id={`textarea-question-text-${qIdx}`}
                      />
                    </div>

                    {/* Options (A, B, C, D) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700">Answer Options &amp; Correct Answer Key</label>
                        <span className="text-[11px] text-slate-500">Radio button selects the correct option</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {q.options.map((opt, optIdx) => (
                          <div
                            key={optIdx}
                            className={`flex items-center gap-2 p-2 rounded-xl border transition ${
                              q.correct_option === optIdx
                                ? 'border-emerald-300 bg-emerald-50/50'
                                : 'border-slate-200 bg-slate-50/50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`correct-opt-${qIdx}`}
                              checked={q.correct_option === optIdx}
                              onChange={() => handleUpdateQuestion(qIdx, 'correct_option', optIdx)}
                              className="text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                              title="Set as correct answer"
                              id={`radio-correct-${qIdx}-${optIdx}`}
                            />
                            <span className="text-xs font-bold text-slate-500 w-4">
                              {String.fromCharCode(65 + optIdx)}:
                            </span>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => handleUpdateOption(qIdx, optIdx, e.target.value)}
                              placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                              required
                              className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              id={`input-opt-${qIdx}-${optIdx}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-between pt-4">
                <Link
                  href="/trainer/dashboard"
                  className="px-5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-200 disabled:opacity-50 flex items-center gap-2"
                  id="btn-submit-create-assessment"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating Assessment...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Publish Skill-Linked Assessment
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
