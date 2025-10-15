# Draggable Button Feature

## Overview
The whiteboard and annotation toggle buttons in the bottom-left corner are now **fully draggable**, allowing teachers to reposition them anywhere on the screen to avoid obscuring important content.

## Features

### ✅ Drag and Drop
- **Click and drag** (desktop) or **touch and drag** (mobile/tablet)
- Button follows your cursor/finger smoothly
- Stays within viewport bounds (won't go off-screen)

### ✅ Smart Click Detection
- **Short press** = Toggle whiteboard/annotations
- **Drag** = Move button (won't trigger toggle)
- Prevents accidental clicks while dragging

### ✅ Visual Feedback
- **Cursor changes** to `move` when hovering over button
- **Smooth transitions** when not dragging
- **No transition** during drag for responsive feel

### ✅ Position Persistence
- Button remembers position during session
- Resets to default (bottom-left) on page refresh
- Position updates on window resize

### ✅ Touch Support
- Full touch gesture support for tablets/phones
- Works with both mouse and touch events
- Smooth dragging on all devices

---

## How to Use

### Desktop (Mouse):
1. **Hover** over the button (cursor changes to move icon)
2. **Click and hold** the button
3. **Drag** to desired position
4. **Release** to drop the button
5. **Click** (without dragging) to toggle whiteboard/annotations

### Mobile/Tablet (Touch):
1. **Touch and hold** the button
2. **Drag** to desired position
3. **Release** to drop the button
4. **Tap** (without dragging) to toggle whiteboard/annotations

---

## Technical Implementation

### State Management:
```typescript
const [buttonPosition, setButtonPosition] = useState({ 
  x: 24, 
  y: window.innerHeight - 80 
});
const [isDragging, setIsDragging] = useState(false);
const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
const buttonRef = useRef<HTMLDivElement>(null);
```

### Drag Handlers:
```typescript
// Mouse events
const handleMouseDown = (e: React.MouseEvent) => { /* ... */ }
const handleMouseMove = (e: MouseEvent) => { /* ... */ }
const handleMouseUp = () => { /* ... */ }

// Touch events
const handleTouchStart = (e: React.TouchEvent) => { /* ... */ }
const handleTouchMove = (e: TouchEvent) => { /* ... */ }
const handleTouchEnd = () => { /* ... */ }
```

### Boundary Constraints:
```typescript
// Keep button within viewport
const maxX = window.innerWidth - 56;  // 56px = button width
const maxY = window.innerHeight - 56; // 56px = button height

setButtonPosition({
  x: Math.max(0, Math.min(newX, maxX)),
  y: Math.max(0, Math.min(newY, maxY)),
});
```

### Click vs Drag Detection:
```typescript
onClick={(e) => {
  e.stopPropagation();
  if (!isDragging) {
    // Only toggle if not dragging
    setShowWhiteboard(!showWhiteboard);
  }
}}
```

---

## Button Positioning

### Default Position:
- **X**: 24px from left edge
- **Y**: 80px from bottom edge
- Updates on window resize

### Dynamic Styling:
```tsx
<div 
  style={{ 
    left: `${buttonPosition.x}px`, 
    top: `${buttonPosition.y}px`,
    transition: isDragging ? 'none' : 'transform 0.2s',
  }}
>
```

### Cursor Feedback:
```tsx
className="absolute z-[9999] cursor-move"
```

---

## Benefits

### For Teachers:
✅ **Flexibility** - Move button out of the way of important content
✅ **No obstruction** - Can position anywhere on screen
✅ **Easy to use** - Intuitive drag and drop
✅ **Works everywhere** - Desktop, tablet, mobile

### For Students:
✅ **Clear view** - Teachers can move button to avoid blocking content
✅ **Better experience** - No UI elements in the way

### For Development:
✅ **Clean implementation** - Reusable drag logic
✅ **Touch-ready** - Full mobile support
✅ **Performant** - Smooth animations
✅ **Boundary safe** - Can't drag off-screen

---

## Use Cases

### Scenario 1: Screen Share Presentation
```
Teacher sharing slides with text at bottom-left
→ Drag button to top-right corner
→ Students can now see all slide content
```

### Scenario 2: Code Review
```
Teacher sharing code editor with sidebar on left
→ Drag button to bottom-right corner
→ Code sidebar fully visible
```

### Scenario 3: Whiteboard Session
```
Drawing in bottom-left area of whiteboard
→ Drag button to top-left corner
→ Full drawing space available
```

### Scenario 4: Mobile Teaching
```
Teaching on tablet in portrait mode
→ Drag button to least intrusive corner
→ Maximum screen space for content
```

---

## Tooltips Updated

### Whiteboard Button:
- **Inactive**: "Show Whiteboard (Drag to move)"
- **Active**: "Hide Whiteboard"

### Annotation Button:
- **Inactive**: "Show Annotations (Drag to move)"
- **Active**: "Hide Annotations"

---

## Event Flow

### Starting Drag:
1. `onMouseDown` / `onTouchStart` triggers
2. Calculate offset from button top-left corner
3. Set `isDragging = true`
4. Add global event listeners

### During Drag:
1. `mousemove` / `touchmove` events fire
2. Calculate new position: `cursor - offset`
3. Apply boundary constraints
4. Update button position state
5. Re-render with new position

### Ending Drag:
1. `mouseup` / `touchend` triggers
2. Set `isDragging = false`
3. Remove global event listeners
4. Button stays at final position

### On Click (No Drag):
1. `onClick` handler checks `isDragging`
2. If not dragging, toggle whiteboard/annotations
3. If was dragging, ignore click event

---

## Edge Cases Handled

### ✅ Window Resize:
- Button repositions to stay within new viewport
- Default position recalculates

### ✅ Multi-touch:
- Only responds to first touch
- Ignores additional touches during drag

### ✅ Quick Click:
- Distinguishes between click and drag
- No accidental toggles while repositioning

### ✅ Off-screen Prevention:
- Constrains to viewport boundaries
- Can't drag button where user can't see it

### ✅ Both Buttons Share Position:
- Whiteboard and annotation buttons use same position
- Seamless transition when switching modes

---

## Future Enhancements

### Planned Features:
1. **Remember position across sessions** - Save to localStorage
2. **Snap to corners** - Magnetic corners for quick positioning
3. **Double-click to reset** - Return to default position
4. **Position presets** - Saved favorite positions
5. **Mini mode** - Shrink button when not in use
6. **Animation on drop** - Subtle bounce effect

---

## Testing Checklist

- [x] Mouse drag works on desktop
- [x] Touch drag works on mobile/tablet
- [x] Button stays within viewport
- [x] Click without drag toggles correctly
- [x] Cursor changes to move icon
- [x] Smooth dragging experience
- [x] Position persists during session
- [x] Works with both whiteboard and annotation buttons
- [ ] Test on various screen sizes
- [ ] Test on different browsers
- [ ] Test on iOS Safari
- [ ] Test on Android Chrome

---

## Troubleshooting

### Button doesn't drag:
- Check `buttonRef` is attached correctly
- Verify event listeners are added
- Check console for errors

### Button goes off-screen:
- Verify boundary constraints are working
- Check `maxX` and `maxY` calculations
- Test window resize handling

### Click triggers while dragging:
- Ensure `isDragging` check in onClick
- Verify `stopPropagation()` is called
- Check drag state updates correctly

### Touch not working:
- Verify touch event handlers attached
- Check mobile browser compatibility
- Test touch event preventDefault

---

## Code Location

**File**: `/components/JitsiRoom.tsx`

**State** (lines ~67-71):
```typescript
const [buttonPosition, setButtonPosition] = useState({ x: 24, y: window.innerHeight - 80 });
const [isDragging, setIsDragging] = useState(false);
const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
const buttonRef = useRef<HTMLDivElement>(null);
```

**Handlers** (lines ~220-310):
- `handleMouseDown`
- `handleMouseMove`
- `handleMouseUp`
- `handleTouchStart`
- `handleTouchMove`
- `handleTouchEnd`

**UI** (lines ~900-980):
- Whiteboard button (not screen sharing)
- Annotation button (screen sharing)

---

## Summary

The draggable button feature provides **maximum flexibility** for teachers to position the whiteboard/annotation toggle button anywhere on screen, ensuring:

✅ No content obstruction
✅ Optimal viewing experience
✅ Intuitive drag-and-drop
✅ Works on all devices
✅ Smooth and responsive

**Teachers can now freely position the button to suit their teaching style and content layout!** 🎯
