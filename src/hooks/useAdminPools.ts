import { useCallback, useEffect, useState } from 'react';
import {
  formatUnits,
  parseAbiItem,
  zeroAddress,
  zeroHash,
  type Address,
  type Hex,
  type PublicClient,
} from 'viem';
import { useAccount, usePublicClient } from 'wagmi';
import { SupaPoolManagerABI, ERC20ABI } from '../contracts/abis';
import { getAddressesForChain } from '../contracts/addresses';
import {
  CurveType,
  getKnownTokens,
  computePoolId,
  type KnownToken,
} from '../utils/poolMath';

const initializeEvent = parseAbiItem(
  'event Initialize(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address plugin, uint160 sqrtPriceX96, int24 tick)'
);

export interface AdminPool {
  id: Hex;
  pair: string;
  symbol0: string;
  symbol1: string;
  currency0: Address;
  currency1: Address;
  curveType: 'CLAMM' | 'BinAMM' | 'StableAMM';
  curveTypeId: CurveType;
  feeTier: string;
  fee: number;
  tickSpacing: number;
  plugin: Address;
  tvlUSD: number;
  volume24h: number;
  hookAddress: string;
  status: 'ACTIVE' | 'PAUSED';
  liquidity: bigint;
  sqrtPriceX96: bigint;
}

function curveLabel(curveType: CurveType): 'CLAMM' | 'BinAMM' | 'StableAMM' {
  if (curveType === CurveType.STABLE_AMM) return 'StableAMM';
  if (curveType === CurveType.BIN_AMM) return 'BinAMM';
  return 'CLAMM';
}

function resolveCurveType(
  poolId: Hex,
  currency0: Address,
  currency1: Address,
  fee: number,
  tickSpacing: number,
  plugin: Address
): CurveType {
  for (const curveType of [CurveType.CLAMM, CurveType.BIN_AMM, CurveType.STABLE_AMM] as const) {
    const id = computePoolId({
      currency0,
      currency1,
      fee,
      tickSpacing,
      plugin,
      curveType,
    });
    if (id.toLowerCase() === poolId.toLowerCase()) return curveType;
  }
  return CurveType.CLAMM;
}

async function resolveToken(
  publicClient: PublicClient,
  address: Address,
  chainId?: number
): Promise<KnownToken> {
  const catalog = getKnownTokens(chainId);
  const known = catalog.find((t) => t.address.toLowerCase() === address.toLowerCase());
  if (known) return known;
  if (address === zeroAddress) {
    return catalog.find((t) => t.address === zeroAddress) || {
      address: zeroAddress,
      symbol: 'ETH',
      name: 'Ether',
      decimals: 18,
      priceUSD: 0,
    };
  }
  try {
    const [symbol, name, decimals] = await Promise.all([
      publicClient.readContract({ address, abi: ERC20ABI, functionName: 'symbol' }),
      publicClient.readContract({ address, abi: ERC20ABI, functionName: 'name' }),
      publicClient.readContract({ address, abi: ERC20ABI, functionName: 'decimals' }),
    ]);
    return {
      address,
      symbol: String(symbol),
      name: String(name),
      decimals: Number(decimals),
      priceUSD: 0,
    };
  } catch {
    return {
      address,
      symbol: `${address.slice(0, 6)}`,
      name: 'Unknown',
      decimals: 18,
      priceUSD: 0,
    };
  }
}

function unpackSqrtPriceX96(slot0: Hex): bigint {
  return BigInt(slot0) & ((1n << 160n) - 1n);
}

export function useAdminPools() {
  const { chain } = useAccount();
  const publicClient = usePublicClient({ chainId: chain?.id });
  const addrs = getAddressesForChain(chain?.id ?? 31337);
  const [pools, setPools] = useState<AdminPool[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!publicClient || !addrs?.poolManager) {
      setPools([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const logs = await publicClient.getLogs({
        address: addrs.poolManager,
        event: initializeEvent,
        fromBlock: 0n,
        toBlock: 'latest',
      });

      const next: AdminPool[] = [];
      const seen = new Set<string>();

      for (const log of logs) {
        const id = log.args.id as Hex;
        if (!id || seen.has(id.toLowerCase())) continue;
        seen.add(id.toLowerCase());

        const currency0 = log.args.currency0 as Address;
        const currency1 = log.args.currency1 as Address;
        const fee = Number(log.args.fee);
        const tickSpacing = Number(log.args.tickSpacing);
        const plugin = (log.args.plugin as Address) || zeroAddress;
        const curveTypeId = resolveCurveType(id, currency0, currency1, fee, tickSpacing, plugin);

        let liquidity = 0n;
        let slot0: Hex = zeroHash;
        try {
          [slot0, liquidity] = await Promise.all([
            publicClient.readContract({
              address: addrs.poolManager,
              abi: SupaPoolManagerABI,
              functionName: 'getSlot0',
              args: [id],
            }) as Promise<Hex>,
            publicClient.readContract({
              address: addrs.poolManager,
              abi: SupaPoolManagerABI,
              functionName: 'getLiquidity',
              args: [id],
            }) as Promise<bigint>,
          ]);
        } catch {
          /* enrichment optional */
        }

        const [token0, token1] = await Promise.all([
          resolveToken(publicClient, currency0, chain?.id),
          resolveToken(publicClient, currency1, chain?.id),
        ]);

        let tvlUSD = 0;
        if (liquidity > 0n) {
          tvlUSD =
            Number(formatUnits(liquidity, token0.decimals)) * (token0.priceUSD || 0) * 2;
        }

        next.push({
          id,
          pair: `${token0.symbol} / ${token1.symbol}`,
          symbol0: token0.symbol,
          symbol1: token1.symbol,
          currency0,
          currency1,
          curveType: curveLabel(curveTypeId),
          curveTypeId,
          feeTier: `${(fee / 10000).toFixed(2)}%`,
          fee,
          tickSpacing,
          plugin,
          tvlUSD,
          volume24h: 0,
          hookAddress:
            plugin === zeroAddress
              ? 'None'
              : `${plugin.slice(0, 6)}...${plugin.slice(-4)}`,
          status: 'ACTIVE',
          liquidity,
          sqrtPriceX96: unpackSqrtPriceX96(slot0),
        });
      }

      setPools(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load pools');
      setPools([]);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, addrs?.poolManager, chain?.id]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { pools, isLoading, error, refetch, addresses: addrs };
}
