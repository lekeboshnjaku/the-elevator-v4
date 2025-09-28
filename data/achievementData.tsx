import React from 'react';
import { Achievement, AchievementId } from '../types';

// Using a Map for easy lookup by ID. This contains all achievement definitions.
export const allAchievements = new Map<AchievementId, Achievement>([
    [
        AchievementId.SKY_RIDER,
        {
            id: AchievementId.SKY_RIDER,
            name: 'Sky Rider',
            description: 'Win with a multiplier of 10x or higher.',
            icon: (
                /* Rocket with cyan glow */
                <svg
                    className="w-6 h-6 text-cyan-300 drop-shadow-[0_0_8px_#22d3ee]"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path d="M12 2c2.21 0 4 2.69 4 6 0 2.46-.83 4.71-2.05 6.15L14 17l-2-1-2 1-.05-2.85C8.83 12.71 8 10.46 8 8c0-3.31 1.79-6 4-6Zm0 18.5-2.5-1 .5 2L12 22l2-2.5.5-2-2.5 1Z" />
                    <path d="M12 8l1.5 3h-3L12 8Z" />
                </svg>
            )
        }
    ],
    [
        AchievementId.ROLLER,
        {
            id: AchievementId.ROLLER,
            name: 'Roller',
            description: 'Bet 50 or more in a single round.',
            icon: (
                 /* Single casino chip */
                 <svg
                    className="w-6 h-6 text-cyan-300 drop-shadow-[0_0_8px_#22d3ee]"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                 >
                    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
                    <circle cx="12" cy="12" r="4" fill="currentColor" />
                    <path d="M12 2v3M12 19v3M22 12h-3M5 12H2M17.657 6.343l-2.12 2.121M8.464 15.536l-2.12 2.121M17.657 17.657l-2.121-2.121M8.464 8.464l-2.12-2.121" stroke="currentColor" strokeWidth="1.5" />
                 </svg>
            )
        }
    ],
    [
        AchievementId.BIG_ROLLER,
        {
            id: AchievementId.BIG_ROLLER,
            name: 'Big Roller',
            description: 'Bet 200 or more in a single round.',
            icon: (
                /* Stack of three chips */
                <svg
                    className="w-6 h-6 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.85)]"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <g transform="translate(0 2)">
                        <ellipse cx="12" cy="4" rx="7" ry="3" />
                        <ellipse cx="12" cy="9" rx="7" ry="3" />
                        <ellipse cx="12" cy="14" rx="7" ry="3" />
                    </g>
                </svg>
            )
        }
    ],
    [
        AchievementId.HIGH_ROLLER,
        {
            id: AchievementId.HIGH_ROLLER,
            name: 'High Roller',
            description: 'Bet 500 or more in a single round.',
            icon: (
                /* Diamond icon */
                <svg
                    className="w-6 h-6 text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.9)]"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <polygon points="12 2 22 12 12 22 2 12" />
                </svg>
            )
        }
    ],
    [
        AchievementId.ELEVATOR_JAMMER,
        {
            id: AchievementId.ELEVATOR_JAMMER,
            name: 'Elevator Jammer',
            description: 'Lose 5 rounds in a row.',
            icon: (
                /* Broken elevator button */
                <svg
                    className="w-6 h-6 text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" />
                    <path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" strokeWidth="2" />
                </svg>
            )
        }
    ],
    [
        AchievementId.LUCKY_LIFT,
        {
            id: AchievementId.LUCKY_LIFT,
            name: 'Lucky Lift',
            description: 'Win at exactly 2.00x three times in a row.',
            icon: (
                /* Elevator going up */
                <svg
                    className="w-6 h-6 text-cyan-300 drop-shadow-[0_0_8px_#22d3ee]"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <rect x="7" y="8" width="10" height="10" rx="2" />
                    <path d="M12 6v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M10 8l2-2 2 2" fill="currentColor" />
                </svg>
            )
        }
    ],
    [
        AchievementId.RISK_TAKER,
        {
            id: AchievementId.RISK_TAKER,
            name: 'Risk Taker',
            description: 'Win with a multiplier of 20x or higher.',
            icon: (
                 /* Lightning bolt */
                 <svg
                    className="w-6 h-6 text-fuchsia-300 drop-shadow-[0_0_10px_rgba(168,85,247,0.85)]"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                 >
                    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
                 </svg>
            )
        }
    ],
    [
        AchievementId.PRECISION_PLAYER,
        {
            id: AchievementId.PRECISION_PLAYER,
            name: 'Precision Player',
            description: 'Win with a multiplier that exactly matches your target.',
            icon: (
                /* Crosshair */
                <svg
                    className="w-6 h-6 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.85)]"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
                    <circle cx="12" cy="12" r="3" fill="currentColor" />
                    <path d="M12 2v3M12 19v3M22 12h-3M5 12H2" stroke="currentColor" strokeWidth="2" />
                </svg>
            )
        }
    ]
]);