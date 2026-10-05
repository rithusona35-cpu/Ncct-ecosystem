'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { UserRole, ROLE_DASHBOARDS } from '../lib/types';
import { ShieldAlert, ArrowLeft, LogOut, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <p className="text-sm font-medium text-slate-500">Verifying security credentials...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  // Check role authorization if specific roles are required
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-red-100 p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shadow-inner">
            <ShieldAlert className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3 py-1 bg-red-100 text-red-700 font-mono text-xs font-semibold rounded-full uppercase tracking-wider">
              HTTP 403 Forbidden
            </span>
            <h2 className="text-2xl font-bold text-slate-900">Access Restricted</h2>
            <p className="text-sm text-slate-600">
              You are logged in as <strong className="text-slate-900">{user.email}</strong> with role{' '}
              <span className="px-2 py-0.5 rounded bg-slate-100 font-mono font-semibold text-slate-800">
                {user.role}
              </span>.
            </p>
            <p className="text-xs text-slate-500">
              This protected route requires one of the following permissions:{' '}
              <span className="font-semibold text-red-600">{allowedRoles.join(', ')}</span>.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link
              href={ROLE_DASHBOARDS[user.role]}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all shadow-sm shadow-indigo-200"
            >
              <ArrowLeft className="w-4 h-4" />
              My Dashboard
            </Link>
            <button
              onClick={logout}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
