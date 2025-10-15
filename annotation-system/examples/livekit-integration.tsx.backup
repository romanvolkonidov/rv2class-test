/**
 * Complete LiveKit Integration Example
 * 
 * ⚠️  NOTE: TypeScript errors are expected in this file!
 * This is a REFERENCE EXAMPLE meant to be copied into your own project.
 * The errors will disappear when you copy this code to a project with
 * proper dependencies installed (React, LiveKit, etc.)
 * 
 * This example shows how to integrate the annotation system
 * into a LiveKit video conferencing room with full real-time sync.
 * 
 * 📋 TO USE THIS:
 * 1. Copy the code you need into your project
 * 2. Adjust imports to match your project structure
 * 3. Install required dependencies (see package.json)
 * 4. The TypeScript errors will be gone!
 */

"use client";

import { useEffect, useState, useRef } from "react";
import { 
  LiveKitRoom, 
  RoomAudioRenderer, 
  useRoomContext, 
  useDataChannel,
  VideoConference 
} from "@livekit/components-react";
import AnnotationOverlay from "../components/AnnotationOverlay";

/**
 * Main Room Component
 * Wraps your LiveKit room with annotation support
 */
export default function RoomWithAnnotations() {
  const [token, setToken] = useState<string>("");
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || "";

  // Get token from your backend
  useEffect(() => {
    async function fetchToken() {
      const response = await fetch("/api/livekit-token", {
        method: "POST",
        body: JSON.stringify({
          roomName: "my-room",
          participantName: "user-123",
        }),
      });
      const data = await response.json();
      setToken(data.token);
    }
    fetchToken();
  }, []);

  if (!token) return <div>Loading...</div>;

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      video={true}
      audio={true}
      className="h-screen"
    >
      <RoomContent />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

/**
 * Room Content Component
 * Must be inside LiveKitRoom to access room context
 */
function RoomContent() {
  const room = useRoomContext();
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [annotationsClosing, setAnnotationsClosing] = useState(false);
  const [hasScreenShare, setHasScreenShare] = useState(false);
  const [isTutor, setIsTutor] = useState(false);

  // Check if current user is a tutor/teacher
  useEffect(() => {
    if (!room?.localParticipant) return;
    
    // You can determine this based on your app logic
    // Example: check metadata, room name, or participant attributes
    const metadata = room.localParticipant.metadata;
    if (metadata) {
      try {
        const data = JSON.parse(metadata);
        setIsTutor(data.role === "tutor" || data.role === "teacher");
      } catch (e) {
        console.error("Failed to parse metadata:", e);
      }
    }
  }, [room]);

  // Monitor for screen share tracks
  useEffect(() => {
    if (!room) return;

    const checkScreenShare = () => {
      const participants = Array.from(room.remoteParticipants.values());
      participants.push(room.localParticipant);

      const hasShare = participants.some((participant) => {
        const screenTrack = participant.getTrackPublication("screen_share");
        return screenTrack?.track?.isEnabled;
      });

      setHasScreenShare(hasShare);

      // Auto-hide annotations when screen share stops
      if (!hasShare && showAnnotations) {
        setShowAnnotations(false);
      }
    };

    checkScreenShare();
    room.on("trackPublished", checkScreenShare);
    room.on("trackUnpublished", checkScreenShare);
    room.on("trackSubscribed", checkScreenShare);
    room.on("trackUnsubscribed", checkScreenShare);

    return () => {
      room.off("trackPublished", checkScreenShare);
      room.off("trackUnpublished", checkScreenShare);
      room.off("trackSubscribed", checkScreenShare);
      room.off("trackUnsubscribed", checkScreenShare);
    };
  }, [room, showAnnotations]);

  // Listen for annotation toggle events from other participants
  useDataChannel((message) => {
    try {
      const decoder = new TextDecoder();
      const text = decoder.decode(message.payload);
      const data = JSON.parse(text);

      if (data.type === "toggleAnnotations") {
        // Students follow teacher's annotation state
        if (!isTutor) {
          setShowAnnotations(data.show);
        }
      }
    } catch (error) {
      console.error("Error processing data channel message:", error);
    }
  });

  /**
   * Toggle annotations and broadcast to all participants
   */
  const toggleAnnotations = () => {
    const newState = !showAnnotations;

    if (showAnnotations) {
      // Closing with animation
      setAnnotationsClosing(true);
      setTimeout(() => {
        setShowAnnotations(false);
        setAnnotationsClosing(false);
      }, 300);
    } else {
      setShowAnnotations(true);
    }

    // Broadcast toggle state to all participants (tutors only)
    if (isTutor && room?.localParticipant) {
      const encoder = new TextEncoder();
      const data = encoder.encode(
        JSON.stringify({ type: "toggleAnnotations", show: newState })
      );
      room.localParticipant.publishData(data, { reliable: true });
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Video Conference UI */}
      <VideoConference />

      {/* Annotation Toggle Button */}
      {hasScreenShare && (
        <button
          onClick={toggleAnnotations}
          className={`absolute bottom-24 right-6 z-50 p-4 rounded-xl backdrop-blur-xl border shadow-2xl transition-all ${
            showAnnotations
              ? "bg-blue-500/80 border-blue-400/30 text-white"
              : "bg-black/30 border-white/15 text-white hover:bg-white/20"
          }`}
          title={showAnnotations ? "Hide Annotations" : "Show Annotations"}
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
      )}

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
 * Backend Token Generation Example (Next.js API Route)
 * 
 * File: /api/livekit-token/route.ts
 */
/*
import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { roomName, participantName, metadata } = await req.json();

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    );
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
    metadata: JSON.stringify(metadata || {}),
  });

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true, // Required for annotations
  });

  return NextResponse.json({
    token: token.toJwt(),
  });
}
*/
