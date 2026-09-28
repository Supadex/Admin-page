import React, { useState } from 'react';
import { TreasuryHUD } from './TreasuryHUD';
import { FeeSplitConfigCard } from './FeeSplitConfigCard';
import { PoolFeeBreakdownTable } from './PoolFeeBreakdownTable';
import { BatchSweepModal } from './BatchSweepModal';
import { useFeeTreasury } from '../../hooks/useFeeTreasury';
import { useAdminAuth } from '../../hooks/useAdminAuth';

export const TreasuryClaimsConsole: React.FC = () => {
  const {
    pools,
    selectedPoolIds,
    toggleSelectPool,
    selectAllPools,
    summary,
    feeSplit,
    updateFeeSplit,
    executeBatchSweep,
    isSweeping,
  } = useFeeTreasury();

  const { hasPermission } = useAdminAuth();
  const canSweep = hasPermission('admin.fee.claim');
  const canEditSplit = hasPermission('admin.governance.propose');

  const [isSweepModalOpen, setIsSweepModalOpen] = useState(false);
  const [poolsToSweep, setPoolsToSweep] = useState<typeof pools>([]);

  const handleInitiateSweep = (poolIds: string[]) => {
    const targets = pools.filter((p) => poolIds.includes(p.id));
    setPoolsToSweep(targets);
    setIsSweepModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* HUD Telemetry Cards */}
      <TreasuryHUD
        totalAccruedUSD={summary.totalAccruedUSD}
        physicalErc20USD={summary.physicalErc20USD}
        vault6909ClaimsUSD={summary.vault6909ClaimsUSD}
        physicalRatio={summary.physicalRatio}
        claims6909Ratio={summary.claims6909Ratio}
        poolCount={summary.poolCount}
        targetTreasuryAddress={feeSplit.targetTreasuryAddress}
      />

      {/* Fee Split Governance Regulator */}
      <FeeSplitConfigCard
        config={feeSplit}
        onUpdateSplit={updateFeeSplit}
        canEdit={canEditSplit}
      />

      {/* Per-Pool Fee Breakdown Table & Batch Sweep */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-tight text-primary-theme">
            Accrued Fee Ledger by Pool
          </h3>
          <span className="text-xs text-secondary-theme font-mono">
            {pools.length} active pool allocations
          </span>
        </div>

        <PoolFeeBreakdownTable
          pools={pools}
          selectedPoolIds={selectedPoolIds}
          onToggleSelectPool={toggleSelectPool}
          onSelectAllPools={selectAllPools}
          onInitiateSweep={handleInitiateSweep}
          canSweep={canSweep}
        />
      </div>

      {/* Batch Sweep Two-Step Confirmation Modal */}
      <BatchSweepModal
        isOpen={isSweepModalOpen}
        onClose={() => setIsSweepModalOpen(false)}
        selectedPools={poolsToSweep}
        targetTreasuryAddress={feeSplit.targetTreasuryAddress}
        onConfirmSweep={async (ids) => {
          return await executeBatchSweep(ids);
        }}
        isExecuting={isSweeping}
      />
    </div>
  );
};
