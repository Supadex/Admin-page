import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useConnection,
  usePublicClient,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useAdminAuth } from "./useAdminAuth";
import { useAdminPools } from "./useAdminPools";
import { getAddressesForChain } from "../contracts/addresses";
import {
  LVRShieldPluginABI,
  VolatilityTWAPOracleABI,
  SupaRolesABI,
} from "../contracts/abis";
import type { Address, Hex } from "viem";
import { zeroAddress } from "viem";

/** Fee units on LVR are pips (1e-6). 3000 pips = 0.30%. Cap must be < 1e6. */
const PIP = 1;
const MAX_FEE_PIP = 1_000_000 - 1;

export interface PoolLVRConfig {
  poolId: string;
  pair: string;
  curveType: "CLAMM" | "BinAMM" | "StableAMM";
  /** PoolKey.fee (pips) — display only; not set via LVR setters */
  baseFeePips: number;
  lastFeePips: number;
  decayHalfLifeSeconds: number;
  volatilityAlpha: number;
  minFeePips: number;
  maxFeePips: number;
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
  isInitialized: boolean;
}

export interface OracleObservation {
  index: number;
  blockTimestamp: number;
  tickCumulative: string;
  secondsPerLiquidityCumulative: string;
  initialized: boolean;
  timeAgoFormatted: string;
}

function pipsToBpsDisplay(pips: number): number {
  return pips / 100;
}

export function useLVRCalibration() {
  const { hasPermission, address: wallet } = useAdminAuth();
  const { chain } = useConnection();
  const publicClient = usePublicClient();
  const addrs = getAddressesForChain(chain?.id ?? 31337);
  const { pools: adminPools } = useAdminPools();
  const { mutateAsync, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const [oracleAddress, setOracleAddress] = useState<Address | null>(null);
  const [rolesConfigured, setRolesConfigured] = useState(false);
  const [isOperator, setIsOperator] = useState(false);
  const [onchainByPool, setOnchainByPool] = useState<
    Record<string, Partial<PoolLVRConfig>>
  >({});
  const [loadingStates, setLoadingStates] = useState(false);

  const lvrPlugin = addrs?.lvrShieldPlugin;

  // Derive oracle via LVRShieldPlugin.oracle() — never stale addrs.oracle for grow/read.
  useEffect(() => {
    if (!publicClient || !lvrPlugin) {
      setOracleAddress(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [oracle, rolesAddr] = await Promise.all([
          publicClient.readContract({
            address: lvrPlugin,
            abi: LVRShieldPluginABI,
            functionName: "oracle",
          }) as Promise<Address>,
          publicClient.readContract({
            address: lvrPlugin,
            abi: LVRShieldPluginABI,
            functionName: "roles",
          }) as Promise<Address>,
        ]);
        if (cancelled) return;
        setOracleAddress(oracle && oracle !== zeroAddress ? oracle : null);
        const rolesOk = !!rolesAddr && rolesAddr !== zeroAddress;
        setRolesConfigured(rolesOk);
        if (rolesOk && wallet) {
          const op = (await publicClient.readContract({
            address: rolesAddr,
            abi: SupaRolesABI,
            functionName: "isOperator",
            args: [wallet as Address],
          })) as boolean;
          if (!cancelled) setIsOperator(op);
        } else {
          setIsOperator(false);
        }
      } catch {
        if (!cancelled) {
          setOracleAddress(null);
          setRolesConfigured(false);
          setIsOperator(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [publicClient, lvrPlugin, wallet]);

  // LVR-only pools
  const lvrPoolsMeta = useMemo(() => {
    if (!lvrPlugin) return [];
    return adminPools.filter(
      (p) =>
        (p.plugin || p.hookAddress || "").toLowerCase() ===
        lvrPlugin.toLowerCase(),
    );
  }, [adminPools, lvrPlugin]);

  useEffect(() => {
    if (!publicClient || !lvrPlugin || lvrPoolsMeta.length === 0) {
      setOnchainByPool({});
      return;
    }
    let cancelled = false;
    setLoadingStates(true);
    (async () => {
      const next: Record<string, Partial<PoolLVRConfig>> = {};
      await Promise.all(
        lvrPoolsMeta.map(async (p) => {
          try {
            const state = (await publicClient.readContract({
              address: lvrPlugin,
              abi: LVRShieldPluginABI,
              functionName: "poolLVRStates",
              args: [p.id as Hex],
            })) as readonly [
              number,
              number,
              number,
              number,
              number,
              number,
              number,
              number,
              boolean,
            ];
            const [
              baseFee,
              lastFee,
              lastSwapTimestamp,
              lastTick,
              decayHalfLife,
              volatilityAlpha,
              minFeeBps,
              maxFeeBps,
              isInitialized,
            ] = state;

            let cardinality = 0;
            let cardinalityNext = 0;
            let instantaneousVolatility = 0;
            if (oracleAddress) {
              try {
                const orb = (await publicClient.readContract({
                  address: oracleAddress,
                  abi: VolatilityTWAPOracleABI,
                  functionName: "states",
                  args: [p.id as Hex],
                })) as readonly [number, number, number];
                cardinality = Number(orb[1]);
                cardinalityNext = Number(orb[2]);
                instantaneousVolatility = Number(
                  await publicClient.readContract({
                    address: oracleAddress,
                    abi: VolatilityTWAPOracleABI,
                    functionName: "getInstantaneousVolatility",
                    args: [p.id as Hex, 600],
                  }),
                );
              } catch {
                // oracle may not be grown yet
              }
            }

            next[p.id] = {
              baseFeePips: Number(baseFee),
              lastFeePips: Number(lastFee),
              lastSwapTimestamp: Number(lastSwapTimestamp),
              lastTick: Number(lastTick),
              decayHalfLifeSeconds: Number(decayHalfLife),
              volatilityAlpha: Number(volatilityAlpha),
              minFeePips: Number(minFeeBps),
              maxFeePips: Number(maxFeeBps),
              isInitialized: Boolean(isInitialized),
              cardinality,
              cardinalityNext,
              observationCount: cardinality,
              instantaneousVolatility,
            };
          } catch {
            // skip
          }
        }),
      );
      if (!cancelled) {
        setOnchainByPool(next);
        setLoadingStates(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [publicClient, lvrPlugin, lvrPoolsMeta, oracleAddress, isSuccess]);

  const pools: PoolLVRConfig[] = useMemo(() => {
    return lvrPoolsMeta.map((p) => {
      const oc = onchainByPool[p.id] || {};
      return {
        poolId: p.id,
        pair: p.pair,
        curveType: p.curveType,
        baseFeePips: oc.baseFeePips ?? p.fee,
        lastFeePips: oc.lastFeePips ?? p.fee,
        decayHalfLifeSeconds: oc.decayHalfLifeSeconds ?? 12,
        volatilityAlpha: oc.volatilityAlpha ?? 50,
        minFeePips: oc.minFeePips ?? 1,
        maxFeePips: oc.maxFeePips ?? 100_000,
        lastSwapTimestamp: oc.lastSwapTimestamp ?? 0,
        lastTick: oc.lastTick ?? 0,
        cardinality: oc.cardinality ?? 0,
        cardinalityNext: oc.cardinalityNext ?? 0,
        observationCount: oc.observationCount ?? 0,
        instantaneousVolatility: oc.instantaneousVolatility ?? 0,
        currency0: p.currency0,
        currency1: p.currency1,
        fee: p.fee,
        tickSpacing: p.tickSpacing,
        plugin: p.plugin,
        curveTypeId: p.curveTypeId,
        isInitialized: oc.isInitialized ?? false,
      };
    });
  }, [lvrPoolsMeta, onchainByPool]);

  const [selectedPoolId, setSelectedPoolId] = useState<string>("");
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

  const validationError = useMemo(() => {
    if (!draftConfig) return null;
    if (draftConfig.decayHalfLifeSeconds <= 0)
      return "Decay half-life must be > 0";
    if (draftConfig.minFeePips > draftConfig.maxFeePips)
      return "minFee must be ≤ maxFee";
    if (
      draftConfig.minFeePips >= MAX_FEE_PIP ||
      draftConfig.maxFeePips >= MAX_FEE_PIP
    ) {
      return "Fee bounds must be < 1e6 pips";
    }
    if (!rolesConfigured)
      return "LVR roles() unset — Operator gates cannot pass";
    if (!isOperator && hasPermission("admin.oracle.calibrate")) {
      return "Wallet is not an on-chain Operator for LVR roles";
    }
    return null;
  }, [draftConfig, rolesConfigured, isOperator, hasPermission]);

  const hasDiffs = useMemo(() => {
    if (!draftConfig || !activePool) return false;
    return (
      draftConfig.decayHalfLifeSeconds !== activePool.decayHalfLifeSeconds ||
      draftConfig.volatilityAlpha !== activePool.volatilityAlpha ||
      draftConfig.minFeePips !== activePool.minFeePips ||
      draftConfig.maxFeePips !== activePool.maxFeePips
    );
  }, [draftConfig, activePool]);

  const decayCurvePoints = useMemo(() => {
    if (!activePool || !draftConfig) return [];
    const points: {
      timeSec: number;
      currentFeeBps: number;
      draftFeeBps: number;
    }[] = [];
    const peakExcessCurrent = Math.max(
      0,
      activePool.lastFeePips - activePool.baseFeePips,
    );
    const peakExcessDraft = Math.max(
      0,
      draftConfig.lastFeePips - draftConfig.baseFeePips,
    );
    for (let t = 0; t <= 60; t += 2) {
      points.push({
        timeSec: t,
        currentFeeBps: Number(
          pipsToBpsDisplay(
            activePool.baseFeePips +
              peakExcessCurrent *
                Math.pow(2, -t / Math.max(1, activePool.decayHalfLifeSeconds)),
          ).toFixed(2),
        ),
        draftFeeBps: Number(
          pipsToBpsDisplay(
            draftConfig.baseFeePips +
              peakExcessDraft *
                Math.pow(2, -t / Math.max(1, draftConfig.decayHalfLifeSeconds)),
          ).toFixed(2),
        ),
      });
    }
    return points;
  }, [activePool, draftConfig]);

  const volatilityShockPoints = useMemo(() => {
    if (!activePool || !draftConfig) return [];
    const points: {
      tickDelta: number;
      currentFeeBps: number;
      draftFeeBps: number;
    }[] = [];
    for (let tick = 0; tick <= 100; tick += 5) {
      const currentSurcharge = (tick * activePool.volatilityAlpha) / 100;
      const draftSurcharge = (tick * draftConfig.volatilityAlpha) / 100;
      points.push({
        tickDelta: tick,
        currentFeeBps: Number(
          pipsToBpsDisplay(
            Math.min(
              activePool.maxFeePips,
              Math.max(
                activePool.minFeePips,
                activePool.baseFeePips + currentSurcharge,
              ),
            ),
          ).toFixed(2),
        ),
        draftFeeBps: Number(
          pipsToBpsDisplay(
            Math.min(
              draftConfig.maxFeePips,
              Math.max(
                draftConfig.minFeePips,
                draftConfig.baseFeePips + draftSurcharge,
              ),
            ),
          ).toFixed(2),
        ),
      });
    }
    return points;
  }, [activePool, draftConfig]);

  const observations = useMemo<OracleObservation[]>(() => {
    if (!activePool || activePool.cardinality === 0) return [];
    const list: OracleObservation[] = [];
    const now = Math.floor(Date.now() / 1000);
    for (let i = 0; i < Math.min(16, activePool.cardinality); i++) {
      list.push({
        index: i,
        blockTimestamp: now - i * 12,
        tickCumulative: "0",
        secondsPerLiquidityCumulative: "0",
        initialized: true,
        timeAgoFormatted: i === 0 ? "Latest (current block)" : `${i * 12}s ago`,
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
    if (!draftConfig || !lvrPlugin) throw new Error("LVR plugin not deployed");
    if (validationError) throw new Error(validationError);
    if (draftConfig.decayHalfLifeSeconds <= 0)
      throw new Error("InvalidDecayHalfLife");
    if (draftConfig.minFeePips > draftConfig.maxFeePips)
      throw new Error("InvalidFeeBounds");
    const key = poolKeyArgs(draftConfig);
    // No oracle.grow — onlyWriter is LVR; init already grows to 64.
    await mutateAsync({
      address: lvrPlugin,
      abi: LVRShieldPluginABI,
      functionName: "setDecayParameters",
      args: [
        key,
        draftConfig.decayHalfLifeSeconds,
        draftConfig.volatilityAlpha,
        draftConfig.minFeePips,
        draftConfig.maxFeePips,
      ],
    });
  }, [draftConfig, lvrPlugin, mutateAsync, poolKeyArgs, validationError]);

  const applyPreset = (
    preset: "HIGH_VOLATILITY" | "STABLE_MEV" | "STANDARD",
  ) => {
    if (preset === "HIGH_VOLATILITY") {
      updateDraft({
        decayHalfLifeSeconds: 24,
        volatilityAlpha: 80,
        maxFeePips: 200_000,
      });
    } else if (preset === "STABLE_MEV") {
      updateDraft({
        decayHalfLifeSeconds: 4,
        volatilityAlpha: 15,
        maxFeePips: 10_000,
      });
    } else {
      updateDraft({
        decayHalfLifeSeconds: 12,
        volatilityAlpha: 50,
        maxFeePips: 100_000,
      });
    }
  };

  const canCalibrate =
    hasPermission("admin.oracle.calibrate") &&
    rolesConfigured &&
    isOperator &&
    !validationError;

  return {
    pools,
    activePool: activePool ?? null,
    draftConfig: draftConfig ?? null,
    selectedPoolId: selectedPoolId || pools[0]?.poolId || "",
    handleSelectPool,
    updateDraft,
    resetDraft,
    hasDiffs,
    decayCurvePoints,
    volatilityShockPoints,
    observations,
    applyCalibration,
    applyPreset,
    canCalibrate,
    validationError,
    rolesConfigured,
    isOperator,
    oracleAddress,
    loadingStates,
    isSubmitting: isPending || isConfirming,
    lastTxSuccess: isSuccess,
    isAvailable: !!lvrPlugin,
    /** @deprecated use *Pips fields — kept for chart label helpers */
    PIP,
  };
}
