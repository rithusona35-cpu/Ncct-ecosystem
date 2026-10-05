'use client';

import React, { useEffect, useState, use } from 'react';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import { useAuth } from '../../../../context/AuthContext';
import { authApi } from '../../../../lib/api';
import {
  TrainingProgramme,
  Module,
  ContentItem,
  Batch,
  BatchTrainee
} from '../../../../lib/types';
import {
  ArrowLeft,
  BookOpen,
  Plus,
  Video,
  FileText,
  StickyNote,
  Users,
  Search,
  Upload,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Building2,
  Trash2,
  UserPlus,
  UserCheck,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import DashboardLayout from '../../../../components/ui/DashboardLayout';

export default function ProgrammeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const programmeId = Number(resolvedParams.id);

  const [programme, setProgramme] = useState<TrainingProgramme | null>(null);
  const [activeTab, setActiveTab] = useState<'modules' | 'batches'>('modules');
  const [isLoading, setIsLoading] = useState(true);

  // Add Module Form
  const [showAddModuleModal, setShowAddModuleModal] = useState(false);
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleOrder, setModuleOrder] = useState<number>(1);
  const [isSubmittingModule, setIsSubmittingModule] = useState(false);

  // Add Content Form
  const [activeModuleForContent, setActiveModuleForContent] = useState<number | null>(null);
  const [contentType, setContentType] = useState<'video' | 'pdf' | 'note'>('video');
  const [contentTitle, setContentTitle] = useState('');
  const [contentUrl, setContentUrl] = useState('');
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [contentOrder, setContentOrder] = useState<number>(1);
  const [isSubmittingContent, setIsSubmittingContent] = useState(false);

  // Create Batch Form
  const [showCreateBatchModal, setShowCreateBatchModal] = useState(false);
  const [batchName, setBatchName] = useState('');
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);

  // Active Batch & Trainee Management
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [batchTrainees, setBatchTrainees] = useState<BatchTrainee[]>([]);
  const [traineeSearchQuery, setTraineeSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BatchTrainee[]>([]);
  const [manualTraineeId, setManualTraineeId] = useState('');
  const [isAddingTrainee, setIsAddingTrainee] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadProgramme = async () => {
    try {
      const data = await authApi.getProgramme(programmeId);
      setProgramme(data);
      if (data.batches && data.batches.length > 0 && selectedBatchId === null) {
        setSelectedBatchId(data.batches[0].id);
      }
    } catch (err) {
      console.error('Failed to load programme:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProgramme();
  }, [programmeId]);

  // Load batch roster when selectedBatchId changes
  useEffect(() => {
    if (selectedBatchId) {
      authApi.getBatchTrainees(selectedBatchId).then(setBatchTrainees).catch(console.error);
    }
  }, [selectedBatchId]);

  // Search trainees
  const handleSearchTrainees = async (q: string) => {
    setTraineeSearchQuery(q);
    if (q.trim().length >= 2) {
      const res = await authApi.searchTrainees(q);
      setSearchResults(res);
    } else {
      setSearchResults([]);
    }
  };

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleTitle.trim()) return;
    setIsSubmittingModule(true);
    try {
      await authApi.addModule(programmeId, {
        title: moduleTitle,
        order: moduleOrder,
      });
      setModuleTitle('');
      setShowAddModuleModal(false);
      await loadProgramme();
    } catch (err: any) {
      alert(err.message || 'Failed to add module');
    } finally {
      setIsSubmittingModule(false);
    }
  };

  const handleAddContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModuleForContent || !contentTitle.trim()) return;
    setIsSubmittingContent(true);
    try {
      if (contentType === 'pdf' && contentFile) {
        const formData = new FormData();
        formData.append('title', contentTitle);
        formData.append('type', 'pdf');
        formData.append('order', String(contentOrder));
        formData.append('file', contentFile);
        await authApi.uploadContent(activeModuleForContent, formData);
      } else {
        await authApi.addContent(activeModuleForContent, {
          title: contentTitle,
          type: contentType,
          url_or_file_path: contentUrl || (contentType === 'pdf' ? '/uploads/sample_curriculum.pdf' : 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
          order: contentOrder,
        });
      }
      setActiveModuleForContent(null);
      setContentTitle('');
      setContentUrl('');
      setContentFile(null);
      await loadProgramme();
    } catch (err: any) {
      alert(err.message || 'Failed to add content item');
    } finally {
      setIsSubmittingContent(false);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchName.trim()) return;
    setIsSubmittingBatch(true);
    try {
      const b = await authApi.createBatch(programmeId, { batch_name: batchName });
      setBatchName('');
      setShowCreateBatchModal(false);
      await loadProgramme();
      setSelectedBatchId(b.id);
    } catch (err: any) {
      alert(err.message || 'Failed to create batch');
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  const handleAddTraineeToBatch = async (tId: string) => {
    if (!selectedBatchId || !tId) return;
    setIsAddingTrainee(true);
    try {
      const updated = await authApi.addTraineesToBatch(selectedBatchId, [tId]);
      setBatchTrainees(updated);
      setManualTraineeId('');
      setStatusMessage(`Trainee ${tId} enrolled successfully!`);
      setTimeout(() => setStatusMessage(null), 3000);
      await loadProgramme();
    } catch (err: any) {
      alert(err.message || 'Failed to enroll trainee');
    } finally {
      setIsAddingTrainee(false);
    }
  };

  if (isLoading || !programme) {
    return (
      <ProtectedRoute allowedRoles={['TRAINER', 'ADMIN']}>
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
          <p className="text-xs text-slate-500">Loading programme...</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['TRAINER', 'ADMIN']}>
      <DashboardLayout
        role="trainer"
        title={programme.title}
        subtitle="Manage curriculum modules, upload instructional videos & PDFs, and configure batch rosters"
        headerAction={
          <Link
            href="/trainer/programmes"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Programmes</span>
          </Link>
        }
      >
        <div className="space-y-6">

        {/* Programme Overview Card */}
        <div className="rounded-3xl bg-white border border-slate-200 p-8 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                NCCT Training Programme
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {programme.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                {programme.description || 'No description provided.'}
              </p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 shrink-0 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <Building2 className="w-4 h-4 text-amber-600" />
                <span className="font-semibold">{programme.institution_name}</span>
              </div>
              {programme.start_date && (
                <div className="flex items-center gap-2 text-slate-500 font-mono">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>{programme.start_date} → {programme.end_date || 'Ongoing'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
            <button
              onClick={() => setActiveTab('modules')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'modules'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Curriculum &amp; Modules ({programme.modules?.length || 0})</span>
            </button>
            <button
              onClick={() => setActiveTab('batches')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'batches'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Batches &amp; Trainees ({programme.batches?.length || 0})</span>
            </button>
          </div>
        </div>

        {/* TAB 1: CURRICULUM & MODULES */}
        {activeTab === 'modules' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Course Modules &amp; Learning Items</h2>
                <p className="text-xs text-slate-500">
                  Organize instructional units and upload videos, PDFs, or lecture notes.
                </p>
              </div>
              <button
                onClick={() => {
                  setModuleOrder((programme.modules?.length || 0) + 1);
                  setShowAddModuleModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Module</span>
              </button>
            </div>

            {programme.modules?.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">No Modules Added Yet</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Start structuring your course by adding Module 1 (e.g. &quot;Principles of Cooperative Accounting&quot;).
                  </p>
                </div>
                <button
                  onClick={() => {
                    setModuleTitle('Module 1: Principles of Cooperative Accounting');
                    setModuleOrder(1);
                    setShowAddModuleModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors"
                >
                  Add Sample Module 1
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {programme.modules.map((mod) => (
                  <div
                    key={mod.id}
                    className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center font-mono">
                          {mod.order}
                        </span>
                        <div>
                          <h3 className="text-base font-bold text-slate-900">{mod.title}</h3>
                          <span className="text-[11px] text-slate-400">
                            {mod.content_items?.length || 0} content item(s)
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setActiveModuleForContent(mod.id);
                          setContentOrder((mod.content_items?.length || 0) + 1);
                        }}
                        className="px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Upload / Add Content</span>
                      </button>
                    </div>

                    {/* Content Items List */}
                    {mod.content_items?.length === 0 ? (
                      <div className="p-4 rounded-xl bg-slate-50 text-center text-xs text-slate-400 italic">
                        No content uploaded yet for this module. Click &quot;Upload / Add Content&quot; above.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {mod.content_items.map((item) => (
                          <div
                            key={item.id}
                            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-start gap-3 group"
                          >
                            <div className="p-2 rounded-lg bg-white shadow-2xs shrink-0">
                              {item.type === 'video' && <Video className="w-4 h-4 text-red-500" />}
                              {item.type === 'pdf' && <FileText className="w-4 h-4 text-blue-500" />}
                              {item.type === 'note' && <StickyNote className="w-4 h-4 text-emerald-500" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="uppercase text-[9px] font-bold px-1.5 py-0.5 rounded font-mono bg-slate-200 text-slate-700">
                                  {item.type}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">#{item.order}</span>
                              </div>
                              <h4 className="text-xs font-bold text-slate-900 truncate mt-1">
                                {item.title}
                              </h4>
                              <a
                                href={item.url_or_file_path.startsWith('http') ? item.url_or_file_path : `http://127.0.0.1:8000${item.url_or_file_path}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-amber-600 hover:underline flex items-center gap-1 mt-1 truncate"
                              >
                                <span className="truncate">View Resource</span>
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BATCHES & TRAINEE ROSTER */}
        {activeTab === 'batches' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Manage Batches &amp; Enroll Trainees</h2>
                <p className="text-xs text-slate-500">
                  Create student cohorts and enroll trainees by searching their Trainee ID.
                </p>
              </div>
              <button
                onClick={() => {
                  setBatchName(`Autumn ${new Date().getFullYear()} Batch A`);
                  setShowCreateBatchModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Batch</span>
              </button>
            </div>

            {statusMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{statusMessage}</span>
              </div>
            )}

            {programme.batches?.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
                <Users className="w-12 h-12 text-slate-300 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">No Batches Created Yet</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Create a batch cohort to start enrolling trainees into this programme.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setBatchName(`Batch ${new Date().getFullYear()}-A`);
                    setShowCreateBatchModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors"
                >
                  Create Batch 1
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Batch Selector Column */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 h-fit">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Cohorts / Batches
                  </h3>
                  <div className="space-y-2">
                    {programme.batches.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setSelectedBatchId(b.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                          selectedBatchId === b.id
                            ? 'bg-amber-50 border-amber-300 shadow-xs'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">{b.batch_name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Created: {new Date(b.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white border border-slate-200 font-bold text-slate-700">
                          {b.id === selectedBatchId ? batchTrainees.length : b.trainee_count} Trainees
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Batch Details & Trainee Roster Column */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Enroll Trainee Form */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-amber-600" />
                      Enroll Trainee by Trainee ID / Search
                    </h3>

                    {/* Manual Trainee ID Input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={manualTraineeId}
                        onChange={(e) => setManualTraineeId(e.target.value)}
                        placeholder="Enter Trainee ID e.g. NCCT-TR-2026-00001"
                        className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-600 text-slate-900 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddTraineeToBatch(manualTraineeId.trim())}
                        disabled={!manualTraineeId.trim() || isAddingTrainee}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        {isAddingTrainee ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                        <span>Enroll</span>
                      </button>
                    </div>

                    {/* Trainee Search Filter */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={traineeSearchQuery}
                          onChange={(e) => handleSearchTrainees(e.target.value)}
                          placeholder="Or search registered trainees by name, email, or institution..."
                          className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-600 text-slate-900"
                        />
                      </div>

                      {searchResults.length > 0 && (
                        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 max-h-48 overflow-y-auto">
                          {searchResults.map((t) => (
                            <div
                              key={t.id}
                              className="p-2 rounded-lg bg-white border border-slate-100 flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-slate-900">{t.name}</span>{' '}
                                <span className="text-[11px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                  {t.trainee_id}
                                </span>
                                <div className="text-[10px] text-slate-500">{t.institution || t.email}</div>
                              </div>
                              <button
                                onClick={() => handleAddTraineeToBatch(t.trainee_id)}
                                className="px-2.5 py-1 rounded-md bg-amber-600 text-white font-semibold text-[11px] hover:bg-amber-700"
                              >
                                Enroll
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Batch Roster Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Users className="w-4 h-4 text-amber-600" />
                        Batch Roster ({batchTrainees.length} Enrolled)
                      </h3>
                    </div>

                    {batchTrainees.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 italic bg-slate-50 rounded-xl">
                        No trainees enrolled in this batch yet. Search and add a trainee above.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                              <th className="pb-2">Trainee ID</th>
                              <th className="pb-2">Name</th>
                              <th className="pb-2">Email</th>
                              <th className="pb-2">Institution</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {batchTrainees.map((tr) => (
                              <tr key={tr.id} className="hover:bg-slate-50/50">
                                <td className="py-2.5 font-mono font-bold text-amber-700">
                                  {tr.trainee_id}
                                </td>
                                <td className="py-2.5 font-bold text-slate-900">{tr.name}</td>
                                <td className="py-2.5 text-slate-500 font-mono">{tr.email}</td>
                                <td className="py-2.5 text-slate-600">{tr.institution || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODAL: ADD MODULE */}
        {showAddModuleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add New Module</h3>
              <form onSubmit={handleAddModule} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Module Title</label>
                  <input
                    type="text"
                    required
                    value={moduleTitle}
                    onChange={(e) => setModuleTitle(e.target.value)}
                    placeholder="e.g. Module 2: Digital ERP & Financial Reporting"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-600 text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Order Number</label>
                  <input
                    type="number"
                    min={1}
                    value={moduleOrder}
                    onChange={(e) => setModuleOrder(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-600 text-slate-900"
                  />
                </div>
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModuleModal(false)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingModule}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    {isSubmittingModule && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Module</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ADD CONTENT */}
        {activeModuleForContent !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Upload / Add Content Item</h3>
              <form onSubmit={handleAddContent} className="space-y-4">
                {/* Content Type Selector */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Content Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setContentType('video')}
                      className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                        contentType === 'video'
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      <Video className="w-4 h-4 text-red-500" />
                      <span>Video</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setContentType('pdf')}
                      className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                        contentType === 'pdf'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span>PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setContentType('note')}
                      className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                        contentType === 'note'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      <StickyNote className="w-4 h-4 text-emerald-500" />
                      <span>Note</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Content Title</label>
                  <input
                    type="text"
                    required
                    value={contentTitle}
                    onChange={(e) => setContentTitle(e.target.value)}
                    placeholder={
                      contentType === 'video'
                        ? 'e.g. Introduction to Cooperative Accounting'
                        : contentType === 'pdf'
                        ? 'e.g. Cooperative Auditing Manual 2026.pdf'
                        : 'e.g. Key ERP Formulas & Definitions'
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-600 text-slate-900"
                  />
                </div>

                {contentType === 'pdf' ? (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Upload PDF Document (or enter URL below)
                    </label>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setContentFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                    />
                    <input
                      type="text"
                      value={contentUrl}
                      onChange={(e) => setContentUrl(e.target.value)}
                      placeholder="Or enter PDF URL (e.g. /uploads/manual.pdf)"
                      className="w-full mt-2 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-600 text-slate-900"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      {contentType === 'video' ? 'Video URL (YouTube, Vimeo, MP4)' : 'Note Resource URL / Link'}
                    </label>
                    <input
                      type="text"
                      required
                      value={contentUrl}
                      onChange={(e) => setContentUrl(e.target.value)}
                      placeholder={
                        contentType === 'video'
                          ? 'https://www.youtube.com/watch?v=demo-accounting'
                          : 'https://docs.ncct.edu/notes/module-1'
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-600 text-slate-900"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Order</label>
                  <input
                    type="number"
                    min={1}
                    value={contentOrder}
                    onChange={(e) => setContentOrder(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-600 text-slate-900"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModuleForContent(null)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingContent}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    {isSubmittingContent && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Add Content Item</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: CREATE BATCH */}
        {showCreateBatchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Create New Batch</h3>
              <form onSubmit={handleCreateBatch} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Batch Name</label>
                  <input
                    type="text"
                    required
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    placeholder="e.g. Batch 2026-A"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-600 text-slate-900"
                  />
                </div>
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateBatchModal(false)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingBatch}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    {isSubmittingBatch && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Create Batch</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
