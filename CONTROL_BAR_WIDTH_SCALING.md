# Control Bar Width Scaling

## Problem
The control bar had a fixed width and didn't stretch to match the width of the scaled videos below it. When videos were scaled larger or smaller, the control bar stayed the same width, creating a visual mismatch.

## Solution
Apply horizontal scaling to the control bar to match the video scale, while keeping the height (thickness) constant.

### Implementation

```tsx
// Control bar - scales horizontally to match videos
<div style={{
  transform: `scaleX(${scale})`,  // Stretch width to match video scale
  transformOrigin: 'left',        // Scale from left edge
}}>
  // Buttons inside - inverse scale to stay normal size
  <div style={{
    transform: `scaleX(${1 / scale})`,  // Counter-scale buttons
    transformOrigin: 'right',           // Align to right
  }}>
    {/* Buttons */}
  </div>
</div>
```

### How It Works

1. **Control Bar** gets `scaleX(${scale})`
   - If videos are 2x, bar stretches to 2x width
   - Height stays constant (only X-axis scales)
   - Originates from left edge

2. **Buttons Container** gets inverse `scaleX(${1 / scale})`
   - If bar is 2x wide, buttons scale to 0.5x
   - Net result: buttons appear normal size
   - Originates from right edge (stays aligned)

3. **Result**
   - Bar width matches video width perfectly
   - Bar height (thickness) stays constant
   - Buttons remain readable at normal size
   - Bar always sits perfectly on top of videos

## Visual Example

### Before (Fixed Width)
```
Scale 0.5x:
    [Hide][Min]           ← Bar too wide
    📹 👤                 ← Small videos

Scale 2x:
    [Hide][Min]           ← Bar too narrow
    📹  📹  👤  👤        ← Large videos
```

### After (Scaled Width)
```
Scale 0.5x:
  [Hide][Min]             ← Bar matches
  📹 👤                   ← Small videos

Scale 2x:
    [  Hide  ][  Min  ]   ← Bar matches
    📹  📹  👤  👤        ← Large videos
```

## Technical Details

### Transform Properties

- `scaleX()` - Only scales horizontally (not vertically)
- `transformOrigin: 'left'` - Scales from the left edge (same as videos)
- Inverse scale on buttons - Keeps UI elements readable

### Border Scaling

The `borderBottom` style remains 1px thick because:
- Border is defined in pixels (not scaled)
- Only the width of the bar changes
- Height and border thickness stay constant

### Z-Index

Control bar naturally appears above videos due to DOM order, no z-index needed.

## Files Modified

- `components/CompactParticipantView.tsx` - Control bar now scales width
- `components/CustomVideoConference.tsx` - Same change for consistency

## Benefits

1. **Perfect Alignment** - Bar always matches video width
2. **Consistent Thickness** - Height never changes
3. **Readable Buttons** - Icons stay normal size
4. **Professional Look** - Clean visual hierarchy
5. **Responsive** - Adapts to any scale (0.5x to 3x)
