import { collection, addDoc, getDoc, doc, serverTimestamp } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function POST(req: NextRequest) {
  try {
    const { tutorName } = await req.json();

    // Generate a random 6-digit session code
    const sessionCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Create session in Firestore
    const sessionRef = await addDoc(collection(db, 'sessions'), {
      code: sessionCode,
      roomName: `session-${sessionCode}`,
      tutorName,
      createdAt: serverTimestamp(),
      active: true,
    });

    return NextResponse.json({
      sessionId: sessionRef.id,
      sessionCode,
      roomName: `session-${sessionCode}`,
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { error: 'Session code required' },
        { status: 400 }
      );
    }

    // In a real app, you'd query by code. For simplicity, we'll use the code as room name
    return NextResponse.json({
      roomName: `session-${code}`,
      found: true,
    });
  } catch (error) {
    console.error('Error finding session:', error);
    return NextResponse.json(
      { error: 'Failed to find session' },
      { status: 500 }
    );
  }
}
