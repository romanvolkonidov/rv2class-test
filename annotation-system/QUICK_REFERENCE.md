# Quick Reference

## Installation

```bash
npm install @livekit/components-react livekit-client lucide-react clsx tailwind-merge
```

## Basic Usage

```tsx
import AnnotationOverlay from "@/components/AnnotationOverlay";

<AnnotationOverlay 
  onClose={handleClose}
  viewOnly={false}
  isClosing={false}
  isTutor={true}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onClose` | `() => void` | `undefined` | Close callback (shows X button) |
| `viewOnly` | `boolean` | `false` | Read-only mode |
| `isClosing` | `boolean` | `false` | Closing animation |
| `isTutor` | `boolean` | `false` | Teacher permissions |

## Tools

| Tool | Icon | Description |
|------|------|-------------|
| Pointer | 🖱️ | Select/edit text |
| Pencil | ✏️ | Free-hand draw |
| Eraser | 🧹 | Erase annotations |
| Rectangle | ▭ | Draw rectangles |
| Circle | ⭕ | Draw circles |
| Text | T | Add text |

## Keyboard Shortcuts

- `Ctrl+Enter` - Submit text annotation
- `Esc` - Cancel text input
- Click `Undo` button for undo
- Long-press toolbar to drag (mobile)

## Data Channel Messages

### Teacher Toggles Annotations
```typescript
{
  type: "toggleAnnotations",
  show: boolean
}
```

### Annotation Created/Updated
```typescript
{
  type: "annotate",
  action: {
    tool: AnnotationTool,
    color: string,
    width: number,
    // ... other properties
  }
}
```

### Clear All
```typescript
{
  type: "clearAnnotations"
}
```

### Clear by Type (Teacher Only)
```typescript
{
  type: "clearAnnotationsByType",
  authorType: "all" | "teacher" | "students",
  teacherIdentity: string
}
```

### Delete Single Annotation
```typescript
{
  type: "deleteAnnotation",
  id: string
}
```

## Common Patterns

### Toggle with Animation
```tsx
const toggle = () => {
  if (showAnnotations) {
    setClosing(true);
    setTimeout(() => {
      setShowAnnotations(false);
      setClosing(false);
    }, 300);
  } else {
    setShowAnnotations(true);
  }
};
```

### Check for Screen Share
```tsx
const hasShare = Array.from(room.remoteParticipants.values())
  .concat(room.localParticipant)
  .some(p => p.getTrackPublication("screen_share")?.track?.isEnabled);
```

### Listen for Messages
```tsx
useDataChannel((message) => {
  const data = JSON.parse(new TextDecoder().decode(message.payload));
  if (data.type === "toggleAnnotations") {
    setShowAnnotations(data.show);
  }
});
```

## Customization

### Change Colors
```tsx
// In AnnotationOverlay.tsx
const availableColors = [
  { value: "#FF0000", label: "Red" },
  // Add your colors
];
```

### Change Toolbar Style
```tsx
// In AnnotationOverlay.tsx
className="backdrop-blur-xl bg-black/30" // Glassmorphism
```

### Adjust Line Width Range
```tsx
<input type="range" min="1" max="20" value={lineWidth} />
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Annotations not syncing | Check `canPublishData: true` in token |
| Canvas misaligned | Verify video has correct `data-lk-source` |
| Performance issues | Clear old annotations periodically |
| Text not editable | Check `isTutor` or author identity |

## Browser Support

- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers (touch-optimized)

## File Structure

```
annotation-system/
├── README.md              # Main documentation
├── INTEGRATION.md         # Integration guide
├── TYPES.md              # Type definitions
├── QUICK_REFERENCE.md    # This file
├── package.json          # Dependencies
├── components/
│   ├── AnnotationOverlay.tsx
│   └── ui/
│       └── button.tsx
├── lib/
│   └── utils.ts
└── examples/
    ├── livekit-integration.tsx
    └── standalone-usage.tsx
```

## License

MIT - Free to use in your projects
