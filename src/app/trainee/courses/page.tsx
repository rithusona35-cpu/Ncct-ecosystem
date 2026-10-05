'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import { authApi } from '../../../lib/api';
import {
  EnrolledCourse,
  ContentItem,
  CourseProgress,
  ModuleContentStatus,
  ContentItemWithStatus,
  QuizWithStatus,
  AssessmentResponse
} from '../../../lib/types';
import CourseProgressBar from '../../../components/CourseProgressBar';
import {
  DashboardLayout,
  KPICard,
  Badge,
  ProgressBar,
  EmptyState,
  LoadingSkeleton,
} from '../../../components/ui';
import {
  GraduationCap,
  BookOpen,
  Calendar,
  Building2,
  User as UserIcon,
  Video,
  FileText,
  StickyNote,
  ChevronRight,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Layers,
  Sparkles,
  CheckCircle2,
  Circle,
  HelpCircle,
  Award,
  PlayCircle,
  Clock,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import Link from 'next/link';

export default function TraineeCoursesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<EnrolledCourse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Live Course Progress: keyed by programme_id
  const [courseProgressMap, setCourseProgressMap] = useState<Record<number, CourseProgress>>({});

  // Module dynamic LMS status (quizzes, completed items)
  const [moduleStatusMap, setModuleStatusMap] = useState<Record<number, ModuleContentStatus>>({});

  // Active Content Item preview/player
  const [activeItem, setActiveItem] = useState<{
    item: ContentItem;
    moduleId: number;
    isCompleted: boolean;
  } | null>(null);

  const [isMarkingComplete, setIsMarkingComplete] = useState(false);
  const [markSuccessToast, setMarkSuccessToast] = useState(false);
  const [courseAssessments, setCourseAssessments] = useState<AssessmentResponse[]>([]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Load enrolled courses
      const courseList = await authApi.getMyCourses();
      setCourses(courseList);
      if (courseList.length > 0 && !selectedCourse) {
        setSelectedCourse(courseList[0]);
        loadAssessments(courseList[0].programme_id);
      }

      // 2. Load progress
      await reloadProgress(courseList);
    } catch (err) {
      console.error('Failed to load courses or progress:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAssessments = async (courseId: number) => {
    try {
      const data = await authApi.getCourseAssessments(courseId);
      setCourseAssessments(data);
    } catch (e) {
      console.error('Failed to load course assessments:', e);
    }
  };

  const reloadProgress = async (currentCourses?: EnrolledCourse[]) => {
    try {
      const progressList = await authApi.getCourseProgress('me');
      const pMap: Record<number, CourseProgress> = {};
      progressList.forEach((p) => {
        pMap[p.programme_id] = p;
      });
      setCourseProgressMap(pMap);

      // Load module content status for all modules in selected course
      const activeCourses = currentCourses || courses;
      for (const crs of activeCourses) {
        for (const mod of crs.modules || []) {
          try {
            const mStatus = await authApi.getModuleContent(mod.id);
            setModuleStatusMap((prev) => ({ ...prev, [mod.id]: mStatus }));
          } catch (e) {
            console.error('Failed to load module status for', mod.id, e);
          }
        }
      }
    } catch (err) {
      console.error('Failed to reload progress:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When selected course changes, ensure its module content statuses are fetched
  useEffect(() => {
    if (!selectedCourse) return;
    for (const mod of selectedCourse.modules || []) {
      authApi.getModuleContent(mod.id)
        .then((mStatus) => {
          setModuleStatusMap((prev) => ({ ...prev, [mod.id]: mStatus }));
        })
        .catch(console.error);
    }
  }, [selectedCourse]);

  const handleMarkComplete = async (contentItemId: number, moduleId: number) => {
    setIsMarkingComplete(true);
    try {
      await authApi.markContentComplete(contentItemId, moduleId);
      
      // Update local activeItem state
      if (activeItem && activeItem.item.id === contentItemId) {
        setActiveItem({ ...activeItem, isCompleted: true });
      }

      // Show toast
      setMarkSuccessToast(true);
      setTimeout(() => setMarkSuccessToast(false), 3000);

      // Refresh progress & module status
      await reloadProgress();
    } catch (err) {
      console.error('Failed to mark complete:', err);
    } finally {
      setIsMarkingComplete(false);
    }
  };

  const activeProgress = selectedCourse ? courseProgressMap[selectedCourse.programme_id] : undefined;
  const overallPct = activeProgress?.completion_percentage ?? 100;

  return (
    <ProtectedRoute allowedRoles={['TRAINEE', 'ADMIN']}>
      <DashboardLayout
        role="trainee"
        activeRoute="/trainee/courses"
        title="My Enrolled Courses & LMS"
        subtitle="Access lecture videos, study materials, complete activities, and track dynamic LMS progress."
        badge={<Badge status="active" label="LMS Portal" size="sm" dot />}
        breadcrumbs={[
          { label: 'NCCT Portal', href: '/' },
          { label: 'Trainee Hub', href: '/trainee/dashboard' },
          { label: 'Courses & LMS' },
        ]}
        headerActions={
          <button
            onClick={() => loadData()}
            className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs cursor-pointer"
          >
            Refresh Progress
          </button>
        }
      >
        <div className="space-y-6">
          {/* Top KPI Cards */}
          {isLoading ? (
            <LoadingSkeleton variant="kpi" count={4} />
          ) : courses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Active Enrolled Programmes"
                value={`${courses.length} Course`}
                icon={<BookOpen className="w-5 h-5 text-primary" />}
                variant="primary"
                trend="Batch-2025-01"
                description="RCTI Chennai Campus"
              />
              <KPICard
                title="LMS Progress"
                value={`${overallPct}%`}
                icon={<CheckCircle2 className="w-5 h-5 text-secondary" />}
                variant="secondary"
                trend={{
                  value: '3/3 Modules',
                  isPositive: true,
                  label: 'Completed',
                }}
                description="All content items completed"
              />
              <KPICard
                title="Curriculum Items"
                value="6 Items"
                icon={<Layers className="w-5 h-5 text-primary" />}
                variant="primary"
                trend="3 Videos • 3 PDFs"
                description="Double-entry & ERP Manuals"
              />
              <KPICard
                title="Certification Status"
                value="Eligible"
                icon={<ShieldCheck className="w-5 h-5 text-secondary" />}
                variant="secondary"
                trend={{
                  value: 'Score 68% >= 60%',
                  isPositive: true,
                  label: 'Passed',
                }}
                description="Ready for digital certificate"
              />
            </div>
          ) : null}

          {isLoading ? (
            <LoadingSkeleton variant="card" count={2} />
          ) : courses.length === 0 ? (
            <EmptyState
              title="No Enrolled Courses Found"
              message="You are currently not enrolled in any training batch. Share your unique Trainee ID with your NCCT instructor or faculty to get added to a course batch."
              actionLabel="Return to Dashboard"
              actionHref="/trainee/dashboard"
              icon={<BookOpen className="w-7 h-7 text-primary" />}
            />
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Course Cards with Progress Bars */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Enrolled Programmes ({courses.length})
              </h2>

              <div className="space-y-4">
                {courses.map((course) => {
                  const isSelected = selectedCourse?.programme_id === course.programme_id;
                  const progress = courseProgressMap[course.programme_id];
                  const percentage = progress?.completion_percentage || 0;
                  const completedItems = progress?.completed_items || 0;
                  const totalItems = progress?.total_items || 0;

                  return (
                    <div
                      key={`${course.programme_id}-${course.batch_id}`}
                      onClick={() => {
                        setSelectedCourse(course);
                        loadAssessments(course.programme_id);
                      }}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-3.5 ${
                        isSelected
                          ? 'border-emerald-600 bg-white shadow-md ring-2 ring-emerald-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                          {course.batch_name}
                        </span>
                        <ChevronRight
                          className={`w-4 h-4 transition-transform ${
                            isSelected ? 'text-emerald-600 translate-x-0.5' : 'text-slate-400'
                          }`}
                        />
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{course.title}</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                          {course.description || 'NCCT curriculum training programme.'}
                        </p>
                      </div>

                      {/* Course Progress Bar Component */}
                      <div className="pt-2 border-t border-slate-100">
                        <CourseProgressBar
                          percentage={percentage}
                          completedItems={completedItems}
                          totalItems={totalItems}
                          size="md"
                        />
                      </div>

                      <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="flex items-center gap-1 font-medium truncate max-w-[60%]">
                          <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{course.institution_name}</span>
                        </span>
                        <span className="font-mono font-semibold text-slate-700">
                          {course.modules?.length || 0} Modules
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Course Curriculum & Player Launcher */}
            <div className="lg:col-span-2 space-y-6">
              {selectedCourse && (
                <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
                  {/* Selected Course Header */}
                  <div className="pb-6 border-b border-slate-100 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800">
                          Batch: {selectedCourse.batch_name}
                        </span>
                        {selectedCourse.trainer_name && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 flex items-center gap-1">
                            <UserIcon className="w-3 h-3 text-slate-500" />
                            Trainer: {selectedCourse.trainer_name}
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/trainee/courses/${selectedCourse.programme_id}/player`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs"
                      >
                        <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Open LMS Player</span>
                      </Link>
                    </div>

                    <div>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                        {selectedCourse.title}
                      </h2>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {selectedCourse.description}
                      </p>
                    </div>

                    {/* Overall Progress Widget */}
                    {courseProgressMap[selectedCourse.programme_id] && (
                      <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-emerald-600" />
                            Overall Course Progress
                          </span>
                          <span className="font-mono font-extrabold text-emerald-800 text-sm">
                            {courseProgressMap[selectedCourse.programme_id].completion_percentage}%
                          </span>
                        </div>
                        <CourseProgressBar
                          percentage={courseProgressMap[selectedCourse.programme_id].completion_percentage}
                          completedItems={courseProgressMap[selectedCourse.programme_id].completed_items}
                          totalItems={courseProgressMap[selectedCourse.programme_id].total_items}
                          size="md"
                          showDetails={false}
                        />
                      </div>
                    )}
                  </div>

                  {/* Skill-Linked Assessments Section */}
                  {courseAssessments.length > 0 && (
                    <div className="space-y-3 bg-gradient-to-br from-indigo-50/60 to-purple-50/40 p-5 rounded-2xl border border-indigo-100 shadow-xs" id="course-assessments-section">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded-lg bg-indigo-600 text-white">
                            <Award className="w-4 h-4" />
                          </span>
                          <h3 className="text-sm font-bold text-slate-900">
                            Skill-Linked Competency Assessments ({courseAssessments.length})
                          </h3>
                        </div>
                        <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-100/80 px-2.5 py-0.5 rounded-full">
                          Produces Skill-Level Breakdown
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-3 pt-1">
                        {courseAssessments.map((ass) => (
                          <div
                            key={ass.id}
                            className="bg-white p-4 rounded-xl border border-indigo-100 shadow-2xs hover:border-indigo-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 text-sm">{ass.title}</span>
                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                                  {ass.type}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span>{ass.questions?.length || 0} Questions</span>
                                <span>•</span>
                                <span>Multi-Skill Tagged (Accounting, ERP, GST)</span>
                              </div>
                            </div>

                            <Link
                              href={`/trainee/assessment/${ass.id}`}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs shrink-0"
                              id={`btn-take-assessment-${ass.id}`}
                            >
                              <span>Take Assessment</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Modules & Content List */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      Curriculum Modules, Resources &amp; Quizzes
                    </h3>

                    {selectedCourse.modules?.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 italic bg-slate-50 rounded-2xl">
                        No modules published for this course yet.
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {selectedCourse.modules.map((mod) => {
                          const mStatus = moduleStatusMap[mod.id];
                          const quizzes = mStatus?.quizzes || [];
                          const contentItems = mStatus?.content_items || mod.content_items?.map((c) => ({
                            ...c,
                            status: 'not_started' as const,
                          })) || [];

                          return (
                            <div
                              key={mod.id}
                              className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4"
                            >
                              {/* Module Title Bar */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-mono text-xs font-bold flex items-center justify-center">
                                    {mod.order}
                                  </span>
                                  <h4 className="text-sm font-bold text-slate-900">{mod.title}</h4>
                                </div>
                                <span className="text-[11px] font-mono text-slate-500">
                                  {contentItems.length} resource(s) • {quizzes.length} quiz(zes)
                                </span>
                              </div>

                              {/* Content Items within Module */}
                              {contentItems.length > 0 && (
                                <div className="space-y-2">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Learning Materials
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {contentItems.map((item) => {
                                      const isCompleted = item.status === 'completed';
                                      return (
                                        <div
                                          key={item.id}
                                          onClick={() =>
                                            setActiveItem({
                                              item,
                                              moduleId: mod.id,
                                              isCompleted,
                                            })
                                          }
                                          className={`p-3.5 rounded-xl bg-white border transition-all cursor-pointer flex items-start gap-3 group ${
                                            isCompleted
                                              ? 'border-emerald-200 bg-emerald-50/20 hover:border-emerald-400'
                                              : 'border-slate-200 hover:border-emerald-500 hover:shadow-xs'
                                          }`}
                                        >
                                          <div className="p-2 rounded-lg bg-slate-50 group-hover:scale-105 transition-transform shrink-0">
                                            {item.type === 'video' && <Video className="w-4 h-4 text-red-500" />}
                                            {item.type === 'pdf' && <FileText className="w-4 h-4 text-blue-500" />}
                                            {item.type === 'note' && <StickyNote className="w-4 h-4 text-emerald-500" />}
                                          </div>

                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-1">
                                              <span className="uppercase text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                                {item.type}
                                              </span>
                                              {isCompleted ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                  Completed
                                                </span>
                                              ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                                  <Circle className="w-2.5 h-2.5" />
                                                  Not Started
                                                </span>
                                              )}
                                            </div>

                                            <h5 className="text-xs font-bold text-slate-900 truncate mt-1 group-hover:text-emerald-600 transition-colors">
                                              {item.title}
                                            </h5>

                                            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                                              <span>Launch Resource</span>
                                              <ExternalLink className="w-2.5 h-2.5" />
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Quizzes within Module */}
                              {quizzes.length > 0 && (
                                <div className="space-y-2 pt-1 border-t border-slate-200/60">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Module Knowledge Assessments
                                  </span>
                                  <div className="space-y-2">
                                    {quizzes.map((qz) => (
                                      <div
                                        key={qz.id}
                                        className="p-3.5 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                                      >
                                        <div className="flex items-center gap-3">
                                          <div
                                            className={`p-2 rounded-lg shrink-0 ${
                                              qz.is_completed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                            }`}
                                          >
                                            <Award className="w-4 h-4" />
                                          </div>
                                          <div>
                                            <h5 className="text-xs font-bold text-slate-900">{qz.title}</h5>
                                            <p className="text-[10px] text-slate-500 font-mono">
                                              {qz.total_questions} Questions • {qz.total_marks} Marks
                                              {qz.best_score !== null && qz.best_score !== undefined && (
                                                <span className="text-emerald-700 font-bold ml-1.5">
                                                  (Best Score: {qz.best_score}/{qz.total_marks} - {qz.best_percentage}%)
                                                </span>
                                              )}
                                            </p>
                                          </div>
                                        </div>

                                        <Link
                                          href={`/trainee/quiz/${qz.id}`}
                                          className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all self-start sm:self-auto cursor-pointer ${
                                            qz.is_completed
                                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                          }`}
                                        >
                                          <HelpCircle className="w-3.5 h-3.5" />
                                          <span>{qz.is_completed ? 'Retake Quiz' : 'Take Quiz'}</span>
                                        </Link>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Course Content Player Modal */}
        {activeItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="uppercase text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {activeItem.item.type}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 truncate">{activeItem.item.title}</h3>
                </div>
                <button
                  onClick={() => setActiveItem(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Toast Notification */}
              {markSuccessToast && (
                <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Activity completed! Your course completion percentage has been updated.</span>
                </div>
              )}

              {/* Player Body */}
              {activeItem.item.type === 'video' ? (
                <div className="space-y-4">
                  <div className="aspect-video w-full rounded-2xl bg-slate-900 flex items-center justify-center text-white overflow-hidden shadow-inner">
                    {activeItem.item.url_or_file_path.includes('youtube.com') ||
                    activeItem.item.url_or_file_path.includes('youtu.be') ? (
                      <iframe
                        src={activeItem.item.url_or_file_path.replace('watch?v=', 'embed/')}
                        className="w-full h-full"
                        allowFullScreen
                        title={activeItem.item.title}
                      />
                    ) : (
                      <div className="text-center p-6 space-y-2">
                        <Video className="w-12 h-12 text-red-500 mx-auto" />
                        <p className="text-xs text-slate-300">Video Player Resource</p>
                        <p className="text-xs font-mono text-slate-400 break-all">{activeItem.item.url_or_file_path}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : activeItem.item.type === 'pdf' ? (
                <div className="space-y-4">
                  <div className="p-8 rounded-2xl bg-blue-50 border border-blue-200 text-center space-y-3">
                    <FileText className="w-12 h-12 text-blue-600 mx-auto" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{activeItem.item.title}</h4>
                      <p className="text-xs text-slate-500 mt-1">PDF Study Guide &amp; Course Documentation</p>
                    </div>
                    <div className="font-mono text-xs text-slate-600 break-all bg-white p-2 rounded-lg border border-blue-100 max-w-md mx-auto">
                      {activeItem.item.url_or_file_path}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <a
                      href={
                        activeItem.item.url_or_file_path.startsWith('http')
                          ? activeItem.item.url_or_file_path
                          : `http://127.0.0.1:8000${activeItem.item.url_or_file_path}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Open PDF in New Window</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                    <StickyNote className="w-4 h-4 text-emerald-600" />
                    <span>Instructor Lecture Notes</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-sans">
                    {activeItem.item.url_or_file_path}
                  </p>
                </div>
              )}

              {/* Player Footer & Mark as Complete Button */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div>
                  {activeItem.isCompleted ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-xl">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Activity Completed</span>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Status: In Progress</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    disabled={isMarkingComplete || activeItem.isCompleted}
                    onClick={() => handleMarkComplete(activeItem.item.id, activeItem.moduleId)}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
                      activeItem.isCompleted
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-default'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                    }`}
                  >
                    {isMarkingComplete ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : activeItem.isCompleted ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>Marked as Complete</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Mark as Complete</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
