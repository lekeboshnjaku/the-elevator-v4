import React, { useEffect, useState, useRef } from 'react';

type Props = { progress: number };

const GameLoadingScreen: React.FC<Props> = ({ progress }) => {
  // Constants per spec
  const SVG_SIZE = 200;
  const CIRCLE_RADIUS = 50;
  const STROKE_WIDTH = 8;

  // Colors
  const LIME = '#a3e635';

  // Derived
  const p = Math.min(100, Math.max(0, progress));
  const yFill = SVG_SIZE - (p * (SVG_SIZE / 100));

  // Ring visuals
  const OUTER_RING_RADIUS = 60; // decorative ring outside the main circle
  const circumference = 2 * Math.PI * OUTER_RING_RADIUS;
  const strokeDashoffset = circumference * (1 - p / 100);

  return (
    <main
      className="relative flex min-h-screen w-full items-center justify-center bg-black text-white overflow-hidden"
      aria-label="Game loading screen"
    >
      {/* Required keyframes (inline) */}
      <style>{`
        /* Background Pulse Animation */
        @keyframes pulse-bg {
          0%, 100% { box-shadow: 0 0 20px rgba(163, 230, 53, 0.1); }
          50% { box-shadow: 0 0 40px rgba(163, 230, 53, 0.2); }
        }

        /* Liquid Movement with reduced motion check */
        @media (prefers-reduced-motion: no-preference) {
          @keyframes move-liquid {
            0% { transform: translateX(0) translateY(0) rotate(0deg) scale(1.1); }
            25% { transform: translateX(-5px) translateY(5px) rotate(2deg) scale(1.0); }
            50% { transform: translateX(5px) translateY(-5px) rotate(-2deg) scale(1.1); }
            75% { transform: translateX(-3px) translateY(3px) rotate(1deg) scale(1.0); }
            100% { transform: translateX(0) translateY(0) rotate(0deg) scale(1.1); }
          }
        }
      `}</style>

      <div className="flex flex-col items-center gap-5 sm:gap-6 p-6 rounded-2xl" style={{ animation: 'pulse-bg 6s ease-in-out infinite' }}>
        {/* Status message */}
        <div className="text-gray-400 uppercase tracking-widest text-xs sm:text-sm select-none">
          Calibrating Ooze Flow...
        </div>

        {/* Logo with liquid fill */}
        <div className="w-48 h-48 sm:w-56 sm:h-56">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <defs>
              {/* Liquid distortion filter */}
              <filter id="liquid-distortion">
                <feTurbulence type="fractalNoise" baseFrequency="0.02 0.05" numOctaves="3" result="turbulence" />
                <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="12" xChannelSelector="R" yChannelSelector="G" />
              </filter>

              {/* Clip to O shape */}
              <clipPath id="o-clip">
                <circle cx="100" cy="100" r="${CIRCLE_RADIUS}" />
              </clipPath>
            </defs>

            {/* Outer progress ring */}
            <circle
              cx="100" cy="100" r={OUTER_RING_RADIUS}
              stroke={LIME}
              strokeWidth={2}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              fill="none"
              style={{ transition: 'stroke-dashoffset 300ms ease-in-out', transform: 'rotate(-90deg)', transformOrigin: 'center' }}
            />

            {/* Liquid fill (clipped) */}
            <g clipPath="url(#o-clip)">
              {/* Background */}
              <rect x="0" y="0" width={SVG_SIZE} height={SVG_SIZE} fill="#0b1220" />

              {/* Liquid rect */}
              <rect
                x="0"
                y={yFill}
                width={SVG_SIZE}
                height={SVG_SIZE}
                fill={LIME}
                style={{
                  filter: 'url(#liquid-distortion) drop-shadow(0 0 15px #a3e635)',
                  animation: 'move-liquid 8s ease-in-out infinite',
                  transition: 'y 350ms cubic-bezier(0.2, 0.8, 0.2, 1)'
                }}
              />
            </g>

            {/* Logo outline on top */}
            <circle
              cx="100" cy="100" r={CIRCLE_RADIUS}
              stroke={LIME}
              strokeWidth={STROKE_WIDTH}
              fill="none"
              style={{ filter: 'drop-shadow(0 0 5px rgba(163, 230, 53, 0.8))' }}
            />
          </svg>
        </div>

        {/* Progress numeric */}
        <div className="text-lime-400 font-mono font-bold text-3xl">
          {Math.round(p)}%
        </div>

        {/* Text Logo */}
        <div style={{ fontFamily: 'Orbitron, sans-serif' }} className="text-4xl font-medium text-white lowercase tracking-[0.15em]">
          oozelabs
        </div>
      </div>
    </main>
  );
};

export default GameLoadingScreen;
