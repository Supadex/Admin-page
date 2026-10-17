import React from 'react';
import type { RoleChangeDraft } from '../../hooks/useRoleManagement';
import { ConfirmModal, DiffViewer, JSONInspector } from '../data';
import { Badge } from '../ui';
import { shortenAddress } from '../../utils/formatters';

interface RoleGrantConfirmModalProps {
  isOpen: boolean;
  draft: RoleChangeDraft | null;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const RoleGrantConfirmModal: React.FC<RoleGrantConfirmModalProps> = ({
  isOpen,
  draft,
  isLoading = false,
  onClose,
  onConfirm,
}) => {
  if (!draft) return null;

  const delayLabel =
    draft.delaySeconds === 0
      ? 'Immediate (no timelock)'
      : draft.delaySeconds >= 3600
        ? `${Math.round(draft.delaySeconds / 3600)}h timelock`
        : `${draft.delaySeconds}s timelock`;

  const actionVerb = draft.active ? 'GRANT' : 'REVOKE';

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`${actionVerb} ${draft.role} Privilege`}
      description={
        draft.role === 'OWNER'
          ? 'This updates Timelock proposer status immediately. Only the Timelock admin can execute this call.'
          : `This schedules ${draft.functionName} through SupaTimelock. Execute after the governance delay (Anvil warps automatically).`
      }
      confirmText={draft.active ? 'Schedule / Apply Grant' : 'Schedule / Apply Revoke'}
      variant={draft.active ? 'warning' : 'danger'}
      requireTypedConfirmation
      confirmationKeyword={draft.active ? 'GRANT' : 'REVOKE'}
      isLoading={isLoading}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={draft.active ? 'success' : 'danger'}>{actionVerb}</Badge>
          <Badge variant="info">{draft.role}</Badge>
          <Badge variant="default">{delayLabel}</Badge>
        </div>

        <DiffViewer
          label="Wallet Privilege"
          description={`${draft.targetLabel} · ${draft.functionName}`}
          previousValue={
            draft.currentlyActive
              ? `${draft.role} ACTIVE · ${shortenAddress(draft.address, 6)}`
              : `No ${draft.role} · ${shortenAddress(draft.address, 6)}`
          }
          nextValue={
            draft.active
              ? `${draft.role} ACTIVE · ${shortenAddress(draft.address, 6)}`
              : `${draft.role} REVOKED · ${shortenAddress(draft.address, 6)}`
          }
          isDestructive={!draft.active}
        />

        <DiffViewer
          label="Execution Path"
          previousValue="—"
          nextValue={
            draft.delaySeconds === 0
              ? 'Direct setProposer'
              : `Timelock.schedule → ${draft.targetLabel}`
          }
        />

        <JSONInspector
          title="Call Preview"
          data={{
            function: draft.functionName,
            target: draft.targetContract,
            account: draft.address,
            active: draft.active,
            delaySeconds: draft.delaySeconds,
            callData: draft.callData,
          }}
          defaultExpanded
        />
      </div>
    </ConfirmModal>
  );
};
