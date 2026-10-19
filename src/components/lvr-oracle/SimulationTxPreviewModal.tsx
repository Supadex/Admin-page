import React, { useState } from 'react';
import { Modal, Button, Badge } from '../ui';
import { DiffViewer, JSONInspector } from '../data';
import { type PoolLVRConfig } from '../../hooks/useLVRCalibration';
import { SlidersHorizontal, RefreshCw, FileCode, CheckCircle2 } from 'lucide-react';

interface SimulationTxPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: PoolLVRConfig;
  current: PoolLVRConfig;
  onConfirm: () => void | Promise<void>;
}

export const SimulationTxPreviewModal: React.FC<SimulationTxPreviewModalProps> = ({
  isOpen,
  onClose,
  draft,
  current,
  onConfirm,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txSuccess, setTxSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm();
      setTxSuccess(true);
      setTimeout(() => {
        setTxSuccess(false);
        onClose();
      }, 1200);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Transaction failed';
      if (/user rejected|user denied/i.test(msg)) {
        setError(null);
        return;
      }
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Dynamic LVR Parameter Calibration Preview"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Pool Metadata Summary */}
        <div className="p-4 rounded-xl bg-subtle-theme border border-hairline-theme flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-secondary-theme">
              Target Pool
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-bold text-sm text-primary-theme">{draft.pair}</span>
              <Badge variant="curve" size="sm">
                {draft.curveType}
              </Badge>
              <span className="font-mono text-xs text-secondary-theme">ID: {draft.poolId}</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono uppercase tracking-widest text-secondary-theme">
              Estimated Gas
            </span>
            <div className="font-mono text-xs font-semibold text-emerald-500 mt-0.5">
              ~62,400 gas ($0.12)
            </div>
          </div>
        </div>

        {/* Parameter Diffs Matrix */}
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary-theme">
            Parameter Modifications (Diffs)
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {draft.decayHalfLifeSeconds !== current.decayHalfLifeSeconds && (
              <DiffViewer
                label="Decay Half-Life (tau)"
                previousValue={`${current.decayHalfLifeSeconds}`}
                nextValue={`${draft.decayHalfLifeSeconds}`}
                unit="seconds"
              />
            )}

            {draft.volatilityAlpha !== current.volatilityAlpha && (
              <DiffViewer
                label="Volatility Surcharge Scaling (Alpha)"
                previousValue={`${current.volatilityAlpha}`}
                nextValue={`${draft.volatilityAlpha}`}
                unit="units"
              />
            )}

            {draft.minFeePips !== current.minFeePips && (
              <DiffViewer
                label="Min Dynamic Fee"
                previousValue={`${current.minFeePips}`}
                nextValue={`${draft.minFeePips}`}
                unit="pips"
              />
            )}

            {draft.maxFeePips !== current.maxFeePips && (
              <DiffViewer
                label="Max Dynamic Fee Cap"
                previousValue={`${current.maxFeePips}`}
                nextValue={`${draft.maxFeePips}`}
                unit="pips"
              />
            )}
          </div>
        </div>

        {/* Encoded Calldata Inspector */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileCode className="w-3.5 h-3.5 text-secondary-theme" />
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary-theme">
              Simulated ABI Calldata
            </span>
          </div>

          <JSONInspector
            title="LVRShieldPlugin.setDecayParameters(PoolKey,uint32,uint24,uint24,uint24)"
            data={{
              pluginTarget: draft.plugin,
              method:
                'setDecayParameters((address,address,uint24,int24,address,uint8),uint32,uint24,uint24,uint24)',
              poolId: draft.poolId,
              decayHalfLife: draft.decayHalfLifeSeconds,
              volatilityAlpha: draft.volatilityAlpha,
              minFeeBps: draft.minFeeBps,
              maxFeeBps: draft.maxFeeBps,
            }}
          />
        </div>

        {error && (
          <p className="text-xs text-red-500 font-mono">{error}</p>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-hairline-theme">
          <Button variant="outline" size="md" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={isSubmitting || txSuccess}
            className="gap-2 font-semibold"
          >
            {txSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Parameters Applied!</span>
              </>
            ) : isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Submitting Transaction...</span>
              </>
            ) : (
              <>
                <SlidersHorizontal className="w-4 h-4" />
                <span>Submit Parameter Calibration</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
