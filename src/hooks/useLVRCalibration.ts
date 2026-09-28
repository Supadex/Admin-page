import { useState, useMemo, useCallback } from 'react';
import { useAdminAuth } from './useAdminAuth';

export interface PoolLVRConfig {
  poolId: string;
  pair: string;
  curveType: 'CLAMM' | 'BinAMM' | 'StableAMM';
  baseFeeBps: number; // in bps, e.g. 5 = 0.05%
  lastFeeBps: number;
  decayHalfLifeSeconds: number; // e.g. 12
  volatilityAlpha: number; // surcharge scale factor, e.g. 50
  minFeeBps: number; // e.g. 1 (0.01%)
  maxFeeBps: number; // e.g. 1000 (10%)
  lastSwapTimestamp: number;
  lastTick: number;
  cardinality: number;
  cardinalityNext: number;
  observationCount: number;
  instantaneousVolatility: number; // tick delta std dev
}

export interface OracleObservation {
  index: number;
  blockTimestamp: number;
  tickCumulative: string;
  secondsPerLiquidityCumulative: string;
  initialized: boolean;
  timeAgoFormatted: string;
}

export const INITIAL_LVR_POOLS: PoolLVRConfig[] = [
  {
    poolId: '0x1a8f...90ab',
    pair: 'ETH / USDC',
    curveType: 'CLAMM',
    baseFeeBps: 5, // 0.05%
    lastFeeBps: 18.5, // 0.185% elevated
    decayHalfLifeSeconds: 12,
    volatilityAlpha: 50,
    minFeeBps: 1,
    maxFeeBps: 1000,
    lastSwapTimestamp: Date.now() - 6000, // 6s ago
    lastTick: 198420,
    cardinality: 64,
    cardinalityNext: 128,
    observationCount: 64,
    instantaneousVolatility: 34, // 34 ticks
  },
  {
    poolId: '0x4b7c...21de',
    pair: 'WBTC / ETH',
    curveType: 'CLAMM',
    baseFeeBps: 30, // 0.30%
    lastFeeBps: 42.0,
    decayHalfLifeSeconds: 15,
    volatilityAlpha: 60,
    minFeeBps: 5,
    maxFeeBps: 1000,
    lastSwapTimestamp: Date.now() - 18000,
    lastTick: 25410,
    cardinality: 32,
    cardinalityNext: 64,
    observationCount: 32,
    instantaneousVolatility: 18,
  },
  {
    poolId: '0x7e2a...55ff',
    pair: 'USDC / USDT',
    curveType: 'StableAMM',
    baseFeeBps: 1, // 0.01%
    lastFeeBps: 1.2,
    decayHalfLifeSeconds: 6,
    volatilityAlpha: 10,
    minFeeBps: 0.5,
    maxFeeBps: 200,
    lastSwapTimestamp: Date.now() - 2000,
    lastTick: 0,
    cardinality: 16,
    cardinalityNext: 16,
    observationCount: 16,
    instantaneousVolatility: 2,
  },
  {
    poolId: '0x99dd...01cc',
    pair: 'ARB / ETH',
    curveType: 'BinAMM',
    baseFeeBps: 20, // 0.20%
    lastFeeBps: 25.0,
    decayHalfLifeSeconds: 12,
    volatilityAlpha: 45,
    minFeeBps: 2,
    maxFeeBps: 1000,
    lastSwapTimestamp: Date.now() - 45000,
    lastTick: -8420,
    cardinality: 32,
    cardinalityNext: 32,
    observationCount: 32,
    instantaneousVolatility: 12,
  },
];

export function useLVRCalibration() {
  const { hasPermission } = useAdminAuth();
  const [pools, setPools] = useState<PoolLVRConfig[]>(INITIAL_LVR_POOLS);
  const [selectedPoolId, setSelectedPoolId] = useState<string>(INITIAL_LVR_POOLS[0].poolId);

  // Draft calibration state being edited
  const activePool = useMemo(() => {
    return pools.find((p) => p.poolId === selectedPoolId) || pools[0];
  }, [pools, selectedPoolId]);

  const [draftConfig, setDraftConfig] = useState<PoolLVRConfig>(activePool);

  // Sync draft whenever selected pool changes
  const handleSelectPool = (poolId: string) => {
    setSelectedPoolId(poolId);
    const target = pools.find((p) => p.poolId === poolId);
    if (target) {
      setDraftConfig({ ...target });
    }
  };

  const updateDraft = (updates: Partial<PoolLVRConfig>) => {
    setDraftConfig((prev) => ({ ...prev, ...updates }));
  };

  const resetDraft = () => {
    setDraftConfig({ ...activePool });
  };

  // Check if draft has diffs from current active pool
  const hasDiffs = useMemo(() => {
    return (
      draftConfig.baseFeeBps !== activePool.baseFeeBps ||
      draftConfig.decayHalfLifeSeconds !== activePool.decayHalfLifeSeconds ||
      draftConfig.volatilityAlpha !== activePool.volatilityAlpha ||
      draftConfig.minFeeBps !== activePool.minFeeBps ||
      draftConfig.maxFeeBps !== activePool.maxFeeBps ||
      draftConfig.cardinalityNext !== activePool.cardinalityNext
    );
  }, [draftConfig, activePool]);

  // Mathematical curve generation: Dynamic fee vs elapsed time
  const decayCurvePoints = useMemo(() => {
    const points: { timeSec: number; currentFeeBps: number; draftFeeBps: number }[] = [];
    const peakExcessCurrent = Math.max(0, activePool.lastFeeBps - activePool.baseFeeBps);
    const peakExcessDraft = Math.max(0, draftConfig.lastFeeBps - draftConfig.baseFeeBps);

    for (let t = 0; t <= 60; t += 2) {
      // Fee(t) = baseFee + excess * 2^(-t / halfLife)
      const currentDecayed =
        activePool.baseFeeBps +
        peakExcessCurrent * Math.pow(2, -t / Math.max(1, activePool.decayHalfLifeSeconds));
      const draftDecayed =
        draftConfig.baseFeeBps +
        peakExcessDraft * Math.pow(2, -t / Math.max(1, draftConfig.decayHalfLifeSeconds));

      points.push({
        timeSec: t,
        currentFeeBps: Number(currentDecayed.toFixed(2)),
        draftFeeBps: Number(draftDecayed.toFixed(2)),
      });
    }
    return points;
  }, [activePool, draftConfig]);

  // Mathematical curve: Dynamic fee response to tick shock
  const volatilityShockPoints = useMemo(() => {
    const points: { tickDelta: number; currentFeeBps: number; draftFeeBps: number }[] = [];

    for (let tick = 0; tick <= 100; tick += 5) {
      // 1 tick * alpha units (converted to bps, where 100 units = 1 bp)
      const currentSurcharge = (tick * activePool.volatilityAlpha) / 100;
      const draftSurcharge = (tick * draftConfig.volatilityAlpha) / 100;

      const currentTotal = Math.min(
        activePool.maxFeeBps,
        Math.max(activePool.minFeeBps, activePool.baseFeeBps + currentSurcharge)
      );
      const draftTotal = Math.min(
        draftConfig.maxFeeBps,
        Math.max(draftConfig.minFeeBps, draftConfig.baseFeeBps + draftSurcharge)
      );

      points.push({
        tickDelta: tick,
        currentFeeBps: Number(currentTotal.toFixed(2)),
        draftFeeBps: Number(draftTotal.toFixed(2)),
      });
    }
    return points;
  }, [activePool, draftConfig]);

  // Mock observations ring buffer
  const observations = useMemo<OracleObservation[]>(() => {
    const list: OracleObservation[] = [];
    const now = Math.floor(Date.now() / 1000);
    const baseTick = activePool.lastTick;

    for (let i = 0; i < Math.min(16, activePool.cardinality); i++) {
      const timeOffset = i * 12; // 12-second blocks
      const timestamp = now - timeOffset;
      const tick = baseTick - Math.floor(Math.sin(i * 0.8) * 15);
      const tickCumulative = (BigInt(tick) * BigInt(timestamp)).toString();
      const secondsPerLiquidity = (BigInt(1000000000) * BigInt(timeOffset + 1)).toString();

      list.push({
        index: i,
        blockTimestamp: timestamp,
        tickCumulative,
        secondsPerLiquidityCumulative: secondsPerLiquidity,
        initialized: true,
        timeAgoFormatted: i === 0 ? 'Latest (current block)' : `${timeOffset}s ago`,
      });
    }
    return list;
  }, [activePool]);

  // Apply calibration changes
  const applyCalibration = useCallback(() => {
    setPools((prev) =>
      prev.map((p) => (p.poolId === draftConfig.poolId ? { ...draftConfig } : p))
    );
  }, [draftConfig]);

  // Preset Configurations
  const applyPreset = (preset: 'HIGH_VOLATILITY' | 'STABLE_MEV' | 'STANDARD') => {
    if (preset === 'HIGH_VOLATILITY') {
      updateDraft({
        decayHalfLifeSeconds: 24, // Slow decay to protect LP longer
        volatilityAlpha: 80, // Heavy surcharge on tick moves
        maxFeeBps: 2000, // 20% cap
      });
    } else if (preset === 'STABLE_MEV') {
      updateDraft({
        decayHalfLifeSeconds: 4, // Rapid decay
        volatilityAlpha: 15,
        maxFeeBps: 100, // 1% cap
      });
    } else {
      updateDraft({
        decayHalfLifeSeconds: 12,
        volatilityAlpha: 50,
        maxFeeBps: 1000,
      });
    }
  };

  return {
    pools,
    activePool,
    draftConfig,
    selectedPoolId,
    handleSelectPool,
    updateDraft,
    resetDraft,
    hasDiffs,
    decayCurvePoints,
    volatilityShockPoints,
    observations,
    applyCalibration,
    applyPreset,
    canCalibrate: hasPermission('admin.circuit_breaker.trigger') || hasPermission('admin.pool.create'),
  };
}
