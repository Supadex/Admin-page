import React, { useState } from 'react';
import type { ManageableRole } from '../../hooks/useRoleManagement';
import { Button, Input, Select, Toggle } from '../ui';
import { isAddress } from 'viem';
import { KeyRound, Search } from 'lucide-react';

interface GrantRoleFormProps {
  disabled?: boolean;
  isSubmitting?: boolean;
  address: string;
  onAddressChange: (address: string) => void;
  onLookup: (address: string) => Promise<unknown>;
  onClearLookup: () => void;
  onPrepare: (address: string, role: ManageableRole, active: boolean) => void;
}

const ROLE_OPTIONS = [
  {
    value: 'OPERATOR',
    label: 'Operator',
    description: 'LVR calibration, pool create, fee sweep (timelocked)',
  },
  {
    value: 'GUARDIAN',
    label: 'Guardian',
    description: 'Emergency circuit-breaker pauses (timelocked)',
  },
  {
    value: 'OWNER',
    label: 'Owner (Proposer)',
    description: 'Timelock proposer — immediate admin setProposer',
  },
];

export const GrantRoleForm: React.FC<GrantRoleFormProps> = ({
  disabled = false,
  isSubmitting = false,
  address,
  onAddressChange,
  onLookup,
  onClearLookup,
  onPrepare,
}) => {
  const [role, setRole] = useState<ManageableRole>('OPERATOR');
  const [grantActive, setGrantActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async () => {
    setError(null);
    if (!isAddress(address.trim())) {
      setError('Enter a valid 0x wallet address');
      return;
    }
    await onLookup(address.trim());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isAddress(address.trim())) {
      setError('Enter a valid 0x wallet address');
      return;
    }
    onPrepare(address.trim(), role, grantActive);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-5 rounded-2xl bg-surface-theme border border-hairline-theme space-y-4"
    >
      <div className="flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-secondary-theme" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary-theme">
          Grant / Revoke Role
        </h3>
      </div>

      <Input
        label="Wallet Address"
        placeholder="0x…"
        value={address}
        onChange={(e) => {
          onAddressChange(e.target.value);
          onClearLookup();
          setError(null);
        }}
        disabled={disabled || isSubmitting}
        error={error ?? undefined}
        className="font-mono"
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isSubmitting || !address.trim()}
          onClick={() => void handleLookup()}
          className="text-xs gap-1.5 font-mono"
        >
          <Search className="w-3.5 h-3.5" />
          Lookup Live Roles
        </Button>
      </div>

      <Select
        label="Role"
        options={ROLE_OPTIONS}
        value={role}
        onChange={(v) => setRole(v as ManageableRole)}
        disabled={disabled || isSubmitting}
      />

      <Toggle
        checked={grantActive}
        onChange={setGrantActive}
        disabled={disabled || isSubmitting}
        label={grantActive ? 'Grant (active = true)' : 'Revoke (active = false)'}
        description={
          role === 'OWNER'
            ? 'Owner changes call Timelock.setProposer immediately (no delay).'
            : 'Operator / Guardian changes are scheduled through the Timelock delay.'
        }
        size="sm"
      />

      <div className="pt-2 flex justify-end">
        <Button
          type="submit"
          variant={grantActive ? 'primary' : 'danger'}
          size="sm"
          disabled={disabled || isSubmitting}
          isLoading={isSubmitting}
          className="text-xs font-mono"
        >
          {grantActive ? 'Review Grant' : 'Review Revoke'}
        </Button>
      </div>
    </form>
  );
};
