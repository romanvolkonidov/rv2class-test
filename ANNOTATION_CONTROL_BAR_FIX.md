# Annotation Control Bar Click Fix

## Problem
When the annotation overlay is active, clicking on the control bar buttons (especially the annotation button to close it) would draw on the canvas instead of triggering the button click. This is because the annotation canvas overlay was covering the entire screen, including the control bar area.

## Root Cause
**Z-Index Layering Issue:**
- Annotation Canvas: `z-50` (covering entire screen with `pointerEvents: 'auto'`)
- Control Bar: `z-20` (below the canvas)
- Annotation Toolbar: `z-[60]` (at top of screen)

When annotations were active, the canvas at `z-50` was above the control bar at `z-20`, so all mouse/touch events on the control bar area were captured by the canvas instead of the buttons.

## Solution
Dynamically increase the control bar's z-index when annotations are active:

```typescript
// Before:
className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 ..."

// After:
className={cn(
  "fixed bottom-4 left-1/2 -translate-x-1/2 transition-all duration-300",
  // Increase z-index when annotations are active
  showAnnotations ? "z-[61]" : "z-20",
  ...
)}
```

### Z-Index Hierarchy (when annotations active):
1. **Control Bar: `z-[61]`** ← Highest (clickable buttons)
2. **Annotation Toolbar: `z-[60]`** (top toolbar with drawing tools)
3. **Canvas: `z-50`** (drawing surface)
4. **Video Content: below** (screen share/video)

### Z-Index Hierarchy (normal mode):
1. **Control Bar: `z-20`** (standard positioning)
2. Everything else below

## Benefits
- ✅ Control bar buttons remain clickable when annotations are active
- ✅ Can toggle annotation button to close the overlay
- ✅ Can use other control buttons (mic, camera, etc.) while annotating
- ✅ No interference with drawing on the rest of the screen
- ✅ Smooth transition - z-index changes with `showAnnotations` state

## Files Modified
- `components/CustomControlBar.tsx` - Added conditional z-index based on `showAnnotations` prop

## How It Works
1. When `showAnnotations` is `false`: Control bar uses normal `z-20`
2. When `showAnnotations` is `true`: Control bar elevates to `z-[61]`
3. Control bar stays above both the canvas (`z-50`) and annotation toolbar (`z-[60]`)
4. Mouse clicks on control bar buttons work normally
5. Canvas still captures drawing events everywhere else on screen

## Testing
To verify the fix works:
1. Start screen sharing
2. Click the annotation button to open annotations
3. Try drawing near the control bar - should work
4. Click the annotation button again - should close the overlay (not draw)
5. Click other buttons (mic, camera) - should work normally
6. Drawing should work everywhere except over the control bar buttons

## Previous Attempts
We also fixed related issues in this session:
- ✅ Chat panel smooth close animation
- ✅ Screen share toggle when button pressed during sharing
- ✅ Annotation panel smooth close animation with toggle button
- ✅ Tab sharing rejection with clear user guidance
