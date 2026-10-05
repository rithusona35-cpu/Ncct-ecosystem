'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { authApi } from '@/lib/api';
import { SkillPassportResponse } from '@/lib/types';
import SkillPassportCard from '@/components/SkillPassportCard';
import {
  DashboardLayout,
  KPICard,
  Badge,
  EmptyState,
  LoadingSkeleton,
} from '@/components/ui';
import {
  ShieldCheck,
  Award,
  Sparkles,
  RotateCcw,
  Target,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

export default function TraineePassportPage() {
  const [passport, setPassport] = useState<SkillPassportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchPassport = async () => {
    try {
      const data = await authApi.getSkillPassport('me');
      setPassport(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load skill passport');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPassport();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchPassport();
  };

  return (
    <ProtectedRoute allowedRoles={['TRAINEE', 'ADMIN', 'TRAINER']}>
      <DashboardLayout
        role="trainee"
        activeRoute="/trainee/skill-passport"
        title="Dynamic Skill Passport"
        subtitle="Your live, tamper-evident competency credential recalculating automatically with every verified assessment."
        badge={<Badge status="verified" label="Digital Passport Minted" size="sm" dot />}
        breadcrumbs={[
          { label: 'NCCT Portal', href: '/' },
          { label: 'Trainee Hub', href: '/trainee/dashboard' },
          { label: 'Skill Passport' },
        ]}
        headerActions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs disabled:opacity-50 cursor-pointer"
              id="btn-refresh-passport"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
              <span>{isRefreshing ? 'Recalculating...' : 'Recalculate Levels'}</span>
            </button>

            <Link
              href="/trainee/skill-gap"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1e3a5f] hover:bg-[#152943] text-white rounded-xl text-xs font-semibold transition shadow-2xs"
            >
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              <span>Role Gap Analysis</span>
            </Link>
          </div>
        }
      >
        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-danger-50 border border-danger-100 rounded-xl text-danger text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Top KPI Cards for Passport */}
          {isLoading ? (
            <LoadingSkeleton variant="kpi" count={4} />
          ) : passport ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Overall Skill Level"
                value={`Level ${passport.overall_level}`}
                icon={<Award className="w-5 h-5 text-secondary" />}
                variant="secondary"
                trend={{
                  value: passport.overall_level_label || 'Competent',
                  isPositive: true,
                }}
                description="Verified across 5 competencies"
              />
              <KPICard
                title="Weighted Score"
                value={`${Math.round(passport.overall_score)}%`}
                icon={<Sparkles className="w-5 h-5 text-primary" />}
                variant="primary"
                trend="Assessment verified"
                description="Acc 88%, Excel 85%, Comm 65%"
              />
              <KPICard
                title="Evaluated Skills"
                value={`${passport.skills?.length || 5} Skills`}
                icon={<ShieldCheck className="w-5 h-5 text-warning" />}
                variant="warning"
                trend={{
                  value: '2 Flagged Gaps',
                  isPositive: false,
                  label: 'ERP & GST',
                }}
                description="Level 1 to 5 Framework"
              />
              <KPICard
                title="Earned Credentials"
                value={`${passport.certificates_count || 1} Issued`}
                icon={<ShieldCheck className="w-5 h-5 text-secondary" />}
                variant="secondary"
                trend="NCCT Official"
                description="QR Verification Live"
              />
            </div>
          ) : null}

          {/* Main Passport Card */}
          {isLoading ? (
            <LoadingSkeleton variant="card" count={2} />
          ) : !passport ? (
            <EmptyState
              title="No Skill Passport Found"
              message="Complete assessments in your enrolled courses to generate your dynamic Level 1-5 Skill Passport."
              actionLabel="View Courses & Assessments"
              actionHref="/trainee/courses"
              icon={<Award className="w-7 h-7 text-primary" />}
            />
          ) : (
            <SkillPassportCard
              passport={passport}
              readOnly={false}
              onRefresh={handleRefresh}
            />
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
