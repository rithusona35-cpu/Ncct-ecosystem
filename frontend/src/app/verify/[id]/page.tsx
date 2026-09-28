'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { CertificateVerificationResult, CertificateDetail } from '@/lib/types';
import {
  ShieldCheck,
  ShieldAlert,
  Award,
  CheckCircle2,
  XCircle,
  Download,
  Calendar,
  Building2,
  BookOpen,
  User,
  Search,
  ArrowRight,
  ExternalLink,
  Loader2,
  Sparkles,
  QrCode
} from 'lucide-react';

export default function CertificateVerificationPage() {
  const params = useParams();
  const router = useRouter();
  const certIdParam = (params?.id as string) || '';

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<CertificateVerificationResult | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [downloading, setDownloading] = useState(false);

  const performVerification = async (id: string) => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await authApi.verifyCertificate(id);
      setResult(data);
    } catch (err) {
      console.error('Verification failed:', err);
      setResult({
        is_valid: false,
        message: 'Network error communicating with National Credential Registry.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (certIdParam) {
      performVerification(certIdParam);
    }
  }, [certIdParam]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/verify/${encodeURIComponent(searchInput.trim())}`);
    }
  };

  const handleDownloadPdf = (certId: string) => {
    setDownloading(true);
    const downloadUrl = authApi.getCertificatePdfDownloadUrl(certId);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', `NCCT_Certificate_${certId}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloading(false), 1200);
  };

  const cert: CertificateDetail | undefined = result?.certificate || undefined;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* National Crest / Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold">
            <Award className="w-3.5 h-3.5 text-blue-600" />
            National Council for Cooperative Training (NCCT)
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Digital Certificate Verification Registry
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
            Official public verification service promoted by the Ministry of Cooperation, Government of India.
          </p>
        </div>

        {/* Search Bar for manual lookup */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Enter Certificate ID (e.g. NCCT-CERT-2026-0006)..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                id="input-verify-cert-id"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all shadow-sm"
              id="btn-verify-submit"
            >
              Verify Credential
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Verification Outcome */}
        {loading ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-16 flex flex-col items-center justify-center space-y-4 shadow-sm">
            <Loader2 className="w-9 h-9 animate-spin text-blue-600" />
            <p className="text-sm font-semibold text-slate-600">
              Querying National Credential Registry for {certIdParam}...
            </p>
          </div>
        ) : result?.is_valid && cert ? (
          /* ================= VALID CERTIFICATE ================= */
          <div className="bg-white rounded-3xl border-2 border-emerald-500/80 shadow-xl overflow-hidden" id="verified-certificate-container">
            {/* Top Verified Banner */}
            <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 p-6 sm:p-8 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner">
                  <ShieldCheck className="w-9 h-9 text-emerald-200" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-100 text-xs font-bold uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> Authenticity Confirmed
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1" id="status-valid-certificate">
                    VALID CERTIFICATE
                  </h2>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs text-emerald-200 uppercase tracking-widest font-mono">Certificate Code</span>
                <div className="text-base sm:text-lg font-mono font-extrabold text-white mt-0.5" id="verified-cert-code">
                  {cert.certificate_id}
                </div>
              </div>
            </div>

            {/* Certificate Details Body */}
            <div className="p-6 sm:p-8 space-y-8">
              {/* Awarded To Hero */}
              <div className="border-b border-slate-100 pb-6 space-y-2">
                <div className="text-xs uppercase font-bold tracking-wider text-slate-400">
                  Certified Candidate
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight" id="verified-trainee-name">
                  {cert.trainee_name}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-mono">
                  <span className="bg-slate-100 px-2.5 py-1 rounded-md">
                    Candidate ID: {cert.trainee_code || `TR-${cert.trainee_id}`}
                  </span>
                  <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md font-bold">
                    Examination Status: {cert.assessment_status}
                  </span>
                </div>
              </div>

              {/* Award Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <div className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" /> Credential Awarded
                  </div>
                  <div className="text-base font-bold text-slate-900">
                    {cert.title}
                  </div>
                  <div className="text-xs text-slate-500">
                    Curriculum: {cert.course_title}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Training Institution
                  </div>
                  <div className="text-base font-bold text-slate-900">
                    {cert.institution_name}
                  </div>
                  <div className="text-xs text-slate-500">
                    Accredited NCCT Cooperative Training Institute
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" /> Completion Date
                  </div>
                  <div className="text-base font-bold text-slate-900">
                    {new Date(cert.completion_date || cert.issued_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="text-xs text-slate-500">
                    Recorded in National Registry on {new Date(cert.issued_date).toLocaleDateString()}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Issuing Authority
                  </div>
                  <div className="text-base font-bold text-slate-900">
                    {cert.issued_by}
                  </div>
                  <div className="text-xs text-slate-500">
                    Ministry of Cooperation • Govt. of India
                  </div>
                </div>
              </div>

              {/* Cryptographic Verification Badge */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3 text-slate-600">
                  <QrCode className="w-8 h-8 text-slate-400 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-800">Tamper-Evident Security Seal</div>
                    <div className="font-mono text-slate-500 text-[11px]">
                      Verified URL: /verify/{cert.certificate_id}
                    </div>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs shrink-0">
                  Cryptographically Valid
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <button
                  onClick={() => handleDownloadPdf(cert.certificate_id)}
                  disabled={downloading}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                  id="btn-verify-download-pdf"
                >
                  <Download className={`w-4 h-4 ${downloading ? 'animate-bounce' : ''}`} />
                  {downloading ? 'Generating PDF...' : 'Download Official PDF Certificate'}
                </button>

                {cert.trainee_code && (
                  <Link
                    href={`/passport/${cert.trainee_code}`}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-sm"
                    id="btn-verify-view-passport"
                  >
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    View Trainee Skill Passport
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ================= INVALID CERTIFICATE ================= */
          <div className="bg-white rounded-3xl border-2 border-red-400/80 shadow-lg overflow-hidden" id="invalid-certificate-container">
            <div className="bg-gradient-to-r from-red-600 to-rose-700 p-6 sm:p-8 text-white flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
                <ShieldAlert className="w-9 h-9 text-red-200" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-400/20 text-red-100 text-xs font-bold uppercase tracking-wider">
                  <XCircle className="w-3.5 h-3.5 text-red-300" /> Verification Failed
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1" id="status-invalid-certificate">
                  INVALID CERTIFICATE
                </h2>
              </div>
            </div>

            <div className="p-8 space-y-6 text-center">
              <p className="text-slate-600 text-sm max-w-lg mx-auto">
                {result?.message || `Certificate '${certIdParam}' was not found in the NCCT National Credential Registry.`}
              </p>

              <div className="bg-red-50 text-red-800 border border-red-200 rounded-2xl p-4 text-xs max-w-md mx-auto text-left space-y-1">
                <div className="font-bold">Important Notice:</div>
                <p>This identifier is not recognized as an authentic NCCT credential. If you believe this is an error, please verify the certificate number on the physical document or contact the issuing institute.</p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setSearchInput('')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm"
                >
                  <Search className="w-4 h-4" />
                  Try Another Certificate ID
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
