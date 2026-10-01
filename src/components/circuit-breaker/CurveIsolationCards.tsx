import React, { useMemo } from 'react';
import { Badge, Button } from '../ui';
import { formatUSD } from '../../utils/formatters';
import { Layers, Power, Lock, Unlock, Clock, AlertTriangle } from 'lucide-react';

export interface CurvePoolStat {
  curveType: 'CLAMM' | 'BinAMM' | 'StableAMM';
  tvlUSD: number;
  volume24h: number;
}

interface CurveIsolationCardsProps {
  isCurvePaused: {
    clamm: boolean;
    binAmm: boolean;
    stableAmm: boolean;
  };
  pools: CurvePoolStat[];
  onPauseCurve: (curveType: 0 | 1 | 2) => void;
  onRequestUnpause: (curveType: 0 | 1 | 2) => void;
  canTriggerPause: boolean;
  canManageTimelock: boolean;
  isSubmitting: boolean;
}

export const CurveIsolationCards: React.FC<CurveIsolationCardsProps> = ({
  isCurvePaused,
  pools,
  onPauseCurve,
  onRequestUnpause,
  canTriggerPause,
  canManageTimelock,
  isSubmitting,
}) => {
  const stats = useMemo(() => {
    const empty = { poolCount: 0, tvlUSD: 0, volume24h: 0 };
    const byCurve = {
      CLAMM: { ...empty },
      BinAMM: { ...empty },
      StableAMM: { ...empty },
    };
    for (const p of pools) {
      const bucket = byCurve[p.curveType];
      if (!bucket) continue;
      bucket.poolCount += 1;
      bucket.tvlUSD += p.tvlUSD || 0;
      bucket.volume24h += p.volume24h || 0;
    }
    return byCurve;
  }, [pools]);

  const curves = [
    {
      id: 0 as const,
      name: 'CLAMM Engine',
      type: 'Concentrated Liquidity',
      isPaused: isCurvePaused.clamm,
      ...stats.CLAMM,
    },
    {
      id: 1 as const,
      name: 'BinAMM Engine',
      type: 'Discretized Bins',
      isPaused: isCurvePaused.binAmm,
      ...stats.BinAMM,
    },
    {
      id: 2 as const,
      name: 'StableAMM Engine',
      type: 'Invariable Peg Curve',
      isPaused: isCurvePaused.stableAmm,
      ...stats.StableAMM,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="w-4 h-4 text-secondary-theme shrink-0" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary-theme">
            Tier 2: Curve Engine Isolation Matrix
          </h3>
        </div>
        <span className="text-[11px] font-mono text-secondary-theme shrink-0 hidden sm:inline">
          Live from Initialize logs
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {curves.map((curve) => (
          <div
            key={curve.id}
            className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between min-w-0 ${
              curve.isPaused
                ? 'bg-red-500/5 border-red-500/20'
                : 'bg-surface-theme border-hairline-theme hover:border-hairline-focus'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-primary-theme font-mono">
                      {curve.name}
                    </span>
                    <Badge variant={curve.isPaused ? 'danger' : 'success'}>
                      {curve.isPaused ? 'ISOLATED' : 'ONLINE'}
                    </Badge>
                  </div>
                  <p className="text-xs text-secondary-theme">{curve.type}</p>
                </div>
                <div className="p-2 rounded-xl bg-elevated-theme border border-hairline-theme shrink-0">
                  {curve.isPaused ? (
                    <Lock className="w-4 h-4 text-red-500" />
                  ) : (
                    <Unlock className="w-4 h-4 text-emerald-500" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-hairline-theme text-xs font-mono">
                <div className="min-w-0">
                  <span className="text-secondary-theme block text-[10px]">ACTIVE POOLS</span>
                  <span className="text-primary-theme font-semibold">{curve.poolCount}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-secondary-theme block text-[10px]">TVL</span>
                  <span className="text-primary-theme font-semibold">{formatUSD(curve.tvlUSD)}</span>
                </div>
              </div>

              {curve.isPaused && (
                <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-400 flex items-center gap-1.5 font-mono">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Swaps halted. LP redemptions active.</span>
                </div>
              )}
            </div>

            <div className="pt-4 mt-2">
              {curve.isPaused ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canManageTimelock || isSubmitting}
                  onClick={() => onRequestUnpause(curve.id)}
                  className="w-full text-xs gap-1.5 font-mono"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Unpause Curve (Timelock)</span>
                </Button>
              ) : (
                <Button
                  variant="danger"
                  size="sm"
                  disabled={!canTriggerPause || isSubmitting}
                  onClick={() => onPauseCurve(curve.id)}
                  className="w-full text-xs gap-1.5 font-mono"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>Isolate {curve.name}</span>
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
