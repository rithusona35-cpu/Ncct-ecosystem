'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle, Clock, Check, XCircle, ShieldCheck } from 'lucide-react';

export type BadgeStatus =
  | 'matched'
  | 'gap'
  | 'pending'
  | 'completed'
  | 'active'
  | 'inactive'
  | 'verified'
  | 'failed'
  | string;

export interface BadgeProps {
  status: BadgeStatus;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  dot?: boolean;
  className?: string;
  id?: string;
}

const STATUS_CONFIGS: Record<
  string,
  {
    bg: string;
    text: string;
    border: string;
    dotBg: string;
    defaultLabel: string;
    icon: React.ReactNode;
  }
> = {
  matched: {
    bg: 'bg-secondary-50',
    text: 'text-secondary',
    border: 'border-secondary-100',
    dotBg: 'bg-secondary',
    defaultLabel: 'Matched',
    icon: <Check className="w-3.5 h-3.5" />,
  },
  completed: {
    bg: 'bg-secondary-50',
    text: 'text-secondary',
    border: 'border-secondary-100',
    dotBg: 'bg-secondary',
    defaultLabel: 'Completed',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  verified: {
    bg: 'bg-secondary-50',
    text: 'text-secondary',
    border: 'border-secondary-100',
    dotBg: 'bg-secondary',
    defaultLabel: 'Verified Credential',
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
  },
  active: {
    bg: 'bg-secondary-50',
    text: 'text-secondary',
    border: 'border-secondary-100',
    dotBg: 'bg-secondary',
    defaultLabel: 'Active',
    icon: <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block" />,
  },
  gap: {
    bg: 'bg-warning-50',
    text: 'text-warning',
    border: 'border-warning-100',
    dotBg: 'bg-warning',
    defaultLabel: 'Skill Gap',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  pending: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dotBg: 'bg-amber-500',
    defaultLabel: 'Pending',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  inactive: {
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
    dotBg: 'bg-slate-400',
    defaultLabel: 'Inactive',
    icon: <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />,
  },
  failed: {
    bg: 'bg-danger-50',
    text: 'text-danger',
    border: 'border-danger-100',
    dotBg: 'bg-danger',
    defaultLabel: 'Failed',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

const SIZE_STYLES = {
  sm: 'text-[11px] px-2 py-0.5 gap-1',
  md: 'text-xs px-2.5 py-1 gap-1.5',
  lg: 'text-sm px-3 py-1.5 gap-2',
};

export const Badge: React.FC<BadgeProps> = ({
  status,
  label,
  size = 'md',
  icon,
  dot = false,
  className = '',
  id,
}) => {
  const normalizedKey = (status || '').toLowerCase().trim();
  const config = STATUS_CONFIGS[normalizedKey] || {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dotBg: 'bg-slate-500',
    defaultLabel: status,
    icon: null,
  };

  const displayText = label || config.defaultLabel;
  const activeIcon = icon !== undefined ? icon : dot ? null : config.icon;

  return (
    <span
      id={id}
      className={`inline-flex items-center font-medium rounded-full border tracking-tight ${config.bg} ${config.text} ${config.border} ${SIZE_STYLES[size]} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dotBg}`}
          aria-hidden="true"
        />
      )}
      {activeIcon && <span className="shrink-0 flex items-center">{activeIcon}</span>}
      <span className="truncate">{displayText}</span>
    </span>
  );
};

export default Badge;
