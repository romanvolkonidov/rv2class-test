import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

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

    // Extract the base URL without the protocol
    // Handle both ws:// and wss:// (convert to http/https for API calls)
    const baseUrl = LIVEKIT_URL.replace(/^(wss?:\/\/)/, '').replace(/^(https?:\/\/)/, '');
    const protocol = LIVEKIT_URL.startsWith('wss://') || LIVEKIT_URL.startsWith('https://') ? 'https' : 'http';
    
    const apiUrl = `${protocol}://${baseUrl}/twirp/livekit.RoomService/ListRooms`;
    console.log('📡 Calling LiveKit API:', apiUrl);

    // Call LiveKit API to check if room exists
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await generateServerToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ names: [roomName] }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("LiveKit API error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      return NextResponse.json(
        { error: "Failed to check room status", details: errorText },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log('✅ LiveKit response:', data);
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
