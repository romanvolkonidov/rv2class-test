import { NextRequest, NextResponse } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

export async function POST(req: NextRequest) {
  try {
    const { roomName } = await req.json();

    if (!roomName) {
      return NextResponse.json(
        { error: "Room name is required" },
        { status: 400 }
      );
    }

    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
      return NextResponse.json(
        { error: "Missing LiveKit credentials" },
        { status: 500 }
      );
    }

    const apiUrl = LIVEKIT_URL.replace(/^ws/, 'http');
    const roomService = new RoomServiceClient(apiUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

    try {
      console.log(`🗑️ Closing room: ${roomName}`);
      
      // Delete the room from LiveKit
      await roomService.deleteRoom(roomName);
      
      console.log(`✅ Room ${roomName} closed successfully`);
      
      return NextResponse.json({ 
        success: true,
        message: `Room ${roomName} closed successfully` 
      });
    } catch (sdkError: any) {
      console.error("❌ LiveKit SDK error:", sdkError);
      return NextResponse.json(
        { error: "Failed to close room", details: sdkError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error closing room:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}
