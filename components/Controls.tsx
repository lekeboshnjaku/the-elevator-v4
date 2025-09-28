import React, { useState, useEffect } from 'react';
import { GameStatus, AutoBetSettings, AutoBetAction } from '../types';
import { HOUSE_EDGE } from '../constants';
import { sfxService } from '../src/services/sfxService';

interface ControlsProps {
  betAmount: string;
  setBetAmount: (value: string) => void;
  targetMultiplier: string;
  setTargetMultiplier: (value: string) => void;
  placeBet: () => void;
  balance: number;
  canBet: boolean;
  gameStatus: GameStatus;
  isAutoBetting: boolean;
  startAutoBet: (settings: AutoBetSettings) => void;
  stopAutoBet: () => void;
  betsRemaining: number;
  openRules: () => void;
  openMath: () => void;
  toggleFairness: () => void;
  maxBet: number;
  isInstantBet: boolean;
  toggleInstantBet: () => void;
  isBetAmountInvalid: boolean;
  /* --- NEW Bonus-Buy props --- */
  isBonusBuy: boolean;
  toggleBonusBuy: () => void;
  /** Effective bet after +20 % markup, already rounded in hook */
  effectiveBetAmount: number;
  t: (key: string, ...args: any[]) => string;
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`inline-flex py-2.5 text-sm font-bold uppercase tracking-wider transition-all relative px-3 text-center min-h-[44px] min-w-[100px] touch-manipulation`}
        style={{
            color: active ? 'var(--accent)' : 'var(--neutral)',
        }}
    >
        {children}
        {active && (
            <div
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{
                    background: 'var(--accent)',
                    boxShadow: '0 0 8px var(--accent)',
                }}
            ></div>
        )}
    </button>
);

const IconButton: React.FC<{ onClick: () => void; title: string; children: React.ReactNode; }> = ({ onClick, title, children }) => (
    <button onClick={onClick} className="group flex items-center gap-1.5" title={title}>
        {children}
    </button>
);


/* ------------------------------------------------------------------ */
/*                       Quick Bet Button Panel                       */
/* ------------------------------------------------------------------ */
const QuickButtonPanel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="relative bg-[#0b0f1c] rounded-xl p-2 border border-cyan-400/50 shadow-[0_0_18px_rgba(0,246,255,0.35)] aspect-square flex items-stretch">
        {children}
    </div>
);
const ManualBetPanel: React.FC<
    Pick<
        ControlsProps,
        | 'betAmount'
        | 'setBetAmount'
        | 'targetMultiplier'
        | 'setTargetMultiplier'
        | 'balance'
        | 'isAutoBetting'
        | 'maxBet'
        | 'isBetAmountInvalid'
        | 't'
        | 'isBonusBuy'
        | 'toggleBonusBuy'
        | 'effectiveBetAmount'
    >
> = (props) => {
    const handleBetAmountAction = (action: 'min' | 'max' | '/2' | 'x2') => {
        const currentBet = parseFloat(props.betAmount) || 0;
        let newBet: number;
        switch (action) {
            case 'min': newBet = 0.01; break;
            case 'max': newBet = props.maxBet; break; // Use RGS maxBet
            case '/2': newBet = currentBet / 2; break;
            case 'x2': newBet = currentBet * 2; break;
        }
        const clampedBet = Math.max(0.01, Math.min(props.balance, newBet));
        props.setBetAmount(clampedBet.toFixed(2));
    };

    const target = parseFloat(props.targetMultiplier) || 0;
    const winChance = (target >= 1.01) ? ((1 - HOUSE_EDGE) / target) * 100 : 0;

    // Calculate display value for bet input
    const displayBetValue = props.isBonusBuy 
        ? props.effectiveBetAmount.toFixed(2) 
        : props.betAmount;

    // Handle bet amount change with adjustment for Elevate Mode
    const handleBetAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const enteredValue = e.target.value;
        if (props.isBonusBuy) {
            // Convert back to base bet when Elevate Mode is ON
            const enteredNumber = parseFloat(enteredValue) || 0;
            const baseBet = enteredNumber / 1.2;
            props.setBetAmount(baseBet.toFixed(2));
        } else {
            props.setBetAmount(enteredValue);
        }
    };

    // Handle Elevate Mode toggle with SFX
    const handleElevateToggle = () => {
        if (!props.isBonusBuy) {
            sfxService.playActivate();
        } else {
            sfxService.playDeactivate();
        }
        props.toggleBonusBuy();
    };

    return (
        <div className="space-y-3">
            <InputField 
                label={props.t('betAmount')} 
                value={displayBetValue} 
                onChange={handleBetAmountChange} 
                disabled={props.isAutoBetting} 
                isInvalid={props.isBetAmountInvalid} 
            />
            {/* Quick-bet buttons: 2-col on very small screens, 4-col from sm up */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <QuickButtonPanel>
                    <BetControlButton onClick={() => handleBetAmountAction('min')} disabled={props.isAutoBetting}>Min</BetControlButton>
                </QuickButtonPanel>
                <QuickButtonPanel>
                    <BetControlButton onClick={() => handleBetAmountAction('max')} disabled={props.isAutoBetting}>Max</BetControlButton>
                </QuickButtonPanel>
                <QuickButtonPanel>
                    <BetControlButton onClick={() => handleBetAmountAction('/2')} disabled={props.isAutoBetting}>/2</BetControlButton>
                </QuickButtonPanel>
                <QuickButtonPanel>
                    <BetControlButton onClick={() => handleBetAmountAction('x2')} disabled={props.isAutoBetting}>x2</BetControlButton>
                </QuickButtonPanel>
            </div>
             <div className="grid grid-cols-2 gap-3">
                {/* Left column: Target input */}
                <div className="flex flex-col gap-2">
                    <InputField
                        label={props.t('targetMultiplier')}
                        value={props.targetMultiplier}
                        onChange={(e) => props.setTargetMultiplier(e.target.value)}
                        disabled={props.isAutoBetting}
                    />
                </div>
                <div className="relative">
                    <span className="absolute left-3 top-1 text-xs text-slate-400 uppercase tracking-wider">{props.t('winChance')}</span>
                    <div className="w-full bg-slate-950/50 rounded-md pt-5 pb-2 sm:pt-7 sm:pb-3 px-3 text-white font-mono text-sm sm:text-lg transition-all duration-300 border control-field flex items-center">
                        <span className="text-green-400 text-glow-green font-bold">{winChance.toFixed(4)}%</span>
                    </div>
                </div>
             </div>
             
             <button
              type="button"
              onClick={handleElevateToggle}
              className={`elevate-hero-btn w-full py-3 sm:py-4 text-base sm:text-lg font-bold uppercase tracking-wider ${
                props.isBonusBuy ? 'elevate-hero-btn--active animate-cyan-pulse-soft' : ''
              }`}
            >
              Elevate Mode
            </button>
        </div>
    );
};

const AutoBetPanel: React.FC<{ 
    settings: Omit<AutoBetSettings, 'baseBet'>, 
    setSettings: React.Dispatch<React.SetStateAction<Omit<AutoBetSettings, 'baseBet'>>>, 
    isAutoBetting: boolean,
    lastAutoBaseBet: number | null
}> = ({ settings, setSettings, isAutoBetting, lastAutoBaseBet }) => {
    const handleValueChange = (field: keyof typeof settings, value: string | number | null | AutoBetAction) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
                <InputField
                    label="Number of Bets"
                    value={String(settings.numberOfBets)}
                    onChange={(e) => handleValueChange('numberOfBets', parseInt(e.target.value) || 0)}
                    disabled={isAutoBetting}
                />
                <InputField
                    label="Base Bet"
                    value={isAutoBetting && lastAutoBaseBet !== null ? lastAutoBaseBet.toFixed(2) : '0.00'}
                    disabled={true}
                />
            </div>
            <div className="grid grid-cols-1 gap-3">
                <AutoBetConditionControl
                    label="Increase on Win"
                    action={settings.onWinAction}
                    value={settings.onWinValue}
                    onActionChange={(val) => handleValueChange('onWinAction', val)}
                    onValueChange={(val) => handleValueChange('onWinValue', Math.max(0, parseFloat(val) || 0))}
                    disabled={isAutoBetting}
                />
                <AutoBetConditionControl
                    label="Increase on Loss"
                    action={settings.onLossAction}
                    value={settings.onLossValue}
                    onActionChange={(val) => handleValueChange('onLossAction', val)}
                    onValueChange={(val) => handleValueChange('onLossValue', Math.max(0, parseFloat(val) || 0))}
                    disabled={isAutoBetting}
                />
            </div>
            <div className="grid grid-cols-1 gap-3">
                <InputField
                    label="Stop on Profit"
                    placeholder="0.00"
                    value={settings.stopOnProfit === null ? '' : String(settings.stopOnProfit)}
                    onChange={(e) => handleValueChange('stopOnProfit', e.target.value ? parseFloat(e.target.value) : null)}
                    disabled={isAutoBetting}
                />
                <InputField
                    label="Stop on Loss"
                    placeholder="0.00"
                    value={settings.stopOnLoss === null ? '' : String(settings.stopOnLoss)}
                    onChange={(e) => handleValueChange('stopOnLoss', e.target.value ? parseFloat(e.target.value) : null)}
                    disabled={isAutoBetting}
                />
            </div>
        </div>
    );
}

const AutoBetConditionControl: React.FC<{
    label: string;
    action: AutoBetAction;
    value: number;
    onActionChange: (action: AutoBetAction) => void;
    onValueChange: (value: string) => void;
    disabled: boolean;
}> = (props) => (
    <div
        className="relative bg-slate-950/50 rounded-md pt-5 pb-2 sm:pt-7 sm:pb-3 px-3 text-white font-mono text-sm transition-all border control-field min-h-[44px] border-slate-700 shadow-inner"
    >
        {/* Top label to match InputField style */}
        <span className="absolute left-3 top-1 text-xs text-slate-400 uppercase tracking-wider">
            {props.label}
        </span>

        {/* Row: select + (optional) input + % */}
        <div className="flex items-center justify-start gap-2 sm:gap-3">
            <select
                value={props.action}
                onChange={(e) => props.onActionChange(e.target.value as AutoBetAction)}
                className="bg-transparent text-white font-mono text-sm focus:outline-none py-1 pr-6 pl-1 appearance-none"
                disabled={props.disabled}
            >
                <option value={AutoBetAction.RESET}>Reset</option>
                <option value={AutoBetAction.INCREASE_BY}>Increase</option>
            </select>

            {props.action === AutoBetAction.INCREASE_BY && (
                <>
                <input
                    type="number"
                    value={props.value}
                    onChange={(e) => props.onValueChange(e.target.value)}
                    className="w-20 sm:w-24 shrink-0 px-2 bg-transparent text-white font-mono text-sm text-right focus:outline-none overflow-hidden"
                    disabled={props.disabled}
                />
                    <span className="text-slate-400 text-sm shrink-0 pl-0.5">%</span>
                </>
            )}
        </div>
    </div>
);


const InputField: React.FC<{ 
    label: string; 
    value: string; 
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; 
    disabled?: boolean; 
    type?: string; 
    placeholder?: string; 
    isInvalid?: boolean;
    inputClassName?: string;
    step?: string;
    inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
    pattern?: string;
}> = ({ label, value, onChange, disabled, type = "number", placeholder, isInvalid, inputClassName, step, inputMode, pattern }) => (
    <div className="relative">
        <span className="absolute left-3 top-1 text-xs text-slate-400 uppercase tracking-wider">{label}</span>
            <input
                type={type}
                step={step || (type === 'number' ? '0.01' : undefined)}
                value={value}
                onChange={onChange}
                disabled={disabled}
                placeholder={placeholder}
                inputMode={inputMode}
                pattern={pattern}
                className={`w-full bg-slate-950/50 rounded-md pt-5 pb-2 sm:pt-7 sm:pb-3 px-3 text-white font-mono text-sm sm:text-lg focus:outline-none transition-all border control-field disabled:opacity-50 min-h-[44px] ${isInvalid ? 'ring-2 ring-red-500/70 focus:ring-red-500' : 'focus:ring-2 focus:ring-sky-500 focus:shadow-[0_0_15px_rgba(56,189,248,0.5),_inset_0_0_8px_rgba(56,189,248,0.4)]'} ${inputClassName ?? ''}`}
            />
    </div>
);

const BetControlButton: React.FC<{ onClick: () => void; children: React.ReactNode; disabled?: boolean; }> = ({ onClick, children, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className="w-full h-full min-h-[44px] min-w-[100px] rounded-xl bg-[#0b0f1c] border border-cyan-400/60 text-white text-[0.95rem] sm:text-base font-[Orbitron] tracking-wider flex items-center justify-center select-none touch-manipulation transition-all duration-200 ease-out shadow-[0_0_10px_rgba(0,246,255,0.25)] drop-shadow-[0_0_6px_rgba(255,255,255,0.55)] hover:bg-gradient-to-br hover:from-cyan-400/20 hover:via-blue-500/20 hover:to-fuchsia-500/20 hover:shadow-[0_0_18px_rgba(0,246,255,0.45)] hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.7)] hover:scale-[1.06] active:scale-95 active:shadow-[0_0_24px_rgba(0,246,255,0.6)] disabled:opacity-50 disabled:hover:bg-[#0b0f1c] disabled:hover:shadow-[0_0_10px_rgba(0,246,255,0.25)]"
    >
        {children}
    </button>
);

const Controls: React.FC<ControlsProps> = (props) => {
  const { canBet, gameStatus, isAutoBetting, startAutoBet, stopAutoBet, placeBet, betAmount, t } = props;
  const [activeTab, setActiveTab] = useState<'manual' | 'auto'>('manual');
  // Track first base-bet used when an auto session starts
  const [lastAutoBaseBet, setLastAutoBaseBet] = useState<number | null>(null);

  const [autoSettings, setAutoSettings] = useState<Omit<AutoBetSettings, 'baseBet'>>({
      numberOfBets: 100,
      onWinAction: AutoBetAction.RESET,
      onWinValue: 0,
      onLossAction: AutoBetAction.RESET,
      onLossValue: 0,
      stopOnProfit: null,
      stopOnLoss: null,
  });

  const handleMainButtonClick = () => {
    if (isAutoBetting) {
        stopAutoBet();
    } else {
        if (activeTab === 'manual') {
            placeBet();
        } else { // activeTab === 'auto'
            const baseBet = parseFloat(betAmount);
            setLastAutoBaseBet(baseBet);
            const fullSettings: AutoBetSettings = {
                ...autoSettings,
                baseBet: baseBet,
            };
            startAutoBet(fullSettings);
        }
    }
  };

  const getButtonText = () => {
      if (isAutoBetting) return t('betsRemaining', props.betsRemaining);
      if (gameStatus === GameStatus.PLAYING) return props.isInstantBet ? t('resolving') : t('ascending');
      if (activeTab === 'auto') return t('startAutoBet');
      return t('placeBet');
  }
  
  const isButtonDisabled = () => {
      if (isAutoBetting) return false; // Stop button should always be enabled
      if (gameStatus !== GameStatus.IDLE) return true;
      if (activeTab === 'manual') return !canBet;
      // For auto bet, check if betAmount is valid before starting
      const bet = parseFloat(betAmount);
      return isNaN(bet) || bet <= 0 || bet > props.balance;
  }

  const mainButtonAnimation = !isAutoBetting && !isButtonDisabled() ? 'animate-blue-pulse-glow' : '';

  return (
    <div className="w-full flex flex-col gap-3.5">
        <div className={`w-full glass-panel controls-panel rounded-lg ${props.isBonusBuy ? 'panel-cyan-glow panel-cyan-outline' : ''}`}>
            <div className="flex justify-between items-center border-b-2 border-slate-950/50">
                <div className="relative flex flex-wrap lg:flex-nowrap items-center flex-1 gap-2 sm:gap-4 pl-3">
                    <TabButton active={activeTab === 'manual'} onClick={() => setActiveTab('manual')}>{t('manual')}</TabButton>
                    <TabButton active={activeTab === 'auto'} onClick={() => setActiveTab('auto')}>{t('auto')}</TabButton>
                    <TabButton active={false} onClick={props.openRules}>Rules</TabButton>
                </div>
                 <div className="flex items-center gap-4 pr-3 py-2.5">
                    {/* Fairness icon removed per new requirements */}
                </div>
            </div>

            <div className="p-3.5 sm:p-4 space-y-1.5 sm:space-y-4">
                {activeTab === 'manual' ? (
                    <ManualBetPanel {...props} />
                ) : (
                    <AutoBetPanel 
                        settings={autoSettings} 
                        setSettings={setAutoSettings} 
                        isAutoBetting={isAutoBetting}
                        lastAutoBaseBet={lastAutoBaseBet}
                    />
                )}

                {/* Turbo / Instant toggle button */}
                <div className="flex justify-end">
                    <button
                        onClick={props.toggleInstantBet}
                        title="Turbo Mode"
                        className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all duration-300
                            ${props.isInstantBet
                                ? 'animate-blue-pulse-glow neon border-[var(--accent)] bg-[rgba(0,246,255,0.15)] text-[var(--accent)] shadow-[0_0_14px_rgba(0,246,255,0.45)_inset,0_0_18px_rgba(0,246,255,0.35)]'
                                : 'border-slate-600 bg-slate-800/40 hover:bg-slate-700/40 text-slate-300'}
                        `}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            className="w-4 h-4 sm:w-5 sm:h-5"
                            fill="currentColor"
                        >
                            <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
                        </svg>
                    </button>
                </div>
                
                <button
                    onClick={handleMainButtonClick}
                    disabled={isButtonDisabled()}
                    className={`w-full py-1.5 sm:py-3 lg:py-5 min-h-[52px] text-sm sm:text-xl font-bold uppercase tracking-wider sm:tracking-widest transition-all duration-300 transform
                    ${isButtonDisabled()
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed border-b-4 border-slate-800'
                        : isAutoBetting
                            ? 'bg-gradient-to-b from-red-500 to-red-700 text-white hover:from-red-400 hover:to-red-600 active:scale-[0.98] border-b-4 border-red-900 shadow-lg shadow-red-600/30'
                            : 'hero-button'
                    } ${mainButtonAnimation}`}
                >
                    {getButtonText()}
                </button>
            </div>
        </div>
    </div>
  );
};

export default Controls;