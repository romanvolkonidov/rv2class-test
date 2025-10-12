import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

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
      console.error("Missing LiveKit environment variables");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Extract the base URL without the protocol
    // Handle both ws:// and wss:// (convert to http/https for API calls)
    const baseUrl = LIVEKIT_URL.replace(/^(wss?:\/\/)/, '').replace(/^(https?:\/\/)/, '');
    const protocol = LIVEKIT_URL.startsWith('wss://') || LIVEKIT_URL.startsWith('https://') ? 'https' : 'http';

    // Call LiveKit API to check if room exists
    const response = await fetch(`${protocol}://${baseUrl}/twirp/livekit.RoomService/ListRooms`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await generateServerToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ names: [roomName] }),
    });

    if (!response.ok) {
      console.error("LiveKit API error:", response.status, await response.text());
      return NextResponse.json(
        { error: "Failed to check room status" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const rooms = data.rooms || [];
    const room = rooms.find((r: any) => r.name === roomName);

    if (room) {
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
  } catch (error) {
    console.error("Error checking room:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Generate a server token for API authentication
async function generateServerToken() {
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    throw new Error("Missing LiveKit credentials");
  }

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: "server-api",
  });
  
  at.addGrant({
    roomAdmin: true,
    room: "*",
  });

  return at.toJwt();
}
