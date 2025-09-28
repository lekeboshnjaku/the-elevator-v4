import React from 'react';
import { HistoryEntry } from '../types';

interface RecentResultsBarProps {
  history: HistoryEntry[];
}

const RecentResultsBar: React.FC<RecentResultsBarProps> = ({ history }) => {
  /* -----------------------------------------------------------
     Take the newest 5 results (index 0 = newest) and display
     them oldest ➜ newest (left ➜ right).  Newest entry gets a
     one-time “pop” glow animation. If fewer than 5, fill with
     placeholders to keep width consistent.
  ----------------------------------------------------------- */
  const lastFive = history.slice(0, 5);               // newest first
  const newest    = lastFive[0];                      // may be undefined
  const ordered   = lastFive.slice().reverse();       // oldest → newest
  const slots     = Array.from({ length: 5 }, (_, i) => ordered[i]);

  return (
    <div className="w-full">
      {/* local keyframes for pop-in glow */}
      <style>{`
        @keyframes result-pop {
          0%   { transform: scale(0.9); box-shadow: 0 0 0 rgba(0,255,255,0); opacity: 0; }
          60%  { transform: scale(1.05); }
          100% { transform: scale(1);   opacity: 1; }
        }
        .animate-result-pop {
          animation: result-pop 0.35s ease-out;
        }
      `}</style>
      <div className="bg-slate-950/50 border border-cyan-400/40 rounded-lg shadow-[0_0_12px_rgba(0,246,255,0.18)] px-3 py-2">
        <div className="flex items-center justify-between pb-1">
          <span className="text-xs uppercase tracking-wider text-slate-400">Recent Results</span>
        </div>
        <div className="overflow-hidden -mx-1 px-1">
          <div className="grid grid-cols-5 gap-2 sm:gap-3 min-w-[0] sm:min-w-0">
            {slots.map((entry, idx) => {
              if (!entry) {
                return (
                  <div key={idx} className="h-8 sm:h-9 w-full rounded-md border border-slate-700/50 bg-slate-800/30" />
                );
              }
              const color = entry.isWin
                ? '!text-green-300 !bg-green-900/30 !border-green-500/60 shadow-[0_0_10px_rgba(74,222,128,0.25)]'
                : '!text-red-300 !bg-red-900/30 !border-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.25)]';
              return (
                <div
                  key={idx}
                  className={`h-8 sm:h-9 w-full rounded-md border font-mono font-semibold text-[11px] sm:text-sm grid place-items-center ${color} ${entry === newest ? 'animate-result-pop' : ''}`}
                  title={`${entry.isWin ? 'Win' : 'Loss'} at ${entry.multiplier.toFixed(2)}x`}
                  style={{
                    color: entry.isWin ? '#86efac' : '#fca5a5',
                    borderColor: entry.isWin ? '#22c55e99' : '#ef444499',
                  }}
                >
                  {entry.multiplier.toFixed(2)}x
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecentResultsBar;