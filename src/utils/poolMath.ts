import {
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
  getAddress,
  isAddress,
  parseUnits,
  zeroAddress,
} from 'viem';

export const CurveType = {
  CLAMM: 0,
  BIN_AMM: 1,
  STABLE_AMM: 2,
} as const;

export type CurveType = (typeof CurveType)[keyof typeof CurveType];

export interface PoolKeyStruct {
  currency0: `0x${string}`;
  currency1: `0x${string}`;
  fee: number;
  tickSpacing: number;
  plugin: `0x${string}`;
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

const Q96 = 2n ** 96n;
const MIN_TICK = -887272;
const MAX_TICK = 887272;
export const FULL_RANGE_TICK_LOWER = -887220;
export const FULL_RANGE_TICK_UPPER = 887220;
/** BinAMM center bin id (BinMathLib.CENTER_BIN_ID = 2^23). */
export const CENTER_BIN_ID = 8388608;

export function isNativeAddress(addr: string): boolean {
  return addr.toLowerCase() === zeroAddress;
}

export function binIdToInt24(binId: number): number {
  const u = binId & 0xffffff;
  return u >= 0x800000 ? u - 0x1000000 : u;
}

export function snapTickToSpacing(tick: number, tickSpacing: number, roundUp = false): number {
  const spacing = Math.max(1, Math.abs(tickSpacing));
  const compressed = tick / spacing;
  const floored = Math.floor(compressed);
  let snapped = (roundUp && compressed !== floored ? floored + 1 : floored) * spacing;
  if (snapped < MIN_TICK) snapped = Math.ceil(MIN_TICK / spacing) * spacing;
  if (snapped > MAX_TICK) snapped = Math.floor(MAX_TICK / spacing) * spacing;
  return snapped;
}

function mulDiv(a: bigint, b: bigint, denominator: bigint): bigint {
  return (a * b) / denominator;
}

function tickToPrice(tick: number): number {
  return Math.pow(1.0001, tick);
}

function getSqrtRatioAtTickApprox(tick: number): bigint {
  const sqrtPrice = Math.sqrt(tickToPrice(tick));
  const scaled = BigInt(Math.floor(sqrtPrice * 1e12));
  return (scaled * Q96) / BigInt(1e12);
}

function getLiquidityForAmount0(sqrtA: bigint, sqrtB: bigint, amount0: bigint): bigint {
  let a = sqrtA;
  let b = sqrtB;
  if (a > b) [a, b] = [b, a];
  if (a === 0n) return 0n;
  const intermediate = mulDiv(a, b, Q96);
  return mulDiv(amount0, intermediate, b - a);
}

function getLiquidityForAmount1(sqrtA: bigint, sqrtB: bigint, amount1: bigint): bigint {
  let a = sqrtA;
  let b = sqrtB;
  if (a > b) [a, b] = [b, a];
  return mulDiv(amount1, Q96, b - a);
}

export function getLiquidityForAmounts(
  sqrtPriceX96: bigint,
  tickLower: number,
  tickUpper: number,
  amount0: bigint,
  amount1: bigint
): bigint {
  if (tickLower >= tickUpper || (amount0 === 0n && amount1 === 0n)) return 0n;
  const sqrtA = getSqrtRatioAtTickApprox(tickLower);
  const sqrtB = getSqrtRatioAtTickApprox(tickUpper);
  if (sqrtPriceX96 <= sqrtA) return getLiquidityForAmount0(sqrtA, sqrtB, amount0);
  if (sqrtPriceX96 >= sqrtB) return getLiquidityForAmount1(sqrtA, sqrtB, amount1);
  const liq0 = getLiquidityForAmount0(sqrtPriceX96, sqrtB, amount0);
  const liq1 = getLiquidityForAmount1(sqrtA, sqrtPriceX96, amount1);
  return liq0 < liq1 ? liq0 : liq1;
}

/**
 * Q128 price from Q64.96 sqrt — matches BinMathLib.getPriceX128FromSqrtPriceX96
 * and StableAMMEngine (amount1 = amount0 * sqrt² / 2^192).
 */
export function priceX128FromSqrtPriceX96(sqrtPriceX96: bigint): bigint {
  if (sqrtPriceX96 === 0n) return 0n;
  return (sqrtPriceX96 * sqrtPriceX96) >> 64n;
}

/** BinAMM / StableAMM: token1 owed for a token0 liquidityDelta at sqrtPrice. */
export function amount1ForToken0Liquidity(amount0: bigint, sqrtPriceX96: bigint): bigint {
  if (amount0 === 0n || sqrtPriceX96 === 0n) return 0n;
  const priceX128 = priceX128FromSqrtPriceX96(sqrtPriceX96);
  let amount1 = (amount0 * priceX128) >> 128n;
  if (amount0 > 0n && amount1 === 0n && priceX128 > 0n) amount1 = 1n;
  return amount1;
}

/** Inverse: max token0 liquidity that fits a token1 budget at sqrtPrice. */
export function amount0ForToken1Liquidity(amount1: bigint, sqrtPriceX96: bigint): bigint {
  if (amount1 === 0n || sqrtPriceX96 === 0n) return 0n;
  const priceX128 = priceX128FromSqrtPriceX96(sqrtPriceX96);
  if (priceX128 === 0n) return 0n;
  return (amount1 << 128n) / priceX128;
}

/**
 * Size BinAMM/Stable liquidityDelta + amounts so on-chain amount1 =
 * (amount0 * priceX128) >> 128 fits within the user's token budgets.
 */
export function sizeBinOrStableLiquidity(args: {
  amount0Wei: bigint;
  amount1Wei: bigint;
  sqrtPriceX96: bigint;
}): { liquidity: bigint; amount0Wei: bigint; amount1Wei: bigint } {
  const { amount0Wei, amount1Wei, sqrtPriceX96 } = args;
  if (amount0Wei === 0n && amount1Wei === 0n) {
    return { liquidity: 0n, amount0Wei: 0n, amount1Wei: 0n };
  }

  let liquidity = amount0Wei > 0n ? amount0Wei : amount0ForToken1Liquidity(amount1Wei, sqrtPriceX96);
  if (liquidity === 0n) liquidity = 1n;

  let need1 = amount1ForToken0Liquidity(liquidity, sqrtPriceX96);

  // User's amount1 is the hard cap — scale token0 liquidity down to match price ratio
  if (amount1Wei > 0n && need1 > amount1Wei) {
    liquidity = amount0ForToken1Liquidity(amount1Wei, sqrtPriceX96);
    if (amount0Wei > 0n && liquidity > amount0Wei) liquidity = amount0Wei;
    if (liquidity === 0n) liquidity = 1n;
    need1 = amount1ForToken0Liquidity(liquidity, sqrtPriceX96);
  }

  // Still can't fit amount1 budget (dust / extreme price) — fail soft with zero liq
  if (amount1Wei > 0n && need1 > amount1Wei) {
    return { liquidity: 0n, amount0Wei: 0n, amount1Wei: 0n };
  }

  return { liquidity, amount0Wei: liquidity, amount1Wei: need1 };
}

/** Full-range (or curve-native) seed mint params for admin pool bootstrap. */
export function buildSeedMintParams(args: {
  curveType: CurveType;
  tickSpacing: number;
  sqrtPriceX96: bigint;
  amount0: string;
  amount1: string;
  decimals0: number;
  decimals1: number;
}): {
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  amount0Wei: bigint;
  amount1Wei: bigint;
} {
  const amount0Wei = parseUnits(args.amount0 || '0', args.decimals0);
  const amount1Wei = parseUnits(args.amount1 || '0', args.decimals1);

  if (args.curveType === CurveType.BIN_AMM || args.curveType === CurveType.STABLE_AMM) {
    const sized = sizeBinOrStableLiquidity({
      amount0Wei,
      amount1Wei,
      sqrtPriceX96: args.sqrtPriceX96,
    });
    if (args.curveType === CurveType.BIN_AMM) {
      return {
        tickLower: binIdToInt24(CENTER_BIN_ID),
        tickUpper: binIdToInt24(CENTER_BIN_ID + 1),
        ...sized,
      };
    }
    return {
      tickLower: 0,
      tickUpper: Math.max(1, args.tickSpacing),
      ...sized,
    };
  }

  const tickLower = snapTickToSpacing(FULL_RANGE_TICK_LOWER, args.tickSpacing, false);
  const tickUpper = snapTickToSpacing(FULL_RANGE_TICK_UPPER, args.tickSpacing, true);
  let liquidity = getLiquidityForAmounts(
    args.sqrtPriceX96,
    tickLower,
    tickUpper,
    amount0Wei,
    amount1Wei
  );
  if (liquidity === 0n) {
    liquidity = amount0Wei > 0n ? amount0Wei : amount1Wei;
  }
  return { tickLower, tickUpper, liquidity, amount0Wei, amount1Wei };
}

/** Anvil DeployTestTokens catalog — matches frontend CHAIN_TOKENS[31337] */
export const KNOWN_TOKENS: KnownToken[] = [
  {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Anvil Ether',
    decimals: 18,
    priceUSD: 3120.5,
  },
  {
    address: '0xa82fF9aFd8f496c3d6ac40E2a0F282E47488CFc9',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    priceUSD: 1.0,
  },
  {
    address: '0x1613beB3B2C4f22Ee086B2b38C1476A3cE7f78E8',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    priceUSD: 1.0,
  },
  {
    address: '0x851356ae760d987E095750cCeb3bC6014560891C',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    priceUSD: 1.0,
  },
  {
    address: '0xf5059a5D33d5853360D16C683c16e67980206f36',
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 8,
    priceUSD: 64500,
  },
  {
    address: '0x95401dc811bb5740090279Ba06cfA8fcF6113778',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    priceUSD: 3120.5,
  },
  {
    address: '0x998abeb3E57409262aE5b751f60747921B33613E',
    symbol: 'SUPA',
    name: 'SupaDex Governance',
    decimals: 18,
    priceUSD: 2.45,
  },
  {
    address: '0x70e0bA845a1A0F2DA3359C97E0285013525FFC49',
    symbol: 'LINK',
    name: 'Chainlink Token',
    decimals: 18,
    priceUSD: 12.4,
  },
  {
    address: '0x4826533B4897376654Bb4d4AD88B7faFD0C98528',
    symbol: 'UNI',
    name: 'Uniswap',
    decimals: 18,
    priceUSD: 7.85,
  },
  {
    address: '0x99bbA657f2BbC93c02D617f8bA121cB8Fc104Acf',
    symbol: 'AAVE',
    name: 'Aave Token',
    decimals: 18,
    priceUSD: 155.0,
  },
  {
    address: '0x0E801D84Fa97b50751Dbf25036d067dCf18858bF',
    symbol: 'ARB',
    name: 'Arbitrum',
    decimals: 18,
    priceUSD: 0.58,
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
    address: '0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82' as `0x${string}`,
    name: 'Dynamic LVR & Volatility Oracle Hook',
    description: 'Dynamic spread decay protecting LPs from toxic arbitrage orderflow.',
    type: 'lvr',
  },
  {
    address: '0x0B306BF915C4d645ff596e518fAf3F9669b97016' as `0x${string}`,
    name: 'Anti-JIT Fee Lock & Vesting Hook',
    description: 'Imposes short-term fee penalty on just-in-time liquidity sandwiching.',
    type: 'anti-jit',
  },
];

export const FEE_TIERS = [
  {
    value: 100,
    label: '0.01% (1 bps)',
    description: 'Ultra-stable pairs (e.g. USDC/USDT, DAI/USDC)',
    tickSpacing: {
      [CurveType.CLAMM]: 1,
      [CurveType.BIN_AMM]: 1,
      [CurveType.STABLE_AMM]: 1,
    },
  },
  {
    value: 500,
    label: '0.05% (5 bps)',
    description: 'High-correlation pairs (e.g. stETH/ETH, L2 tokens)',
    tickSpacing: {
      [CurveType.CLAMM]: 10,
      [CurveType.BIN_AMM]: 10,
      [CurveType.STABLE_AMM]: 5,
    },
  },
  {
    value: 3000,
    label: '0.30% (30 bps)',
    description: 'Standard pairs (e.g. ETH/USDC, WBTC/USDC)',
    tickSpacing: {
      [CurveType.CLAMM]: 60,
      [CurveType.BIN_AMM]: 20,
      [CurveType.STABLE_AMM]: 10,
    },
  },
  {
    value: 10000,
    label: '1.00% (100 bps)',
    description: 'Exotic & high-volatility pairs',
    tickSpacing: {
      [CurveType.CLAMM]: 200,
      [CurveType.BIN_AMM]: 50,
      [CurveType.STABLE_AMM]: 25,
    },
  },
];

export function sortCurrencies(
  addrA: string,
  addrB: string
): {
  currency0: `0x${string}`;
  currency1: `0x${string}`;
  isReversed: boolean;
} {
  const a = getAddress(addrA);
  const b = getAddress(addrB);
  const isReversed = a.toLowerCase() > b.toLowerCase();
  return isReversed
    ? { currency0: b, currency1: a, isReversed }
    : { currency0: a, currency1: b, isReversed };
}

export function computePoolId(key: PoolKeyStruct): `0x${string}` | null {
  if (
    !isAddress(key.currency0) ||
    !isAddress(key.currency1) ||
    !isAddress(key.plugin)
  ) {
    return null;
  }
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters(
        'address currency0, address currency1, uint24 fee, int24 tickSpacing, address plugin, uint8 curveType'
      ),
      [key.currency0, key.currency1, key.fee, key.tickSpacing, key.plugin, key.curveType]
    )
  );
}

export function priceToSqrtPriceX96(price: number, decimals0: number, decimals1: number): bigint {
  const adjusted = price * Math.pow(10, decimals1 - decimals0);
  const sqrtPrice = Math.sqrt(adjusted);
  const Q96 = 2 ** 96;
  return BigInt(Math.floor(sqrtPrice * Q96));
}

export function sqrtPriceX96ToTick(sqrtPriceX96: bigint): number {
  const Q96 = 2n ** 96n;
  const price = Number(sqrtPriceX96) / Number(Q96);
  return Math.floor(Math.log(price ** 2) / Math.log(1.0001));
}
