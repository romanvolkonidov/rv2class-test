/**
 * Standalone Usage Example
 * 
 * ⚠️  NOTE: TypeScript errors are expected in this file!
 * This is a REFERENCE EXAMPLE meant to be copied into your own project.
 * The errors will disappear when you copy this code to a project with
 * proper dependencies installed (React, etc.)
 * 
 * This example shows how to use the annotation system without LiveKit,
 * using your own custom synchronization mechanism (WebSocket, Firebase, etc.)
 * 
 * 📋 TO USE THIS:
 * 1. Copy the patterns you need into your project
 * 2. Replace MockSyncProvider with your real sync solution
 * 3. See commented examples for Firebase/WebSocket integration
 * 4. The TypeScript errors will be gone!
 */

"use client";

import { useState, useEffect, createContext, useContext } from "react";
import AnnotationOverlay from "../components/AnnotationOverlay";

/**
 * Custom Sync Context
 * Replace this with your own real-time sync solution
 */
interface SyncContextType {
  localParticipant: {
    identity: string;
    publishData: (data: Uint8Array, options: any) => void;
  };
  on: (event: string, handler: (data: any) => void) => void;
  off: (event: string, handler: (data: any) => void) => void;
}

const SyncContext = createContext<SyncContextType | null>(null);

/**
 * Custom Hook to Replace useRoomContext
 */
export function useCustomSync() {
  return useContext(SyncContext);
}

/**
 * Custom Hook to Replace useDataChannel
 */
export function useCustomDataChannel(
  handler: (message: { payload: Uint8Array }) => void
) {
  const sync = useCustomSync();

  useEffect(() => {
    if (!sync) return;

    const wrappedHandler = (data: any) => {
      handler({ payload: data });
    };

    sync.on("data", wrappedHandler);
    return () => {
      sync.off("data", wrappedHandler);
    };
  }, [sync, handler]);
}

/**
 * Mock Sync Provider (replace with your real implementation)
 */
function MockSyncProvider({ children }: { children: React.ReactNode }) {
  const [handlers, setHandlers] = useState<Map<string, Set<Function>>>(
    new Map()
  );

  const syncValue: SyncContextType = {
    localParticipant: {
      identity: "user-" + Math.random().toString(36).substr(2, 9),
      publishData: (data: Uint8Array, options: any) => {
        // Broadcast to all listeners (mock)
        // In real implementation, send via WebSocket/Firebase/etc.
        const dataHandlers = handlers.get("data");
        if (dataHandlers) {
          dataHandlers.forEach((handler) => handler(data));
        }
      },
    },
    on: (event: string, handler: (data: any) => void) => {
      setHandlers((prev) => {
        const newHandlers = new Map(prev);
        if (!newHandlers.has(event)) {
          newHandlers.set(event, new Set());
        }
        newHandlers.get(event)!.add(handler);
        return newHandlers;
      });
    },
    off: (event: string, handler: (data: any) => void) => {
      setHandlers((prev) => {
        const newHandlers = new Map(prev);
        const eventHandlers = newHandlers.get(event);
        if (eventHandlers) {
          eventHandlers.delete(handler);
        }
        return newHandlers;
      });
    },
  };

  return <SyncContext.Provider value={syncValue}>{children}</SyncContext.Provider>;
}

/**
 * Main Component with Custom Annotation System
 */
export default function StandaloneAnnotationExample() {
  return (
    <MockSyncProvider>
      <AnnotationRoom />
    </MockSyncProvider>
  );
}

function AnnotationRoom() {
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [annotationsClosing, setAnnotationsClosing] = useState(false);
  const [isTutor] = useState(true); // Set based on your app logic

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
  };

  return (
    <div className="relative w-full h-screen bg-gray-900">
      {/* Your video/screen share content here */}
      <div className="w-full h-full flex items-center justify-center">
        <video
          data-lk-source="screen_share"
          className="max-w-full max-h-full"
          autoPlay
          playsInline
        />
      </div>

      {/* Annotation Toggle Button */}
      <button
        onClick={toggleAnnotations}
        className={`absolute bottom-6 right-6 z-50 p-4 rounded-xl backdrop-blur-xl border shadow-2xl transition-all ${
          showAnnotations
            ? "bg-blue-500/80 border-blue-400/30 text-white"
            : "bg-black/30 border-white/15 text-white hover:bg-white/20"
        }`}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
          />
        </svg>
      </button>

      {/* Annotation Overlay */}
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

/**
 * Firebase Integration Example
 * 
 * If you want to use Firebase Realtime Database or Firestore for sync:
 */
/*
import { ref, onValue, set } from "firebase/database";
import { database } from "./firebase-config";

function FirebaseSyncProvider({ roomId, children }) {
  const [handlers, setHandlers] = useState<Map<string, Set<Function>>>(new Map());

  useEffect(() => {
    const annotationsRef = ref(database, `rooms/${roomId}/annotations`);
    
    const unsubscribe = onValue(annotationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Notify all data handlers
        const encoder = new TextEncoder();
        const encoded = encoder.encode(JSON.stringify(data));
        
        const dataHandlers = handlers.get("data");
        if (dataHandlers) {
          dataHandlers.forEach((handler) => handler(encoded));
        }
      }
    });

    return () => unsubscribe();
  }, [roomId, handlers]);

  const syncValue: SyncContextType = {
    localParticipant: {
      identity: auth.currentUser?.uid || "anonymous",
      publishData: (data: Uint8Array, options: any) => {
        const decoder = new TextDecoder();
        const text = decoder.decode(data);
        const parsed = JSON.parse(text);
        
        // Write to Firebase
        const annotationsRef = ref(database, `rooms/${roomId}/annotations/${Date.now()}`);
        set(annotationsRef, parsed);
      },
    },
    on: (event: string, handler: (data: any) => void) => {
      setHandlers((prev) => {
        const newHandlers = new Map(prev);
        if (!newHandlers.has(event)) {
          newHandlers.set(event, new Set());
        }
        newHandlers.get(event)!.add(handler);
        return newHandlers;
      });
    },
    off: (event: string, handler: (data: any) => void) => {
      setHandlers((prev) => {
        const newHandlers = new Map(prev);
        const eventHandlers = newHandlers.get(event);
        if (eventHandlers) {
          eventHandlers.delete(handler);
        }
        return newHandlers;
      });
    },
  };

  return <SyncContext.Provider value={syncValue}>{children}</SyncContext.Provider>;
}
*/

/**
 * WebSocket Integration Example
 */
/*
function WebSocketSyncProvider({ url, children }) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [handlers, setHandlers] = useState<Map<string, Set<Function>>>(new Map());

  useEffect(() => {
    const websocket = new WebSocket(url);
    
    websocket.onmessage = (event) => {
      const encoder = new TextEncoder();
      const data = encoder.encode(event.data);
      
      const dataHandlers = handlers.get("data");
      if (dataHandlers) {
        dataHandlers.forEach((handler) => handler(data));
      }
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [url, handlers]);

  const syncValue: SyncContextType = {
    localParticipant: {
      identity: "user-" + Math.random().toString(36).substr(2, 9),
      publishData: (data: Uint8Array, options: any) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          const decoder = new TextDecoder();
          const text = decoder.decode(data);
          ws.send(text);
        }
      },
    },
    on: (event: string, handler: (data: any) => void) => {
      setHandlers((prev) => {
        const newHandlers = new Map(prev);
        if (!newHandlers.has(event)) {
          newHandlers.set(event, new Set());
        }
        newHandlers.get(event)!.add(handler);
        return newHandlers;
      });
    },
    off: (event: string, handler: (data: any) => void) => {
      setHandlers((prev) => {
        const newHandlers = new Map(prev);
        const eventHandlers = newHandlers.get(event);
        if (eventHandlers) {
          eventHandlers.delete(handler);
        }
        return newHandlers;
      });
    },
  };

  return <SyncContext.Provider value={syncValue}>{children}</SyncContext.Provider>;
}
*/
