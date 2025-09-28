import React, { useState, useEffect, useRef } from 'react';
import { aiService } from '../services/aiService';

interface RealityCheckModalProps {
    onClose: () => void;
    sessionStartTime: Date;
    totalWagered: number;
    sessionProfit: number;
    formatCurrency: (amount: number) => string;
    t: (key: string, ...args: any[]) => string;
}

const formatDuration = (ms: number) => {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0) parts.push(`${minutes.toString().padStart(hours > 0 ? 2 : 1, '0')}m`);
    parts.push(`${seconds.toString().padStart(2, '0')}s`);
    
    return parts.join(' ');
};

const RealityCheckModal: React.FC<RealityCheckModalProps> = ({ onClose, sessionStartTime, totalWagered, sessionProfit, formatCurrency, t }) => {
    const [timePlayed, setTimePlayed] = useState(Date.now() - sessionStartTime.getTime());
    const [summary, setSummary] = useState<string>('');
    const [isLoadingSummary, setIsLoadingSummary] = useState(true);
    const continueButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimePlayed(Date.now() - sessionStartTime.getTime());
        }, 1000);
        return () => clearInterval(timer);
    }, [sessionStartTime]);

    // Fetch AI summary when the modal mounts
    useEffect(() => {
        const fetchSummary = async () => {
            setIsLoadingSummary(true);
            try {
                // The AI summary is now generic and doesn't require session data.
                const aiSummary = await aiService.generateSessionSummary();
                setSummary(aiSummary);
            } catch (error) {
                console.error("Failed to generate session summary:", error);
                setSummary("Unable to generate performance review at this time. Please proceed.");
            } finally {
                setIsLoadingSummary(false);
            }
        };
        fetchSummary();
    }, []);

    // Set focus to the continue button when the modal mounts for accessibility
    useEffect(() => {
        const timer = setTimeout(() => continueButtonRef.current?.focus(), 100);
        return () => clearTimeout(timer);
    }, []);
    
    const profitColor = sessionProfit > 0 ? 'text-green-400' : sessionProfit < 0 ? 'text-red-500' : 'text-slate-300';

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
        >
            <style>{`
                @keyframes fade-in {
                  from { opacity: 0; transform: scale(0.95); }
                  to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in { animation: fade-in 0.3s ease-out; }
            `}</style>
            <div
                className="bg-slate-800 rounded-lg shadow-2xl p-6 w-full max-w-sm border border-slate-600 text-center"
            >
                <h2 className="text-2xl font-bold text-yellow-300 mb-4" style={{ fontFamily: '"Orbitron", sans-serif' }}>Reality Check</h2>
                <p className="text-slate-400 mb-6">Here's a summary of your current session.</p>

                <div className="space-y-3 text-left">
                    <div className="flex justify-between items-baseline bg-slate-900 p-3 rounded-lg">
                        <span className="text-slate-400">Time Played</span>
                        <span className="font-mono font-bold text-lg text-white">{formatDuration(timePlayed)}</span>
                    </div>
                    <div className="flex justify-between items-baseline bg-slate-900 p-3 rounded-lg">
                        <span className="text-slate-400">{t('totalWagered')}</span>
                        <span className="font-mono font-bold text-lg text-white">{formatCurrency(totalWagered)}</span>
                    </div>
                    <div className="flex justify-between items-baseline bg-slate-900 p-3 rounded-lg">
                        <span className="text-slate-400">Net Profit/Loss</span>
                        <span className={`font-mono font-bold text-lg ${profitColor}`}>{formatCurrency(sessionProfit)}</span>
                    </div>
                </div>

                <div className="mt-6 text-left bg-slate-900 p-3 rounded-lg">
                    <p className="text-sm text-slate-400 font-bold mb-1">Operator's Note:</p>
                     {isLoadingSummary ? (
                        <div className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-slate-500 italic text-sm">Analyzing Performance Review...</span>
                        </div>
                    ) : (
                        <p className="text-slate-300 italic text-sm">"{summary}"</p>
                    )}
                </div>

                <button 
                    ref={continueButtonRef}
                    onClick={onClose} 
                    className="mt-8 w-full bg-blue-600 text-white text-lg font-bold py-3 px-8 rounded-lg transition-all duration-300 hover:bg-blue-500 active:scale-95 shadow-lg shadow-blue-500/30"
                >
                    Continue
                </button>
            </div>
        </div>
    );
};

export default RealityCheckModal;