// src/App.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
// CORRECTED: 'useElevatorGame' is a folder, assuming main file inside is 'useElevatorGame.ts' or 'useElevatorGame.tsx'
import { useElevatorGame } from '../hooks/useElevatorGame';
// CORRECTED: 'Elevator' is a component file directly in 'components' folder, add explicit '.tsx'
import Elevator from '../components/Elevator';
import Controls from '../components/Controls';
// CORRECTED: 'types' is a file directly in 'src', add explicit '.ts'
import { GameStatus, Achievement } from '../types';
// CORRECTED: 'audioService' is a folder, assuming main file inside is 'audioService.ts' or 'audioService.tsx'
import { audioService } from './services/audioService';
import { sfxService } from './services/sfxService';
// CORRECTED: 'rgsApiService' is a folder, assuming main file inside is 'rgsApiService.ts' or 'rgsApiService.tsx'
import { rgsApiService } from './services/rgsApiService';
// CORRECTED: 'ErrorToast' is a component file directly in 'components' folder, add explicit '.tsx'
import ErrorToast from '../components/ErrorToast';
import RulesModal from '../components/RulesModal';
import MathModal from '../components/MathModal';
import { ProvablyFairControls } from '../components/ProvablyFairControls';
import ElevatorIndicator from '../components/ElevatorIndicator';
import VolumeControl from '../components/VolumeControl';
import StatsAndHistoryPanel from '../components/StatsAndHistoryPanel';
import ElevatorShaftBackground from '../components/GridBackground'; // Assuming the file is GridBackground.tsx
import RealityCheckModal from '../components/RealityCheckModal';
// CORRECTED: 'VolumeControl' is a component file directly in 'components' folder, add explicit '.tsx'
// CORRECTED: 'StatsAndHistoryPanel' is a component file directly in 'components' folder, add explicit '.tsx'
// CORRECTED: 'ElevatorShaftBackground' is a component file directly in 'components' folder, add explicit '.tsx'
// CORRECTED: 'RealityCheckModal' is a component file directly in 'components' folder, add explicit '.tsx'
// CORRECTED: 'constants' is a file directly in 'src', add explicit '.ts'
import { REALITY_CHECK_INTERVAL } from '../constants';
// CORRECTED: 'DropzoneOverlay' is a component file directly in 'components' folder, add explicit '.tsx'
import DropzoneOverlay from '../components/DropzoneOverlay';
import GameLoadingScreen from '../components/GameLoadingScreen';
// CORRECTED: 'useLocalization' is a folder, assuming main file inside is 'useLocalization.ts' or 'useLocalization.tsx'
import { useLocalization } from '../hooks/useLocalization';
// CORRECTED: 'AchievementsPanel' is a component file directly in 'components' folder, add explicit '.tsx'
import AchievementsPanel from '../components/AchievementsPanel';
import AchievementToast from '../components/AchievementToast';
import JackpotFX from '../components/JackpotFX';
import RecentResultsBar from '../components/RecentResultsBar';
// --- Responsive / Performance ---
import { PerformanceProvider } from './services/PerformanceContext';


const App: React.FC = () => {
    // Game Phase Management
    const [appPhase, setAppPhase] = useState<'initializing' | 'playing'>('initializing');
    const [loadingProgress, setLoadingProgress] = useState(0);
    const animationFrameRef = useRef<number | null>(null);

    // UI State
    const [isRulesOpen, setRulesOpen] = useState(false);
    const [isMathOpen, setMathOpen] = useState(false);
    const [isFairnessOpen, setFairnessOpen] = useState(false);
    const [isStatsPanelOpen, setStatsPanelOpen] = useState(false); // For mobile
    const [isInstantBet, setInstantBet] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isSocialMode, setSocialMode] = useState(false);
    const [isAchievementsOpen, setAchievementsOpen] = useState(false);
    const [achievementToastQueue, setAchievementToastQueue] = useState<Achievement[]>([]);
    const [liveRegionMessage, setLiveRegionMessage] = useState('');
    const [isRealityCheckVisible, setRealityCheckVisible] = useState(false);
    /*  Achievements panel auto-dismiss handling
        achievementsOpenSource distinguishes manual open vs. auto pop-up */
    const [achievementsOpenSource, setAchievementsOpenSource] = useState<'auto' | 'manual' | null>(null);
    const autoCloseAchievementsRef = useRef<number | null>(null);
    // Jackpot visual FX
    const [showJackpotFX, setShowJackpotFX] = useState(false);
    // Fatal init error (keeps UI running in limited mode)
    const [initError, setInitError] = useState<string | null>(null);

    // Utility Panel State (mobile swipe panel)
    const [isUtilityPanelOpen, setUtilityPanelOpen] = useState(false);
    const utilitySwipeStartRef = useRef<{x: number, y: number} | null>(null);
    const utilityAutoCloseRef = useRef<number | null>(null);

    // Refs
    const fairnessContainerRef = useRef<HTMLDivElement>(null);
    const welcomePlayedRef = useRef(false);

    // Localization Hook
    const { t } = useLocalization(isSocialMode);

    // Audio State
    const [volume, setVolume] = useState(0.5);
    const [isMuted, setMuted] = useState(false);
    const [isOperatorMuted, setOperatorMuted] = useState(false);
    const [isVolumeSliderVisible, setVolumeSliderVisible] = useState(false);

    // Game Logic Hook
    const game = useElevatorGame(isInstantBet);

    // Helper to smoothly animate progress, making the loading feel more gradual.
    const smoothAnimateProgressTo = useCallback((target: number) => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        const animate = () => {
            setLoadingProgress(current => {
                // If we are very close, just snap to the target and stop animating.
                if (Math.abs(target - current) < 0.1) {
                    return target;
                }
                // Move 5% of the remaining distance each frame for a smooth ease-out effect.
                const newProgress = current + (target - current) * 0.05;
                animationFrameRef.current = requestAnimationFrame(animate);
                return newProgress;
            });
        };

        animationFrameRef.current = requestAnimationFrame(animate);
    }, []);

    // ---- Game Initialization ----
    useEffect(() => {
        const loadTasks = async () => {
            const MIN_LOADING_TIME_MS = 3000; // Enforce a minimum 3-second load time for UX
            const startTime = Date.now();

            try {
                // Initial setup tasks
                smoothAnimateProgressTo(10);
                const urlParams = new URLSearchParams(window.location.search);
                const rgsUrl = urlParams.get('rgs_url') || 'http://localhost'; // Local fallback keeps mock mode
                const socialMode = urlParams.get('social') === 'true';
                setSocialMode(socialMode);

                // Optional custom headers for Stake Engine
                const headers: Record<string, string> = {};
                const gameId = urlParams.get('game_id');
                const vendorId = urlParams.get('vendor_id');
                const mathVersion = urlParams.get('math_version');
                if (gameId) headers['X-Stake-Game-Id'] = gameId;
                if (vendorId) headers['X-Stake-Vendor-Id'] = vendorId;
                if (mathVersion) headers['X-Stake-Math-Version'] = mathVersion;

                // Retrieve session token from query params (supports several key variants) or fall back to placeholder.
                const sessionToken =
                    urlParams.get('sessionID') ??
                    urlParams.get('sessionId') ??
                    urlParams.get('session_id') ??
                    urlParams.get('session') ??
                    urlParams.get('token') ??
                    'SESSION_TOKEN_FROM_STAKE_PLATFORM';

                // Initialize RGS client with resolved session token and base URL.
                rgsApiService.initialize(sessionToken, rgsUrl, { headers, requestTimeoutMs: 12000 });

                // Initialize audio service
                await audioService.init();
                smoothAnimateProgressTo(30);

                // Wait for custom fonts to be ready
                await document.fonts.ready;
                smoothAnimateProgressTo(60);

                // Initialize game data from the server
                smoothAnimateProgressTo(75);
                await game.initializeGame();
                /* ------------------------------------------------------------------
                   Math summary – emitted once on successful game init
                   Base Mode  : cost 1.0  | RTP ≈99% | weights lookup_table_base.csv
                   Elevate Mode: cost 3.0 | RTP ≈99% | weights lookup_table_elevate.csv
                   Both modes share events game_logic.jsonl.zst
                ------------------------------------------------------------------ */
                console.info('[Math] Mode summary', [
                    {
                        mode: 'Base',
                        cost: 1.0,
                        rtpTarget: '~99%',
                        events: 'game_logic.jsonl.zst',
                        weights: 'lookup_table_base.csv',
                    },
                    {
                        mode: 'Elevate',
                        cost: 3.0,
                        rtpTarget: '~99%',
                        events: 'game_logic.jsonl.zst',
                        weights: 'lookup_table_elevate.csv',
                        '≥10k multipliers present': 'yes',
                    },
                ]);
                smoothAnimateProgressTo(100);

                const elapsedTime = Date.now() - startTime;
                const remainingTime = MIN_LOADING_TIME_MS - elapsedTime;

                // A brief pause on 100% for a smoother transition, ensuring minimum load time.
                setTimeout(() => {
                    setAppPhase('playing');
                }, Math.max(500, remainingTime)); // Use at least 500ms, or more if needed to meet min time

            } catch (error) {
                console.error('Critical initialization failure:', error);
                const msg =
                    error instanceof Error ? error.stack || error.message : String(error);
                setInitError(msg);
                // Still transition out of loading so UI mounts.
                const elapsed = Date.now() - startTime;
                const wait = Math.max(0, MIN_LOADING_TIME_MS - elapsed) + 500;
                setTimeout(() => setAppPhase('playing'), wait);
            }
        };

        loadTasks();

        // Cleanup on unmount
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ------------------------------------------------------------------ */
    /*  Split layouts: desktop (≥lg) & mobile (<lg) – no global scaling  */
    /* ------------------------------------------------------------------ */

    // ---- Helper Functions ----
    const formatCurrency = useCallback((amount: number) => {
        const { symbol, prefix } = game.currencyConfig;
        const formattedAmount = Math.abs(amount).toFixed(2);
        const sign = amount < 0 ? '-' : '';
        return prefix
            ? `${sign}${symbol}${formattedAmount}`
            : `${sign}${formattedAmount}${symbol}`;
    }, [game.currencyConfig]);

    // Effect to populate toast queue from the game hook
    useEffect(() => {
        if (game.newlyUnlockedQueue.length > 0) {
            setAchievementToastQueue(prev => [...prev, ...game.newlyUnlockedQueue]);
            game.clearNewlyUnlockedQueue();

        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game.newlyUnlockedQueue]);

    /* ------------------------------------------------------------ */
    /*     Helper: auto-open Achievements panel & dismiss timer     */
    /* ------------------------------------------------------------ */
    const openAchievementsAuto = useCallback((durationMs: number = 2500) => {
        // If panel already manually open, respect manual session
        if (achievementsOpenSource === 'manual') return;

        setAchievementsOpen(true);
        setAchievementsOpenSource('auto');

        // Clear any existing timer then start a new one
        if (autoCloseAchievementsRef.current) {
            clearTimeout(autoCloseAchievementsRef.current);
        }
        autoCloseAchievementsRef.current = window.setTimeout(() => {
            // Only auto-close if still in auto mode
            setAchievementsOpenSource(current => {
                if (current === 'auto') {
                    setAchievementsOpen(false);
                    return null;
                }
                return current;
            });
        }, durationMs);
    }, [achievementsOpenSource]);

    // Effect to handle one-time audio unlock and welcome message on first user interaction.
    useEffect(() => {
        if (appPhase !== 'playing') return;

        const playWelcomeSequence = () => {
            if (welcomePlayedRef.current) return;
            welcomePlayedRef.current = true;

            // This call to setVolume also resumes the AudioContext if it's suspended.
            audioService.setVolume(isMuted ? 0 : volume).then(() => {
                audioService.startBackgroundMusic();
                game.playWelcomeMessage();
            });
        };

        window.addEventListener('click', playWelcomeSequence, { once: true });
        window.addEventListener('keydown', playWelcomeSequence, { once: true });

        return () => {
            window.removeEventListener('click', playWelcomeSequence);
            window.removeEventListener('keydown', playWelcomeSequence);
        };
    }, [appPhase, game, volume, isMuted]);

    // Effect for ongoing volume changes
    useEffect(() => {
        audioService.setVolume(isMuted ? 0 : volume);
        sfxService.setVolume(isMuted ? 0 : volume);
    }, [volume, isMuted]);

    // Effect for handling operator voice mute
    useEffect(() => {
        audioService.toggleVoice(!isOperatorMuted);
    }, [isOperatorMuted]);

    // Effect for playing sounds on game result
    useEffect(() => {
        if (game.gameStatus === GameStatus.WON) {
            audioService.playWinSound();
            // Trigger jackpot FX for 100,000x wins
            // Updated to new jackpot prize 10,000x
            if (game.lastResult && game.lastResult.multiplier >= 10000) {
                setShowJackpotFX(true);
            }
        } else if (game.gameStatus === GameStatus.LOST) {
            audioService.playLoseSound();
        }
    }, [game.gameStatus]);

    // Cleanup auto-dismiss timer on unmount
    useEffect(() => {
        return () => {
            if (autoCloseAchievementsRef.current) {
                clearTimeout(autoCloseAchievementsRef.current);
            }
            if (utilityAutoCloseRef.current) {
                clearTimeout(utilityAutoCloseRef.current);
            }
        };
    }, []);

    /* ------------------------------------------------------------------ */
    /*                Bet-start thud (manual, auto, programmatic)        */
    /* ------------------------------------------------------------------ */
    // Thud sound removed per new requirements

    // Effect for ARIA live region announcements for accessibility
    useEffect(() => {
        if (game.gameStatus === GameStatus.WON && game.lastResult) {
            setLiveRegionMessage(`You won ${formatCurrency(game.lastWinAmount)}. New balance is ${formatCurrency(game.balance)}.`);
        } else if (game.gameStatus === GameStatus.LOST && game.lastResult) {
            setLiveRegionMessage(`You lost. Crashed at ${game.lastResult.multiplier.toFixed(2)}x. New balance is ${formatCurrency(game.balance)}.`);
        }
    }, [game.gameStatus, game.lastResult, game.balance, game.lastWinAmount, formatCurrency]);

    // Effect for Reality Check timer
    useEffect(() => {
        if (appPhase !== 'playing') return;

        const timer = setInterval(() => {
            setRealityCheckVisible(true);
        }, REALITY_CHECK_INTERVAL);

        return () => clearInterval(timer);
    }, [appPhase]);

    // Effect for focusing the fairness modal when it opens
    useEffect(() => {
        if (isFairnessOpen && fairnessContainerRef.current) {
            const timer = setTimeout(() => fairnessContainerRef.current?.focus(), 100);
            return () => clearTimeout(timer);
        }
    }, [isFairnessOpen]);

    // Effect for Spacebar functionality
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
                return;
            }

            if (e.code === 'Space') {
                e.preventDefault();

                if (game.isAutoBetting) {
                    game.stopAutoBet();
                } else if (game.gameStatus === GameStatus.IDLE) {
                    // Only allow manual bet with spacebar
                    if (game.canBet) {
                        game.placeBet();
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [game.isAutoBetting, game.gameStatus, game.canBet, game.stopAutoBet, game.placeBet]);

    // Utility Panel Functions
    const startUtilityPanelCloseTimer = () => {
        if (utilityAutoCloseRef.current) {
            clearTimeout(utilityAutoCloseRef.current);
        }
        utilityAutoCloseRef.current = window.setTimeout(() => {
            setUtilityPanelOpen(false);
        }, 3500);
    };

    const handleUtilityPanelInteraction = () => {
        if (utilityAutoCloseRef.current) {
            clearTimeout(utilityAutoCloseRef.current);
            startUtilityPanelCloseTimer();
        }
    };

    const handleUtilitySwipeStart = (e: React.TouchEvent) => {
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        utilitySwipeStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleUtilitySwipeMove = (e: React.TouchEvent) => {
        if (!utilitySwipeStartRef.current || e.touches.length !== 1) return;
        
        const touch = e.touches[0];
        const deltaX = utilitySwipeStartRef.current.x - touch.clientX;
        const deltaY = Math.abs(utilitySwipeStartRef.current.y - touch.clientY);
        
        // Check if it's a left swipe (deltaX > 0) from the right edge
        // and vertical movement is minimal to avoid triggering on scrolls
        if (deltaX > 40 && deltaY < 30 && utilitySwipeStartRef.current.x > window.innerWidth - 24) {
            setUtilityPanelOpen(true);
            startUtilityPanelCloseTimer();
            utilitySwipeStartRef.current = null;
        }
    };

    const handleUtilitySwipeEnd = () => {
        utilitySwipeStartRef.current = null;
    };

    const handleUtilityPanelSwipeStart = (e: React.TouchEvent) => {
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        utilitySwipeStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleUtilityPanelSwipeMove = (e: React.TouchEvent) => {
        if (!utilitySwipeStartRef.current || e.touches.length !== 1) return;
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - utilitySwipeStartRef.current.x;
        const deltaY = Math.abs(utilitySwipeStartRef.current.y - touch.clientY);
        
        // Check if it's a right swipe (deltaX > 0) and vertical movement is minimal
        if (deltaX > 40 && deltaY < 30) {
            setUtilityPanelOpen(false);
            utilitySwipeStartRef.current = null;
        }
    };

    // ---- Drag and Drop Handlers for Music ----
    const handleDragEnter = (e: React.DragEvent<HTMLElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragOver(true);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const audioFile = Array.from(files).find(file => file.type === 'audio/mpeg');
            if (audioFile) {
                const fileUrl = URL.createObjectURL(audioFile);
                audioService.loadAndPlayMusicFromUrl(fileUrl);
            }
        }
    };

    // ---- Render Logic ----

    if (appPhase === 'initializing') {
        return <GameLoadingScreen progress={loadingProgress} />;
    }

    // Main Game UI wrapped with PerformanceProvider
    return (
        <PerformanceProvider>
            <main
                className="relative flex h-screen w-full flex-col font-sans overflow-hidden bg-slate-950 text-white"
                style={{ fontFamily: 'Inter, "Chakra Petch", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <ElevatorShaftBackground />
                {/* Jackpot animation overlay */}
                {showJackpotFX && <JackpotFX onDone={() => setShowJackpotFX(false)} />}
                {initError && (
                    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600/90 text-white text-sm p-2 text-center">
                        Initialization failed. Running UI with limited functionality. Check the console for details.
                    </div>
                )}
                <ErrorToast error={game.error} onClose={game.clearError} />
                <DropzoneOverlay isVisible={isDragOver} />
                {/* Accessibility: ARIA Live Region for screen readers */}
                <div className="sr-only" aria-live="polite" role="status">
                    {liveRegionMessage}
                </div>

                {/* Mobile Swipe Gesture Handle */}
                <div 
                    className="lg:hidden fixed right-0 top-0 h-full w-4 z-30"
                    onTouchStart={handleUtilitySwipeStart}
                    onTouchMove={handleUtilitySwipeMove}
                    onTouchEnd={handleUtilitySwipeEnd}
                />

                {/* Mobile Utility Panel */}
                {isUtilityPanelOpen && (
                    <div 
                        className="lg:hidden fixed inset-0 z-40"
                        onClick={() => setUtilityPanelOpen(false)}
                    />
                )}
                <div 
                    className={`lg:hidden fixed top-20 right-0 z-50 transform transition-transform duration-300 ${isUtilityPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}
                    onMouseEnter={handleUtilityPanelInteraction}
                    onTouchStart={(e) => {
                        handleUtilityPanelInteraction();
                        handleUtilityPanelSwipeStart(e);
                    }}
                    onTouchMove={handleUtilityPanelSwipeMove}
                    onTouchEnd={handleUtilitySwipeEnd}
                >
                    <div className="glass-panel controls-panel border rounded-l-lg shadow-[0_0_24px_6px_rgba(0,246,255,0.35)] p-3 backdrop-blur-sm bg-slate-900/70">
                        <div className="flex flex-col gap-3">
                            {/* Volume Toggle */}
                            <button 
                                onClick={() => setMuted(!isMuted)} 
                                className="neon-round-btn w-11 h-11 flex items-center justify-center"
                                aria-label={isMuted ? "Unmute" : "Mute"}
                            >
                                {isMuted ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                        <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.66 1.905H6.44l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06zM18.28 17.28a.75.75 0 001.06-1.06l-7.5-7.5a.75.75 0 00-1.06 1.06l7.5 7.5z" />
                                        <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 11-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                        <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.66 1.905H6.44l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                                        <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
                                    </svg>
                                )}
                            </button>
                            
                            {/* Operator Voice Toggle */}
                            <button 
                                onClick={() => setOperatorMuted(!isOperatorMuted)} 
                                className="neon-round-btn w-11 h-11 flex items-center justify-center"
                                aria-label={isOperatorMuted ? "Unmute Operator Voice" : "Mute Operator Voice"}
                            >
                                {isOperatorMuted ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                        <path d="M13.5 18.75a3.375 3.375 0 01-3.375-3.375V6.375a3.375 3.375 0 016.75 0v8.999a3.375 3.375 0 01-3.375 3.375z" />
                                        <path d="M6 10.5v.75c0 3.31 2.69 6 6 6s6-2.69 6-6v-.75h-1.5v.75c0 2.48-2.02 4.5-4.5 4.5s-4.5-2.02-4.5-4.5v-.75H6z" />
                                        <path d="M4.125 4.125a.75.75 0 011.06 0l14.69 14.69a.75.75 0 11-1.06 1.06L4.125 5.185a.75.75 0 010-1.06z" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                        <path d="M12 18.75a3.375 3.375 0 003.375-3.375V6.375a3.375 3.375 0 00-6.75 0v8.999c0 1.861 1.514 3.375 3.375 3.375z" />
                                        <path d="M6 10.5v.75c0 3.31 2.69 6 6 6s6-2.69 6-6v-.75h-1.5v.75c0 2.48-2.02 4.5-4.5 4.5s-4.5-2.02-4.5-4.5v-.75H6z" />
                                    </svg>
                                )}
                            </button>
                            
                            {/* Achievements Button */}
                            <button
                                onClick={() => {
                                    setUtilityPanelOpen(false);
                                    if (autoCloseAchievementsRef.current) {
                                        clearTimeout(autoCloseAchievementsRef.current);
                                        autoCloseAchievementsRef.current = null;
                                    }
                                    setAchievementsOpen(true);
                                    setAchievementsOpenSource('manual');
                                }}
                                className="neon-round-btn w-11 h-11 flex items-center justify-center icon-glow-cyan"
                                aria-label="Open Achievements"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    className="w-5 h-5"
                                    fill="currentColor"
                                    stroke="currentColor"
                                    strokeWidth={1.5}
                                >
                                    <polygon
                                        points="12,2 20,7 20,17 12,22 4,17 4,7"
                                        fill="none"
                                    />
                                    <g transform="translate(12,12) scale(0.58) translate(-12,-12)">
                                        <path
                                            d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                                            fill="currentColor"
                                        />
                                    </g>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 flex flex-1 flex-col items-center min-h-0">
                    <header className="relative z-20 flex w-full flex-shrink-0 items-center justify-between p-4">
                    <div className="bg-slate-900/50 px-3 py-2.5 rounded-lg flex items-center gap-2 border border-slate-700/50 shadow-md">
                        <span className="text-cyan-300 font-bold text-lg" style={{ textShadow: '0 0 6px rgba(34,211,238,0.9), 0 0 14px rgba(34,211,238,0.6)' }}>
                        {formatCurrency(game.balance)}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div
                        className="hidden sm:flex items-center gap-2 bg-slate-900/50 px-2 py-1.5 rounded-lg border border-slate-700/50"
                        onMouseEnter={() => setVolumeSliderVisible(true)}
                        onMouseLeave={() => setVolumeSliderVisible(false)}
                        >
                        <button onClick={() => setMuted(!isMuted)} className="p-2 rounded-full hover:bg-slate-700/50 active:scale-90 transition-all" aria-label={isMuted ? 'Unmute' : 'Mute'}>
                            {isMuted ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-slate-400"><path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.66 1.905H6.44l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06zM18.28 17.28a.75.75 0 001.06-1.06l-7.5-7.5a.75.75 0 00-1.06 1.06l7.5 7.5z" /><path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 11-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" /></svg>
                            ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-slate-400"><path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.66 1.905H6.44l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" /><path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" /></svg>
                            )}
                        </button>
                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isVolumeSliderVisible ? 'w-24 opacity-100' : 'w-0 opacity-0'}`}>
                            <VolumeControl volume={volume} onVolumeChange={setVolume} />
                        </div>
                        <button onClick={() => setOperatorMuted(!isOperatorMuted)} className="p-2 rounded-full hover:bg-slate-700/50 active:scale-90 transition-all" aria-label={isOperatorMuted ? 'Unmute Operator Voice' : 'Mute Operator Voice'}>
                            {isOperatorMuted ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-slate-400"><path d="M13.5 18.75a3.375 3.375 0 01-3.375-3.375V6.375a3.375 3.375 0 016.75 0v8.999a3.375 3.375 0 01-3.375 3.375z" /><path d="M6 10.5v.75c0 3.31 2.69 6 6 6s6-2.69 6-6v-.75h-1.5v.75c0 2.48-2.02 4.5-4.5 4.5s-4.5-2.02-4.5-4.5v-.75H6z" /><path d="M4.125 4.125a.75.75 0 011.06 0l14.69 14.69a.75.75 0 11-1.06 1.06L4.125 5.185a.75.75 0 010-1.06z" /></svg>
                            ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-slate-400"><path d="M12 18.75a3.375 3.375 0 003.375-3.375V6.375a3.375 3.375 0 00-6.75 0v8.999c0 1.861 1.514 3.375 3.375 3.375z" /><path d="M6 10.5v.75c0 3.31 2.69 6 6 6s6-2.69 6-6v-.75h-1.5v.75c0 2.48-2.02 4.5-4.5 4.5s-4.5-2.02-4.5-4.5v-.75H6z" /></svg>
                            )}
                        </button>
                        </div>
                        <button
                        onClick={() => {
                            // Manual open: cancel auto timer and mark manual source
                            if (autoCloseAchievementsRef.current) {
                                clearTimeout(autoCloseAchievementsRef.current);
                                autoCloseAchievementsRef.current = null;
                            }
                            setAchievementsOpen(true);
                            setAchievementsOpenSource('manual');
                        }}
                        className="group hidden sm:block p-2 rounded-full hover:bg-slate-800/80 active:scale-95 transition-all bg-slate-900/50 border border-cyan-400/40 shadow-lg shadow-cyan-400/20 hover:shadow-cyan-300/40 min-w-10 min-h-10"
                        aria-label="Open Achievements Panel"
                        >
                        {/* Glowing hexagon-star icon */}
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            className="w-6 h-6 icon-glow-cyan animate-cyan-icon-pulse transition-colors duration-200"
                            fill="currentColor"
                            stroke="currentColor"
                            strokeWidth={1.8}
                        >
                            {/* Hexagon outline */}
                            <polygon
                            points="12,2 20,7 20,17 12,22 4,17 4,7"
                            fill="none"
                            />
                            {/* Centered star inside hexagon */}
                            <g transform="translate(12,12) scale(0.58) translate(-12,-12)">
                            <path
                                d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                                fill="currentColor"
                            />
                            </g>
                        </svg>
                        </button>
                    </div>
                    </header>

                    {/* Desktop Layout */}
                    <div className="relative hidden h-full w-full max-w-[1600px] justify-center gap-12 px-4 lg:flex xl:gap-16 xl:px-8 items-center">
                    <aside className="w-full max-w-[250px] flex-shrink-0 xl:max-w-[300px]">
                        <StatsAndHistoryPanel history={game.history} sessionProfit={game.sessionProfit} formatCurrency={formatCurrency} />
                    </aside>
                    <section className="flex h-full max-w-[480px] flex-shrink-0 flex-col items-center justify-center xl:max-w-lg">
                        <div className="flex flex-col items-center relative w-full gap-4">
                        <div className="w-44 sm:w-64 lg:w-80 xl:w-96 flex items-center justify-center">
                            <ElevatorIndicator gameStatus={game.gameStatus} lastResult={game.lastResult} targetMultiplier={game.targetMultiplier} isInstantBet={isInstantBet} />
                        </div>
                        <Elevator gameStatus={game.gameStatus} lastResult={game.lastResult} targetMultiplier={game.targetMultiplier} isInstantBet={isInstantBet} />
                        <RecentResultsBar history={game.history} />
                        </div>
                    </section>
                    <aside className="w-full max-w-[250px] flex-shrink-0 xl:max-w-[300px]">
                        <Controls
                        betAmount={game.betAmount}
                        setBetAmount={game.setBetAmount}
                        targetMultiplier={game.targetMultiplier}
                        setTargetMultiplier={game.setTargetMultiplier}
                        placeBet={game.placeBet}
                        balance={game.balance}
                        canBet={game.canBet}
                        gameStatus={game.gameStatus}
                        isAutoBetting={game.isAutoBetting}
                        startAutoBet={game.startAutoBet}
                        stopAutoBet={game.stopAutoBet}
                        betsRemaining={game.betsRemaining}
                        openRules={() => setRulesOpen(true)}
                        openMath={() => setMathOpen(true)}
                        toggleFairness={() => setFairnessOpen(!isFairnessOpen)}
                        maxBet={game.betLimits.maxBet}
                        isInstantBet={isInstantBet}
                        toggleInstantBet={() => setInstantBet(!isInstantBet)}
                        isBetAmountInvalid={game.isBetAmountInvalid}
                        isBonusBuy={game.isBonusBuy}
                        toggleBonusBuy={game.toggleBonusBuy}
                        effectiveBetAmount={game.effectiveBetAmount}
                        t={t}
                        />
                    </aside>
                    </div>

                    {/* Mobile Layout */}
                    <div className="lg:hidden flex flex-1 flex-col w-full items-center justify-start gap-4 p-4 overflow-y-auto min-h-0">
                        {/* Elevator section */}
                        <section className="flex w-full max-w-lg flex-col items-center self-center">
                            <div className="flex flex-col items-center relative w-full gap-4">
                                <div className="w-44 sm:w-64 flex items-center justify-center">
                                    <ElevatorIndicator gameStatus={game.gameStatus} lastResult={game.lastResult} targetMultiplier={game.targetMultiplier} isInstantBet={isInstantBet} />
                                </div>
                                <Elevator gameStatus={game.gameStatus} lastResult={game.lastResult} targetMultiplier={game.targetMultiplier} isInstantBet={isInstantBet} />
                            </div>
                        </section>
                        
                        {/* Controls section */}
                        <aside className="relative z-20 w-full max-w-lg self-center">
                            <Controls
                                betAmount={game.betAmount}
                                setBetAmount={game.setBetAmount}
                                targetMultiplier={game.targetMultiplier}
                                setTargetMultiplier={game.setTargetMultiplier}
                                placeBet={game.placeBet}
                                balance={game.balance}
                                canBet={game.canBet}
                                gameStatus={game.gameStatus}
                                isAutoBetting={game.isAutoBetting}
                                startAutoBet={game.startAutoBet}
                                stopAutoBet={game.stopAutoBet}
                                betsRemaining={game.betsRemaining}
                                openRules={() => setRulesOpen(true)}
                                openMath={() => setMathOpen(true)}
                                toggleFairness={() => setFairnessOpen(!isFairnessOpen)}
                                maxBet={game.betLimits.maxBet}
                                isInstantBet={isInstantBet}
                                toggleInstantBet={() => setInstantBet(!isInstantBet)}
                                isBetAmountInvalid={game.isBetAmountInvalid}
                                isBonusBuy={game.isBonusBuy}
                                toggleBonusBuy={game.toggleBonusBuy}
                                effectiveBetAmount={game.effectiveBetAmount}
                                t={t}
                            />
                        </aside>
                        
                        {/* Session Data section */}
                        <section className="w-full max-w-lg self-center">
                            <StatsAndHistoryPanel 
                                history={game.history} 
                                sessionProfit={game.sessionProfit} 
                                formatCurrency={formatCurrency} 
                            />
                        </section>
                        
                        {/* Recent Results section */}
                        <section className="w-full max-w-lg self-center mt-auto">
                            <RecentResultsBar history={game.history} />
                        </section>
                    </div>

                    {/* Mobile Stats Panel */}
                    {isStatsPanelOpen && (
                    <div className="fixed inset-0 bg-black/70 z-30 lg:hidden">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md p-4">
                        <StatsAndHistoryPanel
                            history={game.history}
                            sessionProfit={game.sessionProfit}
                            formatCurrency={formatCurrency}
                            onClose={() => setStatsPanelOpen(false)}
                        />
                        </div>
                    </div>
                    )}
                </div>

                {/* Desktop Achievement Toasts */}
                <div className="hidden lg:block fixed bottom-4 right-4 z-50 w-full max-w-sm">
                    {achievementToastQueue.length > 0 && (
                        <AchievementToast
                            key={achievementToastQueue[0].id}
                            achievement={achievementToastQueue[0]}
                            onClose={() => {
                                setAchievementToastQueue(prev => prev.slice(1));
                            }}
                        />
                    )}
                </div>

                {/* Modals & Overlays */}
                <AchievementsPanel
                    isOpen={isAchievementsOpen}
                    onClose={() => {
                        if (autoCloseAchievementsRef.current) {
                            clearTimeout(autoCloseAchievementsRef.current);
                            autoCloseAchievementsRef.current = null;
                        }
                        setAchievementsOpen(false);
                        setAchievementsOpenSource(null);
                    }}
                    unlockedIds={game.unlockedAchievements}
                />
                <RulesModal isOpen={isRulesOpen} onClose={() => setRulesOpen(false)} t={t} />
                <MathModal
                    isOpen={isMathOpen}
                    onClose={() => setMathOpen(false)}
                    targetMultiplier={game.targetMultiplier}
                    betLimits={game.betLimits}
                    currencyConfig={game.currencyConfig}
                    t={t}
                />
                {isFairnessOpen && (
                    <div
                        ref={fairnessContainerRef}
                        tabIndex={-1}
                        className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-40 focus:outline-none"
                        onClick={() => setFairnessOpen(false)}
                    >
                        <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
                            <ProvablyFairControls
                                clientSeed={game.clientSeed}
                                setClientSeed={game.setClientSeed}
                                serverSeedHash={game.serverSeedHash}
                                nonce={game.nonce}
                                rotateServerSeed={game.rotateServerSeed}
                                isBetting={game.gameStatus === GameStatus.PLAYING}
                            />
                        </div>
                    </div>
                )}
                {isRealityCheckVisible && (
                    <RealityCheckModal
                        onClose={() => setRealityCheckVisible(false)}
                        sessionStartTime={game.sessionStartTime}
                        totalWagered={game.totalWagered}
                        sessionProfit={game.sessionProfit}
                        formatCurrency={formatCurrency}
                        t={t}
                    />
                )}
            </main>
        </PerformanceProvider>
    );
};

export default App;