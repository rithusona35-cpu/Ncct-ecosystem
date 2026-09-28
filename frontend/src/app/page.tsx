'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { ROLE_DASHBOARDS, UserRole } from '../lib/types';
import {
  Shield,
  KeyRound,
  UserCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  GraduationCap,
  Briefcase,
  ShieldCheck,
  Building,
  Cpu,
  Bot,
  QrCode,
  WifiOff,
  BarChart3,
  Award,
  BookOpen,
  Target,
  RefreshCw,
  Layers,
  ArrowDown,
  ChevronRight,
  TrendingUp,
  FileCheck,
  AlertTriangle,
  Building2,
  Check,
  Zap,
  Users
} from 'lucide-react';

interface StageFlowItem {
  id: number;
  title: string;
  shortDesc: string;
  fullDesc: string;
  icon: React.ReactNode;
  actor: string;
  badgeText: string;
}

const CLOSED_LOOP_STAGES: StageFlowItem[] = [
  {
    id: 1,
    title: 'Training Delivery',
    shortDesc: 'Curriculum LMS modules, faculty lectures & digital attendance',
    fullDesc: 'Trainees undergo hands-on cooperative learning tracked via online LMS progress and edge IoT biometric/QR attendance kiosks.',
    icon: <BookOpen className="w-5 h-5" />,
    actor: 'Trainee + Trainer',
    badgeText: 'Foundation',
  },
  {
    id: 2,
    title: 'Assessment',
    shortDesc: 'Skill-tagged rubrics & practical evaluations',
    fullDesc: 'Standardized tests and practical assignments evaluate performance directly against predefined national competency benchmarks.',
    icon: <FileCheck className="w-5 h-5" />,
    actor: 'Trainer / Faculty',
    badgeText: 'Evaluation',
  },
  {
    id: 3,
    title: 'Skill Evidence',
    shortDesc: 'Calibrated competency metrics logged to profile',
    fullDesc: 'Granular assessment scores and project outcomes compile into an immutable skill registry with tamper-proof validation.',
    icon: <CheckCircle2 className="w-5 h-5" />,
    actor: 'System Engine',
    badgeText: 'Evidence',
  },
  {
    id: 4,
    title: 'Skill Gap Engine',
    shortDesc: 'AI diagnostic compares profile vs job roles',
    fullDesc: 'The AI Skill-Gap Engine benchmarks the trainee’s verified abilities against market requirements to compute real-time deficit scores.',
    icon: <Target className="w-5 h-5" />,
    actor: 'AI Core',
    badgeText: 'Diagnosis',
  },
  {
    id: 5,
    title: 'Personalized Learning',
    shortDesc: 'Automated remedial courses & recommendations',
    fullDesc: 'Adaptive learning pathways automatically assign targeted modules and AI chatbot guidance to close diagnosed skill gaps.',
    icon: <Sparkles className="w-5 h-5" />,
    actor: 'Trainee + AI Tutor',
    badgeText: 'Remediation',
  },
  {
    id: 6,
    title: 'Verified Skill Passport',
    shortDesc: 'Cryptographic QR digital credential',
    fullDesc: 'Trainees earn a tamper-proof digital passport with verifiable QR codes, recognized across cooperative banks, federations, and PACs.',
    icon: <ShieldCheck className="w-5 h-5" />,
    actor: 'NCCT Registry',
    badgeText: 'Credential',
  },
  {
    id: 7,
    title: 'Employment Matching',
    shortDesc: 'Algorithmic candidate ranking & placement',
    fullDesc: 'Accredited employers post requisitions, and our matching algorithm surfaces top qualified candidates by verified competency scores.',
    icon: <Briefcase className="w-5 h-5" />,
    actor: 'Employer Partner',
    badgeText: 'Placement',
  },
  {
    id: 8,
    title: 'Employer Feedback',
    shortDesc: 'Structured workplace competency ratings',
    fullDesc: 'Post-placement feedback from enterprise supervisors rates real-world job readiness, identifying emergent industry skill shifts.',
    icon: <UserCheck className="w-5 h-5" />,
    actor: 'Employer Supervisors',
    badgeText: 'Validation',
  },
  {
    id: 9,
    title: 'Training Intelligence',
    shortDesc: 'Apex national analytics & skill heatmaps',
    fullDesc: 'Aggregated employer ratings and placement data feed into the NCCT national dashboard, surfacing sector and regional skill deficits.',
    icon: <BarChart3 className="w-5 h-5" />,
    actor: 'NCCT Apex Admin',
    badgeText: 'Analytics',
  },
  {
    id: 10,
    title: 'Improved Training',
    shortDesc: 'Dynamic curriculum updates closing the loop',
    fullDesc: 'Insights continuously recalibrate course syllabi, faculty training rubrics, and institute benchmarks — closing the loop back to Stage 1.',
    icon: <RefreshCw className="w-5 h-5" />,
    actor: 'Curriculum Board',
    badgeText: 'Continuous Loop',
  },
];

const USER_ROLES_INFO = [
  {
    role: 'Trainee',
    title: 'Cooperative Trainee',
    badge: 'Trainee Portal',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    desc: 'Access modular coursework, track live skill passport readiness, diagnose competency gaps, and get matched to cooperative employers.',
    path: '/trainee/dashboard',
    icon: <GraduationCap className="w-6 h-6 text-emerald-600" />,
    features: ['Dynamic Skill Passport', 'AI Remedial Learning', 'QR Verifiable Credentials'],
  },
  {
    role: 'Trainer',
    title: 'Faculty / Trainer',
    badge: 'Trainer Console',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    desc: 'Manage student cohorts, grade skill-tagged evaluations, track IoT classroom attendance, and inspect institutional grade curves.',
    path: '/trainer/dashboard',
    icon: <Briefcase className="w-6 h-6 text-amber-600" />,
    features: ['Cohort Batch Oversight', 'Automated Rubric Grading', 'Live Kiosk Attendance'],
  },
  {
    role: 'Employer',
    title: 'Employer Partner',
    badge: 'Recruiter Hub',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    desc: 'Publish standardized job requisitions, match with certified graduates via AI scoring, and submit post-placement workplace competency ratings.',
    path: '/employer/dashboard',
    icon: <Building2 className="w-6 h-6 text-blue-600" />,
    features: ['AI Candidate Matchmaking', 'One-Click Placements', 'Post-Hire Feedback Loop'],
  },
  {
    role: 'Admin',
    title: 'NCCT Apex Administrator',
    badge: 'Governance HQ',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    desc: 'National oversight across all training institutes, regional skill gap heatmaps, accreditation metrics, and curriculum modernization policies.',
    path: '/admin/dashboard',
    icon: <ShieldCheck className="w-6 h-6 text-purple-600" />,
    features: ['National Skill Heatmaps', 'Ecosystem Analytics', 'Curriculum Policy Control'],
  },
];

export default function HomePage() {
  const { user } = useAuth();
  const [activeStageId, setActiveStageId] = useState<number>(1);

  const activeStage = CLOSED_LOOP_STAGES.find((s) => s.id === activeStageId) || CLOSED_LOOP_STAGES[0];

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden selection:bg-primary-100 selection:text-primary">
      {/* Subtle Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[550px] bg-gradient-to-b from-primary-50/70 via-secondary-50/30 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* 1. HERO SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20 text-center space-y-6">
        {/* Top Tag Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 border border-primary-200/80 text-primary text-xs font-semibold shadow-2xs animate-fade-in">
          <Sparkles className="w-3.5 h-3.5 text-secondary" />
          <span>Built for SIH26087 — National Council for Cooperative Training</span>
        </div>

        {/* Hero Title */}
        <div className="space-y-3 max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.15]">
            NCCT Cooperative <br className="hidden sm:inline" />
            <span className="text-primary">Skill Intelligence</span> Ecosystem
          </h1>
          <p className="text-lg sm:text-2xl font-bold text-secondary tracking-tight">
            From Training to Employment — A Closed-Loop System
          </p>
        </div>

        {/* Hero Description */}
        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          The national, unified platform bridging the gap between cooperative education and industry workforce demand.
          Powered by edge IoT attendance hardware, AI skill-gap diagnosis, and automated post-placement feedback.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {user ? (
            <Link
              href={ROLE_DASHBOARDS[user.role] || '/'}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-sm shadow-md transition-all duration-200 hover:shadow-lg cursor-pointer"
            >
              <span>Go to {user.role} Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              href="/login"
              id="hero-login-btn"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-sm shadow-md transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-secondary-300" />
              <span>Login to Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}

          <a
            href="#problem"
            id="hero-learn-more-btn"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm shadow-2xs transition-all duration-200 hover:border-slate-400 cursor-pointer"
          >
            <span>Learn More</span>
            <ArrowDown className="w-4 h-4 text-slate-400" />
          </a>

          <Link
            href="/verify"
            className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl border border-secondary-200 bg-secondary-50 hover:bg-secondary-100 text-secondary-800 font-semibold text-sm transition-all"
          >
            <QrCode className="w-4 h-4 text-secondary" />
            <span>Verify Credential</span>
          </Link>
        </div>

        {/* Quick Trust Highlights Banner */}
        <div className="pt-8 max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs text-left">
            <div className="flex items-center gap-3 p-2">
              <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary flex items-center justify-center shrink-0">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">10-Stage Loop</div>
                <div className="text-[11px] text-slate-500">Zero-drift learning</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2">
              <div className="w-9 h-9 rounded-xl bg-secondary-50 text-secondary flex items-center justify-center shrink-0">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">ESP32-S3 IoT Node</div>
                <div className="text-[11px] text-slate-500">Offline-first sync</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2">
              <div className="w-9 h-9 rounded-xl bg-warning-50 text-warning flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">AI Skill-Gap Engine</div>
                <div className="text-[11px] text-slate-500">Dynamic benchmarks</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Skill Passport</div>
                <div className="text-[11px] text-slate-500">Tamper-proof QR</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. "THE PROBLEM" SECTION */}
      <section id="problem" className="py-16 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-danger px-3 py-1 rounded-full bg-danger-50 border border-danger-100">
              The Fundamental Flaw in Conventional EdTech
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Why Traditional LMS Platforms Fail the Cooperative Sector
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Standard training systems stop at certificate issuance and never connect to real employment outcomes.
              Once a course ends, institutes have zero visibility into whether trainees gain employment, no mechanism
              to evaluate on-the-job competency retention, and no empirical data to adapt subsequent curricula.
            </p>
          </div>

          {/* Comparison Cards: Broken vs Closed-Loop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* The Broken Way */}
            <div className="p-7 rounded-2xl bg-danger-50/40 border border-danger-200/70 space-y-5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-danger font-bold text-sm uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4" />
                  <span>The Status Quo: Fragmented Training Pipeline</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  Linear, Open-Ended &amp; Disconnected
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Colleges and vocational bodies churn out certificates without verifying if skills align with live market demand.
                  Trainees struggle to prove authentic competence, while employers waste weeks assessing uncalibrated claims.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <div className="flex items-start gap-2.5 text-xs text-slate-700">
                  <div className="w-5 h-5 rounded-full bg-danger-100 text-danger flex items-center justify-center shrink-0 mt-0.5">✕</div>
                  <span><strong>Stops at Certification:</strong> Zero post-training traceability or placement accountability.</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-700">
                  <div className="w-5 h-5 rounded-full bg-danger-100 text-danger flex items-center justify-center shrink-0 mt-0.5">✕</div>
                  <span><strong>Static Syllabi:</strong> Curricula take years to revise, lagging behind new banking regulations &amp; ERP systems.</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-700">
                  <div className="w-5 h-5 rounded-full bg-danger-100 text-danger flex items-center justify-center shrink-0 mt-0.5">✕</div>
                  <span><strong>Paper Credential Fraud:</strong> Resumes contain unverified claims with no cryptographic backing.</span>
                </div>
              </div>
            </div>

            {/* The NCCT Closed-Loop Way */}
            <div className="p-7 rounded-2xl bg-secondary-50/50 border border-secondary-200 space-y-5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-secondary font-bold text-sm uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>The NCCT Solution: The Closed-Loop Ecosystem</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  Continuous Feedback &amp; Empirical Alignment
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  We bridge the divide by directly linking classroom assessments, digital skill passports, real-time employer matching,
                  and structured post-placement supervisor ratings back into national curriculum redesign.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <div className="flex items-start gap-2.5 text-xs text-slate-700">
                  <div className="w-5 h-5 rounded-full bg-secondary-100 text-secondary flex items-center justify-center shrink-0 mt-0.5">✓</div>
                  <span><strong>Outcome-Driven:</strong> Every learner is evaluated until they reach verified employment readiness.</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-700">
                  <div className="w-5 h-5 rounded-full bg-secondary-100 text-secondary flex items-center justify-center shrink-0 mt-0.5">✓</div>
                  <span><strong>Employer Feedback Loop:</strong> Supervisors evaluate hired graduates, updating national training intelligence.</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-700">
                  <div className="w-5 h-5 rounded-full bg-secondary-100 text-secondary flex items-center justify-center shrink-0 mt-0.5">✓</div>
                  <span><strong>Tamper-Proof Passports:</strong> Cryptographically verifiable QR credentials ensure total recruiter trust.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. "THE CLOSED LOOP" SECTION */}
      <section id="closed-loop" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary px-3 py-1 rounded-full bg-primary-50 border border-primary-200/80">
              The 10-Stage Feedback Loop
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              A Complete Circular Architecture
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Explore the continuous 10-stage lifecycle that powers NCCT. Select or hover over any stage below to inspect how data moves seamlessly from classroom training to verified recruitment.
            </p>
          </div>

          {/* Interactive Stepper Navigation (10 stages) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
            {CLOSED_LOOP_STAGES.map((stage) => {
              const isActive = stage.id === activeStageId;
              return (
                <button
                  key={stage.id}
                  onClick={() => setActiveStageId(stage.id)}
                  onMouseEnter={() => setActiveStageId(stage.id)}
                  className={`p-3 rounded-xl border text-center transition-all duration-200 flex flex-col items-center justify-between gap-2 cursor-pointer ${
                    isActive
                      ? 'bg-primary text-white border-primary shadow-sm scale-102 ring-2 ring-primary/20'
                      : 'bg-white text-slate-700 border-slate-200/90 hover:border-primary-200 hover:bg-slate-50/80'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    #{stage.id}
                  </div>
                  <div className={`text-[11px] font-semibold leading-tight line-clamp-2 ${isActive ? 'text-white' : 'text-slate-800'}`}>
                    {stage.title}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Stage Featured Detail Showcase */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-10 shadow-sm transition-all duration-300">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center text-sm font-black shadow-xs">
                    #{activeStage.id}
                  </span>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-secondary font-mono">
                      Stage {activeStage.id} of 10 • {activeStage.badgeText}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                      {activeStage.title}
                    </h3>
                  </div>
                </div>

                <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
                  {activeStage.fullDesc}
                </p>

                <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 flex-wrap">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 font-semibold text-slate-700">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span>Primary Actor: {activeStage.actor}</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-secondary-50 border border-secondary-200 font-semibold text-secondary-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />
                    <span>Automated Ecosystem Traceability</span>
                  </div>
                </div>
              </div>

              {/* Step Flow Context Visualizer */}
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/80 max-w-sm w-full space-y-4 shrink-0">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Data Pipeline Handshake
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex items-center gap-3">
                    <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                      {activeStage.id > 1 ? activeStage.id - 1 : 10}
                    </div>
                    <div className="truncate">
                      <div className="text-[10px] text-slate-400">Incoming Feed</div>
                      <div className="font-semibold text-slate-800 truncate">
                        {CLOSED_LOOP_STAGES[(activeStage.id - 2 + 10) % 10].title}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center text-primary">
                    <ArrowDown className="w-4 h-4 animate-bounce" />
                  </div>

                  <div className="p-3 bg-primary-50 rounded-xl border border-primary-200 text-xs flex items-center gap-3">
                    <div className="w-6 h-6 rounded-md bg-primary text-white flex items-center justify-center font-bold">
                      {activeStage.id}
                    </div>
                    <div className="truncate">
                      <div className="text-[10px] text-primary font-bold">Active Transformation</div>
                      <div className="font-bold text-primary truncate">
                        {activeStage.title}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center text-secondary">
                    <ArrowDown className="w-4 h-4" />
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex items-center gap-3">
                    <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                      {activeStage.id < 10 ? activeStage.id + 1 : 1}
                    </div>
                    <div className="truncate">
                      <div className="text-[10px] text-slate-400">Outgoing Feed</div>
                      <div className="font-semibold text-slate-800 truncate">
                        {CLOSED_LOOP_STAGES[activeStage.id % 10].title}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. "FOUR CONNECTED USERS" SECTION */}
      <section className="py-20 bg-white border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary px-3 py-1 rounded-full bg-secondary-50 border border-secondary-200">
              Role-Based Collaboration
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              One Unified Ecosystem. Four Empowered Stakeholders.
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Every role in the cooperative hierarchy participates in a shared feedback loop with specialized workflows,
              secure RBAC guards, and tailored dashboards.
            </p>
          </div>

          {/* 4 Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {USER_ROLES_INFO.map((userRole) => (
              <div
                key={userRole.role}
                className="bg-slate-50/60 rounded-2xl border border-slate-200 p-6 flex flex-col justify-between space-y-5 hover:shadow-md hover:border-slate-300 transition-all duration-200 group"
              >
                <div className="space-y-4">
                  {/* Top Badge & Icon */}
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                      {userRole.icon}
                    </div>
                    <span className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${userRole.badgeColor}`}>
                      {userRole.badge}
                    </span>
                  </div>

                  {/* Title & Desc */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors">
                      {userRole.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      {userRole.desc}
                    </p>
                  </div>

                  {/* Features list */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                    {userRole.features.map((feat) => (
                      <div key={feat} className="flex items-center gap-2 text-xs font-medium text-slate-700">
                        <Check className="w-3.5 h-3.5 text-secondary shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Action Link */}
                <div className="pt-2">
                  <Link
                    href={userRole.path}
                    className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 hover:text-primary hover:border-primary-200 transition shadow-2xs"
                  >
                    <span>Explore Portal</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. "REAL HARDWARE + REAL AI" SECTION */}
      <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary-300 px-3 py-1 rounded-full bg-white/10 border border-white/15">
              Production-Grade Architecture
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Real Edge Hardware &amp; Real AI Intelligence
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Not a theoretical mock-up. The NCCT ecosystem is backed by operational embedded firmware
              and production-calibrated machine intelligence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Card 1: ESP32-S3 Smart Training Node */}
            <div className="p-8 rounded-3xl bg-slate-800/80 border border-slate-700 space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-secondary/20 text-secondary-300 border border-secondary/30 flex items-center justify-center">
                    <Cpu className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">ESP32-S3 Smart Training Node</h3>
                    <p className="text-xs text-secondary-300 font-mono">Edge Biometric &amp; QR Attendance Station</p>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Engineered for rural and tier-2 cooperative training institutes where connectivity fluctuates.
                  The physical node authenticates trainee attendance via optical QR scanning and edge flash caching.
                </p>

                <div className="space-y-2 pt-2">
                  <div className="flex items-start gap-2.5 text-xs text-slate-200">
                    <WifiOff className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                    <span><strong>Offline-First Resilience:</strong> Scans cache locally in flash &amp; browser IndexedDB on link drops.</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-slate-200">
                    <Zap className="w-4 h-4 text-secondary-300 shrink-0 mt-0.5" />
                    <span><strong>Zero-Loss Auto-Sync:</strong> Background daemon pushes pending batches via <code>/api/attendance/sync-batch</code>.</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-slate-200">
                    <ShieldCheck className="w-4 h-4 text-secondary-300 shrink-0 mt-0.5" />
                    <span><strong>Idempotent Verification:</strong> Hardware deduplication protects against duplicate attendance entries.</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-700/80 flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono">Firmware: FreeRTOS / ESP-IDF</span>
                <span className="text-secondary-300 font-semibold">Verified Live</span>
              </div>
            </div>

            {/* Card 2: AI Skill-Gap Engine & Chatbot */}
            <div className="p-8 rounded-3xl bg-slate-800/80 border border-slate-700 space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary-100 text-primary border border-primary-200 flex items-center justify-center">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">AI Skill-Gap &amp; Chatbot Engine</h3>
                    <p className="text-xs text-primary-200 font-mono">Continuous Competency Matrix Calibration</p>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  A multi-layered machine intelligence pipeline that maps raw test grades to certified competencies,
                  diagnoses market role deficiencies, and guides learners through personalized tutoring interactions.
                </p>

                <div className="space-y-2 pt-2">
                  <div className="flex items-start gap-2.5 text-xs text-slate-200">
                    <Target className="w-4 h-4 text-secondary-300 shrink-0 mt-0.5" />
                    <span><strong>Dynamic Role Benchmarks:</strong> Ranks candidates against standardized NCCT competency matrices.</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-slate-200">
                    <Sparkles className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                    <span><strong>24/7 Educational Tutor:</strong> AI Chatbot assistant answers queries and guides remedial courses.</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-slate-200">
                    <BarChart3 className="w-4 h-4 text-secondary-300 shrink-0 mt-0.5" />
                    <span><strong>National Intelligence:</strong> Aggregates post-hire ratings to highlight regional skill deficits.</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-700/80 flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono">Engine: FastAPI + PostgreSQL</span>
                <span className="text-secondary-300 font-semibold">Production Ready</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION / READY TO EXPERIENCE */}
      <section className="py-16 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Ready to Explore the Ecosystem?
          </h2>
          <p className="text-slate-600 text-sm max-w-xl mx-auto">
            Experience role-based workflows firsthand across Trainees, Faculty, Employers, and Apex Administrators.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-sm shadow-md transition"
            >
              Sign In to Your Role
            </Link>
            <Link
              href="/verify"
              className="px-5 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
            >
              Verify Sample Skill Passport
            </Link>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="py-10 bg-slate-100 border-t border-slate-200 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="font-bold text-slate-900">
              NCCT Cooperative Skill Intelligence Ecosystem
            </span>
          </div>

          <div className="text-center font-medium text-slate-500">
            Built for <strong>SIH26087</strong> — National Council for Cooperative Training (NCCT)
          </div>

          <div className="flex items-center gap-4">
            <Link href="/verify" className="hover:text-primary transition">
              Verify
            </Link>
            <Link href="/login" className="hover:text-primary transition">
              Login
            </Link>
            <Link href="/register" className="hover:text-primary transition">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
