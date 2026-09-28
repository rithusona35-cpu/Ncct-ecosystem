'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../lib/api';
import { Shield, KeyRound, Mail, Lock, ArrowRight, AlertCircle, Loader2, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await authApi.login({ email, password });
      login(response);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick autofill buttons for testing convenience with official demo credentials
  const fillCredentials = (roleEmail: string, rolePw: string = 'Demo@123') => {
    setEmail(roleEmail);
    setPassword(rolePw);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 via-indigo-50/20 to-slate-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 sm:p-10 space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 mb-2">
              <KeyRound className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Welcome back to NCCT
            </h1>
            <p className="text-sm text-slate-500">
              Sign in to access your role-specific dashboard
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@ncct.edu"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-slate-900"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Password
                </label>
                <span className="text-xs text-indigo-600 hover:underline cursor-pointer">
                  Forgot?
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  id="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-200 hover:shadow-indigo-300 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Quick Test Fill (Sample accounts):</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials('demo.trainee@ncct.gov.in')}
                className="text-left p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 transition-colors text-emerald-800 text-xs cursor-pointer"
              >
                <div className="font-bold">Trainee (Ravi)</div>
                <div className="text-[10px] text-emerald-600 truncate">demo.trainee@ncct.gov.in</div>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('demo.trainer@ncct.gov.in')}
                className="text-left p-2 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200/60 transition-colors text-amber-800 text-xs cursor-pointer"
              >
                <div className="font-bold">Trainer (Faculty)</div>
                <div className="text-[10px] text-amber-600 truncate">demo.trainer@ncct.gov.in</div>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('demo.employer@ncct.gov.in')}
                className="text-left p-2 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200/60 transition-colors text-blue-800 text-xs cursor-pointer"
              >
                <div className="font-bold">Employer (Bank)</div>
                <div className="text-[10px] text-blue-600 truncate">demo.employer@ncct.gov.in</div>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('demo.admin@ncct.gov.in')}
                className="text-left p-2 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200/60 transition-colors text-purple-800 text-xs cursor-pointer"
              >
                <div className="font-bold">Apex Admin</div>
                <div className="text-[10px] text-purple-600 truncate">demo.admin@ncct.gov.in</div>
              </button>
            </div>
          </div>

          {/* Footer link */}
          <div className="text-center text-xs text-slate-500">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold text-indigo-600 hover:text-indigo-700">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
