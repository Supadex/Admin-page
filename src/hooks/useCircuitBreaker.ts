import { useCallback, useEffect, useMemo, useState } from 'react';
import { encodeFunctionData, padHex, toHex, zeroHash, type Hex } from 'viem';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from 'wagmi';
import { useAdminAuth } from './useAdminAuth';
import { getAddressesForChain } from '../contracts/addresses';
import { CircuitBreakerABI, SupaTimelockABI } from '../contracts/abis';
import { useAdminPools } from './useAdminPools';

/** True when the wallet rejected / dismissed the signature prompt. */
export function isUserRejectedError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { name?: string; shortMessage?: string; message?: string; cause?: unknown };
  if (e.name === 'UserRejectedRequestError') return true;
  const msg = `${e.shortMessage ?? ''} ${e.message ?? ''}`.toLowerCase();
  if (msg.includes('user rejected') || msg.includes('user denied')) return true;
  return isUserRejectedError(e.cause);
}

function nextSalt(): Hex {
  return padHex(toHex(Date.now()), { size: 32 });
}

export interface TimelockAction {
  id: Hex;
  target: 'VAULT' | 'CURVE' | 'POOL';
  targetIdentifier: string;
  action: 'UNPAUSE';
  proposer: string;
  eta: number;
  executed: boolean;
  canceled: boolean;
  callData: Hex;
  salt: Hex;
}

export interface CircuitBreakerState {
  isVaultPaused: boolean;
  isCurvePaused: { clamm: boolean; binAmm: boolean; stableAmm: boolean };
  pausedPools: Record<string, boolean>;
  timelockQueue: TimelockAction[];
}

export function useCircuitBreaker() {
  const { address, chain } = useAccount();
  const { hasPermission } = useAdminAuth();
  const addrs = getAddressesForChain(chain?.id ?? 31337);
  const { pools, refetch: refetchPools } = useAdminPools();
  const publicClient = usePublicClient({ chainId: chain?.id });
  const { writeContractAsync, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });
  const [queue, setQueue] = useState<TimelockAction[]>([]);
  const [pausedPools, setPausedPools] = useState<Record<string, boolean>>({});

  const { data: isVaultPaused, refetch: refetchVault } = useReadContract({
    address: addrs?.circuitBreaker,
    abi: CircuitBreakerABI,
    functionName: 'isVaultPaused',
    query: { enabled: !!addrs?.circuitBreaker },
  });

  const { data: clammPaused, refetch: refetchClamm } = useReadContract({
    address: addrs?.circuitBreaker,
    abi: CircuitBreakerABI,
    functionName: 'isCurvePaused',
    args: [0],
    query: { enabled: !!addrs?.circuitBreaker },
  });

  const { data: binPaused, refetch: refetchBin } = useReadContract({
    address: addrs?.circuitBreaker,
    abi: CircuitBreakerABI,
    functionName: 'isCurvePaused',
    args: [1],
    query: { enabled: !!addrs?.circuitBreaker },
  });

  const { data: stablePaused, refetch: refetchStable } = useReadContract({
    address: addrs?.circuitBreaker,
    abi: CircuitBreakerABI,
    functionName: 'isCurvePaused',
    args: [2],
    query: { enabled: !!addrs?.circuitBreaker },
  });

  const { data: minDelay } = useReadContract({
    address: addrs?.timelock,
    abi: SupaTimelockABI,
    functionName: 'minDelay',
    query: { enabled: !!addrs?.timelock },
  });

  const refreshPoolPauses = useCallback(async () => {
    if (!publicClient || !addrs?.circuitBreaker || pools.length === 0) return;
    const entries = await Promise.all(
      pools.map(async (p) => {
        try {
          const paused = await publicClient.readContract({
            address: addrs.circuitBreaker,
            abi: CircuitBreakerABI,
            functionName: 'isPoolPaused',
            args: [p.id],
          });
          return [p.id, !!paused] as const;
        } catch {
          return [p.id, false] as const;
        }
      })
    );
    setPausedPools(Object.fromEntries(entries));
  }, [publicClient, addrs?.circuitBreaker, pools]);

  useEffect(() => {
    void refreshPoolPauses();
  }, [refreshPoolPauses]);

  const refetchAll = useCallback(async () => {
    await Promise.all([
      refetchVault(),
      refetchClamm(),
      refetchBin(),
      refetchStable(),
      refreshPoolPauses(),
      refetchPools(),
    ]);
  }, [refetchVault, refetchClamm, refetchBin, refetchStable, refreshPoolPauses, refetchPools]);

  const state: CircuitBreakerState = useMemo(
    () => ({
      isVaultPaused: !!isVaultPaused,
      isCurvePaused: {
        clamm: !!clammPaused,
        binAmm: !!binPaused,
        stableAmm: !!stablePaused,
      },
      pausedPools,
      timelockQueue: queue,
    }),
    [isVaultPaused, clammPaused, binPaused, stablePaused, pausedPools, queue]
  );

  const currentTier = state.isVaultPaused
    ? 3
    : state.isCurvePaused.clamm || state.isCurvePaused.binAmm || state.isCurvePaused.stableAmm
      ? 2
      : Object.values(state.pausedPools).some(Boolean)
        ? 1
        : 0;

  const pauseVault = useCallback(async () => {
    if (!addrs?.circuitBreaker) throw new Error('CircuitBreaker not deployed');
    await writeContractAsync({
      address: addrs.circuitBreaker,
      abi: CircuitBreakerABI,
      functionName: 'pauseVault',
    });
    await refetchAll();
  }, [addrs, writeContractAsync, refetchAll]);

  const pauseCurve = useCallback(
    async (curveType: 0 | 1 | 2) => {
      if (!addrs?.circuitBreaker) throw new Error('CircuitBreaker not deployed');
      await writeContractAsync({
        address: addrs.circuitBreaker,
        abi: CircuitBreakerABI,
        functionName: 'pauseCurve',
        args: [curveType],
      });
      await refetchAll();
    },
    [addrs, writeContractAsync, refetchAll]
  );

  const togglePoolPause = useCallback(
    async (poolId: string, currentPaused: boolean, proposer: string) => {
      if (!addrs?.circuitBreaker || !addrs.timelock) throw new Error('Not deployed');
      if (!currentPaused) {
        await writeContractAsync({
          address: addrs.circuitBreaker,
          abi: CircuitBreakerABI,
          functionName: 'pausePool',
          args: [poolId as Hex],
        });
        await refetchAll();
        return;
      }

      const predecessor = zeroHash;
      const callData = encodeFunctionData({
        abi: CircuitBreakerABI,
        functionName: 'unpausePool',
        args: [poolId as Hex],
      });
      const salt = nextSalt();
      const delay = minDelay ?? 86400n;
      const eta = Date.now() + Number(delay) * 1000;

      await writeContractAsync({
        address: addrs.timelock,
        abi: SupaTimelockABI,
        functionName: 'schedule',
        args: [addrs.circuitBreaker, 0n, callData, predecessor, salt, delay],
      });
      const id = (await publicClient?.readContract({
        address: addrs.timelock,
        abi: SupaTimelockABI,
        functionName: 'hashOperation',
        args: [addrs.circuitBreaker, 0n, callData, predecessor, salt],
      })) as Hex;
      setQueue((prev) => [
        {
          id,
          target: 'POOL',
          targetIdentifier: poolId,
          action: 'UNPAUSE',
          proposer,
          eta,
          executed: false,
          canceled: false,
          callData,
          salt,
        },
        ...prev,
      ]);

      // Anvil: warp past minDelay and execute immediately
      if ((chain?.id ?? 31337) === 31337 && publicClient) {
        await publicClient.request({
          method: 'evm_increaseTime',
          params: [Number(delay) + 1],
        } as never);
        await publicClient.request({ method: 'evm_mine', params: [] } as never);
        await writeContractAsync({
          address: addrs.timelock,
          abi: SupaTimelockABI,
          functionName: 'execute',
          args: [addrs.circuitBreaker, 0n, callData, predecessor, salt],
        });
        setQueue((prev) => prev.map((a) => (a.id === id ? { ...a, executed: true } : a)));
        await refetchAll();
      }
    },
    [addrs, writeContractAsync, refetchAll, minDelay, publicClient, chain?.id]
  );

  const requestUnpauseVault = useCallback(
    async (proposer: string) => {
      if (!addrs?.circuitBreaker || !addrs.timelock) throw new Error('Not deployed');
      const predecessor = zeroHash;
      const callData = encodeFunctionData({
        abi: CircuitBreakerABI,
        functionName: 'unpauseVault',
      });
      const salt = nextSalt();
      const delay = minDelay ?? 86400n;
      const eta = Date.now() + Number(delay) * 1000;
      await writeContractAsync({
        address: addrs.timelock,
        abi: SupaTimelockABI,
        functionName: 'schedule',
        args: [addrs.circuitBreaker, 0n, callData, predecessor, salt, delay],
      });
      const id = (await publicClient?.readContract({
        address: addrs.timelock,
        abi: SupaTimelockABI,
        functionName: 'hashOperation',
        args: [addrs.circuitBreaker, 0n, callData, predecessor, salt],
      })) as Hex;
      setQueue((prev) => [
        {
          id,
          target: 'VAULT',
          targetIdentifier: 'Global Vault & AMM Gateway',
          action: 'UNPAUSE',
          proposer,
          eta,
          executed: false,
          canceled: false,
          callData,
          salt,
        },
        ...prev,
      ]);

      // Anvil: skip 24h wait
      if ((chain?.id ?? 31337) === 31337 && publicClient) {
        await publicClient.request({
          method: 'evm_increaseTime',
          params: [Number(delay) + 1],
        } as never);
        await publicClient.request({ method: 'evm_mine', params: [] } as never);
        await writeContractAsync({
          address: addrs.timelock,
          abi: SupaTimelockABI,
          functionName: 'execute',
          args: [addrs.circuitBreaker, 0n, callData, predecessor, salt],
        });
        setQueue((prev) => prev.map((a) => (a.id === id ? { ...a, executed: true } : a)));
        await refetchAll();
      }
    },
    [addrs, writeContractAsync, minDelay, publicClient, chain?.id, refetchAll]
  );

  const requestUnpauseCurve = useCallback(
    async (curveType: 0 | 1 | 2, proposer: string) => {
      if (!addrs?.circuitBreaker || !addrs.timelock) throw new Error('Not deployed');
      const predecessor = zeroHash;
      const callData = encodeFunctionData({
        abi: CircuitBreakerABI,
        functionName: 'unpauseCurve',
        args: [curveType],
      });
      const salt = nextSalt();
      const delay = minDelay ?? 86400n;
      const eta = Date.now() + Number(delay) * 1000;
      const curveName =
        curveType === 0
          ? 'CLAMM (Concentrated)'
          : curveType === 1
            ? 'BinAMM (Bins)'
            : 'StableAMM (Stableswap)';
      await writeContractAsync({
        address: addrs.timelock,
        abi: SupaTimelockABI,
        functionName: 'schedule',
        args: [addrs.circuitBreaker, 0n, callData, predecessor, salt, delay],
      });
      const id = (await publicClient?.readContract({
        address: addrs.timelock,
        abi: SupaTimelockABI,
        functionName: 'hashOperation',
        args: [addrs.circuitBreaker, 0n, callData, predecessor, salt],
      })) as Hex;
      setQueue((prev) => [
        {
          id,
          target: 'CURVE',
          targetIdentifier: `${curveName} Engine`,
          action: 'UNPAUSE',
          proposer,
          eta,
          executed: false,
          canceled: false,
          callData,
          salt,
        },
        ...prev,
      ]);

      // Anvil: warp past minDelay and execute immediately so local unpause works
      if ((chain?.id ?? 31337) === 31337 && publicClient) {
        await publicClient.request({
          method: 'evm_increaseTime',
          params: [Number(delay) + 1],
        } as never);
        await publicClient.request({ method: 'evm_mine', params: [] } as never);
        await writeContractAsync({
          address: addrs.timelock,
          abi: SupaTimelockABI,
          functionName: 'execute',
          args: [addrs.circuitBreaker, 0n, callData, predecessor, salt],
        });
        setQueue((prev) => prev.map((a) => (a.id === id ? { ...a, executed: true } : a)));
        await refetchAll();
      }
    },
    [addrs, writeContractAsync, minDelay, publicClient, chain?.id, refetchAll]
  );

  const executeTimelockAction = useCallback(
    async (id: string) => {
      if (!addrs?.timelock || !addrs.circuitBreaker || !publicClient) {
        throw new Error('Not deployed');
      }
      const action = queue.find((a) => a.id === id);
      if (!action) return;

      // Anvil/local: warp past remaining delay so Execute is usable without waiting 24h
      const chainId = chain?.id ?? 31337;
      if (chainId === 31337) {
        const remainingSec = Math.max(0, Math.ceil((action.eta - Date.now()) / 1000));
        if (remainingSec > 0) {
          await publicClient.request({
            method: 'evm_increaseTime' as 'eth_chainId',
            params: [remainingSec + 1] as never,
          });
          await publicClient.request({
            method: 'evm_mine' as 'eth_chainId',
            params: [] as never,
          });
        }
      }

      await writeContractAsync({
        address: addrs.timelock,
        abi: SupaTimelockABI,
        functionName: 'execute',
        args: [addrs.circuitBreaker, 0n, action.callData, zeroHash, action.salt],
      });
      setQueue((prev) => prev.map((a) => (a.id === id ? { ...a, executed: true } : a)));
      await refetchAll();
    },
    [addrs, queue, writeContractAsync, refetchAll, publicClient, chain?.id]
  );

  const cancelTimelockAction = useCallback(
    async (id: string) => {
      if (!addrs?.timelock) throw new Error('Not deployed');
      await writeContractAsync({
        address: addrs.timelock,
        abi: SupaTimelockABI,
        functionName: 'cancel',
        args: [id as Hex],
      });
      setQueue((prev) => prev.map((a) => (a.id === id ? { ...a, canceled: true } : a)));
    },
    [addrs, writeContractAsync]
  );

  return {
    state,
    currentTier,
    minDelaySeconds: Number(minDelay ?? 86400n),
    isSubmitting: isPending || isConfirming,
    canTriggerPause: hasPermission('admin.circuit_breaker.trigger'),
    canManageTimelock: hasPermission('admin.circuit_breaker.reset'),
    pauseVault,
    requestUnpauseVault,
    pauseCurve,
    requestUnpauseCurve,
    togglePoolPause,
    executeTimelockAction,
    cancelTimelockAction,
    refetchAll,
    address,
  };
}
