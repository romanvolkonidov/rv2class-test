# Text Annotation Interactive Controls

## Overview
Added intuitive interactive controls for text annotations with a hover-activated menu system that provides Edit, Delete, and Drag functionality.

## Features

### Visual Control System

#### Main Control Circle
- **Small, fat blue circle** appears at the **top-right corner** of each text annotation
- Size: 16px diameter
- Style: Blue with white border and backdrop blur
- Visibility: Only shown for text that the user can edit (teachers see all, students see only their own)

#### Expandable Menu (on Hover/Tap)
When hovering or tapping the main control circle, three additional circles smoothly animate around it:

1. **Edit (Green Circle)** - Top-left position
   - Icon: Edit/Pencil icon
   - Opens the text editor with current text
   - Preserves font size and color
   
2. **Delete (Red Circle)** - Top position  
   - Icon: Trash icon
   - Removes the text annotation
   - Broadcasts deletion to all participants
   
3. **Drag (Purple Circle)** - Bottom-right position
   - Icon: Grip/Move icon
   - Allows repositioning the text by dragging
   - Real-time updates during drag

### Animations
- **Slide-in animation** for the three sub-circles (0.2s, 0.25s, 0.3s staggered)
- **Scale animation** on hover (1.1x scale)
- **Main circle enlarges** when menu is expanded (1.2x scale)
- Smooth transitions with ease-out timing

### Interaction Behavior

#### Desktop (Mouse)
- **Hover** over main circle to expand menu
- **Click** any of the three options to perform action
- **Brief delay** before hiding (100ms) to allow moving between circles
- Menu **auto-hides** when mouse leaves the area

#### Mobile/Touch
- **Tap** main circle to expand menu
- **Tap** any option to perform action
- **Tap outside** to close menu

### Permissions
- **Teachers**: See controls on ALL text annotations
- **Students**: See controls ONLY on their own text annotations
- Same permission system as the pointer tool

## Technical Implementation

### Data Structures

```typescript
interface TextBounds {
  id: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  controlCirclePos: {
    x: number;
    y: number;
  };
  action: AnnotationAction;
}
```

### State Management
- `textBounds: TextBounds[]` - Stores position data for all text annotations
- `expandedControlId: string | null` - Tracks which control menu is open
- `draggingTextId: string | null` - Tracks which text is being dragged
- `dragOffset: { x, y } | null` - Stores drag offset for smooth dragging

### Key Functions

#### Bounds Calculation
When drawing text, calculate bounding box:
```typescript
let maxWidth = 0;
lines.forEach(line => {
  const width = ctx.measureText(line).width;
  if (width > maxWidth) maxWidth = width;
});

const textHeight = lines.length * absoluteFontSize * 1.2;
const controlCircleRadius = 8;

const bounds: TextBounds = {
  id: action.id,
  bounds: { x: pos.x, y: pos.y, width: maxWidth, height: textHeight },
  controlCirclePos: {
    x: pos.x + maxWidth + controlCircleRadius,
    y: pos.y - controlCircleRadius,
  },
  action,
};
```

#### Drag Handling
Real-time position updates during drag:
```typescript
const handleMouseMove = (e: MouseEvent) => {
  const newX = e.clientX - rect.left - dragOffset.x;
  const newY = e.clientY - rect.top - dragOffset.y;
  const relativePoint = toRelative(newX, newY);
  
  // Update action's startPoint
  // Broadcast change via data channel
};
```

### Data Synchronization

#### New Message Type: `deleteAnnotation`
```typescript
{
  type: "deleteAnnotation",
  id: string  // ID of annotation to delete
}
```

When received:
- Removes from history and remoteActions
- Removes from textBounds
- Triggers redraw

#### Updated Annotations
When text is dragged or edited:
- Normal annotation update is broadcast
- All participants see real-time changes

### CSS Animations

```css
@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.5);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

Applied with staggered delays:
- Edit: 0.2s
- Delete: 0.25s  
- Drag: 0.3s

## UI/UX Details

### Visual Hierarchy
1. **Main control**: Small, subtle, non-intrusive
2. **Expanded menu**: Larger, colorful, clearly indicates action
3. **Hover states**: Scale up, brighter colors
4. **Color coding**:
   - Blue: Main control (neutral)
   - Green: Edit (positive action)
   - Red: Delete (destructive action)
   - Purple: Drag (movement action)

### Positioning
- **Main circle**: Top-right corner with 8px offset
- **Edit circle**: 45px left, 5px up
- **Delete circle**: 5px right, 45px up
- **Drag circle**: 15px right, 25px down

This creates a natural arc around the main control circle.

### Accessibility
- **Cursor changes**: `cursor: pointer` on all interactive elements, `cursor: move` on drag
- **Tooltips**: Each circle has a title attribute
- **Touch-friendly**: 32px tap targets for all controls
- **Visual feedback**: Immediate scale and color changes on hover

## User Workflow

### Editing Text
1. Hover/tap blue circle on text annotation
2. Menu expands with 3 options
3. Click green "Edit" circle
4. Text editor opens with existing content
5. Modify text and click "Update"

### Deleting Text
1. Hover/tap blue circle
2. Click red "Delete" circle
3. Text immediately removed
4. Deletion synced to all participants

### Moving Text
1. Hover/tap blue circle
2. Click and hold purple "Drag" circle
3. Move mouse/finger to reposition
4. Release to place
5. New position synced to all participants

## Benefits

1. **Intuitive**: Familiar control pattern (like OS context menus)
2. **Non-intrusive**: Small main circle doesn't obstruct view
3. **Discoverable**: Blue circle indicates interactivity
4. **Fast**: Direct access to common actions
5. **Visual**: Color-coded actions are self-explanatory
6. **Responsive**: Works equally well on desktop and touch devices
7. **Permission-aware**: Only shows for editable text

## Integration Notes

- Works alongside existing pointer tool for text editing
- Respects same permission system (teachers vs students)
- All actions broadcast via data channel for real-time sync
- Text bounds recalculated on every redraw
- Cleans up properly when annotations are cleared
