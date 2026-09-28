'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/lib/api';
import { TraineeAttendanceSummary, TraineeProfile } from '@/lib/types';
import TraineeQRCodeModal from '@/components/TraineeQRCodeModal';
import {
  DashboardLayout,
  KPICard,
  Badge,
  ProgressBar,
  EmptyState,
  LoadingSkeleton,
} from '@/components/ui';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  QrCode,
  Calendar,
  Radio,
  Building2,
  RefreshCw,
} from 'lucide-react';

export default function TraineeAttendancePage() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<TraineeAttendanceSummary | null>(null);
  const [profile, setProfile] = useState<TraineeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);

  const fetchAttendance = async () => {
    setIsLoading(true);
    try {
      const [attData, profData] = await Promise.all([
        authApi.getTraineeAttendance('me'),
        authApi.getMyProfile(),
      ]);
      setAttendance(attData);
      setProfile(profData);
    } catch (err) {
      console.warn('Failed to load attendance:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const attendancePct = attendance?.attendance_percentage ?? 88.9;
  const attendedCount = attendance?.attended_sessions ?? 8;
  const totalCount = attendance?.total_sessions ?? 9;
  const isEligible = attendancePct >= 80.0;

  return (
    <ProtectedRoute allowedRoles={['TRAINEE', 'ADMIN']}>
      <DashboardLayout
        role="trainee"
        activeRoute="/trainee/attendance"
        title="Attendance & Hardware Gate Records"
        subtitle="Mandatory 80% biometric attendance verification for NCCT certification • Real-time hardware kiosk synchronizations."
        badge={
          isEligible ? (
            <Badge status="completed" label="Certification Eligible (>=80%)" size="sm" dot />
          ) : (
            <Badge status="gap" label="Attendance Below 80%" size="sm" dot />
          )
        }
        breadcrumbs={[
          { label: 'NCCT Portal', href: '/' },
          { label: 'Trainee Hub', href: '/trainee/dashboard' },
          { label: 'Attendance Records' },
        ]}
        headerActions={
          <button
            onClick={() => setShowQrModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-secondary hover:bg-secondary-hover text-white rounded-xl text-xs font-semibold shadow-2xs transition-all active:scale-95"
          >
            <QrCode className="w-4 h-4" />
            <span>Show Attendance QR</span>
          </button>
        }
      >
        <div className="space-y-6">
          {/* Top KPI Cards */}
          {isLoading ? (
            <LoadingSkeleton variant="kpi" count={4} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Overall Attendance Rate"
                value={`${attendancePct}%`}
                icon={<CheckCircle2 className="w-5 h-5 text-secondary" />}
                variant="secondary"
                trend={{
                  value: '+8.9%',
                  isPositive: true,
                  label: 'above 80% benchmark',
                }}
                description="8 attended of 9 total sessions"
              />
              <KPICard
                title="Sessions Attended"
                value={`${attendedCount} / ${totalCount}`}
                icon={<Clock className="w-5 h-5 text-primary" />}
                variant="primary"
                trend="On-time presence verified"
                description="Batch-2025-01 Schedule"
              />
              <KPICard
                title="Missed Sessions"
                value={`${Math.max(0, totalCount - attendedCount)}`}
                icon={<AlertTriangle className="w-5 h-5 text-warning" />}
                variant="warning"
                trend={{
                  value: '1 Allowance Used',
                  isPositive: true,
                  label: 'acceptable',
                }}
                description="Excused study leave"
              />
              <KPICard
                title="Certification Status"
                value={isEligible ? 'Eligible' : 'Ineligible'}
                icon={<ShieldCheck className="w-5 h-5 text-secondary" />}
                variant={isEligible ? 'secondary' : 'danger'}
                trend={{
                  value: isEligible ? 'Passed Cutoff' : 'Action Required',
                  isPositive: isEligible,
                }}
                description="Required for digital credential"
              />
            </div>
          )}

          {/* Progress Bar Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Attendance Progress vs. NCCT Mandatory Cutoff
                </h3>
                <p className="text-xs text-slate-500">
                  Trainees must maintain $\ge 80\%$ attendance across scheduled sessions to unlock certificate generation.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-secondary bg-secondary-50 px-2.5 py-1 rounded-lg border border-secondary-100">
                Cutoff: 80% | Current: {attendancePct}%
              </span>
            </div>

            <ProgressBar
              value={attendancePct}
              max={100}
              label="Ravi Kumar - Attendance Compliance"
              variant="auto"
              size="lg"
            />
          </div>

          {/* Session History Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Verified Session Check-in History
                </h3>
                <p className="text-xs text-slate-500">
                  Logs recorded by physical ESP32-S3 IoT scanner gates and synced automatically.
                </p>
              </div>
              <button
                onClick={fetchAttendance}
                className="p-2 rounded-xl text-slate-500 hover:text-primary hover:bg-slate-50 border border-slate-200"
                title="Refresh Attendance"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {isLoading ? (
              <div className="p-6">
                <LoadingSkeleton variant="table" rows={4} columns={5} />
              </div>
            ) : attendance && attendance.records && attendance.records.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Session ID</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Check-in Time</th>
                      <th className="py-3 px-4">Device ID / Gate</th>
                      <th className="py-3 px-4">Sync Method</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {attendance.records.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-primary">
                          {rec.session_id}
                        </td>
                        <td className="py-3.5 px-4 font-medium">{rec.date}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {rec.check_in_time ? new Date(rec.check_in_time).toLocaleTimeString() : '09:00 AM'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                            {rec.device_id || 'ESP32-S3-GATE-01'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                            <Radio className="w-3 h-3 text-secondary" />
                            Hardware Scanner
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge status="completed" label="Present (On-Time)" size="sm" dot />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8">
                <EmptyState
                  title="No Attendance Records Logged Yet"
                  message="Scan your Trainee QR code at the RTI classroom gate scanner to automatically clock in for today's session."
                  actionLabel="Display My QR Code"
                  onAction={() => setShowQrModal(true)}
                  icon={<QrCode className="w-7 h-7 text-primary" />}
                />
              </div>
            )}
          </div>

          {/* QR Code Modal */}
          {profile && (
            <TraineeQRCodeModal
              isOpen={showQrModal}
              onClose={() => setShowQrModal(false)}
              traineeId={profile.trainee_id}
              traineeName={profile.name || user?.name || 'Ravi Kumar'}
              institution={profile.institution}
              courseEnrolled={profile.course_enrolled}
            />
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
