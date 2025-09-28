
import React, { useState, useEffect, useRef } from 'react';
import { GameStatus } from '../types';

interface ElevatorCharacterProps {
    gameStatus: GameStatus;
    isInstantBet: boolean;
}

const ElevatorCharacter: React.FC<ElevatorCharacterProps> = ({ gameStatus, isInstantBet }) => {
    const [peekDirection, setPeekDirection] = useState<'center' | 'left' | 'right'>('center');
    const peekTimerRef = useRef<number | null>(null);

    useEffect(() => {
        const schedulePeek = () => {
            if (peekTimerRef.current) {
                clearTimeout(peekTimerRef.current);
            }
            // Wait for a random duration (e.g., 3 to 7 seconds) before peeking
            peekTimerRef.current = window.setTimeout(() => {
                const direction = Math.random() > 0.5 ? 'left' : 'right';
                setPeekDirection(direction);

                // Wait for a fixed duration (e.g., 2 seconds) before returning to center
                peekTimerRef.current = window.setTimeout(() => {
                    setPeekDirection('center');
                    // Schedule the next peek after returning
                    schedulePeek();
                }, 2000); 
            }, Math.random() * 4000 + 3000);
        };

        if (gameStatus === GameStatus.IDLE) {
            // Start the peeking cycle when the game is idle
            schedulePeek();
        } else {
            // If the game is not idle, cancel any scheduled peeks and reset position
            if (peekTimerRef.current) {
                clearTimeout(peekTimerRef.current);
            }
            setPeekDirection('center');
        }

        // Cleanup function to clear timeouts when the component unmounts or gameStatus changes
        return () => {
            if (peekTimerRef.current) {
                clearTimeout(peekTimerRef.current);
            }
        };
    }, [gameStatus]);

    let animationClass = '';
    let eyeClass = 'eye-default';
    
    let characterStyle: React.CSSProperties = {};
    // Only apply the peeking transform when the game is idle
    if (gameStatus === GameStatus.IDLE) {
        let translateX = '0%';
        if (peekDirection === 'left') {
            translateX = '-100%';
        } else if (peekDirection === 'right') {
            translateX = '100%';
        }
        characterStyle = {
            transform: `translateX(${translateX})`,
            transition: 'transform 0.5s ease-in-out',
        };
    }

    switch (gameStatus) {
        case GameStatus.PLAYING:
            if (!isInstantBet) animationClass = 'animate-anticipation';
            eyeClass = 'eye-default';
            break;
        case GameStatus.WON:
            if (!isInstantBet) animationClass = 'animate-win';
            eyeClass = 'eye-win';
            break;
        case GameStatus.LOST:
            if (!isInstantBet) animationClass = 'animate-loss';
            eyeClass = 'eye-loss';
            break;
    }

    return (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[20%] max-w-14 aspect-[3/4]">
            <style>{`
                @keyframes anticipation {
                    0%, 100% { transform: translateY(0) scale(1.0, 1.0); }
                    50% { transform: translateY(-4px) scale(0.95, 1.05); }
                }
                .animate-anticipation { animation: anticipation 0.8s ease-in-out infinite; }
                
                @keyframes win-jump {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    25% { transform: translateY(-20px) rotate(-10deg); }
                    50% { transform: translateY(0) rotate(0deg); }
                    75% { transform: translateY(-10px) rotate(10deg); }
                }
                .animate-win { animation: win-jump 0.6s ease-out; }

                @keyframes loss-dizzy {
                    0% { transform: rotate(0deg); }
                    25% { transform: rotate(-15deg) translateX(-5px); }
                    75% { transform: rotate(15deg) translateX(5px); }
                    100% { transform: rotate(0deg); }
                }
                .animate-loss { animation: loss-dizzy 0.5s ease-in-out; }

                .eye {
                    position: absolute;
                    width: 12.5%;
                    height: 12.5%;
                    border-radius: 50%;
                    transition: background-color 0.2s, box-shadow 0.2s;
                }
                .eye-default {
                    background-color: #fff;
                    box-shadow: 0 0 5px #fff;
                }
                .eye-win {
                    background-color: #4ade80; /* Tailwind green-400 */
                    box-shadow: 0 0 8px #22c55e, 0 0 12px #22c55e;
                }
                .eye-loss {
                    background-color: #ef4444; /* Tailwind red-500 */
                    box-shadow: 0 0 8px #ef4444, 0 0 12px #ef4444;
                }
            `}</style>
            <div 
                className={`relative w-full h-full bg-slate-400 rounded-t-full rounded-b-md ${animationClass}`}
                style={characterStyle}
            >
                {/* Operator Headset - Upgraded for visibility */}
                {/* Headband - now a solid, thicker element */}
                <div className="absolute top-[12%] left-1/2 -translate-x-1/2 w-[105%] h-[8%] bg-slate-700 rounded-full z-10 border-t-2 border-slate-500"></div>
                
                {/* Right Earcup - larger and repositioned */}
                <div className="absolute top-[18%] -right-[10%] w-[25%] h-[25%] bg-slate-800 rounded-full z-0 border-2 border-slate-900"></div>

                {/* Left Earcup + Mic Assembly - larger and repositioned */}
                <div className="absolute top-[18%] -left-[10%] w-[25%] h-[25%] bg-slate-800 rounded-full z-0 border-2 border-slate-900">
                    {/* Boom arm - more substantial */}
                    <div className="absolute top-1/2 left-[90%] w-[160%] h-[30%] bg-slate-600 -rotate-45 origin-left-center rounded-full border-b border-slate-900">
                        {/* Mic head - more noticeable */}
                        <div className="absolute top-1/2 right-[-12%] -translate-y-1/2 w-[40%] h-[150%] bg-slate-800 rounded-md border border-slate-900 shadow-md"></div>
                    </div>
                </div>

                {/* Body */}
                <div className="absolute inset-x-[5%] bottom-0 h-2/5 bg-slate-300 rounded-b-md"></div>
                
                {/* Tie */}
                <div 
                    className="absolute top-[60%] left-1/2 -translate-x-1/2 w-[18%] h-[10%] bg-slate-800"
                    style={{ clipPath: 'polygon(20% 0, 80% 0, 100% 100%, 0 100%)' }}
                ></div>
                <div 
                    className="absolute top-[70%] left-1/2 -translate-x-1/2 w-[15%] h-[30%] bg-gradient-to-b from-slate-700 to-slate-800"
                    style={{ clipPath: 'polygon(0 0, 100% 0, 80% 100%, 20% 100%)' }}
                ></div>

                {/* Visor */}
                <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-3/4 h-1/3 bg-slate-900/50 rounded-sm"></div>
                {/* Eyes - simple dots for character */}
                <div className={`eye ${eyeClass}`} style={{ left: '25%', top: '35%' }}></div>
                <div className={`eye ${eyeClass}`} style={{ right: '25%', top: '35%' }}></div>
            </div>
        </div>
    );
};

export default ElevatorCharacter;