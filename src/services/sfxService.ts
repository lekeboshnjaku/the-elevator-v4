/**
 * SFX Service - Handles sound effects for UI interactions
 * Uses standard HTML5 Audio elements for cross-browser compatibility
 */

class SfxService {
  private activateSound: HTMLAudioElement;
  private deactivateSound: HTMLAudioElement;
  private volume: number = 0.5; // Moderate default volume
  
  constructor() {
    // Create and configure audio elements
    this.activateSound = new Audio('assets/sfx/activate.wav');
    this.deactivateSound = new Audio('assets/sfx/deactivate.wav');
    
    // Configure both audio elements
    [this.activateSound, this.deactivateSound].forEach(audio => {
      audio.preload = 'auto';     // Preload audio files
      audio.loop = false;         // Ensure one-shot playback
      audio.volume = this.volume; // Set initial volume
    });
    
    // Preload audio files
    this.preload();
  }
  
  /**
   * Preload audio files to ensure immediate playback
   */
  private preload(): void {
    // Force preload by loading a bit of each file
    this.activateSound.load();
    this.deactivateSound.load();
  }
  
  /**
   * Set volume for all sound effects
   * @param level Volume level between 0.0 and 1.0
   */
  public setVolume(level: number): void {
    // Clamp volume between 0 and 1
    this.volume = Math.max(0, Math.min(1, level));
    
    // Apply to all audio elements
    this.activateSound.volume = this.volume;
    this.deactivateSound.volume = this.volume;
  }
  
  /**
   * Play the activation sound (when Elevate Mode is turned ON)
   */
  public playActivate(): void {
    this.playSoundOneShot(this.activateSound);
  }
  
  /**
   * Play the deactivation sound (when Elevate Mode is turned OFF)
   */
  public playDeactivate(): void {
    this.playSoundOneShot(this.deactivateSound);
  }
  
  /**
   * Helper method to ensure one-shot playback of a sound
   * @param audio The audio element to play
   */
  private playSoundOneShot(audio: HTMLAudioElement): void {
    // Ensure we're not already playing
    audio.pause();
    
    // Reset to beginning
    audio.currentTime = 0;
    
    // Play and ignore promise rejection (for autoplay policy or missing file)
    // This prevents console errors while still attempting playback
    audio.play().catch(() => {
      // Silently ignore autoplay policy restrictions or missing files
      // These can happen on mobile or if assets aren't available
    });
  }
}

// Export a singleton instance
export const sfxService = new SfxService();
