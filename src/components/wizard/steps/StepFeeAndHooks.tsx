import React from 'react';
import { Card, Badge, Input, Toggle } from '../../ui';
import { FEE_TIERS, KNOWN_HOOKS, CurveType } from '../../../utils/poolMath';
import { SlidersHorizontal, Lock, Check, ExternalLink } from 'lucide-react';
import { isAddress } from 'viem';

export interface StepFeeAndHooksProps {
  curveType: CurveType;
  feeTier: number; // in hundredths of a bip (e.g. 500 = 0.05%)
  onSelectFeeTier: (fee: number) => void;
  customFeeInput: string;
  onChangeCustomFee: (val: string) => void;
  pluginAddress: string;
  onSelectPlugin: (address: string) => void;
  customPluginAddress: string;
  onChangeCustomPlugin: (val: string) => void;
}

export const StepFeeAndHooks: React.FC<StepFeeAndHooksProps> = ({
  curveType,
  feeTier,
  onSelectFeeTier,
  customFeeInput,
  onChangeCustomFee,
  pluginAddress,
  onSelectPlugin,
  customPluginAddress,
  onChangeCustomPlugin,
}) => {
  const [isCustomPlugin, setIsCustomPlugin] = React.useState(false);

  const isValidCustomHook = customPluginAddress ? isAddress(customPluginAddress) : false;


  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold tracking-tight text-primary-theme flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-purple-500" />
          <span>Step 3: Base Fee & Hook Attachment</span>
        </h3>
        <p className="text-xs text-secondary-theme">
          Configure the base swap fee tier and attach native plugins such as the Dynamic LVR Volatility Oracle hook or Anti-JIT fee vesting.
        </p>
      </div>

      {/* Fee Tiers Grid */}
      <div className="space-y-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-secondary-theme font-mono">
          Base Swap Fee Tier
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {FEE_TIERS.map((tier) => {
            const isSelected = feeTier === tier.value;

            return (
              <Card
                key={tier.value}
                onClick={() => onSelectFeeTier(tier.value)}
                className={`p-3 rounded-xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'border-primary-theme bg-surface-theme shadow-sm ring-1 ring-primary-theme'
                    : 'border-hairline-theme bg-surface-theme hover:bg-subtle-theme'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold font-mono text-primary-theme">
                    {tier.label}
                  </span>
                  {isSelected && (
                    <Badge variant="success" size="sm" className="gap-1 text-[10px] py-0">
                      <Check className="w-2.5 h-2.5" /> Active
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-secondary-theme line-clamp-2">
                  {tier.description}
                </p>
                <div className="mt-2 pt-2 border-t border-hairline-theme flex justify-between text-[10px] font-mono text-secondary-theme">
                  <span>Tick Spacing</span>
                  <span className="text-primary-theme font-semibold">
                    {tier.tickSpacing[curveType]}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Custom Fee Overwrite */}
        <div className="p-3 rounded-xl bg-subtle-theme border border-hairline-theme flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-primary-theme">Custom Fee (hundredths of bip)</span>
            <p className="text-[11px] text-secondary-theme">
              E.g. 2500 = 0.25%, 5000 = 0.50%
            </p>
          </div>
          <div className="w-32">
            <Input
              type="number"
              value={customFeeInput}
              onChange={(e) => {
                onChangeCustomFee(e.target.value);
                const parsed = parseInt(e.target.value);
                if (parsed > 0) onSelectFeeTier(parsed);
              }}
              placeholder="e.g. 2500"
              className="text-xs font-mono h-8"
            />
          </div>
        </div>
      </div>

      {/* Hook Attachment Configuration */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary-theme font-mono">
              Hook & Plugin Architecture
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-secondary-theme">Custom Hook Contract</span>
            <Toggle
              checked={isCustomPlugin}
              onChange={(checked) => setIsCustomPlugin(checked)}
            />
          </div>
        </div>

        {!isCustomPlugin ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {KNOWN_HOOKS.map((hook) => {
              const isSelected = pluginAddress.toLowerCase() === hook.address.toLowerCase();

              return (
                <Card
                  key={hook.address}
                  onClick={() => onSelectPlugin(hook.address)}
                  className={`p-3.5 rounded-xl cursor-pointer transition-all border flex flex-col justify-between space-y-3 ${
                    isSelected
                      ? 'border-primary-theme bg-surface-theme shadow-sm ring-1 ring-primary-theme'
                      : 'border-hairline-theme bg-surface-theme hover:bg-subtle-theme'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary-theme truncate">
                        {hook.name}
                      </span>
                      {isSelected && (
                        <Badge variant="success" size="sm" className="gap-1 py-0 text-[10px]">
                          <Check className="w-2.5 h-2.5" /> Attached
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-secondary-theme leading-relaxed">
                      {hook.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-hairline-theme flex items-center justify-between text-[10px] font-mono text-secondary-theme">
                    <span className="truncate max-w-[150px]">
                      {hook.address === '0x0000000000000000000000000000000000000000'
                        ? '0x0000...0000 (None)'
                        : `${hook.address.slice(0, 6)}...${hook.address.slice(-4)}`}
                    </span>
                    {hook.address !== '0x0000000000000000000000000000000000000000' && (
                      <ExternalLink className="w-3 h-3 text-secondary-theme" />
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-4 bg-surface-theme border-hairline-theme space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-primary-theme">
                Custom Hook Contract Address
              </label>
              <Input
                value={customPluginAddress}
                onChange={(e) => {
                  onChangeCustomPlugin(e.target.value.trim());
                  if (isAddress(e.target.value.trim())) {
                    onSelectPlugin(e.target.value.trim());
                  }
                }}
                placeholder="0x... (must implement IHooks / IPoolPlugin)"
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-secondary-theme">
                The hook contract must adhere to Uniswap V4 / SupaDex Hook permission address flag standards.
              </p>
            </div>

            {isValidCustomHook && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center justify-between">
                <span>Verified valid EVM contract address</span>
                <span className="font-mono text-[11px]">
                  {customPluginAddress.slice(0, 8)}...{customPluginAddress.slice(-6)}
                </span>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};
