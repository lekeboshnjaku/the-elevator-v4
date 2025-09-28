
import React from 'react';

interface VolumeControlProps {
    volume: number;
    onVolumeChange: (volume: number) => void;
}

const VolumeControl: React.FC<VolumeControlProps> = ({ volume, onVolumeChange }) => {
    const backgroundStyle = {
        // Filled portion uses neon accent then fades into dark-teal
        background: `linear-gradient(to right, var(--accent) ${volume * 100}%, rgba(12,31,46,0.8) ${volume * 100}%)`
    };

    return (
        <div className="flex items-center w-24">
             <style>{`
                input[type=range].volume-slider {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 100%;
                    height: 6px;
                    border-radius: 9999px;
                    outline: none;
                    transition: background 0.1s;
                }
                
                input[type=range].volume-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    background: var(--accent);
                    cursor: pointer;
                    border-radius: 50%;
                    border: 2px solid #005e66; /* darker teal */
                    box-shadow: 0 0 8px rgba(0,246,255,0.65);
                }

                input[type=range].volume-slider::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    background: var(--accent);
                    cursor: pointer;
                    border-radius: 50%;
                    border: 2px solid #005e66; /* darker teal */
                    box-shadow: 0 0 8px rgba(0,246,255,0.65);
                }

                /* Keyboard focus outline */
                input[type=range].volume-slider:focus-visible {
                    outline: 2px solid var(--accent);
                    outline-offset: 2px;
                }
            `}</style>
            <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="volume-slider"
                style={backgroundStyle}
                aria-label="Volume Control"
            />
        </div>
    );
};

export default VolumeControl;