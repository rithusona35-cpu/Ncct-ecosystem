'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import { authApi } from '../../../lib/api';
import { TraineeProfile } from '../../../lib/types';
import TraineeProfileForm from '../../../components/TraineeProfileForm';
import {
  DashboardLayout,
  Badge,
  LoadingSkeleton,
} from '../../../components/ui';
import { GraduationCap, ArrowLeft, CheckCircle2, UserCheck, IdCard } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function TraineeProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<TraineeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    async function load() {
      try {
        const p = await authApi.getMyProfile();
        setProfile(p);
        if (p?.trainee_id) {
          const QRCode = (await import('qrcode')).default;
          const url = await QRCode.toDataURL(p.trainee_id, {
            width: 200,
            margin: 1,
            color: { dark: '#1e3a5f', light: '#ffffff' }
          });
          setQrDataUrl(url);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleProfileSaved = (saved: TraineeProfile) => {
    setProfile(saved);
    setSuccessMessage('Profile saved successfully! Redirecting to dashboard...');
    setTimeout(() => {
      router.push('/trainee/dashboard');
    }, 1200);
  };

  return (
    <ProtectedRoute allowedRoles={['TRAINEE', 'ADMIN']}>
      <DashboardLayout
        role="trainee"
        activeRoute="/trainee/profile"
        title="Trainee Profile Management"
        subtitle="Manage personal contact info, institution affiliation, and previous skill records."
        badge={<Badge status="active" label="Verified Identity" size="sm" dot />}
        breadcrumbs={[
          { label: 'NCCT Portal', href: '/' },
          { label: 'Trainee Hub', href: '/trainee/dashboard' },
          { label: 'My Profile' },
        ]}
      >
        <div className="max-w-4xl mx-auto space-y-6">
          {successMessage && (
            <div className="p-4 bg-secondary-50 border border-secondary-100 rounded-2xl flex items-center gap-3 text-secondary text-xs sm:text-sm font-semibold shadow-xs">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {isLoading ? (
            <LoadingSkeleton variant="card" count={1} />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between pb-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary flex items-center justify-center">
                    <IdCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Official Trainee Credential Record
                    </h3>
                    <p className="text-xs text-slate-500">
                      ID: <span className="font-mono font-bold text-primary">{profile?.trainee_id || 'Pending'}</span>
                    </p>
                  </div>
                </div>

                {qrDataUrl && (
                  <div className="hidden sm:flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                    <img src={qrDataUrl} alt="Trainee QR" className="w-10 h-10 rounded-lg" />
                    <span className="text-[10px] font-mono text-slate-500 pr-2">Gate Pass</span>
                  </div>
                )}
              </div>

              <TraineeProfileForm
                initialProfile={profile}
                userName={user?.name}
                onProfileSaved={handleProfileSaved}
                onCancel={() => router.push('/trainee/dashboard')}
              />
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
