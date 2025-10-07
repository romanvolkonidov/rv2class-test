"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRoomContext, useDataChannel } from "@livekit/components-react";

// Dynamically import Excalidraw to avoid SSR issues
const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  { ssr: false }
);

export default function Whiteboard() {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const room = useRoomContext();
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  const [isReceivingUpdate, setIsReceivingUpdate] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [pendingElements, setPendingElements] = useState<any[]>([]);

  // Ensure component is mounted on client-side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Send Excalidraw state to other participants (throttled)
  const sendExcalidrawData = useCallback((elements: readonly any[], appState: any) => {
    if (!room?.localParticipant || isReceivingUpdate) return;
    
    const now = Date.now();
    // Throttle updates to every 50ms for smoother experience
    if (now - lastUpdateTime < 50) return;
    
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify({ 
        type: "excalidraw-update", 
        elements: elements,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          currentItemStrokeColor: appState.currentItemStrokeColor,
          currentItemBackgroundColor: appState.currentItemBackgroundColor,
        }
      }));
      room.localParticipant.publishData(data, { reliable: true });
      setLastUpdateTime(now);
    } catch (error) {
      console.error("Whiteboard: Error sending excalidraw data:", error);
    }
  }, [room, lastUpdateTime, isReceivingUpdate]);

  // Receive Excalidraw data from other participants
  useDataChannel((message) => {
    try {
      const decoder = new TextDecoder();
      const text = decoder.decode(message.payload);
      const data = JSON.parse(text);
      
      if (data.type === "excalidraw-update" && excalidrawAPI && data.elements) {
        setIsReceivingUpdate(true);
        
        // Get current scene elements
        const currentElements = excalidrawAPI.getSceneElements();
        
        // Merge remote elements with local elements
        // Create a map of remote elements by ID for quick lookup
        const remoteElementsMap = new Map(data.elements.map((el: any) => [el.id, el]));
        
        // Keep local elements that aren't in remote update, and use remote versions for conflicts
        const mergedElements = currentElements.map((localEl: any) => {
          const remoteEl: any = remoteElementsMap.get(localEl.id);
          if (remoteEl) {
            // Remote element exists, use the one with higher version
            const localVersion = localEl.version || 0;
            const remoteVersion = remoteEl.version || 0;
            return remoteVersion > localVersion ? remoteEl : localEl;
          }
          // Keep local element if not in remote
          return localEl;
        });
        
        // Add any new remote elements that aren't in local
        const localElementIds = new Set(currentElements.map((el: any) => el.id));
        data.elements.forEach((remoteEl: any) => {
          if (!localElementIds.has(remoteEl.id)) {
            mergedElements.push(remoteEl);
          }
        });
        
        excalidrawAPI.updateScene({
          elements: mergedElements,
          appState: data.appState,
        });
        
        // Reset the flag after a short delay
        setTimeout(() => setIsReceivingUpdate(false), 50);
      } else if (data.type === "excalidraw-clear" && excalidrawAPI) {
        excalidrawAPI.resetScene();
      }
    } catch (error) {
      console.error("Whiteboard: Error receiving excalidraw data:", error);
    }
  });

  // Handle Excalidraw changes
  const handleChange = useCallback((elements: readonly any[], appState: any) => {
    if (!isReceivingUpdate) {
      sendExcalidrawData(elements, appState);
    }
  }, [sendExcalidrawData, isReceivingUpdate]);

  // Show loading state while mounting
  if (!isMounted) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading whiteboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        onChange={handleChange}
        initialData={{
          appState: {
            viewBackgroundColor: "#ffffff",
          },
        }}
      />
    </div>
  );
}
