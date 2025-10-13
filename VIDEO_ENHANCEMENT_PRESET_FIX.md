# Video Enhancement Preset Fix

## Issues Fixed

### 1. Frame Counter Growing Infinitely
**Problem**: The frame counter (`frameCount`) and start time were local variables inside the `startProcessing` method, initialized only once when the processor was created. They never reset, causing the frame count to grow infinitely.

**Solution**: 
- Moved `frameCount` and `startTime` to class instance variables
- Reset them in `attachToVideo()` method when a new processing session starts
- Now each time the processor is attached to a video, the counter resets

### 2. Preset Changes Not Updating Visual Enhancement
**Problem**: The `updateSettings()` method was empty, just a placeholder comment. When presets changed, the visual enhancement didn't change because:
- Settings were passed as a parameter to `startProcessing()` and captured in closure
- The render loop used those captured settings forever
- No way to update them dynamically

**Solution**:
- Added `settings` as a class instance variable
- Store settings when `attachToVideo()` is called
- Implemented `updateSettings()` to merge new settings into instance variable
- Modified render loop to use `this.settings` instead of closure parameter
- Now preset changes will actually update the visual enhancement in real-time

## Changes Made

### `/lib/videoEnhancement.ts`

1. **Added instance variables** (lines ~47-50):
```typescript
private settings: VideoEnhancementSettings = DEFAULT_SETTINGS;
private frameCount: number = 0;
private startTime: number = 0;
```

2. **Updated `attachToVideo()` method**:
   - Store settings as instance variable: `this.settings = { ...settings }`
   - Reset frame counter: `this.frameCount = 0`
   - Reset start time: `this.startTime = Date.now()`

3. **Updated `startProcessing()` method**:
   - Removed `settings` parameter
   - Removed local `frameCount` and `startTime` variables
   - Use `this.settings`, `this.frameCount`, `this.startTime` everywhere

4. **Implemented `updateSettings()` method**:
```typescript
public updateSettings(settings: Partial<VideoEnhancementSettings>) {
  this.settings = { ...this.settings, ...settings };
  console.log('🔄 Settings updated:', this.settings);
}
```

## Result

- ✅ Frame counter now resets properly when starting a new enhancement session
- ✅ Preset changes now actually update the video enhancement in real-time
- ✅ FPS counter shows accurate per-session metrics, not cumulative
- ✅ Settings can be dynamically updated without recreating the processor

## Testing

To test the fix:
1. Start a video call with enhancement enabled
2. Change between presets (Low Light, Outdoor Bright, etc.)
3. Observe:
   - Visual changes should be visible immediately
   - Frame counter should reset when processor restarts
   - FPS should be calculated per session, not cumulative

## Future Optimization

Currently in `app/room/page.tsx`, when a preset changes, the entire processor is disposed and recreated. This could be optimized to:
- Keep the processor alive
- Just call `updateSettings()` with new preset values
- Avoid unpublishing/republishing video tracks

This would make preset changes instant and smoother.
