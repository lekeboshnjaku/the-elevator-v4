import React, { useState, useEffect } from 'react';
import { GameStatus, HistoryEntry } from '../types';

interface ElevatorIndicatorProps {
    gameStatus: GameStatus;
    lastResult: HistoryEntry | null;
    targetMultiplier: string;
    isInstantBet: boolean;
    isElevateActive?: boolean;
}

const ElevatorIndicator: React.FC<ElevatorIndicatorProps> = ({ gameStatus, lastResult, targetMultiplier, isInstantBet, isElevateActive = false }) => {
    const [floor, setFloor] = useState(0);
    const [pulse, setPulse] = useState(false);
    const [flash, setFlash] = useState(false);
    const prevStatus = React.useRef(gameStatus);

    useEffect(() => {
        let animationFrameId: number;
        let startTime: number | null = null;

        const animateFloor = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const currentFloor = Math.pow(progress / 120, 2.1);
            setFloor(currentFloor);
            animationFrameId = requestAnimationFrame(animateFloor);
        };

        if (gameStatus === GameStatus.PLAYING && !isInstantBet) { // Only animate for normal bets
            startTime = null;
            setFloor(0);
            animationFrameId = requestAnimationFrame(animateFloor);
        } else {
            setFloor(0);
        }

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [gameStatus, isInstantBet]);

    // Pulse when target multiplier changes while idle
    useEffect(() => {
        if (gameStatus === GameStatus.IDLE) {
            setPulse(true);
            const t = setTimeout(() => setPulse(false), 350);
            return () => clearTimeout(t);
        }
    }, [targetMultiplier, gameStatus]);

    // Flash when bet is placed (IDLE -> PLAYING)
    useEffect(() => {
        if (prevStatus.current === GameStatus.IDLE && gameStatus === GameStatus.PLAYING) {
            setFlash(true);
            const t = setTimeout(() => setFlash(false), 250);
            return () => clearTimeout(t);
        }
        prevStatus.current = gameStatus;
    }, [gameStatus]);

    let content: React.ReactNode;
    let textColorClass = 'accent neon';
    const gradientNumberStyle: React.CSSProperties = isElevateActive
        ? {
            background: 'linear-gradient(90deg, #ffd36a 0%, #5ce9ff 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            textShadow: '0 0 14px rgba(255,211,106,0.35), 0 0 12px rgba(92,233,255,0.35)'
          }
        : {};

    switch (gameStatus) {
        case GameStatus.PLAYING:
            if (isInstantBet) {
                textColorClass = 'accent neon';
                content = (
                    <>
                        <p className="text-sm uppercase tracking-widest opacity-70">Resolving...</p>
                        <p className="text-5xl font-bold leading-none -mt-1 transition-transform duration-300" style={gradientNumberStyle}>{parseFloat(targetMultiplier).toFixed(2)}x</p>
                    </>
                );
            } else {
                content = (
                    <>
                        <p className="text-sm uppercase tracking-widest opacity-70">Ascending...</p>
                        <p className="text-5xl font-bold leading-none -mt-1 transition-transform duration-300" style={gradientNumberStyle}>{floor.toFixed(2)}x</p>
                    </>
                );
            }
            break;
        case GameStatus.WON:
            textColorClass = 'success';
            content = (
                <>
                    <p className="text-sm uppercase tracking-widest opacity-70">Success</p>
                    <p className="text-5xl font-bold leading-none -mt-1 transition-transform duration-300">{lastResult?.multiplier.toFixed(2)}x</p>
                </>
            );
            break;
        case GameStatus.LOST:
            textColorClass = 'loss';
            content = (
                <>
                    <p className="text-sm uppercase tracking-widest opacity-70">Failed</p>
                    <p className="text-5xl font-bold leading-none -mt-1 transition-transform duration-300">{lastResult?.multiplier.toFixed(2)}x</p>
                </>
            );
            break;
        default: // IDLE
             content = (
                <>
                    <p className="text-sm uppercase tracking-widest opacity-70">Target</p>
                    <p className="text-5xl font-bold leading-none -mt-1 transition-transform duration-300" style={gradientNumberStyle}>{parseFloat(targetMultiplier).toFixed(2)}x</p>
                </>
            );
            break;
    }

    return (
        <div className="w-full h-24 frame glass-panel rounded-lg flex flex-col items-center justify-center p-2 border relative"
             style={{ fontFamily: '"Orbitron", sans-serif' }}>
            <style>{`
                @keyframes pulseScale { 0%{transform:scale(1)} 50%{transform:scale(1.06)} 100%{transform:scale(1)} }
                @keyframes flashGlow { 0%{box-shadow:0 0 0 rgba(0,0,0,0)} 50%{box-shadow:0 0 16px rgba(0,246,255,0.55)} 100%{box-shadow:0 0 0 rgba(0,0,0,0)} }
                .pulse { animation: pulseScale .35s ease-out; }
                .flash { animation: flashGlow .25s ease-out; }
            `}</style>
            <div className={`text-center transition-colors duration-300 ${textColorClass} ${pulse ? 'pulse' : ''} ${flash ? 'flash' : ''}`}>
                {content}
            </div>
        </div>
    );
};

export default ElevatorIndicator;