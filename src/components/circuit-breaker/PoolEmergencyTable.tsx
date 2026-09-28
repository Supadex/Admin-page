import React, { useState } from 'react';
import { AuditTable, type AuditColumn } from '../data/AuditTable';
import { Badge, Button } from '../ui';
import { formatUSD } from '../../utils/formatters';
import { Power, Clock, ExternalLink } from 'lucide-react';

export interface PoolEmergencyItem {
  id: string;
  pair: string;
  curveType: 'CLAMM' | 'BinAMM' | 'StableAMM';
  feeTier: string;
  tvlUSD: number;
  volume24h: number;
  hookAddress: string;
}

interface PoolEmergencyTableProps {
  pools: PoolEmergencyItem[];
  pausedPools: Record<string, boolean>;
  onTogglePool: (poolId: string, isPaused: boolean) => void;
  canTriggerPause: boolean;
  canManageTimelock: boolean;
  isSubmitting: boolean;
}

export const PoolEmergencyTable: React.FC<PoolEmergencyTableProps> = ({
  pools,
  pausedPools,
  onTogglePool,
  canTriggerPause,
  canManageTimelock,
  isSubmitting,
}) => {
  const [filterCurve, setFilterCurve] = useState<'ALL' | 'CLAMM' | 'BinAMM' | 'StableAMM'>('ALL');

  const filteredPools = pools.filter((p) => {
    if (filterCurve === 'ALL') return true;
    return p.curveType === filterCurve;
  });

  const columns: AuditColumn<PoolEmergencyItem>[] = [
    {
      key: 'pair',
      header: 'Pool Pair / Key',
      render: (pool) => (
        <div className="space-y-0.5 font-mono">
          <div className="font-semibold text-primary-theme text-xs flex items-center gap-1.5">
            <span>{pool.pair}</span>
          </div>
          <span className="text-[11px] text-secondary-theme">{pool.id}</span>
        </div>
      ),
    },
    {
      key: 'curveType',
      header: 'Curve Engine',
      render: (pool) => {
        const variant =
          pool.curveType === 'CLAMM'
            ? 'info'
            : pool.curveType === 'BinAMM'
            ? 'curve'
            : 'warning';
        return <Badge variant={variant}>{pool.curveType}</Badge>;
      },
    },
    {
      key: 'tvlUSD',
      header: 'TVL',
      render: (pool) => (
        <span className="font-mono text-xs text-primary-theme">
          {formatUSD(pool.tvlUSD)}
        </span>
      ),
    },
    {
      key: 'volume24h',
      header: '24h Volume',
      render: (pool) => (
        <span className="font-mono text-xs text-secondary-theme">
          {formatUSD(pool.volume24h)}
        </span>
      ),
    },
    {
      key: 'hookAddress',
      header: 'Hook Attachment',
      render: (pool) => (
        <div className="flex items-center gap-1 font-mono text-[11px] text-secondary-theme">
          <span>{pool.hookAddress}</span>
          <ExternalLink className="w-3 h-3 text-secondary-theme" />
        </div>
      ),
    },
    {
      key: 'id',
      header: 'Circuit State',
      render: (pool) => {
        const isPaused = !!pausedPools[pool.id];
        return (
          <Badge variant={isPaused ? 'danger' : 'success'}>
            {isPaused ? 'ISOLATED' : 'ACTIVE'}
          </Badge>
        );
      },
    },
    {
      key: 'id',
      header: 'Emergency Action',
      align: 'right',
      render: (pool) => {
        const isPaused = !!pausedPools[pool.id];
        if (isPaused) {
          return (
            <Button
              variant="outline"
              size="sm"
              disabled={!canManageTimelock || isSubmitting}
              onClick={() => onTogglePool(pool.id, true)}
              className="text-xs gap-1.5 font-mono"
            >
              <Clock className="w-3 h-3 text-amber-500" />
              <span>Queue Unpause</span>
            </Button>
          );
        }
        return (
          <Button
            variant="danger"
            size="sm"
            disabled={!canTriggerPause || isSubmitting}
            onClick={() => onTogglePool(pool.id, false)}
            className="text-xs gap-1.5 font-mono"
          >
            <Power className="w-3 h-3" />
            <span>Pause Pool</span>
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary-theme">
            Tier 1: Per-Pool Circuit Breaker Control
          </h3>
          <p className="text-xs text-secondary-theme">
            Individual pool isolation for sudden exploit defense without halting unaffected pairs.
          </p>
        </div>

        {/* Filter curve tabs */}
        <div className="flex items-center p-1 rounded-xl bg-surface-theme border border-hairline-theme text-xs font-mono">
          {(['ALL', 'CLAMM', 'BinAMM', 'StableAMM'] as const).map((curve) => (
            <button
              key={curve}
              onClick={() => setFilterCurve(curve)}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                filterCurve === curve
                  ? 'bg-elevated-theme text-primary-theme font-semibold shadow-sm'
                  : 'text-secondary-theme hover:text-primary-theme'
              }`}
            >
              {curve}
            </button>
          ))}
        </div>
      </div>

      <AuditTable
        columns={columns}
        data={filteredPools}
        searchFilter={(p, q) =>
          p.pair.toLowerCase().includes(q.toLowerCase()) ||
          p.id.toLowerCase().includes(q.toLowerCase()) ||
          p.curveType.toLowerCase().includes(q.toLowerCase())
        }
        searchPlaceholder="Filter isolated or active pools by pair / address..."
      />
    </div>
  );
};
