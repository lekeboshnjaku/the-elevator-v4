import React, { useState, useEffect } from 'react';
import { GameStatus, HistoryEntry } from '../types';

interface ElevatorIndicatorProps {
    gameStatus: GameStatus;
    lastResult: HistoryEntry | null;
    targetMultiplier: string;
    isInstantBet: boolean;
}

const ElevatorIndicator: React.FC<ElevatorIndicatorProps> = ({ gameStatus, lastResult, targetMultiplier, isInstantBet }) => {
    const [floor, setFloor] = useState(0);

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

    let content: React.ReactNode;
    let textColorClass = 'accent neon';

    switch (gameStatus) {
        case GameStatus.PLAYING:
            if (isInstantBet) {
                textColorClass = 'accent neon';
                content = (
                    <>
                        <p className="text-sm uppercase tracking-widest opacity-70">Resolving...</p>
                        <p className="text-5xl font-bold leading-none -mt-1 transition-transform duration-300">{parseFloat(targetMultiplier).toFixed(2)}x</p>
                    </>
                );
            } else {
                content = (
                    <>
                        <p className="text-sm uppercase tracking-widest opacity-70">Ascending...</p>
                        <p className="text-5xl font-bold leading-none -mt-1 transition-transform duration-300">{floor.toFixed(2)}x</p>
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
                    <p className="text-5xl font-bold leading-none -mt-1 transition-transform duration-300">{parseFloat(targetMultiplier).toFixed(2)}x</p>
                </>
            );
            break;
    }

    return (
        <div className="w-full h-24 frame glass-panel rounded-lg flex flex-col items-center justify-center p-2 border"
             style={{ fontFamily: '"Orbitron", sans-serif' }}>
            <div className={`text-center transition-colors duration-300 ${textColorClass}`}>
                {content}
            </div>
        </div>
    );
};

export default ElevatorIndicator;