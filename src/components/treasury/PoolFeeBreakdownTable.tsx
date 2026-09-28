import React, { useState } from 'react';
import { Badge, Button } from '../ui';
import { formatUSD, formatAmount, shortenAddress } from '../../utils/formatters';
import {
  Send,
  Search,
  CheckSquare,
  Square,
  ArrowUpDown,
  Layers,
  Wallet,
} from 'lucide-react';
import type { PoolFeeRecord } from '../../hooks/useFeeTreasury';

interface PoolFeeBreakdownTableProps {
  pools: (PoolFeeRecord & { totalUSDValue: number; val0: number; val1: number })[];
  selectedPoolIds: string[];
  onToggleSelectPool: (id: string) => void;
  onSelectAllPools: () => void;
  onInitiateSweep: (poolIds: string[]) => void;
  canSweep: boolean;
}

export const PoolFeeBreakdownTable: React.FC<PoolFeeBreakdownTableProps> = ({
  pools,
  selectedPoolIds,
  onToggleSelectPool,
  onSelectAllPools,
  onInitiateSweep,
  canSweep,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PHYSICAL' | '6909'>('ALL');
  const [sortBy, setSortBy] = useState<'valDesc' | 'valAsc' | 'pair'>('valDesc');

  const filteredPools = pools
    .filter((pool) => {
      const matchesSearch =
        pool.pair.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pool.curveType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pool.id.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (filterType === 'PHYSICAL') return !pool.is6909Claim;
      if (filterType === '6909') return pool.is6909Claim;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'valDesc') return b.totalUSDValue - a.totalUSDValue;
      if (sortBy === 'valAsc') return a.totalUSDValue - b.totalUSDValue;
      if (sortBy === 'pair') return a.pair.localeCompare(b.pair);
      return 0;
    });

  const allSelected =
    filteredPools.length > 0 &&
    filteredPools.every((p) => selectedPoolIds.includes(p.id));

  const someSelected =
    filteredPools.some((p) => selectedPoolIds.includes(p.id)) && !allSelected;

  const totalSelectedUSD = filteredPools
    .filter((p) => selectedPoolIds.includes(p.id))
    .reduce((acc, p) => acc + p.totalUSDValue, 0);

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-secondary-theme absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search pool or asset..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface-theme border border-hairline-theme rounded-xl text-primary-theme placeholder-secondary-theme focus:outline-none focus:border-hairline-theme"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center p-1 bg-surface-theme border border-hairline-theme rounded-xl text-xs">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filterType === 'ALL'
                  ? 'bg-elevated-theme text-primary-theme font-semibold'
                  : 'text-secondary-theme hover:text-primary-theme'
              }`}
            >
              All Ledgers
            </button>
            <button
              onClick={() => setFilterType('PHYSICAL')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filterType === 'PHYSICAL'
                  ? 'bg-elevated-theme text-primary-theme font-semibold'
                  : 'text-secondary-theme hover:text-primary-theme'
              }`}
            >
              Physical ERC-20
            </button>
            <button
              onClick={() => setFilterType('6909')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filterType === '6909'
                  ? 'bg-elevated-theme text-primary-theme font-semibold'
                  : 'text-secondary-theme hover:text-primary-theme'
              }`}
            >
              ERC-6909 Claims
            </button>
          </div>
        </div>

        {/* Batch Action Toolbar */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {selectedPoolIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-secondary-theme">
                {selectedPoolIds.length} selected ({formatUSD(totalSelectedUSD)})
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onInitiateSweep(selectedPoolIds)}
                disabled={!canSweep || totalSelectedUSD === 0}
                className="text-xs gap-1.5 font-mono"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Sweep Selected</span>
              </Button>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setSortBy((prev) =>
                prev === 'valDesc' ? 'valAsc' : prev === 'valAsc' ? 'pair' : 'valDesc'
              )
            }
            className="text-xs gap-1.5"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>
              Sort: {sortBy === 'valDesc' ? 'Value (High)' : sortBy === 'valAsc' ? 'Value (Low)' : 'Pair'}
            </span>
          </Button>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="rounded-2xl border border-hairline-theme bg-surface-theme overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-subtle-theme border-b border-hairline-theme text-[11px] font-mono text-secondary-theme uppercase">
              <tr>
                <th className="py-3 px-4 w-10">
                  <button
                    onClick={onSelectAllPools}
                    className="text-secondary-theme hover:text-primary-theme transition-colors cursor-pointer"
                  >
                    {allSelected ? (
                      <CheckSquare className="w-4 h-4 text-emerald-500" />
                    ) : someSelected ? (
                      <Square className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4">Pool & Curve</th>
                <th className="py-3 px-4">Ledger Type</th>
                <th className="py-3 px-4">Uncollected Balances</th>
                <th className="py-3 px-4 text-right">Estimated USD Value</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline-theme">
              {filteredPools.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-secondary-theme">
                    No protocol fees match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredPools.map((pool) => {
                  const isSelected = selectedPoolIds.includes(pool.id);
                  const curveBadgeVariant =
                    pool.curveType === 'CLAMM'
                      ? 'info'
                      : pool.curveType === 'BinAMM'
                      ? 'curve'
                      : 'warning';

                  return (
                    <tr
                      key={pool.id}
                      className={`hover:bg-subtle-theme/50 transition-colors ${
                        isSelected ? 'bg-emerald-500/5' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => onToggleSelectPool(pool.id)}
                          className="text-secondary-theme hover:text-primary-theme transition-colors cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Pool & Curve */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-primary-theme font-mono">
                              {pool.pair}
                            </span>
                            <Badge variant={curveBadgeVariant} size="sm">
                              {pool.curveType}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-secondary-theme font-mono">
                            <span>Fee: {pool.feeTier}</span>
                            <span>•</span>
                            <span>ID: {shortenAddress(pool.id, 4)}</span>
                          </div>
                        </div>
                      </td>

                      {/* Ledger Type */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {pool.is6909Claim ? (
                            <Badge variant="curve" size="sm" className="gap-1 font-mono">
                              <Layers className="w-3 h-3 text-purple-400" />
                              <span>ERC-6909 Claim</span>
                            </Badge>
                          ) : (
                            <Badge variant="info" size="sm" className="gap-1 font-mono">
                              <Wallet className="w-3 h-3 text-blue-400" />
                              <span>ERC-20 Physical</span>
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Accrued Balances */}
                      <td className="py-3 px-4 font-mono">
                        <div className="space-y-0.5">
                          <div className="text-primary-theme">
                            {formatAmount(pool.uncollectedToken0)} {pool.token0Symbol}
                          </div>
                          <div className="text-secondary-theme text-[11px]">
                            {formatAmount(pool.uncollectedToken1)} {pool.token1Symbol}
                          </div>
                        </div>
                      </td>

                      {/* Total USD Value */}
                      <td className="py-3 px-4 text-right font-mono">
                        <div className="space-y-0.5">
                          <span className="text-primary-theme font-semibold text-sm">
                            {formatUSD(pool.totalUSDValue)}
                          </span>
                          <div className="text-[10px] text-secondary-theme">
                            {pool.uncollectedToken0 > 0 || pool.uncollectedToken1 > 0
                              ? 'Uncollected'
                              : 'Swept'}
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onInitiateSweep([pool.id])}
                          disabled={!canSweep || pool.totalUSDValue === 0}
                          className="text-xs font-mono gap-1"
                        >
                          <Send className="w-3 h-3" />
                          <span>Sweep</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
