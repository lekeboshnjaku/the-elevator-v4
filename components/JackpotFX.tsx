import React, { useEffect, useState, useRef } from 'react';
import { usePerformance } from '../src/services/PerformanceContext';

/**
 * JackpotFX - A lightweight component that displays a jackpot win animation
 * with a neon cyan flash and confetti burst, then calls onDone() when complete.
 */
export default function JackpotFX({ onDone }: { onDone: () => void }) {
  // Performance profile (mobile/tablet may lower intensity)
  const { confettiCount, reduceEffects } = usePerformance();

  const [confetti, setConfetti] = useState<Array<{ id: number; style: React.CSSProperties }>>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Generate confetti on mount
  useEffect(() => {
    // Create confetti pieces with random properties
    const pieces = Array.from({ length: confettiCount }, (_, i) => {
      // Random values for animation
      const x = Math.random() * 100 - 50; // -50 to 50
      const y = Math.random() * 100 - 50; // -50 to 50
      const scale = Math.random() * 0.6 + 0.4; // 0.4 to 1
      const rotation = Math.random() * 360; // 0 to 360
      const duration = Math.random() * 0.4 + 0.8; // 0.8 to 1.2 seconds
      const delay = Math.random() * 0.2; // 0 to 0.2 seconds
      
      // Random colors from theme
      const colors = [
        'var(--accent)', // cyan
        '#49FF4A', // green
        '#00F6FF', // cyan variant
        '#22d3ee', // lighter cyan
        'white',
      ];
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      return {
        id: i,
        style: {
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: `${Math.random() * 10 + 5}px`,
          height: `${Math.random() * 10 + 5}px`,
          backgroundColor: color,
          borderRadius: '2px',
          transform: `translate(-50%, -50%)`,
          opacity: 0,
          animation: `jackpot-confetti ${duration}s ease-out ${delay}s forwards`,
          transformOrigin: 'center',
          // Custom properties to be used in the animation
          '--x': `${x}vw`,
          '--y': `${y}vh`,
          '--rotation': `${rotation}deg`,
          '--scale': scale,
        } as React.CSSProperties,
      };
    });
    
    setConfetti(pieces);
    
    // Set timeout to call onDone after animation completes
    timeoutRef.current = setTimeout(() => {
      onDone();
    }, 1200);
    
    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onDone]);
  
  return (
    <div 
      className="fixed inset-0 z-50 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {/* Neon flash overlay */}
      <div 
        className={`absolute inset-0 ${reduceEffects ? 'bg-cyan-400/10' : 'bg-cyan-400/20'}`}
        style={{
          animation: `jackpot-flash ${reduceEffects ? '0.9s' : '1.2s'} ease-out forwards`,
          boxShadow: 'inset 0 0 100px rgba(34, 211, 238, 0.6)',
        }}
      />
      
      {/* Confetti container */}
      <div className="absolute inset-0">
        {confetti.map(piece => (
          <span 
            key={piece.id} 
            style={piece.style}
            className="block absolute"
          />
        ))}
      </div>
      
      {/* Keyframe animations */}
      <style>{`
        @keyframes jackpot-confetti {
          0% {
            transform: translate(-50%, -50%) scale(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(
              calc(-50% + var(--x)), 
              calc(-50% + var(--y))
            ) scale(var(--scale)) rotate(var(--rotation));
            opacity: 0;
          }
        }
        
        @keyframes jackpot-flash {
          0% {
            opacity: 1;
            transform: scale(0.95);
          }
          20% {
            opacity: 0.9;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}
