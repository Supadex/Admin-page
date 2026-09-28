import React, { useState } from 'react';
import { APP_CONFIG } from '../../utils/constants';
import { shortenAddress } from '../../utils/formatters';
import { Button } from '../ui/Button';
import { RoleBadge } from '../auth/RoleBadge';
import { AccountDetailsModal } from '../auth/AccountDetailsModal';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useAppKit } from '@reown/appkit/react';
import {
  Wallet,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';

export interface AdminHeaderProps {
  currentTabName: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  currentTabName,
  onRefresh,
  isRefreshing = false,
}) => {
  const { address, isConnected, activeRole, chain } = useAdminAuth();
  const { open } = useAppKit();
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  const activeNetworkName = chain?.name || APP_CONFIG.network.name;
  const activeChainId = chain?.id || APP_CONFIG.network.chainId;

  return (
    <>
      <header className="h-16 px-6 border-b border-hairline-theme bg-surface-theme/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
        {/* Breadcrumb / Title Area */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-secondary-theme">Governance Portal</span>
          <ChevronRight className="w-3.5 h-3.5 text-secondary-theme" />
          <span className="text-primary-theme font-medium capitalize font-sans text-sm">
            {currentTabName}
          </span>
        </div>

        {/* Institutional Telemetry & Web3 Controls */}
        <div className="flex items-center gap-3">
          {/* Network & Block Telemetry Badge */}
          <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-elevated-theme border border-hairline-theme text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="text-primary-theme">{activeNetworkName}</span>
            </div>
            <span className="text-tertiary-theme">|</span>
            <span className="text-secondary-theme">Chain: {activeChainId}</span>
            <span className="text-tertiary-theme">|</span>
            <span className="text-secondary-theme">Latency: {isConnected ? APP_CONFIG.network.rpcLatency : 'Offline'}</span>
          </div>

          {/* Sync Trigger */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-elevated-theme border border-hairline-theme text-secondary-theme hover:text-primary-theme hover:border-active-theme transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Refresh on-chain state"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isRefreshing ? 'animate-spin text-primary-theme' : ''
                }`}
              />
            </button>
          )}

          {/* Connected Admin Wallet Badge & Role Indicator */}
          {isConnected && address ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAccountModalOpen(true)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-elevated-theme border border-hairline-theme text-xs font-mono hover:border-active-theme transition-all cursor-pointer"
              >
                <RoleBadge role={activeRole} showIcon={false} size="sm" />
                <span className="text-primary-theme font-medium">
                  {shortenAddress(address, 4)}
                </span>
                <a
                  href={`https://sepolia.etherscan.io/address/${address}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-secondary-theme hover:text-primary-theme transition-colors"
                  title="View on Etherscan"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAccountModalOpen(true)}
                className="hidden md:flex gap-1.5 text-xs"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>RBAC Config</span>
              </Button>
            </div>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => open()}
              className="gap-1.5 text-xs font-semibold"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Connect Wallet</span>
            </Button>
          )}
        </div>
      </header>

      {/* Account & Privileges Modal */}
      <AccountDetailsModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
      />
    </>
  );
};
