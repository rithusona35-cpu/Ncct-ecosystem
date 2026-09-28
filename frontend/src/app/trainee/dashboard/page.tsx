'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import { authApi } from '../../../lib/api';
import { TraineeProfile, TraineeAttendanceSummary, TraineeSkillScoreSummary } from '../../../lib/types';
import TraineeProfileForm from '../../../components/TraineeProfileForm';
import TraineeQRCodeModal from '../../../components/TraineeQRCodeModal';
import SkillScoreBarChart from '../../../components/SkillScoreBarChart';
import RbacTester from '../../../components/RbacTester';
import {
  DashboardLayout,
  KPICard,
  Badge,
  ProgressBar,
  EmptyState,
  LoadingSkeleton,
  PageHeader,
} from '../../../components/ui';
import {
  GraduationCap,
  BookOpen,
  Award,
  Clock,
  ArrowRight,
  Target,
  Building2,
  Languages,
  CheckCircle2,
  Tag,
  Phone,
  MapPin,
  Edit3,
  Copy,
  Check,
  AlertCircle,
  IdCard,
  QrCode,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

export default function TraineeDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<TraineeProfile | null>(null);
  const [attendance, setAttendance] = useState<TraineeAttendanceSummary | null>(null);
  const [skillSummary, setSkillSummary] = useState<TraineeSkillScoreSummary | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const p = await authApi.getMyProfile();
        setProfile(p);
        try {
          const att = await authApi.getTraineeAttendance('me');
          setAttendance(att);
        } catch (e) {
          console.warn('Attendance fetch warning:', e);
        }
        try {
          const skills = await authApi.getTraineeSkillScores('me');
          setSkillSummary(skills);
        } catch (e) {
          console.warn('Skill scores fetch warning:', e);
        }
      } catch (err) {
        console.warn('Profile fetch error:', err);
      } finally {
        setIsLoadingProfile(false);
      }
    }
    fetchData();
  }, []);

  const handleCopyTraineeId = () => {
    if (profile?.trainee_id) {
      navigator.clipboard.writeText(profile.trainee_id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleProfileSaved = (saved: TraineeProfile) => {
    setProfile(saved);
    setIsEditing(false);
  };

  const attendancePct = attendance?.attendance_percentage ?? 88.9;
  const attendedCount = attendance?.attended_sessions ?? 8;
  const totalSessionsCount = attendance?.total_sessions ?? 9;

  return (
    <ProtectedRoute allowedRoles={['TRAINEE', 'ADMIN']}>
      <DashboardLayout
        role="trainee"
        activeRoute="/trainee/dashboard"
        title={`Welcome, ${profile?.name || user?.name || 'Trainee'}!`}
        subtitle="National Council for Cooperative Training (NCCT) Trainee Learning Portal • Track batches, monitor attendance, and verify competencies."
        badge={<Badge status="active" label="Trainee Portal" size="sm" dot />}
        breadcrumbs={[
          { label: 'NCCT Portal', href: '/' },
          { label: 'Trainee Hub', href: '/trainee/dashboard' },
          { label: 'Overview' },
        ]}
      >
        <div className="space-y-8">
          {/* Top KPI Cards Grid */}
          {isLoadingProfile ? (
            <LoadingSkeleton variant="kpi" count={4} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Attendance Rate"
                value={`${attendancePct}%`}
                icon={<CheckCircle2 className="w-5 h-5 text-secondary" />}
                variant="secondary"
                trend={{
                  value: `${attendedCount}/${totalSessionsCount}`,
                  isPositive: true,
                  label: 'sessions attended',
                }}
                description="Eligible for Certification (>=80%)"
                onClick={() => setShowQrModal(true)}
              />
              <KPICard
                title="LMS Course Progress"
                value="100%"
                icon={<BookOpen className="w-5 h-5 text-primary" />}
                variant="primary"
                trend={{
                  value: '3/3 Modules',
                  isPositive: true,
                  label: 'completed',
                }}
                description="Cooperative Accounting & Digital ERP"
              />
              <KPICard
                title="Verified Skills"
                value="5 Competencies"
                icon={<Award className="w-5 h-5 text-warning" />}
                variant="warning"
                trend={{
                  value: '2 Gaps Flagged',
                  isPositive: false,
                  label: 'ERP & GST',
                }}
                description="Dynamic Skill Passport Minted"
              />
              <KPICard
                title="Digital Certificates"
                value="1 Issued"
                icon={<ShieldCheck className="w-5 h-5 text-secondary" />}
                variant="secondary"
                trend={{
                  value: 'Verified',
                  isPositive: true,
                  label: 'Tamper-Evident',
                }}
                description="QR Validation Active"
              />
            </div>
          )}

          {/* Profile Section: Summary Card OR First-time Setup Banner / Form */}
          {isLoadingProfile ? (
            <LoadingSkeleton variant="card" count={1} />
          ) : isEditing || !profile ? (
            /* Profile Form Mode (First-Time or Edit) */
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary flex items-center justify-center">
                    <IdCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {profile ? 'Edit Your Trainee Profile' : 'Complete Your Trainee Profile'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {profile
                        ? 'Update your academic records and skill tags'
                        : 'Please complete your profile to generate your unique NCCT Trainee ID.'}
                    </p>
                  </div>
                </div>

                {profile && (
                  <button
                    onClick={() => setIsEditing(false)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <TraineeProfileForm
                initialProfile={profile}
                userName={user?.name}
                onProfileSaved={handleProfileSaved}
                onCancel={profile ? () => setIsEditing(false) : undefined}
              />
            </div>
          ) : (
            /* Profile Summary Card */
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary flex items-center justify-center shadow-2xs shrink-0">
                    <IdCard className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-xl font-extrabold text-slate-900">{profile.name || user?.name}</h3>
                      <Badge status="matched" label="Active Trainee" size="sm" dot />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
                  </div>
                </div>

                {/* Trainee ID Badge & Quick Actions */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl shadow-2xs">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        NCCT Trainee ID
                      </div>
                      <div className="text-xs font-mono font-bold text-primary">
                        {profile.trainee_id}
                      </div>
                    </div>
                    <button
                      onClick={handleCopyTraineeId}
                      title="Copy Trainee ID"
                      className="p-1 rounded-lg hover:bg-slate-200/60 text-slate-600 transition-colors cursor-pointer"
                    >
                      {copiedId ? <Check className="w-3.5 h-3.5 text-secondary" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    onClick={() => setShowQrModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary-hover text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>My QR Code</span>
                  </button>

                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Edit Profile</span>
                  </button>
                </div>
              </div>

              {/* Profile Grid Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span>Institution</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                    {profile.institution || 'Regional Cooperative Training Institute, Chennai'}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span>Course Enrolled</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                    {profile.course_enrolled || 'Cooperative Accounting and Digital ERP'}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                    <GraduationCap className="w-4 h-4 text-primary" />
                    <span>Education</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {profile.education || 'B.Com'}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                    <Languages className="w-4 h-4 text-primary" />
                    <span>Preferred Language</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {profile.preferred_language || 'Tamil'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Skill Performance & Engine Section */}
          {skillSummary && skillSummary.skills && skillSummary.skills.length > 0 ? (
            <div className="space-y-4">
              <SkillScoreBarChart
                skillScores={skillSummary.skills}
                title="Verified Skill-Wise Competency Scores"
                subtitle={`Latest evaluated performance across NCCT certified skills for ${skillSummary.trainee_name || 'Ravi Kumar'}`}
              />

              <div className="bg-[#1e3a5f] rounded-2xl p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm border border-[#152943]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    <Target className="w-4 h-4 text-emerald-400" />
                    AI Skill-Gap Engine Active
                  </div>
                  <h4 className="text-base font-bold text-white">
                    Match your competency scores against industry job roles
                  </h4>
                  <p className="text-xs text-slate-300">
                    Compare your evaluated skills with &quot;Cooperative Accountant&quot;, identify gaps (ERP 52%, GST 48%), and access targeted modules.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Link
                    href="/trainee/skill-passport"
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 shrink-0 border border-white/20"
                    id="btn-goto-passport"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>My Passport</span>
                  </Link>
                  <Link
                    href="/trainee/certificates"
                    className="px-4 py-2 bg-[#2d9d5f] hover:bg-[#227b4a] text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 shrink-0"
                    id="btn-goto-certificates"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>My Certificates</span>
                  </Link>
                  <Link
                    href="/trainee/skill-gap"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
                    id="btn-goto-skill-gap"
                  >
                    <span>Role-Fit Analysis</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Skill Competency Profile Pending"
              message="Take modular assessments in your enrolled courses to calculate verified skill scores for Accounting, ERP, and GST."
              actionLabel="Go to Courses & Assessments"
              actionHref="/trainee/courses"
              icon={<Award className="w-7 h-7 text-primary" />}
            />
          )}

          {/* Quick Access Navigation Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/trainee/courses"
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-primary hover:shadow-md transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">My Courses</h4>
                  <p className="text-xs text-slate-500">Modules, PDFs, Videos</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              href="/trainee/skill-passport"
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-secondary hover:shadow-md transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-secondary-50 text-secondary flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Skill Passport</h4>
                  <p className="text-xs text-slate-500">Level 1-5 Verified Card</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-secondary group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              href="/trainee/attendance"
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-secondary hover:shadow-md transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Attendance Log</h4>
                  <p className="text-xs text-slate-500">{attendancePct}% Overall Rate</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>

          {/* Trainee QR Code Modal */}
          {profile && (
            <TraineeQRCodeModal
              isOpen={showQrModal}
              onClose={() => setShowQrModal(false)}
              traineeId={profile.trainee_id}
              traineeName={profile.name || user?.name || 'NCCT Trainee'}
              institution={profile.institution}
              courseEnrolled={profile.course_enrolled}
            />
          )}

          {/* Interactive RBAC Prober */}
          <RbacTester />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
