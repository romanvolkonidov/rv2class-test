import { NextRequest, NextResponse } from 'next/server';
import { getMeetingInfo, isMeetingRunning, validateBBBConfig } from '@/lib/bbb';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
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
 * GET /api/bbb-meeting?meetingID=xxx
 * Check if a meeting exists and is running
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const meetingID = searchParams.get('meetingID');

    if (!meetingID) {
      return NextResponse.json(
        { error: 'Missing meetingID parameter' },
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

    // Check if meeting is running
    const isRunning = await isMeetingRunning(meetingID);

    // Get meeting details from Firebase
    const meetingRef = doc(db, 'bbb_meetings', meetingID);
    const meetingDoc = await getDoc(meetingRef);

    if (!meetingDoc.exists()) {
      return NextResponse.json({
        exists: false,
        running: false,
      });
    }

    const meetingData = meetingDoc.data();

    // If meeting is running and we want detailed info, fetch it
    let meetingInfo = null;
    if (isRunning) {
      meetingInfo = await getMeetingInfo(meetingID, meetingData.moderatorPW);
    }

    return NextResponse.json({
      exists: true,
      running: isRunning,
      meetingID,
      createdAt: meetingData.createdAt,
      info: meetingInfo,
    });

  } catch (error) {
    console.error('Error in /api/bbb-meeting:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
