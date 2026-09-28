import React from 'react';
import { Card, Input, Badge } from '../../ui';
import {
  priceToSqrtPriceX96,
  sqrtPriceX96ToTick,
  type KnownToken,
} from '../../../utils/poolMath';
import { TrendingUp, Hash, ArrowRight } from 'lucide-react';

export interface StepPriceAndSeedProps {
  token0: KnownToken | null;
  token1: KnownToken | null;
  priceInput: string;
  onChangePriceInput: (val: string) => void;
  seedAmount0: string;
  onChangeSeedAmount0: (val: string) => void;
  seedAmount1: string;
  onChangeSeedAmount1: (val: string) => void;
  useVaultClaims: boolean;
  onToggleVaultClaims: (val: boolean) => void;
}

export const StepPriceAndSeed: React.FC<StepPriceAndSeedProps> = ({
  token0,
  token1,
  priceInput,
  onChangePriceInput,
  seedAmount0,
  onChangeSeedAmount0,
  seedAmount1,
  onChangeSeedAmount1,
  useVaultClaims,
  onToggleVaultClaims,
}) => {
  const decimals0 = token0?.decimals ?? 18;
  const decimals1 = token1?.decimals ?? 6;
  const symbol0 = token0?.symbol ?? 'Token0';
  const symbol1 = token1?.symbol ?? 'Token1';

  const numPrice = parseFloat(priceInput) || 0;
  const sqrtPriceX96 = React.useMemo(() => {
    return priceToSqrtPriceX96(numPrice, decimals0, decimals1);
  }, [numPrice, decimals0, decimals1]);

  const tick = React.useMemo(() => {
    return sqrtPriceX96ToTick(sqrtPriceX96);
  }, [sqrtPriceX96]);

  const invertPrice = numPrice > 0 ? (1 / numPrice).toFixed(6) : '0';

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold tracking-tight text-primary-theme flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <span>Step 4: Initial Price & Seed Deposit</span>
        </h3>
        <p className="text-xs text-secondary-theme">
          Set the opening pool price. The system automatically computes the high-precision <code className="font-mono text-[11px] bg-subtle-theme px-1 py-0.5 rounded">sqrtPriceX96</code> fixed-point integer and initial active tick.
        </p>
      </div>

      {/* Price Configuration Card */}
      <Card className="p-4 bg-surface-theme border-hairline-theme space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary-theme font-mono">
            Initial Exchange Rate
          </span>
          <Badge variant="info" size="sm" className="font-mono text-[10px]">
            1 {symbol0} = {priceInput || '0'} {symbol1}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-primary-theme">
              Price ({symbol1} per 1 {symbol0})
            </label>
            <Input
              type="number"
              value={priceInput}
              onChange={(e) => onChangePriceInput(e.target.value)}
              placeholder="e.g. 3500.00"
              className="font-mono text-sm font-semibold"
            />
            <p className="text-[10px] text-secondary-theme">
              Inverse rate: 1 {symbol1} ≈ {invertPrice} {symbol0}
            </p>
          </div>

          {/* Computed Math Telemetry */}
          <div className="p-3 rounded-xl bg-subtle-theme border border-hairline-theme space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-secondary-theme flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" />
                <span>sqrtPriceX96</span>
              </span>
              <span className="font-mono text-[11px] text-primary-theme font-bold truncate max-w-[180px]">
                {sqrtPriceX96.toString()}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-hairline-theme">
              <span className="text-secondary-theme">Initial Active Tick</span>
              <span className="font-mono text-xs text-primary-theme font-semibold">
                {tick.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Initial Seed Deposit (Optional) */}
      <Card className="p-4 bg-surface-theme border-hairline-theme space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary-theme font-mono">
              Initial Seed Liquidity (Optional)
            </span>
            <p className="text-[11px] text-secondary-theme">
              Deposit initial token inventory simultaneously with pool initialization.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-secondary-theme">Use ERC-6909 Vault Claims</span>
            <input
              type="checkbox"
              checked={useVaultClaims}
              onChange={(e) => onToggleVaultClaims(e.target.checked)}
              className="rounded border-hairline-theme text-primary-theme focus:ring-0 cursor-pointer"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-primary-theme flex items-center justify-between">
              <span>{symbol0} Seed Amount</span>
              <span className="text-[10px] font-mono text-secondary-theme">
                Decimals: {decimals0}
              </span>
            </label>
            <Input
              type="number"
              value={seedAmount0}
              onChange={(e) => onChangeSeedAmount0(e.target.value)}
              placeholder="0.0"
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-primary-theme flex items-center justify-between">
              <span>{symbol1} Seed Amount</span>
              <span className="text-[10px] font-mono text-secondary-theme">
                Decimals: {decimals1}
              </span>
            </label>
            <Input
              type="number"
              value={seedAmount1}
              onChange={(e) => onChangeSeedAmount1(e.target.value)}
              placeholder="0.0"
              className="font-mono text-xs"
            />
          </div>
        </div>

        {useVaultClaims && (
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs flex items-center gap-2">
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            <span>
              Tokens will be deducted from your internal ERC-6909 singleton Vault claims without requiring direct ERC-20 transfers.
            </span>
          </div>
        )}
      </Card>
    </div>
  );
};
