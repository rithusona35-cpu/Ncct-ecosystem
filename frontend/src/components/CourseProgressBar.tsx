'use client';

import React from 'react';
import { CheckCircle2, Award, Clock } from 'lucide-react';

interface CourseProgressBarProps {
  percentage: number;
  completedItems: number;
  totalItems: number;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

export default function CourseProgressBar({
  percentage,
  completedItems,
  totalItems,
  size = 'md',
  showDetails = true,
}: CourseProgressBarProps) {
  const isComplete = percentage >= 100;

  const heightClass = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }[size];

  return (
    <div className="space-y-1.5 w-full">
      {showDetails && (
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            {isComplete ? (
              <span className="flex items-center gap-1 text-emerald-600 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>100% Completed</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-700">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{percentage}% Completed</span>
              </span>
            )}
          </div>
          <span className="font-mono text-[11px] text-slate-500">
            {completedItems} / {totalItems} items
          </span>
        </div>
      )}

      {/* Progress Bar Track */}
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${heightClass} shadow-inner`}>
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            isComplete
              ? 'bg-linear-to-r from-emerald-500 to-teal-500 shadow-xs'
              : percentage > 0
              ? 'bg-linear-to-r from-emerald-600 to-cyan-600'
              : 'bg-transparent'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
    </div>
  );
}
