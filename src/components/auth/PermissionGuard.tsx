import React from 'react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { Lock } from 'lucide-react';

interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  disableInsteadOfHide?: boolean;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  children,
  fallback,
  disableInsteadOfHide = false,
}) => {
  const { hasPermission, activeRole } = useAdminAuth();
  const allowed = hasPermission(permission);

  if (allowed) {
    return <>{children}</>;
  }

  if (disableInsteadOfHide) {
    return (
      <div className="relative group cursor-not-allowed">
        <div className="opacity-40 pointer-events-none filter grayscale">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-surface-theme/70 backdrop-blur-[2px] rounded-xl border border-hairline-theme">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-elevated-theme border border-hairline-theme rounded-lg text-xs font-mono text-secondary-theme shadow-md">
            <Lock className="w-3 h-3 text-amber-500" />
            <span>Requires {permission.split('.')[1]?.toUpperCase()} access ({activeRole})</span>
          </div>
        </div>
      </div>
    );
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return null;
};
