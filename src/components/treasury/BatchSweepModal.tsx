import React, { useState } from 'react';
import { Modal, Button, Badge } from '../ui';
import { DiffViewer, JSONInspector } from '../data';
import { formatUSD, shortenAddress } from '../../utils/formatters';
import { Send, CheckCircle2 } from 'lucide-react';
import type { PoolFeeRecord } from '../../hooks/useFeeTreasury';

interface BatchSweepModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPools: (PoolFeeRecord & { totalUSDValue: number })[];
  targetTreasuryAddress: string;
  onConfirmSweep: (poolIds: string[]) => Promise<{
    success: boolean;
    txHash: string;
    sweptCount: number;
    recipient: string;
  }>;
  isExecuting: boolean;
}

export const BatchSweepModal: React.FC<BatchSweepModalProps> = ({
  isOpen,
  onClose,
  selectedPools,
  targetTreasuryAddress,
  onConfirmSweep,
  isExecuting,
}) => {
  const [confirmedTxHash, setConfirmedTxHash] = useState<string | null>(null);

  const totalUSD = selectedPools.reduce((acc, p) => acc + p.totalUSDValue, 0);

  const handleSweep = async () => {
    const res = await onConfirmSweep(selectedPools.map((p) => p.id));
    if (res.success) {
      setConfirmedTxHash(res.txHash);
    }
  };

  const handleModalClose = () => {
    setConfirmedTxHash(null);
    onClose();
  };

  // Mock calldata for inspector
  const mockCalldata = {
    function: 'sweepProtocolFees(bytes32[] poolIds, address recipient)',
    contract: '0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f (SupaFeeCollector)',
    poolIds: selectedPools.map((p) => p.id),
    recipient: targetTreasuryAddress,
    estimatedGasUnits: 142000 + selectedPools.length * 48000,
    estimatedGasCostETH: '0.0042 ETH (~$11.13)',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={confirmedTxHash ? 'Treasury Sweep Executed' : 'Confirm Protocol Fee Sweep'}
    >
      <div className="space-y-5">
        {confirmedTxHash ? (
          /* Success View */
          <div className="space-y-4 text-center py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="text-base font-semibold text-primary-theme">
                Successfully Swept {selectedPools.length} Pools
              </h4>
              <p className="text-xs text-secondary-theme">
                Accrued protocol fees of {formatUSD(totalUSD)} have been transferred to the DAO Treasury.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-elevated-theme border border-hairline-theme font-mono text-xs text-secondary-theme break-all">
              Tx Hash: {confirmedTxHash}
            </div>

            <div className="pt-2 flex justify-center">
              <Button variant="primary" size="md" onClick={handleModalClose} className="text-xs">
                Done
              </Button>
            </div>
          </div>
        ) : (
          /* Confirmation & Diff View */
          <>
            <div className="p-4 rounded-xl bg-elevated-theme border border-hairline-theme flex items-center justify-between">
              <div>
                <span className="text-xs text-secondary-theme block">Total Sweeping Value</span>
                <span className="text-lg font-bold font-mono text-primary-theme">
                  {formatUSD(totalUSD)}
                </span>
              </div>
              <Badge variant="success">{selectedPools.length} Pools Selected</Badge>
            </div>

            {/* Parameter Diff */}
            <DiffViewer
              label="Protocol Fee Balance Transfer"
              description="Sweeping pending protocol revenue directly into DAO Treasury vault."
              previousValue={`${selectedPools.length} Pools Uncollected (${formatUSD(totalUSD)})`}
              nextValue={`0 Pools Uncollected ($0.00)`}
              isDestructive={false}
            />

            {/* Recipient Destination */}
            <div className="p-3 rounded-xl bg-surface-theme border border-hairline-theme space-y-1">
              <span className="text-[11px] font-semibold text-secondary-theme uppercase tracking-wider">
                Destination Address
              </span>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-primary-theme">{shortenAddress(targetTreasuryAddress, 10)}</span>
                <span className="text-emerald-500 font-semibold">DAO Multi-Sig Treasury</span>
              </div>
            </div>

            {/* Calldata & Gas Inspector */}
            <JSONInspector
              title="Calldata & Gas Execution Preview"
              data={mockCalldata}
              defaultExpanded={false}
            />

            {/* Action Buttons */}
            <div className="pt-3 border-t border-hairline-theme flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="md"
                onClick={handleModalClose}
                disabled={isExecuting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSweep}
                disabled={isExecuting || totalUSD === 0}
                className="text-xs gap-1.5 font-mono"
              >
                {isExecuting ? (
                  <span>Signing & Sweeping...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Execute Sweep ({formatUSD(totalUSD)})</span>
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
