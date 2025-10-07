"use client";

import { useState, useCallback } from "react";
import { Excalidraw, MainMenu, WelcomeScreen } from "@excalidraw/excalidraw";
import { useRoomContext, useDataChannel } from "@livekit/components-react";

export default function Whiteboard() {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const room = useRoomContext();
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  const [isReceivingUpdate, setIsReceivingUpdate] = useState(false);

  // Send Excalidraw state to other participants (throttled)
  const sendExcalidrawData = useCallback((elements: readonly any[], appState: any) => {
    if (!room?.localParticipant || isReceivingUpdate) return;
    
    const now = Date.now();
    // Throttle updates to every 100ms
    if (now - lastUpdateTime < 100) return;
    
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
        excalidrawAPI.updateScene({
          elements: data.elements,
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
      >
        <MainMenu>
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.Export />
          <MainMenu.DefaultItems.LoadScene />
          <MainMenu.DefaultItems.SaveToActiveFile />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
        </MainMenu>
        <WelcomeScreen>
          <WelcomeScreen.Hints.MenuHint />
          <WelcomeScreen.Hints.ToolbarHint />
          <WelcomeScreen.Hints.HelpHint />
        </WelcomeScreen>
      </Excalidraw>
    </div>
  );
}
