import React from 'react';
import { Button, Input, Card, Badge } from '../../ui';
import { KNOWN_TOKENS, sortCurrencies, type KnownToken } from '../../../utils/poolMath';
import { ArrowDownUp, Check, AlertCircle, Coins } from 'lucide-react';
import { isAddress } from 'viem';

export interface StepPairSelectionProps {
  token0: KnownToken | null;
  token1: KnownToken | null;
  customToken0: string;
  customToken1: string;
  onSelectToken0: (token: KnownToken | null, customAddress?: string) => void;
  onSelectToken1: (token: KnownToken | null, customAddress?: string) => void;
  onSwapTokens: () => void;
}

export const StepPairSelection: React.FC<StepPairSelectionProps> = ({
  token0,
  token1,
  customToken0,
  customToken1,
  onSelectToken0,
  onSelectToken1,
  onSwapTokens,
}) => {
  const [searchFilter, setSearchFilter] = React.useState('');

  const filteredTokens = KNOWN_TOKENS.filter(
    (t) =>
      t.symbol.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.address.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const address0 = token0 ? token0.address : customToken0;
  const address1 = token1 ? token1.address : customToken1;

  const isValid0 = address0 ? isAddress(address0) : false;
  const isValid1 = address1 ? isAddress(address1) : false;

  const isSameAddress =
    isValid0 && isValid1 && address0.toLowerCase() === address1.toLowerCase();

  const sortingCheck =
    isValid0 && isValid1 && !isSameAddress
      ? sortCurrencies(address0, address1)
      : null;

  const isCanonicalOrder = sortingCheck ? !sortingCheck.isReversed : true;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold tracking-tight text-primary-theme flex items-center gap-2">
          <Coins className="w-4 h-4 text-emerald-500" />
          <span>Step 1: Specify Pair Currencies</span>
        </h3>
        <p className="text-xs text-secondary-theme">
          Select two ERC-20 tokens or native ETH. SupaDex enforces canonical address ordering (<code className="font-mono text-[11px] bg-subtle-theme px-1 py-0.5 rounded">Currency0 &lt; Currency1</code>) to prevent pool duplication.
        </p>
      </div>

      {/* Selected Token Pickers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
        {/* Token 0 Box */}
        <Card className="p-4 space-y-3 bg-surface-theme border-hairline-theme">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-secondary-theme">
              Currency 0 (Base)
            </span>
            {isValid0 && (
              <Badge variant="success" size="sm" className="gap-1">
                <Check className="w-3 h-3" /> Valid
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={customToken0}
              onChange={(e) => {
                const val = e.target.value.trim();
                const matched = KNOWN_TOKENS.find(
                  (t) => t.address.toLowerCase() === val.toLowerCase()
                );
                onSelectToken0(matched || null, val);
              }}
              placeholder="0x... or select below"
              className="font-mono text-xs"
            />
          </div>

          {token0 && (
            <div className="p-2.5 rounded-xl bg-subtle-theme border border-hairline-theme flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-accent-primary-theme text-accent-invert-theme font-bold text-xs flex items-center justify-center font-mono">
                  {token0.symbol.slice(0, 2)}
                </div>
                <div>
                  <div className="text-xs font-semibold text-primary-theme">{token0.symbol}</div>
                  <div className="text-[10px] text-secondary-theme">{token0.name}</div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-secondary-theme">
                {token0.decimals} Decimals
              </span>
            </div>
          )}
        </Card>

        {/* Swap / Order Inverter in the middle for desktop */}
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <Button
            variant="outline"
            size="sm"
            onClick={onSwapTokens}
            className="rounded-full w-9 h-9 p-0 bg-elevated-theme shadow-md hover:scale-105 transition-transform"
            title="Swap Currency Order"
          >
            <ArrowDownUp className="w-3.5 h-3.5 text-primary-theme" />
          </Button>
        </div>

        {/* Token 1 Box */}
        <Card className="p-4 space-y-3 bg-surface-theme border-hairline-theme">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-secondary-theme">
              Currency 1 (Quote)
            </span>
            {isValid1 && (
              <Badge variant="success" size="sm" className="gap-1">
                <Check className="w-3 h-3" /> Valid
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={customToken1}
              onChange={(e) => {
                const val = e.target.value.trim();
                const matched = KNOWN_TOKENS.find(
                  (t) => t.address.toLowerCase() === val.toLowerCase()
                );
                onSelectToken1(matched || null, val);
              }}
              placeholder="0x... or select below"
              className="font-mono text-xs"
            />
          </div>

          {token1 && (
            <div className="p-2.5 rounded-xl bg-subtle-theme border border-hairline-theme flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-accent-primary-theme text-accent-invert-theme font-bold text-xs flex items-center justify-center font-mono">
                  {token1.symbol.slice(0, 2)}
                </div>
                <div>
                  <div className="text-xs font-semibold text-primary-theme">{token1.symbol}</div>
                  <div className="text-[10px] text-secondary-theme">{token1.name}</div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-secondary-theme">
                {token1.decimals} Decimals
              </span>
            </div>
          )}
        </Card>
      </div>

      {/* Warnings & Canonical Sort Alert */}
      {isSameAddress && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Currency 0 and Currency 1 cannot be the same address.</span>
        </div>
      )}

      {sortingCheck && !isCanonicalOrder && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              Address ordering is reversed. Click to automatically enforce canonical order.
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onSwapTokens}
            className="text-[11px] h-7 px-2.5 bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 shrink-0"
          >
            Auto-Order
          </Button>
        </div>
      )}

      {/* Token Quick Presets / Catalog */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary-theme">
            Verified Network Tokens
          </span>
          <div className="w-48">
            <Input
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search token..."
              className="text-xs h-8"
            />
          </div>

        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {filteredTokens.map((tok) => {
            const isSelected0 = token0?.address.toLowerCase() === tok.address.toLowerCase();
            const isSelected1 = token1?.address.toLowerCase() === tok.address.toLowerCase();

            return (
              <button
                key={tok.address}
                onClick={() => {
                  if (!token0 || isSelected0) {
                    onSelectToken0(tok, tok.address);
                  } else if (!token1 || isSelected1) {
                    onSelectToken1(tok, tok.address);
                  } else {
                    onSelectToken0(tok, tok.address);
                  }
                }}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected0 || isSelected1
                    ? 'bg-accent-primary-theme text-accent-invert-theme border-transparent shadow-sm'
                    : 'bg-surface-theme border-hairline-theme text-primary-theme hover:bg-subtle-theme'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono">{tok.symbol}</span>
                  {isSelected0 && <span className="text-[9px] font-mono px-1 rounded bg-black/20 dark:bg-white/20">C0</span>}
                  {isSelected1 && <span className="text-[9px] font-mono px-1 rounded bg-black/20 dark:bg-white/20">C1</span>}
                </div>
                <span className="text-[10px] opacity-70 truncate mt-1">{tok.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
