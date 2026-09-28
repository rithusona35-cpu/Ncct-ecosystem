'use client';

import React, { useState } from 'react';
import { authApi } from '../lib/api';
import { ShieldCheck, ShieldAlert, Play, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function RbacTester() {
  const [results, setResults] = useState<Record<string, { status: number; data: any; loading?: boolean }>>({});

  const testEndpoint = async (roleRoute: 'trainee' | 'trainer' | 'admin' | 'employer') => {
    setResults(prev => ({
      ...prev,
      [roleRoute]: { status: 0, data: null, loading: true }
    }));

    try {
      const data = await authApi.getProtectedResource(roleRoute);
      setResults(prev => ({
        ...prev,
        [roleRoute]: { status: 200, data, loading: false }
      }));
    } catch (err: any) {
      setResults(prev => ({
        ...prev,
        [roleRoute]: { status: err.status || 403, data: { detail: err.message }, loading: false }
      }));
    }
  };

  const routes: { id: 'trainee' | 'trainer' | 'admin' | 'employer'; label: string; roles: string }[] = [
    { id: 'trainee', label: 'GET /api/protected/trainee', roles: 'TRAINEE, ADMIN' },
    { id: 'trainer', label: 'GET /api/protected/trainer', roles: 'TRAINER, ADMIN' },
    { id: 'admin', label: 'GET /api/protected/admin', roles: 'ADMIN only' },
    { id: 'employer', label: 'GET /api/protected/employer', roles: 'EMPLOYER, ADMIN' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            Live Backend RBAC Route Tester
          </h3>
          <p className="text-xs text-slate-500">
            Send authenticated requests to FastAPI backend protected routes using your current JWT.
          </p>
        </div>
        <button
          onClick={() => {
            routes.forEach(r => testEndpoint(r.id));
          }}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Play className="w-3.5 h-3.5" />
          Test All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {routes.map((route) => {
          const res = results[route.id];
          return (
            <div
              key={route.id}
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-mono font-bold text-slate-800">{route.label}</div>
                  <div className="text-[10px] text-slate-500">Requires: {route.roles}</div>
                </div>
                <button
                  onClick={() => testEndpoint(route.id)}
                  disabled={res?.loading}
                  className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs font-semibold hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {res?.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 text-indigo-600" />}
                  Probe
                </button>
              </div>

              {res && !res.loading && (
                <div
                  className={`p-2 rounded-lg text-xs font-mono flex items-start gap-2 ${
                    res.status === 200
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {res.status === 200 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div className="overflow-hidden">
                    <span className="font-bold">HTTP {res.status}:</span>{' '}
                    <span className="break-all">{res.data?.message || res.data?.detail}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
