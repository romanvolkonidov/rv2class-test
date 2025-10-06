"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LiveKitRoom, VideoConference, RoomAudioRenderer, useRoomContext, useDataChannel } from "@livekit/components-react";
import "@livekit/components-styles";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, Check, Edit3 } from "lucide-react";
import Whiteboard from "@/components/Whiteboard";
import AnnotationOverlay from "@/components/AnnotationOverlay";

function RoomContent({ isTutor, userName, sessionCode }: { isTutor: boolean; userName: string; sessionCode: string }) {
  const room = useRoomContext();
  const [copied, setCopied] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [hasScreenShare, setHasScreenShare] = useState(false);

  // Debug: Log room participants
  useEffect(() => {
    if (!room) return;
    
    const logParticipants = () => {
      // Only log if the room is actually connected
      if (!room.name || !room.localParticipant?.identity) {
        console.log('⏳ Room not yet connected...');
        return;
      }
      const participants = Array.from(room.remoteParticipants.values());
      console.log(`👥 Room participants (${participants.length + 1} total):`, {
        local: room.localParticipant.identity,
        remote: participants.map(p => p.identity),
        roomName: room.name,
      });
    };

    // Wait for the room to be fully connected
    room.on('connected', () => {
      console.log('🎉 Room connected!');
      logParticipants();
    });
    
    room.on('participantConnected', (participant) => {
      console.log('✅ Participant connected:', participant.identity);
      logParticipants();
    });
    
    room.on('participantDisconnected', (participant) => {
      console.log('❌ Participant disconnected:', participant.identity);
      logParticipants();
    });

    // Check if already connected
    if (room.state === 'connected') {
      logParticipants();
    }

    return () => {
      room.off('connected', logParticipants);
      room.off('participantConnected', logParticipants);
      room.off('participantDisconnected', logParticipants);
    };
  }, [room]);

  // Monitor for screen share
  useEffect(() => {
    const checkScreenShare = () => {
      const videos = document.querySelectorAll('video');
      let found = false;
      for (const video of videos) {
        const source = video.getAttribute('data-lk-source');
        if (source === 'screen_share' || source === 'screen_share_audio') {
          found = true;
          break;
        }
      }
      setHasScreenShare(found);
      
      // If screen share stops, clear annotations
      if (!found && hasScreenShare) {
        setShowAnnotations(false);
      }
    };

    checkScreenShare();
    const interval = setInterval(checkScreenShare, 1000);
    return () => clearInterval(interval);
  }, [hasScreenShare]);

  // Listen for whiteboard state changes from tutor
  useDataChannel((message) => {
    try {
      const decoder = new TextDecoder();
      const text = decoder.decode(message.payload);
      const data = JSON.parse(text);
      
      if (data.type === "toggleWhiteboard") {
        setShowWhiteboard(data.show);
      } else if (data.type === "toggleAnnotations") {
        // Students follow teacher's annotation state
        if (!isTutor) {
          setShowAnnotations(data.show);
        }
      }
    } catch (error) {
      console.error("Error processing whiteboard toggle:", error);
    }
  });

  const toggleWhiteboard = () => {
    const newState = !showWhiteboard;
    setShowWhiteboard(newState);
    
    // If tutor, broadcast the state to all participants
    if (isTutor) {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify({ type: "toggleWhiteboard", show: newState }));
      room.localParticipant.publishData(data, { reliable: true });
    }
  };

  const toggleAnnotations = () => {
    const newState = !showAnnotations;
    setShowAnnotations(newState);
    
    // If tutor, broadcast the state to all participants
    if (isTutor) {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify({ type: "toggleAnnotations", show: newState }));
      room.localParticipant.publishData(data, { reliable: true });
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">RV2Class</h1>
            <p className="text-sm text-gray-400">
              {isTutor ? "Tutor" : "Student"} • {userName}
            </p>
          </div>
          {isTutor && sessionCode && (
            <Card className="bg-gray-700/50 border-gray-600">
              <CardContent className="p-3 flex items-center gap-3">
                <div>
                  <p className="text-xs text-gray-400">Session Code</p>
                  <p className="text-lg font-mono font-bold text-white">{sessionCode}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={copyCode}
                  className="text-white hover:bg-gray-600"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </CardContent>
            </Card>
          )}
          <div className="flex gap-2">
            {!showWhiteboard && isTutor && (
              <Button
                variant={showAnnotations ? "default" : "secondary"}
                onClick={toggleAnnotations}
              >
                <Edit3 className="mr-2 h-4 w-4" />
                {showAnnotations ? "Hide Annotations" : "Annotate"}
              </Button>
            )}
            {isTutor && (
              <Button
                variant={showWhiteboard ? "default" : "secondary"}
                onClick={toggleWhiteboard}
              >
                {showWhiteboard ? "Show Video" : "Show Whiteboard"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative">
        {showWhiteboard ? (
          <Whiteboard />
        ) : (
          <>
            <VideoConference />
            <RoomAudioRenderer />
            {/* Show annotations for everyone when active - tutor gets close button, students don't */}
            {showAnnotations && (
              <AnnotationOverlay 
                onClose={isTutor ? () => toggleAnnotations() : undefined} 
                viewOnly={false} 
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RoomPage() {
  const searchParams = useSearchParams();
  const roomName = searchParams?.get("room") || "";
  const userName = searchParams?.get("name") || "";
  const isTutor = searchParams?.get("isTutor") === "true";
  const sessionCode = searchParams?.get("code") || "";

  const [token, setToken] = useState("");

  useEffect(() => {
    if (!roomName || !userName) return;

    console.log("🔵 Connecting to room:", { roomName, userName, isTutor });

    (async () => {
      try {
        const resp = await fetch("/api/livekit-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomName, participantName: userName, isTutor }),
        });
        const data = await resp.json();
        console.log("✅ Got token for room:", roomName);
        setToken(data.token);
      } catch (e) {
        console.error("❌ Error fetching token:", e);
      }
    })();
  }, [roomName, userName, isTutor]);

  if (token === "") {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Connecting to session...</p>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={isTutor}
      audio={isTutor}
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      data-lk-theme="default"
      className="h-full"
      connect={true}
      connectOptions={{
        autoSubscribe: true,
      }}
    >
      <RoomContent isTutor={isTutor} userName={userName} sessionCode={sessionCode} />
    </LiveKitRoom>
  );
}

export default function RoomPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <RoomPage />
    </Suspense>
  );
}
