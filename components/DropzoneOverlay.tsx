
import React from 'react';

interface DropzoneOverlayProps {
    isVisible: boolean;
}

const DropzoneOverlay: React.FC<DropzoneOverlayProps> = ({ isVisible }) => {
    if (!isVisible) {
        return null;
    }

    return (
        <div 
            className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 pointer-events-none transition-opacity duration-300"
            aria-hidden="true"
        >
            <div className="text-center border-4 border-dashed border-slate-600 rounded-2xl p-12">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto text-slate-400 mb-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                </svg>
                <h2 className="text-2xl font-bold text-white">Drop Your MP3 Here</h2>
                <p className="text-slate-400 mt-1">Set It as Background Music</p>
            </div>
        </div>
    );
};

export default DropzoneOverlay;