'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { authApi } from '../../../lib/api';
import { AttendanceRecord } from '../../../lib/types';
import {
  Users,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowLeft,
  Cpu,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Building2,
  Loader2,
  Radio,
  QrCode
} from 'lucide-react';
import Link from 'next/link';
import DashboardLayout from '../../../components/ui/DashboardLayout';
import KPICard from '../../../components/ui/KPICard';
import Badge from '../../../components/ui/Badge';
import LoadingSkeleton from '../../../components/ui/LoadingSkeleton';
import EmptyState from '../../../components/ui/EmptyState';

export default function TrainerAttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | 'hardware' | 'web'>('all');

  const loadAttendance = async () => {
    setIsLoading(true);
    try {
      const data = await authApi.getTodayAttendance();
      setRecords(data);
    } catch (err) {
      console.error('Failed to load today attendance:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, []);

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.trainee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.trainee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.session_id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSource = filterSource === 'all' || r.synced_from === filterSource;

    return matchesSearch && matchesSource;
  });

  const totalMarked = records.length;
  const hardwareCount = records.filter((r) => r.synced_from === 'hardware').length;
  const webCount = records.filter((r) => r.synced_from === 'web').length;

  return (
    <ProtectedRoute allowedRoles={['TRAINER', 'ADMIN']}>
      <DashboardLayout
        role="trainer"
        title="Live Attendance Tracker"
        subtitle="Real-time attendance logs captured via Web Kiosks and ESP32-S3 IoT hardware scanner gateways"
        headerAction={
          <div className="flex items-center gap-2.5">
            <button
              onClick={loadAttendance}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Roster</span>
            </button>

            <Link
              href="/kiosk"
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white transition-all shadow-xs"
            >
              <Radio className="w-3.5 h-3.5 text-secondary" />
              <span>Open Kiosk Simulator</span>
              <ExternalLink className="w-3 h-3 text-slate-300" />
            </Link>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Total Check-Ins Today"
              value={`${totalMarked} Present`}
              icon={<Users className="w-5 h-5 text-secondary" />}
              variant="secondary"
              trend="Live Sync"
              description="Unique attendees checked in"
            />
            <KPICard
              title="Web Kiosk Scans"
              value={`${webCount} Scans`}
              icon={<CheckCircle2 className="w-5 h-5 text-primary" />}
              variant="primary"
              trend="Simulator"
              description="Captured via Kiosk terminal"
            />
            <KPICard
              title="Hardware ESP32 Scans"
              value={`${hardwareCount} Scans`}
              icon={<Cpu className="w-5 h-5 text-secondary" />}
              variant="secondary"
              trend="IoT Nodes"
              description="Edge gateway batch syncs"
            />
            <KPICard
              title="Sync Integrity"
              value="100% Validated"
              icon={<ShieldCheck className="w-5 h-5 text-secondary" />}
              variant="secondary"
              trend="Tamper-Evident"
              description="Signed session check-ins"
            />
          </div>

        {/* Filters & Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6 sm:p-8">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search attendee name, Trainee ID, or session..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                Filter Source:
              </span>
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="all">All Sources ({records.length})</option>
                <option value="web">Web Kiosk ({webCount})</option>
                <option value="hardware">ESP32 Hardware ({hardwareCount})</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <LoadingSkeleton variant="table" count={5} />
          ) : filteredRecords.length === 0 ? (
            <EmptyState
              title="No Attendance Records Found Today"
              message="Trainees can scan their unique QR codes at the Kiosk Simulator or hardware terminal to register attendance."
              actionLabel="Open Kiosk Simulator"
              actionHref="/kiosk"
              icon={<QrCode className="w-8 h-8 text-primary" />}
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Trainee ID</th>
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">Session</th>
                    <th className="py-3 px-4">Check-In Time</th>
                    <th className="py-3 px-4">Device Node</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((r) => {
                    const timeStr = new Date(r.check_in_time).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    });

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                          {r.trainee_id}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{r.trainee_name}</div>
                          {r.institution && (
                            <div className="text-[11px] text-slate-400 truncate max-w-xs">
                              {r.institution}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                          {r.session_id}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {timeStr}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                          {r.device_id}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge
                            status={r.synced_from === 'hardware' ? 'active' : 'pending'}
                            label={r.synced_from.toUpperCase()}
                          />
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge
                            status={r.status === 'present' ? 'completed' : 'pending'}
                            label={r.status.toUpperCase()}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  </ProtectedRoute>
);
}
