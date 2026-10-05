'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { authApi } from '@/lib/api';
import { CertificateDetail } from '@/lib/types';
import {
  Award,
  CheckCircle2,
  Download,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Building2,
  BookOpen,
  QrCode,
  Share2,
  Sparkles,
  RefreshCw,
  Loader2,
  FileText
} from 'lucide-react';
import {
  DashboardLayout,
  KPICard,
  Badge,
  EmptyState,
  LoadingSkeleton,
} from '@/components/ui';

export default function MyCertificatesPage() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<CertificateDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const data = await authApi.getMyCertificates();
      setCertificates(data);
    } catch (err) {
      console.error('Failed to load certificates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const data = await authApi.getMyCertificates();
      setCertificates(data);
    } catch (err) {
      console.error('Failed to re-evaluate certificates:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  const handleCopyLink = (certId: string) => {
    const fullUrl = `${window.location.origin}/verify/${certId}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(certId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDownloadPdf = async (certId: string) => {
    try {
      setDownloadingId(certId);
      const downloadUrl = authApi.getCertificatePdfDownloadUrl(certId);
      // Trigger browser download via anchor
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `NCCT_Certificate_${certId}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download PDF:', err);
    } finally {
      setTimeout(() => setDownloadingId(null), 1000);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['TRAINEE', 'ADMIN']}>
      <DashboardLayout
        role="trainee"
        activeRoute="/trainee/certificates"
        title="My Digital Certificates"
        subtitle="Cryptographically verifiable, tamper-evident digital certificates officially conferred by NCCT, Govt. of India."
        badge={<Badge status="verified" label="Official Credentials" size="sm" dot />}
        breadcrumbs={[
          { label: 'NCCT Portal', href: '/' },
          { label: 'Trainee Hub', href: '/trainee/dashboard' },
          { label: 'Digital Certificates' },
        ]}
        headerActions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs disabled:opacity-50"
              id="btn-refresh-certificates"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Evaluating...' : 'Sync & Check Eligibility'}</span>
            </button>
            <Link
              href="/trainee/skill-passport"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1e3a5f] hover:bg-[#152943] text-white text-xs font-semibold shadow-2xs transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Skill Passport</span>
            </Link>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Top KPI Cards */}
          {loading ? (
            <LoadingSkeleton variant="kpi" count={3} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KPICard
                title="Issued Certificates"
                value={`${certificates.length} Awarded`}
                icon={<Award className="w-5 h-5 text-secondary" />}
                variant="secondary"
                trend="Batch-2025-01"
                description="Conferred by NCCT Apex Council"
              />
              <KPICard
                title="Cryptographic Status"
                value="100% Verified"
                icon={<ShieldCheck className="w-5 h-5 text-secondary" />}
                variant="secondary"
                trend="Tamper-evident record"
                description="Signed by Examination Controller"
              />
              <KPICard
                title="Public Verification"
                value="Live on Registry"
                icon={<QrCode className="w-5 h-5 text-primary" />}
                variant="primary"
                trend="QR Scan Supported"
                description="Instant employer validation"
              />
            </div>
          )}

          {/* Loading or Empty or List */}
          {loading ? (
            <LoadingSkeleton variant="card" count={2} />
          ) : certificates.length === 0 ? (
            <EmptyState
              title="No Certificates Awarded Yet"
              message="Complete 100% of your course modules and achieve >=80% attendance with >=60% on assessments to unlock your certificate."
              actionLabel="Go to Courses & Modules"
              actionHref="/trainee/courses"
              icon={<Award className="w-7 h-7 text-primary" />}
            />
          ) : (
          /* Certificate Grid */
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Officially Awarded Credentials
            </h2>

            <div className="grid grid-cols-1 gap-6">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="bg-white rounded-3xl border-2 border-amber-200/80 shadow-md hover:shadow-lg transition-all p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden"
                  id={`cert-card-${cert.certificate_id}`}
                >
                  {/* Left Watermark / Accent Stripe */}
                  <div className="absolute top-0 left-0 bottom-0 w-2.5 bg-gradient-to-b from-amber-500 to-orange-600" />

                  <div className="space-y-4 max-w-2xl pl-2">
                    {/* Badge Row */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {cert.certificate_id}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {cert.assessment_status} • Verified
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        ID: {cert.trainee_code || `TR-${cert.trainee_id}`}
                      </span>
                    </div>

                    {/* Title & Course */}
                    <div>
                      <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
                        {cert.title}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-slate-600 font-medium mt-1">
                        <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>Curriculum: {cert.course_title}</span>
                      </div>
                    </div>

                    {/* Meta info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-xs text-slate-500 pt-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{cert.institution_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>Conferred on {new Date(cert.completion_date || cert.issued_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-col sm:flex-row md:flex-col items-stretch gap-2.5 shrink-0 sm:min-w-[200px]">
                    <button
                      onClick={() => handleDownloadPdf(cert.certificate_id)}
                      disabled={downloadingId === cert.certificate_id}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                      id={`btn-download-pdf-${cert.certificate_id}`}
                    >
                      <Download className={`w-4 h-4 ${downloadingId === cert.certificate_id ? 'animate-bounce' : ''}`} />
                      {downloadingId === cert.certificate_id ? 'Downloading...' : 'Download Official PDF'}
                    </button>

                    <Link
                      href={`/verify/${cert.certificate_id}`}
                      target="_blank"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm"
                      id={`btn-verify-online-${cert.certificate_id}`}
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Verify Online
                      <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                    </Link>

                    <button
                      onClick={() => handleCopyLink(cert.certificate_id)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                      id={`btn-share-cert-${cert.certificate_id}`}
                    >
                      <Share2 className="w-3.5 h-3.5 text-slate-500" />
                      {copiedId === cert.certificate_id ? 'Verification Link Copied!' : 'Copy Verification Link'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
