import React from 'react';

// Brand loading screen with neon lime O, slow outline-only wave, and centered percentage
const GameLoadingScreen: React.FC<{ progress: number }> = ({ progress }) => {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  const fillY = 200 - progress * 2; // map 0..100 -> 200..0 (SVG coords), wave rises with progress

  return (
    <main className="relative flex flex-col min-h-screen w-full items-center justify-center overflow-hidden bg-black text-white p-4">
      <style>{`
        @keyframes waveShift { 0% { transform: translateX(0); } 100% { transform: translateX(-240px); } }
        @keyframes bob { 0% { transform: translateY(0); } 50% { transform: translateY(2px); } 100% { transform: translateY(0); } }
      `}</style>

      <div className="flex flex-col items-center gap-6 w-full max-w-md text-center">
        <div className="relative w-48 h-48 sm:w-64 sm:h-64">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <defs>
              <clipPath id="o-clip"><circle cx="100" cy="100" r="50" /></clipPath>
              {/* Stroke-only wave for tiling */}
              <path id="wave-line" d="M0 20 C 20 10, 40 30, 60 20 C 80 10, 100 30, 120 20 C 140 10, 160 30, 180 20 C 200 10, 220 30, 240 20" fill="none" />
            </defs>

            {/* Background inside O */}
            <g clipPath="url(#o-clip)">
              <rect x="0" y="0" width="200" height="200" fill="rgba(2,6,23,0.65)" />
              {/* Outline-only waves at the current level; slow motion */}
              <g style={{ animation: 'bob 8s ease-in-out infinite' }}>
                <g style={{ animation: 'waveShift 22s linear infinite' }}>
                  <use href="#wave-line" x="0" y={fillY - 18} stroke="#39FF14" strokeWidth="3" />
                  <use href="#wave-line" x="240" y={fillY - 18} stroke="#39FF14" strokeWidth="3" />
                </g>
                <g style={{ animation: 'waveShift 30s linear infinite' }}>
                  <use href="#wave-line" x="0" y={fillY - 12} stroke="#39FF14" strokeWidth="2.5" opacity="0.7" />
                  <use href="#wave-line" x="240" y={fillY - 12} stroke="#39FF14" strokeWidth="2.5" opacity="0.7" />
                </g>
              </g>
            </g>

            {/* Neon lime O outline */}
            <circle cx="100" cy="100" r="50" stroke="#39FF14" strokeWidth="8" fill="none" />

            {/* Centered percentage */}
            <text x="100" y="108" textAnchor="middle" style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '22px', fill: '#ffffff' }}>{pct}%</text>
          </svg>
        </div>

        <div style={{ fontFamily: '"Orbitron", sans-serif' }}>
          <h1 className="text-4xl font-medium text-white lowercase tracking-[0.15em]">oozelabs</h1>
        </div>
      </div>
    </main>
  );
};

export default GameLoadingScreen;
