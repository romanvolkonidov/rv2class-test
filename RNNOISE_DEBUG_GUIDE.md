# RNNoise Audio Debugging Guide

## Current Issue
RNNoise initializes successfully with all validation checks passing (green checkmarks), but produces **completely silent audio**. Screen share audio works perfectly (bypasses RNNoise), confirming LiveKit audio transmission is functional. The issue is isolated to the RNNoise processing pipeline.

## Debugging Tools Added

### 1. **Audio Level Monitoring** 🔍
Automatically monitors audio levels before and after RNNoise processing for 10 seconds after joining a room.

**Console Output:**
- `🔊 INPUT audio level (before RNNoise): X` - Audio detected at microphone
- `🔊 OUTPUT audio level (after RNNoise): X` - Audio detected after processing
- `❌ RNNoise is producing SILENT output despite audio input!` - RNNoise is the problem point

**What to look for:**
- **INPUT > 5, OUTPUT = 0**: RNNoise worklet is killing the audio
- **INPUT = 0**: Microphone permission or hardware issue
- **Both > 5**: Audio is flowing correctly (LiveKit issue)

### 2. **RNNoise Bypass Mode** 🔧
Test raw microphone audio without RNNoise processing to isolate the problem.

**How to Enable:**
1. As **tutor**, open the microphone device menu
2. Click **"🔧 Debug: Toggle RNNoise Bypass"** button at the bottom
3. Refresh the page
4. Your raw microphone audio will be used (no noise cancellation)

**Purpose:**
- Confirm that raw audio through LiveKit works (should match screen share success)
- Isolate whether RNNoise or LiveKit is the problem
- If bypass works → RNNoise worklet is broken
- If bypass fails → LiveKit mic publishing is broken

**To Disable:**
1. Click the button again to toggle back
2. Refresh the page

### 3. **localStorage Flags**
You can manually set these in browser console:

```javascript
// Enable RNNoise bypass (raw audio)
localStorage.setItem('bypassRnnoise', 'true');

// Disable RNNoise bypass (use RNNoise processing)
localStorage.setItem('bypassRnnoise', 'false');

// Enable AI noise cancellation (default)
localStorage.setItem('aiNoiseCancellation', 'true');

// Disable AI noise cancellation (use raw audio)
localStorage.setItem('aiNoiseCancellation', 'false');
```

## Diagnostic Steps

### Step 1: Check Audio Levels
1. Join the room as tutor with microphone enabled
2. Make noise (speak, clap, keyboard typing)
3. Watch console for 10 seconds
4. Look for `🔊 INPUT` and `🔊 OUTPUT` messages

**Expected Behavior:**
- INPUT should show levels > 5 when you make noise
- OUTPUT should also show levels > 5

**Current Behavior:**
- INPUT shows levels > 5 ✅
- OUTPUT shows 0 (silent) ❌
- Error: `❌ RNNoise is producing SILENT output despite audio input!`

### Step 2: Test Bypass Mode
1. Enable bypass mode via the debug button
2. Refresh page and join room
3. Test if you can hear your microphone

**If bypass works:**
- ✅ LiveKit audio transmission is OK (matches screen share success)
- ❌ RNNoise worklet is the problem (either WASM not executing or processing error)

**If bypass fails:**
- ❌ LiveKit microphone publishing is broken (separate issue)
- ℹ️ Screen share audio works, so LiveKit audio itself is functional

### Step 3: Check Console Logs
Look for these validation messages:

**RNNoise Initialization:**
```
🎙️ Initializing AI noise suppressor...
✅ AI noise suppressor initialized
```

**Audio Graph Setup:**
```
✅ Created AudioContext: { sampleRate: 48000, state: 'running' }
✅ Loaded RNNoise AudioWorklet module
✅ MediaStreamSource created
✅ RNNoise worklet node created
✅ MediaStreamDestination created
✅ Connected: source -> inputAnalyser
✅ Connected: inputAnalyser -> RNNoise
✅ Connected: RNNoise -> outputAnalyser
✅ Connected: outputAnalyser -> destination
📊 Audio graph: Microphone → MediaStreamSource → InputAnalyser → RNNoise → OutputAnalyser → MediaStreamDestination → LiveKit
🔍 Audio level monitoring active for 10 seconds...
```

**Stream Validation:**
```
✅ Got raw microphone stream (48kHz): {
  enabled: true,
  muted: false,
  readyState: 'live',
  settings: { ... }
}
🎤 Input stream validation: { enabled: true, muted: false, readyState: 'live' }
🔊 Output stream validation: { enabled: true, muted: false, readyState: 'live' }
```

**ALL CHECKS PASS** = Audio graph is correctly built, but RNNoise worklet isn't processing

## Technical Analysis

### Audio Pipeline
```
Microphone (48kHz mono)
    ↓
getUserMedia() - raw stream with browser processing disabled
    ↓
MediaStreamSource - converts to AudioContext
    ↓
AnalyserNode (INPUT) - monitors raw audio levels
    ↓
RnnoiseWorkletNode - AI noise suppression (WASM)
    ↓
AnalyserNode (OUTPUT) - monitors processed audio levels
    ↓
MediaStreamDestination - converts back to MediaStream
    ↓
LiveKit - publishes to other participants
```

### Validation Results
- ✅ **AudioContext**: Created at 48kHz, state = running
- ✅ **WASM Loading**: Both regular and SIMD binaries load successfully
- ✅ **Worklet Module**: AudioWorklet registers without errors
- ✅ **Node Creation**: RnnoiseWorkletNode creates successfully
- ✅ **Connections**: All audio nodes connect without errors
- ✅ **Stream Validation**: Input and output tracks show enabled, unmuted, live
- ✅ **LiveKit Publishing**: Track publishes successfully
- ❌ **Audio Data Flow**: INPUT has audio, OUTPUT is silent

### Hypothesis
The RnnoiseWorkletNode is **not actually processing audio data** despite:
- WASM binary loading successfully
- AudioWorklet module registering successfully
- Node connections being valid
- No JavaScript errors

**Possible causes:**
1. WASM not executing (loads but doesn't run)
2. AudioWorklet processor silently failing internally
3. Sample rate mismatch despite requesting 48kHz
4. Buffer size or timing issue in worklet
5. WASM expecting different audio format/channels

## Next Steps to Try

### Option 1: Verify Sample Rates Match
Add to console logs:
```javascript
console.log('Actual sample rates:', {
  context: audioContext.sampleRate,
  input: rawStream.getAudioTracks()[0].getSettings().sampleRate
});
```

### Option 2: Test with Browser Noise Suppression
Change getUserMedia constraints:
```javascript
audio: {
  sampleRate: 48000,
  channelCount: 1,
  echoCancellation: true,    // Enable browser processing
  noiseSuppression: true,
  autoGainControl: true,
}
```

### Option 3: Try Alternative RNNoise Package
Switch from `@sapphi-red/web-noise-suppressor` to `rnnoise-wasm` package.

### Option 4: Implement Fallback Mode
If RNNoise can't be fixed, implement automatic fallback:
- Try RNNoise first
- If output is silent after 2 seconds, automatically switch to raw audio
- Show notification: "AI noise cancellation unavailable, using raw audio"

## Temporary Workaround

**For users needing audio NOW:**
1. Enable bypass mode (Debug button in mic menu)
2. Use browser's built-in noise suppression:
   - Chrome: Settings → Privacy and security → Site Settings → Microphone
   - Enable "Noise cancellation" in browser
3. Or use external tools like Krisp, RTX Voice, etc.

## Success Criteria
- ✅ INPUT audio level > 5
- ✅ OUTPUT audio level > 5
- ✅ Other participants can hear you clearly
- ✅ Background noise is reduced (keyboard, fan, etc.)

## Current Status
- 🟢 **Build**: No errors
- 🟢 **Initialization**: Successful
- 🟢 **Connections**: Valid
- 🔴 **Audio Output**: Silent
- 🟢 **Screen Share**: Working (bypasses RNNoise)
- ⏳ **Bypass Test**: Pending user testing
