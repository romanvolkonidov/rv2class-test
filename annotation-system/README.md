# Screen Share Annotation System

A complete, reusable annotation system for LiveKit screen sharing with real-time collaboration support. This system allows multiple users to draw, annotate, and add text on shared screens in real-time.

## Features

✨ **Drawing Tools**
- Pencil - Free-hand drawing
- Eraser - Remove annotations
- Rectangle & Circle - Shape tools
- Text - Add text annotations with font size control
- Pointer - Select and edit existing text

🎨 **Customization**
- 10 color options
- Adjustable line width (1-20px)
- Adjustable font size (12-72px)
- Drag-and-drop text positioning

🤝 **Collaboration**
- Real-time synchronization between all participants
- Teacher can clear all, teacher's, or students' annotations
- Students can annotate on shared screens
- Edit protection (users can only edit their own text, teachers can edit all)

📱 **User Experience**
- Responsive draggable toolbar
- Horizontal/vertical orientation auto-switch
- Touch-friendly interface
- Undo/redo support
- Smooth animations

## Files Structure

```
annotation-system/
├── README.md                    # This file
├── components/
│   ├── AnnotationOverlay.tsx   # Main annotation component
│   └── ui/
│       ├── button.tsx          # Button component (shadcn/ui)
│       ├── card.tsx            # Card component (shadcn/ui)
│       └── input.tsx           # Input component (shadcn/ui)
├── lib/
│   └── utils.ts                # Utility functions (cn helper)
├── hooks/
│   └── useAnnotations.ts       # Custom hook for annotation logic (optional)
└── examples/
    ├── README.md               # About the examples (read this first!)
    ├── livekit-integration.tsx # Example LiveKit integration
    └── standalone-usage.tsx    # Example standalone usage
```

> **📝 Note about Examples:** The example files may show TypeScript errors - this is normal! They are reference examples meant to be copied into your own project. See `examples/README.md` for details.

## Dependencies

Required packages:
```json
{
  "@livekit/components-react": "^2.x.x",
  "livekit-client": "^2.x.x",
  "lucide-react": "^0.x.x",
  "react": "^18.x.x",
  "tailwindcss": "^3.x.x",
  "clsx": "^2.x.x",
  "tailwind-merge": "^2.x.x"
}
```

Install dependencies:
```bash
npm install @livekit/components-react livekit-client lucide-react clsx tailwind-merge
```

## Quick Start

### 1. Copy Files to Your Project

Copy the entire `annotation-system` folder to your project:
```bash
cp -r annotation-system/components /your-project/components/
cp -r annotation-system/lib /your-project/lib/
```

### 2. Basic Usage with LiveKit

```tsx
import { useState } from "react";
import { LiveKitRoom } from "@livekit/components-react";
import AnnotationOverlay from "@/components/AnnotationOverlay";

function YourRoomComponent() {
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [annotationsClosing, setAnnotationsClosing] = useState(false);
  const isTutor = true; // or false for students

  const toggleAnnotations = () => {
    const newState = !showAnnotations;
    
    if (showAnnotations) {
      // Closing animation
      setAnnotationsClosing(true);
      setTimeout(() => {
        setShowAnnotations(false);
        setAnnotationsClosing(false);
      }, 300);
    } else {
      setShowAnnotations(true);
    }
    
    // Broadcast toggle state to other participants
    // (see example below for full implementation)
  };

  return (
    <LiveKitRoom
      token={yourToken}
      serverUrl={yourServerUrl}
      connect={true}
    >
      {/* Your room content */}
      
      {/* Add annotation overlay when active */}
      {(showAnnotations || annotationsClosing) && (
        <AnnotationOverlay 
          onClose={isTutor ? toggleAnnotations : undefined} 
          viewOnly={false}
          isClosing={annotationsClosing}
          isTutor={isTutor}
        />
      )}
    </LiveKitRoom>
  );
}
```

### 3. Props Reference

#### `AnnotationOverlay` Component

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `onClose` | `() => void` | No | `undefined` | Callback when close button is clicked. If undefined, close button is hidden. |
| `viewOnly` | `boolean` | No | `false` | If true, annotations are read-only (no editing). |
| `isClosing` | `boolean` | No | `false` | Controls closing animation state. |
| `isTutor` | `boolean` | No | `false` | If true, user can clear all annotations and edit any text. |

### 4. Data Channel Integration

The annotation system uses LiveKit's data channel for real-time sync. Here's how to integrate it:

```tsx
import { useDataChannel } from "@livekit/components-react";

function YourComponent() {
  const room = useRoomContext();
  
  // Broadcast annotation toggle to all participants
  const toggleAnnotations = () => {
    const newState = !showAnnotations;
    setShowAnnotations(newState);
    
    // Send toggle event
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify({ 
      type: "toggleAnnotations", 
      show: newState 
    }));
    room.localParticipant.publishData(data, { reliable: true });
  };
  
  // Listen for annotation toggle events
  useDataChannel((message) => {
    const decoder = new TextDecoder();
    const text = decoder.decode(message.payload);
    const data = JSON.parse(text);
    
    if (data.type === "toggleAnnotations") {
      setShowAnnotations(data.show);
    }
  });
}
```

## Advanced Usage

### Teacher Controls

Teachers have additional controls:
- Close button (X) to dismiss annotations
- Clear all annotations
- Clear only teacher's annotations
- Clear only students' annotations

### Student Experience

Students can:
- Draw and annotate freely
- Edit their own text annotations
- See all participants' annotations in real-time
- Undo their own drawings

### Customization

#### Styling

The annotation toolbar uses Tailwind CSS with glassmorphism effects. You can customize colors by modifying the component:

```tsx
// In AnnotationOverlay.tsx, change toolbar background:
className="backdrop-blur-xl bg-black/30 border border-white/15"

// Change button colors:
className="bg-blue-500/80 hover:bg-blue-600/80"
```

#### Available Colors

Default colors can be modified in the `availableColors` array:

```tsx
const availableColors = [
  { value: "#FF0000", label: "Red" },
  { value: "#00FF00", label: "Green" },
  // Add your custom colors here
];
```

## How It Works

### Architecture

1. **Canvas Overlay**: A transparent canvas positioned over the screen share video
2. **Relative Coordinates**: All drawings use 0-1 range coordinates for resolution independence
3. **Real-time Sync**: LiveKit data channel broadcasts annotation actions to all participants
4. **Concurrent Drawing**: Separate history arrays for local and remote actions prevent conflicts
5. **Video Metrics**: Automatically detects video dimensions, aspect ratio, and letterboxing

### Data Format

Annotations are stored as `AnnotationAction` objects:

```typescript
interface AnnotationAction {
  tool: "pointer" | "pencil" | "eraser" | "rectangle" | "circle" | "text";
  color: string;
  width: number; // Relative to video width (0-1 range)
  points?: RelativePoint[]; // For pencil/eraser
  startPoint?: RelativePoint; // For shapes/text
  endPoint?: RelativePoint; // For shapes
  text?: string; // For text annotations
  fontSize?: number; // Relative to video width (0-1 range)
  author?: string; // Participant identity
  id?: string; // Unique annotation ID
}

interface RelativePoint {
  x: number; // 0-1 range
  y: number; // 0-1 range
}
```

### Browser Compatibility

- ✅ Chrome/Edge (Best performance)
- ✅ Firefox (Good)
- ✅ Safari (Good, iOS touch support)
- ✅ Mobile browsers (Touch optimized)

## Troubleshooting

### Annotations not appearing
- Verify screen share is active and video element exists
- Check browser console for video dimensions
- Ensure data channel is working in LiveKit room

### Misaligned drawings
- System automatically handles letterboxing and aspect ratios
- Check if browser zoom is affecting coordinates (system handles this)
- Verify canvas dimensions match video element

### Performance issues
- Reduce line width for better performance
- Clear old annotations periodically
- Limit concurrent users drawing simultaneously

## Examples

See the `examples/` folder for complete working examples:
- `livekit-integration.tsx` - Full LiveKit room integration
- `standalone-usage.tsx` - Use without LiveKit (custom sync)

## License

This annotation system is provided as-is for reuse in your projects.

## Credits

Built with:
- React + TypeScript
- LiveKit (real-time communication)
- Tailwind CSS (styling)
- Lucide React (icons)
- shadcn/ui (UI components)
