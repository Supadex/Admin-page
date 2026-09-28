import React, { useState } from 'react';
import { Card, Button, Badge } from '../ui';
import { DiffViewer } from '../data';
import { SlidersHorizontal, ArrowDownUp, Check } from 'lucide-react';
import type { FeeSplitConfig } from '../../hooks/useFeeTreasury';

interface FeeSplitConfigCardProps {
  config: FeeSplitConfig;
  onUpdateSplit: (newSplit: Partial<FeeSplitConfig>) => void;
  canEdit: boolean;
}

export const FeeSplitConfigCard: React.FC<FeeSplitConfigCardProps> = ({
  config,
  onUpdateSplit,
  canEdit,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [daoShare, setDaoShare] = useState(config.daoTreasuryShareBps / 100);
  const [lpShare, setLpShare] = useState(config.lpStakingShareBps / 100);
  const [insuranceShare, setInsuranceShare] = useState(config.insuranceReserveShareBps / 100);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const totalShare = daoShare + lpShare + insuranceShare;
  const isValidTotal = Math.abs(totalShare - 100) < 0.01;

  const handleSave = () => {
    if (!isValidTotal) return;
    onUpdateSplit({
      daoTreasuryShareBps: Math.round(daoShare * 100),
      lpStakingShareBps: Math.round(lpShare * 100),
      insuranceReserveShareBps: Math.round(insuranceShare * 100),
    });
    setIsEditing(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleReset = () => {
    setDaoShare(config.daoTreasuryShareBps / 100);
    setLpShare(config.lpStakingShareBps / 100);
    setInsuranceShare(config.insuranceReserveShareBps / 100);
    setIsEditing(false);
  };

  return (
    <Card className="p-6 space-y-5 bg-surface-theme border-hairline-theme">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-hairline-theme">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary-theme" />
            <h3 className="text-sm font-semibold tracking-tight text-primary-theme">
              Governance Fee-Split Allocation Policy
            </h3>
          </div>
          <p className="text-xs text-secondary-theme">
            Configure how swept protocol fee revenues are distributed across DAO Treasury, LP Stakers, and Emergency Reserve.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedSuccess && (
            <Badge variant="success" className="gap-1">
              <Check className="w-3 h-3" />
              <span>Saved On-Chain</span>
            </Badge>
          )}

          {canEdit && !isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-xs gap-1.5"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Calibrate Split</span>
            </Button>
          )}
        </div>
      </div>

      {/* Interactive Sliders or Readout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* DAO Treasury Share */}
        <div className="p-4 rounded-xl bg-elevated-theme border border-hairline-theme space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-primary-theme">DAO Treasury</span>
            <span className="text-xs font-mono font-bold text-emerald-500">{daoShare}%</span>
          </div>
          <p className="text-[11px] text-secondary-theme">
            Direct allocation to DAO governance multisig.
          </p>
          {isEditing && (
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={daoShare}
              onChange={(e) => setDaoShare(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          )}
        </div>

        {/* LP Staking / Buyback */}
        <div className="p-4 rounded-xl bg-elevated-theme border border-hairline-theme space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-primary-theme">LP Staking & Buyback</span>
            <span className="text-xs font-mono font-bold text-blue-500">{lpShare}%</span>
          </div>
          <p className="text-[11px] text-secondary-theme">
            Distributed to long-term veSUPA stakers.
          </p>
          {isEditing && (
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={lpShare}
              onChange={(e) => setLpShare(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
          )}
        </div>

        {/* Insurance Reserve */}
        <div className="p-4 rounded-xl bg-elevated-theme border border-hairline-theme space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-primary-theme">Insurance Reserve</span>
            <span className="text-xs font-mono font-bold text-amber-500">{insuranceShare}%</span>
          </div>
          <p className="text-[11px] text-secondary-theme">
            Buffer for unexpected volatility shocks and bad debt.
          </p>
          {isEditing && (
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={insuranceShare}
              onChange={(e) => setInsuranceShare(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          )}
        </div>
      </div>

      {/* Validation & Actions when Editing */}
      {isEditing && (
        <div className="pt-3 border-t border-hairline-theme flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-secondary-theme">Total Allocation:</span>
            <span
              className={`text-xs font-mono font-bold ${
                isValidTotal ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {totalShare}% {isValidTotal ? '(100% Balanced)' : '(Must equal 100%)'}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="text-xs flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={!isValidTotal}
              className="text-xs gap-1.5 flex-1 sm:flex-none"
            >
              <ArrowDownUp className="w-3.5 h-3.5" />
              <span>Apply Fee Split</span>
            </Button>
          </div>
        </div>
      )}

      {/* Parameter Diff comparison if modified */}
      {isEditing && (
        <div className="pt-2">
          <DiffViewer
            label="Fee Distribution Split Diff"
            description="Proposed updates to on-chain SupaFeeCollector distribution ratio."
            previousValue={`${config.daoTreasuryShareBps / 100}% DAO / ${config.lpStakingShareBps / 100}% LP / ${config.insuranceReserveShareBps / 100}% Reserve`}
            nextValue={`${daoShare}% DAO / ${lpShare}% LP / ${insuranceShare}% Reserve`}
            isDestructive={false}
          />
        </div>
      )}
    </Card>
  );
};
