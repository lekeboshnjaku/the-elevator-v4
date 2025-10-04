import React from 'react';
import { HistoryEntry } from '../types';

interface StatsAndHistoryPanelProps {
    history: HistoryEntry[];
    sessionProfit: number;
    formatCurrency: (amount: number) => string;
    onClose?: () => void; // Optional close handler for mobile view
}

const HistoryGraph: React.FC<{ history: HistoryEntry[], formatCurrency: (n: number) => string }> = ({ history, formatCurrency }) => {
    // Oldest → newest
    const ordered = [...history].reverse();
    const points = [] as { x: number; y: number; tooltip: string }[];
    let cum = 0;

    ordered.forEach((e, i) => {
        const delta = typeof e.profitChange === 'number' ? e.profitChange : 0;
        cum += delta;
        points.push({ x: i, y: cum, tooltip: `${formatCurrency(e.effectiveCost ?? 0)} → ${formatCurrency(e.outcomeAmount ?? 0)} (${formatCurrency(delta)})` });
    });

    const w = 420; // logical width
    const h = 140; // logical height
    const pad = 10;
    const minY = Math.min(0, ...points.map(p => p.y));
    const maxY = Math.max(0, ...points.map(p => p.y));
    const spanY = Math.max(1, maxY - minY);
    const scaleX = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 1;
    const scaleY = (h - pad * 2) / spanY;

    const poly = points.map((p, i) => {
        const x = pad + i * scaleX;
        const y = h - pad - (p.y - minY) * scaleY;
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="h-44 bg-slate-950/50 rounded-lg p-3 relative border border-slate-700/50 shadow-inner">
            <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
                {/* grid */}
                <g stroke="#334155" strokeDasharray="4 4" opacity="0.5">
                    <line x1="0" y1={h/2} x2={w} y2={h/2} />
                    <line x1="0" y1={pad} x2={w} y2={pad} />
                    <line x1="0" y1={h-pad} x2={w} y2={h-pad} />
                </g>
                {/* zero line */}
                {minY < 0 && maxY > 0 && (
                    <line x1="0" y1={h - pad - (0 - minY) * scaleY} x2={w} y2={h - pad - (0 - minY) * scaleY} stroke="#22d3ee" opacity="0.25" />
                )}
                {/* path */}
                <polyline points={poly} fill="none" stroke="#22d3ee" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 6px rgba(34,211,238,0.45))' }} />
                {/* markers */}
                {points.map((p, i) => {
                    const x = pad + i * scaleX;
                    const y = h - pad - (p.y - minY) * scaleY;
                    return (
                        <g key={i}>
                            <circle cx={x} cy={y} r="2.5" fill="#67e8f9" />
                            <title>{p.tooltip}</title>
                        </g>
                    );
                })}
            </svg>
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
            
            <HistoryGraph history={history} formatCurrency={formatCurrency} />
        </div>
    );
};

export default StatsAndHistoryPanel;
