import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Button,
  Input,
  Badge,
  TokenLogo,
  TokenAmountInput,
  Toggle,
  Modal,
} from '../components/ui';
import { DiffViewer, JSONInspector } from '../components/data';
import {
  CurveType,
  KNOWN_TOKENS,
  KNOWN_HOOKS,
  FEE_TIERS,
  sortCurrencies,
  computePoolId,
  priceToSqrtPriceX96,
  sqrtPriceX96ToTick,
  buildSeedMintParams,
  isNativeAddress,
  type KnownToken,
  type PoolKeyStruct,
} from '../utils/poolMath';
import { shortenAddress, formatUSD } from '../utils/formatters';
import { useAdminAuth } from '../hooks/useAdminAuth';
import {
  ArrowLeft,
  ArrowDownUp,
  Layers,
  CheckCircle2,
  Code2,
  Hash,
  PlayCircle,
  Loader2,
  Info,
  ChevronDown,
  Search,
  Activity,
  Percent,
  AlertTriangle,
} from 'lucide-react';
import { formatUnits, isAddress, maxUint256, type Hex } from 'viem';
import { useAccount, useWriteContract, usePublicClient, useBalance } from 'wagmi';
import { getAddressesForChain } from '../contracts/addresses';
import {
  SupaPoolManagerABI,
  SupaPositionManagerABI,
  SupaVaultABI,
  ERC20ABI,
} from '../contracts/abis';

export interface CreatePoolPageProps {
  onBack: () => void;
  onPoolCreated?: (poolKey: PoolKeyStruct) => void;
}

type DeployPhase =
  | 'idle'
  | 'initializing'
  | 'approving'
  | 'seeding'
  | 'done'
  | 'error';

export const CreatePoolPage: React.FC<CreatePoolPageProps> = ({
  onBack,
  onPoolCreated,
}) => {
  const { hasPermission } = useAdminAuth();
  const { address: userAddress, chain } = useAccount();
  const publicClient = usePublicClient();
  const addrs = getAddressesForChain(chain?.id ?? 31337);
  const { writeContractAsync } = useWriteContract();

  // State: Pair Tokens — default ETH / USDC (matches common bootstrap pair)
  const [token0, setToken0] = useState<KnownToken>(KNOWN_TOKENS[0]); // ETH
  const [token1, setToken1] = useState<KnownToken>(KNOWN_TOKENS[1]); // USDC
  const [customToken0Address, setCustomToken0Address] = useState<string>(KNOWN_TOKENS[0].address);
  const [customToken1Address, setCustomToken1Address] = useState<string>(KNOWN_TOKENS[1].address);

  // Token Selector Modal State
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [tokenSelectingTarget, setTokenSelectingTarget] = useState<'token0' | 'token1'>('token0');
  const [tokenSearch, setTokenSearch] = useState('');

  // State: AMM Curve Engine
  const [selectedCurve, setSelectedCurve] = useState<CurveType>(CurveType.CLAMM);
  const [tickSpacing, setTickSpacing] = useState(60);
  const [ampFactor, setAmpFactor] = useState(100);

  // State: Fee & Hook
  const [selectedFee, setSelectedFee] = useState<number>(3000); // 0.30%
  const [pluginAddress, setPluginAddress] = useState<string>(
    KNOWN_HOOKS.find((h) => h.type === 'lvr')?.address ??
      '0x0000000000000000000000000000000000000000'
  );
  const [customPluginAddress, setCustomPluginAddress] = useState('');
  const [isCustomPlugin, setIsCustomPlugin] = useState(false);

  // State: Price & Seed Liquidity
  const [priceInput, setPriceInput] = useState('3500.00');
  const [amount0, setAmount0] = useState('10.0');
  const [amount1, setAmount1] = useState('35000.0');
  const [useVaultClaims, setUseVaultClaims] = useState(false);

  // State: Execution / Deployment
  const [showJSON, setShowJSON] = useState(false);
  const [deployPhase, setDeployPhase] = useState<DeployPhase>('idle');
  const [deployError, setDeployError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [seedTxHash, setSeedTxHash] = useState<string | null>(null);
  const [poolExists, setPoolExists] = useState(false);
  const [poolLiquidity, setPoolLiquidity] = useState(0n);
  const [poolCheckLoading, setPoolCheckLoading] = useState(false);

  const isDeploying =
    deployPhase === 'initializing' ||
    deployPhase === 'approving' ||
    deployPhase === 'seeding';
  const deploySuccess = deployPhase === 'done';

  const { data: nativeBal } = useBalance({
    address: userAddress,
    query: { enabled: !!userAddress },
  });
  const { data: erc20Bal0 } = useBalance({
    address: userAddress,
    token: isNativeAddress(token0.address) ? undefined : token0.address,
    query: { enabled: !!userAddress && !isNativeAddress(token0.address) },
  });
  const { data: erc20Bal1 } = useBalance({
    address: userAddress,
    token: isNativeAddress(token1.address) ? undefined : token1.address,
    query: { enabled: !!userAddress && !isNativeAddress(token1.address) },
  });

  const balance0Label = useMemo(() => {
    if (isNativeAddress(token0.address)) {
      return nativeBal ? formatUnits(nativeBal.value, nativeBal.decimals) : '—';
    }
    return erc20Bal0 ? formatUnits(erc20Bal0.value, erc20Bal0.decimals) : '—';
  }, [token0.address, nativeBal, erc20Bal0]);

  const balance1Label = useMemo(() => {
    if (isNativeAddress(token1.address)) {
      return nativeBal ? formatUnits(nativeBal.value, nativeBal.decimals) : '—';
    }
    return erc20Bal1 ? formatUnits(erc20Bal1.value, erc20Bal1.decimals) : '—';
  }, [token1.address, nativeBal, erc20Bal1]);

  // Handle Token Swap
  const handleSwapTokens = () => {
    const prev0 = token0;
    const prev1 = token1;
    const prevAddr0 = customToken0Address;
    const prevAddr1 = customToken1Address;
    setToken0(prev1);
    setToken1(prev0);
    setCustomToken0Address(prevAddr1);
    setCustomToken1Address(prevAddr0);

    const prevAmt0 = amount0;
    setAmount0(amount1);
    setAmount1(prevAmt0);
  };

  // Canonical ordering verification
  const sortingCheck = useMemo(() => {
    const addr0 = token0.address || customToken0Address;
    const addr1 = token1.address || customToken1Address;
    if (isAddress(addr0) && isAddress(addr1) && addr0.toLowerCase() !== addr1.toLowerCase()) {
      return sortCurrencies(addr0, addr1);
    }
    return null;
  }, [token0, token1, customToken0Address, customToken1Address]);

  const isCanonical = sortingCheck ? !sortingCheck.isReversed : true;

  // Active Immutable PoolKey
  const activePoolKey: PoolKeyStruct = useMemo(() => {
    const cur0 = sortingCheck ? sortingCheck.currency0 : (token0.address as `0x${string}`);
    const cur1 = sortingCheck ? sortingCheck.currency1 : (token1.address as `0x${string}`);
    const hook = isCustomPlugin
      ? (isAddress(customPluginAddress) ? customPluginAddress : '0x0000000000000000000000000000000000000000')
      : pluginAddress;

    return {
      currency0: cur0,
      currency1: cur1,
      fee: selectedFee,
      tickSpacing,
      plugin: hook as `0x${string}`,
      curveType: selectedCurve,
    };
  }, [
    sortingCheck,
    token0,
    token1,
    isCustomPlugin,
    customPluginAddress,
    pluginAddress,
    selectedFee,
    tickSpacing,
    selectedCurve,
  ]);

  // PoolId computation
  const poolId = useMemo(() => computePoolId(activePoolKey), [activePoolKey]);

  const refreshPoolState = useCallback(async () => {
    if (!publicClient || !addrs?.poolManager || !poolId) {
      setPoolExists(false);
      setPoolLiquidity(0n);
      return;
    }
    setPoolCheckLoading(true);
    try {
      const [slot0, liquidity] = await Promise.all([
        publicClient.readContract({
          address: addrs.poolManager,
          abi: SupaPoolManagerABI,
          functionName: 'getSlot0',
          args: [poolId],
        }) as Promise<Hex>,
        publicClient.readContract({
          address: addrs.poolManager,
          abi: SupaPoolManagerABI,
          functionName: 'getLiquidity',
          args: [poolId],
        }) as Promise<bigint>,
      ]);
      const sqrt = BigInt(slot0) & ((1n << 160n) - 1n);
      setPoolExists(sqrt > 0n);
      setPoolLiquidity(liquidity);
      if (sqrt > 0n && deployPhase === 'idle') {
        setDeployPhase('idle');
      }
    } catch {
      setPoolExists(false);
      setPoolLiquidity(0n);
    } finally {
      setPoolCheckLoading(false);
    }
  }, [publicClient, addrs?.poolManager, poolId, deployPhase]);

  useEffect(() => {
    void refreshPoolState();
    setDeployPhase('idle');
    setDeployError(null);
    setTxHash(null);
    setSeedTxHash(null);
  }, [poolId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Price in pool currency order (token1/token0 raw geometric)
  const numPrice = parseFloat(priceInput) || 0;
  const poolOrderedPrice = useMemo(() => {
    if (!sortingCheck?.isReversed) {
      return {
        price: numPrice,
        decimals0: token0.decimals,
        decimals1: token1.decimals,
        amount0,
        amount1,
      };
    }
    return {
      price: numPrice > 0 ? 1 / numPrice : 0,
      decimals0: token1.decimals,
      decimals1: token0.decimals,
      amount0: amount1,
      amount1: amount0,
    };
  }, [sortingCheck, numPrice, token0.decimals, token1.decimals, amount0, amount1]);

  const sqrtPriceX96 = useMemo(() => {
    return priceToSqrtPriceX96(
      poolOrderedPrice.price,
      poolOrderedPrice.decimals0,
      poolOrderedPrice.decimals1
    );
  }, [poolOrderedPrice]);

  const tick = useMemo(() => sqrtPriceX96ToTick(sqrtPriceX96), [sqrtPriceX96]);

  // Total USD value
  const totalValueUSD = useMemo(() => {
    const num0 = parseFloat(amount0) || 0;
    const num1 = parseFloat(amount1) || 0;
    const p0 = token0.priceUSD ?? 0;
    const p1 = token1.priceUSD ?? 0;
    return num0 * p0 + num1 * p1;
  }, [amount0, amount1, token0, token1]);

  // Filter token list for modal
  const filteredTokens = useMemo(() => {
    return KNOWN_TOKENS.filter(
      (t: KnownToken) =>
        t.symbol.toLowerCase().includes(tokenSearch.toLowerCase()) ||
        t.name.toLowerCase().includes(tokenSearch.toLowerCase()) ||
        t.address.toLowerCase().includes(tokenSearch.toLowerCase())
    );
  }, [tokenSearch]);

  const waitForSuccess = async (hash: Hex) => {
    if (!publicClient) throw new Error('RPC client unavailable');
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') throw new Error('Transaction reverted on-chain');
    return hash;
  };

  const approveIfNeeded = async (token: `0x${string}`, needed: bigint) => {
    if (!userAddress || !addrs?.positionManager || !publicClient) return;
    if (isNativeAddress(token) || needed === 0n) return;
    const allowance = (await publicClient.readContract({
      address: token,
      abi: ERC20ABI,
      functionName: 'allowance',
      args: [userAddress, addrs.positionManager],
    })) as bigint;
    if (allowance >= needed) return;
    const hash = (await writeContractAsync({
      address: token,
      abi: ERC20ABI,
      functionName: 'approve',
      args: [addrs.positionManager, maxUint256],
    })) as Hex;
    await waitForSuccess(hash);
  };

  // Execute initialize (if needed) + seed mint
  const handleDeploy = async () => {
    if (!addrs?.poolManager || !addrs.positionManager) {
      setDeployError('PoolManager / PositionManager not deployed on this chain');
      setDeployPhase('error');
      return;
    }
    if (!userAddress || !publicClient) {
      setDeployError('Connect a wallet on Anvil to deploy');
      setDeployPhase('error');
      return;
    }

    setDeployError(null);
    setTxHash(null);
    setSeedTxHash(null);

    try {
      // Re-check on-chain before writing
      let alreadyInitialized = poolExists;
      if (poolId) {
        try {
          const slot0 = (await publicClient.readContract({
            address: addrs.poolManager,
            abi: SupaPoolManagerABI,
            functionName: 'getSlot0',
            args: [poolId],
          })) as Hex;
          alreadyInitialized = (BigInt(slot0) & ((1n << 160n) - 1n)) > 0n;
          setPoolExists(alreadyInitialized);
        } catch {
          /* ignore */
        }
      }

      if (!alreadyInitialized) {
        setDeployPhase('initializing');
        const initHash = (await writeContractAsync({
          address: addrs.poolManager,
          abi: SupaPoolManagerABI,
          functionName: 'initialize',
          args: [activePoolKey, sqrtPriceX96, '0x'],
        })) as Hex;
        setTxHash(initHash);
        await waitForSuccess(initHash);
        setPoolExists(true);
      }

      const seed = buildSeedMintParams({
        curveType: selectedCurve,
        tickSpacing,
        sqrtPriceX96,
        amount0: poolOrderedPrice.amount0,
        amount1: poolOrderedPrice.amount1,
        decimals0: poolOrderedPrice.decimals0,
        decimals1: poolOrderedPrice.decimals1,
      });

      const shouldSeed = seed.amount0Wei > 0n || seed.amount1Wei > 0n;
      if (!shouldSeed) {
        if (alreadyInitialized) {
          throw new Error('Pool already initialized. Enter seed amounts to mint liquidity.');
        }
        setDeployPhase('done');
        onPoolCreated?.(activePoolKey);
        return;
      }

      if (seed.liquidity === 0n) {
        throw new Error(
          selectedCurve === CurveType.BIN_AMM || selectedCurve === CurveType.STABLE_AMM
            ? 'Seed amounts cannot satisfy the on-chain price ratio (token1 = token0 × price). Increase token1 or reduce token0.'
            : 'Computed seed liquidity is zero — adjust amounts or price'
        );
      }

      setDeployPhase('seeding');
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60);
      const liquidity = seed.liquidity;
      // Bin/Stable engines derive amount1 from price; seed amounts are already ratio-sized.
      // Small buffer absorbs wei rounding so mint cannot SlippageExceeded.
      const amount0Max = seed.amount0Wei + (seed.amount0Wei * 5n) / 1000n + 1n;
      const amount1Max = seed.amount1Wei + (seed.amount1Wei * 5n) / 1000n + 1n;

      if (useVaultClaims) {
        setDeployPhase('approving');
        const approved = (await publicClient.readContract({
          address: addrs.vault,
          abi: SupaVaultABI,
          functionName: 'isOperator',
          args: [userAddress, addrs.positionManager],
        })) as boolean;
        if (!approved) {
          const opHash = (await writeContractAsync({
            address: addrs.vault,
            abi: SupaVaultABI,
            functionName: 'setOperator',
            args: [addrs.positionManager, true],
          })) as Hex;
          await waitForSuccess(opHash);
        }
      } else {
        setDeployPhase('approving');
        await approveIfNeeded(activePoolKey.currency0, amount0Max);
        await approveIfNeeded(activePoolKey.currency1, amount1Max);
      }

      setDeployPhase('seeding');

      const value =
        !useVaultClaims && isNativeAddress(activePoolKey.currency0) ? amount0Max : 0n;

      const mintHash = (await writeContractAsync({
        address: addrs.positionManager,
        abi: SupaPositionManagerABI,
        functionName: 'mint',
        args: [
          {
            poolKey: activePoolKey,
            tickLower: seed.tickLower,
            tickUpper: seed.tickUpper,
            liquidity,
            amount0Max,
            amount1Max,
            recipient: userAddress,
            deadline,
            hookData: '0x',
            payWithClaims: useVaultClaims,
          },
        ],
        value,
      })) as Hex;
      setSeedTxHash(mintHash);
      await waitForSuccess(mintHash);
      await refreshPoolState();

      setDeployPhase('done');
      onPoolCreated?.(activePoolKey);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      setDeployError(msg);
      setDeployPhase('error');
      void refreshPoolState();
    }
  };
  return (
    <div className="relative z-0 w-full max-w-7xl mx-auto py-2 px-1 sm:px-2 space-y-8 animate-fade-in isolate">
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer group"
        >
          <div className="w-7 h-7 rounded-xl bg-neutral-100 dark:bg-white/[0.06] flex items-center justify-center group-hover:bg-neutral-200 dark:group-hover:bg-white/[0.12] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span>Back to Pool Registry</span>
        </button>

        <div className="flex items-center gap-2">
          <Badge variant="brand" size="sm" className="font-mono">
            SupaPoolManager v1
          </Badge>
          {poolExists ? (
            <Badge variant="success" size="sm" className="font-mono">
              {poolLiquidity > 0n ? 'Live + Liquidity' : 'Initialized · Needs Seed'}
            </Badge>
          ) : (
            <Badge variant="outline" size="sm" className="font-mono">
              Not Initialized
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Multi-Curve Pool Initializer
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Deploy and calibrate singleton AMM pool instances with custom math curves and dynamic volatility plugins.
        </p>
      </div>

      {/* Two-Column Institutional Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-0">
        {/* LEFT COLUMN: 4 Step Deployment Configuration Form */}
        <div className="lg:col-span-7 space-y-6 relative z-0">
          {/* STEP 1: Select Token Pair */}
          <div className="bg-white dark:bg-[#111317] border border-neutral-200/80 dark:border-white/[0.08] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-black text-[11px] font-bold flex items-center justify-center font-mono">
                  1
                </span>
                <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Select Token Pair
                </h2>
              </div>
              <button
                type="button"
                onClick={handleSwapTokens}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono text-neutral-500 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-white/[0.04] transition-colors cursor-pointer"
              >
                <ArrowDownUp className="w-3.5 h-3.5" />
                <span>Switch Pair</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
              {/* Token 0 Button Picker */}
              <button
                type="button"
                onClick={() => {
                  setTokenSelectingTarget('token0');
                  setIsTokenModalOpen(true);
                }}
                className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.06] hover:border-neutral-300 dark:hover:border-white/[0.15] transition-all cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <TokenLogo symbol={token0.symbol} address={token0.address} size="md" />
                  <div>
                    <div className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                      {token0.symbol}
                      <span className="text-[10px] font-mono font-normal text-neutral-400">
                        ({token0.decimals}d)
                      </span>
                    </div>
                    <div className="text-xs text-neutral-500 truncate max-w-[140px]">
                      {token0.name}
                    </div>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
              </button>

              {/* Token 1 Button Picker */}
              <button
                type="button"
                onClick={() => {
                  setTokenSelectingTarget('token1');
                  setIsTokenModalOpen(true);
                }}
                className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.06] hover:border-neutral-300 dark:hover:border-white/[0.15] transition-all cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <TokenLogo symbol={token1.symbol} address={token1.address} size="md" />
                  <div>
                    <div className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                      {token1.symbol}
                      <span className="text-[10px] font-mono font-normal text-neutral-400">
                        ({token1.decimals}d)
                      </span>
                    </div>
                    <div className="text-xs text-neutral-500 truncate max-w-[140px]">
                      {token1.name}
                    </div>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
              </button>
            </div>

            {/* Canonical Ordering Auto-sort Notification */}
            {sortingCheck && !isCanonical && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>
                    Canonical address ordering rule (<code className="font-mono text-[10px]">C0 &lt; C1</code>) requires ordering reversal.
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={handleSwapTokens}
                  className="bg-amber-500/15 border-amber-500/30 text-amber-500 hover:bg-amber-500/25"
                >
                  Auto-Order
                </Button>
              </div>
            )}
          </div>

          {/* STEP 2: AMM Curve Engine Architecture */}
          <div className="bg-white dark:bg-[#111317] border border-neutral-200/80 dark:border-white/[0.08] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-black text-[11px] font-bold flex items-center justify-center font-mono">
                  2
                </span>
                <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Curve Architecture Engine
                </h2>
              </div>
              <span className="text-xs text-neutral-400">Multi-Curve Core</span>
            </div>

            {/* Segmented Curve Buttons matching frontend design */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  type: CurveType.CLAMM,
                  label: 'CLAMM',
                  badge: 'Concentrated',
                  icon: Activity,
                  sub: 'Tick-indexed range orders',
                  defaultSpacing: 60,
                },
                {
                  type: CurveType.BIN_AMM,
                  label: 'BinAMM',
                  badge: '0-Slippage',
                  icon: Layers,
                  sub: 'Discretized bin steps',
                  defaultSpacing: 20,
                },
                {
                  type: CurveType.STABLE_AMM,
                  label: 'StableAMM',
                  badge: 'Pegged 1:1',
                  icon: Percent,
                  sub: 'Amplified Stableswap',
                  defaultSpacing: 1,
                },
              ].map((c) => {
                const Icon = c.icon;
                const isSelected = selectedCurve === c.type;

                return (
                  <button
                    key={c.type}
                    type="button"
                    onClick={() => {
                      setSelectedCurve(c.type);
                      setTickSpacing(c.defaultSpacing);
                    }}
                    className={`flex flex-col items-start p-3.5 rounded-2xl transition-all cursor-pointer border text-left ${
                      isSelected
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-black border-neutral-900 dark:border-white shadow-md'
                        : 'bg-neutral-50 dark:bg-white/[0.03] text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-white/[0.06] hover:border-neutral-300 dark:hover:border-white/[0.12]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <Icon className="w-4 h-4" />
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md font-mono ${
                          isSelected
                            ? 'bg-white/20 dark:bg-black/20 text-white dark:text-black'
                            : 'bg-neutral-200 dark:bg-white/[0.08] text-neutral-600 dark:text-neutral-400'
                        }`}
                      >
                        {c.badge}
                      </span>
                    </div>
                    <div className="text-sm font-bold">{c.label}</div>
                    <div
                      className={`text-[11px] mt-0.5 ${
                        isSelected
                          ? 'text-neutral-300 dark:text-neutral-600'
                          : 'text-neutral-400 dark:text-neutral-500'
                      }`}
                    >
                      {c.sub}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Curve Parameters Configuration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
                  <span>
                    {selectedCurve === CurveType.BIN_AMM
                      ? 'Bin Step (bps)'
                      : 'Tick Spacing (int24)'}
                  </span>
                  <span className="text-[11px] font-mono text-neutral-400">{tickSpacing}</span>
                </label>
                <Input
                  type="number"
                  value={tickSpacing}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTickSpacing(parseInt(e.target.value) || 1)}
                  min={1}
                  max={1000}
                  className="font-mono text-xs"
                />
              </div>

              {selectedCurve === CurveType.STABLE_AMM && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
                    <span>Amplification Coeff (A)</span>
                    <span className="text-[11px] font-mono text-neutral-400">{ampFactor}</span>
                  </label>
                  <Input
                    type="number"
                    value={ampFactor}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmpFactor(parseInt(e.target.value) || 100)}
                    min={10}
                    max={5000}
                    className="font-mono text-xs"
                  />
                </div>
              )}
            </div>
          </div>

          {/* STEP 3: Base Fee & Hook Attachment */}
          <div className="bg-white dark:bg-[#111317] border border-neutral-200/80 dark:border-white/[0.08] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-black text-[11px] font-bold flex items-center justify-center font-mono">
                  3
                </span>
                <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Base Fee & Hook Plugins
                </h2>
              </div>
              <span className="text-xs text-neutral-400">Singleton Plugins</span>
            </div>

            {/* Fee Tiers Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {FEE_TIERS.map((tier) => {
                const isSelected = selectedFee === tier.value;

                return (
                  <button
                    key={tier.value}
                    type="button"
                    onClick={() => setSelectedFee(tier.value)}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-black border-neutral-900 dark:border-white shadow-xs'
                        : 'bg-neutral-50 dark:bg-white/[0.03] text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-white/[0.06] hover:border-neutral-300 dark:hover:border-white/[0.12]'
                    }`}
                  >
                    <div className="text-sm font-bold font-mono">{tier.label}</div>
                    <div className="text-[10px] opacity-75 mt-0.5 truncate">{tier.description}</div>
                  </button>
                );
              })}
            </div>

            {/* Hook Architecture Selector */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 font-mono">
                  Hook / Plugin Contract
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400">Custom Address</span>
                  <Toggle checked={isCustomPlugin} onChange={setIsCustomPlugin} />
                </div>
              </div>

              {!isCustomPlugin ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {KNOWN_HOOKS.map((h) => {
                    const isSelected = pluginAddress.toLowerCase() === h.address.toLowerCase();

                    return (
                      <button
                        key={h.address}
                        type="button"
                        onClick={() => setPluginAddress(h.address)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                          isSelected
                            ? 'bg-neutral-900 text-white dark:bg-white dark:text-black border-neutral-900 dark:border-white shadow-xs'
                            : 'bg-neutral-50 dark:bg-white/[0.03] text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-white/[0.06] hover:border-neutral-300 dark:hover:border-white/[0.12]'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="text-xs font-bold leading-tight truncate">{h.name}</div>
                          <p className="text-[10px] opacity-75 line-clamp-2 leading-tight">
                            {h.description}
                          </p>
                        </div>
                        <div className="text-[9px] font-mono opacity-60">
                          {h.address === '0x0000000000000000000000000000000000000000'
                            ? '0x0000...0000'
                            : shortenAddress(h.address, 4)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Input
                    value={customPluginAddress}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomPluginAddress(e.target.value.trim())}
                    placeholder="0x... (must implement IHooks / IPoolPlugin)"
                    className="font-mono text-xs"
                  />
                  <p className="text-[10px] text-neutral-400">
                    Hook contract address must contain authorized permission bitmask flags.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* STEP 4: Initial Exchange Rate & Seed Inventory */}
          <div className="bg-white dark:bg-[#111317] border border-neutral-200/80 dark:border-white/[0.08] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-black text-[11px] font-bold flex items-center justify-center font-mono">
                  4
                </span>
                <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Opening Price & Seed Inventory
                </h2>
              </div>
              <span className="text-xs font-mono font-semibold text-neutral-900 dark:text-white">
                Total Seed: {formatUSD(totalValueUSD)}
              </span>
            </div>

            {/* Price Input Row */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Initial Exchange Rate ({token1.symbol} per 1 {token0.symbol})
                </span>
                <Badge variant="brand" size="sm" className="font-mono text-[10px]">
                  1 {token0.symbol} = {priceInput} {token1.symbol}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  type="number"
                  value={priceInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPriceInput(e.target.value)}
                  placeholder="3500.00"
                  className="font-mono text-sm font-semibold"
                />

                <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/[0.06] flex flex-col justify-center text-xs space-y-1">
                  <div className="flex justify-between font-mono text-[10px] text-neutral-400">
                    <span>Computed Tick</span>
                    <strong className="text-neutral-900 dark:text-white">{tick.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between font-mono text-[10px] text-neutral-400">
                    <span>Q64.96 Int</span>
                    <strong className="text-neutral-900 dark:text-white truncate max-w-[120px]">
                      {sqrtPriceX96.toString()}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Seed Amounts with TokenAmountInput */}
            <div className="space-y-3">
              <TokenAmountInput
                label={`Initial ${token0.symbol} Seed`}
                value={amount0}
                onChange={setAmount0}
                tokenSymbol={token0.symbol}
                tokenAddress={token0.address}
                usdValue={amount0 ? (parseFloat(amount0) * (token0.priceUSD || 0)).toFixed(2) : undefined}
                balance={balance0Label}
                isVaultClaim={useVaultClaims}
              />

              <TokenAmountInput
                label={`Initial ${token1.symbol} Seed`}
                value={amount1}
                onChange={setAmount1}
                tokenSymbol={token1.symbol}
                tokenAddress={token1.address}
                usdValue={amount1 ? (parseFloat(amount1) * (token1.priceUSD || 0)).toFixed(2) : undefined}
                balance={balance1Label}
                isVaultClaim={useVaultClaims}
              />
            </div>

            {/* Vault Claims Toggle */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.06]">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                  Settle with ERC-6909 Vault Claims
                </span>
                <p className="text-[11px] text-neutral-500">
                  Leave off to pull ERC-20 / native balances. Claims require prior vault deposits.
                </p>
              </div>
              <Toggle checked={useVaultClaims} onChange={setUseVaultClaims} />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Deterministic PoolId, Diff Audit & Execution */}
        <div className="lg:col-span-5 sticky top-20 z-10 self-start space-y-6 min-w-0 overflow-hidden">
          {poolExists && (
            <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/[0.07] flex gap-3 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs min-w-0">
                <p className="font-semibold text-amber-600 dark:text-amber-400">
                  Pool already initialized on-chain
                </p>
                <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Re-initialize is impossible. {poolLiquidity > 0n
                    ? 'Active liquidity exists — minting adds another full-range position.'
                    : 'No in-range liquidity yet — mint a seed position so swaps can route.'}
                </p>
                {poolId && (
                  <p className="font-mono text-[10px] text-neutral-500 pt-1 break-all">
                    {shortenAddress(poolId, 8)}
                    {poolCheckLoading ? ' · checking…' : ''}
                  </p>
                )}
              </div>
            </div>
          )}
          {/* Deterministic PoolId & Summary Card */}
          <div className="bg-white dark:bg-[#111317] border border-neutral-200/80 dark:border-white/[0.08] rounded-3xl p-6 shadow-xs space-y-4 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-neutral-900 dark:text-white" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 font-mono">
                  Deterministic Pool Identifier
                </h3>
              </div>
              <Badge variant="brand" size="sm" className="font-mono text-[10px]">
                {shortenAddress(poolId, 6)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.06] space-y-1">
                <span className="text-[10px] font-mono uppercase text-neutral-400">Pair</span>
                <div className="text-xs font-bold text-neutral-900 dark:text-white">
                  {token0.symbol} / {token1.symbol}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.06] space-y-1">
                <span className="text-[10px] font-mono uppercase text-neutral-400">Curve Engine</span>
                <div className="text-xs font-bold text-neutral-900 dark:text-white">
                  {selectedCurve === CurveType.CLAMM
                    ? 'CLAMM'
                    : selectedCurve === CurveType.BIN_AMM
                    ? 'BinAMM'
                    : 'StableAMM'}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.06] space-y-1">
                <span className="text-[10px] font-mono uppercase text-neutral-400">Base Swap Fee</span>
                <div className="text-xs font-bold text-neutral-900 dark:text-white font-mono">
                  {(selectedFee / 10000).toFixed(2)}%
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.06] space-y-1">
                <span className="text-[10px] font-mono uppercase text-neutral-400">Opening Rate</span>
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  ${priceInput}
                </div>
              </div>
            </div>

            {/* Live State Mutation Diff */}
            <DiffViewer
              label="SupaPoolManager Registration"
              description={
                poolExists
                  ? 'Pool key is already registered. Next action mints liquidity only.'
                  : 'Registers immutable key in singleton state registry, then seeds liquidity.'
              }
              previousValue={poolExists ? `INITIALIZED (${poolId ? shortenAddress(poolId, 4) : '—'})` : 'UNINITIALIZED'}
              nextValue={
                poolExists
                  ? poolLiquidity > 0n
                    ? 'MINT POSITION (+liquidity)'
                    : 'SEED LIQUIDITY (mint)'
                  : `INITIALIZED (${poolId ? shortenAddress(poolId, 4) : '—'})`
              }
              unit=""
              isDestructive={false}
            />

            {/* Calldata JSON Inspector Button */}
            <div className="pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowJSON(!showJSON)}
                className="w-full text-xs gap-1.5 font-mono"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>{showJSON ? 'Hide Calldata Struct' : 'Inspect Raw PoolKey Struct'}</span>
              </Button>

              {showJSON && (
                <div className="mt-3">
                  <JSONInspector
                    title={
                      poolExists
                        ? 'PositionManager.mint (seed)'
                        : 'IPoolManager.initialize + PositionManager.mint'
                    }
                    data={{
                      poolManager: addrs?.poolManager,
                      positionManager: addrs?.positionManager,
                      poolKey: activePoolKey,
                      sqrtPriceX96: sqrtPriceX96.toString(),
                      initialTick: tick,
                      hookData: '0x',
                      poolExists,
                      poolLiquidity: poolLiquidity.toString(),
                      seedDeposit: {
                        amount0: poolOrderedPrice.amount0,
                        amount1: poolOrderedPrice.amount1,
                        useVaultClaims,
                        fullRange: selectedCurve === CurveType.CLAMM,
                      },
                    }}
                  />
                </div>
              )}
            </div>

            {/* Deploy Execution Button */}
            <div className="pt-2 border-t border-neutral-200/80 dark:border-white/[0.06]">
              <Button
                variant="brand"
                size="lg"
                onClick={() => {
                  if (deploySuccess) {
                    setDeployPhase('idle');
                    setDeployError(null);
                    setTxHash(null);
                    setSeedTxHash(null);
                  }
                  void handleDeploy();
                }}
                disabled={isDeploying || !hasPermission('admin.pool.create')}
                className="w-full text-xs font-semibold shadow-md"
              >
                {deployPhase === 'initializing' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Initializing Pool...</span>
                  </>
                ) : deployPhase === 'approving' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Approving Seed Tokens...</span>
                  </>
                ) : deployPhase === 'seeding' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Minting Seed Liquidity...</span>
                  </>
                ) : deploySuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {seedTxHash ? 'Seeded — Mint Again?' : 'Initialized — Seed Liquidity'}
                    </span>
                  </>
                ) : poolExists ? (
                  <>
                    <PlayCircle className="w-4 h-4" />
                    <span>Mint Seed Liquidity</span>
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-4 h-4" />
                    <span>Initialize &amp; Seed Pool</span>
                  </>
                )}
              </Button>

              {deployError && (
                <div className="mt-3 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-mono break-all">
                  {deployError}
                </div>
              )}

              {deploySuccess && txHash && (
                <div className="mt-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-mono space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span>Init: {shortenAddress(txHash, 6)}</span>
                    <button
                      type="button"
                      onClick={onBack}
                      className="underline text-[11px] font-semibold cursor-pointer"
                    >
                      View in Registry
                    </button>
                  </div>
                  {seedTxHash && (
                    <div className="text-[11px] opacity-90">Seed: {shortenAddress(seedTxHash, 6)}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Asset Selection Modal */}
      <Modal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        title="Select Asset"
        description="Choose verified network token or enter custom ERC-20 address."
      >
        <div className="space-y-4 pt-1">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search token symbol, name, or address..."
              value={tokenSearch}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTokenSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/[0.07] text-sm text-neutral-900 dark:text-white placeholder:text-neutral-500 focus:outline-none focus:border-neutral-400 dark:focus:border-white/[0.2]"
            />
          </div>

          <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
            {filteredTokens.map((t: KnownToken) => (
              <button
                key={t.address}
                type="button"
                onClick={() => {
                  if (tokenSelectingTarget === 'token0') {
                    setToken0(t);
                    setCustomToken0Address(t.address);
                  } else {
                    setToken1(t);
                    setCustomToken1Address(t.address);
                  }
                  setIsTokenModalOpen(false);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <TokenLogo symbol={t.symbol} address={t.address} size="md" />
                  <div>
                    <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                      {t.symbol}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">{t.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-medium text-neutral-900 dark:text-white">
                    {formatUSD(t.priceUSD || 0)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};
