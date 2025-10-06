import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, query, where, getDocs, onSnapshot, serverTimestamp, deleteDoc } from 'firebase/firestore';

// Create a join request
export async function POST(req: NextRequest) {
  try {
    const { roomName, studentName } = await req.json();

    if (!roomName || !studentName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const joinRequestsRef = collection(db, 'joinRequests');
    
    // Check if there's already a pending request from this student
    const existingQuery = query(
      joinRequestsRef,
      where('roomName', '==', roomName),
      where('studentName', '==', studentName),
      where('status', '==', 'pending')
    );
    
    const existingDocs = await getDocs(existingQuery);
    if (!existingDocs.empty) {
      return NextResponse.json({
        requestId: existingDocs.docs[0].id,
        status: 'pending',
        message: 'Request already exists'
      });
    }

    const docRef = await addDoc(joinRequestsRef, {
      roomName,
      studentName,
      status: 'pending',
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({
      requestId: docRef.id,
      status: 'pending'
    });
  } catch (error) {
    console.error('Error creating join request:', error);
    return NextResponse.json(
      { error: 'Failed to create join request' },
      { status: 500 }
    );
  }
}

// Update join request status (approve/deny)
export async function PATCH(req: NextRequest) {
  try {
    const { requestId, status } = await req.json();

    if (!requestId || !status || !['approved', 'denied'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    const requestRef = doc(db, 'joinRequests', requestId);
    await updateDoc(requestRef, {
      status,
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error('Error updating join request:', error);
    return NextResponse.json(
      { error: 'Failed to update join request' },
      { status: 500 }
    );
  }
}

// Get join requests for a room
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomName = searchParams.get('roomName');
    const requestId = searchParams.get('requestId');

    if (requestId) {
      // Check specific request status
      const requestRef = doc(db, 'joinRequests', requestId);
      const requestDoc = await getDocs(query(collection(db, 'joinRequests'), where('__name__', '==', requestId)));
      
      if (requestDoc.empty) {
        return NextResponse.json(
          { error: 'Request not found' },
          { status: 404 }
        );
      }

      const data = requestDoc.docs[0].data();
      return NextResponse.json({
        status: data.status,
        requestId: requestDoc.docs[0].id,
      });
    }

    if (!roomName) {
      return NextResponse.json(
        { error: 'roomName is required' },
        { status: 400 }
      );
    }

    // Get all pending requests for the room
    const joinRequestsRef = collection(db, 'joinRequests');
    const q = query(
      joinRequestsRef,
      where('roomName', '==', roomName),
      where('status', '==', 'pending')
    );

    const querySnapshot = await getDocs(q);
    const requests = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Error fetching join requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch join requests' },
      { status: 500 }
    );
  }
}

// Delete a join request (cleanup)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json(
        { error: 'requestId is required' },
        { status: 400 }
      );
    }

    const requestRef = doc(db, 'joinRequests', requestId);
    await deleteDoc(requestRef);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting join request:', error);
    return NextResponse.json(
      { error: 'Failed to delete join request' },
      { status: 500 }
    );
  }
}
