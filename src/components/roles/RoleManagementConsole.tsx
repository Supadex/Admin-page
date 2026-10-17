import React, { useState } from 'react';
import {
  useRoleManagement,
  type ManageableRole,
  type RoleChangeDraft,
} from '../../hooks/useRoleManagement';
import { AccessDeniedBanner } from '../auth/AccessDeniedBanner';
import { StatCard } from '../data';
import { Button, useToast } from '../ui';
import { GrantRoleForm } from './GrantRoleForm';
import { RoleGrantConfirmModal } from './RoleGrantConfirmModal';
import { RoleRosterTable } from './RoleRosterTable';
import { RoleTimelockQueue } from './RoleTimelockQueue';
import { KeyRound, RefreshCw, Shield, UserCog, Users } from 'lucide-react';
import { shortenAddress } from '../../utils/formatters';

interface RoleManagementConsoleProps {
  onOpenAccountModal?: () => void;
}

export const RoleManagementConsole: React.FC<RoleManagementConsoleProps> = ({
  onOpenAccountModal,
}) => {
  const toast = useToast();
  const {
    roster,
    queue,
    isLoadingRoster,
    isSubmitting,
    minDelaySeconds,
    canManageRoles,
    isAnvil,
    address,
    buildDraft,
    submitRoleChange,
    executeRoleAction,
    cancelRoleAction,
    refreshRoster,
    lookupAddress,
    clearLookup,
    isUserRejectedError,
  } = useRoleManagement();

  const [formAddress, setFormAddress] = useState('');
  const [draft, setDraft] = useState<RoleChangeDraft | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const ownerCount = roster.filter((e) => e.role === 'OWNER' && e.active).length;
  const guardianCount = roster.filter((e) => e.role === 'GUARDIAN' && e.active).length;
  const operatorCount = roster.filter((e) => e.role === 'OPERATOR' && e.active).length;
  const pendingCount = queue.filter((q) => !q.executed && !q.canceled).length;

  const handlePrepare = async (raw: string, role: ManageableRole, active: boolean) => {
    try {
      const next = await buildDraft(raw, role, active);
      if (next.currentlyActive === active) {
        toast.info(`Wallet already has ${role} ${active ? 'active' : 'revoked'}.`);
        return;
      }
      setDraft(next);
      setConfirmOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to prepare role change');
    }
  };

  const handleConfirm = async () => {
    if (!draft) return;
    try {
      const proposer = address ? shortenAddress(address, 4) : 'unknown';
      const result = await submitRoleChange(draft, proposer);
      setConfirmOpen(false);
      setDraft(null);
      toast.success(
        result.mode === 'direct'
          ? `${draft.active ? 'Granted' : 'Revoked'} ${draft.role}`
          : isAnvil
            ? `${draft.role} change executed on Anvil`
            : `${draft.role} change scheduled`,
        shortenAddress(draft.address, 6)
      );
      clearLookup();
      await refreshRoster();
    } catch (err) {
      if (isUserRejectedError(err)) {
        toast.info('Transaction rejected in wallet');
        return;
      }
      toast.error(err instanceof Error ? err.message : 'Role change failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-surface-theme border border-hairline-theme flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-500" />
            <h2 className="text-base font-bold text-primary-theme">
              Role Management & RBAC Grants
            </h2>
          </div>
          <p className="text-xs text-secondary-theme max-w-xl">
            Grant or revoke Operator, Guardian, and Owner (proposer) wallets on-chain. Operator and
            Guardian writes go through SupaTimelock; Owner uses direct setProposer.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refreshRoster()}
          disabled={isLoadingRoster}
          className="text-xs gap-1.5 font-mono shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRoster ? 'animate-spin' : ''}`} />
          Refresh Roster
        </Button>
      </div>

      {!canManageRoles && (
        <AccessDeniedBanner
          requiredRole="OWNER"
          actionName="grant or revoke administrative roles"
          onOpenAccountModal={onOpenAccountModal}
        />
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Owners"
          value={String(ownerCount)}
          subValue="Timelock proposers"
          icon={<Shield className="w-4 h-4" />}
        />
        <StatCard
          label="Guardians"
          value={String(guardianCount)}
          subValue="Circuit breaker"
          icon={<Shield className="w-4 h-4" />}
        />
        <StatCard
          label="Operators"
          value={String(operatorCount)}
          subValue="Calibration / fees"
          icon={<UserCog className="w-4 h-4" />}
        />
        <StatCard
          label="Pending Ops"
          value={String(pendingCount)}
          subValue={isAnvil ? 'Anvil auto-execute' : `${Math.round(minDelaySeconds / 3600)}h delay`}
          icon={<Users className="w-4 h-4" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <GrantRoleForm
            disabled={!canManageRoles}
            isSubmitting={isSubmitting}
            address={formAddress}
            onAddressChange={setFormAddress}
            onLookup={lookupAddress}
            onClearLookup={clearLookup}
            onPrepare={(addr, role, active) => void handlePrepare(addr, role, active)}
          />
        </div>
        <div className="lg:col-span-3">
          <RoleRosterTable
            entries={roster}
            isLoading={isLoadingRoster}
            onSelectAddress={(addr) => setFormAddress(addr)}
          />
        </div>
      </div>

      <RoleTimelockQueue
        queue={queue}
        onExecute={(id) => {
          void executeRoleAction(id).catch((err) => {
            if (!isUserRejectedError(err)) {
              toast.error(err instanceof Error ? err.message : 'Execute failed');
            }
          });
        }}
        onCancel={(id) => {
          void cancelRoleAction(id).catch((err) => {
            if (!isUserRejectedError(err)) {
              toast.error(err instanceof Error ? err.message : 'Cancel failed');
            }
          });
        }}
        canExecute={canManageRoles}
        isSubmitting={isSubmitting}
        minDelaySeconds={minDelaySeconds}
        isAnvil={isAnvil}
      />

      <RoleGrantConfirmModal
        isOpen={confirmOpen}
        draft={draft}
        isLoading={isSubmitting}
        onClose={() => {
          setConfirmOpen(false);
          setDraft(null);
        }}
        onConfirm={handleConfirm}
      />
    </div>
  );
};
