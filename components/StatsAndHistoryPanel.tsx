import React from 'react';
import { HistoryEntry } from '../types';

interface StatsAndHistoryPanelProps {
    history: HistoryEntry[];
    sessionProfit: number;
    formatCurrency: (amount: number) => string;
    onClose?: () => void; // Optional close handler for mobile view
}

const HistoryGraph: React.FC<{ history: HistoryEntry[] }> = ({ history }) => {
    // We want to display from oldest to newest, so we reverse the array.
    const displayHistory = [...history].reverse();
    
    const maxLog = Math.log(1000); // Use a reasonable max for scaling, e.g., 1000x

    const calculateYPosition = (multiplier: number) => {
        if (multiplier < 1) return 0;
        // Use a logarithmic scale to make smaller multipliers visible and prevent huge ones from breaking the layout
        const logValue = Math.log(multiplier);
        const yPos = (logValue / maxLog) * 100;
        return Math.min(yPos, 100); // Cap at 100%
    }

    return (
        <div className="h-44 bg-slate-950/50 rounded-lg p-3 relative border border-slate-700/50 flex items-end justify-around shadow-inner">
             {/* Background grid lines */}
             <div className="absolute inset-0 flex flex-col justify-between p-3 pointer-events-none">
                <div className="w-full border-t border-dashed border-slate-700/50"></div>
                <div className="w-full border-t border-dashed border-slate-700/50"></div>
                <div className="w-full border-t border-dashed border-slate-700/50"></div>
             </div>
             {displayHistory.map((entry, index) => {
                const y = calculateYPosition(entry.multiplier);
                const colorClass = entry.isWin ? 'bg-green-400 shadow-[0_0_12px_3px_rgba(74,222,128,0.55)]' : 'bg-red-500 shadow-[0_0_12px_3px_rgba(239,68,68,0.55)]';

                return (
                    <div key={index} className="group relative w-2 h-full flex items-end justify-center">
                        <div 
                            className={`w-1.5 h-1.5 rounded-full ${colorClass} transition-all duration-300 animate-dot-pop`}
                            style={{ bottom: `calc(${y}% - 3px)` }}
                        ></div>
                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-950 px-2 py-1 rounded-md text-xs font-mono whitespace-nowrap z-10">
                            <span className={entry.isWin ? 'text-green-400' : 'text-red-500'}>{entry.multiplier.toFixed(2)}x</span>
                        </div>
                    </div>
                )
             })}
        </div>
    );
};


const StatsAndHistoryPanel: React.FC<StatsAndHistoryPanelProps> = ({ history, sessionProfit, formatCurrency, onClose }) => {
    const highestMultiplier = history.length > 0
        ? Math.max(...history.map(entry => entry.multiplier))
        : 0;

    const profitColor = sessionProfit > 0 ? 'success' : sessionProfit < 0 ? 'loss' : 'text-slate-300';

    return (
        <div className="relative w-full glass-panel rounded-lg p-4 space-y-4 animate-cyan-pulse-border">
             <div className="absolute inset-0 bg-black/10 rounded-xl overflow-hidden pointer-events-none">
                {/* Scanline effect */}
                <div className="absolute inset-0" style={{background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.3) 0, rgba(0,0,0,0.3) 1px, transparent 1px, transparent 3px)'}}></div>
            </div>
            {/* Neon cyan title bar */}
            <div className="flex justify-between items-center rounded-md bg-slate-900/80 border border-cyan-400/40 shadow-[0_0_14px_rgba(0,246,255,0.35)] px-3 py-1.5">
                <h3
                    className="font-bold text-md uppercase tracking-wider neon"
                    style={{ fontFamily: '"Orbitron", sans-serif', color: 'var(--accent)' }}
                >
                    SESSION DATA
                </h3>
                {onClose && (
                     <button 
                        className="lg:hidden bg-slate-800/80 p-1 rounded-full text-white hover:bg-slate-700/80 active:scale-90 transition-all"
                        onClick={onClose}
                        aria-label="Close Stats Panel"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-slate-950/50 p-2 rounded-md border border-cyan-400/40 shadow-[0_0_12px_rgba(0,246,255,0.25)]">
                    <div className="text-xs text-slate-400 uppercase">Session P/L</div>
                    <div className={`font-mono font-bold ${profitColor}`}>{formatCurrency(sessionProfit)}</div>
                </div>
                 <div className="bg-slate-950/50 p-2 rounded-md border border-cyan-400/40 shadow-[0_0_12px_rgba(0,246,255,0.25)]">
                    <div className="text-xs text-slate-400 uppercase">Highest</div>
                    <div className="font-mono font-bold text-sky-400">{highestMultiplier.toFixed(2)}x</div>
                </div>
            </div>
            
            <HistoryGraph history={history} />
        </div>
    );
};

export default StatsAndHistoryPanel;
