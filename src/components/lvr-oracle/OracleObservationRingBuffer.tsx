import React from 'react';
import { Card, Badge } from '../ui';
import { type OracleObservation } from '../../hooks/useLVRCalibration';
import { Database, Clock } from 'lucide-react';

interface OracleObservationRingBufferProps {
  observations: OracleObservation[];
  cardinality: number;
  cardinalityNext: number;
  instantaneousVolatility: number;
  lastTick: number;
  oracleAddress?: string | null;
}

export const OracleObservationRingBuffer: React.FC<OracleObservationRingBufferProps> = ({
  observations,
  cardinality,
  cardinalityNext,
  instantaneousVolatility,
  lastTick,
  oracleAddress,
}) => {
  return (
    <Card className="p-5 border border-hairline-theme bg-surface-theme space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-hairline-theme">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-bold text-primary-theme">
              Volatility TWAP Oracle Ring Buffer
            </h3>
            <Badge variant="info" size="sm">
              Circular Buffer (Max {cardinality || cardinalityNext || 64})
            </Badge>
          </div>
          <p className="text-xs text-secondary-theme">
            Derived via LVRShieldPlugin.oracle(). Init grows to 64; admin cannot call grow
            (onlyWriter = LVR).
          </p>
          {oracleAddress && (
            <p className="text-[11px] font-mono text-secondary-theme truncate">{oracleAddress}</p>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs font-mono shrink-0">
          <div className="p-2 rounded-xl bg-subtle-theme border border-hairline-theme">
            <span className="text-secondary-theme">Latest Tick: </span>
            <strong className="text-primary-theme">{lastTick}</strong>
          </div>
          <div className="p-2 rounded-xl bg-subtle-theme border border-hairline-theme">
            <span className="text-secondary-theme">σ Volatility: </span>
            <strong className="text-emerald-500">{instantaneousVolatility} ticks</strong>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-secondary-theme">
          <span>Recent Slot Observations ({observations.length} active)</span>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>cardinalityNext={cardinalityNext}</span>
          </div>
        </div>

        {observations.length === 0 ? (
          <p className="text-xs text-secondary-theme py-4 text-center">
            No observations yet — swaps on this LVR pool will populate the ring buffer.
          </p>
        ) : (
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
                  <div className="text-[9px] text-secondary-theme truncate">{obs.blockTimestamp}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
};
