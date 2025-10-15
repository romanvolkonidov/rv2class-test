# 🚀 Getting Started in 5 Minutes

This is the **fastest way** to get annotations working in your LiveKit app.

## Step 1: Install Dependencies (30 seconds)

```bash
npm install @livekit/components-react livekit-client lucide-react clsx tailwind-merge
```

## Step 2: Copy Files (30 seconds)

From your terminal, in your project root:

```bash
# Copy annotation components
cp -r annotation-system/components/AnnotationOverlay.tsx src/components/
cp -r annotation-system/components/ui/button.tsx src/components/ui/

# Copy utilities
cp -r annotation-system/lib/utils.ts src/lib/
```

## Step 3: Add to Your Room Component (2 minutes)

```tsx
"use client"; // If using Next.js

import { useState, useEffect } from "react";
import { useRoomContext, useDataChannel } from "@livekit/components-react";
import AnnotationOverlay from "@/components/AnnotationOverlay";

function YourRoomComponent() {
  const room = useRoomContext();
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [annotationsClosing, setAnnotationsClosing] = useState(false);
  const [hasScreenShare, setHasScreenShare] = useState(false);
  const isTutor = false; // TODO: Set based on your auth logic

  // Monitor for screen share
  useEffect(() => {
    if (!room) return;

    const checkScreenShare = () => {
      const participants = Array.from(room.remoteParticipants.values());
      participants.push(room.localParticipant);
      const hasShare = participants.some(p => 
        p.getTrackPublication("screen_share")?.track?.isEnabled
      );
      setHasScreenShare(hasShare);
      if (!hasShare && showAnnotations) setShowAnnotations(false);
    };

    checkScreenShare();
    room.on("trackPublished", checkScreenShare);
    room.on("trackUnpublished", checkScreenShare);
    return () => {
      room.off("trackPublished", checkScreenShare);
      room.off("trackUnpublished", checkScreenShare);
    };
  }, [room, showAnnotations]);

  // Listen for annotation toggle
  useDataChannel((message) => {
    try {
      const decoder = new TextDecoder();
      const data = JSON.parse(decoder.decode(message.payload));
      if (data.type === "toggleAnnotations" && !isTutor) {
        setShowAnnotations(data.show);
      }
    } catch (e) {}
  });

  // Toggle annotations
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

    // Broadcast if tutor
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
      {/* Your existing room UI here */}
      
      {/* Annotation toggle button */}
      {hasScreenShare && (
        <button
          onClick={toggleAnnotations}
          className="absolute bottom-6 right-6 p-4 rounded-xl bg-blue-500 text-white"
        >
          {showAnnotations ? "Hide" : "Show"} Annotations
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

export default YourRoomComponent;
```

## Step 4: Update Your Token API (1 minute)

Make sure your LiveKit token includes `canPublishData: true`:

```typescript
// app/api/livekit-token/route.ts
import { AccessToken } from "livekit-server-sdk";

export async function POST(req: Request) {
  const { roomName, participantName } = await req.json();

  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    { identity: participantName }
  );

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true, // ← ADD THIS!
  });

  return Response.json({ token: token.toJwt() });
}
```

## Step 5: Test It! (1 minute)

1. Start your app
2. Join a room
3. Start screen sharing
4. Click "Show Annotations"
5. Start drawing!

## ✅ Done!

You now have a fully functional annotation system with:
- ✏️ Drawing tools (pencil, eraser, shapes, text)
- 🎨 Color picker
- 📏 Size adjustments
- 🤝 Real-time collaboration
- 👥 Teacher/student roles

## 🎓 Next Steps

Want to customize or learn more?

1. **Customize Colors**: Edit the `availableColors` array in `AnnotationOverlay.tsx`
2. **Add to Control Bar**: Move the button to your existing control bar
3. **Set User Roles**: Implement your `isTutor` logic based on your auth system
4. **Read Full Docs**: Check out [README.md](./README.md) for all features

## 🐛 Troubleshooting

**Annotations not syncing?**
- Check that `canPublishData: true` is in your token
- Verify network allows data channel messages

**Canvas not aligned with video?**
- Make sure video element has `data-lk-source="screen_share"` attribute
- Check browser console for errors

**Performance issues?**
- Clear old annotations periodically
- Limit concurrent users drawing

## 📚 More Help

- **Full Integration Guide**: [INTEGRATION.md](./INTEGRATION.md)
- **All Features**: [README.md](./README.md)
- **Quick Reference**: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
- **Examples**: [examples/livekit-integration.tsx](./examples/livekit-integration.tsx)

---

**That's it! Start annotating! 🎉**
