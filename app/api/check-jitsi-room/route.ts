import { NextRequest, NextResponse } from 'next/server';

/**
 * Check if a Jitsi room exists and has participants
 * This makes a request to the Jitsi server to check room status
 */
export async function POST(req: NextRequest) {
  try {
    const { roomName } = await req.json();

    if (!roomName) {
      return NextResponse.json(
        { error: 'Room name is required' },
        { status: 400 }
      );
    }

    const jitsiDomain = 'jitsi.rv2class.com';
    const jitsiRoomName = `RV2Class_${roomName}`;

    // Try to fetch room info from Jitsi's conference info endpoint
    // This endpoint returns room data if it exists
    try {
      // Note: Most Jitsi servers don't expose participant info publicly for security
      // We'll try a few approaches:
      
      // Approach 1: Try the room URL (this at least confirms the server is reachable)
      const roomUrl = `https://${jitsiDomain}/${jitsiRoomName}`;
      const response = await fetch(roomUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'rv2class-bot'
        }
      });

      if (!response.ok) {
        return NextResponse.json({
          exists: false,
          error: 'Jitsi server not reachable'
        });
      }

      // Since we can't reliably check participants without server-side access,
      // return that server is reachable but we need to rely on Firebase
      return NextResponse.json({
        serverReachable: true,
        message: 'Jitsi server is reachable. Use Firebase to check if teacher started.',
        note: 'Participant count requires server-side Jitsi API access or JWT tokens'
      });

    } catch (error) {
      console.error('Error checking Jitsi room:', error);
      return NextResponse.json({
        exists: false,
        error: 'Failed to check room status'
      });
    }

  } catch (error) {
    console.error('Error in check-jitsi-room API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
