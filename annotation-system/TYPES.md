# Types Reference

## Core Types

### AnnotationTool
```typescript
type AnnotationTool = "pointer" | "pencil" | "eraser" | "rectangle" | "circle" | "text";
```

The available drawing/annotation tools:
- `pointer` - Select and edit existing text annotations
- `pencil` - Free-hand drawing
- `eraser` - Erase annotations
- `rectangle` - Draw rectangles
- `circle` - Draw circles
- `text` - Add text annotations

### RelativePoint
```typescript
interface RelativePoint {
  x: number; // 0-1 range (relative to video width)
  y: number; // 0-1 range (relative to video height)
}
```

All coordinates are stored as relative values (0-1 range) to ensure annotations work across different screen sizes and resolutions.

### AnnotationAction
```typescript
interface AnnotationAction {
  tool: AnnotationTool;
  color: string;
  width: number; // Relative to video width (0-1 range)
  points?: RelativePoint[]; // For pencil/eraser strokes
  startPoint?: RelativePoint; // For shapes and text position
  endPoint?: RelativePoint; // For shapes
  text?: string; // For text annotations
  fontSize?: number; // Relative to video width (0-1 range)
  author?: string; // Participant identity who created this
  id?: string; // Unique identifier for the annotation
}
```

Each annotation action represents a single drawing operation.

### TextBounds
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

Stores the bounding box information for text annotations to enable interactive controls.

### VideoMetrics
```typescript
interface VideoMetrics {
  cssWidth: number;
  cssHeight: number;
  contentWidth: number;
  contentHeight: number;
  offsetX: number;
  offsetY: number;
}
```

Tracks video dimensions and letterboxing for accurate coordinate mapping.

## Component Props

### AnnotationOverlay Props
```typescript
interface AnnotationOverlayProps {
  onClose?: () => void;
  viewOnly?: boolean;
  isClosing?: boolean;
  isTutor?: boolean;
}
```

- `onClose` - Callback when close button is clicked (if undefined, close button is hidden)
- `viewOnly` - If true, annotations are read-only
- `isClosing` - Controls closing animation state
- `isTutor` - If true, user has teacher permissions (can clear all, edit any text)

## Data Channel Messages

### Toggle Annotations
```typescript
{
  type: "toggleAnnotations";
  show: boolean;
}
```

Broadcast by teacher to show/hide annotations for all participants.

### Annotation Action
```typescript
{
  type: "annotate";
  action: AnnotationAction;
}
```

Sent when a user creates or updates an annotation.

### Clear All Annotations
```typescript
{
  type: "clearAnnotations";
}
```

Broadcast to clear all annotations for everyone.

### Clear Annotations by Type
```typescript
{
  type: "clearAnnotationsByType";
  authorType: "all" | "teacher" | "students";
  teacherIdentity: string;
}
```

Teacher-only: selectively clear annotations by author type.

### Sync Annotations
```typescript
{
  type: "syncAnnotations";
  history: AnnotationAction[];
  historyStep: number;
}
```

Sent by teacher to sync full annotation history with joining students.

### Delete Annotation
```typescript
{
  type: "deleteAnnotation";
  id: string;
}
```

Delete a specific annotation by ID.

## Color Options

```typescript
const availableColors = [
  { value: "#FF0000", label: "Red" },
  { value: "#00FF00", label: "Green" },
  { value: "#0000FF", label: "Blue" },
  { value: "#FFFF00", label: "Yellow" },
  { value: "#FF00FF", label: "Magenta" },
  { value: "#00FFFF", label: "Cyan" },
  { value: "#FFA500", label: "Orange" },
  { value: "#800080", label: "Purple" },
  { value: "#FFFFFF", label: "White" },
  { value: "#000000", label: "Black" },
];
```

## Constants

### Line Width Range
- Min: 1px
- Max: 20px
- Default: 3px

### Font Size Range
- Min: 12px
- Max: 72px
- Default: 24px

### Animation Duration
- Toolbar slide: 300ms
- Closing animation: 300ms
- Toast notification: 5000ms

## State Management

The component maintains several key state variables:

```typescript
const [isDrawing, setIsDrawing] = useState(false);
const [tool, setTool] = useState<AnnotationTool>("pencil");
const [color, setColor] = useState("#FF0000");
const [lineWidth, setLineWidth] = useState(3);
const [history, setHistory] = useState<AnnotationAction[]>([]);
const [historyStep, setHistoryStep] = useState(0);
const [remoteActions, setRemoteActions] = useState<AnnotationAction[]>([]);
```

- `history` - Local participant's annotation history (supports undo/redo)
- `remoteActions` - Annotations from other participants (no undo/redo)
- `historyStep` - Current position in undo/redo stack
