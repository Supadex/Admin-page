import React from 'react';
import { cn } from '../../utils/cn';

export interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  change?: {
    value: string | number;
    positive?: boolean;
    neutral?: boolean;
    period?: string;
  };
  icon?: React.ReactNode;
  badgeText?: string;
  badgeVariant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  change,
  icon,
  badgeText,
  badgeVariant = 'default',
  onClick,
  className,
}) => {
  const badgeStyles = {
    default: 'bg-subtle-theme text-secondary-theme border-hairline-theme',
    success: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    danger: 'bg-red-500/10 text-red-500 border-red-500/20',
    info: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-2xl p-5 transition-all duration-200 border',
        'bg-surface-theme border-hairline-theme text-primary-theme',
        'hover:border-active-theme hover:bg-elevated-theme',
        onClick && 'cursor-pointer active:scale-[0.99]',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          {icon && (
            <div className="p-2 rounded-xl bg-subtle-theme border border-hairline-theme text-secondary-theme">
              {icon}
            </div>
          )}
          <span className="text-xs font-medium tracking-wide uppercase text-secondary-theme">
            {label}
          </span>
        </div>

        {badgeText && (
          <span
            className={cn(
              'px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase rounded-full border',
              badgeStyles[badgeVariant]
            )}
          >
            {badgeText}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight text-primary-theme font-mono">
          {value}
        </span>
        {subValue && (
          <span className="text-xs text-secondary-theme font-mono">
            {subValue}
          </span>
        )}
      </div>

      {change && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs font-mono">
          <span
            className={cn(
              'font-medium',
              change.neutral
                ? 'text-secondary-theme'
                : change.positive
                ? 'text-emerald-500'
                : 'text-red-500'
            )}
          >
            {change.positive && !change.neutral ? '+' : ''}
            {change.value}
          </span>
          {change.period && (
            <span className="text-[11px] text-tertiary-theme">
              {change.period}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
