'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '../../../../../components/ProtectedRoute';
import { authApi } from '../../../../../lib/api';
import {
  EnrolledCourse,
  ContentItem,
  CourseProgress,
  ModuleContentStatus,
  ContentItemWithStatus
} from '../../../../../lib/types';
import CourseProgressBar from '../../../../../components/CourseProgressBar';
import {
  ArrowLeft,
  Video,
  FileText,
  StickyNote,
  CheckCircle2,
  Circle,
  PlayCircle,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Award,
  Loader2,
  Sparkles,
  Layers,
  BookOpen
} from 'lucide-react';
import Link from 'next/link';

export default function CoursePlayerPage() {
  const params = useParams();
  const router = useRouter();
  const programmeId = Number(params.id);

  const [course, setCourse] = useState<EnrolledCourse | null>(null);
  const [courseProgress, setCourseProgress] = useState<CourseProgress | null>(null);
  const [moduleStatuses, setModuleStatuses] = useState<Record<number, ModuleContentStatus>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Currently playing item
  const [activeItem, setActiveItem] = useState<{
    item: ContentItem;
    moduleId: number;
    moduleTitle: string;
    isCompleted: boolean;
  } | null>(null);

  const [isMarkingComplete, setIsMarkingComplete] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch courses to find target programme
      const courses = await authApi.getMyCourses();
      const currentCourse = courses.find((c) => c.programme_id === programmeId) || courses[0];
      setCourse(currentCourse);

      // 2. Fetch progress
      const progressList = await authApi.getCourseProgress('me');
      const p = progressList.find((item) => item.programme_id === programmeId);
      if (p) setCourseProgress(p);

      // 3. Fetch module content statuses
      if (currentCourse && currentCourse.modules) {
        let firstPlayableItem: any = null;
        const statusMap: Record<number, ModuleContentStatus> = {};

        for (const mod of currentCourse.modules) {
          try {
            const mStatus = await authApi.getModuleContent(mod.id);
            statusMap[mod.id] = mStatus;

            if (!firstPlayableItem && mStatus.content_items.length > 0) {
              const firstItem = mStatus.content_items[0];
              firstPlayableItem = {
                item: firstItem,
                moduleId: mod.id,
                moduleTitle: mod.title,
                isCompleted: firstItem.status === 'completed',
              };
            }
          } catch (e) {
            console.error('Error fetching module status:', e);
          }
        }
        setModuleStatuses(statusMap);
        if (firstPlayableItem && !activeItem) {
          setActiveItem(firstPlayableItem);
        }
      }
    } catch (err) {
      console.error('Failed to load course player data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (programmeId) {
      loadData();
    }
  }, [programmeId]);

  const handleMarkComplete = async () => {
    if (!activeItem) return;
    setIsMarkingComplete(true);
    try {
      await authApi.markContentComplete(activeItem.item.id, activeItem.moduleId);
      setActiveItem({ ...activeItem, isCompleted: true });

      setToastMessage('Activity marked as complete! Your progress has updated.');
      setTimeout(() => setToastMessage(null), 3500);

      // Refresh progress & module status
      const progressList = await authApi.getCourseProgress('me');
      const p = progressList.find((item) => item.programme_id === programmeId);
      if (p) setCourseProgress(p);

      const mStatus = await authApi.getModuleContent(activeItem.moduleId);
      setModuleStatuses((prev) => ({ ...prev, [activeItem.moduleId]: mStatus }));
    } catch (err) {
      console.error('Failed to mark item complete:', err);
    } finally {
      setIsMarkingComplete(false);
    }
  };

  // Build flattened list of all content items for next/prev navigation
  const allItems: { item: ContentItem; moduleId: number; moduleTitle: string }[] = [];
  if (course?.modules) {
    for (const mod of course.modules) {
      const items = moduleStatuses[mod.id]?.content_items || mod.content_items || [];
      for (const it of items) {
        allItems.push({ item: it, moduleId: mod.id, moduleTitle: mod.title });
      }
    }
  }

  const currentIndex = allItems.findIndex((it) => it.item.id === activeItem?.item.id);
  const prevItem = currentIndex > 0 ? allItems[currentIndex - 1] : null;
  const nextItem = currentIndex < allItems.length - 1 ? allItems[currentIndex + 1] : null;

  const navigateTo = (target: { item: ContentItem; moduleId: number; moduleTitle: string }) => {
    const isComp =
      moduleStatuses[target.moduleId]?.content_items.find((c) => c.id === target.item.id)?.status ===
      'completed';
    setActiveItem({
      item: target.item,
      moduleId: target.moduleId,
      moduleTitle: target.moduleTitle,
      isCompleted: isComp,
    });
  };

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={['TRAINEE', 'ADMIN']}>
        <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
          <p className="text-sm font-semibold text-slate-600">Loading LMS Course Player...</p>
        </div>
      </ProtectedRoute>
    );
  }

  if (!course) {
    return (
      <ProtectedRoute allowedRoles={['TRAINEE', 'ADMIN']}>
        <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4">
          <BookOpen className="w-12 h-12 text-slate-400 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Course Not Found</h2>
          <Link
            href="/trainee/courses"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Courses
          </Link>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['TRAINEE', 'ADMIN']}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Header & Breadcrumbs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="space-y-1">
            <Link
              href="/trainee/courses"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Courses List
            </Link>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {course.title}
            </h1>
            <p className="text-xs text-slate-500">
              Batch: <span className="font-semibold text-slate-700">{course.batch_name}</span> •{' '}
              {course.institution_name}
            </p>
          </div>

          {/* Overall Course Progress Widget */}
          {courseProgress && (
            <div className="w-full sm:w-72 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Course Completion
                </span>
                <span className="font-mono font-extrabold text-emerald-600">
                  {courseProgress.completion_percentage}%
                </span>
              </div>
              <CourseProgressBar
                percentage={courseProgress.completion_percentage}
                completedItems={courseProgress.completed_items}
                totalItems={courseProgress.total_items}
                size="sm"
                showDetails={false}
              />
            </div>
          )}
        </div>

        {/* Player Layout: Left Video/Document Viewer, Right Curriculum Syllabus */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Media Player Column */}
          <div className="lg:col-span-2 space-y-5">
            {toastMessage && (
              <div className="p-3.5 bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-2xl flex items-center gap-2 animate-fadeIn shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{toastMessage}</span>
              </div>
            )}

            {activeItem ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
                {/* Active Item Title Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                      {activeItem.moduleTitle}
                    </span>
                    <div className="flex items-center gap-2.5">
                      <span className="uppercase text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        {activeItem.item.type}
                      </span>
                      <h2 className="text-lg font-bold text-slate-900">{activeItem.item.title}</h2>
                    </div>
                  </div>

                  <div>
                    {activeItem.isCompleted ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-xl">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Completed</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
                        <Circle className="w-3 h-3 text-slate-400" />
                        <span>Not Completed</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Media Renderer */}
                {activeItem.item.type === 'video' ? (
                  <div className="space-y-4">
                    <div className="aspect-video w-full rounded-2xl bg-slate-950 flex items-center justify-center text-white overflow-hidden shadow-inner">
                      {activeItem.item.url_or_file_path.includes('youtube.com') ||
                      activeItem.item.url_or_file_path.includes('youtu.be') ? (
                        <iframe
                          src={activeItem.item.url_or_file_path.replace('watch?v=', 'embed/')}
                          className="w-full h-full"
                          allowFullScreen
                          title={activeItem.item.title}
                        />
                      ) : (
                        <div className="text-center p-8 space-y-2">
                          <Video className="w-14 h-14 text-red-500 mx-auto" />
                          <p className="text-sm font-semibold text-slate-200">Video Player Component</p>
                          <p className="text-xs font-mono text-slate-400 break-all">{activeItem.item.url_or_file_path}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : activeItem.item.type === 'pdf' ? (
                  <div className="space-y-4">
                    <div className="p-8 rounded-2xl bg-blue-50/60 border border-blue-200 text-center space-y-4">
                      <FileText className="w-14 h-14 text-blue-600 mx-auto" />
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{activeItem.item.title}</h3>
                        <p className="text-xs text-slate-500 mt-1">Official NCCT Courseware &amp; Documentation</p>
                      </div>
                      <div className="font-mono text-xs text-slate-600 break-all bg-white p-3 rounded-xl border border-blue-100 max-w-lg mx-auto">
                        {activeItem.item.url_or_file_path}
                      </div>
                      <div>
                        <a
                          href={
                            activeItem.item.url_or_file_path.startsWith('http')
                              ? activeItem.item.url_or_file_path
                              : `http://127.0.0.1:8000${activeItem.item.url_or_file_path}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
                        >
                          <FileText className="w-4 h-4" />
                          <span>View / Download Full PDF</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                      <StickyNote className="w-4 h-4 text-emerald-600" />
                      <span>Instructor Lesson Notes</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {activeItem.item.url_or_file_path}
                    </p>
                  </div>
                )}

                {/* Bottom Action Bar: Mark Complete + Prev/Next Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100">
                  <button
                    disabled={isMarkingComplete || activeItem.isCompleted}
                    onClick={handleMarkComplete}
                    className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
                      activeItem.isCompleted
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-default'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                    }`}
                  >
                    {isMarkingComplete ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Updating Progress...</span>
                      </>
                    ) : activeItem.isCompleted ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Activity Completed</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Mark as Complete</span>
                      </>
                    )}
                  </button>

                  {/* Navigation Buttons */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      disabled={!prevItem}
                      onClick={() => prevItem && navigateTo(prevItem)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Previous</span>
                    </button>

                    <button
                      disabled={!nextItem}
                      onClick={() => nextItem && navigateTo(nextItem)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
                <PlayCircle className="w-12 h-12 text-slate-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">Select an item from the syllabus</h3>
                <p className="text-xs text-slate-500">
                  Choose a video lecture, study PDF, or quiz from the curriculum on the right to start learning.
                </p>
              </div>
            )}
          </div>

          {/* Right Curriculum Syllabus Column */}
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  Course Syllabus
                </h3>
                <span className="text-[11px] font-mono font-semibold text-slate-500">
                  {course.modules?.length || 0} Modules
                </span>
              </div>

              {/* Modules Accordion */}
              <div className="space-y-4">
                {course.modules?.map((mod) => {
                  const mStatus = moduleStatuses[mod.id];
                  const items = mStatus?.content_items || mod.content_items?.map((c) => ({
                    ...c,
                    status: 'not_started' as const,
                  })) || [];
                  const quizzes = mStatus?.quizzes || [];

                  return (
                    <div key={mod.id} className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                        <span className="w-5 h-5 rounded-md bg-emerald-600 text-white text-[10px] font-mono flex items-center justify-center">
                          {mod.order}
                        </span>
                        <span className="line-clamp-1">{mod.title}</span>
                      </div>

                      {/* Items */}
                      <div className="space-y-1.5 pl-3 border-l-2 border-slate-100">
                        {items.map((item) => {
                          const isCurrent = activeItem?.item.id === item.id;
                          const isCompleted = item.status === 'completed';

                          return (
                            <div
                              key={item.id}
                              onClick={() =>
                                setActiveItem({
                                  item,
                                  moduleId: mod.id,
                                  moduleTitle: mod.title,
                                  isCompleted,
                                })
                              }
                              className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                isCurrent
                                  ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-2xs'
                                  : 'border-slate-100 bg-slate-50/50 hover:bg-slate-100/70 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {item.type === 'video' && <Video className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                                {item.type === 'pdf' && <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                                {item.type === 'note' && <StickyNote className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                                <span className="truncate">{item.title}</span>
                              </div>

                              <div>
                                {isCompleted ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                ) : (
                                  <Circle className="w-3 h-3 text-slate-300 shrink-0" />
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Quizzes under Module */}
                        {quizzes.map((qz) => (
                          <div
                            key={qz.id}
                            className="p-2.5 rounded-xl border border-amber-200/80 bg-amber-50/40 text-xs flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Award className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <div className="min-w-0">
                                <span className="font-bold text-amber-950 truncate block">
                                  {qz.title}
                                </span>
                                <span className="text-[10px] text-amber-700 font-mono">
                                  {qz.total_questions} Questions • {qz.total_marks} Marks
                                </span>
                              </div>
                            </div>

                            <Link
                              href={`/trainee/quiz/${qz.id}`}
                              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold shrink-0 transition-colors"
                            >
                              {qz.is_completed ? 'Retake' : 'Take Quiz'}
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
