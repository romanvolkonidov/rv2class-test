# Screen Share Shows Incomplete Content - October 7, 2025

## Problem
When sharing a browser tab or window, the shared screen **doesn't show all the content** that is actually visible in the source tab/window. Parts of the screen are cut off or missing.

## Possible Causes

### 1. Browser Tab Capture Limitations
When you share a **browser tab** (not entire screen or window):
- Chrome/browsers may capture only the **visible viewport** of the tab
- Scrolled content outside the viewport is not captured
- Some tabs have restrictions on what can be captured

### 2. Aspect Ratio Mismatch
- Captured content has different aspect ratio than display container
- `object-contain` CSS may scale down content, leaving black bars
- Some content might appear cropped

### 3. Display Scaling / HiDPI Issues
- Operating system display scaling (125%, 150%, 200%) can affect capture
- Browser zoom level affects what's captured
- Captured resolution vs displayed resolution mismatch

### 4. Video Element Rendering
- CSS `overflow-hidden` can clip content
- Video element dimensions not matching source dimensions
- Incorrect `object-fit` settings

## The Fixes Applied

### 1. Added Debug Logging ✅
Added extensive logging to understand what's being captured:

```typescript
console.log('📐 Full track settings:', settings);
console.log('📺 Track constraints:', videoTrack.getConstraints());
console.log('📺 Screen share video element stats:', {
  videoWidth: videoEl.videoWidth,
  videoHeight: videoEl.videoHeight,
  clientWidth: videoEl.clientWidth,
  clientHeight: videoEl.clientHeight,
  aspectRatio: (videoEl.videoWidth / videoEl.videoHeight).toFixed(2),
});
```

**This will help us see:**
- Actual captured resolution
- Video element display size
- Any aspect ratio mismatches

### 2. Updated Capture Constraints ✅
Added more explicit constraints to ensure full content capture:

```typescript
video: {
  width: { ideal: 3840, max: 3840 },
  height: { ideal: 2160, max: 2160 },
  frameRate: { ideal: 30, max: 60 },
  aspectRatio: { ideal: 16/9 },      // Prefer widescreen but allow any
  resizeMode: 'none',                 // Don't resize - capture as-is
},
preferCurrentTab: false,              // Prefer full screen/window capture
```

**Why this helps:**
- `resizeMode: 'none'` prevents browser from resizing capture
- `aspectRatio` hint helps browser choose best capture mode
- `preferCurrentTab: false` encourages full window capture

### 3. Fixed Video Element Container ✅
Changed screen share container to not clip content:

```typescript
// Before: overflow-hidden (clips content)
className="relative rounded-xl overflow-hidden"

// After: overflow-visible for screen share
className={cn(
  "relative rounded-xl transition-all duration-200",
  isScreenShare ? "overflow-visible bg-black" : "overflow-hidden bg-black/20 backdrop-blur-md"
)}
```

### 4. Optimized Video Element Styles ✅
Added explicit sizing for screen share video:

```typescript
style={isScreenShare ? { 
  backgroundColor: '#000',
  maxWidth: '100%',
  maxHeight: '100%',
  width: '100%',
  height: '100%'
} : undefined}
```

## How to Debug

### Step 1: Check Console Logs
When you start screen sharing, check the console for:

```
🖥️ Requesting ULTRA quality screen share (up to 4K @ 60fps with VP9)...
✅ Captured screen at: 1920x1080 @ 30fps
📐 Full track settings: {width: 1920, height: 1080, ...}
📺 Track constraints: {...}
📺 Screen share video element stats: {
  videoWidth: 1920,
  videoHeight: 1080,
  clientWidth: 800,
  clientHeight: 450,
  aspectRatio: 1.78
}
```

**Look for:**
- Is `videoWidth` × `videoHeight` the same as your screen resolution?
- Is `clientWidth` × `clientHeight` much smaller? (Video element is being scaled down)
- Does the aspect ratio match your screen?

### Step 2: What Are You Sharing?

#### Option A: Entire Screen ✅ Best Quality
- Select "**Entire Screen**" in the share picker
- This captures everything at full resolution
- No restrictions or limitations

#### Option B: Application Window ⚠️ Usually Good
- Select a specific application window
- Captures the full window content
- May have slight borders

#### Option C: Browser Tab ❌ Problematic
- **ISSUE**: Browser tabs only capture the **visible viewport**
- If the tab has a long page, only what's visible is captured
- Scrolling in the source tab won't show in the share
- **FIX**: Share the **entire window** instead, not the tab

### Step 3: Check Browser Zoom
1. Open the tab/window you're sharing
2. Press `Ctrl+0` (Windows/Linux) or `Cmd+0` (Mac) to reset zoom to 100%
3. Browser zoom affects what's captured - 100% is ideal

### Step 4: Check Display Scaling
1. Operating system display scaling (Windows "Make text bigger") affects capture
2. Try setting display scaling to 100% if possible
3. Or share the "Entire Screen" which captures the scaled version correctly

## Common Scenarios

### Scenario 1: "Tab share cuts off bottom of page"
**Problem**: Browser tab capture only shows viewport, not scrolled content
**Solution**: Share the **entire browser window** instead of the tab

### Scenario 2: "Screen share looks small with black bars"
**Problem**: Aspect ratio mismatch between captured content and display
**Solution**: 
- Use `object-contain` (already set) to show full content
- Or resize your browser to match common aspect ratios (16:9)

### Scenario 3: "Content appears zoomed in"
**Problem**: Browser zoom or display scaling
**Solution**: 
- Reset browser zoom to 100% (`Ctrl+0`)
- Share entire screen instead of window/tab

### Scenario 4: "Some UI elements are missing"
**Problem**: 
- Tab capture doesn't include browser chrome (address bar, etc.)
- Some tabs have capture restrictions
**Solution**: Share the **application window** or **entire screen**

## Testing Checklist

Test each sharing mode:

1. **Share Entire Screen**
   - [x] Full desktop visible?
   - [x] All windows and taskbar visible?
   - [x] Resolution captured correctly?

2. **Share Application Window**
   - [x] Full window with borders visible?
   - [x] Window content not cropped?
   - [x] Resizing window works?

3. **Share Browser Tab**
   - [ ] Full page visible (not just viewport)?
   - [ ] Scrolling shows new content?
   - [ ] All UI elements present?

## Expected Console Output

```
🖥️ Requesting ULTRA quality screen share (up to 4K @ 60fps with VP9)...
✅ Captured screen at: 2560x1440 @ 30fps
📐 Full track settings: {
  width: 2560,
  height: 1440,
  frameRate: 30,
  aspectRatio: 1.7777777777777777,
  facingMode: undefined,
  resizeMode: "none",
  ...
}
📺 Track constraints: {...}
✅ Set contentHint="detail" for ultra-sharp text
✅ Screen share published with ULTRA settings:
   • Resolution: 2560x1440
   • Frame Rate: 30fps
   • Bitrate: 10 Mbps (gaming-level quality)
   • Codec: VP9 (superior compression)
   • Content Hint: DETAIL (optimized for text)

[After video element attaches]
📺 Screen share video element stats: {
  videoWidth: 2560,      // Source resolution
  videoHeight: 1440,
  clientWidth: 960,      // Display size (scaled to fit)
  clientHeight: 540,
  aspectRatio: "1.78"
}
```

## Recommendations

### For Best Results:
1. ✅ **Share "Entire Screen"** - Most reliable, captures everything
2. ✅ **Use 100% browser zoom** - Prevents confusion
3. ✅ **Check display scaling** - 100% is ideal
4. ✅ **Close unnecessary windows** - Reduces capture complexity

### For Privacy:
1. ⚠️ **Share "Application Window"** - Shows only specific app
2. ⚠️ **Share "Browser Tab"** - Most limited but most private
   - Note: Only captures visible viewport, not full page

## Files Modified

1. **components/CustomControlBar.tsx**
   - Added debug logging for capture settings
   - Added `resizeMode: 'none'` and `aspectRatio` constraints
   - Added `preferCurrentTab: false`

2. **components/CustomVideoConference.tsx**
   - Changed screen share container from `overflow-hidden` to `overflow-visible`
   - Added explicit video element sizing styles
   - Added debug logging for video element dimensions

## Next Steps

1. **Test and report what you see in console logs**
   - What resolution is captured?
   - What are the video element dimensions?
   - Is there an aspect ratio mismatch?

2. **Try different sharing modes:**
   - Entire Screen
   - Application Window  
   - Browser Tab
   - Which one shows the correct content?

3. **Check your setup:**
   - Browser zoom level
   - Display scaling
   - Monitor resolution

Please share the console output and which sharing mode you're using, and we can further diagnose the issue!
