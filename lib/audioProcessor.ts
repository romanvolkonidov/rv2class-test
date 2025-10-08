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
    // IMPORTANT: AudioContext requires a user gesture, so this should only be called
    // after the user has interacted with the page (e.g., joining a room)
    if (!audioContext) {
      try {
        audioContext = new AudioContext();
        // Resume context if it's suspended (required by browser autoplay policy)
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        console.log('✅ AudioContext created and resumed');
      } catch (audioContextError) {
        console.error('❌ Failed to create AudioContext:', audioContextError);
        console.warn('⚠️ This usually means the page needs a user interaction first');
        throw audioContextError;
      }
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
 * Get processed microphone audio with RNNoise
 * This gets the raw microphone, applies RNNoise, and returns the processed stream
 * 
 * @param deviceId - Optional specific microphone device ID
 * @returns A MediaStream with noise-suppressed audio
 */
export async function getProcessedMicrophoneAudio(
  deviceId?: string
): Promise<MediaStream> {
  // Skip if not in browser environment
  if (typeof window === 'undefined' || !RnnoiseWorkletNode) {
    console.warn('⚠️ Noise suppressor not available, getting standard audio');
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: deviceId ? { deviceId: { exact: deviceId } } : true
    });
    return stream;
  }
  
  try {
    console.log('🎙️ Getting processed microphone audio with RNNoise...');
    
    // Initialize if needed
    if (!isInitialized) {
      await initializeNoiseSuppressor();
    }

    if (!wasmBinary) {
      console.warn('⚠️ WASM not loaded, using standard audio');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true
      });
      return stream;
    }

    // Get RAW microphone audio with minimal processing
    const rawStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        // Disable browser processing - let RNNoise do everything
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        // High quality settings
        sampleRate: 48000,
        channelCount: 1, // Mono for RNNoise
      }
    });

    console.log('✅ Got raw microphone stream');

    // Apply RNNoise processing
    const processedStream = await applyNoiseSuppression(rawStream);
    
    // Stop the raw track since we're using the processed one
    rawStream.getTracks().forEach(track => track.stop());
    
    console.log('✅ RNNoise processing applied successfully');
    return processedStream;
  } catch (error) {
    console.error('❌ Failed to get processed audio:', error);
    // Fallback to standard audio with browser processing
    console.log('⚠️ Falling back to standard audio with browser processing');
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }
    });
    return stream;
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
