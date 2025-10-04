import React from 'react';

// Minimal, unbranded loading screen to restore the previous behavior.
// Keeps the same public API so callers remain unchanged.
const GameLoadingScreen: React.FC<{ progress: number }> = ({ progress }) => {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <main
      className="min-h-screen w-full flex items-center justify-center bg-black text-white"
      aria-busy="true"
      aria-label="Loading game"
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-10 w-10 rounded-full border-4 border-slate-600 border-t-cyan-400 animate-spin"
          role="img"
          aria-label="Loading spinner"
        />
        <div className="text-sm text-slate-300 tracking-wide">Loading… {pct}%</div>
      </div>
    </main>
  );
};

export default GameLoadingScreen;
