import { useState, useCallback } from 'react';
import { useAdminAuth } from './useAdminAuth';

export interface TimelockAction {
  id: string;
  target: 'VAULT' | 'CURVE' | 'POOL';
  targetIdentifier: string;
  action: 'UNPAUSE';
  proposer: string;
  eta: number; // Unix timestamp
  executed: boolean;
  canceled: boolean;
}

export interface CircuitBreakerState {
  isVaultPaused: boolean;
  isCurvePaused: {
    clamm: boolean;      // curveType 0
    binAmm: boolean;     // curveType 1
    stableAmm: boolean;  // curveType 2
  };
  pausedPools: Record<string, boolean>; // poolId -> isPaused
  timelockQueue: TimelockAction[];
}

const INITIAL_STATE: CircuitBreakerState = {
  isVaultPaused: false,
  isCurvePaused: {
    clamm: false,
    binAmm: false,
    stableAmm: false,
  },
  pausedPools: {
    '0x99dd...01cc': true, // ARB / ETH mock paused
  },
  timelockQueue: [
    {
      id: 'TL-0x892a',
      target: 'POOL',
      targetIdentifier: '0x99dd...01cc (ARB / ETH)',
      action: 'UNPAUSE',
      proposer: '0x0000...0001 (Owner Timelock)',
      eta: Date.now() + 1000 * 60 * 60 * 14, // 14 hours from now
      executed: false,
      canceled: false,
    },
  ],
};

export function useCircuitBreaker() {
  const [state, setState] = useState<CircuitBreakerState>(INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { hasPermission } = useAdminAuth();

  // Tier calculation:
  // Tier 0 = All operational
  // Tier 1 = Specific Pool(s) isolated
  // Tier 2 = Specific Curve Engine isolated
  // Tier 3 = Global Vault Paused
  const currentTier = state.isVaultPaused
    ? 3
    : state.isCurvePaused.clamm || state.isCurvePaused.binAmm || state.isCurvePaused.stableAmm
    ? 2
    : Object.values(state.pausedPools).some((p) => p)
    ? 1
    : 0;

  const pauseVault = useCallback(async () => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    setState((prev) => ({ ...prev, isVaultPaused: true }));
    setIsSubmitting(false);
  }, []);

  const requestUnpauseVault = useCallback(async (proposer: string) => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    const newAction: TimelockAction = {
      id: `TL-0x${Math.random().toString(16).substring(2, 6)}`,
      target: 'VAULT',
      targetIdentifier: 'Global Vault & AMM Gateway',
      action: 'UNPAUSE',
      proposer,
      eta: Date.now() + 1000 * 60 * 60 * 24, // 24h timelock
      executed: false,
      canceled: false,
    };
    setState((prev) => ({
      ...prev,
      timelockQueue: [newAction, ...prev.timelockQueue],
    }));
    setIsSubmitting(false);
  }, []);

  const pauseCurve = useCallback(async (curveType: 0 | 1 | 2) => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 500));
    setState((prev) => {
      const key = curveType === 0 ? 'clamm' : curveType === 1 ? 'binAmm' : 'stableAmm';
      return {
        ...prev,
        isCurvePaused: {
          ...prev.isCurvePaused,
          [key]: true,
        },
      };
    });
    setIsSubmitting(false);
  }, []);

  const requestUnpauseCurve = useCallback(async (curveType: 0 | 1 | 2, proposer: string) => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 500));
    const curveName = curveType === 0 ? 'CLAMM (Concentrated)' : curveType === 1 ? 'BinAMM (Bins)' : 'StableAMM (Stableswap)';
    const newAction: TimelockAction = {
      id: `TL-0x${Math.random().toString(16).substring(2, 6)}`,
      target: 'CURVE',
      targetIdentifier: `${curveName} Engine`,
      action: 'UNPAUSE',
      proposer,
      eta: Date.now() + 1000 * 60 * 60 * 12, // 12h timelock
      executed: false,
      canceled: false,
    };
    setState((prev) => ({
      ...prev,
      timelockQueue: [newAction, ...prev.timelockQueue],
    }));
    setIsSubmitting(false);
  }, []);

  const togglePoolPause = useCallback(async (poolId: string, currentPaused: boolean, proposer: string) => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 400));
    if (!currentPaused) {
      // Pause immediately (Guardian power)
      setState((prev) => ({
        ...prev,
        pausedPools: {
          ...prev.pausedPools,
          [poolId]: true,
        },
      }));
    } else {
      // Unpause requires Timelock queue if strict, or direct if Owner
      const newAction: TimelockAction = {
        id: `TL-0x${Math.random().toString(16).substring(2, 6)}`,
        target: 'POOL',
        targetIdentifier: poolId,
        action: 'UNPAUSE',
        proposer,
        eta: Date.now() + 1000 * 60 * 60 * 6, // 6h timelock
        executed: false,
        canceled: false,
      };
      setState((prev) => ({
        ...prev,
        timelockQueue: [newAction, ...prev.timelockQueue],
      }));
    }
    setIsSubmitting(false);
  }, []);

  const executeTimelockAction = useCallback(async (id: string) => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 500));
    setState((prev) => {
      const action = prev.timelockQueue.find((a) => a.id === id);
      if (!action) return prev;

      let nextVault = prev.isVaultPaused;
      const nextCurve = { ...prev.isCurvePaused };
      const nextPools = { ...prev.pausedPools };

      if (action.target === 'VAULT') {
        nextVault = false;
      } else if (action.target === 'CURVE') {
        if (action.targetIdentifier.includes('CLAMM')) nextCurve.clamm = false;
        if (action.targetIdentifier.includes('BinAMM')) nextCurve.binAmm = false;
        if (action.targetIdentifier.includes('StableAMM')) nextCurve.stableAmm = false;
      } else if (action.target === 'POOL') {
        const poolKey = Object.keys(nextPools).find((k) => action.targetIdentifier.includes(k));
        if (poolKey) {
          nextPools[poolKey] = false;
        }
      }

      return {
        ...prev,
        isVaultPaused: nextVault,
        isCurvePaused: nextCurve,
        pausedPools: nextPools,
        timelockQueue: prev.timelockQueue.map((a) =>
          a.id === id ? { ...a, executed: true } : a
        ),
      };
    });
    setIsSubmitting(false);
  }, []);

  const cancelTimelockAction = useCallback(async (id: string) => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 400));
    setState((prev) => ({
      ...prev,
      timelockQueue: prev.timelockQueue.map((a) =>
        a.id === id ? { ...a, canceled: true } : a
      ),
    }));
    setIsSubmitting(false);
  }, []);

  return {
    state,
    currentTier,
    isSubmitting,
    canTriggerPause: hasPermission('admin.circuit_breaker.trigger'),
    canManageTimelock: hasPermission('admin.circuit_breaker.reset'),
    pauseVault,
    requestUnpauseVault,
    pauseCurve,
    requestUnpauseCurve,
    togglePoolPause,
    executeTimelockAction,
    cancelTimelockAction,
  };
}
