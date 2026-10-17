import React from 'react';
import type { RoleRosterEntry } from '../../hooks/useRoleManagement';
import { RoleBadge } from '../auth/RoleBadge';
import { Badge } from '../ui';
import { shortenAddress } from '../../utils/formatters';
import { ExternalLink, Users } from 'lucide-react';

interface RoleRosterTableProps {
  entries: RoleRosterEntry[];
  isLoading?: boolean;
  emptyLabel?: string;
  onSelectAddress?: (address: string) => void;
}

export const RoleRosterTable: React.FC<RoleRosterTableProps> = ({
  entries,
  isLoading = false,
  emptyLabel = 'No active role assignments found on-chain.',
  onSelectAddress,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-secondary-theme" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary-theme">
            Active Role Roster
          </h3>
        </div>
        <Badge variant="default">{entries.length} Active</Badge>
      </div>

      {isLoading ? (
        <div className="p-8 rounded-2xl bg-surface-theme border border-hairline-theme text-center">
          <p className="text-xs text-secondary-theme font-mono">Loading on-chain role events…</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="p-8 rounded-2xl bg-surface-theme border border-hairline-theme text-center">
          <p className="text-xs text-secondary-theme font-mono">{emptyLabel}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-hairline-theme overflow-hidden bg-surface-theme">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-hairline-theme bg-elevated-theme/60">
                  <th className="px-4 py-3 font-mono uppercase tracking-wider text-secondary-theme font-medium">
                    Wallet
                  </th>
                  <th className="px-4 py-3 font-mono uppercase tracking-wider text-secondary-theme font-medium">
                    Role
                  </th>
                  <th className="px-4 py-3 font-mono uppercase tracking-wider text-secondary-theme font-medium">
                    Status
                  </th>
                  <th className="px-4 py-3 font-mono uppercase tracking-wider text-secondary-theme font-medium text-right">
                    Block
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={`${entry.role}-${entry.address}`}
                    className="border-b border-hairline-theme last:border-0 hover:bg-elevated-theme/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-mono">
                        {onSelectAddress ? (
                          <button
                            type="button"
                            onClick={() => onSelectAddress(entry.address)}
                            className="text-primary-theme hover:underline cursor-pointer"
                            title={entry.address}
                          >
                            {shortenAddress(entry.address, 6)}
                          </button>
                        ) : (
                          <span className="text-primary-theme" title={entry.address}>
                            {shortenAddress(entry.address, 6)}
                          </span>
                        )}
                        <a
                          href={`https://sepolia.etherscan.io/address/${entry.address}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-secondary-theme hover:text-primary-theme"
                          title="View on Explorer"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={entry.role} showIcon={false} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={entry.active ? 'success' : 'default'}>
                        {entry.active ? 'ACTIVE' : 'REVOKED'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-secondary-theme">
                      {entry.lastUpdatedBlock != null ? `#${entry.lastUpdatedBlock}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {onSelectAddress && entries.length > 0 && (
        <p className="text-[11px] text-secondary-theme">
          Click a wallet address to load it into the grant form.
        </p>
      )}
    </div>
  );
};
