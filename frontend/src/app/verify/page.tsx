'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  Search,
  Award,
  ArrowRight,
  CheckCircle2,
  Lock,
  Building2,
  FileCheck
} from 'lucide-react';

export default function VerifyPortalPage() {
  const router = useRouter();
  const [certId, setCertId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (certId.trim()) {
      router.push(`/verify/${encodeURIComponent(certId.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* National Crest / Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold">
            <Award className="w-3.5 h-3.5 text-blue-600" />
            National Council for Cooperative Training (NCCT)
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            National Credential Verification Portal
          </h1>
          <p className="text-sm text-slate-600 max-w-lg mx-auto">
            Ministry of Cooperation, Government of India. Verify official NCCT digital certificates, training qualifications, and competency credentials instantly.
          </p>
        </div>

        {/* Verification Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Verify a Certificate</h2>
              <p className="text-xs text-slate-500">Scan the QR code on the certificate or type the Certificate ID below.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="verify-cert-id" className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                Certificate Identifier
              </label>
              <div className="relative">
                <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="verify-cert-id"
                  type="text"
                  placeholder="e.g. NCCT-CERT-2026-0006"
                  value={certId}
                  onChange={(e) => setCertId(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 text-base font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Found on the bottom-left corner of the issued PDF credential.
              </p>
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all shadow-md hover:shadow-lg"
              id="btn-verify-lookup"
            >
              Verify Credential Authenticity
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Test Demo Links */}
          <div className="pt-2 border-t border-slate-100">
            <div className="text-xs text-slate-400 mb-2 font-medium">Sample Test Verification:</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setCertId('NCCT-CERT-2026-0006');
                  router.push('/verify/NCCT-CERT-2026-0006');
                }}
                className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                NCCT-CERT-2026-0006 (Ravi Kumar)
              </button>
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-2">
            <Lock className="w-6 h-6 text-emerald-600 mx-auto" />
            <div className="text-sm font-bold text-slate-800">Tamper-Proof</div>
            <p className="text-xs text-slate-500">Embedded cryptographic signatures prevent falsification.</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-2">
            <CheckCircle2 className="w-6 h-6 text-blue-600 mx-auto" />
            <div className="text-sm font-bold text-slate-800">Real-Time Sync</div>
            <p className="text-xs text-slate-500">Live checks against the National Credential Registry.</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-2">
            <Building2 className="w-6 h-6 text-indigo-600 mx-auto" />
            <div className="text-sm font-bold text-slate-800">Ministry Approved</div>
            <p className="text-xs text-slate-500">Accredited by National Council for Cooperative Training.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
