import React from 'react';
import { Card, Badge, Button } from '../../ui';
import { DiffViewer, JSONInspector } from '../../data';
import {
  CurveType,
  computePoolId,
  priceToSqrtPriceX96,
  sqrtPriceX96ToTick,
  type PoolKeyStruct,
  type KnownToken,
} from '../../../utils/poolMath';
import { shortenAddress } from '../../../utils/formatters';
import { APP_CONFIG } from '../../../utils/constants';
import { CheckCircle2, Code2, Hash, Layers, PlayCircle, Loader2 } from 'lucide-react';

export interface StepSummaryAndDeployProps {
  poolKey: PoolKeyStruct;
  token0: KnownToken | null;
  token1: KnownToken | null;
  price: number;
  seedAmount0: string;
  seedAmount1: string;
  useVaultClaims: boolean;
  onDeploy: () => void;
  isDeploying: boolean;
  deploySuccess: boolean;
  txHash: string | null;
}

export const StepSummaryAndDeploy: React.FC<StepSummaryAndDeployProps> = ({
  poolKey,
  token0,
  token1,
  price,
  seedAmount0,
  seedAmount1,
  useVaultClaims,
  onDeploy,
  isDeploying,
  deploySuccess,
  txHash,
}) => {
  const [showJSON, setShowJSON] = React.useState(false);

  const decimals0 = token0?.decimals ?? 18;
  const decimals1 = token1?.decimals ?? 6;
  const symbol0 = token0?.symbol ?? 'Token0';
  const symbol1 = token1?.symbol ?? 'Token1';

  const poolId = React.useMemo(() => computePoolId(poolKey), [poolKey]);
  const sqrtPriceX96 = React.useMemo(
    () => priceToSqrtPriceX96(price, decimals0, decimals1),
    [price, decimals0, decimals1]
  );
  const tick = React.useMemo(() => sqrtPriceX96ToTick(sqrtPriceX96), [sqrtPriceX96]);

  const curveLabel =
    poolKey.curveType === CurveType.CLAMM
      ? 'Concentrated Liquidity (CLAMM)'
      : poolKey.curveType === CurveType.BIN_AMM
      ? 'Discretized Bins (BinAMM)'
      : 'Stableswap Invariant (StableAMM)';

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold tracking-tight text-primary-theme flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>Step 5: Audit Parameters & Initialize Pool</span>
        </h3>
        <p className="text-xs text-secondary-theme">
          Review the immutable PoolKey configuration before submitting the initialization transaction to <code className="font-mono text-[11px] bg-subtle-theme px-1 py-0.5 rounded">SupaPoolManager</code>.
        </p>
      </div>

      {/* Deployment Status Feedback if active */}
      {deploySuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
          <div className="flex items-center gap-2 text-emerald-500 font-semibold text-xs">
            <CheckCircle2 className="w-4 h-4" />
            <span>Pool Successfully Initialized On-Chain!</span>
          </div>
          <p className="text-xs text-secondary-theme font-mono">
            Transaction Hash: {txHash ? shortenAddress(txHash, 8) : '0x7b2...9f4'}
          </p>
        </div>
      )}

      {/* Pool Identifier & Key Matrix */}
      <Card className="p-4 bg-surface-theme border-hairline-theme space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-primary-theme" />
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary-theme font-mono">
              Deterministic Pool ID (keccak256)
            </span>
          </div>
          <Badge variant="info" size="sm" className="font-mono text-[11px] self-start sm:self-auto">
            {shortenAddress(poolId, 8)}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-subtle-theme border border-hairline-theme space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-secondary-theme">
              Pair
            </span>
            <div className="text-xs font-bold text-primary-theme">
              {symbol0} / {symbol1}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-subtle-theme border border-hairline-theme space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-secondary-theme">
              Curve Engine
            </span>
            <div className="text-xs font-bold text-primary-theme truncate">
              {curveLabel.split(' ')[0]}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-subtle-theme border border-hairline-theme space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-secondary-theme">
              Base Fee / Spacing
            </span>
            <div className="text-xs font-bold text-primary-theme font-mono">
              {(poolKey.fee / 10000).toFixed(2)}% ({poolKey.tickSpacing} tick)
            </div>
          </div>

          <div className="p-3 rounded-xl bg-subtle-theme border border-hairline-theme space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-secondary-theme">
              Opening Price
            </span>
            <div className="text-xs font-bold text-emerald-500 font-mono">
              1 {symbol0} = {price} {symbol1}
            </div>
          </div>
        </div>
      </Card>

      {/* Parameter Diff & Safety Review */}
      <DiffViewer
        label="Pool Manager State Mutation"
        description="Immutable pool registration in SupaPoolManager singleton."
        previousValue="UNINITIALIZED"
        nextValue={`INITIALIZED (PoolId: ${shortenAddress(poolId, 6)})`}
        unit=""
        isDestructive={false}
      />

      {/* Raw ABI Parameters Toggle */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowJSON(!showJSON)}
            className="text-xs gap-1.5 font-mono"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>{showJSON ? 'Hide Calldata Struct' : 'Inspect Raw PoolKey Struct'}</span>
          </Button>
          <span className="text-[10px] font-mono text-secondary-theme">
            Target: {shortenAddress(APP_CONFIG.contracts.supaPoolManager, 6)}
          </span>
        </div>

        {showJSON && (
          <JSONInspector
            title="IPoolManager.initialize(PoolKey, uint160, bytes)"
            data={{
              poolManager: APP_CONFIG.contracts.supaPoolManager,
              poolKey: {
                currency0: poolKey.currency0,
                currency1: poolKey.currency1,
                fee: poolKey.fee,
                tickSpacing: poolKey.tickSpacing,
                plugin: poolKey.plugin,
                curveType: poolKey.curveType,
              },
              sqrtPriceX96: sqrtPriceX96.toString(),
              initialTick: tick,
              hookData: '0x',
              seedDeposit: {
                amount0: seedAmount0 || '0',
                amount1: seedAmount1 || '0',
                useVaultClaims,
              },
            }}
          />
        )}
      </div>

      {/* Execution Callout */}
      <div className="p-4 rounded-2xl bg-surface-theme border border-hairline-theme flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <span className="text-xs font-semibold text-primary-theme flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            <span>Ready for On-Chain Initialization</span>
          </span>
          <p className="text-[11px] text-secondary-theme">
            Submits <code className="font-mono text-[10px] bg-subtle-theme px-1 py-0.5 rounded">initialize()</code> with atomic validation and hook verification.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={onDeploy}
          disabled={isDeploying || deploySuccess}
          className="w-full sm:w-auto gap-2 text-xs font-semibold shrink-0"
        >
          {isDeploying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Simulating & Initializing...</span>
            </>
          ) : deploySuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Pool Initialized</span>
            </>
          ) : (
            <>
              <PlayCircle className="w-4 h-4" />
              <span>Initialize Pool Contract</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
