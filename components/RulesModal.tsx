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
          <h2 className="text-2xl font-bold text-white">{t('rulesTitle')}</h2>
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
            <h3 className="font-bold text-lg text-white mb-1">{t('rulesObjective')}</h3>
            <p>
              {t('rulesObjectiveText')}
            </p>
          </div>
          <div>
            <h3 className="font-bold text-lg text-white mb-1">{t('rulesPayout')}</h3>
            <p>
              {t('rulesPayoutText')} <span className="text-blue-400">{t('rulesPayoutBetAmount')}</span>{' '}
              multiplied by your chosen&nbsp;
              <span className="text-blue-400">{t('rulesPayoutTargetMultiplier')}</span>.
            </p>
          </div>
          {/* --- Elevate Mode description (replaces Bonus Buy) --- */}
          <div>
            <h3 className="font-bold text-lg text-white mb-1">{t('rulesElevateTitle')}</h3>
            <p className="text-sm">
              {t('rulesElevateText')}
              <br />
              <span className="italic">
                {t('rulesElevateVolatility')}
              </span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-slate-900 p-3 rounded-lg text-center flex flex-col justify-center">
              <p className="text-xs text-slate-400">{t('rulesRtp')}</p>
              <p className="text-lg font-bold text-green-400">{rtp.toFixed(2)}%</p>
            </div>
            <div className="bg-slate-900 p-3 rounded-lg text-center flex flex-col justify-center">
              <p className="text-xs text-slate-400">{t('rulesMaxWin')}</p>
              <p className="text-lg font-bold text-yellow-300">100,000x</p>
            </div>
          </div>
          <p className="text-center text-xs text-slate-400 mt-1">
            {t('rulesRtpNote')}
          </p>
          <div>
            <h3 className="font-bold text-lg text-white mb-1">{t('rulesFairnessTitle')}</h3>
            <p className="text-sm">{t('rulesFairnessText')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RulesModal;