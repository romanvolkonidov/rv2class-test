"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LiveKitRoom, VideoConference, RoomAudioRenderer, useRoomContext } from "@livekit/components-react";
import "@livekit/components-styles";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MonitorUp, Copy, Check, Pencil, Eraser, Square, Circle, X } from "lucide-react";
import { Room } from "livekit-client";
import Whiteboard from "@/components/Whiteboard";

function RoomPage() {
  const searchParams = useSearchParams();
  const roomName = searchParams?.get("room") || "";
  const userName = searchParams?.get("name") || "";
  const isTutor = searchParams?.get("isTutor") === "true";
  const sessionCode = searchParams?.get("code") || "";

  const [token, setToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);

  useEffect(() => {
    if (!roomName || !userName) return;

    (async () => {
      try {
        const resp = await fetch("/api/livekit-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomName, participantName: userName, isTutor }),
        });
        const data = await resp.json();
        setToken(data.token);
      } catch (e) {
        console.error("Error fetching token:", e);
      }
    })();
  }, [roomName, userName, isTutor]);

  const copyCode = () => {
    navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          <Button
            variant={showWhiteboard ? "default" : "secondary"}
            onClick={() => setShowWhiteboard(!showWhiteboard)}
          >
            {showWhiteboard ? "Show Video" : "Show Whiteboard"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <LiveKitRoom
          video={true}
          audio={true}
          token={token}
          serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
          data-lk-theme="default"
          className="h-full"
        >
          {showWhiteboard ? (
            <Whiteboard />
          ) : (
            <>
              <VideoConference />
              <RoomAudioRenderer />
              {isTutor && <ScreenShareControls />}
            </>
          )}
        </LiveKitRoom>
      </div>
    </div>
  );
}

function ScreenShareControls() {
  const room = useRoomContext();
  const [isSharing, setIsSharing] = useState(false);

  const startScreenShare = async () => {
    try {
      await room.localParticipant.setScreenShareEnabled(true, {
        audio: true,
        selfBrowserSurface: "include",
        surfaceSwitching: "include",
        systemAudio: "include",
      } as any);
      setIsSharing(true);
    } catch (error) {
      console.error("Error starting screen share:", error);
      alert("Failed to start screen sharing. Please ensure you grant permission.");
    }
  };

  const stopScreenShare = async () => {
    try {
      await room.localParticipant.setScreenShareEnabled(false);
      setIsSharing(false);
    } catch (error) {
      console.error("Error stopping screen share:", error);
    }
  };

  return (
    <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-50">
      <Button
        onClick={isSharing ? stopScreenShare : startScreenShare}
        size="lg"
        variant={isSharing ? "destructive" : "default"}
        className="shadow-lg"
      >
        <MonitorUp className="mr-2 h-5 w-5" />
        {isSharing ? "Stop Sharing" : "Share Screen"}
      </Button>
    </div>
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
