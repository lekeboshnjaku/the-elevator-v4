import React, { useEffect, useState } from 'react';
import { Achievement, AchievementId } from '../types';

interface AchievementToastProps {
  achievement: Achievement;
  onClose: () => void;
}

const AchievementToast: React.FC<AchievementToastProps> = ({ achievement, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    /* Re-use theme colors from AchievementsPanel for consistent neon borders */
    const getTheme = (id: AchievementId) => {
        switch (id) {
            case AchievementId.SKY_RIDER:
            case AchievementId.ROLLER:
            case AchievementId.LUCKY_LIFT:
                return { borderClass: 'neon-border-cyan', ringClass: 'ring-cyan-300' };
            case AchievementId.BIG_ROLLER:
            case AchievementId.HIGH_ROLLER:
            case AchievementId.PRECISION_PLAYER:
                return { borderClass: 'neon-border-gold', ringClass: 'ring-amber-300' };
            case AchievementId.RISK_TAKER:
                return { borderClass: 'neon-border-purple', ringClass: 'ring-fuchsia-300' };
            case AchievementId.ELEVATOR_JAMMER:
            default:
                return { borderClass: 'neon-border-red', ringClass: 'ring-red-400' };
        }
    };

    // Handle immediate dismiss on click
    const handleDismiss = () => {
        setIsVisible(false);
        // Allow time for exit animation before calling onClose
        setTimeout(onClose, 250);
    };

    useEffect(() => {
        // A tiny delay ensures the element is in the DOM before the animation starts
        const enterTimeout = setTimeout(() => setIsVisible(true), 50);

        const exitTimeout = setTimeout(() => {
            setIsVisible(false);
            // Allow time for exit animation before calling onClose to remove from queue
            setTimeout(onClose, 500); 
        }, 3500); // Display for 3.5 seconds

        return () => {
            clearTimeout(enterTimeout);
            clearTimeout(exitTimeout);
        };
    }, [onClose]);

    return (
        <>
            <div
                className={`relative neon-card-bg bg-slate-900/70 backdrop-blur-sm p-3 w-full max-w-sm grid grid-cols-[auto,1fr] items-center gap-4 overflow-hidden rounded-lg shadow-xl cursor-pointer
                    ${getTheme(achievement.id).borderClass} border ${isVisible ? 'animate-toast-in-bottom' : 'animate-toast-out-bottom'}`}
                role="alert"
                onClick={handleDismiss}
            >
                <div
                    className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full ring-[1.5px] ${getTheme(achievement.id).ringClass} bg-slate-800/40`}
                >
                    <div className="w-6 h-6">{achievement.icon}</div>
                </div>
                <div className="flex-grow self-center">
                    <h3 className="font-bold text-white">{achievement.name}</h3>
                    <p className="text-sm text-slate-400">{achievement.description}</p>
                </div>
            </div>
        </>
    );
};

export default AchievementToast;