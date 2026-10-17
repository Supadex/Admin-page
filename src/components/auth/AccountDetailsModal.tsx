import React from 'react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { RoleBadge } from './RoleBadge';
import { shortenAddress } from '../../utils/formatters';
import { ExternalLink, Check, Copy, LogOut, Wallet, KeyRound } from 'lucide-react';
import { useAppKit } from '@reown/appkit/react';

interface AccountDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onManageRoles?: () => void;
}

export const AccountDetailsModal: React.FC<AccountDetailsModalProps> = ({
  isOpen,
  onClose,
  onManageRoles,
}) => {
  const {
    address,
    isConnected,
    activeRole,
    activeRoleDef,
    disconnect,
  } = useAdminAuth();
  const { open } = useAppKit();
  const [copied, setCopied] = React.useState(false);

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleOpenAppKit = () => {
    onClose();
    open();
  };

  const handleDisconnect = () => {
    disconnect();
    onClose();
  };

  const handleManageRoles = () => {
    onClose();
    onManageRoles?.();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Admin Account & Privileges"
      description="View connected address credentials and the live on-chain governance tier for this wallet."
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Connected Wallet Box */}
        <div className="p-4 rounded-xl bg-elevated-theme border border-hairline-theme space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary-theme">
              {isConnected ? 'Active Account' : 'Account Status'}
            </span>
            <RoleBadge role={activeRole} />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-surface-theme border border-hairline-theme flex items-center justify-center">
                <img
                  src="/assets/images/supadao-logo.png"
                  alt="SupaDex"
                  className="w-5 h-5 rounded-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-sm font-semibold text-primary-theme">
                  {address ? shortenAddress(address, 6) : 'Not Connected'}
                </span>
                <span className="text-[10px] text-secondary-theme font-mono">
                  {isConnected ? 'Live On-Chain Account' : 'Guest / Disconnected'}
                </span>
              </div>
            </div>

            {address && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={copyAddress}
                  className="p-1.5 rounded-lg border border-hairline-theme text-secondary-theme hover:text-primary-theme hover:bg-surface-theme transition-colors cursor-pointer"
                  title="Copy Address"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <a
                  href={`https://sepolia.etherscan.io/address/${address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg border border-hairline-theme text-secondary-theme hover:text-primary-theme hover:bg-surface-theme transition-colors"
                  title="View on Explorer"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Role Permissions Readout */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-primary-theme">{activeRoleDef.title}</span>
            <span className="font-mono text-secondary-theme">
              {activeRoleDef.permissions.length} active permissions
            </span>
          </div>
          <p className="text-xs text-secondary-theme leading-relaxed">
            {activeRoleDef.description}
          </p>

          <div className="pt-2 flex flex-wrap gap-1.5">
            {activeRoleDef.permissions.length > 0 ? (
              activeRoleDef.permissions.map((perm) => (
                <span
                  key={perm}
                  className="px-2 py-0.5 rounded-md bg-elevated-theme border border-hairline-theme text-[10px] font-mono text-secondary-theme"
                >
                  {perm}
                </span>
              ))
            ) : (
              <span className="text-xs text-secondary-theme italic">
                No state-altering administrative permissions granted.
              </span>
            )}
          </div>
        </div>

        {/* Roles management CTA */}
        <div className="p-4 rounded-xl border border-hairline-theme bg-surface-theme/50 space-y-3">
          <div className="flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-secondary-theme" />
            <span className="text-xs font-semibold text-primary-theme">
              Role Management
            </span>
          </div>
          <p className="text-xs text-secondary-theme leading-relaxed">
            Granting or revoking Operator, Guardian, or Owner wallets is done from the Role
            Management console. This panel only shows the privileges of the wallet you have
            connected.
          </p>
          {onManageRoles && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleManageRoles}
              className="text-xs gap-1.5 font-mono"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Open Role Management
            </Button>
          )}
        </div>

        {/* Actions Row */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-hairline-theme">
          {isConnected ? (
            <Button
              variant="danger"
              size="sm"
              onClick={handleDisconnect}
              className="text-xs gap-1.5 font-mono"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Disconnect Session</span>
            </Button>
          ) : (
            <Button
              variant="brand"
              size="sm"
              onClick={handleOpenAppKit}
              className="text-xs gap-1.5 font-semibold"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Connect Wallet</span>
            </Button>
          )}

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            {isConnected && (
              <Button variant="primary" size="sm" onClick={handleOpenAppKit}>
                Manage Wallet
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
