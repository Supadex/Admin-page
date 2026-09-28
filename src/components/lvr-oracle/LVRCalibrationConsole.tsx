import React, { useState } from 'react';
import { Badge, Select } from '../ui';
import { StatCard } from '../data';
import { useLVRCalibration } from '../../hooks/useLVRCalibration';
import { LVRVolatilityChart } from './LVRVolatilityChart';
import { ParameterCalibrationSliders } from './ParameterCalibrationSliders';
import { OracleObservationRingBuffer } from './OracleObservationRingBuffer';
import { SimulationTxPreviewModal } from './SimulationTxPreviewModal';
import {
  SlidersHorizontal,
  Activity,
  TrendingUp,
  Layers,
  Percent,
} from 'lucide-react';

export const LVRCalibrationConsole: React.FC = () => {
  const {
    pools,
    activePool,
    draftConfig,
    selectedPoolId,
    handleSelectPool,
    updateDraft,
    resetDraft,
    hasDiffs,
    decayCurvePoints,
    volatilityShockPoints,
    observations,
    applyCalibration,
    applyPreset,
    canCalibrate,
  } = useLVRCalibration();

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Console Top Master HUD */}
      <div className="p-6 rounded-2xl bg-surface-theme border border-hairline-theme flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <SlidersHorizontal className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-primary-theme">
                  Dynamic LVR & Volatility Oracle Calibration Console
                </h2>
                <Badge variant="success" size="sm">
                  Active Shield
                </Badge>
              </div>
              <p className="text-xs text-secondary-theme">
                Simulate and adjust volatility-adaptive dynamic fee curves to neutralize Loss-Versus-Rebalancing (LVR).
              </p>
            </div>
          </div>
        </div>

        {/* Pool Switcher Dropdown */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-xs font-mono text-secondary-theme">Target Pool:</div>
          <Select
            value={selectedPoolId}
            onChange={(val) => handleSelectPool(val)}
            options={pools.map((p) => ({
              value: p.poolId,
              label: `${p.pair} (${p.curveType} - ${p.baseFeeBps} bps)`,
            }))}
            className="w-64 text-xs font-mono"
          />
        </div>
      </div>

      {/* Top High-Density Metric Readouts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Current Dynamic Fee"
          value={`${activePool.lastFeeBps.toFixed(1)} bps`}
          subValue={`Base: ${activePool.baseFeeBps} bps`}
          change={{
            value: `${(activePool.lastFeeBps - activePool.baseFeeBps).toFixed(1)} bps`,
            positive: false,
            neutral: true,
            period: 'excess decay active',
          }}
          icon={<Percent className="w-4 h-4 text-emerald-500" />}
          badgeText="Live"
          badgeVariant="success"
        />

        <StatCard
          label="Instantaneous Volatility ($\sigma$)"
          value={`${activePool.instantaneousVolatility} ticks`}
          subValue="12-sec window"
          change={{ value: '4.2 ticks', positive: true, period: 'last 10 blocks' }}
          icon={<TrendingUp className="w-4 h-4 text-blue-500" />}
          badgeText="Normal"
          badgeVariant="info"
        />

        <StatCard
          label="Decay Half-Life ($\tau$)"
          value={`${draftConfig.decayHalfLifeSeconds}s`}
          subValue={draftConfig.decayHalfLifeSeconds !== activePool.decayHalfLifeSeconds ? `was ${activePool.decayHalfLifeSeconds}s` : '1 block equivalent'}
          icon={<Activity className="w-4 h-4 text-purple-500" />}
          badgeText={draftConfig.decayHalfLifeSeconds !== activePool.decayHalfLifeSeconds ? 'Modified' : 'Synced'}
          badgeVariant={draftConfig.decayHalfLifeSeconds !== activePool.decayHalfLifeSeconds ? 'warning' : 'default'}
        />

        <StatCard
          label="TWAP Buffer Cardinality"
          value={`${activePool.cardinality} slots`}
          subValue={`Next: ${activePool.cardinalityNext}`}
          icon={<Layers className="w-4 h-4 text-amber-500" />}
          badgeText="Ring Buffer"
          badgeVariant="default"
        />
      </div>

      {/* Interactive Simulation Visualizer */}
      <LVRVolatilityChart
        decayPoints={decayCurvePoints}
        shockPoints={volatilityShockPoints}
        hasDiffs={hasDiffs}
        baseFeeBps={draftConfig.baseFeeBps}
      />

      {/* Calibration Sliders & Controls */}
      <ParameterCalibrationSliders
        draft={draftConfig}
        current={activePool}
        onUpdate={updateDraft}
        onReset={resetDraft}
        onApplyPreset={applyPreset}
        onOpenPreview={() => setIsPreviewOpen(true)}
        canCalibrate={canCalibrate}
        hasDiffs={hasDiffs}
      />

      {/* Observation Ring Buffer Inspector */}
      <OracleObservationRingBuffer
        observations={observations}
        cardinality={activePool.cardinality}
        cardinalityNext={activePool.cardinalityNext}
        instantaneousVolatility={activePool.instantaneousVolatility}
        lastTick={activePool.lastTick}
        onGrowCardinality={(newCard) => updateDraft({ cardinalityNext: newCard })}
        canCalibrate={canCalibrate}
      />

      {/* Simulation & Transaction Confirmation Modal */}
      <SimulationTxPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        draft={draftConfig}
        current={activePool}
        onConfirm={applyCalibration}
      />
    </div>
  );
};
