import { useState, useMemo, useCallback } from 'react';
import { APP_CONFIG } from '../utils/constants';

export interface PoolFeeRecord {
  id: string;
  pair: string;
  token0Symbol: string;
  token1Symbol: string;
  curveType: 'CLAMM' | 'BinAMM' | 'StableAMM';
  feeTier: string;
  uncollectedToken0: number;
  uncollectedToken1: number;
  token0USDPrice: number;
  token1USDPrice: number;
  is6909Claim: boolean;
  lastSweptTimestamp: number;
}

export interface FeeSplitConfig {
  daoTreasuryShareBps: number;    // e.g. 6000 = 60%
  lpStakingShareBps: number;      // e.g. 3000 = 30%
  insuranceReserveShareBps: number; // e.g. 1000 = 10%
  targetTreasuryAddress: string;
  targetInsuranceAddress: string;
}

const INITIAL_POOLS_FEES: PoolFeeRecord[] = [
  {
    id: '0x1a8f90ab3c44cddb6a900fa2b585dd299e03d12fa4293bc0000000000000001',
    pair: 'ETH / USDC',
    token0Symbol: 'ETH',
    token1Symbol: 'USDC',
    curveType: 'CLAMM',
    feeTier: '0.05%',
    uncollectedToken0: 12.45,
    uncollectedToken1: 34120.5,
    token0USDPrice: 2650,
    token1USDPrice: 1.0,
    is6909Claim: false,
    lastSweptTimestamp: Date.now() - 3600 * 1000 * 36, // 36h ago
  },
  {
    id: '0x4b7c21de90f79bf6eb2c4f870365e785982e1f101e93b9060000000000000002',
    pair: 'WBTC / ETH',
    token0Symbol: 'WBTC',
    token1Symbol: 'ETH',
    curveType: 'CLAMM',
    feeTier: '0.30%',
    uncollectedToken0: 0.84,
    uncollectedToken1: 8.92,
    token0USDPrice: 64200,
    token1USDPrice: 2650,
    is6909Claim: true,
    lastSweptTimestamp: Date.now() - 3600 * 1000 * 18, // 18h ago
  },
  {
    id: '0x7e2a55ff15d34aaf54267db7d7c367839aaf71a00a2c6a650000000000000003',
    pair: 'USDC / USDT',
    token0Symbol: 'USDC',
    token1Symbol: 'USDT',
    curveType: 'StableAMM',
    feeTier: '0.01%',
    uncollectedToken0: 42890.0,
    uncollectedToken1: 41200.0,
    token0USDPrice: 1.0,
    token1USDPrice: 1.0,
    is6909Claim: false,
    lastSweptTimestamp: Date.now() - 3600 * 1000 * 72, // 3 days ago
  },
  {
    id: '0x99dd01cc9965507d1a55bcc2695c58ba16fb37d819b0a4dc0000000000000004',
    pair: 'ARB / ETH',
    token0Symbol: 'ARB',
    token1Symbol: 'ETH',
    curveType: 'BinAMM',
    feeTier: '0.20%',
    uncollectedToken0: 8940.0,
    uncollectedToken1: 3.12,
    token0USDPrice: 0.58,
    token1USDPrice: 2650,
    is6909Claim: true,
    lastSweptTimestamp: Date.now() - 3600 * 1000 * 6, // 6h ago
  },
];

export function useFeeTreasury() {
  const [pools, setPools] = useState<PoolFeeRecord[]>(INITIAL_POOLS_FEES);
  const [selectedPoolIds, setSelectedPoolIds] = useState<string[]>([]);
  const [feeSplit, setFeeSplit] = useState<FeeSplitConfig>({
    daoTreasuryShareBps: 6000,
    lpStakingShareBps: 3000,
    insuranceReserveShareBps: 1000,
    targetTreasuryAddress: APP_CONFIG.contracts.feeCollector,
    targetInsuranceAddress: '0x976EA74026E726554dB657fA54763abd0C3a0aa9',
  });
  const [isSweeping, setIsSweeping] = useState(false);
  const [lastSweptTxHash, setLastSweptTxHash] = useState<string | null>(null);

  // Compute valuations
  const poolValuations = useMemo(() => {
    return pools.map((pool) => {
      const val0 = pool.uncollectedToken0 * pool.token0USDPrice;
      const val1 = pool.uncollectedToken1 * pool.token1USDPrice;
      const totalVal = val0 + val1;
      return {
        ...pool,
        totalUSDValue: totalVal,
        val0,
        val1,
      };
    });
  }, [pools]);

  const summary = useMemo(() => {
    let totalAccruedUSD = 0;
    let physicalErc20USD = 0;
    let vault6909ClaimsUSD = 0;

    poolValuations.forEach((p) => {
      totalAccruedUSD += p.totalUSDValue;
      if (p.is6909Claim) {
        vault6909ClaimsUSD += p.totalUSDValue;
      } else {
        physicalErc20USD += p.totalUSDValue;
      }
    });

    return {
      totalAccruedUSD,
      physicalErc20USD,
      vault6909ClaimsUSD,
      physicalRatio: totalAccruedUSD > 0 ? (physicalErc20USD / totalAccruedUSD) * 100 : 0,
      claims6909Ratio: totalAccruedUSD > 0 ? (vault6909ClaimsUSD / totalAccruedUSD) * 100 : 0,
      poolCount: pools.length,
    };
  }, [poolValuations, pools.length]);

  // Selected totals for batch sweep
  const selectedSummary = useMemo(() => {
    const selected = poolValuations.filter((p) => selectedPoolIds.includes(p.id));
    const totalUSD = selected.reduce((acc, p) => acc + p.totalUSDValue, 0);
    const count = selected.length;
    return {
      selected,
      totalUSD,
      count,
    };
  }, [poolValuations, selectedPoolIds]);

  const toggleSelectPool = useCallback((id: string) => {
    setSelectedPoolIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const selectAllPools = useCallback(() => {
    if (selectedPoolIds.length === pools.length) {
      setSelectedPoolIds([]);
    } else {
      setSelectedPoolIds(pools.map((p) => p.id));
    }
  }, [pools, selectedPoolIds.length]);

  const updateFeeSplit = useCallback((newSplit: Partial<FeeSplitConfig>) => {
    setFeeSplit((prev) => ({ ...prev, ...newSplit }));
  }, []);

  // Simulate Batch Sweep
  const executeBatchSweep = useCallback(
    async (poolIdsToSweep: string[], recipientOverride?: string) => {
      setIsSweeping(true);
      const target = recipientOverride || feeSplit.targetTreasuryAddress;

      // Simulate blockchain execution delay
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const mockTxHash = `0x${Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('')}`;

      setPools((prev) =>
        prev.map((pool) => {
          if (poolIdsToSweep.includes(pool.id)) {
            return {
              ...pool,
              uncollectedToken0: 0,
              uncollectedToken1: 0,
              lastSweptTimestamp: Date.now(),
            };
          }
          return pool;
        })
      );

      setSelectedPoolIds((prev) => prev.filter((id) => !poolIdsToSweep.includes(id)));
      setIsSweeping(false);
      setLastSweptTxHash(mockTxHash);

      return {
        success: true,
        txHash: mockTxHash,
        sweptCount: poolIdsToSweep.length,
        recipient: target,
      };
    },
    [feeSplit.targetTreasuryAddress]
  );

  return {
    pools: poolValuations,
    selectedPoolIds,
    toggleSelectPool,
    selectAllPools,
    summary,
    selectedSummary,
    feeSplit,
    updateFeeSplit,
    executeBatchSweep,
    isSweeping,
    lastSweptTxHash,
  };
}
