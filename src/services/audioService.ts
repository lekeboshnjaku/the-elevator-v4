// A simple service to handle Web Audio API based sound generation.

class AudioService {
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;

    // --- DJ Mix nodes for music ---
    private musicGain: GainNode | null = null;
    private musicFilter: BiquadFilterNode | null = null;

    private voiceVolume: number = 1;
    private isVoiceEnabled: boolean = true;
    private isPlayingCallLoop: boolean = false;

    // --- Voice loading properties ---
    private voices: SpeechSynthesisVoice[] = [];
    private voiceLoadPromise: Promise<void> | null = null;
    private lastGlitchTime: number = 0;

    // --- Custom Music Properties ---
    private backgroundMusicBuffer: AudioBuffer | null = null;
    private backgroundMusicSource: AudioBufferSourceNode | null = null;
    
    // --- Procedural Music Properties ---
    private proceduralMusicNodes: {
        sequencerInterval: number | null;
        masterGain: GainNode; // Node to gather all procedural sounds
        bassOsc: OscillatorNode;
        bassGain: GainNode;
        padOsc1: OscillatorNode;
        padOsc2: OscillatorNode;
        padGain: GainNode;
    } | null = null;

    // --- Multiplier Rising Tone ---
    private riseToneOsc: OscillatorNode | null = null;
    private riseToneGain: GainNode | null = null;

    // --- Beat-Synced Speech Properties ---
    public bpm = 120;
    private speechQueue: { text: string, highPriority: boolean, onEnd?: () => void }[] = [];
    private isSpeakingFromQueue = false;
    private cancelNext = false; // Flag to signal the sequencer to cancel speech

    private operatorVoicemails: string[][] = [
        ["You have reached the operator. Due to atmospheric disturbances, all lines are currently unavailable. We apologize for the inconvenience."],
        ["This is an automated message. The operator is currently indisposed. Please remain calm and continue to your destination."],
        ["Thank you for calling.", "All of our operators are currently experiencing...", "technical difficulties.", "Your call is not important to us.", "Please enjoy the ride."],
        ["Connection failed.", "The operator cannot be reached at this time.", "Please try again later.", "Or... don't."],
        ["Please be advised... floors 13 through 42 are currently experiencing... reality fluctuations.", "Please keep all limbs inside the elevator at all times."],
        ["We are experiencing higher than normal call volumes.", "Your estimated wait time is...", "forever.", "Please hold."],
        ["Did you remember to file your productivity reports?", "Failure to comply may result in...", "disciplinary action.", "Enjoy the ascent."],
        // New short/single-word lines for variety
        ["Proceeding."],
        ["Calculating."],
        ["Risk assessment... nominal."],
        ["Hold."],
        ["Monitoring."],
        ["Unforeseen variables detected."],
        ["Compliance."],
        ["Authorized."]
    ];

    public init = async () => {
        if (this.audioContext) return;
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            
            // Master output gain
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = 1;

            // Music-specific processing chain for DJ effects
            this.musicGain = this.audioContext.createGain();
            this.musicFilter = this.audioContext.createBiquadFilter();
            this.musicFilter.type = 'lowpass';
            this.musicFilter.frequency.value = 22050; // Start fully open (no filtering)
            this.musicFilter.Q.value = 1;

            // Chain: Filter -> Gain -> Master Output
            this.musicFilter.connect(this.musicGain);
            this.musicGain.connect(this.masterGain);

            this._loadVoices();
        } catch (e) {
            console.error("Web Audio API is not supported or failed to init.", e);
        }
    }

    /**
     * Unlock Web-Audio on the first user gesture (click / keydown).
     * Should be called once during application bootstrap.
     */
    public initAudioUnlock = () => {
        const unlockHandler = async () => {
            try {
                // Ensure AudioContext exists, then resume if it is suspended.
                await this.init();
                await this.resumeContext();
            } finally {
                // Clean up listeners – `{ once:true }` already removes the one triggered,
                // but we explicitly remove both to be absolutely sure.
                window.removeEventListener('click', unlockHandler);
                window.removeEventListener('keydown', unlockHandler);
            }
        };

        // Attach listeners only once – if they were already attached, do nothing.
        // Using `{ once:true }` guarantees the handler fires at most one time.
        window.addEventListener('click', unlockHandler, { once: true, passive: true });
        window.addEventListener('keydown', unlockHandler, { once: true, passive: true });
    }

    public async loadAndPlayMusicFromUrl(url: string) {
        if (!this.audioContext || !this.musicFilter) return;

        this.stopBackgroundMusic(); // Stop any currently playing music
        this.backgroundMusicBuffer = null; // Clear the old buffer

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch audio from ${url}. Status: ${response.status}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            this.backgroundMusicBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            console.log(`Custom music loaded from ${url}`);
            this.startBackgroundMusic(); // Immediately play the new music
        } catch (e) {
            console.error(`Failed to load or play music from ${url}. The file might be corrupt or an unsupported format.`, e);
            // Attempt to fall back to procedural music
            this.startBackgroundMusic();
        }
    }

    private _loadVoices = () => {
        if (!('speechSynthesis' in window)) {
            console.warn("Speech Synthesis not supported by this browser.");
            this.voiceLoadPromise = Promise.resolve();
            return;
        }

        this.voiceLoadPromise = new Promise(resolve => {
            let timeoutId: number | null = null;
            let intervalId: number | null = null;

            const cleanup = () => {
                if (timeoutId) clearTimeout(timeoutId);
                if (intervalId) clearInterval(intervalId);
                window.speechSynthesis.onvoiceschanged = null;
            };

            const findVoices = () => {
                const voiceList = window.speechSynthesis.getVoices();
                if (voiceList.length > 0) {
                    this.voices = voiceList;
                    cleanup();
                    resolve();
                    return true;
                }
                return false;
            };

            if (findVoices()) return;

            window.speechSynthesis.onvoiceschanged = () => findVoices();
            intervalId = window.setInterval(() => findVoices(), 250);
            timeoutId = window.setTimeout(() => {
                console.warn("Speech synthesis voices did not load within 2 seconds. Voice features will be disabled.");
                cleanup();
                resolve(); // Resolve anyway to not block the game
            }, 2000);
        });
    }

    private resumeContext = async () => {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    public setVolume = async (level: number) => {
        if (!this.masterGain || !this.audioContext) return;
        await this.resumeContext();
        const clampedLevel = Math.max(0, Math.min(1, level));
        this.voiceVolume = clampedLevel;
        // masterGain controls everything. The ducking will be relative to this.
        this.masterGain.gain.setValueAtTime(clampedLevel, this.audioContext.currentTime);
    }
    
    public toggleVoice = (enabled: boolean) => {
        this.isVoiceEnabled = enabled;
        if (!enabled && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }
    
    public speakWelcomeMessage = async (messageParts: string[], onEnd?: () => void) => {
        messageParts.forEach((part, index) => {
            const isLastPart = index === messageParts.length - 1;
            // Welcome messages are always high priority
            this.speak(part, true, isLastPart ? onEnd : undefined);
        });
    }

    public speak = async (text: string, highPriority: boolean = false, onEnd?: () => void) => {
        const job = { text, highPriority, onEnd };
        
        // Optimization: If a high-priority message arrives and we are not currently speaking,
        // execute it immediately to bypass the sequencer's tick-rate latency.
        if (highPriority && !this.isSpeakingFromQueue && this.speechQueue.length === 0) {
            this.isSpeakingFromQueue = true;
            (async () => {
                if (this.voiceLoadPromise) {
                    await this.voiceLoadPromise;
                    await this.resumeContext();
                    this._executeSpeak(job.text, job.highPriority, job.onEnd);
                }
            })();
            return; // Don't queue it, it's being handled immediately.
        }

        if (highPriority) {
            this.cancelNext = true;
            this.speechQueue.unshift(job);
        } else {
            this.speechQueue.push(job);
        }
    }

    private _executeSpeak = (text: string, highPriority: boolean = false, onEnd?: () => void) => {
        if (!text || text.trim() === '') {
            this.isSpeakingFromQueue = false;
            if (onEnd) onEnd();
            return;
        }

        if (!this.isVoiceEnabled || !('speechSynthesis' in window) || !this.voiceLoadPromise || !this.audioContext) {
            this.isSpeakingFromQueue = false; // Ensure flag is reset
            if (onEnd) onEnd();
            return;
        }
    
        // DJ MIX: Duck the music when the operator speaks.
        if (this.musicGain && this.musicFilter) {
            const now = this.audioContext.currentTime;
            this.musicGain.gain.cancelScheduledValues(now);
            this.musicGain.gain.linearRampToValueAtTime(0.25, now + 0.5); // Duck to 25% volume
            this.musicFilter.frequency.cancelScheduledValues(now);
            this.musicFilter.frequency.linearRampToValueAtTime(800, now + 0.5); // Muffle the music
        }
    
        // CREATIVE MIX 1: "Radio" High-Pass Filter Intro
        this._playRadioStatic();
    
        const utterance = new SpeechSynthesisUtterance(text);
        
        if (this.voices.length > 0) {
            let selectedVoice: SpeechSynthesisVoice | undefined;
            const enUSVoices = this.voices.filter(v => v.lang === 'en-US');
    
            // Prioritize high-quality "Google" voices if available
            selectedVoice = enUSVoices.find(v => v.name.toLowerCase().includes('leda'));
            if (!selectedVoice) {
                selectedVoice = enUSVoices.find(v => v.name.includes('Google US English'));
            }
            if (!selectedVoice) {
                selectedVoice = enUSVoices.find(v => v.name.includes('Google') && v.name.includes('Female'));
            }
            // Fallback to other known good voices
            if (!selectedVoice) {
                const knownGoodVoices = ['Samantha', 'Zira', 'Alex'];
                selectedVoice = enUSVoices.find(v => knownGoodVoices.some(name => v.name.includes(name)));
            }
            if (!selectedVoice) {
                selectedVoice = enUSVoices.find(v => v.name.includes('Female'));
            }
            // Generic fallbacks
            if (!selectedVoice) {
                selectedVoice = enUSVoices[0];
            }
            if (!selectedVoice) {
                selectedVoice = this.voices.find(v => v.lang.startsWith('en'));
            }

            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }
        }

        utterance.volume = this.voiceVolume;
        utterance.pitch = 0.9;
        utterance.rate = 0.9;
        
        const originalOnEnd = onEnd;
        
        // CREATIVE MIX 2: "Glitch" Effect
        utterance.onboundary = (event: SpeechSynthesisEvent) => {
            if (!this.audioContext) return;
            const now = this.audioContext.currentTime;
            if (now - this.lastGlitchTime < 0.25) return; // Throttle
    
            if (Math.random() < 0.20) { // 20% chance (increased from 15%)
                this._playGlitchSound();
                this.lastGlitchTime = now;
            }
        };
        
        const onSpeechEnd = () => {
            // DJ MIX: Restore the music when the operator finishes.
            if (this.audioContext && this.musicGain && this.musicFilter) {
                const now = this.audioContext.currentTime;
                this.musicGain.gain.cancelScheduledValues(now);
                this.musicGain.gain.linearRampToValueAtTime(1.0, now + 1.0); // Restore to full volume
                this.musicFilter.frequency.cancelScheduledValues(now);
                this.musicFilter.frequency.linearRampToValueAtTime(22050, now + 1.0); // Un-muffle
            }
    
            // CREATIVE MIX 3: "Dub Echo" Outro
            this._playDubEcho();
            
            // Cleanup the boundary listener to prevent it from firing on a cancelled utterance
            utterance.onboundary = null;
            
            // Allow the sequencer to play the next line.
            this.isSpeakingFromQueue = false;
            
            if (originalOnEnd) originalOnEnd();
        };
    
        utterance.onend = onSpeechEnd;
    
        utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
            // 'interrupted' and 'canceled' are expected errors when we intentionally stop speech
            // for a higher-priority message (e.g., an achievement announcement).
            // We don't need to pollute the console with these expected events.
            if (event.error !== 'interrupted' && event.error !== 'canceled') {
                console.error('SpeechSynthesisUtterance.onerror', event);
            }
            onSpeechEnd(); // Ensure music is restored and echo plays even on error
        };
    
        // Removed long delay to improve responsiveness
        window.speechSynthesis.speak(utterance);
    }
    
    public playOperatorCallingLoop(): Promise<void> {
        return new Promise(async (resolve) => {
            if (!this.audioContext || !this.masterGain || !this.isVoiceEnabled || this.isPlayingCallLoop) {
                resolve();
                return;
            }
            this.isPlayingCallLoop = true;
            await this.resumeContext();
            const now = this.audioContext.currentTime;
            
            const playTone = (freq: number, startTime: number) => {
                if (!this.audioContext || !this.masterGain) return;
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, startTime);
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.1, startTime + 0.01);
                gain.gain.linearRampToValueAtTime(0, startTime + 0.1);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(startTime);
                osc.stop(startTime + 0.1);
            };
            playTone(1209, now);
            playTone(1336, now + 0.2);
            
            const playRing = (startTime: number) => {
                if (!this.audioContext || !this.masterGain) return;
                const osc1 = this.audioContext.createOscillator();
                const osc2 = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                osc1.type = 'sine';
                osc2.type = 'sine';
                osc1.frequency.value = 440;
                osc2.frequency.value = 480;
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.1, startTime + 0.01);
                gain.gain.setValueAtTime(0.1, startTime + 0.8);
                gain.gain.linearRampToValueAtTime(0, startTime + 0.9);
                
                osc1.connect(gain);
                osc2.connect(gain);
                gain.connect(this.masterGain);
                osc1.start(startTime);
                osc2.start(startTime);
                osc1.stop(startTime + 0.9);
                osc2.stop(startTime + 0.9);
            };
            playRing(now + 0.5);

            const playClick = (startTime: number) => {
                if (!this.audioContext || !this.masterGain) return;
                const noise = this.audioContext.createBufferSource();
                const bufferSize = this.audioContext.sampleRate * 0.05;
                const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
                noise.buffer = buffer;
                const gain = this.audioContext.createGain();
                gain.gain.setValueAtTime(0.3, startTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.03);
                noise.connect(gain);
                gain.connect(this.masterGain);
                noise.start(startTime);
                noise.stop(startTime + 0.05);
            }
            playClick(now + 1.5);

            setTimeout(() => {
                if (this.isVoiceEnabled) {
                    const messageParts = this.operatorVoicemails[Math.floor(Math.random() * this.operatorVoicemails.length)];
                    messageParts.forEach((part, index) => {
                        const isLastPart = index === messageParts.length - 1;
                        // The onEnd callback for the final phrase handles resolving the promise.
                        const onEndCallback = isLastPart ? () => {
                            this.isPlayingCallLoop = false;
                            resolve();
                        } : undefined;
                        this.speak(part, true, onEndCallback);
                    });
                } else {
                     setTimeout(() => {
                        this.isPlayingCallLoop = false;
                        resolve();
                     }, 6000); 
                }
            }, 1800);
        });
    }

    public playAmbientSound(): Promise<void> {
        return new Promise(async (resolve) => {
            if (!this.audioContext || !this.masterGain || !this.isVoiceEnabled) {
                resolve();
                return;
            }
            await this.resumeContext();
            const now = this.audioContext.currentTime;
            const soundType = Math.floor(Math.random() * 3);

            switch (soundType) {
                case 0: // Garbled PA announcement
                    {
                        // Short burst of static
                        const noise = this.audioContext.createBufferSource();
                        const bufferSize = this.audioContext.sampleRate * 0.2;
                        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
                        const data = buffer.getChannelData(0);
                        for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
                        noise.buffer = buffer;

                        const bandpass = this.audioContext.createBiquadFilter();
                        bandpass.type = 'bandpass';
                        bandpass.frequency.value = 3000;
                        bandpass.Q.value = 20;

                        const gain = this.audioContext.createGain();
                        gain.gain.setValueAtTime(0.1, now);
                        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

                        noise.connect(bandpass);
                        bandpass.connect(gain);
                        noise.start(now);
                        noise.stop(now + 0.2);

                        // Garbled speech synth
                        const speechOsc = this.audioContext.createOscillator();
                        speechOsc.type = 'sawtooth';
                        speechOsc.frequency.setValueAtTime(200, now + 0.1);
                        speechOsc.frequency.linearRampToValueAtTime(300, now + 1.5);

                        const speechLfo = this.audioContext.createOscillator();
                        speechLfo.type = 'sine';
                        speechLfo.frequency.value = 5;
                        const lfoGain = this.audioContext.createGain();
                        lfoGain.gain.value = 50;
                        speechLfo.connect(lfoGain);
                        lfoGain.connect(speechOsc.frequency);

                        const speechFilter = this.audioContext.createBiquadFilter();
                        speechFilter.type = 'lowpass';
                        speechFilter.frequency.value = 800;

                        const speechGain = this.audioContext.createGain();
                        speechGain.gain.setValueAtTime(0, now + 0.1);
                        speechGain.gain.linearRampToValueAtTime(0.1, now + 0.2);
                        speechGain.gain.linearRampToValueAtTime(0, now + 1.5);

                        speechOsc.connect(speechFilter);
                        speechFilter.connect(speechGain);
                        speechGain.connect(this.masterGain);
                        speechLfo.start(now + 0.1);
                        speechOsc.start(now + 0.1);
                        speechLfo.stop(now + 1.5);
                        speechOsc.stop(now + 1.5);
                        
                        setTimeout(resolve, 1600);
                        break;
                    }
                case 1: // Electrical buzz
                    {
                        const buzzOsc = this.audioContext.createOscillator();
                        buzzOsc.type = 'square';
                        buzzOsc.frequency.value = 60;

                        const buzzGain = this.audioContext.createGain();
                        buzzGain.gain.setValueAtTime(0, now);
                        buzzGain.gain.linearRampToValueAtTime(0.05, now + 0.1);
                        buzzGain.gain.setValueAtTime(0.05, now + 1.0);
                        buzzGain.gain.linearRampToValueAtTime(0, now + 1.2);
                        
                        buzzOsc.connect(buzzGain);
                        buzzGain.connect(this.masterGain);
                        buzzOsc.start(now);
                        buzzOsc.stop(now + 1.2);
                        
                        setTimeout(resolve, 1300);
                        break;
                    }
                case 2: // Distant rumble
                    {
                        const noise = this.audioContext.createBufferSource();
                        const bufferSize = this.audioContext.sampleRate * 2.5;
                        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
                        const data = buffer.getChannelData(0);
                        for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
                        noise.buffer = buffer;

                        const lowpass = this.audioContext.createBiquadFilter();
                        lowpass.type = 'lowpass';
                        lowpass.frequency.value = 150;

                        const gain = this.audioContext.createGain();
                        gain.gain.setValueAtTime(0, now);
                        gain.gain.linearRampToValueAtTime(0.15, now + 0.5);
                        gain.gain.linearRampToValueAtTime(0, now + 2.4);

                        noise.connect(lowpass);
                        lowpass.connect(gain);
                        gain.connect(this.masterGain);
                        noise.start(now);
                        noise.stop(now + 2.5);
                        
                        setTimeout(resolve, 2600);
                        break;
                    }
            }
        });
    }
    
    public playWinSound = () => {
        if (!this.audioContext || !this.masterGain) return;
        this.resumeContext();
        const now = this.audioContext.currentTime;
        
        const mainOsc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        mainOsc.type = 'sine';
        mainOsc.frequency.setValueAtTime(1200, now);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.6, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1);
        mainOsc.connect(gainNode);
        gainNode.connect(this.masterGain);
        mainOsc.start(now);
        mainOsc.stop(now + 1);
        
        const harmonicOsc = this.audioContext.createOscillator();
        const harmonicGain = this.audioContext.createGain();
        harmonicOsc.type = 'sine';
        harmonicOsc.frequency.setValueAtTime(2400, now);
        harmonicGain.gain.setValueAtTime(0, now);
        harmonicGain.gain.linearRampToValueAtTime(0.2, now + 0.01);
        harmonicGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
        harmonicOsc.connect(harmonicGain);
        harmonicGain.connect(this.masterGain);
        harmonicOsc.start(now);
        harmonicOsc.stop(now + 0.5);
    }
    
    public playLoseSound = () => {
        if (!this.audioContext || !this.masterGain) return;
        this.resumeContext();
        const now = this.audioContext.currentTime;
        
        const mainOsc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        mainOsc.type = 'sine';
        mainOsc.frequency.setValueAtTime(150, now);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.5, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
        mainOsc.connect(gainNode);
        gainNode.connect(this.masterGain);
        mainOsc.start(now);
        mainOsc.stop(now + 1.2);
        
        const harmonicOsc = this.audioContext.createOscillator();
        const harmonicGain = this.audioContext.createGain();
        harmonicOsc.type = 'sine';
        harmonicOsc.frequency.setValueAtTime(300, now);
        harmonicGain.gain.setValueAtTime(0, now);
        harmonicGain.gain.linearRampToValueAtTime(0.15, now + 0.01);
        harmonicGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
        harmonicOsc.connect(harmonicGain);
        harmonicGain.connect(this.masterGain);
        harmonicOsc.start(now);
        harmonicOsc.stop(now + 0.7);
    }

    /* ------------------------------------------------------------------ */
    /*         Rising Futuristic Tone (called while multiplier climbs)    */
    /* ------------------------------------------------------------------ */

    public startRiseTone = () => {
        if (!this.audioContext || !this.masterGain) return;
        this.resumeContext();
        if (this.riseToneOsc) return; // already running

        const now = this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now); // start low
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.03, now + 0.05);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        this.riseToneOsc = osc;
        this.riseToneGain = gain;
    }

    public updateRiseToneProgress = (pct: number) => {
        if (!this.audioContext || !this.riseToneOsc || !this.riseToneGain) return;
        const now = this.audioContext.currentTime;
        const clamped = Math.max(0, Math.min(1, pct));
        const freq = 200 + clamped * 2000; // 200Hz ➜ 2200Hz
        const gainValue = 0.03 + clamped * 0.09; // subtle increase
        this.riseToneOsc.frequency.cancelScheduledValues(now);
        this.riseToneOsc.frequency.linearRampToValueAtTime(freq, now + 0.05);
        this.riseToneGain.gain.cancelScheduledValues(now);
        this.riseToneGain.gain.linearRampToValueAtTime(gainValue, now + 0.05);
    }

    public stopRiseTone = () => {
        if (!this.audioContext || !this.riseToneOsc || !this.riseToneGain) return;
        const now = this.audioContext.currentTime;
        this.riseToneGain.gain.cancelScheduledValues(now);
        this.riseToneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

        // Capture references before nulling
        const osc = this.riseToneOsc;
        const gain = this.riseToneGain;
        this.riseToneOsc = null;
        this.riseToneGain = null;

        setTimeout(() => {
            try { osc.stop(); } catch {}
            try { osc.disconnect(); } catch {}
            try { gain.disconnect(); } catch {}
        }, 90);
    }

    public playCellphoneBeep = () => {
        if (!this.audioContext || !this.masterGain) return;
        this.resumeContext();
        const now = this.audioContext.currentTime;
        const beepDuration = 0.15;
        const pauseDuration = 0.1;

        const createBeep = (startTime: number) => {
            if (!this.audioContext || !this.masterGain) return;
            const osc = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(2200, startTime);
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + beepDuration);
            osc.connect(gainNode);
            gainNode.connect(this.masterGain);
            osc.start(startTime);
            osc.stop(startTime + beepDuration);
        };

        createBeep(now);
        createBeep(now + beepDuration + pauseDuration);
    }

    public playBetSound = () => {
        // No-op implementation to remove thud/click sounds
        return;
    }

    public playDoorOpenSound = () => {
        if (!this.audioContext || !this.masterGain) return;
        this.resumeContext();
        const now = this.audioContext.currentTime;
        const duration = 0.4;

        // Low hum
        const humOsc1 = this.audioContext.createOscillator();
        const humOsc2 = this.audioContext.createOscillator();
        const humGain = this.audioContext.createGain();
        const humFilter = this.audioContext.createBiquadFilter();
        humOsc1.type = 'sawtooth';
        humOsc2.type = 'sawtooth';
        humOsc1.frequency.value = 60;
        humOsc2.frequency.value = 61; // For a phasing effect
        humFilter.type = 'lowpass';
        humFilter.frequency.value = 200;
        humGain.gain.setValueAtTime(0, now + 0.03);
        humGain.gain.linearRampToValueAtTime(0.05, now + 0.1);
        humGain.gain.linearRampToValueAtTime(0, now + duration - 0.05);
        humOsc1.connect(humFilter);
        humOsc2.connect(humFilter);
        humFilter.connect(humGain);
        humGain.connect(this.masterGain);
        humOsc1.start(now + 0.03);
        humOsc2.start(now + 0.03);
        humOsc1.stop(now + duration);
        humOsc2.stop(now + duration);

        // Whoosh sound
        const noise = this.audioContext.createBufferSource();
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
        noise.buffer = buffer;
        const bandpass = this.audioContext.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.Q.value = 2;
        bandpass.frequency.setValueAtTime(500, now + 0.05);
        bandpass.frequency.exponentialRampToValueAtTime(3000, now + duration);
        const whooshGain = this.audioContext.createGain();
        whooshGain.gain.setValueAtTime(0, now + 0.05);
        whooshGain.gain.linearRampToValueAtTime(0.15, now + 0.1);
        whooshGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        noise.connect(bandpass);
        bandpass.connect(whooshGain);
        whooshGain.connect(this.masterGain);
        noise.start(now + 0.05);
        noise.stop(now + duration);

        // Servo sound
        const servoOsc = this.audioContext.createOscillator();
        const servoGain = this.audioContext.createGain();
        servoOsc.type = 'sine';
        servoOsc.frequency.setValueAtTime(200, now + 0.05);
        servoOsc.frequency.linearRampToValueAtTime(800, now + duration);
        servoGain.gain.setValueAtTime(0, now + 0.05);
        servoGain.gain.linearRampToValueAtTime(0.2, now + 0.1);
        servoGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        servoOsc.connect(servoGain);
        servoGain.connect(this.masterGain);
        servoOsc.start(now + 0.05);
        servoOsc.stop(now + duration);
    }
    
    public playDoorCloseSound = () => {
        if (!this.audioContext || !this.masterGain) return;
        this.resumeContext();
        const now = this.audioContext.currentTime;
        const duration = 0.4;

        // Whoosh sound
        const noise = this.audioContext.createBufferSource();
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
        noise.buffer = buffer;

        const bandpass = this.audioContext.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.Q.value = 2;
        bandpass.frequency.setValueAtTime(3000, now);
        bandpass.frequency.exponentialRampToValueAtTime(500, now + duration - 0.05);
        const whooshGain = this.audioContext.createGain();
        whooshGain.gain.setValueAtTime(0, now);
        whooshGain.gain.linearRampToValueAtTime(0.15, now + 0.05);
        whooshGain.gain.exponentialRampToValueAtTime(0.0001, now + duration - 0.05);
        noise.connect(bandpass);
        bandpass.connect(whooshGain);
        whooshGain.connect(this.masterGain);
        noise.start(now);
        noise.stop(now + duration);

        // Servo sound
        const servoOsc = this.audioContext.createOscillator();
        const servoGain = this.audioContext.createGain();
        servoOsc.type = 'sine';
        servoOsc.frequency.setValueAtTime(800, now);
        servoOsc.frequency.linearRampToValueAtTime(200, now + duration - 0.05);
        servoGain.gain.setValueAtTime(0, now);
        servoGain.gain.linearRampToValueAtTime(0.2, now + 0.05);
        servoGain.gain.exponentialRampToValueAtTime(0.0001, now + duration - 0.05);
        servoOsc.connect(servoGain);
        servoGain.connect(this.masterGain);
        servoOsc.start(now);
        servoOsc.stop(now + duration);
    }

    public startBackgroundMusic = () => {
        if (!this.audioContext || !this.masterGain || !this.musicFilter) return;
        if (this.backgroundMusicSource || this.proceduralMusicNodes) return; // Already playing
        this.resumeContext();

        // Prioritize user-loaded music
        if (this.backgroundMusicBuffer) {
            this.backgroundMusicSource = this.audioContext.createBufferSource();
            this.backgroundMusicSource.buffer = this.backgroundMusicBuffer;
            this.backgroundMusicSource.loop = true;
            this.backgroundMusicSource.connect(this.musicFilter);
            this.backgroundMusicSource.start(0);
            return;
        }

        // --- Adrenaline-Driven Synthwave Track ---
        const now = this.audioContext.currentTime;
        const stepDuration = 60 / this.bpm / 4; // 16th note duration

        // --- Instruments ---
        const proceduralMasterGain = this.audioContext.createGain();
        proceduralMasterGain.connect(this.musicFilter);

        // PADS: Create a lush, atmospheric pad sound
        const padGain = this.audioContext.createGain();
        padGain.gain.setValueAtTime(0, now);
        padGain.gain.linearRampToValueAtTime(0.15, now + 5); // Slow fade in
        padGain.connect(proceduralMasterGain);

        const padOsc1 = this.audioContext.createOscillator();
        const padOsc2 = this.audioContext.createOscillator();
        padOsc1.type = 'sawtooth';
        padOsc2.type = 'sawtooth';
        padOsc1.detune.value = -10; // Slightly detune for a thicker sound
        padOsc2.detune.value = 10;
        
        const padFilter = this.audioContext.createBiquadFilter();
        padFilter.type = 'lowpass';
        padFilter.frequency.value = 800;
        
        padOsc1.connect(padFilter);
        padOsc2.connect(padFilter);
        padFilter.connect(padGain);
        padOsc1.start(now);
        padOsc2.start(now);


        // BASS: Create a punchy, arpeggiated bassline
        const bassGain = this.audioContext.createGain();
        const bassFilter = this.audioContext.createBiquadFilter();
        const bassOsc = this.audioContext.createOscillator();
        bassOsc.type = 'sawtooth';
        bassFilter.type = 'lowpass';
        bassFilter.frequency.value = 600;
        bassFilter.Q.value = 5;
        bassOsc.connect(bassFilter);
        bassFilter.connect(bassGain);
        bassGain.connect(proceduralMasterGain);
        bassGain.gain.value = 0; // Start silent, triggered by sequencer
        bassOsc.start(now);


        // --- Sequencer ---
        let currentStep = 0;
        const notes = [55, 55, 62, 55, 60, 55, 62, 55, 58, 58, 65, 58, 63, 58, 65, 58]; // A hypnotic sequence
        const padNotes = [55, 58, 60, 53]; // Pad progression
        let padNoteIndex = 0;

        const playKick = (time: number) => {
            if (!this.audioContext || !this.masterGain) return;
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            osc.frequency.setValueAtTime(150, time);
            osc.frequency.exponentialRampToValueAtTime(0.001, time + 0.5);
            gain.gain.setValueAtTime(1, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
            osc.connect(gain);
            gain.connect(proceduralMasterGain);
            osc.start(time);
            osc.stop(time + 0.5);
        };
        
        const playSnare = (time: number) => {
             if (!this.audioContext || !this.masterGain) return;
             const noise = this.audioContext.createBufferSource();
             const bufferSize = this.audioContext.sampleRate;
             const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
             const data = buffer.getChannelData(0);
             for(let i=0; i<bufferSize; i++) data[i] = Math.random() * 2 - 1;
             noise.buffer = buffer;
             
             const filter = this.audioContext.createBiquadFilter();
             filter.type = 'highpass';
             filter.frequency.value = 1000;
             noise.connect(filter);
             
             const gain = this.audioContext.createGain();
             gain.gain.setValueAtTime(0.3, time);
             gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
             filter.connect(gain);
             gain.connect(proceduralMasterGain);
             noise.start(time);
             noise.stop(time + 0.2);
        };
        
        const playHiHat = (time: number) => {
             if (!this.audioContext || !this.masterGain) return;
             const osc = this.audioContext.createOscillator();
             osc.type = 'square';
             const filter = this.audioContext.createBiquadFilter();
             filter.type = 'highpass';
             filter.frequency.value = 7000;
             const gain = this.audioContext.createGain();
             gain.gain.setValueAtTime(0.1, time);
             gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
             osc.connect(filter);
             filter.connect(gain);
             gain.connect(proceduralMasterGain);
             osc.start(time);
             osc.stop(time + 0.05);
        };


        const sequencer = () => {
            if (!this.audioContext) return;
            const time = this.audioContext.currentTime;
            
            // --- Bass Arpeggiator ---
            const noteFreq = 2 ** ((notes[currentStep % notes.length] - 69) / 12) * 440;
            bassOsc.frequency.setValueAtTime(noteFreq, time);
            bassGain.gain.cancelScheduledValues(time);
            bassGain.gain.setValueAtTime(0.3, time);
            bassGain.gain.exponentialRampToValueAtTime(0.001, time + stepDuration * 0.9);

            // --- Drums ---
            // Removed kick sound per user request
            if (currentStep % 8 === 4) playSnare(time);
            if (currentStep % 2 !== 0) playHiHat(time);

            // --- Speech Sequencer Logic ---
            if (this.cancelNext) {
                this.cancelNext = false; // Consume flag
                if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel(); // This should trigger onend for the current utterance
                }
                // Purge any remaining low-priority jobs. The high-priority job is preserved at the front.
                this.speechQueue = this.speechQueue.filter(j => j.highPriority);
            }

            // Check for queued speech on every sequencer step to ensure responsiveness.
            if (!this.isSpeakingFromQueue && this.speechQueue.length > 0) {
                const job = this.speechQueue.shift();
                if (job) {
                    this.isSpeakingFromQueue = true;
                    // Removed delay for faster response
                    (async () => {
                        if (this.voiceLoadPromise) {
                            await this.voiceLoadPromise;
                            await this.resumeContext();
                            this._executeSpeak(job.text, job.highPriority, job.onEnd);
                        }
                    })();
                }
            }
            
            // --- Pad Progression ---
            if (currentStep % 16 === 0) {
                const padNoteFreq = 2 ** ((padNotes[padNoteIndex % padNotes.length] - 69) / 12) * 440 / 4;
                padOsc1.frequency.linearRampToValueAtTime(padNoteFreq, time + 0.1);
                padOsc2.frequency.linearRampToValueAtTime(padNoteFreq, time + 0.1);
                padNoteIndex++;
            }

            currentStep = (currentStep + 1) % 32;
        };

        const sequencerInterval = window.setInterval(sequencer, stepDuration * 1000);

        this.proceduralMusicNodes = { sequencerInterval, masterGain: proceduralMasterGain, bassOsc, bassGain, padOsc1, padOsc2, padGain };
    }


    public stopBackgroundMusic = () => {
        if (this.backgroundMusicSource) {
            this.backgroundMusicSource.stop(0);
            this.backgroundMusicSource.disconnect();
            this.backgroundMusicSource = null;
        }
        if (this.proceduralMusicNodes) {
            const now = this.audioContext?.currentTime ?? 0;
            const { sequencerInterval, masterGain, bassOsc, bassGain, padOsc1, padOsc2, padGain } = this.proceduralMusicNodes;

            if (sequencerInterval) clearInterval(sequencerInterval);
            
            masterGain.gain.cancelScheduledValues(now);
            masterGain.gain.setValueAtTime(masterGain.gain.value, now);
            masterGain.gain.linearRampToValueAtTime(0, now + 1.0);

            setTimeout(() => {
                bassOsc.stop();
                padOsc1.stop();
                padOsc2.stop();
                bassOsc.disconnect();
                bassGain.disconnect();
                padOsc1.disconnect();
                padOsc2.disconnect();
                padGain.disconnect();
                masterGain.disconnect();
            }, 1000);

            this.proceduralMusicNodes = null;
        }
    }

    private _playRadioStatic = () => {
        if (!this.audioContext || !this.masterGain) return;
        const now = this.audioContext.currentTime;
        const duration = 0.1;
    
        const noise = this.audioContext.createBufferSource();
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
        noise.buffer = buffer;
    
        const bandpass = this.audioContext.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 4000;
        bandpass.Q.value = 15;
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.25, now); // Increased from 0.2
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        
        noise.connect(bandpass);
        bandpass.connect(gain);
        gain.connect(this.masterGain);
        noise.start(now);
        noise.stop(now + duration);
    }
    
    private _playGlitchSound = () => {
        if (!this.audioContext || !this.masterGain) return;
        const now = this.audioContext.currentTime;
        const duration = Math.random() * 0.03 + 0.02; // 20-50ms
    
        const osc = this.audioContext.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(3000 + Math.random() * 2000, now); // Increased frequency
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + duration);
    }
    
    private _playDubEcho = () => {
        if (!this.audioContext || !this.masterGain) return;
        const now = this.audioContext.currentTime;
        const delayTime = (60 / this.bpm) * 0.75; // Dotted eighth note delay, synced to the beat
        const feedback = 0.5; // Increased from 0.4
        let gainValue = 0.2; // Increased from 0.15
    
        for (let i = 0; i < 4; i++) {
            const time = now + (i * delayTime);
            const duration = 0.1;
            
            const noise = this.audioContext.createBufferSource();
            const bufferSize = this.audioContext.sampleRate * duration;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const data = buffer.getChannelData(0);
            for (let j = 0; j < bufferSize; j++) { data[j] = Math.random() * 2 - 1; }
            noise.buffer = buffer;
    
            const bandpass = this.audioContext.createBiquadFilter();
            bandpass.type = 'bandpass';
            bandpass.frequency.value = 1500;
            bandpass.Q.value = 5;
    
            const gain = this.audioContext.createGain();
            gain.gain.setValueAtTime(gainValue, time);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    
            noise.connect(bandpass);
            bandpass.connect(gain);
            gain.connect(this.masterGain);
            noise.start(time);
            noise.stop(time + duration);
            
            gainValue *= feedback;
        }
    }
}

export const audioService = new AudioService();
