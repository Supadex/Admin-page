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

function pipsToBps(pips: number): number {
  return pips / 100;
}

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
    validationError,
    rolesConfigured,
    isOperator,
    oracleAddress,
  } = useLVRCalibration();

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  if (!activePool || !draftConfig) {
    return (
      <div className="p-8 rounded-2xl bg-surface-theme border border-hairline-theme text-center space-y-2">
        <div className="inline-flex p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <SlidersHorizontal className="w-5 h-5 text-emerald-500" />
        </div>
        <h2 className="text-sm font-bold text-primary-theme">No LVR-shielded pools</h2>
        <p className="text-xs text-secondary-theme max-w-md mx-auto">
          Initialize a pool with the LVR Shield plugin attached, then return here to calibrate
          decay, volatility alpha, and fee bounds (pip-scale).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-surface-theme border border-hairline-theme flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <SlidersHorizontal className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-primary-theme">
                  Dynamic LVR & Volatility Oracle Calibration Console
                </h2>
                <Badge variant="success" size="sm">
                  LVR Only
                </Badge>
                {!rolesConfigured && (
                  <Badge variant="danger" size="sm">
                    roles unset
                  </Badge>
                )}
                {rolesConfigured && !isOperator && (
                  <Badge variant="warning" size="sm">
                    not Operator
                  </Badge>
                )}
              </div>
              <p className="text-xs text-secondary-theme">
                On-chain poolLVRStates · pip fee units · Operator-gated setters · oracle via
                lvr.oracle()
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-xs font-mono text-secondary-theme">Target Pool:</div>
          <Select
            value={selectedPoolId}
            onChange={(val) => handleSelectPool(val)}
            options={pools.map((p) => ({
              value: p.poolId,
              label: `${p.pair} (${p.curveType} - ${p.baseFeePips} pips)`,
            }))}
            className="w-64 text-xs font-mono"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Current Dynamic Fee"
          value={`${pipsToBps(activePool.lastFeePips).toFixed(1)} bps`}
          subValue={`Base: ${activePool.baseFeePips} pips`}
          change={{
            value: `${pipsToBps(activePool.lastFeePips - activePool.baseFeePips).toFixed(1)} bps`,
            positive: false,
            neutral: true,
            period: 'excess decay active',
          }}
          icon={<Percent className="w-4 h-4 text-emerald-500" />}
          badgeText="Live"
          badgeVariant="success"
        />

        <StatCard
          label="Instantaneous Volatility (σ)"
          value={`${activePool.instantaneousVolatility} ticks`}
          subValue="oracle window"
          icon={<TrendingUp className="w-4 h-4 text-blue-500" />}
          badgeText="On-chain"
          badgeVariant="info"
        />

        <StatCard
          label="Decay Half-Life (τ)"
          value={`${draftConfig.decayHalfLifeSeconds}s`}
          subValue={
            draftConfig.decayHalfLifeSeconds !== activePool.decayHalfLifeSeconds
              ? `was ${activePool.decayHalfLifeSeconds}s`
              : 'synced'
          }
          icon={<Activity className="w-4 h-4 text-purple-500" />}
          badgeText={
            draftConfig.decayHalfLifeSeconds !== activePool.decayHalfLifeSeconds
              ? 'Modified'
              : 'Synced'
          }
          badgeVariant={
            draftConfig.decayHalfLifeSeconds !== activePool.decayHalfLifeSeconds
              ? 'warning'
              : 'default'
          }
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

      <LVRVolatilityChart
        decayPoints={decayCurvePoints}
        shockPoints={volatilityShockPoints}
        hasDiffs={hasDiffs}
        baseFeeBps={pipsToBps(draftConfig.baseFeePips)}
      />

      <ParameterCalibrationSliders
        draft={draftConfig}
        current={activePool}
        onUpdate={updateDraft}
        onReset={resetDraft}
        onApplyPreset={applyPreset}
        onOpenPreview={() => setIsPreviewOpen(true)}
        canCalibrate={canCalibrate}
        hasDiffs={hasDiffs}
        validationError={validationError}
      />

      <OracleObservationRingBuffer
        observations={observations}
        cardinality={activePool.cardinality}
        cardinalityNext={activePool.cardinalityNext}
        instantaneousVolatility={activePool.instantaneousVolatility}
        lastTick={activePool.lastTick}
        oracleAddress={oracleAddress}
      />

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
