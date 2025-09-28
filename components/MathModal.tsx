import React, { useEffect, useRef } from 'react';
import { HOUSE_EDGE, MAX_MULTIPLIER } from '../constants';

interface MathModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetMultiplier: string;
  t: (key: string, ...args: any[]) => string;
  betLimits: { minBet: number; maxBet: number; minStep: number };
  currencyConfig: { symbol: string; prefix: boolean };
}

const MathModal: React.FC<MathModalProps> = ({
  isOpen,
  onClose,
  targetMultiplier,
  t,
  betLimits,
  currencyConfig,
}) => {
  if (!isOpen) return null;
  
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  
  useEffect(() => {
      if (isOpen) {
          const timer = setTimeout(() => closeButtonRef.current?.focus(), 100);
          return () => clearTimeout(timer);
      }
  }, [isOpen]);

  const formatMoney = (amt: number) =>
    currencyConfig.prefix
      ? `${currencyConfig.symbol}${amt.toFixed(2)}`
      : `${amt.toFixed(2)}${currencyConfig.symbol}`;

  const target = parseFloat(targetMultiplier) || 2.0;
  const winChance =
    target > 1 && target <= MAX_MULTIPLIER
      ? ((1 - HOUSE_EDGE) / target) * 100
      : 0;
  const rtp = (1 - HOUSE_EDGE) * 100;

  // Exact min/max total payout (not profit), truncated to cents
  const minWin = Math.floor(betLimits.minBet * 1.01 * 100) / 100;
  const maxWin =
    Math.floor(betLimits.maxBet * MAX_MULTIPLIER * 100) / 100;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="math-modal-title"
    >
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
      `}</style>
      <div
        className="bg-slate-800 rounded-lg shadow-2xl p-6 w-full max-w-md border border-slate-600"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="math-modal-title" className="text-2xl font-bold text-white">{t('mathTitle')}</h2>
          <button 
            ref={closeButtonRef} 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close math summary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-4 text-slate-300">
          <p>This summary shows the game's mathematical properties for your currently selected target multiplier.</p>
          
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-slate-900 p-3 rounded-lg text-center">
              <p className="text-sm text-slate-400">Target Multiplier</p>
              <p className="text-xl font-bold text-cyan-400">{target.toFixed(2)}x</p>
            </div>
            <div className="bg-slate-900 p-3 rounded-lg text-center">
              <p className="text-sm text-slate-400">Win Chance</p>
              <p className="text-xl font-bold text-green-400">{winChance.toFixed(4)}%</p>
            </div>
            <div className="bg-slate-900 p-3 rounded-lg text-center">
              <p className="text-sm text-slate-400">Return to Player (RTP)</p>
              <p className="text-xl font-bold text-green-400">{rtp.toFixed(2)}%</p>
            </div>
            <div className="bg-slate-900 p-3 rounded-lg text-center">
              <p className="text-sm text-slate-400">House Edge</p>
              <p className="text-xl font-bold text-red-400">{(HOUSE_EDGE * 100).toFixed(2)}%</p>
            </div>
            <div className="bg-slate-900 p-3 rounded-lg text-center">
              <p className="text-sm text-slate-400">Min Win (Total)</p>
              <p className="text-xl font-bold text-amber-300">{formatMoney(minWin)}</p>
            </div>
            <div className="bg-slate-900 p-3 rounded-lg text-center">
              <p className="text-sm text-slate-400">Max Win (Total)</p>
              <p className="text-xl font-bold text-amber-300">{formatMoney(maxWin)}</p>
            </div>
          </div>
          
          <div>
            <h3 className="font-bold text-lg text-white mb-1 mt-4">How Is Win Chance Calculated?</h3>
            <p className="text-sm font-mono bg-slate-900 p-3 rounded-md break-all">Win Chance = (1 - House Edge) / Target Multiplier</p>
            <p className="text-sm mt-2">A higher target multiplier leads to a lower chance of winning, but a higher payout when you do win.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MathModal;
