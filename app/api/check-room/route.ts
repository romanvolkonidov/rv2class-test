import { NextRequest, NextResponse } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

export async function POST(req: NextRequest) {
  try {
    const { roomName } = await req.json();

    console.log('🔍 Checking room:', roomName);

    if (!roomName) {
      return NextResponse.json(
        { error: "Room name is required" },
        { status: 400 }
      );
    }

    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
      console.error("Missing LiveKit environment variables:", {
        hasApiKey: !!LIVEKIT_API_KEY,
        hasSecret: !!LIVEKIT_API_SECRET,
        hasUrl: !!LIVEKIT_URL,
      });
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Convert WebSocket URL to HTTP/HTTPS for API calls
    const apiUrl = LIVEKIT_URL.replace(/^ws/, 'http');
    console.log('📡 Connecting to LiveKit:', apiUrl);

    // Use the official LiveKit SDK - much more reliable than manual HTTP
    const roomService = new RoomServiceClient(apiUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

    try {
      // List rooms with the specific room name
      const rooms = await roomService.listRooms([roomName]);
      console.log('✅ LiveKit SDK response:', { roomCount: rooms.length, rooms });

      if (rooms.length > 0) {
        const room = rooms[0];
        return NextResponse.json({
          exists: true,
          numParticipants: room.numParticipants || 0,
          participants: room.numParticipants || 0,
          creationTime: room.creationTime,
        });
      } else {
        return NextResponse.json({
          exists: false,
          numParticipants: 0,
        });
      }
    } catch (sdkError: any) {
      console.error("❌ LiveKit SDK error:", {
        message: sdkError.message,
        code: sdkError.code,
        stack: sdkError.stack,
      });

      // Provide helpful error messages
      if (sdkError.message?.includes('401') || sdkError.message?.includes('403')) {
        console.error("🔐 Authentication failed! Verify your LIVEKIT_API_KEY and LIVEKIT_API_SECRET");
      }

      return NextResponse.json(
        {
          error: "Failed to check room status",
          details: sdkError.message,
          hint: "Check LiveKit server connection and credentials"
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error checking room:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error?.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}
