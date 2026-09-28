import { keccak256, encodeAbiParameters, parseAbiParameters, getAddress } from 'viem';

export const CurveType = {
  CLAMM: 0, // Concentrated Liquidity AMM (Uniswap v3/v4 tick math)
  BIN_AMM: 1, // Discretized Bin AMM (Zero-slippage within active bin)
  STABLE_AMM: 2, // Stableswap Amplified Invariant
} as const;

export type CurveType = (typeof CurveType)[keyof typeof CurveType];


export interface PoolKeyStruct {
  currency0: `0x${string}`;
  currency1: `0x${string}`;
  fee: number; // In hundredths of a bip (1e-6, e.g. 500 = 0.05%, 3000 = 0.3%)
  tickSpacing: number; // int24
  plugin: `0x${string}`; // address(0) if none
  curveType: CurveType;
}

export interface KnownToken {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  priceUSD?: number;
  logoURI?: string;
}


export const KNOWN_TOKENS: KnownToken[] = [
  {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Native Ether',
    decimals: 18,
    priceUSD: 3500,
  },
  {
    address: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    priceUSD: 3500,
  },
  {
    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    priceUSD: 1.0,
  },
  {
    address: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    priceUSD: 1.0,
  },
  {
    address: '0x29f2D40B0605204364af54EC677bD022dA425d03',
    symbol: 'WBTC',
    name: 'Wrapped BTC',
    decimals: 8,
    priceUSD: 92000,
  },
  {
    address: '0xdA10009cBd5D07dd0CeCc66161566275171e3272',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    priceUSD: 1.0,
  },
];


export const KNOWN_HOOKS = [
  {
    address: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    name: 'No Plugin / Vanilla Pool',
    description: 'Standard multi-curve pool with static base swap fee and zero hook overhead.',
    type: 'vanilla',
  },
  {
    address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' as `0x${string}`,
    name: 'Dynamic LVR & Volatility Oracle Hook',
    description: 'Dynamic spread decay protecting LPs from toxic arbitrage orderflow.',
    type: 'lvr',
  },
  {
    address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906' as `0x${string}`,
    name: 'Anti-JIT Fee Lock & Vesting Hook',
    description: 'Imposes short-term fee penalty on just-in-time liquidity sandwiching.',
    type: 'anti-jit',
  },
];

export const FEE_TIERS = [
  {
    value: 100, // 0.01%
    label: '0.01% (1 bps)',
    description: 'Ultra-stable pairs (e.g. USDC/USDT, DAI/USDC)',
    tickSpacing: {
      [CurveType.CLAMM]: 1,
      [CurveType.BIN_AMM]: 1,
      [CurveType.STABLE_AMM]: 1,
    },
  },
  {
    value: 500, // 0.05%
    label: '0.05% (5 bps)',
    description: 'High-correlation pairs (e.g. stETH/ETH, L2 tokens)',
    tickSpacing: {
      [CurveType.CLAMM]: 10,
      [CurveType.BIN_AMM]: 10,
      [CurveType.STABLE_AMM]: 5,
    },
  },
  {
    value: 3000, // 0.30%
    label: '0.30% (30 bps)',
    description: 'Standard pairs (e.g. ETH/USDC, WBTC/USDC)',
    tickSpacing: {
      [CurveType.CLAMM]: 60,
      [CurveType.BIN_AMM]: 20,
      [CurveType.STABLE_AMM]: 10,
    },
  },
  {
    value: 10000, // 1.00%
    label: '1.00% (100 bps)',
    description: 'Exotic & high-volatility pairs',
    tickSpacing: {
      [CurveType.CLAMM]: 200,
      [CurveType.BIN_AMM]: 50,
      [CurveType.STABLE_AMM]: 25,
    },
  },
];

/**
 * Sorts two token addresses canonically (currency0 < currency1)
 */
export function sortCurrencies(
  addrA: string,
  addrB: string
): { currency0: `0x${string}`; currency1: `0x${string}`; isReversed: boolean } {
  try {
    const formattedA = getAddress(addrA);
    const formattedB = getAddress(addrB);

    if (formattedA.toLowerCase() < formattedB.toLowerCase()) {
      return { currency0: formattedA, currency1: formattedB, isReversed: false };
    } else {
      return { currency0: formattedB, currency1: formattedA, isReversed: true };
    }
  } catch {
    return {
      currency0: addrA as `0x${string}`,
      currency1: addrB as `0x${string}`,
      isReversed: false,
    };
  }
}

/**
 * Computes PoolId = keccak256(abi.encode(PoolKey))
 */
export function computePoolId(poolKey: PoolKeyStruct): `0x${string}` {
  try {
    const encoded = encodeAbiParameters(
      parseAbiParameters('(address,address,uint24,int24,address,uint8)'),
      [
        [
          poolKey.currency0,
          poolKey.currency1,
          poolKey.fee,
          poolKey.tickSpacing,
          poolKey.plugin,
          poolKey.curveType,
        ],
      ]
    );
    return keccak256(encoded);
  } catch (err) {
    console.error('Error computing poolId:', err);
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }
}

/**
 * Converts human price (Token1 per Token0) into Q64.96 sqrtPriceX96
 * price = (amountToken1 / 10^decimals1) / (amountToken0 / 10^decimals0)
 * sqrtPriceX96 = sqrt(price * 10^(decimals1 - decimals0)) * 2^96
 */
export function priceToSqrtPriceX96(
  price: number,
  decimals0: number = 18,
  decimals1: number = 6
): bigint {
  if (price <= 0 || isNaN(price)) return BigInt(0);

  const Q96 = BigInt(2) ** BigInt(96);
  // Adjusted price for decimals
  const decimalAdjustment = 10 ** (decimals1 - decimals0);
  const adjustedPrice = price * decimalAdjustment;
  const sqrtPrice = Math.sqrt(adjustedPrice);

  // sqrtPrice * 2^96 with big integer precision
  const sqrtPriceScaled = BigInt(Math.floor(sqrtPrice * 1e12));
  return (sqrtPriceScaled * Q96) / BigInt(1e12);
}

/**
 * Converts Q64.96 sqrtPriceX96 back into human price
 */
export function sqrtPriceX96ToPrice(
  sqrtPriceX96: bigint,
  decimals0: number = 18,
  decimals1: number = 6
): number {
  if (!sqrtPriceX96 || sqrtPriceX96 === BigInt(0)) return 0;
  const Q96 = BigInt(2) ** BigInt(96);

  const numerator = (sqrtPriceX96 * BigInt(1e12)) / Q96;
  const sqrtPrice = Number(numerator) / 1e12;
  const rawPrice = sqrtPrice * sqrtPrice;

  const decimalAdjustment = 10 ** (decimals1 - decimals0);
  return rawPrice / decimalAdjustment;
}

/**
 * Computes the Uniswap V3/V4 tick from sqrtPriceX96
 * tick = floor(log_1.0001(price))
 */
export function sqrtPriceX96ToTick(sqrtPriceX96: bigint): number {
  if (!sqrtPriceX96 || sqrtPriceX96 === BigInt(0)) return 0;
  const Q96 = BigInt(2) ** BigInt(96);
  const ratio = Number(sqrtPriceX96) / Number(Q96);
  const price = ratio * ratio;
  return Math.floor(Math.log(price) / Math.log(1.0001));
}
