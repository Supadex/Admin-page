import React from 'react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { Lock, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';

interface AccessDeniedBannerProps {
  requiredRole?: string;
  actionName?: string;
  onOpenAccountModal?: () => void;
}

export const AccessDeniedBanner: React.FC<AccessDeniedBannerProps> = ({
  requiredRole = 'OWNER or GUARDIAN',
  actionName = 'execute state-altering administrative commands',
  onOpenAccountModal,
}) => {
  const { activeRole } = useAdminAuth();

  return (
    <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 mt-0.5">
          <Lock className="w-4 h-4" />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-primary-theme">
              Restricted Administrative Action
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-elevated-theme border border-hairline-theme text-secondary-theme">
              Current: {activeRole}
            </span>
          </div>
          <p className="text-xs text-secondary-theme leading-relaxed">
            Your connected account requires <span className="font-semibold text-primary-theme">{requiredRole}</span> role privileges to {actionName}.
          </p>
        </div>
      </div>

      {onOpenAccountModal && (
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenAccountModal}
          className="text-xs gap-1.5 shrink-0"
        >
          <AlertCircle className="w-3.5 h-3.5 text-secondary-theme" />
          <span>Switch Credential</span>
        </Button>
      )}
    </div>
  );
};
