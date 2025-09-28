import React, { useState } from 'react';
import { HistoryEntry } from '../types';
import { provablyFairService } from '../services/provablyFairService';

interface HistoryBarProps {
  history: HistoryEntry[];
}

const VerificationModal: React.FC<{ entry: HistoryEntry; onClose: () => void }> = ({ entry, onClose }) => {
    const [verificationResult, setVerificationResult] = useState<number | null>(null);

    const handleVerify = async () => {
        const result = await provablyFairService.verifyBet(entry.serverSeed, entry.clientSeed, entry.nonce);
        setVerificationResult(result.multiplier);
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-slate-800 rounded-lg shadow-2xl p-6 w-full max-w-md border border-slate-600" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-white mb-4">Bet Verification</h3>
                <div className="space-y-3 text-sm">
                    <div className="space-y-1">
                        <label className="text-slate-400">Server Seed</label>
                        <p className="bg-slate-900 p-2 rounded break-all font-mono text-slate-300">{entry.serverSeed}</p>
                    </div>
                    <div className="space-y-1">
                        <label className="text-slate-400">Client Seed</label>
                        <p className="bg-slate-900 p-2 rounded break-all font-mono text-slate-300">{entry.clientSeed}</p>
                    </div>
                    <div className="space-y-1">
                        <label className="text-slate-400">Nonce</label>
                        <p className="bg-slate-900 p-2 rounded font-mono text-slate-300">{entry.nonce}</p>
                    </div>
                </div>
                <div className="mt-6 flex flex-col items-center">
                    <button onClick={handleVerify} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                        Verify Result
                    </button>
                    {verificationResult !== null && (
                        <div className="mt-4 text-center">
                            <p className="text-slate-400">Calculated Multiplier:</p>
                            <p className={`font-mono text-2xl font-bold ${entry.multiplier === verificationResult ? 'text-green-400' : 'text-red-500'}`}>
                                {verificationResult.toFixed(2)}x
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                {entry.multiplier === verificationResult ? 'Matches original result.' : 'Does NOT match original result!'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


const HistoryItem: React.FC<{ entry: HistoryEntry }> = ({ entry }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const textColor = entry.isWin ? 'text-green-400 text-glow-green' : 'text-red-500 text-glow-red';
  
  return (
    <>
      <div 
        className={`relative group bg-slate-900/80 px-1.5 py-1.5 rounded-md text-sm font-mono shadow-inner border border-slate-700/50 transition-all duration-300 ${textColor}`}
      >
        {entry.multiplier.toFixed(2)}x
        <button 
            onClick={() => setIsModalOpen(true)}
            className="absolute -top-2 -right-2 bg-indigo-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Verify bet"
        >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-white">
                <path fillRule="evenodd" d="M8 1.75a.75.75 0 0 1 .75.75V3h-1.5V2.5A.75.75 0 0 1 8 1.75ZM6.25 3V2.5A2.25 2.25 0 0 1 8.5 0h.5A2.25 2.25 0 0 1 11.25 2.5V3h1.25A2.5 2.5 0 0 1 15 5.5v5A2.5 2.5 0 0 1 12.5 13H11v1.5a.75.75 0 0 1-1.5 0V13H6.5v1.5a.75.75 0 0 1-1.5 0V13H3.5A2.5 2.5 0 0 1 1 10.5v-5A2.5 2.5 0 0 1 3.5 3h1.25V2.5a.75.75 0 0 1 .75-.75h.75Zm-2 5.25a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5h-7.5Z" clipRule="evenodd" />
            </svg>
        </button>
      </div>
      {isModalOpen && <VerificationModal entry={entry} onClose={() => setIsModalOpen(false)} />}
    </>
  );
};

const HistoryBar: React.FC<HistoryBarProps> = ({ history }) => {
  return (
    <div className="flex justify-evenly items-center gap-1 bg-slate-900/50 p-2 rounded-lg shadow-inner border border-slate-700/50 w-full">
        {history.length === 0 && <span className="text-sm text-slate-500 px-4 whitespace-nowrap">Previous results will appear here...</span>}
        {history.slice(0, 5).map((entry, index) => (
            <HistoryItem key={index} entry={entry} />
        ))}
    </div>
  );
};

export default HistoryBar;