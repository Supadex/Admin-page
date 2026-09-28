import React from 'react';
import { StatCard } from '../data';
import { Badge } from '../ui';
import { formatUSD, shortenAddress } from '../../utils/formatters';
import {
  Coins,
  Wallet,
  ArrowDownUp,
  Layers,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { useState } from 'react';

interface TreasuryHUDProps {
  totalAccruedUSD: number;
  physicalErc20USD: number;
  vault6909ClaimsUSD: number;
  physicalRatio: number;
  claims6909Ratio: number;
  poolCount: number;
  targetTreasuryAddress: string;
}

export const TreasuryHUD: React.FC<TreasuryHUDProps> = ({
  totalAccruedUSD,
  physicalErc20USD,
  vault6909ClaimsUSD,
  physicalRatio,
  claims6909Ratio,
  poolCount,
  targetTreasuryAddress,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(targetTreasuryAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Top Readout Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Accrued Fees"
          value={formatUSD(totalAccruedUSD)}
          subValue={`across ${poolCount} pools`}
          change={{ value: '+8.4%', positive: true, period: 'vs last 7d' }}
          icon={<Coins className="w-4 h-4 text-emerald-500" />}
          badgeText="Accruing"
          badgeVariant="success"
        />

        <StatCard
          label="Physical ERC-20 Vault"
          value={formatUSD(physicalErc20USD)}
          subValue={`${physicalRatio.toFixed(1)}% of total accrued`}
          icon={<Wallet className="w-4 h-4 text-blue-500" />}
          badgeText="Physical Token"
          badgeVariant="info"
        />

        <StatCard
          label="ERC-6909 Claims"
          value={formatUSD(vault6909ClaimsUSD)}
          subValue={`${claims6909Ratio.toFixed(1)}% internal credits`}
          icon={<Layers className="w-4 h-4 text-purple-500" />}
          badgeText="Internal Ledger"
          badgeVariant="info"
        />

        <StatCard
          label="24h Sweep Velocity"
          value="$48,920"
          subValue="Est. daily run-rate"
          change={{ value: '14.2%', positive: true, period: 'volume index' }}
          icon={<ArrowDownUp className="w-4 h-4 text-amber-500" />}
          badgeText="Active"
          badgeVariant="default"
        />
      </div>

      {/* Target Treasury Routing Info Card */}
      <div className="p-4 rounded-2xl bg-surface-theme border border-hairline-theme flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-elevated-theme border border-hairline-theme">
            <Coins className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary-theme">
                DAO Fee Destination & Settlement Vault
              </span>
              <Badge variant="success">Verified Target</Badge>
            </div>
            <p className="text-xs text-secondary-theme font-mono mt-0.5">
              Target Treasury: {shortenAddress(targetTreasuryAddress, 8)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-xl border border-hairline-theme bg-elevated-theme hover:bg-subtle-theme text-secondary-theme hover:text-primary-theme transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Target</span>
              </>
            )}
          </button>

          <a
            href={`https://sepolia.etherscan.io/address/${targetTreasuryAddress}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-xl border border-hairline-theme bg-elevated-theme hover:bg-subtle-theme text-secondary-theme hover:text-primary-theme transition-colors"
          >
            <span>Explorer</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
