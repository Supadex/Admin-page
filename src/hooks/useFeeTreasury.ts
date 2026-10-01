import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { getAddressesForChain } from '../contracts/addresses';
import { SupaFeeCollectorABI, SupaPoolManagerABI } from '../contracts/abis';
import { useAdminPools } from './useAdminPools';
import { zeroAddress, type Address } from 'viem';

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
  currency0: Address;
  currency1: Address;
  accrued0: bigint;
  accrued1: bigint;
}

export interface FeeSplitConfig {
  daoTreasuryShareBps: number;
  lpStakingShareBps: number;
  insuranceReserveShareBps: number;
  targetTreasuryAddress: string;
  targetInsuranceAddress: string;
}

export function useFeeTreasury() {
  const { chain } = useAccount();
  const addrs = getAddressesForChain(chain?.id ?? 31337);
  const { pools: adminPools } = useAdminPools();
  const [selectedPoolIds, setSelectedPoolIds] = useState<string[]>([]);
  const [lastSweptTxHash, setLastSweptTxHash] = useState<string | null>(null);

  const { data: splitData, refetch: refetchSplit } = useReadContracts({
    contracts: addrs?.feeCollector
      ? [
          { address: addrs.feeCollector, abi: SupaFeeCollectorABI, functionName: 'daoTreasuryShareBps' },
          { address: addrs.feeCollector, abi: SupaFeeCollectorABI, functionName: 'lpStakingShareBps' },
          { address: addrs.feeCollector, abi: SupaFeeCollectorABI, functionName: 'insuranceReserveShareBps' },
          { address: addrs.feeCollector, abi: SupaFeeCollectorABI, functionName: 'daoTreasury' },
          { address: addrs.feeCollector, abi: SupaFeeCollectorABI, functionName: 'insuranceReserve' },
        ]
      : [],
    query: { enabled: !!addrs?.feeCollector },
  });

  const currencies = useMemo(() => {
    const set = new Set<string>();
    for (const p of adminPools) {
      set.add(p.currency0.toLowerCase());
      set.add(p.currency1.toLowerCase());
    }
    return [...set].map((c) => c as Address);
  }, [adminPools]);

  const { data: accruedReads, refetch: refetchAccrued } = useReadContracts({
    contracts:
      addrs?.poolManager && currencies.length
        ? currencies.map((c) => ({
            address: addrs.poolManager,
            abi: SupaPoolManagerABI,
            functionName: 'protocolFeesAccrued' as const,
            args: [c] as const,
          }))
        : [],
    query: { enabled: !!addrs?.poolManager && currencies.length > 0 },
  });

  const accruedByCurrency = useMemo(() => {
    const map: Record<string, bigint> = {};
    currencies.forEach((c, i) => {
      const r = accruedReads?.[i];
      map[c.toLowerCase()] = r?.status === 'success' ? (r.result as bigint) : 0n;
    });
    return map;
  }, [currencies, accruedReads]);

  const feeSplit: FeeSplitConfig = useMemo(
    () => ({
      daoTreasuryShareBps: Number(splitData?.[0]?.result ?? 6000),
      lpStakingShareBps: Number(splitData?.[1]?.result ?? 3000),
      insuranceReserveShareBps: Number(splitData?.[2]?.result ?? 1000),
      targetTreasuryAddress: String(splitData?.[3]?.result ?? addrs?.feeCollector ?? zeroAddress),
      targetInsuranceAddress: String(splitData?.[4]?.result ?? zeroAddress),
    }),
    [splitData, addrs?.feeCollector]
  );

  const pools: (PoolFeeRecord & { totalUSDValue: number; val0: number; val1: number })[] = useMemo(() => {
    return adminPools.map((p) => {
      const accrued0 = accruedByCurrency[p.currency0.toLowerCase()] ?? 0n;
      const accrued1 = accruedByCurrency[p.currency1.toLowerCase()] ?? 0n;
      // Display share of currency-level accrual attributed per pool (equal split if shared)
      const uncollectedToken0 = Number(accrued0) / 1e18;
      const uncollectedToken1 = Number(accrued1) / 1e6;
      const val0 = uncollectedToken0 * 0;
      const val1 = uncollectedToken1 * 1;
      return {
        id: p.id,
        pair: p.pair,
        token0Symbol: p.symbol0,
        token1Symbol: p.symbol1,
        curveType: p.curveType,
        feeTier: p.feeTier,
        uncollectedToken0,
        uncollectedToken1,
        token0USDPrice: 0,
        token1USDPrice: 1,
        is6909Claim: false,
        lastSweptTimestamp: 0,
        currency0: p.currency0,
        currency1: p.currency1,
        accrued0,
        accrued1,
        totalUSDValue: val0 + val1,
        val0,
        val1,
      };
    });
  }, [adminPools, accruedByCurrency]);

  const summary = useMemo(() => {
    let totalAccruedUSD = 0;
    pools.forEach((p) => {
      totalAccruedUSD += p.totalUSDValue;
    });
    return {
      totalAccruedUSD,
      physicalErc20USD: totalAccruedUSD,
      vault6909ClaimsUSD: 0,
      physicalRatio: 100,
      claims6909Ratio: 0,
      poolCount: pools.length,
    };
  }, [pools]);

  const selectedSummary = useMemo(() => {
    const selected = pools.filter((p) => selectedPoolIds.includes(p.id));
    return {
      selected,
      totalUSD: selected.reduce((acc, p) => acc + p.totalUSDValue, 0),
      count: selected.length,
    };
  }, [pools, selectedPoolIds]);

  const { writeContractAsync, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess && txHash) {
      setLastSweptTxHash(txHash);
      void refetchAccrued();
    }
  }, [isSuccess, txHash, refetchAccrued]);

  const toggleSelectPool = useCallback((id: string) => {
    setSelectedPoolIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const selectAllPools = useCallback(() => {
    setSelectedPoolIds((prev) => (prev.length === pools.length ? [] : pools.map((p) => p.id)));
  }, [pools]);

  const updateFeeSplit = useCallback(
    async (newSplit: Partial<FeeSplitConfig>) => {
      if (!addrs?.feeCollector) throw new Error('FeeCollector not deployed');
      const next = { ...feeSplit, ...newSplit };
      await writeContractAsync({
        address: addrs.feeCollector,
        abi: SupaFeeCollectorABI,
        functionName: 'setFeeSplit',
        args: [
          next.daoTreasuryShareBps,
          next.lpStakingShareBps,
          next.insuranceReserveShareBps,
        ],
      });
      await refetchSplit();
    },
    [addrs, feeSplit, writeContractAsync, refetchSplit]
  );

  const executeBatchSweep = useCallback(
    async (poolIdsToSweep: string[], _recipientOverride?: string) => {
      if (!addrs?.feeCollector) throw new Error('FeeCollector not deployed');
      const selected = pools.filter((p) => poolIdsToSweep.includes(p.id));
      const currencySet = new Set<Address>();
      selected.forEach((p) => {
        currencySet.add(p.currency0);
        currencySet.add(p.currency1);
      });
      const currenciesToSweep = [...currencySet];
      if (currenciesToSweep.length === 0) {
        return { success: false, txHash: null, sweptCount: 0, recipient: feeSplit.targetTreasuryAddress };
      }
      const hash = await writeContractAsync({
        address: addrs.feeCollector,
        abi: SupaFeeCollectorABI,
        functionName: 'sweepProtocolFees',
        args: [currenciesToSweep, false],
      });
      setSelectedPoolIds((prev) => prev.filter((id) => !poolIdsToSweep.includes(id)));
      return {
        success: true,
        txHash: hash,
        sweptCount: poolIdsToSweep.length,
        recipient: feeSplit.targetTreasuryAddress,
      };
    },
    [addrs, pools, writeContractAsync, feeSplit.targetTreasuryAddress]
  );

  return {
    pools,
    selectedPoolIds,
    toggleSelectPool,
    selectAllPools,
    summary,
    selectedSummary,
    feeSplit,
    updateFeeSplit,
    executeBatchSweep,
    isSweeping: isPending || isConfirming,
    lastSweptTxHash,
    isAvailable: !!addrs?.feeCollector,
  };
}
