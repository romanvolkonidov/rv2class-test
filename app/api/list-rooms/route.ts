import { NextRequest, NextResponse } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

export async function GET(req: NextRequest) {
  try {
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
      return NextResponse.json(
        { error: "Missing LiveKit credentials" },
        { status: 500 }
      );
    }

    const apiUrl = LIVEKIT_URL.replace(/^ws/, 'http');
    const roomService = new RoomServiceClient(apiUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

    try {
      // List all rooms (empty array = all rooms)
      const rooms = await roomService.listRooms([]);
      
      // Format room data
      const roomData = rooms.map(room => ({
        name: room.name,
        numParticipants: room.numParticipants || 0,
        creationTime: room.creationTime ? String(room.creationTime) : undefined,
        // Extract teacher name from room name (e.g., "roman" from "roman")
        teacher: room.name,
      }));

      return NextResponse.json({ rooms: roomData });
    } catch (sdkError: any) {
      console.error("❌ LiveKit SDK error:", sdkError);
      return NextResponse.json(
        { error: "Failed to list rooms", details: sdkError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error listing rooms:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}
