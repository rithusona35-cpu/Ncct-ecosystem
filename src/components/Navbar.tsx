'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { ROLE_DASHBOARDS, UserRole } from '../lib/types';
import { Shield, User as UserIcon, LogOut, LayoutDashboard, KeyRound } from 'lucide-react';

import { usePathname } from 'next/navigation';

const ROLE_COLORS: Record<UserRole, string> = {
  TRAINEE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  TRAINER: 'bg-amber-50 text-amber-700 border-amber-200',
  ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
  EMPLOYER: 'bg-blue-50 text-blue-700 border-blue-200',
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  // If on a page that uses DashboardLayout, hide global Navbar to prevent double headers
  if (pathname && (pathname.startsWith('/trainee') || pathname.startsWith('/trainer') || pathname.startsWith('/admin') || pathname.startsWith('/employer') || pathname.startsWith('/design-system'))) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
            <Shield className="w-5 h-5 text-secondary-300" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base tracking-tight text-slate-900 group-hover:text-primary transition-colors">
              NCCT <span className="font-light text-slate-500">Ecosystem</span>
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 -mt-1">
              Cooperative Skill Intelligence
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-4">
              <Link
                href={ROLE_DASHBOARDS[user.role]}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>

              {user.role === 'TRAINEE' && (
                <>
                  <Link
                    href="/trainee/courses"
                    className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/60"
                  >
                    My Courses
                  </Link>
                  <Link
                    href="/trainee/skill-gap"
                    className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200/60"
                    id="nav-link-skill-gap"
                  >
                    AI Skill Gap
                  </Link>
                  <Link
                    href="/trainee/passport"
                    className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-700 transition-colors px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200/60"
                    id="nav-link-skill-passport"
                  >
                    Skill Passport
                  </Link>
                  <Link
                    href="/trainee/certificates"
                    className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 transition-colors px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200/60"
                    id="nav-link-certificates"
                  >
                    Certificates
                  </Link>
                </>
              )}

              <Link
                href="/verify"
                className="hidden lg:inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
                id="nav-link-verify"
              >
                Verify
              </Link>

              <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                <div className="text-right hidden md:block">
                  <div className="text-xs font-bold text-slate-900 leading-tight">{user.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono leading-tight">{user.email}</div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${ROLE_COLORS[user.role]}`}>
                  {user.role}
                </span>
                <button
                  onClick={logout}
                  title="Logout"
                  className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/verify"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-all mr-1"
              >
                Verify Credential
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-100 transition-all"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Sign In
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all"
              >
                <UserIcon className="w-3.5 h-3.5" />
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
