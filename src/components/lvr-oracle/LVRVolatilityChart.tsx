import React, { useState } from 'react';
import { Card, Badge } from '../ui';
import { Activity, TrendingUp, RotateCcw } from 'lucide-react';

interface LVRVolatilityChartProps {
  decayPoints: { timeSec: number; currentFeeBps: number; draftFeeBps: number }[];
  shockPoints: { tickDelta: number; currentFeeBps: number; draftFeeBps: number }[];
  hasDiffs: boolean;
  baseFeeBps: number;
}

export const LVRVolatilityChart: React.FC<LVRVolatilityChartProps> = ({
  decayPoints,
  shockPoints,
  hasDiffs,
  baseFeeBps,
}) => {
  const [viewMode, setViewMode] = useState<'decay' | 'shock'>('decay');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const activePoints = viewMode === 'decay' ? decayPoints : shockPoints;
  const maxFee = Math.max(
    ...activePoints.map((p) => Math.max(p.currentFeeBps, p.draftFeeBps)),
    baseFeeBps * 1.5,
    10
  );

  // SVG dimensions & coordinate mapping
  const width = 600;
  const height = 240;
  const padding = { top: 24, right: 30, bottom: 36, left: 54 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const getX = (index: number) => padding.left + (index / (activePoints.length - 1)) * graphWidth;
  const getY = (val: number) => padding.top + graphHeight - (val / maxFee) * graphHeight;

  // Path generators
  const currentPath = activePoints
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(p.currentFeeBps)}`)
    .join(' ');

  const draftPath = activePoints
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(p.draftFeeBps)}`)
    .join(' ');

  // Area under curve for draft
  const draftAreaPath = `${draftPath} L ${getX(activePoints.length - 1)} ${getY(
    0
  )} L ${getX(0)} ${getY(0)} Z`;

  const hoveredPoint = hoverIndex !== null ? activePoints[hoverIndex] : null;

  return (
    <Card className="p-5 border border-hairline-theme bg-surface-theme">
      {/* Header with Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-hairline-theme">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-primary-theme">
              Dynamic Curve & Volatility Simulation
            </h3>
            {hasDiffs && (
              <Badge variant="warning" size="sm">
                Draft Simulation Active
              </Badge>
            )}
          </div>
          <p className="text-xs text-secondary-theme">
            Real-time projection of dynamic spread decay and tick volatility surcharge.
          </p>
        </div>

        {/* View Mode Pill Switcher */}
        <div className="flex items-center p-0.5 rounded-lg bg-subtle-theme border border-hairline-theme shrink-0">
          <button
            onClick={() => {
              setViewMode('decay');
              setHoverIndex(null);
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              viewMode === 'decay'
                ? 'bg-accent-primary-theme text-accent-invert-theme font-semibold shadow-xs'
                : 'text-secondary-theme hover:text-primary-theme'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <RotateCcw className="w-3 h-3" />
              <span>Time Decay (Δt)</span>
            </div>
          </button>
          <button
            onClick={() => {
              setViewMode('shock');
              setHoverIndex(null);
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              viewMode === 'shock'
                ? 'bg-accent-primary-theme text-accent-invert-theme font-semibold shadow-xs'
                : 'text-secondary-theme hover:text-primary-theme'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3" />
              <span>Volatility Shock (ΔTick)</span>
            </div>
          </button>
        </div>
      </div>

      {/* SVG Canvas Chart */}
      <div className="relative pt-4 overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="draftAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34D399" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#34D399" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines (Y-axis) */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding.top + graphHeight * (1 - ratio);
            const val = (maxFee * ratio).toFixed(1);
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="currentColor"
                  className="text-hairline-theme"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[10px] font-mono fill-secondary-theme"
                >
                  {val} bps
                </text>
              </g>
            );
          })}

          {/* Base Fee Baseline */}
          <line
            x1={padding.left}
            y1={getY(baseFeeBps)}
            x2={width - padding.right}
            y2={getY(baseFeeBps)}
            stroke="#94A3B8"
            strokeDasharray="4 4"
            strokeWidth="1.2"
            opacity="0.6"
          />
          <text
            x={width - padding.right}
            y={getY(baseFeeBps) - 4}
            textAnchor="end"
            className="text-[9px] font-mono fill-secondary-theme"
          >
            Base: {baseFeeBps} bps
          </text>

          {/* Area under Draft */}
          {hasDiffs && <path d={draftAreaPath} fill="url(#draftAreaGradient)" />}

          {/* Current On-chain Path */}
          <path
            d={currentPath}
            fill="none"
            stroke="#64748B"
            strokeWidth="2"
            strokeDasharray={hasDiffs ? '4 4' : undefined}
            opacity={hasDiffs ? 0.7 : 1}
          />

          {/* Draft Calibrated Path */}
          {hasDiffs && (
            <path
              d={draftPath}
              fill="none"
              stroke="#34D399"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}

          {/* Interactive Hover Crosshair */}
          {hoverIndex !== null && hoveredPoint && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={padding.top}
                x2={getX(hoverIndex)}
                y2={padding.top + graphHeight}
                stroke="#34D399"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              {/* Point dots */}
              <circle
                cx={getX(hoverIndex)}
                cy={getY(hoveredPoint.currentFeeBps)}
                r="4"
                fill="#64748B"
              />
              {hasDiffs && (
                <circle
                  cx={getX(hoverIndex)}
                  cy={getY(hoveredPoint.draftFeeBps)}
                  r="4.5"
                  fill="#34D399"
                />
              )}
            </g>
          )}

          {/* X Axis Labels */}
          {activePoints.map((p, idx) => {
            if (idx % 3 !== 0 && idx !== activePoints.length - 1) return null;
            const label =
              viewMode === 'decay'
                ? `${'timeSec' in p ? p.timeSec : 0}s`
                : `+${'tickDelta' in p ? p.tickDelta : 0}t`;
            return (
              <text
                key={idx}
                x={getX(idx)}
                y={height - 10}
                textAnchor="middle"
                className="text-[10px] font-mono fill-secondary-theme"
              >
                {label}
              </text>
            );
          })}

          {/* Hover Capture Transparent Rectangles */}
          {activePoints.map((_, idx) => (
            <rect
              key={idx}
              x={getX(idx) - graphWidth / activePoints.length / 2}
              y={padding.top}
              width={graphWidth / activePoints.length}
              height={graphHeight}
              fill="transparent"
              className="cursor-crosshair"
              onMouseEnter={() => setHoverIndex(idx)}
            />
          ))}
        </svg>

        {/* Floating Tooltip readout */}
        {hoveredPoint && (
          <div className="absolute top-2 right-4 p-2.5 rounded-xl bg-elevated-theme/90 backdrop-blur-md border border-hairline-theme shadow-md text-xs space-y-1 font-mono">
            <div className="text-secondary-theme">
              {viewMode === 'decay'
                ? `Time Elapsed: ${'timeSec' in hoveredPoint ? hoveredPoint.timeSec : 0}s`
                : `Price Delta: ${'tickDelta' in hoveredPoint ? hoveredPoint.tickDelta : 0} ticks`}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-secondary-theme">
                Current:{' '}
                <strong className="text-primary-theme">{hoveredPoint.currentFeeBps} bps</strong>
              </span>
              {hasDiffs && (
                <span className="text-emerald-500 font-bold">
                  Draft: {hoveredPoint.draftFeeBps} bps
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-hairline-theme text-xs font-mono text-secondary-theme">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-slate-500 rounded" />
            <span>On-Chain Parameters</span>
          </div>
          {hasDiffs && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-emerald-500 rounded" />
              <span className="text-emerald-500 font-semibold">Simulated Calibration</span>
            </div>
          )}
        </div>
        <span>Formula: Fee(t) = f_0 + Δf · 2^(-Δt / τ)</span>
      </div>
    </Card>
  );
};
