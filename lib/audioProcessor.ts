/**
 * Audio Processor with RNNoise-based AI Noise Suppression
 * 
 * This utility provides AI-powered noise cancellation for microphone audio streams
 * using the @sapphi-red/web-noise-suppressor library (RNNoise).
 * 
 * Features:
 * - Removes background noise (keyboard, fans, traffic, etc.)
 * - Preserves voice quality
 * - Lightweight and efficient
 * - Works in real-time
 */

// Only import in browser environment
let loadRnnoise: any;
let RnnoiseWorkletNode: any;

if (typeof window !== 'undefined') {
  const module = require('@sapphi-red/web-noise-suppressor');
  loadRnnoise = module.loadRnnoise;
  RnnoiseWorkletNode = module.RnnoiseWorkletNode;
}

let wasmBinary: ArrayBuffer | null = null;
let isInitialized = false;
let audioContext: AudioContext | null = null;

/**
 * Initialize the noise suppressor
 * Only needs to be called once per session
 */
export async function initializeNoiseSuppressor(): Promise<void> {
  // Skip if not in browser environment
  if (typeof window === 'undefined' || !loadRnnoise || !RnnoiseWorkletNode) {
    console.warn('⚠️ Noise suppressor not available in server environment');
    return;
  }
  
  if (isInitialized) return;
  
  try {
    console.log('🎙️ Initializing AI noise suppressor...');
    
    // Load the RNNoise WASM binary
    wasmBinary = await loadRnnoise({
      url: 'https://cdn.jsdelivr.net/npm/@sapphi-red/web-noise-suppressor@0.3.5/dist/rnnoise.wasm',
      simdUrl: 'https://cdn.jsdelivr.net/npm/@sapphi-red/web-noise-suppressor@0.3.5/dist/rnnoise-simd.wasm',
    });
    
    isInitialized = true;
    console.log('✅ AI noise suppressor initialized');
  } catch (error) {
    console.error('❌ Failed to initialize noise suppressor:', error);
    throw error;
  }
}

/**
 * Apply noise suppression to an audio stream
 * 
 * @param audioStream - The original MediaStream from the microphone
 * @returns A new MediaStream with noise suppression applied
 */
export async function applyNoiseSuppression(
  audioStream: MediaStream
): Promise<MediaStream> {
  // Skip if not in browser environment
  if (typeof window === 'undefined' || !RnnoiseWorkletNode) {
    console.warn('⚠️ Noise suppressor not available, returning original stream');
    return audioStream;
  }
  
  // Ensure noise suppressor is initialized
  if (!isInitialized) {
    await initializeNoiseSuppressor();
  }

  if (!wasmBinary) {
    console.warn('⚠️ Noise suppressor not available, returning original stream');
    return audioStream;
  }

  try {
    console.log('🔧 Applying noise suppression to audio stream...');
    
    // Create or reuse AudioContext
    if (!audioContext) {
      audioContext = new AudioContext();
    }

    // Get the audio track
    const audioTrack = audioStream.getAudioTracks()[0];
    if (!audioTrack) {
      console.warn('⚠️ No audio track found');
      return audioStream;
    }

    // Create a MediaStreamSource from the input stream
    const source = audioContext.createMediaStreamSource(audioStream);
    
    // Create RNNoise worklet node
    const rnnoiseNode = new RnnoiseWorkletNode(audioContext, {
      maxChannels: 1, // Mono audio for voice
      wasmBinary: wasmBinary,
    });

    // Connect: source -> rnnoise -> destination
    source.connect(rnnoiseNode);
    
    // Create a MediaStreamDestination to get the processed audio
    const destination = audioContext.createMediaStreamDestination();
    rnnoiseNode.connect(destination);
    
    console.log('✅ Noise suppression applied successfully');
    return destination.stream;
  } catch (error) {
    console.error('❌ Failed to apply noise suppression:', error);
    // Return original stream if processing fails
    return audioStream;
  }
}

/**
 * Process microphone audio with noise suppression
 * This is a convenience function that gets the microphone and applies noise suppression
 * 
 * @param constraints - MediaTrackConstraints for the microphone
 * @returns A MediaStream with noise-suppressed audio
 */
export async function getProcessedMicrophoneAudio(
  constraints: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true, // Browser's built-in first
    autoGainControl: true,
  }
): Promise<MediaStream> {
  try {
    // Get the raw microphone stream
    const rawStream = await navigator.mediaDevices.getUserMedia({
      audio: constraints,
      video: false,
    });

    // Apply AI noise suppression on top of browser's processing
    const processedStream = await applyNoiseSuppression(rawStream);
    
    return processedStream;
  } catch (error) {
    console.error('❌ Failed to get processed microphone audio:', error);
    throw error;
  }
}

/**
 * Check if noise suppression is available
 */
export function isNoiseSuppressionAvailable(): boolean {
  return isInitialized && wasmBinary !== null;
}

/**
 * Cleanup the noise suppressor
 * Call this when the component unmounts or audio session ends
 */
export function cleanupNoiseSuppressor(): void {
  try {
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
    wasmBinary = null;
    isInitialized = false;
    console.log('🧹 Noise suppressor cleaned up');
  } catch (error) {
    console.error('❌ Error cleaning up noise suppressor:', error);
  }
}
