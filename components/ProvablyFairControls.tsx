
import React from 'react';

interface ProvablyFairControlsProps {
    clientSeed: string;
    setClientSeed: (seed: string) => void;
    serverSeedHash: string;
    nonce: number;
    rotateServerSeed: () => void;
    isBetting: boolean;
}

export const ProvablyFairControls: React.FC<ProvablyFairControlsProps> = ({
    clientSeed,
    setClientSeed,
    serverSeedHash,
    nonce,
    rotateServerSeed,
    isBetting,
}) => {
    return (
        <div className="w-full bg-slate-800/60 p-4 rounded-lg shadow-lg space-y-4 border border-slate-700">
            <h3 className="text-center font-bold text-slate-300 text-lg">Fairness Controls</h3>
            <div className="space-y-3 text-sm">
                <div className="space-y-1">
                    <label className="text-slate-400">Client Seed</label>
                    <input
                        type="text"
                        value={clientSeed}
                        onChange={(e) => setClientSeed(e.target.value)}
                        disabled={isBetting}
                        className="w-full bg-slate-900 p-2 rounded font-mono text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    />
                </div>
                 <div className="space-y-1">
                    <label className="text-slate-400">Server Seed (Hashed)</label>
                    <p className="bg-slate-900 p-2 rounded break-all font-mono text-slate-400 text-xs">
                        {serverSeedHash || 'Generating...'}
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-slate-400">Next Nonce</label>
                        <p className="bg-slate-900 p-2 rounded font-mono text-slate-300">{nonce}</p>
                    </div>
                     <div className="flex items-end">
                        <button 
                            onClick={rotateServerSeed}
                            disabled={isBetting}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
                        >
                            New Seed
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};