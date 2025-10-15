# Jitsi Annotation System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     JITSI MEETING ROOM                          │
│                                                                 │
│  ┌──────────────┐              ┌──────────────┐                │
│  │   Teacher    │◄─────────────►│   Student    │                │
│  │   (Desktop)  │  Jitsi Data  │   (Laptop)   │                │
│  │  1920x1080   │   Channel    │  1366x768    │                │
│  └──────────────┘              └──────────────┘                │
│         │                              │                        │
│         │ Screen Share                 │ Receives               │
│         ▼                              ▼                        │
│  ┌─────────────────────────────────────────────┐               │
│  │          SHARED SCREEN VIDEO                │               │
│  │     (Teacher's screen content)              │               │
│  └─────────────────────────────────────────────┘               │
│         │                              │                        │
│         │ Annotation                   │ Annotation             │
│         ▼                              ▼                        │
│  ┌──────────────┐              ┌──────────────┐                │
│  │  Annotation  │              │  Annotation  │                │
│  │   Overlay    │              │   Overlay    │                │
│  │   Canvas     │              │   Canvas     │                │
│  └──────────────┘              └──────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

## How Device-Independent Coordinates Work

### Problem: Different Screen Sizes

```
Teacher's View (1920x1080):          Student's View (1366x768):
┌──────────────────────┐             ┌──────────────────┐
│                      │             │                  │
│      ●  (960, 540)   │             │   ●  (683, 384)  │
│   (center point)     │             │   (center point) │
│                      │             │                  │
└──────────────────────┘             └──────────────────┘
```

**Without relative coordinates**: Annotation at (960, 540) appears off-center on student's screen!

### Solution: Relative Coordinates (0-1 range)

```
Teacher draws at:    (960, 540)    →  Converts to: (0.5, 0.5)
Student receives:    (0.5, 0.5)    →  Converts to: (683, 384)

Both see annotation at CENTER! ✅
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    TEACHER'S ACTION                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
          ┌─────────────────────────────────┐
          │   1. Mouse Click on Canvas      │
          │      Absolute: (960, 540)       │
          └─────────────────────────────────┘
                            │
                            ▼
          ┌─────────────────────────────────┐
          │   2. Convert to Relative        │
          │      toRelative(960, 540)       │
          │      Result: (0.5, 0.5)         │
          └─────────────────────────────────┘
                            │
                            ▼
          ┌─────────────────────────────────┐
          │   3. Create Annotation Action   │
          │      { tool: "pencil",          │
          │        points: [(0.5, 0.5)],    │
          │        color: "#FF0000",        │
          │        author: "Teacher" }      │
          └─────────────────────────────────┘
                            │
                            ▼
          ┌─────────────────────────────────┐
          │   4. Send via Jitsi Data Channel│
          │      jitsiApi.executeCommand(   │
          │        'sendEndpointTextMessage'│
          │        '', JSON.stringify(...)) │
          └─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    STUDENT RECEIVES                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
          ┌─────────────────────────────────┐
          │   5. Receive Message            │
          │      endpointTextMessageReceived│
          │      event listener             │
          └─────────────────────────────────┘
                            │
                            ▼
          ┌─────────────────────────────────┐
          │   6. Parse Annotation Action    │
          │      JSON.parse(data)           │
          │      action.points = [(0.5,0.5)]│
          └─────────────────────────────────┘
                            │
                            ▼
          ┌─────────────────────────────────┐
          │   7. Convert to Absolute        │
          │      toAbsolute(0.5, 0.5)       │
          │      Result: (683, 384)         │
          │      (center of student screen) │
          └─────────────────────────────────┘
                            │
                            ▼
          ┌─────────────────────────────────┐
          │   8. Draw on Canvas             │
          │      ctx.lineTo(683, 384)       │
          └─────────────────────────────────┘
```

## Video Metrics Calculation

The system calculates video metrics to handle letterboxing/pillarboxing:

```
┌──────────────────────────────────────────┐  ← Canvas Container
│         (Letterbox - Black Bar)          │    (matches video element)
│  ┌────────────────────────────────────┐  │
│  │                                    │  │  ← Actual Video Content
│  │        Video Content Area          │  │    (centered with proper
│  │       (contentWidth x Height)      │  │     aspect ratio)
│  │                                    │  │
│  └────────────────────────────────────┘  │
│         (Letterbox - Black Bar)          │
└──────────────────────────────────────────┘

metrics = {
  cssWidth: 1920,      // Container width
  cssHeight: 1080,     // Container height
  contentWidth: 1920,  // Actual video width
  contentHeight: 880,  // Actual video height (16:9)
  offsetX: 0,          // Horizontal offset (pillarboxing)
  offsetY: 100,        // Vertical offset (letterboxing)
}
```

### Coordinate Conversion Functions

```typescript
// Pixel → Relative (0-1 range)
toRelative(x, y) {
  normalizedX = (x - offsetX) / contentWidth
  normalizedY = (y - offsetY) / contentHeight
  return { x: normalizedX, y: normalizedY }
}

// Relative (0-1 range) → Pixel
toAbsolute(point) {
  absoluteX = offsetX + point.x * contentWidth
  absoluteY = offsetY + point.y * contentHeight
  return { x: absoluteX, y: absoluteY }
}
```

## Screen Share Detection

The system automatically finds the Jitsi screen share video:

```
┌─────────────────────────────────────────┐
│    Jitsi Meeting (iframe)               │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  <video id="largeVideo">          │  │ ← Target!
│  │    [Screen Share Content]         │  │
│  │  </video>                         │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌────┐ ┌────┐ ┌────┐                  │
│  │Cam │ │Cam │ │Cam │ Small videos    │
│  └────┘ └────┘ └────┘ (ignored)        │
│                                         │
└─────────────────────────────────────────┘

Detection Logic:
1. Look for #largeVideo (Jitsi's main video element)
2. Check if it's actually playing (videoWidth > 0)
3. Fallback: Find largest video element (area > 100000px²)
```

## Message Protocol

### Toggle Annotations (Teacher → All)
```json
{
  "type": "toggleAnnotations",
  "show": true
}
```

### Draw Annotation (Any → All)
```json
{
  "type": "annotate",
  "action": {
    "tool": "pencil",
    "color": "#FF0000",
    "width": 0.003,
    "points": [
      { "x": 0.5, "y": 0.5 },
      { "x": 0.51, "y": 0.51 }
    ],
    "author": "Teacher"
  }
}
```

### Clear All (Any → All)
```json
{
  "type": "clearAnnotations"
}
```

### Clear by Type (Teacher → All)
```json
{
  "type": "clearAnnotationsByType",
  "authorType": "students",
  "teacherIdentity": "Teacher"
}
```

### Delete Annotation (Any → All)
```json
{
  "type": "deleteAnnotation",
  "id": "1234567890-abc123"
}
```

## Component Hierarchy

```
JitsiRoom.tsx
├── <iframe> (Jitsi Meeting)
│   └── <video id="largeVideo"> (Screen Share)
├── TldrawWhiteboard (if showWhiteboard)
└── JitsiAnnotationOverlay (if showAnnotations)
    ├── <div ref={containerRef}> (Positioned overlay)
    │   └── <canvas ref={canvasRef}> (Drawing surface)
    └── <div ref={toolbarRef}> (Floating toolbar)
        ├── Tool buttons (Pencil, Eraser, etc.)
        ├── Color picker
        ├── Undo/Redo
        └── Clear options
```

## Performance Considerations

### Canvas Rendering
- Uses `window.devicePixelRatio` for sharp rendering on Retina displays
- Debounced resize handling to avoid excessive redraws
- Efficient redraw: only redraws when needed

### Network Efficiency
- Only sends annotation data when drawing completes
- Uses Jitsi's reliable data channel (no message loss)
- Minimal payload: relative coordinates use less data than absolute

### Memory Management
- Separate arrays for local and remote actions
- Efficient history management with historyStep pointer
- Proper cleanup of event listeners and observers

## Browser Zoom Handling

```
No Zoom (100%):        125% Zoom:            150% Zoom:
┌───────────┐          ┌────────┐            ┌──────┐
│           │          │        │            │      │
│     ●     │          │   ●    │            │  ●   │
│  (0.5,0.5)│          │ (0.5,  │            │(0.5, │
│           │          │  0.5)  │            │ 0.5) │
└───────────┘          └────────┘            └──────┘

Annotation stays at (0.5, 0.5) relative position
regardless of zoom level! ✅
```

## Key Benefits

1. **Device-Agnostic**: Works on any screen size/resolution
2. **Zoom-Independent**: Handles browser zoom automatically
3. **Real-Time**: Instant synchronization via Jitsi
4. **Collaborative**: Multiple users can annotate
5. **Persistent**: Annotations stay on screen until cleared
6. **Intuitive**: Familiar drawing tools and controls

## Integration Points

Your JitsiRoom component needs to:
1. ✅ Pass `jitsiApiRef.current` to annotation overlay
2. ✅ Add toggle button for annotations
3. ✅ Listen for toggle messages from teacher
4. ✅ Handle annotation state (show/hide/closing)

That's it! The annotation system handles everything else internally.
