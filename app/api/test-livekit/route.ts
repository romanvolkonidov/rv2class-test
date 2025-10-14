import { NextRequest, NextResponse } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";

export async function GET(req: NextRequest) {
  const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
  const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
  const LIVEKIT_URL = process.env.LIVEKIT_URL;

  const debug: any = {
    timestamp: new Date().toISOString(),
    env_vars: {
      LIVEKIT_URL: LIVEKIT_URL ? `${LIVEKIT_URL.substring(0, 20)}...` : 'MISSING',
      LIVEKIT_API_KEY: LIVEKIT_API_KEY ? `${LIVEKIT_API_KEY.substring(0, 8)}...` : 'MISSING',
      LIVEKIT_API_SECRET: LIVEKIT_API_SECRET ? 'SET (hidden)' : 'MISSING',
    }
  };

  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    return NextResponse.json({
      ...debug,
      error: "Missing environment variables",
      status: "CONFIGURATION_ERROR"
    }, { status: 500 });
  }

  try {
    const apiUrl = LIVEKIT_URL.replace(/^ws/, 'http');
    debug.apiUrl = apiUrl;
    debug.sdkAttempt = "Creating RoomServiceClient...";

    const roomService = new RoomServiceClient(apiUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

    debug.sdkAttempt = "Calling listRooms with 5s timeout...";
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout after 5 seconds')), 5000)
    );

    const startTime = Date.now();
    const rooms = await Promise.race([
      roomService.listRooms([]),
      timeoutPromise
    ]) as any[];
    
    const duration = Date.now() - startTime;

    return NextResponse.json({
      ...debug,
      status: "SUCCESS",
      duration_ms: duration,
      room_count: rooms.length,
      rooms: rooms.map(r => ({ name: r.name, numParticipants: r.numParticipants }))
    });

  } catch (error: any) {
    debug.error = {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack?.split('\n').slice(0, 5).join('\n')
    };

    return NextResponse.json({
      ...debug,
      status: "ERROR"
    }, { status: 500 });
  }
}
