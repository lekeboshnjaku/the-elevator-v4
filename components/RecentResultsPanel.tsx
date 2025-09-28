import React from 'react';
import { HistoryEntry } from '../types';

interface RecentResultsPanelProps {
  history: HistoryEntry[];
}

const RecentResultsPanel: React.FC<RecentResultsPanelProps> = ({ history }) => {
  // Take the 5 most recent items
  const items = history.slice(0, 5);
  // Create an array of 5 slots, filled with items or undefined
  const slots = Array.from({ length: 5 }, (_, i) => items[i]);

  return (
    <div className="w-full">
      <div 
        className="relative frame neon-border-cyan animate-cyan-pulse-border rounded-lg shadow-[0_0_18px_rgba(0,246,255,0.25)]"
        style={{
          background: 'linear-gradient(180deg, #0a1424 0%, #0d1a2e 100%)',
          boxShadow: '0 10px 30px rgba(5, 11, 16, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
        }}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between p-3 border-b border-cyan-400/20">
          <h3 
            className="text-xs uppercase tracking-wider text-cyan-300 font-bold text-glow-cyan"
            style={{ 
              fontFamily: '"Orbitron", "Chakra Petch", Inter, sans-serif',
              letterSpacing: '0.05em'
            }}
            aria-label="Recent Results Panel"
          >
            Recent Results
          </h3>
        </div>

        {/* Results grid */}
        <div className="p-3">
          <div 
            className="grid grid-cols-5 gap-2"
            style={{
              backgroundImage: 'repeating-linear-gradient(90deg, rgba(10,20,36,0.3) 0px, rgba(10,20,36,0.3) 1px, transparent 1px, transparent 6px)',
              backgroundSize: '6px 100%',
              backgroundPosition: '2px 0'
            }}
          >
            {slots.map((entry, idx) => {
              if (!entry) {
                return (
                  <div 
                    key={`empty-${idx}`} 
                    className="h-[38px] w-full rounded-md border border-slate-700/30 bg-slate-800/20"
                    style={{
                      backdropFilter: 'blur(3px)',
                      boxShadow: 'inset 0 0 8px rgba(0,0,0,0.2)'
                    }}
                  />
                );
              }
              
              const isWin = entry.isWin;
              const colorClasses = isWin
                ? 'border-green-500/40 bg-green-900/20 text-green-300 text-glow-green'
                : 'border-red-500/40 bg-red-900/20 text-red-300 text-glow-red';
              
              const glowStyle = {
                boxShadow: isWin 
                  ? '0 0 12px rgba(74, 222, 128, 0.25), inset 0 0 8px rgba(74, 222, 128, 0.15)'
                  : '0 0 12px rgba(239, 68, 68, 0.25), inset 0 0 8px rgba(239, 68, 68, 0.15)'
              };
              
              return (
                <div
                  key={idx}
                  className={`h-[38px] w-full rounded-md border flex items-center justify-center font-mono font-semibold ${colorClasses}`}
                  title={`${isWin ? 'Win' : 'Loss'} at ${entry.multiplier.toFixed(2)}x`}
                  style={glowStyle}
                >
                  <div className="relative">
                    <span className="text-lg tracking-tight">{entry.multiplier.toFixed(2)}x</span>
                    {/* Subtle scanline effect */}
                    <div 
                      className="absolute inset-0 pointer-events-none opacity-10"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255,255,255,0.15) 1px, rgba(255,255,255,0.15) 2px)',
                        backgroundSize: '100% 2px'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Subtle HUD corner accents */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400/40 rounded-tl-lg" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400/40 rounded-tr-lg" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400/40 rounded-bl-lg" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400/40 rounded-br-lg" />
      </div>
    </div>
  );
};

export default RecentResultsPanel;
