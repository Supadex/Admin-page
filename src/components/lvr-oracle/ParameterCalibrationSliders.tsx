import React from 'react';
import { Card, Button } from '../ui';
import { type PoolLVRConfig } from '../../hooks/useLVRCalibration';
import { SlidersHorizontal, RotateCcw, Check } from 'lucide-react';

interface ParameterCalibrationSlidersProps {
  draft: PoolLVRConfig;
  current: PoolLVRConfig;
  onUpdate: (updates: Partial<PoolLVRConfig>) => void;
  onReset: () => void;
  onApplyPreset: (preset: 'HIGH_VOLATILITY' | 'STABLE_MEV' | 'STANDARD') => void;
  onOpenPreview: () => void;
  canCalibrate: boolean;
  hasDiffs: boolean;
}

export const ParameterCalibrationSliders: React.FC<ParameterCalibrationSlidersProps> = ({
  draft,
  current,
  onUpdate,
  onReset,
  onApplyPreset,
  onOpenPreview,
  canCalibrate,
  hasDiffs,
}) => {
  return (
    <Card className="p-5 border border-hairline-theme bg-surface-theme space-y-6">
      {/* Calibration Header & Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-hairline-theme">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-primary-theme">
              Dynamic LVR Parameter Calibration
            </h3>
          </div>
          <p className="text-xs text-secondary-theme">
            Fine-tune half-life decay constants, base fee floor, and volatility scaling factors.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onApplyPreset('STANDARD')}
            className="text-xs h-7 px-2.5"
          >
            Standard
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onApplyPreset('HIGH_VOLATILITY')}
            className="text-xs h-7 px-2.5 text-amber-500 hover:text-amber-400"
          >
            High Volatility
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onApplyPreset('STABLE_MEV')}
            className="text-xs h-7 px-2.5 text-blue-500 hover:text-blue-400"
          >
            Stable / Low MEV
          </Button>
        </div>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Parameter 1: Decay Half-Life (tau) */}
        <div className="p-4 rounded-xl bg-subtle-theme border border-hairline-theme space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-primary-theme">
                Decay Half-Life ($\tau$)
              </span>
              <p className="text-[11px] text-secondary-theme">
                Time in seconds for elevated dynamic spread to halve.
              </p>
            </div>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-xs text-secondary-theme line-through">
                {current.decayHalfLifeSeconds}s
              </span>
              <span className="text-xs font-bold text-emerald-500">
                {draft.decayHalfLifeSeconds}s
              </span>
            </div>
          </div>

          <input
            type="range"
            min="2"
            max="60"
            step="1"
            value={draft.decayHalfLifeSeconds}
            onChange={(e) => onUpdate({ decayHalfLifeSeconds: Number(e.target.value) })}
            className="w-full h-1.5 bg-hairline-theme rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-[10px] font-mono text-secondary-theme">
            <span>2s (Instant decay)</span>
            <span>12s (1 Block)</span>
            <span>60s (Sustained protect)</span>
          </div>
        </div>

        {/* Parameter 2: Volatility Surcharge Scaling (Alpha) */}
        <div className="p-4 rounded-xl bg-subtle-theme border border-hairline-theme space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-primary-theme">
                Volatility Scaling Factor ($\alpha$)
              </span>
              <p className="text-[11px] text-secondary-theme">
                Surcharge added per tick deviation during price shocks.
              </p>
            </div>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-xs text-secondary-theme line-through">
                {current.volatilityAlpha}
              </span>
              <span className="text-xs font-bold text-emerald-500">
                {draft.volatilityAlpha}
              </span>
            </div>
          </div>

          <input
            type="range"
            min="5"
            max="150"
            step="5"
            value={draft.volatilityAlpha}
            onChange={(e) => onUpdate({ volatilityAlpha: Number(e.target.value) })}
            className="w-full h-1.5 bg-hairline-theme rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-[10px] font-mono text-secondary-theme">
            <span>5 (Low sensitivity)</span>
            <span>50 (Standard)</span>
            <span>150 (Aggressive)</span>
          </div>
        </div>

        {/* Parameter 3: Base Fee Floor */}
        <div className="p-4 rounded-xl bg-subtle-theme border border-hairline-theme space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-primary-theme">
                Base Fee Floor ($f_0$)
              </span>
              <p className="text-[11px] text-secondary-theme">
                Standard baseline fee during zero volatility periods.
              </p>
            </div>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-xs text-secondary-theme line-through">
                {current.baseFeeBps} bps
              </span>
              <span className="text-xs font-bold text-emerald-500">
                {draft.baseFeeBps} bps
              </span>
            </div>
          </div>

          <input
            type="range"
            min="1"
            max="100"
            step="1"
            value={draft.baseFeeBps}
            onChange={(e) => onUpdate({ baseFeeBps: Number(e.target.value) })}
            className="w-full h-1.5 bg-hairline-theme rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-[10px] font-mono text-secondary-theme">
            <span>1 bp (0.01%)</span>
            <span>30 bps (0.30%)</span>
            <span>100 bps (1.00%)</span>
          </div>
        </div>

        {/* Parameter 4: Maximum Fee Cap */}
        <div className="p-4 rounded-xl bg-subtle-theme border border-hairline-theme space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-primary-theme">
                Max Dynamic Fee Cap (f_max)
              </span>
              <p className="text-[11px] text-secondary-theme">
                Upper limit boundary to avoid excessive trade slippage.
              </p>
            </div>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-xs text-secondary-theme line-through">
                {(current.maxFeeBps / 100).toFixed(1)}%
              </span>
              <span className="text-xs font-bold text-emerald-500">
                {(draft.maxFeeBps / 100).toFixed(1)}%
              </span>
            </div>
          </div>

          <input
            type="range"
            min="100"
            max="3000"
            step="50"
            value={draft.maxFeeBps}
            onChange={(e) => onUpdate({ maxFeeBps: Number(e.target.value) })}
            className="w-full h-1.5 bg-hairline-theme rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-[10px] font-mono text-secondary-theme">
            <span>1.0%</span>
            <span>10.0% (Default)</span>
            <span>30.0%</span>
          </div>
        </div>
      </div>

      {/* Action Footer & Diff Confirmation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-hairline-theme">
        <div className="flex items-center gap-2">
          {hasDiffs ? (
            <div className="flex items-center gap-2 text-xs font-mono text-amber-500">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Unsaved parameter changes detected</span>
            </div>
          ) : (
            <span className="text-xs font-mono text-secondary-theme">
              Parameters matched with on-chain oracle state
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            disabled={!hasDiffs}
            className="text-xs gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Draft</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onOpenPreview}
            disabled={!hasDiffs || !canCalibrate}
            className="text-xs gap-1.5 font-semibold"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Simulate & Apply Updates</span>
          </Button>
        </div>
      </div>
    </Card>
  );
};
