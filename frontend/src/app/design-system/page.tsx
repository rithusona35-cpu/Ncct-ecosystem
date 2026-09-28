'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  KPICard,
  Badge,
  ProgressBar,
  RoleSidebar,
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  DashboardLayout,
  UserRoleType,
} from '../../components/ui';
import {
  Palette,
  LayoutDashboard,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Award,
  BookOpen,
  Briefcase,
  Users,
  Shield,
  Layers,
  Sparkles,
  Sliders,
  Copy,
  Check,
  Eye,
  ExternalLink,
  RefreshCw,
  Plus,
  Download,
} from 'lucide-react';

const BRAND_PALETTE = [
  {
    name: 'Primary (Deep Blue)',
    hex: '#1e3a5f',
    variable: '--color-primary',
    usage: 'Headers, primary buttons, sidebar, institutional branding',
    bgClass: 'bg-[#1e3a5f]',
    textClass: 'text-white',
  },
  {
    name: 'Secondary (Accent Green)',
    hex: '#2d9d5f',
    variable: '--color-secondary',
    usage: 'Success states, verified badges, positive indicators, CTAs',
    bgClass: 'bg-[#2d9d5f]',
    textClass: 'text-white',
  },
  {
    name: 'Warning (Amber)',
    hex: '#d97706',
    variable: '--color-warning',
    usage: 'Skill gaps, pending approvals, threshold warnings',
    bgClass: 'bg-[#d97706]',
    textClass: 'text-white',
  },
  {
    name: 'Danger (Red)',
    hex: '#dc2626',
    variable: '--color-danger',
    usage: 'Invalid credentials, failed assessments, critical errors',
    bgClass: 'bg-[#dc2626]',
    textClass: 'text-white',
  },
  {
    name: 'Neutral Slate 900',
    hex: '#0f172a',
    variable: '--color-neutral-900',
    usage: 'Primary body text, high-contrast headings',
    bgClass: 'bg-slate-900',
    textClass: 'text-white',
  },
  {
    name: 'Neutral Slate 500',
    hex: '#64748b',
    variable: '--color-neutral-500',
    usage: 'Subtitles, secondary labels, disabled states',
    bgClass: 'bg-slate-500',
    textClass: 'text-white',
  },
  {
    name: 'Neutral Slate 100',
    hex: '#f1f5f9',
    variable: '--color-neutral-100',
    usage: 'Card backgrounds, hover states, border dividers',
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-800',
  },
  {
    name: 'Neutral Slate 50',
    hex: '#f8fafc',
    variable: '--color-neutral-50',
    usage: 'Page canvas background',
    bgClass: 'bg-slate-50',
    textClass: 'text-slate-800',
  },
];

export default function DesignSystemPage() {
  const [activeTab, setActiveTab] = useState<'components' | 'layout-preview'>('components');
  const [selectedRole, setSelectedRole] = useState<UserRoleType>('trainee');
  const [progressValue, setProgressValue] = useState<number>(88);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [skeletonVariant, setSkeletonVariant] = useState<'kpi' | 'card' | 'table' | 'chart'>('kpi');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHex(text);
    setTimeout(() => setCopiedHex(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      {/* Top Banner */}
      <div className="bg-[#1e3a5f] text-white border-b border-[#152943] py-8 px-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#2d9d5f] flex items-center justify-center text-white shadow-md shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  NCCT Design System & UI Kit
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/20 text-white">
                  Phase 17a
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#2d9d5f] text-white">
                  Tailwind v4 Theme
                </span>
              </div>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-300 max-w-2xl">
                Unified brand tokens, typography, and reusable component library engineered for all 4 NCCT roles (Trainee, Trainer, Employer, and Admin).
              </p>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#152943] p-1 rounded-xl shrink-0 self-start md:self-center border border-[#2c5282]/50">
            <button
              onClick={() => setActiveTab('components')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'components'
                  ? 'bg-[#2d9d5f] text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>UI Components</span>
            </button>
            <button
              onClick={() => setActiveTab('layout-preview')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'layout-preview'
                  ? 'bg-[#2d9d5f] text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>Dashboard Layout Preview</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {activeTab === 'layout-preview' ? (
          /* ========================================================
             LIVE DASHBOARD LAYOUT WRAPPER DEMO
             ======================================================== */
          <div className="space-y-6">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Interactive DashboardLayout Preview
                </h2>
                <p className="text-xs text-slate-500">
                  Switch roles below to test how the shared wrapper handles navigation, top bar branding, and content injection.
                </p>
              </div>

              {/* Role Switcher */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-center">
                {(['trainee', 'trainer', 'employer', 'admin'] as UserRoleType[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedRole(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                      selectedRole === r
                        ? 'bg-[#1e3a5f] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Embedded Live DashboardLayout Container */}
            <div className="rounded-2xl overflow-hidden border border-slate-300 shadow-xl bg-slate-50">
              <DashboardLayout
                role={selectedRole}
                activeRoute={`/${selectedRole}/dashboard`}
                title={`${selectedRole.toUpperCase()} Executive Overview`}
                subtitle="Live demonstration of the shared DashboardLayout wrapping role-specific dashboards with unified typography, breadcrumbs, and actions."
                badge={<Badge status="active" label="Production Theme" size="sm" dot />}
                breadcrumbs={[
                  { label: 'NCCT Portal', href: '#' },
                  { label: `${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Portal` },
                  { label: 'Overview' },
                ]}
                headerActions={
                  <div className="flex items-center gap-2">
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs">
                      <Download className="w-3.5 h-3.5" />
                      <span>Export</span>
                    </button>
                    <button className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#2d9d5f] hover:bg-[#227b4a] text-xs font-semibold text-white shadow-2xs">
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Entry</span>
                    </button>
                  </div>
                }
              >
                {/* Simulated Content based on active role */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard
                      title="Attendance Rate"
                      value="88.9%"
                      icon={<CheckCircle2 className="w-5 h-5 text-secondary" />}
                      variant="secondary"
                      trend={{ value: '+4.2%', isPositive: true, label: 'vs last batch' }}
                      description="8 attended out of 9 total sessions"
                    />
                    <KPICard
                      title="LMS Progress"
                      value="100%"
                      icon={<BookOpen className="w-5 h-5 text-primary" />}
                      variant="primary"
                      trend="3/3 Modules Complete"
                      description="Cooperative Accounting & Digital ERP"
                    />
                    <KPICard
                      title="Verified Skills"
                      value="5 Skills"
                      icon={<Award className="w-5 h-5 text-warning" />}
                      variant="warning"
                      trend={{ value: '2 Gaps', isPositive: false, label: 'ERP & GST' }}
                      description="Digital Passport auto-minted"
                    />
                    <KPICard
                      title="Placement Matches"
                      value="1 Active"
                      icon={<Briefcase className="w-5 h-5 text-secondary" />}
                      variant="secondary"
                      trend={{ value: 'Hired', isPositive: true, label: 'TN Apex Bank' }}
                      description="Chennai Branch Accountant"
                    />
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
                    <h3 className="text-sm font-bold text-slate-900 mb-4">
                      Simulated Course Progression & Verification
                    </h3>
                    <ProgressBar
                      value={progressValue}
                      label="Ravi Kumar - Cooperative Accounting & Digital ERP Progress"
                      size="lg"
                    />
                  </div>
                </div>
              </DashboardLayout>
            </div>
          </div>
        ) : (
          /* ========================================================
             COMPONENT STORYBOOK SHOWCASE
             ======================================================== */
          <div className="space-y-12">
            {/* 1. Brand Color Palette */}
            <section className="space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  <span>1. NCCT Brand Theme Tokens</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Curated color palette configured in Tailwind v4 with semantic tokens for headers, buttons, indicators, and backgrounds.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {BRAND_PALETTE.map((color) => (
                  <div
                    key={color.name}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow"
                  >
                    <div className={`h-24 ${color.bgClass} flex items-end justify-between p-3`}>
                      <span className={`text-xs font-mono font-bold ${color.textClass}`}>
                        {color.hex}
                      </span>
                      <button
                        onClick={() => copyToClipboard(color.hex)}
                        className="p-1.5 rounded-lg bg-black/20 hover:bg-black/40 text-white backdrop-blur-xs transition-colors"
                        title="Copy Hex"
                      >
                        {copiedHex === color.hex ? (
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <div className="p-3.5 space-y-1">
                      <p className="text-xs font-bold text-slate-900">{color.name}</p>
                      <p className="text-[11px] font-mono text-slate-400">{color.variable}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                        {color.usage}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 2. KPICard Showcase */}
            <section className="space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <LayoutDashboard className="w-5 h-5 text-primary" />
                  <span>2. &lt;KPICard /&gt; Stat Card Gallery</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Reusable stat cards with custom accent borders, icon containers, and trend indicators used across role dashboards.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                  title="Total Attendance"
                  value="88.9%"
                  icon={<CheckCircle2 className="w-5 h-5" />}
                  variant="secondary"
                  trend={{ value: '+8.9%', isPositive: true, label: 'above target' }}
                  description="8 / 9 Sessions Attended"
                />
                <KPICard
                  title="Course Completion"
                  value="100%"
                  icon={<BookOpen className="w-5 h-5" />}
                  variant="primary"
                  trend="All 3 Modules Done"
                  description="Eligible for Digital Certificate"
                />
                <KPICard
                  title="Identified Skill Gaps"
                  value="2 Gaps"
                  icon={<AlertTriangle className="w-5 h-5" />}
                  variant="warning"
                  trend={{ value: 'ERP (52%) & GST (48%)', isPositive: false }}
                  description="Action required for Cooperative Accountant"
                />
                <KPICard
                  title="Candidate Matching"
                  value="78.5%"
                  icon={<Users className="w-5 h-5" />}
                  variant="secondary"
                  trend={{ value: 'Top Match', isPositive: true, label: 'Chennai Branch' }}
                  description="Tamil Nadu Apex Bank"
                />
              </div>
            </section>

            {/* 3. Badge Component */}
            <section className="space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  <span>3. &lt;Badge /&gt; Status Pill Matrix</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Colored pill tags reflecting matched, gap, pending, verified, completed, and error states.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-6">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Status Variants
                  </h3>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge status="matched" label="Accounting (88% Matched)" />
                    <Badge status="completed" label="LMS Course Completed" />
                    <Badge status="verified" label="NCCT Certified Credential" />
                    <Badge status="gap" label="ERP (52% Skill Gap)" />
                    <Badge status="pending" label="Pending Assessment" />
                    <Badge status="active" label="Active Batch" />
                    <Badge status="failed" label="Below Pass Threshold" />
                    <Badge status="inactive" label="Archived Session" />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Size Variants
                  </h3>
                  <div className="flex items-center gap-4 flex-wrap">
                    <Badge status="matched" size="sm" label="Small (sm)" />
                    <Badge status="matched" size="md" label="Medium (md) [Default]" />
                    <Badge status="matched" size="lg" label="Large (lg)" />
                    <Badge status="gap" size="sm" dot label="Dot Indicator" />
                    <Badge status="verified" size="md" dot label="Verified Dot" />
                  </div>
                </div>
              </div>
            </section>

            {/* 4. ProgressBar Showcase */}
            <section className="space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-primary" />
                  <span>4. &lt;ProgressBar /&gt; Interactive Playground</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Accessible, animated progress indicators with automatic color tiering based on benchmark thresholds.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-6">
                {/* Interactive Slider */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-900">
                      Adjust Completion Percentage:
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Drag the slider to test auto-color tiering (Green &gt;=75%, Blue &gt;=50%, Amber &gt;=30%, Red &lt;30%).
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={progressValue}
                      onChange={(e) => setProgressValue(Number(e.target.value))}
                      className="w-40 sm:w-56 accent-[#2d9d5f] cursor-pointer"
                    />
                    <span className="font-mono text-sm font-bold text-primary w-12 text-right">
                      {progressValue}%
                    </span>
                  </div>
                </div>

                <div className="space-y-5">
                  <ProgressBar
                    value={progressValue}
                    label="Auto Tiering Dynamic Progress"
                    variant="auto"
                    size="lg"
                  />
                  <ProgressBar
                    value={100}
                    label="LMS Content Items Completed (100% - Secondary Green)"
                    variant="secondary"
                    size="md"
                  />
                  <ProgressBar
                    value={88.9}
                    label="Ravi Kumar Attendance (88.9% - Primary Deep Blue)"
                    variant="primary"
                    size="md"
                  />
                  <ProgressBar
                    value={52}
                    label="ERP Competency Score (52% - Warning Amber)"
                    variant="warning"
                    size="sm"
                  />
                  <ProgressBar
                    value={28}
                    label="Critical Competency Deficit (28% - Danger Red)"
                    variant="danger"
                    size="sm"
                  />
                </div>
              </div>
            </section>

            {/* 5. RoleSidebar Demo */}
            <section className="space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <span>5. &lt;RoleSidebar /&gt; Centralized Navigation per Role</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Pre-configured navigation menus with brand blue background, active state tracking, and status pill badges.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">Select Role Menu:</span>
                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                      {(['trainee', 'trainer', 'employer', 'admin'] as UserRoleType[]).map((r) => (
                        <button
                          key={r}
                          onClick={() => setSelectedRole(r)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                            selectedRole === r
                              ? 'bg-[#1e3a5f] text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="text-xs font-semibold text-primary hover:text-primary-hover px-3 py-1.5 rounded-lg border border-primary-200 bg-primary-50"
                  >
                    Toggle Collapse ({isSidebarCollapsed ? 'Expanded' : 'Collapsed'})
                  </button>
                </div>

                <div className="border border-slate-300 rounded-xl overflow-hidden max-w-sm shadow-md">
                  <RoleSidebar
                    role={selectedRole}
                    activeRoute={`/${selectedRole}/dashboard`}
                    isCollapsed={isSidebarCollapsed}
                    onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  />
                </div>
              </div>
            </section>

            {/* 6. EmptyState Scenarios */}
            <section className="space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span>6. &lt;EmptyState /&gt; No-Data Handlers</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Friendly zero-data states with contextual call-to-action buttons for lists, candidate matches, and test scores.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <EmptyState
                  title="No Pending Assessments"
                  message="Ravi Kumar has completed all scheduled module tests for Batch-2025-01. Great job staying on track!"
                  actionLabel="View Skill Passport"
                  actionHref="/trainee/passport"
                  icon={<Award className="w-7 h-7 text-secondary" />}
                />
                <EmptyState
                  title="No Candidate Applications"
                  message="There are currently no trainee candidates matching this specific criteria. Try lowering threshold requirements."
                  actionLabel="Post New Job Opening"
                  onAction={() => alert('New Job Opening action triggered!')}
                  icon={<Briefcase className="w-7 h-7 text-primary" />}
                />
              </div>
            </section>

            {/* 7. LoadingSkeleton Component */}
            <section className="space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-primary" />
                  <span>7. &lt;LoadingSkeleton /&gt; Placeholders</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Smooth shimmer skeletons for asynchronous data fetching across cards, tables, KPIs, and charts.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">Select Variant:</span>
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                    {(['kpi', 'card', 'table', 'chart'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setSkeletonVariant(v)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase transition-all ${
                          skeletonVariant === v
                            ? 'bg-[#1e3a5f] text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <LoadingSkeleton variant={skeletonVariant} count={2} />
                </div>
              </div>
            </section>

            {/* 8. PageHeader Component */}
            <section className="space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <LayoutDashboard className="w-5 h-5 text-primary" />
                  <span>8. &lt;PageHeader /&gt; Standard Page Title Bar</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Standardized title bars with responsive breadcrumbs, status badge, back navigation, and action buttons.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
                <PageHeader
                  title="Cooperative Accounting and Digital ERP"
                  subtitle="Batch-2025-01 • Regional Cooperative Training Institute, Chennai • Faculty: Trainer 1"
                  badge={<Badge status="completed" label="100% Completed" />}
                  breadcrumbs={[
                    { label: 'NCCT Hub', href: '#' },
                    { label: 'Courses', href: '#' },
                    { label: 'Cooperative Accounting & ERP' },
                  ]}
                  actions={
                    <div className="flex items-center gap-2">
                      <button className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs">
                        Download Syllabus
                      </button>
                      <button className="px-4 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary-hover text-white shadow-2xs">
                        View Certificate
                      </button>
                    </div>
                  }
                />
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
