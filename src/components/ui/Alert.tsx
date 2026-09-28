import React from 'react';
import { cn } from '../../utils/cn';
import { Info, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'warning' | 'error' | 'success' | 'lvr';
  title?: string;
  icon?: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({
  className,
  variant = 'info',
  title,
  icon,
  children,
  ...props
}) => {
  const variants = {
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-300',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
    error: 'bg-red-500/10 border-red-500/20 text-red-300',
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
    lvr: 'bg-purple-500/10 border-purple-500/20 text-purple-300',
  };

  const defaultIcons = {
    info: <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />,
    error: <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />,
    lvr: <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />,
  };

  return (
    <div
      className={cn('flex items-start gap-3 p-4 rounded-xl border text-xs leading-relaxed', variants[variant], className)}
      {...props}
    >
      {icon || defaultIcons[variant]}
      <div className="flex-1">
        {title && <h5 className="font-semibold text-white mb-0.5">{title}</h5>}
        <div className="text-neutral-300 dark:text-neutral-300 light:text-neutral-700">{children}</div>
      </div>
    </div>
  );
};
