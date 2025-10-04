import React, { useEffect, useRef, useState } from 'react';
import { GameStatus, HistoryEntry } from '../types';
import { ANIMATION_DURATION } from '../constants';
import { audioService } from '../src/services/audioService';
import { usePerformance } from '../src/services/PerformanceContext';
import ElevatorCharacter from './ElevatorCharacter';

// Inlined sub-component for visual detail
const StructuralBeams: React.FC = () => (
    <>
        {/* Vertical Beams */}
        <div className="absolute top-0 bottom-0 left-1 w-2 bg-black/20"></div>
        <div className="absolute top-0 bottom-0 right-1 w-2 bg-black/20"></div>
        {/* Horizontal Beams */}
        <div className="absolute top-1/3 left-0 right-0 h-2 bg-black/20"></div>
        <div className="absolute bottom-1/4 left-0 right-0 h-2 bg-black/20"></div>
    </>
);

interface ElevatorProps {
  gameStatus: GameStatus;
  lastResult: HistoryEntry | null;
  targetMultiplier: string;
  isInstantBet: boolean;
  isElevateActive?: boolean;
}

const Elevator: React.FC<ElevatorProps> = ({ 
    gameStatus, 
    lastResult, 
    targetMultiplier, 
    isInstantBet,
    isElevateActive = false
}) => {
  /* ------------------------------------------------------------ */
  /*          Performance profile (max FPS based throttling)      */
  /* ------------------------------------------------------------ */
  const { maxFps } = usePerformance();

  const isDoorsClosed = gameStatus === GameStatus.IDLE || gameStatus === GameStatus.PLAYING || isInstantBet;
  const prevGameStatusRef = useRef(gameStatus);
  
  const animationDuration = isInstantBet ? 0 : ANIMATION_DURATION;

  /* ------------------------------------------------------------------ */
  /*                     Elevation progress animation                   */
  /* ------------------------------------------------------------------ */
  const [progress, setProgress] = useState(0); // 0 (bottom) ➜ 1 (top)
  useEffect(() => {
    if (gameStatus === GameStatus.PLAYING && !isInstantBet) {
      let frameId: number;
      const start = performance.now();
      const frameInterval = 1000 / maxFps; // throttle to device capability
      let last = start;
      const loop = (now: number) => {
        const elapsedTotal = now - start;
        const pct = Math.min(1, elapsedTotal / animationDuration); // always compute

        // Throttle state updates to the desired FPS
        if (now - last >= frameInterval) {
          last += frameInterval;
          setProgress(pct);
        }

        // Continue animating until we’ve reached the top
        if (pct < 1) {
          frameId = requestAnimationFrame(loop);
        }
      };
      frameId = requestAnimationFrame(loop);
      return () => {
        cancelAnimationFrame(frameId);
      };
    } else {
      // Ensure tone is stopped when not playing
      setProgress(0); // reset when not playing / instant
    }
  }, [gameStatus, isInstantBet, animationDuration]);
  
  // Base classes for the main elevator body
  const elevatorBodyBaseClasses = 'relative bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 rounded-t-lg shadow-2xl border-x-[3px] border-t-[3px] border-slate-600';

  useEffect(() => {
    const prevStatus = prevGameStatusRef.current;
    
    if (prevStatus === GameStatus.PLAYING && (gameStatus === GameStatus.WON || gameStatus === GameStatus.LOST)) {
        if (!isInstantBet) {
            setTimeout(() => {
               audioService.playDoorOpenSound();
            }, animationDuration / 2);
        }
    }
    
    if ((prevStatus === GameStatus.WON || prevStatus === GameStatus.LOST) && gameStatus === GameStatus.IDLE) {
        if (!isInstantBet) {
            audioService.playDoorCloseSound();
        }
    }

    prevGameStatusRef.current = gameStatus;
  }, [gameStatus, isInstantBet, animationDuration]);

  // Main game view with robust rail positioning
  return (
    <div className="relative flex items-center justify-center h-60 sm:h-80 lg:h-96 xl:h-[480px]">

        {/* Elevator Body */}
        <div className={`${elevatorBodyBaseClasses} w-44 sm:w-64 lg:w-80 xl:w-96 h-full`}>
            {/* Elevator Interior */}
            <div className="absolute inset-2 bg-slate-800 rounded-t-md overflow-hidden border border-black/50 grated-floor">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-600 to-slate-800 opacity-80"></div>
                <StructuralBeams />
                {/* Elevate Mode: vertical rising beams inside shaft */}
                {isElevateActive && (
                  <div className="pointer-events-none absolute inset-0 mix-blend-screen opacity-70">
                    <style>{`
                      @keyframes riseBeam { from { transform: translateY(100%); opacity:.0 } to { transform: translateY(-120%); opacity:.12 } }
                    `}</style>
                    {[0,1,2].map(i => (
                      <div key={i}
                           className="absolute left-0 right-0 h-[55%] mx-auto w-[62%]"
                           style={{
                             top: '0%',
                             filter: 'blur(2px)',
                             animation: `riseBeam ${5 + i}s linear ${i * 0.6}s infinite`,
                             background: 'linear-gradient(to top, rgba(99,227,255,0.00) 0%, rgba(99,227,255,0.18) 35%, rgba(255,247,133,0.22) 60%, rgba(99,227,255,0.10) 85%, rgba(99,227,255,0.00) 100%)',
                             maskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)'
                           }}
                      />
                    ))}
                  </div>
                )}
                {/* Cyan indicator bar (glow) */}
                <div className="absolute top-0 left-0 right-0 h-4 flex items-center justify-center">
                    <div className="w-24 h-1.5 rounded-full"
                         style={{
                             background: 'var(--indicator-fill)',
                             boxShadow: '0 0 12px var(--indicator-glow-outer), 0 0 18px var(--indicator-glow-inner)'
                         }}
                    ></div>
                </div>

                    {/* Moving progress indicator (vertical bar) */}
                    <div
                        className="absolute left-1/2 bottom-3 w-1.5 sm:w-2 bg-slate-400/30 rounded-full"
                        style={{
                            height: '60%',
                            transform: `translate(-50%, -${progress * 100}%)`,
                            transition: isInstantBet ? 'none' : `transform ${Math.max(50, Math.round(1000 / maxFps))}ms linear`,
                        }}
                    ></div>
                
                <ElevatorCharacter gameStatus={gameStatus} isInstantBet={isInstantBet} />
            </div>

            {/* Elevator Door Container */}
            <div className="absolute inset-2 overflow-hidden rounded-t-md shadow-[0_0_20px_rgba(0,246,255,0.35),_inset_0_0_14px_rgba(0,246,255,0.18)]">
                {/* Center door seam */}
                <div className="pointer-events-none absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-black z-20"></div>
                {/* Left Door */}
                <div
                className="absolute top-0 bottom-0 left-0 w-1/2 bg-slate-700 transition-transform ease-in-out"
                style={{
                    transform: `translateX(${isDoorsClosed ? '0%' : '-100%'})`,
                    transitionDuration: `${animationDuration}ms`,
                }}
                >
                <div className="absolute w-full h-full bg-gradient-to-r from-slate-800 via-transparent to-slate-800 opacity-50"></div>
                <div className="elevator-window"></div>
                {/* Door handle – mobile: smaller & lower; desktop (lg) keeps original */}
                <div
                    className="absolute right-0 bg-slate-800/50 rounded-full shadow-lg top-[62%] h-1/3 w-1.5 -translate-y-1/2
                               lg:top-1/2 lg:h-1/2 lg:w-2"
                ></div>
                </div>
                {/* Right Door */}
                <div
                className="absolute top-0 bottom-0 right-0 w-1/2 bg-slate-700 transition-transform ease-in-out"
                style={{
                    transform: `translateX(${isDoorsClosed ? '0%' : '100%'})`,
                    transitionDuration: `${animationDuration}ms`,
                }}
                >
                <div className="absolute w-full h-full bg-gradient-to-l from-slate-800 via-transparent to-slate-800 opacity-50"></div>
                <div className="elevator-window"></div>
                {/* Door handle – mobile: smaller & lower; desktop (lg) keeps original */}
                <div
                    className="absolute left-0 bg-slate-800/50 rounded-full shadow-lg top-[62%] h-1/3 w-1.5 -translate-y-1/2
                               lg:top-1/2 lg:h-1/2 lg:w-2"
                ></div>
                </div>
            </div>

            {/* Idle ambient light beams (subtle) */}
            {gameStatus === GameStatus.IDLE && (
                <div className="pointer-events-none absolute inset-2 rounded-t-md overflow-hidden">
                    <style>{`
                        @keyframes ambientSweep { 0%{opacity:.06; transform:translateX(-120%)} 50%{opacity:.12} 100%{opacity:.06; transform:translateX(120%)} }
                    `}</style>
                    <div className="absolute top-[10%] bottom-[10%] left-0 w-1/2 skew-x-[-12deg] bg-gradient-to-r from-white/5 via-white/8 to-transparent"
                         style={{ animation: 'ambientSweep 6s linear infinite' }} />
                </div>
            )}

            {/* Left Light Bar (softened in Elevate Mode) */}
            <div className={`absolute top-1/2 -translate-y-1/2 left-[-18px] h-[86%] w-[10px] rounded-full bg-gradient-to-b from-[#5CF1FF] via-[#4BE8FF] to-[#5CF1FF] ${isElevateActive ? 'opacity-80' : ''}`}
                 style={isElevateActive ? { boxShadow: '0 0 26px 8px rgba(0,246,255,0.32)', filter: 'blur(0.7px)' } : { boxShadow: '0 0 24px 6px rgba(0,246,255,0.35)' }}></div>

            {/* Right Light Bar (softened in Elevate Mode) */}
            <div className={`absolute top-1/2 -translate-y-1/2 right-[-18px] h-[86%] w-[10px] rounded-full bg-gradient-to-b from-[#5CF1FF] via-[#4BE8FF] to-[#5CF1FF] ${isElevateActive ? 'opacity-80' : ''}`}
                 style={isElevateActive ? { boxShadow: '0 0 26px 8px rgba(0,246,255,0.32)', filter: 'blur(0.7px)' } : { boxShadow: '0 0 24px 6px rgba(0,246,255,0.35)' }}></div>
        </div>
    </div>
  );
};

export default Elevator;