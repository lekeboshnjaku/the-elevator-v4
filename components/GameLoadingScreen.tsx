import React, { useEffect, useState, useRef } from 'react';

/**
 * A brand-focused, high-fidelity loading screen.
 * @param progress - A number from 0 to 100 representing the loading progress.
 */
const GameLoadingScreen: React.FC<{ progress: number }> = ({ progress }) => {
    /* ---------------------- Theme ---------------------- */
    const successColor = '#32CD32'; // limegreen

    /* ---------------------- Dev-slow UI progress ---------------------- */
    const BASE_MIN_UI_DURATION_MS = 5000; // ensure UI takes ~5 s to fully reach 100%
    const [uiProgress, setUiProgress] = useState(0);
    const slowStartRef = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);

    // Read dev flags once
    const params = new URLSearchParams(window.location.search);
    const slowParam =
        params.get('slow_load') ?? params.get('slowLoad') ?? params.get('slow');
    const slowMsParam =
        params.get('slow_ms') ?? params.get('slowMs');
    const devSlowEnabled =
        (slowParam === '1' || slowParam === 'true') ||
        localStorage.getItem('DEV_SLOW_LOAD') === 'true';
    const devSlowDelayMs = slowMsParam && !isNaN(parseInt(slowMsParam))
        ? Math.max(0, parseInt(slowMsParam))
        : 3000 + Math.floor(Math.random() * 2000); // 3-5 s

    // RAF loop to ease uiProgress toward target respecting slow mode
    useEffect(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        // Record first frame timestamp unconditionally for base timing
        if (slowStartRef.current === null) {
            slowStartRef.current = performance.now();
        }

        const tick = () => {
            const now = performance.now();
            const clamped = Math.min(100, Math.max(0, progress));
            const elapsed = slowStartRef.current ? now - slowStartRef.current : 0;
            // Base cap so UI cannot exceed proportional completion before BASE_MIN_UI_DURATION_MS
            const baseCap = Math.min(100, (elapsed / BASE_MIN_UI_DURATION_MS) * 100);

            let target = Math.min(clamped, baseCap);

            if (devSlowEnabled) {
                const devCap =
                    elapsed >= devSlowDelayMs
                        ? 100
                        : 95 * (elapsed / devSlowDelayMs); // dev cap at 95% until delay ends
                target = Math.min(target, devCap);
            }

            setUiProgress(prev => {
                const next = prev + (target - prev) * 0.08; // gentler ease
                return Math.abs(next - target) < 0.05 ? target : next;
            });

            rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [progress, devSlowEnabled, devSlowDelayMs]);

    // Use uiProgress for all visuals
    const p = Math.min(100, Math.max(0, uiProgress));
    const [showBurst, setShowBurst] = useState(false);

    // Trigger burst animation when progress reaches 100%
    useEffect(() => {
        setShowBurst(p >= 100);
    }, [p]);

    // Ensure logo fully visible once loading (and burst) completes
    const logoOpacity = showBurst ? 1 : (p / 100);

    // Calculate stroke-dasharray values for the progress ring
    const radius = 60; // Slightly larger than the main circle
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - p / 100);
    // Y coordinate of liquid surface – used for the outline wave
    const surfaceY = 200 - (p * 2);
    
    return (
        <>
        <main className="relative flex flex-col min-h-screen w-full items-center justify-center overflow-hidden text-white p-4 bg-black">
            {/* This style block contains the keyframe animations */}
            <style>{`
                @keyframes move-liquid {
                    0% { transform: translateX(0) translateY(0) rotate(0deg) scale(1.1); }
                    25% { transform: translateX(-5px) translateY(5px) rotate(2deg) scale(1.0); }
                    50% { transform: translateX(5px) translateY(-5px) rotate(-2deg) scale(1.1); }
                    75% { transform: translateX(-3px) translateY(3px) rotate(1deg) scale(1.0); }
                    100% { transform: translateX(0) translateY(0) rotate(0deg) scale(1.1); }
                }
                
                @keyframes wave-motion {
                    0% { transform: translateX(0); }
                    50% { transform: translateX(-20px); }
                    100% { transform: translateX(0); }
                }
                
                @keyframes glow-pulse {
                    0% { filter: drop-shadow(0 0 5px rgba(50, 205, 50, 0.7)); }
                    50% { filter: drop-shadow(0 0 15px rgba(50, 205, 50, 0.9)); }
                    100% { filter: drop-shadow(0 0 5px rgba(50, 205, 50, 0.7)); }
                }
                
                @keyframes burst-animation {
                    0% { transform: scale(1); filter: brightness(1); }
                    50% { transform: scale(1.15); filter: brightness(1.5); }
                    100% { transform: scale(1); filter: brightness(1); }
                }
            `}</style>
            
            <div className="flex flex-col items-center gap-6 w-full max-w-md text-center">
                {/* Logo Container */}
                <div 
                    className="relative w-48 h-48 sm:w-64 sm:h-64"
                    style={{
                        animation: showBurst ? 'burst-animation 0.5s ease-out' : 'none',
                    }}
                >
                    <svg viewBox="0 0 200 200" className="w-full h-full">
                        <defs>
                            {/* Liquid distortion filter */}
                            <filter id="liquid-distortion">
                                <feTurbulence type="fractalNoise" baseFrequency="0.02 0.05" numOctaves="3" result="turbulence" seed="10" />
                                <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="12" xChannelSelector="R" yChannelSelector="G" />
                            </filter>
                            
                            {/* Neon glow filter */}
                            <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="4" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                            
                            {/* Wave pattern for liquid surface */}
                            <pattern id="wave-pattern" x="0" y="0" width="40" height="10" patternUnits="userSpaceOnUse">
                                <path d="M0,5 C10,0 15,10 20,5 C25,0 30,10 40,5" fill="none" stroke={successColor} strokeWidth="2" strokeOpacity="0.5" />
                            </pattern>
                            
                            {/* Circle clip path */}
                            <clipPath id="o-clip">
                                <circle cx="100" cy="100" r="50" />
                            </clipPath>
                        </defs>
                        
                        {/* Outer progress ring */}
                        <circle 
                            cx="100" cy="100" r={radius}
                            stroke={successColor}
                            strokeWidth="2"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            fill="none"
                            style={{
                                transition: 'stroke-dashoffset 0.3s ease-in-out',
                                transformOrigin: 'center',
                                transform: 'rotate(-90deg)'
                            }}
                        />
                        
                        {/* The O liquid, clipped by the circle path */}
                        <g clipPath="url(#o-clip)">
                            {/* Dark background of the circle */}
                            <rect x="0" y="0" width="200" height="200" fill="rgba(2, 6, 23, 0.5)" />
                             
                            {/* The filling ooze element */}
                            <rect 
                                x="0" 
                                y={200 - (p * 2)} // Starts at bottom (200) and moves up to top (0)
                                width="200" 
                                height="200"
                                fill={successColor}
                                style={{
                                    filter: 'url(#liquid-distortion)',
                                    animation: 'move-liquid 8s ease-in-out infinite',
                                    transformOrigin: 'center center',
                                    transition: 'y 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' // Smooth easing
                                }}
                            />
                            
                            {/* Animated wave pattern at the liquid surface */}
                            <rect 
                                x="0" 
                                y={198 - (p * 2)} 
                                width="200" 
                                height="10"
                                fill="url(#wave-pattern)"
                                style={{
                                    animation: 'wave-motion 3s linear infinite',
                                    opacity: 0.8,
                                    transition: 'y 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                }}
                            />

                            {/* Outlined wave to make the surface clearly visible */}
                            <g
                                style={{
                                    animation: 'wave-motion 3s linear infinite',
                                }}
                            >
                                {/* Glow stroke */}
                                <path
                                    d={`M -40 ${surfaceY} C -20 ${surfaceY - 6} 0 ${surfaceY + 6} 20 ${surfaceY} C 40 ${surfaceY - 6} 60 ${surfaceY + 6} 80 ${surfaceY} C 100 ${surfaceY - 6} 120 ${surfaceY + 6} 140 ${surfaceY} C 160 ${surfaceY - 6} 180 ${surfaceY + 6} 200 ${surfaceY} C 220 ${surfaceY - 6} 240 ${surfaceY + 6} 260 ${surfaceY}`}
                                    fill="none"
                                    stroke="#b7fdb7"
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{
                                        filter: 'drop-shadow(0 0 6px rgba(50,205,50,0.8))',
                                    }}
                                />
                                {/* Solid core stroke */}
                                <path
                                    d={`M -40 ${surfaceY} C -20 ${surfaceY - 6} 0 ${surfaceY + 6} 20 ${surfaceY} C 40 ${surfaceY - 6} 60 ${surfaceY + 6} 80 ${surfaceY} C 100 ${surfaceY - 6} 120 ${surfaceY + 6} 140 ${surfaceY} C 160 ${surfaceY - 6} 180 ${surfaceY + 6} 200 ${surfaceY} C 220 ${surfaceY - 6} 240 ${surfaceY + 6} 260 ${surfaceY}`}
                                    fill="none"
                                    stroke={successColor}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    opacity="0.95"
                                />
                            </g>
                        </g>
                        
                        {/* The "O" outline with glow effect */}
                        <circle 
                            cx="100" cy="100" r="50" 
                            stroke={successColor}
                            strokeWidth="8" 
                            fill="none" 
                            style={{
                                animation: 'glow-pulse 2s ease-in-out infinite',
                                filter: 'url(#neon-glow)'
                            }}
                        />
                        
                        {/* Percentage text */}
                        <text 
                            x="100" 
                            y="110" 
                            textAnchor="middle" 
                            fill="white" 
                            fontFamily="Orbitron, sans-serif"
                            fontSize="24"
                            fontWeight="bold"
                            style={{
                                textShadow: '0 0 5px rgba(255, 255, 255, 0.7)'
                            }}
                        >
                            {Math.round(p)}%
                        </text>
                    </svg>
                </div>
                 
                {/* Text Logo with fade-in effect */}
                <div 
                    style={{ 
                        fontFamily: '"Orbitron", sans-serif',
                        opacity: logoOpacity,
                        transition: 'opacity 0.25s ease-out'
                    }}
                >
                    <h1 className="text-4xl font-medium text-white lowercase tracking-[0.15em]">
                        OOZELABS
                    </h1>
                </div>
            </div>
        </main>
        </>
    );
};

export default GameLoadingScreen;
