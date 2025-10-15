# Jitsi Annotation System Integration Guide

## Overview

This guide shows you how to integrate the annotation system with your Jitsi Meet setup for real-time collaborative annotations on shared screens that work across different device sizes and zoom levels.

## Key Features

✨ **Device-Agnostic**: Uses relative coordinates (0-1 range) so annotations appear in the same place regardless of screen size, resolution, or zoom level
🤝 **Real-Time Sync**: Uses Jitsi's data channel for instant synchronization
🎯 **Screen Share Detection**: Automatically finds and overlays on the shared screen video element
🎨 **Full Toolbar**: Drawing, shapes, text, colors, and collaborative editing

## Architecture

The annotation system works by:
1. **Finding the screen share video element** in Jitsi's iframe
2. **Overlaying a canvas** that matches the video's position and size
3. **Converting coordinates** to relative 0-1 range for device independence
4. **Syncing via Jitsi's data channel** using `sendEndpointMessage()`

## Integration Steps

### Step 1: Add Annotation Toggle State to JitsiRoom.tsx

Add state for controlling annotations:

```tsx
const [showAnnotations, setShowAnnotations] = useState(false);
const [annotationsClosing, setAnnotationsClosing] = useState(false);
```

### Step 2: Add Annotation Toggle Button

Add a button next to your whiteboard button:

```tsx
{/* Annotation Toggle Button - Teachers Only */}
{!loading && isTutor && (
  <div className="absolute bottom-6 left-24 z-[9999]">
    <Button
      onClick={() => {
        if (showAnnotations) {
          setAnnotationsClosing(true);
          setTimeout(() => {
            setShowAnnotations(false);
            setAnnotationsClosing(false);
          }, 300);
        } else {
          setShowAnnotations(true);
        }
        
        // Broadcast toggle to all participants via Jitsi
        if (jitsiApiRef.current) {
          jitsiApiRef.current.executeCommand('sendEndpointTextMessage', '', JSON.stringify({
            type: 'toggleAnnotations',
            show: !showAnnotations
          }));
        }
      }}
      size="icon"
      className={cn(
        "h-14 w-14 rounded-full shadow-xl transition-all duration-200 backdrop-blur-sm",
        showAnnotations 
          ? "bg-green-600/95 hover:bg-green-700 text-white border-2 border-green-400" 
          : "bg-gray-800/90 hover:bg-gray-700/90 text-white border-2 border-gray-600"
      )}
      title={showAnnotations ? "Hide Annotations" : "Show Annotations"}
    >
      <Pencil className="w-6 h-6" />
    </Button>
  </div>
)}
```

### Step 3: Render Annotation Overlay

Add this below your whiteboard component:

```tsx
{/* Annotation Overlay */}
{showAnnotations && (
  <AnnotationOverlay
    onClose={() => {
      setAnnotationsClosing(true);
      setTimeout(() => {
        setShowAnnotations(false);
        setAnnotationsClosing(false);
      }, 300);
    }}
    viewOnly={false}
    isClosing={annotationsClosing}
    isTutor={isTutor}
    jitsiApi={jitsiApiRef.current}
  />
)}
```

### Step 4: Listen for Toggle Messages (Students)

Add this effect for students to respond to teacher's toggle:

```tsx
useEffect(() => {
  if (!jitsiApiRef.current || isTutor) return;

  const handleEndpointMessage = (participant: any, data: any) => {
    try {
      const message = JSON.parse(data);
      if (message.type === 'toggleAnnotations') {
        if (message.show) {
          setShowAnnotations(true);
        } else {
          setAnnotationsClosing(true);
          setTimeout(() => {
            setShowAnnotations(false);
            setAnnotationsClosing(false);
          }, 300);
        }
      }
    } catch (error) {
      console.error('Error parsing annotation message:', error);
    }
  };

  jitsiApiRef.current.addListener('endpointTextMessageReceived', handleEndpointMessage);

  return () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.removeListener('endpointTextMessageReceived', handleEndpointMessage);
    }
  };
}, [isTutor]);
```

### Step 5: Update AnnotationOverlay for Jitsi

Modify the annotation overlay to accept and use Jitsi API:

```tsx
// In AnnotationOverlay.tsx props
export default function AnnotationOverlay({ 
  onClose, 
  viewOnly = false, 
  isClosing: externalIsClosing = false,
  isTutor = false,
  jitsiApi = null // NEW: Add this prop
}: { 
  onClose?: () => void; 
  viewOnly?: boolean; 
  isClosing?: boolean;
  isTutor?: boolean;
  jitsiApi?: any; // NEW: Add this prop type
})
```

### Step 6: Replace LiveKit Communication with Jitsi

Find the `sendAnnotationData` function and replace it:

```tsx
// Send annotation data to other participants via Jitsi
const sendAnnotationData = (action: AnnotationAction) => {
  if (!jitsiApi) {
    console.warn('Jitsi API not available');
    return;
  }

  try {
    const message = JSON.stringify({ type: "annotate", action });
    jitsiApi.executeCommand('sendEndpointTextMessage', '', message);
  } catch (error) {
    console.error('Error sending annotation data:', error);
  }
};
```

### Step 7: Replace LiveKit Message Listener with Jitsi

Replace the `useDataChannel` hook with Jitsi's message listener:

```tsx
// Listen for annotation messages from other participants
useEffect(() => {
  if (!jitsiApi) return;

  const handleEndpointMessage = (participant: any, data: any) => {
    try {
      const message = JSON.parse(data);
      
      if (message.type === "annotate" && canvasRef.current) {
        const action = message.action;
        
        // Handle different annotation types
        if (action.tool === "text" && action.id) {
          // Text annotation - check if we need to update or add
          const existingIndex = remoteActions.findIndex(a => a.id === action.id);
          
          if (existingIndex !== -1) {
            // Update existing
            const newRemote = [...remoteActions];
            newRemote[existingIndex] = action;
            setRemoteActions(newRemote);
          } else {
            // Add new
            setRemoteActions(prev => [...prev, action]);
          }
        } else {
          // Drawing annotation - always add
          setRemoteActions(prev => [...prev, action]);
        }
        
        redrawCanvas();
      } else if (message.type === "clearAnnotations") {
        // Clear all annotations
        setHistory([]);
        setHistoryStep(0);
        setRemoteActions([]);
        redrawCanvas();
      } else if (message.type === "clearAnnotationsByType") {
        // Clear by author type (teacher/student)
        const { authorType, teacherIdentity } = message;
        
        if (authorType === "all") {
          setHistory([]);
          setHistoryStep(0);
          setRemoteActions([]);
        } else {
          // Filter based on author
          const filterByAuthor = (action: AnnotationAction) => {
            if (authorType === "teacher") {
              return action.author !== teacherIdentity;
            } else { // "students"
              return action.author === teacherIdentity;
            }
          };
          
          setHistory(prev => prev.filter(filterByAuthor));
          setRemoteActions(prev => prev.filter(filterByAuthor));
          setHistoryStep(prev => Math.min(prev, history.filter(filterByAuthor).length));
        }
        
        redrawCanvas();
      } else if (message.type === "deleteAnnotation") {
        // Delete specific annotation by ID
        const { id } = message;
        setHistory(prev => prev.filter(a => a.id !== id));
        setRemoteActions(prev => prev.filter(a => a.id !== id));
        redrawCanvas();
      }
    } catch (error) {
      console.error('Error processing annotation message:', error);
    }
  };

  jitsiApi.addListener('endpointTextMessageReceived', handleEndpointMessage);

  return () => {
    if (jitsiApi) {
      jitsiApi.removeListener('endpointTextMessageReceived', handleEndpointMessage);
    }
  };
}, [jitsiApi, remoteActions, history]);
```

### Step 8: Update Screen Share Detection for Jitsi

Modify the `findScreenShareVideo` function to work with Jitsi's iframe:

```tsx
useEffect(() => {
  if (isClosing) return;

  const findScreenShareVideo = () => {
    // Jitsi embeds video in an iframe, so we need to search within it
    const jitsiIframe = document.querySelector('iframe[name*="jitsi"]') as HTMLIFrameElement;
    
    let videos: NodeListOf<HTMLVideoElement>;
    
    if (jitsiIframe && jitsiIframe.contentDocument) {
      // Search inside Jitsi iframe
      videos = jitsiIframe.contentDocument.querySelectorAll('video');
    } else {
      // Fallback: search in main document
      videos = document.querySelectorAll('video');
    }
    
    // Method 1: Look for screen share by class or data attribute
    for (const video of videos) {
      // Jitsi adds specific classes to screen share video
      if (video.classList.contains('videocontainer__video') || 
          video.classList.contains('large-video') ||
          video.getAttribute('id')?.includes('largeVideo')) {
        // Check if it's actually showing screen share (has significant size)
        if (video.videoWidth > 640 && video.videoHeight > 480) {
          console.log('📺 Found Jitsi screen share video:', video);
          setScreenShareElement(video);
          return video;
        }
      }
    }
    
    // Method 2: Fallback - find the largest video element
    let largestVideo: HTMLVideoElement | null = null;
    let largestArea = 0;
    
    videos.forEach(video => {
      const area = video.clientWidth * video.clientHeight;
      if (area > largestArea && area > 100000) { // Minimum size threshold
        largestArea = area;
        largestVideo = video;
      }
    });
    
    if (largestVideo) {
      console.log('📺 Found largest video (screen share):', largestVideo);
      setScreenShareElement(largestVideo);
    }
    
    return largestVideo;
  };

  // Try immediately
  const video = findScreenShareVideo();
  
  // If not found, keep trying (screen share might not be active yet)
  if (!video) {
    const interval = setInterval(() => {
      const found = findScreenShareVideo();
      if (found) {
        clearInterval(interval);
      }
    }, 1000); // Check every second
    
    return () => clearInterval(interval);
  }
}, [isClosing]);
```

### Step 9: Get Participant Identity from Jitsi

Update the identity/author tracking:

```tsx
// Get local participant identity from Jitsi
const getLocalParticipantId = () => {
  if (jitsiApi) {
    try {
      return jitsiApi.getDisplayName() || 'unknown';
    } catch (error) {
      console.error('Error getting participant ID:', error);
    }
  }
  return 'unknown';
};

// Use it when creating annotations
const action: AnnotationAction = {
  tool,
  color,
  width: lineWidth / 1000,
  points: /* ... */,
  author: getLocalParticipantId(), // Use Jitsi identity
  id: generateId(),
};
```

## How It Works

### Relative Coordinates

The annotation system uses **relative coordinates (0-1 range)** instead of absolute pixels:

- **Teacher's device**: 1920x1080, draws at (960, 540) → stored as (0.5, 0.5)
- **Student's device**: 1366x768, receives (0.5, 0.5) → renders at (683, 384)

This ensures annotations appear in the **same relative position** on all devices.

### Video Metrics Calculation

The system calculates:
1. **CSS size**: The video element's displayed size
2. **Content size**: The actual video content size (accounting for aspect ratio and object-fit)
3. **Offset**: Letterboxing/pillarboxing offset

```
┌──────────────────────────┐
│       (letterbox)        │ ← offsetY
│  ┌─────────────────┐     │
│  │                 │     │
│  │  Video Content  │     │ ← contentHeight
│  │                 │     │
│  └─────────────────┘     │
│       (letterbox)        │
└──────────────────────────┘
   ↑                  ↑
 offsetX         contentWidth
```

### Zoom Handling

The system detects browser zoom using `window.visualViewport.scale` and adjusts coordinates accordingly.

## Testing

1. **Single Device**: Draw annotations and verify they appear correctly
2. **Two Devices**: Draw on one, verify it appears on the other in the same position
3. **Different Sizes**: Test on desktop (1920x1080) and laptop (1366x768)
4. **Zoom Levels**: Test at 100%, 125%, 150% zoom
5. **Screen Share**: Ensure annotations only appear on screen share, not on webcams

## Troubleshooting

### Annotations don't sync
- Check browser console for Jitsi API errors
- Verify `jitsiApi.executeCommand('sendEndpointTextMessage', ...)` is working
- Check if `endpointTextMessageReceived` event is firing

### Annotations appear in wrong position
- Verify screen share video element is correctly detected
- Check `VideoMetrics` calculation in console logs
- Ensure relative coordinates are between 0 and 1

### Canvas doesn't overlay video
- Check if Jitsi iframe blocks access to video elements
- Try adding `allow="camera; microphone; display-capture"` to iframe
- Verify z-index of annotation overlay is higher than video

### Can't find screen share video
- Check Jitsi's DOM structure (varies by version)
- Look for class names: `videocontainer__video`, `large-video`, `#largeVideo`
- Add more console.log statements in `findScreenShareVideo`

## Complete Code Example

See the modified files:
- `/components/JitsiRoom.tsx` - Main integration
- `/annotation-system/components/AnnotationOverlay.tsx` - Updated overlay

## Next Steps

1. ✅ Add annotation button to JitsiRoom
2. ✅ Pass Jitsi API to AnnotationOverlay
3. ✅ Replace LiveKit communication with Jitsi
4. ✅ Test across different devices
5. 🎨 Customize toolbar appearance
6. 📱 Test on mobile devices

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify Jitsi API is loaded: `window.JitsiMeetExternalAPI`
3. Test screen share detection manually
4. Review the integration guide step-by-step
