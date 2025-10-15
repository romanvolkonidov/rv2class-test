# Quick Start: Jitsi Annotation Integration

## Files Created

✅ **JitsiAnnotationOverlay.tsx** - New component optimized for Jitsi
✅ **JITSI_ANNOTATION_INTEGRATION_GUIDE.md** - Complete integration guide

## 3-Step Integration

### Step 1: Import the Component

Add to your `components/JitsiRoom.tsx`:

```tsx
import JitsiAnnotationOverlay from "@/components/JitsiAnnotationOverlay";
```

### Step 2: Add State Variables

Add these state variables in your JitsiRoom component:

```tsx
const [showAnnotations, setShowAnnotations] = useState(false);
const [annotationsClosing, setAnnotationsClosing] = useState(false);
```

### Step 3: Add Button & Component

Add the button (next to your whiteboard button):

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
        
        // Broadcast toggle to all participants
        if (jitsiApiRef.current) {
          try {
            jitsiApiRef.current.executeCommand('sendEndpointTextMessage', '', JSON.stringify({
              type: 'toggleAnnotations',
              show: !showAnnotations
            }));
          } catch (error) {
            console.error('Error broadcasting annotation toggle:', error);
          }
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

Add the component (after your whiteboard component):

```tsx
{/* Annotation Overlay */}
{showAnnotations && (
  <JitsiAnnotationOverlay
    onClose={() => {
      setAnnotationsClosing(true);
      setTimeout(() => {
        setShowAnnotations(false);
        setAnnotationsClosing(false);
      }, 300);
      
      // Broadcast close to students
      if (jitsiApiRef.current) {
        try {
          jitsiApiRef.current.executeCommand('sendEndpointTextMessage', '', JSON.stringify({
            type: 'toggleAnnotations',
            show: false
          }));
        } catch (error) {
          console.error('Error broadcasting annotation close:', error);
        }
      }
    }}
    viewOnly={false}
    isClosing={annotationsClosing}
    isTutor={isTutor}
    jitsiApi={jitsiApiRef.current}
  />
)}
```

### Step 4: Listen for Toggle Messages (Students)

Add this useEffect for students to respond to teacher's toggle:

```tsx
// Listen for annotation toggle messages (students only)
useEffect(() => {
  if (!jitsiApiRef.current || isTutor) return;

  const handleEndpointMessage = (participant: any, data: any) => {
    try {
      const message = JSON.parse(data);
      if (message.type === 'toggleAnnotations') {
        if (message.show) {
          setShowAnnotations(true);
          setAnnotationsClosing(false);
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

## That's It! 🎉

Your annotation system is now integrated. Key features:

✅ **Device-Independent** - Uses relative coordinates (0-1 range)
✅ **Real-Time Sync** - Via Jitsi's data channel
✅ **Auto-Detection** - Finds screen share video automatically
✅ **Collaborative** - Multiple users can annotate simultaneously
✅ **Teacher Controls** - Clear all, clear mine, clear students

## Testing Checklist

1. ✅ Start a Jitsi meeting
2. ✅ Share your screen (teacher)
3. ✅ Click the annotation button (green pencil)
4. ✅ Draw on the shared screen
5. ✅ Have another user join and verify they see annotations
6. ✅ Test on different screen sizes
7. ✅ Test browser zoom (100%, 125%, 150%)

## Troubleshooting

### Annotations don't appear
- Check browser console for errors
- Verify screen share is active
- Check that video element is found (look for console logs: "✅ Found Jitsi screen share video")

### Annotations in wrong position
- This should be automatic due to relative coordinates
- Check console logs for VideoMetrics calculation
- Verify screen share video's object-fit style

### No real-time sync
- Check that Jitsi API is loaded: `window.JitsiMeetExternalAPI`
- Verify `sendEndpointTextMessage` is working (check browser console)
- Ensure `endpointTextMessageReceived` listener is registered

## Need Help?

See the full integration guide: **JITSI_ANNOTATION_INTEGRATION_GUIDE.md**
