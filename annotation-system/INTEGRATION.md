# Integration Guide

## Step-by-Step Integration

### 1. Prerequisites

Ensure you have these installed:
```bash
npm install @livekit/components-react livekit-client lucide-react clsx tailwind-merge
```

### 2. Copy Files

Copy the annotation system to your project:
```bash
# From the annotation-system folder
cp -r components /your-project/components/
cp -r lib /your-project/lib/
```

### 3. Import Styles

Make sure your project has Tailwind CSS configured. If not, follow the [Tailwind installation guide](https://tailwindcss.com/docs/installation).

Your `tailwind.config.js` should include:
```javascript
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### 4. Add to Your LiveKit Room

```tsx
// app/room/page.tsx
"use client";

import { useState, useEffect } from "react";
import { LiveKitRoom, useRoomContext, useDataChannel } from "@livekit/components-react";
import AnnotationOverlay from "@/components/AnnotationOverlay";

function RoomContent() {
  const room = useRoomContext();
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [annotationsClosing, setAnnotationsClosing] = useState(false);
  const [hasScreenShare, setHasScreenShare] = useState(false);
  const isTutor = false; // Set based on your auth logic

  // Monitor screen share
  useEffect(() => {
    if (!room) return;

    const checkScreenShare = () => {
      const participants = Array.from(room.remoteParticipants.values());
      participants.push(room.localParticipant);

      const hasShare = participants.some((p) => {
        const screenTrack = p.getTrackPublication("screen_share");
        return screenTrack?.track?.isEnabled;
      });

      setHasScreenShare(hasShare);
      
      // Auto-hide when screen share stops
      if (!hasShare && showAnnotations) {
        setShowAnnotations(false);
      }
    };

    checkScreenShare();
    room.on("trackPublished", checkScreenShare);
    room.on("trackUnpublished", checkScreenShare);

    return () => {
      room.off("trackPublished", checkScreenShare);
      room.off("trackUnpublished", checkScreenShare);
    };
  }, [room, showAnnotations]);

  // Listen for annotation toggle from teacher
  useDataChannel((message) => {
    try {
      const decoder = new TextDecoder();
      const text = decoder.decode(message.payload);
      const data = JSON.parse(text);

      if (data.type === "toggleAnnotations") {
        setShowAnnotations(data.show);
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  });

  const toggleAnnotations = () => {
    const newState = !showAnnotations;

    if (showAnnotations) {
      setAnnotationsClosing(true);
      setTimeout(() => {
        setShowAnnotations(false);
        setAnnotationsClosing(false);
      }, 300);
    } else {
      setShowAnnotations(true);
    }

    // Broadcast to others (teacher only)
    if (isTutor && room?.localParticipant) {
      const encoder = new TextEncoder();
      const data = encoder.encode(
        JSON.stringify({ type: "toggleAnnotations", show: newState })
      );
      room.localParticipant.publishData(data, { reliable: true });
    }
  };

  return (
    <div className="relative w-full h-screen">
      {/* Your room UI */}
      
      {/* Toggle button */}
      {hasScreenShare && (
        <button onClick={toggleAnnotations}>
          Toggle Annotations
        </button>
      )}
      
      {/* Annotation overlay */}
      {(showAnnotations || annotationsClosing) && (
        <AnnotationOverlay
          onClose={isTutor ? toggleAnnotations : undefined}
          viewOnly={false}
          isClosing={annotationsClosing}
          isTutor={isTutor}
        />
      )}
    </div>
  );
}

export default function RoomPage() {
  return (
    <LiveKitRoom token={yourToken} serverUrl={yourServerUrl}>
      <RoomContent />
    </LiveKitRoom>
  );
}
```

### 5. Backend Token Configuration

Ensure your LiveKit tokens include the `canPublishData` permission:

```typescript
// Next.js API Route: app/api/livekit-token/route.ts
import { AccessToken } from "livekit-server-sdk";

export async function POST(req: Request) {
  const { roomName, participantName } = await req.json();

  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    {
      identity: participantName,
    }
  );

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true, // REQUIRED for annotations!
  });

  return Response.json({ token: token.toJwt() });
}
```

### 6. Add to Control Bar

For a better UX, add the annotation toggle to your control bar:

```tsx
// components/CustomControlBar.tsx
import { Pencil } from "lucide-react";

function CustomControlBar({ 
  showAnnotations, 
  onToggleAnnotations,
  hasScreenShare 
}) {
  if (!hasScreenShare) return null;

  return (
    <div className="control-bar">
      {/* Other controls */}
      
      <button
        onClick={onToggleAnnotations}
        className={showAnnotations ? "active" : ""}
      >
        <Pencil />
      </button>
    </div>
  );
}
```

## Common Integration Patterns

### Pattern 1: Teacher Controls Everything
- Teacher toggles annotations for everyone
- Students' annotation overlay appears/disappears based on teacher's choice
- Students can still draw when active

```tsx
// In student components
useDataChannel((message) => {
  if (data.type === "toggleAnnotations" && !isTutor) {
    setShowAnnotations(data.show);
  }
});
```

### Pattern 2: Individual Control
- Each user controls their own annotation overlay
- Annotations are still synced in real-time
- No toggle broadcasting needed

```tsx
// Each user toggles independently
const toggleAnnotations = () => {
  setShowAnnotations(!showAnnotations);
  // No broadcasting
};
```

### Pattern 3: Auto-Show on Screen Share
- Annotations automatically appear when screen share starts
- Hide when screen share stops

```tsx
useEffect(() => {
  if (hasScreenShare && !showAnnotations) {
    setShowAnnotations(true);
  } else if (!hasScreenShare && showAnnotations) {
    setShowAnnotations(false);
  }
}, [hasScreenShare]);
```

## Troubleshooting Integration

### Issue: Annotations not syncing
**Solution:** Verify `canPublishData: true` in token grants.

### Issue: Canvas not aligned with video
**Solution:** Ensure video element has `data-lk-source="screen_share"` attribute.

### Issue: Performance problems with many annotations
**Solution:** Implement periodic clearing or limit annotation history.

### Issue: Annotations disappear on window resize
**Solution:** System handles this automatically. Check for errors in browser console.

## Next Steps

- Review [TYPES.md](./TYPES.md) for detailed type definitions
- Check [examples/](./examples/) for complete working examples
- Customize colors and styles in `AnnotationOverlay.tsx`
- Add keyboard shortcuts for tools
- Implement annotation persistence (save to database)
