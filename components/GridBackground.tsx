import React, { FC } from 'react';
import { usePerformance } from '../src/services/PerformanceContext';

const ElevatorShaftBackground: FC = () => {
  // Detect if we should reduce visual effects (mobile / low-end)
  const { reduceEffects } = usePerformance();
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden z-0" aria-hidden>
      {/* Dark blue gradient base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #0a1830 0%, #081629 55%, #050f20 100%)',
          filter: 'saturate(110%)',
          willChange: 'transform'
        }}
      />

      {/* Subtle swirl rings (very low opacity) */}
      {!reduceEffects && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'conic-gradient(from 110deg at 50% 42%, rgba(0,255,255,0.06) 0 12deg, transparent 12deg 360deg), ' +
              'conic-gradient(from 290deg at 50% 62%, rgba(0,200,255,0.04) 0 10deg, transparent 10deg 360deg)'
          }}
        />
      )}

      {/* Soft neon glow accents */}
      {!reduceEffects && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(900px 600px at 15% 80%, rgba(0,255,255,0.10), transparent 70%), ' +
              'radial-gradient(1000px 700px at 85% 25%, rgba(0,180,255,0.08), transparent 70%)'
          }}
        />
      )}

      {/* Gentle center focus/vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ boxShadow: 'inset 0 0 180px rgba(0,0,0,0.55)' }}
      />
    </div>
  );
};

export default ElevatorShaftBackground;
