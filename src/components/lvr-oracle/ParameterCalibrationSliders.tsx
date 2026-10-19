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
  validationError?: string | null;
}

/** Display helper: pips → percent (1e6 pips = 100%). */
function pipsToPct(pips: number): string {
  return ((pips / 1_000_000) * 100).toFixed(2);
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
  validationError,
}) => {
  return (
    <Card className="p-5 border border-hairline-theme bg-surface-theme space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-hairline-theme">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-primary-theme">
              Dynamic LVR Parameter Calibration
            </h3>
          </div>
          <p className="text-xs text-secondary-theme">
            Fee bounds are pip-scale (&lt; 1e6). Half-life must be &gt; 0. Base pool fee is PoolKey.fee
            (not set here).
          </p>
        </div>

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 rounded-xl bg-subtle-theme border border-hairline-theme space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-primary-theme">
                Decay Half-Life (τ)
              </span>
              <p className="text-[11px] text-secondary-theme">
                Seconds for elevated dynamic spread to halve (must be &gt; 0).
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
            min="1"
            max="60"
            step="1"
            value={draft.decayHalfLifeSeconds}
            onChange={(e) => onUpdate({ decayHalfLifeSeconds: Number(e.target.value) })}
            className="w-full h-1.5 bg-hairline-theme rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-[10px] font-mono text-secondary-theme">
            <span>1s</span>
            <span>12s</span>
            <span>60s</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-subtle-theme border border-hairline-theme space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-primary-theme">
                Volatility Scaling (α)
              </span>
              <p className="text-[11px] text-secondary-theme">
                Surcharge scale per tick deviation during price shocks.
              </p>
            </div>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-xs text-secondary-theme line-through">
                {current.volatilityAlpha}
              </span>
              <span className="text-xs font-bold text-emerald-500">{draft.volatilityAlpha}</span>
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
            <span>5</span>
            <span>50</span>
            <span>150</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-subtle-theme border border-hairline-theme space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-primary-theme">Min Dynamic Fee</span>
              <p className="text-[11px] text-secondary-theme">
                Floor in pips (&lt; 1e6). Must be ≤ max.
              </p>
            </div>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-xs text-secondary-theme line-through">
                {current.minFeePips} pips
              </span>
              <span className="text-xs font-bold text-emerald-500">
                {draft.minFeePips} pips ({pipsToPct(draft.minFeePips)}%)
              </span>
            </div>
          </div>

          <input
            type="range"
            min="1"
            max="100000"
            step="100"
            value={draft.minFeePips}
            onChange={(e) => onUpdate({ minFeePips: Number(e.target.value) })}
            className="w-full h-1.5 bg-hairline-theme rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-[10px] font-mono text-secondary-theme">
            <span>1 pip</span>
            <span>10k</span>
            <span>100k</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-subtle-theme border border-hairline-theme space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-primary-theme">Max Dynamic Fee Cap</span>
              <p className="text-[11px] text-secondary-theme">
                Ceiling in pips (&lt; 1e6). Rejected on-chain if ≥ 1e6 or &lt; min.
              </p>
            </div>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-xs text-secondary-theme line-through">
                {current.maxFeePips} pips
              </span>
              <span className="text-xs font-bold text-emerald-500">
                {draft.maxFeePips} pips ({pipsToPct(draft.maxFeePips)}%)
              </span>
            </div>
          </div>

          <input
            type="range"
            min="1000"
            max="500000"
            step="1000"
            value={draft.maxFeePips}
            onChange={(e) => onUpdate({ maxFeePips: Number(e.target.value) })}
            className="w-full h-1.5 bg-hairline-theme rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-[10px] font-mono text-secondary-theme">
            <span>0.10%</span>
            <span>10%</span>
            <span>50%</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-hairline-theme">
        <div className="flex items-center gap-2">
          {validationError ? (
            <span className="text-xs font-mono text-red-500">{validationError}</span>
          ) : hasDiffs ? (
            <div className="flex items-center gap-2 text-xs font-mono text-amber-500">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Unsaved parameter changes detected</span>
            </div>
          ) : (
            <span className="text-xs font-mono text-secondary-theme">
              Parameters matched with on-chain LVR state
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
