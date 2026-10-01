import React, { useState } from 'react';
import { isUserRejectedError, useCircuitBreaker } from '../../hooks/useCircuitBreaker';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { CurveIsolationCards } from './CurveIsolationCards';
import { PoolEmergencyTable, type PoolEmergencyItem } from './PoolEmergencyTable';
import { TimelockQueueMonitor } from './TimelockQueueMonitor';
import { StatCard } from '../data/StatCard';
import { DiffViewer } from '../data/DiffViewer';
import { ConfirmModal } from '../data/ConfirmModal';
import { Button } from '../ui';
import {
  Lock,
  Power,
  Layers,
  Clock,
} from 'lucide-react';

interface CircuitBreakerControlProps {
  pools: PoolEmergencyItem[];
}

export const CircuitBreakerControl: React.FC<CircuitBreakerControlProps> = ({ pools }) => {
  const {
    state,
    currentTier,
    minDelaySeconds,
    isSubmitting,
    canTriggerPause,
    canManageTimelock,
    pauseVault,
    requestUnpauseVault,
    pauseCurve,
    requestUnpauseCurve,
    togglePoolPause,
    executeTimelockAction,
    cancelTimelockAction,
  } = useCircuitBreaker();

  const { address } = useAdminAuth();

  const [confirmAction, setConfirmAction] = useState<{
    type: 'PAUSE_VAULT' | 'PAUSE_CURVE' | 'PAUSE_POOL';
    targetId?: string;
    curveType?: 0 | 1 | 2;
  } | null>(null);

  const runSafe = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (err) {
      if (isUserRejectedError(err)) return;
      throw err;
    }
  };

  const handleConfirmExecute = async () => {
    if (!confirmAction) return;
    await runSafe(async () => {
      if (confirmAction.type === 'PAUSE_VAULT') {
        await pauseVault();
      } else if (confirmAction.type === 'PAUSE_CURVE' && confirmAction.curveType !== undefined) {
        await pauseCurve(confirmAction.curveType);
      } else if (confirmAction.type === 'PAUSE_POOL' && confirmAction.targetId) {
        await togglePoolPause(confirmAction.targetId, false, address || '0x0000...0000');
      }
    });
    setConfirmAction(null);
  };

  const activeIsolatedPoolsCount = Object.values(state.pausedPools).filter(Boolean).length;
  const activeIsolatedCurvesCount = [
    state.isCurvePaused.clamm,
    state.isCurvePaused.binAmm,
    state.isCurvePaused.stableAmm,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* High-Level Safety Telemetry HUD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Current Isolation Level"
          value={`Tier ${currentTier}`}
          subValue={
            currentTier === 0
              ? 'All Protocols Operational'
              : currentTier === 3
              ? 'Global Vault Gateway Halted'
              : `${activeIsolatedCurvesCount} Engine(s), ${activeIsolatedPoolsCount} Pool(s) Isolated`
          }
          icon={<Lock className="w-4 h-4 text-amber-500" />}
          badgeText={currentTier === 0 ? 'Normal' : 'Engaged'}
          badgeVariant={currentTier === 0 ? 'success' : 'danger'}
        />

        <StatCard
          label="Global Vault Status"
          value={state.isVaultPaused ? 'HALTED' : 'ACTIVE'}
          subValue={state.isVaultPaused ? 'Swaps & Routing Blocked' : 'Normal Cross-Pool Routing'}
          icon={<Power className="w-4 h-4 text-emerald-500" />}
          badgeText={state.isVaultPaused ? 'Tier 3 Active' : 'Tier 0'}
          badgeVariant={state.isVaultPaused ? 'danger' : 'success'}
        />

        <StatCard
          label="Isolated AMM Engines"
          value={`${activeIsolatedCurvesCount} / 3`}
          subValue="CLAMM, BinAMM, StableAMM"
          icon={<Layers className="w-4 h-4 text-blue-500" />}
          badgeText={activeIsolatedCurvesCount > 0 ? 'Partial Halt' : 'Optimal'}
          badgeVariant={activeIsolatedCurvesCount > 0 ? 'warning' : 'info'}
        />

        <StatCard
          label="Timelock Governance Queue"
          value={`${state.timelockQueue.filter((q) => !q.executed && !q.canceled).length} Actions`}
          subValue={`${Math.round(minDelaySeconds / 3600)}h delay · Anvil auto-warps on unpause`}
          icon={<Clock className="w-4 h-4 text-neutral-500" />}
          badgeText="SupaTimelock"
          badgeVariant="default"
        />
      </div>

      {/* Tier 3: Global Vault Master Switch */}
      <div
        className={`p-6 rounded-2xl border transition-all duration-300 ${
          state.isVaultPaused
            ? 'bg-red-500/10 border-red-500/30'
            : 'bg-surface-theme border-hairline-theme'
        }`}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                Tier 3 Master Switch
              </span>
              <h2 className="text-sm font-bold text-primary-theme">
                Global Vault & AMM Gateway Emergency Halt
              </h2>
            </div>
            <p className="text-xs text-secondary-theme leading-relaxed">
              Instantly halts all token swaps, multi-curve routing, and external deposits across the entire
              protocol. LP claim redemptions remain accessible via ERC-6909 Vault vouchers to ensure fund safety.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {state.isVaultPaused ? (
              <Button
                variant="outline"
                size="md"
                disabled={!canManageTimelock || isSubmitting}
                onClick={() =>
                  void runSafe(() => requestUnpauseVault(address || '0x0000...0000'))
                }
                className="gap-2 text-xs font-mono"
              >
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Queue Timelocked Vault Unpause</span>
              </Button>
            ) : (
              <Button
                variant="danger"
                size="md"
                disabled={!canTriggerPause || isSubmitting}
                onClick={() =>
                  setConfirmAction({
                    type: 'PAUSE_VAULT',
                  })
                }
                className="gap-2 text-xs font-mono font-semibold"
              >
                <Power className="w-4 h-4" />
                <span>Halt Global Vault (Tier 3)</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tier 2: Curve Engine Isolation Matrix */}
      <CurveIsolationCards
        isCurvePaused={state.isCurvePaused}
        pools={pools.map((p) => ({
          curveType: p.curveType,
          tvlUSD: p.tvlUSD,
          volume24h: p.volume24h,
        }))}
        onPauseCurve={(curveType) =>
          setConfirmAction({
            type: 'PAUSE_CURVE',
            curveType,
          })
        }
        onRequestUnpause={(curveType) =>
          void runSafe(() => requestUnpauseCurve(curveType, address || '0x0000...0000'))
        }
        canTriggerPause={canTriggerPause}
        canManageTimelock={canManageTimelock}
        isSubmitting={isSubmitting}
      />

      {/* Tier 1: Granular Per-Pool Circuit Control */}
      <PoolEmergencyTable
        pools={pools}
        pausedPools={state.pausedPools}
        onTogglePool={(poolId, isPaused) => {
          if (!isPaused) {
            setConfirmAction({
              type: 'PAUSE_POOL',
              targetId: poolId,
            });
          } else {
            void runSafe(() => togglePoolPause(poolId, true, address || '0x0000...0000'));
          }
        }}
        canTriggerPause={canTriggerPause}
        canManageTimelock={canManageTimelock}
        isSubmitting={isSubmitting}
      />

      {/* Timelocked Unpause Queue */}
      <TimelockQueueMonitor
        queue={state.timelockQueue}
        onExecute={(id) => void runSafe(() => executeTimelockAction(id))}
        onCancel={(id) => void runSafe(() => cancelTimelockAction(id))}
        canExecute={canManageTimelock}
        isSubmitting={isSubmitting}
        minDelaySeconds={minDelaySeconds}
        isAnvil
      />

      {/* Two-Step Verification Confirmation Modal for Emergency Triggers */}
      <ConfirmModal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmExecute}
        title={
          confirmAction?.type === 'PAUSE_VAULT'
            ? 'Emergency Global Vault Halt'
            : confirmAction?.type === 'PAUSE_CURVE'
            ? `Emergency Engine Isolation`
            : `Emergency Pool Isolation`
        }
        description={
          confirmAction?.type === 'PAUSE_VAULT'
            ? 'You are about to halt all swaps across the entire SupaDex protocol. Unpausing requires a 24-hour Timelock execution delay.'
            : confirmAction?.type === 'PAUSE_CURVE'
            ? 'You are isolating an entire curve engine. Swaps through this curve will be rejected.'
            : `You are isolating pool ${confirmAction?.targetId}. Trades through this pair will be rejected.`
        }
        confirmText="Confirm Emergency Halt"
        variant="danger"
        requireTypedConfirmation={confirmAction?.type === 'PAUSE_VAULT'}
        confirmationKeyword="HALT-VAULT"
      >
        <DiffViewer
          label="Circuit Breaker Status"
          previousValue={`Tier ${currentTier}`}
          nextValue={
            confirmAction?.type === 'PAUSE_VAULT'
              ? 'Tier 3 (Global Vault Halted)'
              : confirmAction?.type === 'PAUSE_CURVE'
              ? 'Tier 2 (Engine Isolated)'
              : 'Tier 1 (Pool Isolated)'
          }
          isDestructive={true}
        />
      </ConfirmModal>
    </div>
  );
};
