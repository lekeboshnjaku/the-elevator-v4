/**
 * generate-sfx.js
 * 
 * Generates two sound effects for the Elevate Mode toggle:
 * - activate.wav: power-up swoosh (rising pitch)
 * - deactivate.wav: power-down swoosh (falling pitch)
 * 
 * Writes files to both assets/sfx and stake_engine_upload/frontend/assets/sfx
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SAMPLE_RATE = 44100;
const DURATION_MS = 350;
const SAMPLE_COUNT = Math.floor(SAMPLE_RATE * (DURATION_MS / 1000));
const BIT_DEPTH = 16;
const MAX_AMPLITUDE = Math.pow(2, BIT_DEPTH - 1) - 1; // For 16-bit audio

/**
 * Writes PCM audio data as a WAV file
 * @param {string} filePath - Path to write the WAV file
 * @param {Int16Array} samples - Audio samples (16-bit PCM)
 * @param {number} sampleRate - Sample rate in Hz
 */
function writeWav(filePath, samples, sampleRate) {
  // Ensure the directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Calculate sizes for WAV header
  const dataSize = samples.length * 2; // 16-bit = 2 bytes per sample
  const fileSize = 36 + dataSize; // 44 - 8 bytes for the header

  // Create buffer for the WAV file
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF chunk descriptor
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(fileSize, 4);
  buffer.write('WAVE', 8);

  // "fmt " sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Sub-chunk size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // Audio format (1 for PCM)
  buffer.writeUInt16LE(1, 22); // Num channels (1 for mono)
  buffer.writeUInt32LE(sampleRate, 24); // Sample rate
  buffer.writeUInt32LE(sampleRate * 2, 28); // Byte rate (SampleRate * NumChannels * BitsPerSample/8)
  buffer.writeUInt16LE(2, 32); // Block align (NumChannels * BitsPerSample/8)
  buffer.writeUInt16LE(BIT_DEPTH, 34); // Bits per sample

  // "data" sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Write audio samples
  for (let i = 0; i < samples.length; i++) {
    buffer.writeInt16LE(samples[i], 44 + i * 2);
  }

  // Write the file
  fs.writeFileSync(filePath, buffer);
  console.log(`Created ${filePath}`);
}

/**
 * Generates a sine wave with frequency sweep
 * @param {number} startFreq - Starting frequency in Hz
 * @param {number} endFreq - Ending frequency in Hz
 * @param {number} sampleCount - Number of samples to generate
 * @param {Function} envelopeFunc - Function to calculate amplitude envelope
 * @returns {Int16Array} - Generated samples
 */
function generateSweep(startFreq, endFreq, sampleCount, envelopeFunc) {
  const samples = new Int16Array(sampleCount);
  let phase = 0;

  for (let i = 0; i < sampleCount; i++) {
    // Calculate the current frequency based on position
    const t = i / sampleCount;
    const currentFreq = startFreq + (endFreq - startFreq) * t;
    
    // Calculate phase increment for this sample
    const phaseIncrement = 2 * Math.PI * currentFreq / SAMPLE_RATE;
    
    // Advance phase
    phase += phaseIncrement;
    
    // Get envelope amplitude (0.0 to 1.0)
    const envelope = envelopeFunc(t);
    
    // Generate sine wave with envelope
    samples[i] = Math.sin(phase) * envelope * MAX_AMPLITUDE;
  }

  return samples;
}

/**
 * Adds noise component to samples
 * @param {Int16Array} samples - Base samples to add noise to
 * @param {number} amount - Noise amount (0.0 to 1.0)
 * @param {Function} envelopeFunc - Envelope function for noise
 */
function addNoise(samples, amount, envelopeFunc) {
  for (let i = 0; i < samples.length; i++) {
    const t = i / samples.length;
    const envelope = envelopeFunc(t);
    const noise = (Math.random() * 2 - 1) * MAX_AMPLITUDE * amount * envelope;
    
    // Add noise to existing sample (with clipping protection)
    samples[i] = Math.max(-MAX_AMPLITUDE, Math.min(MAX_AMPLITUDE, samples[i] + noise));
  }
}

/**
 * Generates activate.wav (power-up sound)
 * @returns {Int16Array} - Generated samples
 */
function generateActivateSound() {
  // Envelope function for the activate sound (fast attack, smooth decay)
  const activateEnvelope = (t) => {
    // Fast attack in first 10%
    if (t < 0.1) {
      return t * 10;
    }
    // Smooth decay for the rest
    return 1.0 - (t - 0.1) * 1.1;
  };
  
  // Noise envelope (stronger at start, fades quickly)
  const noiseEnvelope = (t) => {
    if (t < 0.2) {
      return 0.3 * (1 - t * 5);
    }
    return 0;
  };

  // Generate rising frequency sweep (200Hz to 4000Hz)
  const samples = generateSweep(200, 4000, SAMPLE_COUNT, activateEnvelope);
  
  // Add a touch of noise for texture
  addNoise(samples, 0.2, noiseEnvelope);
  
  return samples;
}

/**
 * Generates deactivate.wav (power-down sound)
 * @returns {Int16Array} - Generated samples
 */
function generateDeactivateSound() {
  // Envelope function for the deactivate sound (gentle fade)
  const deactivateEnvelope = (t) => {
    // Start at full volume
    if (t < 0.05) {
      return 1.0;
    }
    // Gentle fade out
    return 1.0 - ((t - 0.05) * 1.05);
  };
  
  // Noise envelope (subtle throughout)
  const noiseEnvelope = (t) => {
    return 0.1 * (1 - t);
  };

  // Generate falling frequency sweep (3000Hz to 200Hz)
  const samples = generateSweep(3000, 200, SAMPLE_COUNT, deactivateEnvelope);
  
  // Add a touch of noise for texture
  addNoise(samples, 0.15, noiseEnvelope);
  
  return samples;
}

/**
 * Writes a sound file to multiple destinations
 * @param {string} filename - Base filename
 * @param {Int16Array} samples - Audio samples
 * @param {Array<string>} destRoots - Destination root directories
 */
function writeSoundToDestinations(filename, samples, destRoots) {
  destRoots.forEach(root => {
    const sfxDir = path.join(root, 'assets', 'sfx');
    const filePath = path.join(sfxDir, filename);
    writeWav(filePath, samples, SAMPLE_RATE);
  });
}

// Main execution
try {
  console.log('Generating sound effects...');
  
  // Define destination roots
  const projectRoot = path.resolve(__dirname, '..');
  const destRoots = [
    projectRoot,
    path.join(projectRoot, 'stake_engine_upload', 'frontend')
  ];
  
  // Generate and write activate sound
  const activateSamples = generateActivateSound();
  writeSoundToDestinations('activate.wav', activateSamples, destRoots);
  
  // Generate and write deactivate sound
  const deactivateSamples = generateDeactivateSound();
  writeSoundToDestinations('deactivate.wav', deactivateSamples, destRoots);
  
  console.log('Sound effects generated successfully!');
} catch (error) {
  console.error('Error generating sound effects:', error);
  process.exit(1);
}
