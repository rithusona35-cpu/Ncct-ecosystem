'use client';

import React from 'react';

export interface LoadingSkeletonProps {
  variant?: 'card' | 'table' | 'text' | 'kpi' | 'chart';
  count?: number;
  rows?: number;
  columns?: number;
  className?: string;
  id?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'text',
  count = 1,
  rows = 4,
  columns = 4,
  className = '',
  id,
}) => {
  const items = Array.from({ length: count });

  if (variant === 'kpi') {
    return (
      <div
        id={id}
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}
      >
        {items.map((_, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs animate-pulse"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-3 flex-1">
                <div className="h-3 w-20 bg-slate-200 rounded-md" />
                <div className="h-7 w-28 bg-slate-200 rounded-lg" />
                <div className="h-3 w-32 bg-slate-100 rounded-md" />
              </div>
              <div className="w-11 h-11 bg-slate-100 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div id={id} className={`space-y-4 ${className}`}>
        {items.map((_, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs animate-pulse space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-40 bg-slate-200 rounded-md" />
              <div className="h-5 w-16 bg-slate-100 rounded-full" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full bg-slate-100 rounded-md" />
              <div className="h-3 w-4/5 bg-slate-100 rounded-md" />
            </div>
            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <div className="h-3 w-24 bg-slate-200 rounded-md" />
              <div className="h-7 w-20 bg-slate-200 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    const tableRows = Array.from({ length: rows });
    const tableCols = Array.from({ length: columns });

    return (
      <div
        id={id}
        className={`bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs animate-pulse ${className}`}
      >
        <div className="h-11 bg-slate-50 border-b border-slate-200 flex items-center px-4 gap-4">
          {tableCols.map((_, cIdx) => (
            <div
              key={cIdx}
              className="h-3.5 bg-slate-200 rounded-md"
              style={{ width: `${100 / columns}%` }}
            />
          ))}
        </div>
        <div className="divide-y divide-slate-100">
          {tableRows.map((_, rIdx) => (
            <div key={rIdx} className="h-14 flex items-center px-4 gap-4">
              {tableCols.map((_, cIdx) => (
                <div
                  key={cIdx}
                  className="h-3 bg-slate-100 rounded-md"
                  style={{ width: `${80 / columns + (cIdx % 2 === 0 ? 10 : -5)}%` }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div
        id={id}
        className={`bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs animate-pulse space-y-4 ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="h-4 w-36 bg-slate-200 rounded-md" />
          <div className="h-3 w-20 bg-slate-100 rounded-md" />
        </div>
        <div className="h-48 bg-slate-50 rounded-xl flex items-end justify-between p-4 gap-2">
          {Array.from({ length: 8 }).map((_, bIdx) => (
            <div
              key={bIdx}
              className="w-full bg-slate-200 rounded-t-md"
              style={{ height: `${30 + (bIdx * 17) % 65}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Default 'text'
  return (
    <div id={id} className={`space-y-2.5 animate-pulse ${className}`}>
      {items.map((_, idx) => (
        <div key={idx} className="space-y-2">
          <div className="h-3.5 bg-slate-200 rounded-md w-full" />
          <div className="h-3.5 bg-slate-100 rounded-md w-5/6" />
          <div className="h-3.5 bg-slate-100 rounded-md w-3/4" />
        </div>
      ))}
    </div>
  );
};

export default LoadingSkeleton;
