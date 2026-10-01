import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useAdminAuth } from './useAdminAuth';
import { useAdminPools } from './useAdminPools';
import { getAddressesForChain } from '../contracts/addresses';
import { LVRShieldPluginABI, VolatilityTWAPOracleABI } from '../contracts/abis';
import type { Hex } from 'viem';

export interface PoolLVRConfig {
  poolId: string;
  pair: string;
  curveType: 'CLAMM' | 'BinAMM' | 'StableAMM';
  baseFeeBps: number;
  lastFeeBps: number;
  decayHalfLifeSeconds: number;
  volatilityAlpha: number;
  minFeeBps: number;
  maxFeeBps: number;
  lastSwapTimestamp: number;
  lastTick: number;
  cardinality: number;
  cardinalityNext: number;
  observationCount: number;
  instantaneousVolatility: number;
  currency0: `0x${string}`;
  currency1: `0x${string}`;
  fee: number;
  tickSpacing: number;
  plugin: `0x${string}`;
  curveTypeId: number;
}

export interface OracleObservation {
  index: number;
  blockTimestamp: number;
  tickCumulative: string;
  secondsPerLiquidityCumulative: string;
  initialized: boolean;
  timeAgoFormatted: string;
}

export function useLVRCalibration() {
  const { hasPermission } = useAdminAuth();
  const { chain } = useAccount();
  const addrs = getAddressesForChain(chain?.id ?? 31337);
  const { pools: adminPools } = useAdminPools();
  const { writeContractAsync, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const pools: PoolLVRConfig[] = useMemo(() => {
    return adminPools
      .filter(
        (p) =>
          p.plugin.toLowerCase() === (addrs?.lvrShieldPlugin || '').toLowerCase() ||
          p.plugin !== '0x0000000000000000000000000000000000000000'
      )
      .map((p) => ({
        poolId: p.id,
        pair: p.pair,
        curveType: p.curveType,
        baseFeeBps: p.fee / 100,
        lastFeeBps: p.fee / 100,
        decayHalfLifeSeconds: 12,
        volatilityAlpha: 50,
        minFeeBps: 1,
        maxFeeBps: 1000,
        lastSwapTimestamp: Date.now(),
        lastTick: 0,
        cardinality: 16,
        cardinalityNext: 16,
        observationCount: 16,
        instantaneousVolatility: 0,
        currency0: p.currency0,
        currency1: p.currency1,
        fee: p.fee,
        tickSpacing: p.tickSpacing,
        plugin: p.plugin,
        curveTypeId: p.curveTypeId,
      }));
  }, [adminPools, addrs?.lvrShieldPlugin]);

  const [selectedPoolId, setSelectedPoolId] = useState<string>('');
  const activePool = useMemo(() => {
    return pools.find((p) => p.poolId === selectedPoolId) || pools[0];
  }, [pools, selectedPoolId]);

  const [draftConfig, setDraftConfig] = useState<PoolLVRConfig | null>(null);

  useEffect(() => {
    if (pools.length && !selectedPoolId) setSelectedPoolId(pools[0].poolId);
  }, [pools, selectedPoolId]);

  useEffect(() => {
    if (activePool) setDraftConfig({ ...activePool });
  }, [activePool]);

  const handleSelectPool = (poolId: string) => {
    setSelectedPoolId(poolId);
  };

  const updateDraft = (updates: Partial<PoolLVRConfig>) => {
    setDraftConfig((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  const resetDraft = () => {
    if (activePool) setDraftConfig({ ...activePool });
  };

  const hasDiffs = useMemo(() => {
    if (!draftConfig || !activePool) return false;
    return (
      draftConfig.decayHalfLifeSeconds !== activePool.decayHalfLifeSeconds ||
      draftConfig.volatilityAlpha !== activePool.volatilityAlpha ||
      draftConfig.minFeeBps !== activePool.minFeeBps ||
      draftConfig.maxFeeBps !== activePool.maxFeeBps ||
      draftConfig.cardinalityNext !== activePool.cardinalityNext
    );
  }, [draftConfig, activePool]);

  const decayCurvePoints = useMemo(() => {
    if (!activePool || !draftConfig) return [];
    const points: { timeSec: number; currentFeeBps: number; draftFeeBps: number }[] = [];
    const peakExcessCurrent = Math.max(0, activePool.lastFeeBps - activePool.baseFeeBps);
    const peakExcessDraft = Math.max(0, draftConfig.lastFeeBps - draftConfig.baseFeeBps);
    for (let t = 0; t <= 60; t += 2) {
      points.push({
        timeSec: t,
        currentFeeBps: Number(
          (
            activePool.baseFeeBps +
            peakExcessCurrent * Math.pow(2, -t / Math.max(1, activePool.decayHalfLifeSeconds))
          ).toFixed(2)
        ),
        draftFeeBps: Number(
          (
            draftConfig.baseFeeBps +
            peakExcessDraft * Math.pow(2, -t / Math.max(1, draftConfig.decayHalfLifeSeconds))
          ).toFixed(2)
        ),
      });
    }
    return points;
  }, [activePool, draftConfig]);

  const volatilityShockPoints = useMemo(() => {
    if (!activePool || !draftConfig) return [];
    const points: { tickDelta: number; currentFeeBps: number; draftFeeBps: number }[] = [];
    for (let tick = 0; tick <= 100; tick += 5) {
      const currentSurcharge = (tick * activePool.volatilityAlpha) / 100;
      const draftSurcharge = (tick * draftConfig.volatilityAlpha) / 100;
      points.push({
        tickDelta: tick,
        currentFeeBps: Number(
          Math.min(
            activePool.maxFeeBps,
            Math.max(activePool.minFeeBps, activePool.baseFeeBps + currentSurcharge)
          ).toFixed(2)
        ),
        draftFeeBps: Number(
          Math.min(
            draftConfig.maxFeeBps,
            Math.max(draftConfig.minFeeBps, draftConfig.baseFeeBps + draftSurcharge)
          ).toFixed(2)
        ),
      });
    }
    return points;
  }, [activePool, draftConfig]);

  const observations = useMemo<OracleObservation[]>(() => {
    if (!activePool) return [];
    const list: OracleObservation[] = [];
    const now = Math.floor(Date.now() / 1000);
    for (let i = 0; i < Math.min(16, activePool.cardinality); i++) {
      list.push({
        index: i,
        blockTimestamp: now - i * 12,
        tickCumulative: '0',
        secondsPerLiquidityCumulative: '0',
        initialized: true,
        timeAgoFormatted: i === 0 ? 'Latest (current block)' : `${i * 12}s ago`,
      });
    }
    return list;
  }, [activePool]);

  const poolKeyArgs = useCallback((cfg: PoolLVRConfig) => {
    return {
      currency0: cfg.currency0,
      currency1: cfg.currency1,
      fee: cfg.fee,
      tickSpacing: cfg.tickSpacing,
      plugin: cfg.plugin,
      curveType: cfg.curveTypeId,
    } as const;
  }, []);

  const applyCalibration = useCallback(async () => {
    if (!draftConfig || !addrs?.lvrShieldPlugin) throw new Error('LVR plugin not deployed');
    const key = poolKeyArgs(draftConfig);
    await writeContractAsync({
      address: addrs.lvrShieldPlugin,
      abi: LVRShieldPluginABI,
      functionName: 'setDecayParameters',
      args: [
        key,
        draftConfig.decayHalfLifeSeconds,
        draftConfig.volatilityAlpha,
        draftConfig.minFeeBps,
        draftConfig.maxFeeBps,
      ],
    });
    if (draftConfig.cardinalityNext > draftConfig.cardinality && addrs.oracle) {
      await writeContractAsync({
        address: addrs.oracle,
        abi: VolatilityTWAPOracleABI,
        functionName: 'grow',
        args: [draftConfig.poolId as Hex, draftConfig.cardinalityNext],
      });
    }
  }, [draftConfig, addrs, writeContractAsync, poolKeyArgs]);

  const applyPreset = (preset: 'HIGH_VOLATILITY' | 'STABLE_MEV' | 'STANDARD') => {
    if (preset === 'HIGH_VOLATILITY') {
      updateDraft({ decayHalfLifeSeconds: 24, volatilityAlpha: 80, maxFeeBps: 2000 });
    } else if (preset === 'STABLE_MEV') {
      updateDraft({ decayHalfLifeSeconds: 4, volatilityAlpha: 15, maxFeeBps: 100 });
    } else {
      updateDraft({ decayHalfLifeSeconds: 12, volatilityAlpha: 50, maxFeeBps: 1000 });
    }
  };

  return {
    pools,
    activePool: activePool ?? null,
    draftConfig: draftConfig ?? null,
    selectedPoolId: selectedPoolId || pools[0]?.poolId || '',
    handleSelectPool,
    updateDraft,
    resetDraft,
    hasDiffs,
    decayCurvePoints,
    volatilityShockPoints,
    observations,
    applyCalibration,
    applyPreset,
    canCalibrate: hasPermission('admin.oracle.calibrate') || hasPermission('admin.pool.create'),
    isSubmitting: isPending || isConfirming,
    lastTxSuccess: isSuccess,
    isAvailable: !!addrs?.lvrShieldPlugin,
  };
}
