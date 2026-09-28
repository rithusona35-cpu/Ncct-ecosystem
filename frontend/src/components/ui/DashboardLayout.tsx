'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { RoleSidebar, UserRoleType } from './RoleSidebar';
import { PageHeader, BreadcrumbItem } from './PageHeader';
import { Badge } from './Badge';
import {
  Menu,
  X,
  LogOut,
  User as UserIcon,
  Shield,
  Bell,
  ChevronDown,
} from 'lucide-react';

export interface DashboardLayoutProps {
  children: React.ReactNode;
  role?: UserRoleType;
  activeRoute?: string;
  title?: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  headerAction?: React.ReactNode;
  badge?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  className?: string;
  fullWidth?: boolean;
}

const ROLE_DISPLAY_NAMES: Record<string, { label: string; status: string }> = {
  trainee: { label: 'Trainee', status: 'matched' },
  trainer: { label: 'Trainer / Faculty', status: 'pending' },
  employer: { label: 'Employer Partner', status: 'verified' },
  admin: { label: 'Apex Administrator', status: 'gap' },
};

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  role,
  activeRoute,
  title,
  subtitle,
  headerActions,
  headerAction,
  badge,
  breadcrumbs,
  className = '',
  fullWidth = false,
}) => {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Resolve role from props or authenticated session
  const rawRole = (role || user?.role || 'trainee').toString().toLowerCase();
  const normalizedRole: UserRoleType = (
    ['trainee', 'trainer', 'employer', 'admin'].includes(rawRole)
      ? rawRole
      : 'trainee'
  ) as UserRoleType;

  const currentRoute = activeRoute || pathname || '';
  const roleDisplay = ROLE_DISPLAY_NAMES[normalizedRole] || {
    label: normalizedRole.toUpperCase(),
    status: 'matched',
  };

  const displayName = user?.name || (normalizedRole === 'trainee' ? 'Ravi Kumar' : 'Authorized User');
  const displayEmail = user?.email || `${normalizedRole}@ncct.gov.in`;
  const avatarInitials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      <div className="flex-1 flex w-full">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex shrink-0">
          <RoleSidebar
            role={normalizedRole}
            activeRoute={currentRoute}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        </div>

        {/* Mobile Drawer Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#1e3a5f]">
              <div className="absolute top-2 right-2 p-1">
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <RoleSidebar
                role={normalizedRole}
                activeRoute={currentRoute}
                isCollapsed={false}
              />
            </div>
          </div>
        )}

        {/* Main Content Area & Sticky Top Bar */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="sticky top-0 z-40 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 rounded-xl text-slate-600 hover:text-primary hover:bg-slate-100 md:hidden"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  National Council for Cooperative Training
                </span>
                <span className="text-slate-300">/</span>
                <span className="text-xs font-semibold text-primary">
                  Apex Platform
                </span>
              </div>
            </div>

            {/* Right: Role indicator & User Profile & Logout */}
            <div className="flex items-center gap-3">
              <Badge
                status={roleDisplay.status}
                label={roleDisplay.label}
                size="sm"
                dot
                className="hidden sm:inline-flex"
              />

              <div className="h-6 w-px bg-slate-200 hidden sm:block" />

              {/* User Avatar & Info */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary-100 border border-primary-200 text-primary flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  {avatarInitials || <UserIcon className="w-4 h-4" />}
                </div>

                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-900 truncate max-w-[140px]">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate max-w-[140px]">
                    {displayEmail}
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={() => logout()}
                className="p-2 rounded-xl text-slate-500 hover:text-danger hover:bg-danger-50 transition-colors"
                title="Sign Out"
                id="btn-dashboard-logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Page Body */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className={`mx-auto ${fullWidth ? 'w-full' : 'max-w-7xl'}`}>
              {title && (
                <PageHeader
                  title={title}
                  subtitle={subtitle}
                  actions={headerActions || headerAction}
                  badge={badge}
                  breadcrumbs={breadcrumbs}
                />
              )}
              <div className={className}>{children}</div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
