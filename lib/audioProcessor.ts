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
let workletLoaded = false;
let audioContextResumed = false;

// CRITICAL: Set up global click handler to resume AudioContext (Chrome autoplay policy)
if (typeof window !== 'undefined') {
  const resumeAudioContext = async () => {
    if (audioContext && audioContext.state === 'suspended' && !audioContextResumed) {
      try {
        await audioContext.resume();
        audioContextResumed = true;
        console.log('✅ AudioContext resumed after user gesture');
      } catch (err) {
        console.error('❌ Failed to resume AudioContext:', err);
      }
    }
  };

  // Resume on any click
  document.addEventListener('click', resumeAudioContext, { once: false });
  // Also try on keypress and touchstart for mobile
  document.addEventListener('keypress', resumeAudioContext, { once: false });
  document.addEventListener('touchstart', resumeAudioContext, { once: false });
}

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
      simdUrl: 'https://cdn.jsdelivr.net/npm/@sapphi-red/web-noise-suppressor@0.3.5/dist/rnnoise_simd.wasm',
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
        audioContext = new AudioContext({ sampleRate: 48000 }); // RNNoise requires 48kHz
        console.log(`✅ AudioContext created (48kHz), state: ${audioContext.state}`);
      } catch (audioContextError) {
        console.error('❌ Failed to create AudioContext:', audioContextError);
        throw audioContextError;
      }
    }

    // CRITICAL: Resume AudioContext if suspended (Chrome autoplay policy)
    if (audioContext.state === 'suspended') {
      console.log('⏸️ AudioContext is suspended, resuming...');
      await audioContext.resume();
      console.log(`✅ AudioContext resumed, state: ${audioContext.state}`);
    }

    // Load AudioWorklet module (only once)
    if (!workletLoaded) {
      console.log('📦 Loading RNNoise AudioWorklet module...');
      const workletPath = new URL(
        '@sapphi-red/web-noise-suppressor/rnnoiseWorklet.js',
        import.meta.url
      ).href;
      await audioContext.audioWorklet.addModule(workletPath);
      workletLoaded = true;
      console.log('✅ AudioWorklet module loaded');
    }

    // Get the audio track
    const audioTrack = audioStream.getAudioTracks()[0];
    if (!audioTrack) {
      console.warn('⚠️ No audio track found');
      return audioStream;
    }

    // Validate input stream
    console.log('🎤 Input stream validation:', {
      enabled: audioTrack.enabled,
      muted: audioTrack.muted,
      readyState: audioTrack.readyState,
      label: audioTrack.label
    });

    // Create a MediaStreamSource from the input stream
    const source = audioContext.createMediaStreamSource(audioStream);
    console.log('✅ MediaStreamSource created');
    
    // Create RNNoise worklet node
    console.log('🎛️ Creating RNNoise worklet node...');
    const rnnoiseNode = new RnnoiseWorkletNode(audioContext, {
      maxChannels: 1, // Mono audio for voice
      wasmBinary: wasmBinary!,
    });
    console.log('✅ RNNoise worklet node created');

    // CRITICAL: Create destination BEFORE connecting
    const destination = audioContext.createMediaStreamDestination();
    console.log('✅ MediaStreamDestination created');

    // Connect the audio graph: source -> RNNoise -> destination
    source.connect(rnnoiseNode);
    console.log('✅ Connected: source -> RNNoise');
    
    rnnoiseNode.connect(destination);
    console.log('✅ Connected: RNNoise -> destination');

    // Validate output stream
    const outputTrack = destination.stream.getAudioTracks()[0];
    if (outputTrack) {
      console.log('🔊 Output stream validation:', {
        enabled: outputTrack.enabled,
        muted: outputTrack.muted,
        readyState: outputTrack.readyState,
        label: outputTrack.label
      });
    } else {
      console.error('❌ No output audio track!');
      return audioStream;
    }
    
    console.log('✅ Noise suppression applied successfully');
    console.log('📊 Audio graph: Microphone → MediaStreamSource → RNNoise → MediaStreamDestination → LiveKit');
    
    return destination.stream;
  } catch (error) {
    console.error('❌ Failed to apply noise suppression:', error);
    console.log('⚠️ Falling back to original audio stream');
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

    // Get RAW microphone audio - CRITICAL: Must be 48kHz for RNNoise
    const rawStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        // CRITICAL: RNNoise REQUIRES 48kHz sample rate
        sampleRate: 48000,
        // Use MONO for better noise cancellation
        channelCount: 1,
        // Disable browser processing - let RNNoise handle everything
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      }
    });

    const rawTrack = rawStream.getAudioTracks()[0];
    console.log('✅ Got raw microphone stream (48kHz):', {
      enabled: rawTrack.enabled,
      muted: rawTrack.muted,
      readyState: rawTrack.readyState,
      settings: rawTrack.getSettings()
    });

    // Apply RNNoise processing - this returns a NEW stream from AudioContext
    const processedStream = await applyNoiseSuppression(rawStream);
    
    // Validate the processed stream
    const processedTrack = processedStream.getAudioTracks()[0];
    if (!processedTrack) {
      console.error('❌ No processed audio track! Falling back to raw stream.');
      return rawStream;
    }

    console.log('✅ Processed stream validation:', {
      enabled: processedTrack.enabled,
      muted: processedTrack.muted,
      readyState: processedTrack.readyState
    });
    
    // DON'T stop the raw stream - the AudioWorkletNode needs it to keep processing!
    // The raw stream is still active and feeding the AudioWorkletNode
    
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
