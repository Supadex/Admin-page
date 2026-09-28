import React from 'react';
import { Badge, Button } from '../ui';
import { Layers, Power, Lock, Unlock, Clock, AlertTriangle } from 'lucide-react';

interface CurveIsolationCardsProps {
  isCurvePaused: {
    clamm: boolean;
    binAmm: boolean;
    stableAmm: boolean;
  };
  onPauseCurve: (curveType: 0 | 1 | 2) => void;
  onRequestUnpause: (curveType: 0 | 1 | 2) => void;
  canTriggerPause: boolean;
  canManageTimelock: boolean;
  isSubmitting: boolean;
}

export const CurveIsolationCards: React.FC<CurveIsolationCardsProps> = ({
  isCurvePaused,
  onPauseCurve,
  onRequestUnpause,
  canTriggerPause,
  canManageTimelock,
  isSubmitting,
}) => {
  const curves = [
    {
      id: 0 as const,
      name: 'CLAMM Engine',
      type: 'Concentrated Liquidity',
      tag: 'Tick-Spaced Ranges',
      isPaused: isCurvePaused.clamm,
      poolCount: 14,
      volume24h: '$8.24M',
      riskTier: 'Low',
    },
    {
      id: 1 as const,
      name: 'BinAMM Engine',
      type: 'Discretized Bins',
      tag: 'Zero Slippage Bins',
      isPaused: isCurvePaused.binAmm,
      poolCount: 8,
      volume24h: '$4.12M',
      riskTier: 'Medium',
    },
    {
      id: 2 as const,
      name: 'StableAMM Engine',
      type: 'Invariable Peg Curve',
      tag: 'Amplified Invariant (A)',
      isPaused: isCurvePaused.stableAmm,
      poolCount: 5,
      volume24h: '$2.55M',
      riskTier: 'Low',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-secondary-theme" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary-theme">
            Tier 2: Curve Engine Isolation Matrix
          </h3>
        </div>
        <span className="text-[11px] font-mono text-secondary-theme">
          Solidity Mapping: <code className="text-primary-theme">isCurvePaused[uint8]</code>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {curves.map((curve) => (
          <div
            key={curve.id}
            className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
              curve.isPaused
                ? 'bg-red-500/5 border-red-500/20'
                : 'bg-surface-theme border-hairline-theme hover:border-hairline-focus'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-primary-theme font-mono">
                      {curve.name}
                    </span>
                    <Badge variant={curve.isPaused ? 'danger' : 'success'}>
                      {curve.isPaused ? 'ISOLATED' : 'ONLINE'}
                    </Badge>
                  </div>
                  <p className="text-xs text-secondary-theme">{curve.type}</p>
                </div>
                <div className="p-2 rounded-xl bg-elevated-theme border border-hairline-theme">
                  {curve.isPaused ? (
                    <Lock className="w-4 h-4 text-red-500" />
                  ) : (
                    <Unlock className="w-4 h-4 text-emerald-500" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-hairline-theme text-xs font-mono">
                <div>
                  <span className="text-secondary-theme block text-[10px]">ACTIVE POOLS</span>
                  <span className="text-primary-theme font-semibold">{curve.poolCount}</span>
                </div>
                <div>
                  <span className="text-secondary-theme block text-[10px]">24H VOLUME</span>
                  <span className="text-primary-theme font-semibold">{curve.volume24h}</span>
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
                  <span>Queue Timelocked Unpause</span>
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
