import { NextRequest, NextResponse } from 'next/server';
import { endMeeting, validateBBBConfig } from '@/lib/bbb';
import { getFirestore, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB_VsLZaaQ_m3WNVlPjfhy715BXo8ax004",
  authDomain: "tracking-budget-app.firebaseapp.com",
  databaseURL: "https://tracking-budget-app-default-rtdb.firebaseio.com",
  projectId: "tracking-budget-app",
  storageBucket: "tracking-budget-app.appspot.com",
  messagingSenderId: "912992088190",
  appId: "1:912992088190:web:926c8826b3bc39e2eb282f"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

/**
 * POST /api/bbb-end
 * Ends a BBB meeting (moderator only)
 * 
 * Body params:
 * - meetingID: string
 */
export async function POST(req: NextRequest) {
  try {
    const { meetingID } = await req.json();

    if (!meetingID) {
      return NextResponse.json(
        { error: 'Missing meetingID' },
        { status: 400 }
      );
    }

    // Validate BBB configuration
    const validation = validateBBBConfig();
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Get moderator password from Firebase
    const meetingRef = doc(db, 'bbb_meetings', meetingID);
    const meetingDoc = await getDoc(meetingRef);

    if (!meetingDoc.exists()) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    const { moderatorPW } = meetingDoc.data();

    // End the meeting
    const result = await endMeeting(meetingID, moderatorPW);

    if (result.success) {
      // Clean up Firebase meeting record
      await deleteDoc(meetingRef);
      
      return NextResponse.json({
        success: true,
        message: 'Meeting ended successfully',
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to end meeting' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in /api/bbb-end:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
