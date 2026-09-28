'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  User,
  BookOpen,
  Award,
  Compass,
  CheckSquare,
  FileCheck,
  QrCode,
  GraduationCap,
  FileText,
  Briefcase,
  Users,
  BarChart3,
  ShieldCheck,
  Smartphone,
  Shield,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Sparkles,
  UserCheck,
} from 'lucide-react';

export type UserRoleType = 'trainee' | 'trainer' | 'admin' | 'employer' | 'TRAINEE' | 'TRAINER' | 'ADMIN' | 'EMPLOYER';

export interface NavItemConfig {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  badgeVariant?: 'primary' | 'secondary' | 'warning' | 'danger';
}

export const ROLE_NAVIGATION: Record<string, NavItemConfig[]> = {
  trainee: [
    {
      label: 'Dashboard',
      href: '/trainee/dashboard',
      icon: <LayoutDashboard className="w-5 h-5 shrink-0" />,
    },
    {
      label: 'My Profile',
      href: '/trainee/profile',
      icon: <User className="w-5 h-5 shrink-0" />,
    },
    {
      label: 'Courses & LMS',
      href: '/trainee/courses',
      icon: <BookOpen className="w-5 h-5 shrink-0" />,
    },
    {
      label: 'Attendance',
      href: '/trainee/attendance',
      icon: <QrCode className="w-5 h-5 shrink-0" />,
      badge: 'Live',
      badgeVariant: 'secondary',
    },
    {
      label: 'Skill Passport',
      href: '/trainee/skill-passport',
      icon: <Award className="w-5 h-5 shrink-0" />,
      badge: 'Verified',
      badgeVariant: 'secondary',
    },
    {
      label: 'Skill Gap Engine',
      href: '/trainee/skill-gap',
      icon: <Compass className="w-5 h-5 shrink-0" />,
      badge: 'AI',
      badgeVariant: 'warning',
    },
    {
      label: 'Assessments',
      href: '/trainee/assessment',
      icon: <CheckSquare className="w-5 h-5 shrink-0" />,
    },
    {
      label: 'Certificates',
      href: '/trainee/certificates',
      icon: <FileCheck className="w-5 h-5 shrink-0" />,
    },
  ],
  trainer: [
    {
      label: 'Dashboard',
      href: '/trainer/dashboard',
      icon: <LayoutDashboard className="w-5 h-5 shrink-0" />,
    },
    {
      label: 'Training Programmes',
      href: '/trainer/programmes',
      icon: <GraduationCap className="w-5 h-5 shrink-0" />,
    },
    {
      label: 'Batches & Cohorts',
      href: '/trainer/batches',
      icon: <Users className="w-5 h-5 shrink-0" />,
    },
    {
      label: 'Attendance Tracker',
      href: '/trainer/attendance',
      icon: <QrCode className="w-5 h-5 shrink-0" />,
      badge: 'Live',
      badgeVariant: 'secondary',
    },
    {
      label: 'Assessments & Grading',
      href: '/trainer/assessments',
      icon: <FileText className="w-5 h-5 shrink-0" />,
    },
    {
      label: 'Performance Analytics',
      href: '/trainer/analytics',
      icon: <BarChart3 className="w-5 h-5 shrink-0" />,
    },
  ],
  employer: [
    {
      label: 'Dashboard',
      href: '/employer/dashboard',
      icon: <LayoutDashboard className="w-5 h-5 shrink-0" />,
    },
    {
      label: 'Job Postings',
      href: '/employer/job-postings',
      icon: <Briefcase className="w-5 h-5 shrink-0" />,
    },
    {
      label: 'Candidate Matches',
      href: '/employer/matches',
      icon: <Sparkles className="w-5 h-5 shrink-0" />,
      badge: 'AI Match',
      badgeVariant: 'secondary',
    },
    {
      label: 'Confirmed Hires',
      href: '/employer/hires',
      icon: <UserCheck className="w-5 h-5 shrink-0" />,
    },
  ],
  admin: [
    {
      label: 'Ecosystem Analytics',
      href: '/admin/dashboard',
      icon: <BarChart3 className="w-5 h-5 shrink-0" />,
    },
    {
      label: 'Public Credential Verify',
      href: '/verify',
      icon: <ShieldCheck className="w-5 h-5 shrink-0" />,
    },
    {
      label: 'Kiosk Hardware Simulator',
      href: '/kiosk',
      icon: <Smartphone className="w-5 h-5 shrink-0" />,
      badge: 'IoT',
      badgeVariant: 'warning',
    },
  ],
};

const ROLE_TITLES: Record<string, { title: string; subtitle: string }> = {
  trainee: { title: 'Trainee Portal', subtitle: 'Learner & Skills Hub' },
  trainer: { title: 'Trainer Portal', subtitle: 'RTI Faculty Desk' },
  employer: { title: 'Employer Portal', subtitle: 'Cooperative Recruitment' },
  admin: { title: 'Administration', subtitle: 'NCCT Apex Command' },
};

export interface RoleSidebarProps {
  role: UserRoleType;
  activeRoute?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
  id?: string;
}

export const RoleSidebar: React.FC<RoleSidebarProps> = ({
  role,
  activeRoute,
  isCollapsed = false,
  onToggleCollapse,
  className = '',
  id = 'ncct-role-sidebar',
}) => {
  const currentPathname = usePathname();
  const currentActive = activeRoute || currentPathname || '';
  const normalizedRole = (role || 'trainee').toLowerCase().trim();
  const navItems = ROLE_NAVIGATION[normalizedRole] || ROLE_NAVIGATION.trainee;
  const roleMeta = ROLE_TITLES[normalizedRole] || ROLE_TITLES.trainee;

  return (
    <aside
      id={id}
      className={`relative flex flex-col bg-[#1e3a5f] text-white transition-all duration-300 select-none shadow-xl border-r border-[#152943] ${
        isCollapsed ? 'w-20' : 'w-64'
      } ${className}`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#2c5282]/40 bg-[#152943]/60">
        <Link
          href="/"
          className={`flex items-center gap-3 overflow-hidden ${
            isCollapsed ? 'justify-center w-full' : ''
          }`}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2d9d5f] to-[#3db874] flex items-center justify-center text-white shrink-0 shadow-sm shadow-[#152943]">
            <Shield className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-sm tracking-tight text-white leading-tight">
                NCCT <span className="font-light text-[#94a3b8]">Ecosystem</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#3db874] truncate">
                {roleMeta.title}
              </span>
            </div>
          )}
        </Link>

        {onToggleCollapse && !isCollapsed && (
          <button
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            currentActive === item.href ||
            (item.href !== '/' && currentActive.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-[#2d9d5f] text-white shadow-sm shadow-[#152943]/40'
                  : 'text-slate-200 hover:text-white hover:bg-white/10'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
            >
              <div
                className={`transition-transform duration-150 ${
                  isActive ? 'scale-105' : 'group-hover:scale-105'
                }`}
              >
                {item.icon}
              </div>

              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ml-2 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : item.badgeVariant === 'secondary'
                          ? 'bg-[#2d9d5f]/20 text-[#3db874]'
                          : 'bg-amber-400/20 text-amber-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Toggle & Portal Indicator */}
      <div className="p-3 border-t border-[#2c5282]/40 bg-[#152943]/40">
        {onToggleCollapse && isCollapsed && (
          <button
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
            className="w-full py-2 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {!isCollapsed && (
          <div className="flex items-center justify-between text-[11px] text-slate-300 px-2 py-1">
            <span className="truncate">{roleMeta.subtitle}</span>
            <span className="w-2 h-2 rounded-full bg-[#2d9d5f] inline-block shrink-0" title="Connected" />
          </div>
        )}
      </div>
    </aside>
  );
};

export default RoleSidebar;
