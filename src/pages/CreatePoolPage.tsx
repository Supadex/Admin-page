import React, { useState, useMemo } from 'react';
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
  type KnownToken,
  type PoolKeyStruct,
} from '../utils/poolMath';
import { APP_CONFIG } from '../utils/constants';
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
} from 'lucide-react';
import { isAddress } from 'viem';

export interface CreatePoolPageProps {
  onBack: () => void;
  onPoolCreated?: (poolKey: PoolKeyStruct) => void;
}

export const CreatePoolPage: React.FC<CreatePoolPageProps> = ({
  onBack,
  onPoolCreated,
}) => {
  const { hasPermission } = useAdminAuth();

  // State: Pair Tokens
  const [token0, setToken0] = useState<KnownToken>(KNOWN_TOKENS[1]); // WETH
  const [token1, setToken1] = useState<KnownToken>(KNOWN_TOKENS[2]); // USDC
  const [customToken0Address, setCustomToken0Address] = useState<string>(KNOWN_TOKENS[1].address);
  const [customToken1Address, setCustomToken1Address] = useState<string>(KNOWN_TOKENS[2].address);

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
    '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' // Dynamic LVR Hook
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
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploySuccess, setDeploySuccess] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

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

  // Price calculations
  const numPrice = parseFloat(priceInput) || 0;
  const sqrtPriceX96 = useMemo(() => {
    return priceToSqrtPriceX96(numPrice, token0.decimals, token1.decimals);
  }, [numPrice, token0.decimals, token1.decimals]);

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

  // Execute deployment
  const handleDeploy = () => {
    setIsDeploying(true);
    setTimeout(() => {
      setIsDeploying(false);
      setDeploySuccess(true);
      const generatedHash = '0x8b3f11e9a7c204918e7b301c2384a51e60f7e1b5d92a104c8e71b2390f4e1982';
      setTxHash(generatedHash);
      if (onPoolCreated) {
        onPoolCreated(activePoolKey);
      }
    }, 1600);
  };

  return (
    <div className="w-full max-w-7xl mx-auto py-4 px-4 sm:px-6 space-y-8 animate-fade-in">
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
          <span>Back to Control Center</span>
        </button>

        <div className="flex items-center gap-2">
          <Badge variant="brand" size="sm" className="font-mono">
            SupaPoolManager v1
          </Badge>
          <Badge variant="purple" size="sm" className="font-mono">
            Singleton Hook Native
          </Badge>
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: 4 Step Deployment Configuration Form */}
        <div className="lg:col-span-7 space-y-6">
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
                usdValue={amount0 ? (parseFloat(amount0) * (token0.priceUSD || 0)).toFixed(2) : undefined}
                balance="25.0000"
                isVaultClaim={useVaultClaims}
              />

              <TokenAmountInput
                label={`Initial ${token1.symbol} Seed`}
                value={amount1}
                onChange={setAmount1}
                tokenSymbol={token1.symbol}
                usdValue={amount1 ? (parseFloat(amount1) * (token1.priceUSD || 0)).toFixed(2) : undefined}
                balance="85,000.00"
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
                  Deduct from singleton ledger credits rather than raw ERC-20 transfers.
                </p>
              </div>
              <Toggle checked={useVaultClaims} onChange={setUseVaultClaims} />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Deterministic PoolId, Diff Audit & Execution */}
        <div className="lg:col-span-5 sticky top-6 space-y-6">
          {/* Deterministic PoolId & Summary Card */}
          <div className="bg-white dark:bg-[#111317] border border-neutral-200/80 dark:border-white/[0.08] rounded-3xl p-6 shadow-xs space-y-4">
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
              description="Registers immutable key in singleton state registry."
              previousValue="UNINITIALIZED"
              nextValue={`INITIALIZED (${shortenAddress(poolId, 4)})`}
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
                    title="IPoolManager.initialize"
                    data={{
                      poolManager: APP_CONFIG.contracts.supaPoolManager,
                      poolKey: activePoolKey,
                      sqrtPriceX96: sqrtPriceX96.toString(),
                      initialTick: tick,
                      hookData: '0x',
                      seedDeposit: {
                        amount0,
                        amount1,
                        useVaultClaims,
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
                onClick={handleDeploy}
                disabled={isDeploying || deploySuccess || !hasPermission('admin.pool.create')}
                className="w-full text-xs font-semibold shadow-md"
              >
                {isDeploying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Simulating & Deploying On-Chain...</span>
                  </>
                ) : deploySuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Pool Successfully Initialized</span>
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-4 h-4" />
                    <span>Initialize Pool Singleton</span>
                  </>
                )}
              </Button>

              {deploySuccess && txHash && (
                <div className="mt-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-mono flex items-center justify-between">
                  <span>Tx: {shortenAddress(txHash, 6)}</span>
                  <button
                    type="button"
                    onClick={onBack}
                    className="underline text-[11px] font-semibold cursor-pointer"
                  >
                    View in Registry
                  </button>
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
