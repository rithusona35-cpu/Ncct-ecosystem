'use client';

import React from 'react';

export interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  variant?: 'primary' | 'secondary' | 'warning' | 'danger' | 'auto';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
  id?: string;
}

const SIZE_STYLES = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

const VARIANT_BAR_COLORS = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  showPercentage = true,
  variant = 'auto',
  size = 'md',
  animated = true,
  className = '',
  id,
}) => {
  const safeMax = max > 0 ? max : 100;
  const percentage = Math.min(Math.max(Math.round((value / safeMax) * 100), 0), 100);

  // Auto variant selects color based on performance / completion benchmarks
  const resolvedVariant: 'primary' | 'secondary' | 'warning' | 'danger' =
    variant === 'auto'
      ? percentage >= 75
        ? 'secondary'
        : percentage >= 50
        ? 'primary'
        : percentage >= 30
        ? 'warning'
        : 'danger'
      : variant;

  const barColor = VARIANT_BAR_COLORS[resolvedVariant];
  const heightClass = SIZE_STYLES[size];

  return (
    <div id={id} className={`w-full ${className}`}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
          {label && <span className="truncate">{label}</span>}
          {showPercentage && (
            <span className="font-mono text-slate-600 shrink-0 ml-2">
              {percentage}%
            </span>
          )}
        </div>
      )}

      <div
        className={`w-full bg-slate-200/80 rounded-full overflow-hidden ${heightClass}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-label={label || 'Progress bar'}
      >
        <div
          className={`${heightClass} ${barColor} rounded-full transition-all duration-500 ease-out ${
            animated ? 'relative overflow-hidden' : ''
          }`}
          style={{ width: `${percentage}%` }}
        >
          {animated && (
            <div className="absolute inset-0 bg-white/20 -skew-x-12 translate-x-[-100%] animate-[shimmer_2s_infinite]" />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
