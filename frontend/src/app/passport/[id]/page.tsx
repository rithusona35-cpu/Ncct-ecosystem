'use client';

import React, { useEffect, useState, use } from 'react';
import Navbar from '@/components/Navbar';
import { authApi } from '@/lib/api';
import { SkillPassportResponse } from '@/lib/types';
import SkillPassportCard from '@/components/SkillPassportCard';
import { ShieldCheck, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PublicSkillPassportPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const traineeId = resolvedParams.id;

  const [passport, setPassport] = useState<SkillPassportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicPassport = async () => {
      try {
        const data = await authApi.getSkillPassport(traineeId);
        setPassport(data);
      } catch (err: any) {
        setError(err.message || 'Skill passport could not be verified or was not found.');
      } finally {
        setIsLoading(false);
      }
    };

    if (traineeId) {
      fetchPublicPassport();
    }
  }, [traineeId]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full space-y-6">
        {/* Verification banner */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to NCCT Home
          </Link>

          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Official NCCT Credential Verification Service
          </span>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="p-16 text-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
            Verifying tamper-evident credential registry...
          </div>
        ) : !passport ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200">
            No verified skill passport found for identifier <strong>{traineeId}</strong>.
          </div>
        ) : (
          <SkillPassportCard
            passport={passport}
            readOnly={true}
          />
        )}
      </div>
    </div>
  );
}
