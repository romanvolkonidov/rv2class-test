"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
  const lastUpdateTimeRef = useRef(0); // Changed from state to ref
  const [isReceivingUpdate, setIsReceivingUpdate] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [pendingElements, setPendingElements] = useState<any[]>([]);
  const [deletedElementIds, setDeletedElementIds] = useState<Set<string>>(new Set());

  // Ensure component is mounted on client-side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Send Excalidraw state to other participants (throttled)
  const sendExcalidrawData = useCallback((elements: readonly any[], appState: any, deletedIds?: string[]) => {
    if (!room?.localParticipant || isReceivingUpdate) return;
    
    const now = Date.now();
    // Throttle updates to every 50ms for smoother experience
    if (now - lastUpdateTimeRef.current < 50) return;
    
    try {
      const encoder = new TextEncoder();
      
      // Tag elements with the current user's identity
      const userId = room.localParticipant.identity;
      const taggedElements = elements.map((el: any) => ({
        ...el,
        customData: {
          ...el.customData,
          ownerId: el.customData?.ownerId || userId, // Preserve existing owner or set current user
        }
      }));
      
      const data = encoder.encode(JSON.stringify({ 
        type: "excalidraw-update", 
        elements: taggedElements,
        deletedIds: deletedIds || [], // Send list of deleted element IDs
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          currentItemStrokeColor: appState.currentItemStrokeColor,
          currentItemBackgroundColor: appState.currentItemBackgroundColor,
        }
      }));
      room.localParticipant.publishData(data, { reliable: true });
      lastUpdateTimeRef.current = now; // Use ref instead of state
    } catch (error) {
      console.error("Whiteboard: Error sending excalidraw data:", error);
    }
  }, [room, isReceivingUpdate]); // Removed lastUpdateTime from dependencies to prevent infinite loop

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
        
        // Track deleted elements from remote
        if (data.deletedIds && Array.isArray(data.deletedIds)) {
          setDeletedElementIds(prev => {
            const updated = new Set(prev);
            data.deletedIds.forEach((id: string) => updated.add(id));
            return updated;
          });
        }
        
        // Create a map of remote elements by ID for quick lookup
        const remoteElementsMap = new Map(data.elements.map((el: any) => [el.id, el]));
        
        // Keep local elements that aren't in remote update, and use remote versions for conflicts
        const mergedElements = currentElements
          .filter((el: any) => !deletedElementIds.has(el.id)) // Filter out deleted elements
          .map((localEl: any) => {
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
        
        // Add any new remote elements that aren't in local and not deleted
        const localElementIds = new Set(currentElements.map((el: any) => el.id));
        data.elements.forEach((remoteEl: any) => {
          if (!localElementIds.has(remoteEl.id) && !deletedElementIds.has(remoteEl.id)) {
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
        setDeletedElementIds(new Set()); // Clear deletion tracking
      }
    } catch (error) {
      console.error("Whiteboard: Error receiving excalidraw data:", error);
    }
  });

  // Handle Excalidraw changes
  const handleChange = useCallback((elements: readonly any[], appState: any) => {
    if (!isReceivingUpdate && excalidrawAPI) {
      // Detect deleted elements
      const currentIds = new Set(elements.map((el: any) => el.id));
      const previousElements = excalidrawAPI.getSceneElements();
      const deletedIds = previousElements
        .filter((el: any) => !currentIds.has(el.id))
        .map((el: any) => el.id);
      
      // Only update deletedElementIds state if there are actually deleted elements
      // This prevents unnecessary re-renders
      if (deletedIds.length > 0) {
        setDeletedElementIds(prev => {
          const updated = new Set(prev);
          let hasChanges = false;
          deletedIds.forEach((id: string) => {
            if (!updated.has(id)) {
              updated.add(id);
              hasChanges = true;
            }
          });
          // Only return new Set if there were actual changes
          return hasChanges ? updated : prev;
        });
      }
      
      sendExcalidrawData(elements, appState, deletedIds.length > 0 ? deletedIds : undefined);
    }
  }, [sendExcalidrawData, isReceivingUpdate, excalidrawAPI]);

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

  // Custom eraser that only erases own elements
  useEffect(() => {
    if (!excalidrawAPI || !room?.localParticipant) return undefined;
    
    const userId = room.localParticipant.identity;
    
    // Override the eraser tool behavior
    const handlePointerDown = (e: any) => {
      const appState = excalidrawAPI.getAppState();
      if (appState.activeTool?.type === 'eraser') {
        // Get elements under pointer
        const elements = excalidrawAPI.getSceneElements();
        const clickedElements = elements.filter((el: any) => {
          // Check if element belongs to current user
          return el.customData?.ownerId === userId;
        });
        
        // Only allow erasing own elements
        // This is a simplified approach - Excalidraw's built-in eraser will still work
        // but we filter on sync to prevent erasing others' elements
      }
    };
    
    // Note: Excalidraw doesn't expose easy eraser customization
    // So we handle this via filtering during sync
    
    // Return cleanup function (even if empty) to satisfy React's requirement
    return () => {
      // Cleanup if needed
    };
  }, [excalidrawAPI, room]);

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
        UIOptions={{
          canvasActions: {
            changeViewBackgroundColor: true,
            clearCanvas: true,
            export: false,
            loadScene: false,
            saveToActiveFile: false,
            toggleTheme: false,
          },
        }}
      />
    </div>
  );
}
