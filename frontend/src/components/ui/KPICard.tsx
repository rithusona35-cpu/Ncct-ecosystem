'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';

export interface KPICardTrend {
  value: string | number;
  isPositive?: boolean;
  label?: string;
}

export interface KPICardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: KPICardTrend | string;
  description?: string;
  variant?: 'default' | 'primary' | 'secondary' | 'warning' | 'danger';
  className?: string;
  onClick?: () => void;
  id?: string;
}

const VARIANT_ICON_STYLES = {
  default: 'bg-primary-50 text-primary border-primary-100',
  primary: 'bg-primary-50 text-primary border-primary-200',
  secondary: 'bg-secondary-50 text-secondary border-secondary-100',
  warning: 'bg-warning-50 text-warning border-warning-100',
  danger: 'bg-danger-50 text-danger border-danger-100',
};

const VARIANT_ACCENT_STYLES = {
  default: 'border-l-primary',
  primary: 'border-l-primary',
  secondary: 'border-l-secondary',
  warning: 'border-l-warning',
  danger: 'border-l-danger',
};

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon,
  trend,
  description,
  variant = 'default',
  className = '',
  onClick,
  id,
}) => {
  const iconContainerClass = VARIANT_ICON_STYLES[variant] || VARIANT_ICON_STYLES.default;
  const accentClass = VARIANT_ACCENT_STYLES[variant] || VARIANT_ACCENT_STYLES.default;

  return (
    <div
      id={id}
      onClick={onClick}
      className={`relative bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 border-l-4 ${accentClass} ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {value}
            </span>
          </div>

          {trend && (
            <div className="mt-2.5 flex items-center gap-1.5 text-xs font-medium">
              {typeof trend === 'string' ? (
                <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {trend}
                </span>
              ) : (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${
                    trend.isPositive !== false
                      ? 'bg-secondary-50 text-secondary'
                      : 'bg-danger-50 text-danger'
                  }`}
                >
                  {trend.isPositive !== false ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  {trend.value}
                  {trend.label && (
                    <span className="text-slate-500 font-normal ml-0.5">
                      {trend.label}
                    </span>
                  )}
                </span>
              )}
            </div>
          )}

          {description && (
            <p className="mt-1.5 text-xs text-slate-500 line-clamp-1">{description}</p>
          )}
        </div>

        {icon && (
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${iconContainerClass}`}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default KPICard;
