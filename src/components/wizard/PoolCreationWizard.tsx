import React, { useState } from 'react';
import { Button } from '../ui';
import {
  StepPairSelection,
  StepCurveSelection,
  StepFeeAndHooks,
  StepPriceAndSeed,
  StepSummaryAndDeploy,
} from './steps';
import {
  CurveType,
  KNOWN_TOKENS,
  sortCurrencies,
  type KnownToken,
  type PoolKeyStruct,
} from '../../utils/poolMath';
import {
  Coins,
  Layers,
  SlidersHorizontal,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
} from 'lucide-react';
import { isAddress } from 'viem';

export interface PoolCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onPoolCreated?: (poolKey: PoolKeyStruct) => void;
}

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export const PoolCreationWizard: React.FC<PoolCreationWizardProps> = ({
  isOpen,
  onClose,
  onPoolCreated,
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);

  // Step 1: Pair Tokens
  const [token0, setToken0] = useState<KnownToken | null>(KNOWN_TOKENS[1]); // WETH
  const [token1, setToken1] = useState<KnownToken | null>(KNOWN_TOKENS[2]); // USDC
  const [customToken0, setCustomToken0] = useState<string>(KNOWN_TOKENS[1].address);
  const [customToken1, setCustomToken1] = useState<string>(KNOWN_TOKENS[2].address);

  // Step 2: AMM Curve
  const [curveType, setCurveType] = useState<CurveType>(CurveType.CLAMM);
  const [tickSpacing, setTickSpacing] = useState(60);
  const [amplificationCoeff, setAmplificationCoeff] = useState(100);

  // Step 3: Fee & Hooks
  const [feeTier, setFeeTier] = useState(3000); // 0.30%
  const [customFeeInput, setCustomFeeInput] = useState('');
  const [pluginAddress, setPluginAddress] = useState<string>(
    '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' // Dynamic LVR Hook
  );
  const [customPluginAddress, setCustomPluginAddress] = useState('');

  // Step 4: Price & Seed
  const [priceInput, setPriceInput] = useState('3500.00');
  const [seedAmount0, setSeedAmount0] = useState('10.0');
  const [seedAmount1, setSeedAmount1] = useState('35000.0');
  const [useVaultClaims, setUseVaultClaims] = useState(false);

  // Step 5: Execution State
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploySuccess, setDeploySuccess] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Handle Token Swap
  const handleSwapTokens = () => {
    const tempTok = token0;
    const tempCust = customToken0;
    setToken0(token1);
    setCustomToken0(customToken1);
    setToken1(tempTok);
    setCustomToken1(tempCust);
  };

  // Form Computed PoolKey
  const canonicalOrder = React.useMemo(() => {
    const a0 = token0 ? token0.address : customToken0;
    const a1 = token1 ? token1.address : customToken1;
    return sortCurrencies(a0, a1);
  }, [token0, token1, customToken0, customToken1]);

  const activePoolKey: PoolKeyStruct = React.useMemo(() => {
    return {
      currency0: canonicalOrder.currency0,
      currency1: canonicalOrder.currency1,
      fee: feeTier,
      tickSpacing,
      plugin: (isAddress(pluginAddress)
        ? pluginAddress
        : '0x0000000000000000000000000000000000000000') as `0x${string}`,
      curveType,
    };
  }, [canonicalOrder, feeTier, tickSpacing, pluginAddress, curveType]);

  // Validation per step
  const isStep1Valid = React.useMemo(() => {
    const a0 = token0 ? token0.address : customToken0;
    const a1 = token1 ? token1.address : customToken1;
    return isAddress(a0) && isAddress(a1) && a0.toLowerCase() !== a1.toLowerCase();
  }, [token0, token1, customToken0, customToken1]);

  const isStep4Valid = React.useMemo(() => {
    const p = parseFloat(priceInput);
    return !isNaN(p) && p > 0;
  }, [priceInput]);

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep((prev) => (prev + 1) as WizardStep);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as WizardStep);
    }
  };

  const handleDeploy = () => {
    setIsDeploying(true);
    setTimeout(() => {
      setIsDeploying(false);
      setDeploySuccess(true);
      setTxHash('0x9a4f61e8b7d901c2384a51e60f7e1b5d92a104c8e71b2390f4e1982a17c603df');
      if (onPoolCreated) {
        onPoolCreated(activePoolKey);
      }
    }, 1800);
  };

  const stepsConfig = [
    { step: 1, label: 'Pair Selection', icon: Coins },
    { step: 2, label: 'Curve Engine', icon: Layers },
    { step: 3, label: 'Fee & Hooks', icon: SlidersHorizontal },
    { step: 4, label: 'Price & Seed', icon: TrendingUp },
    { step: 5, label: 'Deploy Pool', icon: CheckCircle2 },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-surface-theme border border-hairline-theme rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Wizard Top Header */}
        <div className="p-5 border-b border-hairline-theme flex items-center justify-between bg-surface-theme shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-accent-primary-theme text-accent-invert-theme flex items-center justify-center font-bold text-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-primary-theme">
                Multi-Curve Pool Initializer
              </h2>
              <span className="text-[11px] font-mono text-secondary-theme">
                SupaDex Command & Control
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-secondary-theme hover:text-primary-theme hover:bg-subtle-theme transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className="px-6 py-3 border-b border-hairline-theme bg-subtle-theme shrink-0">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {stepsConfig.map((s, idx) => {
              const Icon = s.icon;
              const isActive = currentStep === s.step;
              const isCompleted = currentStep > s.step;

              return (
                <div key={s.step} className="flex items-center gap-2">
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-accent-primary-theme text-accent-invert-theme shadow-sm'
                        : isCompleted
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'text-secondary-theme opacity-60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>

                  {idx < stepsConfig.length - 1 && (
                    <div className="w-4 h-px bg-hairline-theme mx-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Wizard Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {currentStep === 1 && (
            <StepPairSelection
              token0={token0}
              token1={token1}
              customToken0={customToken0}
              customToken1={customToken1}
              onSelectToken0={(tok, addr) => {
                setToken0(tok);
                if (addr !== undefined) setCustomToken0(addr);
              }}
              onSelectToken1={(tok, addr) => {
                setToken1(tok);
                if (addr !== undefined) setCustomToken1(addr);
              }}
              onSwapTokens={handleSwapTokens}
            />
          )}

          {currentStep === 2 && (
            <StepCurveSelection
              curveType={curveType}
              onSelectCurve={setCurveType}
              tickSpacing={tickSpacing}
              onChangeTickSpacing={setTickSpacing}
              amplificationCoeff={amplificationCoeff}
              onChangeAmplification={setAmplificationCoeff}
            />
          )}

          {currentStep === 3 && (
            <StepFeeAndHooks
              curveType={curveType}
              feeTier={feeTier}
              onSelectFeeTier={setFeeTier}
              customFeeInput={customFeeInput}
              onChangeCustomFee={setCustomFeeInput}
              pluginAddress={pluginAddress}
              onSelectPlugin={setPluginAddress}
              customPluginAddress={customPluginAddress}
              onChangeCustomPlugin={setCustomPluginAddress}
            />
          )}

          {currentStep === 4 && (
            <StepPriceAndSeed
              token0={token0}
              token1={token1}
              priceInput={priceInput}
              onChangePriceInput={setPriceInput}
              seedAmount0={seedAmount0}
              onChangeSeedAmount0={setSeedAmount0}
              seedAmount1={seedAmount1}
              onChangeSeedAmount1={setSeedAmount1}
              useVaultClaims={useVaultClaims}
              onToggleVaultClaims={setUseVaultClaims}
            />
          )}

          {currentStep === 5 && (
            <StepSummaryAndDeploy
              poolKey={activePoolKey}
              token0={token0}
              token1={token1}
              price={parseFloat(priceInput) || 0}
              seedAmount0={seedAmount0}
              seedAmount1={seedAmount1}
              useVaultClaims={useVaultClaims}
              onDeploy={handleDeploy}
              isDeploying={isDeploying}
              deploySuccess={deploySuccess}
              txHash={txHash}
            />
          )}
        </div>

        {/* Wizard Bottom Navigation Footer */}
        <div className="p-4 border-t border-hairline-theme bg-surface-theme flex items-center justify-between shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            disabled={currentStep === 1 || isDeploying}
            className="text-xs gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-secondary-theme hidden sm:inline">
              Step {currentStep} of 5
            </span>

            {currentStep < 5 ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleNext}
                disabled={
                  (currentStep === 1 && !isStep1Valid) ||
                  (currentStep === 4 && !isStep4Valid)
                }
                className="text-xs gap-1.5"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs"
              >
                Close Wizard
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

