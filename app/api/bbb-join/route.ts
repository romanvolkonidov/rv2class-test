import { NextRequest, NextResponse } from 'next/server';
import { createMeeting, generateJoinUrl, validateBBBConfig } from '@/lib/bbb';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';

// Initialize Firebase (same config as your existing firebase.ts)
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
 * POST /api/bbb-join
 * Creates or joins a BBB meeting
 * 
 * Body params:
 * - roomName: string (meeting ID)
 * - participantName: string (user's display name)
 * - isTutor: boolean (true for moderator, false for attendee)
 * - studentId?: string (optional, for tracking)
 */
export async function POST(req: NextRequest) {
  try {
    const { roomName, participantName, isTutor, studentId } = await req.json();

    if (!roomName || !participantName) {
      return NextResponse.json(
        { error: 'Missing required fields: roomName and participantName' },
        { status: 400 }
      );
    }

    // Validate BBB configuration
    const validation = validateBBBConfig();
    if (!validation.valid) {
      console.error('BBB configuration error:', validation.error);
      return NextResponse.json(
        { error: 'Server configuration error. Please contact administrator.' },
        { status: 500 }
      );
    }

    // BBB Native Approach: Same meeting ID forever, stored passwords
    // BBB will auto-recreate meetings after they naturally end (all participants leave)
    const meetingRef = doc(db, 'bbb_meetings', roomName);
    let meetingDoc = await getDoc(meetingRef);
    
    let attendeePW: string;
    let moderatorPW: string;

    if (!meetingDoc.exists()) {
      // First time - generate and store passwords permanently
      attendeePW = generateSecurePassword();
      moderatorPW = generateSecurePassword();

      await setDoc(meetingRef, {
        meetingID: roomName,
        attendeePW,
        moderatorPW,
        createdAt: new Date().toISOString(),
        createdBy: isTutor ? participantName : 'system',
      });
    } else {
      // Use existing passwords for this room
      const data = meetingDoc.data();
      attendeePW = data.attendeePW;
      moderatorPW = data.moderatorPW;
    }

    // Always call create - BBB handles idempotency
    // This will succeed if meeting doesn't exist or already running
    const meetingName = `Lesson: ${roomName}`;
    const createResult = await createMeeting({
      meetingID: roomName,
      meetingName,
      attendeePW,
      moderatorPW,
      welcome: isTutor 
        ? `Welcome to your lesson, ${participantName}!` 
        : `Welcome! Your tutor will join shortly.`,
      maxParticipants: 10,
      record: true,
      autoStartRecording: false,
      allowStartStopRecording: true,
      muteOnStart: false,
      guestPolicy: 'ALWAYS_ACCEPT',
      meta: {
        tutorName: isTutor ? participantName : '',
        studentId: studentId || '',
        platform: 'rv2class',
      },
    });

    if (!createResult.success) {
      console.error('Failed to create BBB meeting:', createResult.error);
      return NextResponse.json(
        { error: `Failed to create meeting: ${createResult.error}` },
        { status: 500 }
      );
    }

    // Generate join URL based on role
    const password = isTutor ? moderatorPW : attendeePW;
    const joinUrl = generateJoinUrl({
      meetingID: roomName,
      fullName: participantName,
      password,
      userID: studentId || participantName,
      redirect: true,
    });

    // Return the join URL
    return NextResponse.json({
      success: true,
      joinUrl,
      meetingID: roomName,
      role: isTutor ? 'moderator' : 'attendee',
    });

  } catch (error) {
    console.error('Error in /api/bbb-join:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate a secure random password
 */
function generateSecurePassword(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  const crypto = require('crypto');
  const randomBytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    password += chars[randomBytes[i] % chars.length];
  }
  
  return password;
}
