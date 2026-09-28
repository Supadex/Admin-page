import React, { useState } from 'react';
import { Card, Badge, Button, Input } from '../ui';
import { type OracleObservation } from '../../hooks/useLVRCalibration';
import { Database, Plus, RefreshCw, Clock } from 'lucide-react';

interface OracleObservationRingBufferProps {
  observations: OracleObservation[];
  cardinality: number;
  cardinalityNext: number;
  instantaneousVolatility: number;
  lastTick: number;
  onGrowCardinality: (newCardinality: number) => void;
  canCalibrate: boolean;
}

export const OracleObservationRingBuffer: React.FC<OracleObservationRingBufferProps> = ({
  observations,
  cardinality,
  cardinalityNext,
  instantaneousVolatility,
  lastTick,
  onGrowCardinality,
  canCalibrate,
}) => {
  const [newCardinalityInput, setNewCardinalityInput] = useState<number>(cardinalityNext + 32);
  const [isGrowing, setIsGrowing] = useState(false);

  const handleGrow = () => {
    if (newCardinalityInput <= cardinalityNext) return;
    setIsGrowing(true);
    setTimeout(() => {
      onGrowCardinality(newCardinalityInput);
      setIsGrowing(false);
    }, 600);
  };

  return (
    <Card className="p-5 border border-hairline-theme bg-surface-theme space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-hairline-theme">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-bold text-primary-theme">
              Volatility TWAP Oracle Ring Buffer
            </h3>
            <Badge variant="info" size="sm">
              Circular Buffer (Max {cardinality})
            </Badge>
          </div>
          <p className="text-xs text-secondary-theme">
            On-chain historic tick cumulative observations for TWAP & instantaneous volatility queries.
          </p>
        </div>

        {/* Telemetry Readout */}
        <div className="flex items-center gap-3 text-xs font-mono shrink-0">
          <div className="p-2 rounded-xl bg-subtle-theme border border-hairline-theme">
            <span className="text-secondary-theme">Latest Tick: </span>
            <strong className="text-primary-theme">{lastTick}</strong>
          </div>
          <div className="p-2 rounded-xl bg-subtle-theme border border-hairline-theme">
            <span className="text-secondary-theme">$\sigma$ Volatility: </span>
            <strong className="text-emerald-500">{instantaneousVolatility} ticks</strong>
          </div>
        </div>
      </div>

      {/* Observation Slots Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-secondary-theme">
          <span>Recent Slot Observations ({observations.length} active)</span>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>12s Interval</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
          {observations.map((obs) => {
            const isLatest = obs.index === 0;
            return (
              <div
                key={obs.index}
                className={`p-2 rounded-lg border text-center font-mono transition-all ${
                  isLatest
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-xs'
                    : 'bg-subtle-theme border-hairline-theme text-secondary-theme hover:text-primary-theme'
                }`}
              >
                <div className="text-[10px] uppercase tracking-wider">Slot #{obs.index}</div>
                <div className="text-xs font-bold my-0.5 truncate text-primary-theme">
                  {obs.timeAgoFormatted}
                </div>
                <div className="text-[9px] text-secondary-theme truncate">
                  {obs.blockTimestamp}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Buffer Expansion / Cardinality Growth Control */}
      <div className="p-4 rounded-xl bg-subtle-theme border border-hairline-theme flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <span className="text-xs font-semibold text-primary-theme">
            Buffer Cardinality Expansion (`grow`)
          </span>
          <p className="text-[11px] text-secondary-theme">
            Expand circular memory slots to support extended TWAP observation windows (e.g. 1h / 24h).
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Input
            type="number"
            value={newCardinalityInput}
            onChange={(e) => setNewCardinalityInput(Number(e.target.value))}
            min={cardinalityNext + 1}
            max={512}
            step={16}
            className="w-24 text-xs font-mono h-8"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleGrow}
            disabled={!canCalibrate || newCardinalityInput <= cardinalityNext || isGrowing}
            className="text-xs gap-1.5 h-8 font-mono"
          >
            {isGrowing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            <span>Grow to {newCardinalityInput}</span>
          </Button>
        </div>
      </div>
    </Card>
  );
};
