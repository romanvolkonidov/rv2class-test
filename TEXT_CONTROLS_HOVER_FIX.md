# Text Control Circles - Hover Fix

## Problem
The three action buttons (Edit, Delete, Drag) were disappearing before the mouse could reach them when hovering over the main control circle.

## Root Cause
The issue was caused by conflicting `onMouseLeave` handlers:
1. The main control circle had `onMouseLeave` with a 100ms delay
2. The expanded menu container also had `onMouseLeave`
3. When moving from the main circle to the sub-circles, the mouse would briefly leave both elements, triggering the hide logic

## Solution
Created a single larger "hover detection area" that encompasses all circles (main + 3 action buttons):

### Key Changes:

1. **Unified Hover Area**
   - Added a 120x120px invisible container that covers all circles
   - Positioned to center on the main control circle
   - Single `onMouseEnter` and `onMouseLeave` handler for the entire area

2. **Removed Conflicting Handlers**
   - Removed `onMouseLeave` from main control circle
   - Removed `onMouseLeave` from expanded menu container
   - No more timeout delays needed

3. **Relative Positioning**
   - All circles now positioned relative to the hover area center (60px offset)
   - Main circle: center of hover area
   - Edit button: 45px left, 5px up from center
   - Delete button: 5px right, 45px up from center
   - Drag button: 15px right, 25px down from center

## Technical Details

### Before:
```typescript
// Main circle with separate leave handler
<div onMouseEnter={...} onMouseLeave={...}>
  <MainCircle />
</div>

// Menu with separate leave handler  
{isExpanded && (
  <div onMouseLeave={...}>
    <SubCircles />
  </div>
)}
```

### After:
```typescript
// Single hover detection area
<div 
  style={{ width: '120px', height: '120px' }}
  onMouseEnter={() => setExpandedControlId(id)}
  onMouseLeave={() => setExpandedControlId(null)}
>
  <MainCircle />
  {isExpanded && <SubCircles />}
</div>
```

## Benefits

1. **Stable Hover** - Menu stays open as long as mouse is anywhere in the 120x120px area
2. **Smooth Transition** - No flickering or premature closing
3. **No Delays** - Immediate response, no setTimeout needed
4. **Simpler Logic** - Single source of truth for hover state
5. **Better UX** - Easy to move between circles without menu closing

## User Experience

- Hover over blue circle → menu expands immediately
- Move to any of the three action buttons → menu stays open
- Move mouse away from entire area → menu closes immediately
- No dead zones or gaps between circles
- Touch behavior unchanged (tap to open, tap outside to close)

## Testing

The fix ensures:
- ✅ Menu opens when hovering main circle
- ✅ Menu stays open when moving to action buttons
- ✅ All three buttons are reachable without menu closing
- ✅ Menu closes when mouse leaves the entire area
- ✅ No conflicts with other interactions (drawing, dragging text)
