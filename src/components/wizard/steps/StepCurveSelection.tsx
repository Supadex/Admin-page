import React from 'react';
import { Card, Badge, Input } from '../../ui';
import { CurveType } from '../../../utils/poolMath';
import { Layers, Activity, Percent, Check, HelpCircle } from 'lucide-react';

export interface StepCurveSelectionProps {
  curveType: CurveType;
  onSelectCurve: (curve: CurveType) => void;
  tickSpacing: number;
  onChangeTickSpacing: (spacing: number) => void;
  amplificationCoeff: number;
  onChangeAmplification: (amp: number) => void;
}

export const StepCurveSelection: React.FC<StepCurveSelectionProps> = ({
  curveType,
  onSelectCurve,
  tickSpacing,
  onChangeTickSpacing,
  amplificationCoeff,
  onChangeAmplification,
}) => {
  const curves = [
    {
      type: CurveType.CLAMM,
      title: 'Concentrated Liquidity (CLAMM)',
      subtitle: 'Tick-Indexed Capital Efficiency',
      description:
        'Continuous price curves with custom range orders. Ideal for volatile, active trading pairs with deep market making.',
      icon: Activity,
      recommendedFor: 'ETH/USDC, WBTC/USDC, Altcoins',
      defaultSpacing: 60,
    },
    {
      type: CurveType.BIN_AMM,
      title: 'Discretized Bins (BinAMM)',
      subtitle: 'Zero Intra-Bin Slippage',
      description:
        'Discretized price bins providing zero-slippage trades within each bin and dynamic fee capture for localized volatility.',
      icon: Layers,
      recommendedFor: 'L2 Tokens, Volatile Correlated Pairs',
      defaultSpacing: 20,
    },
    {
      type: CurveType.STABLE_AMM,
      title: 'Stableswap Invariant (StableAMM)',
      subtitle: 'Amplified Pegged Invariant',
      description:
        'Hybrid constant-sum and constant-product invariant designed specifically for soft-pegged and tightly correlated assets.',
      icon: Percent,
      recommendedFor: 'USDC/USDT, DAI/USDC, stETH/ETH',
      defaultSpacing: 1,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold tracking-tight text-primary-theme flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-500" />
          <span>Step 2: Select AMM Curve Engine</span>
        </h3>
        <p className="text-xs text-secondary-theme">
          Choose the mathematical engine for this pool. Each curve provides distinct capital efficiency, slippage behavior, and LP fee distribution.
        </p>
      </div>

      {/* Curve Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {curves.map((curve) => {
          const isSelected = curveType === curve.type;
          const Icon = curve.icon;

          return (
            <Card
              key={curve.type}
              onClick={() => {
                onSelectCurve(curve.type);
                onChangeTickSpacing(curve.defaultSpacing);
              }}
              className={`p-4 rounded-2xl cursor-pointer transition-all flex flex-col justify-between space-y-4 border ${
                isSelected
                  ? 'border-primary-theme bg-surface-theme shadow-md ring-1 ring-primary-theme'
                  : 'border-hairline-theme bg-surface-theme hover:bg-subtle-theme'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                      isSelected
                        ? 'bg-accent-primary-theme text-accent-invert-theme border-transparent'
                        : 'bg-subtle-theme text-primary-theme border-hairline-theme'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  {isSelected && (
                    <Badge variant="success" size="sm" className="gap-1">
                      <Check className="w-3 h-3" /> Selected
                    </Badge>
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-primary-theme font-mono">
                    {curve.title}
                  </h4>
                  <div className="text-[11px] font-medium text-secondary-theme">
                    {curve.subtitle}
                  </div>
                </div>

                <p className="text-xs text-secondary-theme leading-relaxed">
                  {curve.description}
                </p>
              </div>

              <div className="pt-3 border-t border-hairline-theme space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-secondary-theme">
                  Recommended For
                </span>
                <p className="text-[11px] font-medium text-primary-theme">
                  {curve.recommendedFor}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Parameter Calibration Sub-Card */}
      <Card className="p-4 bg-surface-theme border-hairline-theme space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary-theme font-mono">
              Engine Parameters
            </span>
            <HelpCircle className="w-3.5 h-3.5 text-secondary-theme" />
          </div>
          <span className="text-xs font-mono text-secondary-theme">
            Curve ID: <strong className="text-primary-theme">{curveType}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Tick Spacing / Bin Step */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-primary-theme flex items-center justify-between">
              <span>
                {curveType === CurveType.BIN_AMM
                  ? 'Bin Step (bps)'
                  : curveType === CurveType.STABLE_AMM
                  ? 'Resolution Step'
                  : 'Tick Spacing (int24)'}
              </span>
              <span className="text-[11px] font-mono text-secondary-theme">{tickSpacing}</span>
            </label>
            <Input
              type="number"
              value={tickSpacing}
              onChange={(e) => onChangeTickSpacing(parseInt(e.target.value) || 1)}
              min={1}
              max={1000}
              className="font-mono text-xs"
            />
            <p className="text-[10px] text-secondary-theme">
              {curveType === CurveType.CLAMM
                ? 'Determines price granularity for liquidity positions (e.g. 10, 60, 200).'
                : curveType === CurveType.BIN_AMM
                ? 'Price gap between adjacent liquidity bins in basis points.'
                : 'Granularity step for stableswap invariant updates.'}
            </p>
          </div>

          {/* Amplification Factor (for StableAMM) */}
          {curveType === CurveType.STABLE_AMM && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-primary-theme flex items-center justify-between">
                <span>Amplification Factor (A)</span>
                <span className="text-[11px] font-mono text-secondary-theme">{amplificationCoeff}</span>
              </label>
              <Input
                type="number"
                value={amplificationCoeff}
                onChange={(e) => onChangeAmplification(parseInt(e.target.value) || 100)}
                min={10}
                max={5000}
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-secondary-theme">
                Higher values (e.g. 500-2000) concentrate liquidity tightly near 1.0 peg.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
