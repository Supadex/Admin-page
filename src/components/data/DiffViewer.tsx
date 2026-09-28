import React from 'react';
import { cn } from '../../utils/cn';
import { ArrowRight, AlertTriangle } from 'lucide-react';

export interface DiffViewerProps {
  label: string;
  description?: string;
  previousValue: string | number;
  nextValue: string | number;
  unit?: string;
  isDestructive?: boolean;
  className?: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  label,
  description,
  previousValue,
  nextValue,
  unit = '',
  isDestructive = false,
  className,
}) => {
  const isChanged = String(previousValue) !== String(nextValue);

  return (
    <div
      className={cn(
        'p-4 rounded-xl border bg-elevated-theme transition-colors',
        isDestructive && isChanged
          ? 'border-amber-500/30 bg-amber-500/[0.04]'
          : 'border-hairline-theme',
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isDestructive && isChanged && (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          )}
          <span className="text-xs font-medium text-secondary-theme tracking-wide uppercase">
            {label}
          </span>
        </div>
        {!isChanged && (
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-subtle-theme text-secondary-theme">
            Unchanged
          </span>
        )}
      </div>

      {description && (
        <p className="text-xs text-secondary-theme mb-3">{description}</p>
      )}

      <div className="flex items-center gap-3 font-mono text-sm">
        {/* Previous Value */}
        <div className="flex-1 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500">
          <div className="text-[10px] uppercase text-red-500/80 mb-0.5 font-sans">Current</div>
          <div className="truncate font-semibold">
            {String(previousValue)} {unit}
          </div>
        </div>

        {/* Transition Arrow */}
        <div className="shrink-0 text-secondary-theme">
          <ArrowRight className="w-4 h-4" />
        </div>

        {/* Next Value */}
        <div
          className={cn(
            'flex-1 p-2.5 rounded-lg border',
            isChanged
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
              : 'bg-subtle-theme border-hairline-theme text-secondary-theme'
          )}
        >
          <div className="text-[10px] uppercase text-emerald-500/80 mb-0.5 font-sans">Proposed</div>
          <div className="truncate font-semibold">
            {String(nextValue)} {unit}
          </div>
        </div>
      </div>
    </div>
  );
};
