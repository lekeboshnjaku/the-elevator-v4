import React, { useEffect, useRef } from 'react';
import { HOUSE_EDGE } from '../constants';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: (key: string, ...args: any[]) => string;
}

const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose, t }) => {
  if (!isOpen) return null;
  
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Set focus to the close button when the modal opens for accessibility
  useEffect(() => {
      if (isOpen) {
          // A small timeout allows the modal to be rendered and transitions to start before focusing
          const timer = setTimeout(() => closeButtonRef.current?.focus(), 100);
          return () => clearTimeout(timer);
      }
  }, [isOpen]);

  const rtp = (1 - HOUSE_EDGE) * 100;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in"
      onClick={onClose}
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
          <h2 className="text-2xl font-bold text-white">Game Rules</h2>
          <button 
            ref={closeButtonRef} 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close rules"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-4 text-slate-300">
          <div>
            <h3 className="font-bold text-lg text-white mb-1">Objective</h3>
            <p>
              Place a bet and choose a target multiplier. The elevator will start
              going up to a random multiplier. If the elevator reaches or exceeds
              your target, you win!
            </p>
          </div>
          <div>
            <h3 className="font-bold text-lg text-white mb-1">Payout</h3>
            <p>
              Your win amount is your <span className="text-blue-400">Bet Amount</span>{' '}
              multiplied by your chosen&nbsp;
              <span className="text-blue-400">Target Multiplier</span>.
            </p>
          </div>
          {/* --- Elevate Mode description (replaces Bonus Buy) --- */}
          <div>
            <h3 className="font-bold text-lg text-white mb-1">Elevate Mode</h3>
            <p className="text-sm">
              Increases your bet by&nbsp;
              <span className="text-blue-400 font-semibold">+200%</span> and
              unlocks higher volatility with a bias toward extreme multipliers.
              When Elevate Mode is active, the Target Multiplier is&nbsp;
              <span className="font-semibold">enabled</span> and can be set up to
              100,000x.
              <br />
              <span className="italic">
                Volatility Disclaimer: Elevate Mode greatly reduces the chance of
                small wins while significantly increasing the chance of very large
                multipliers.
              </span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-slate-900 p-3 rounded-lg text-center flex flex-col justify-center">
              <p className="text-xs text-slate-400">Return to Player (RTP)</p>
              <p className="text-lg font-bold text-green-400">{rtp.toFixed(2)}%</p>
            </div>
            <div className="bg-slate-900 p-3 rounded-lg text-center flex flex-col justify-center">
              <p className="text-xs text-slate-400">Maximum Win</p>
              <p className="text-lg font-bold text-yellow-300">100,000x</p>
            </div>
          </div>
          <p className="text-center text-xs text-slate-400 mt-1">
            ≈ 99.00% (Varies Slightly per Mode)
          </p>
          <div>
            <h3 className="font-bold text-lg text-white mb-1">Provably Fair</h3>
            <p className="text-sm">This game uses a cryptographic system to ensure its fairness. The outcome of each bet is determined by a combination of a secret server seed and a public client seed, making it impossible for the operator to manipulate the results. You can verify each bet in the game history.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RulesModal;