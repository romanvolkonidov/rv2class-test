import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc, Timestamp } from "firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    // Get all join requests older than 24 hours
    const oneDayAgo = Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
    
    const q = query(
      collection(db, "joinRequests"),
      where("createdAt", "<", oneDayAgo)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return NextResponse.json({ 
        success: true, 
        message: "No old requests found",
        deleted: 0
      });
    }
    
    // Delete old requests
    const deletePromises = snapshot.docs.map(docSnapshot => 
      deleteDoc(doc(db, "joinRequests", docSnapshot.id))
    );
    
    await Promise.all(deletePromises);
    
    return NextResponse.json({ 
      success: true, 
      message: `Deleted ${snapshot.size} old requests`,
      deleted: snapshot.size
    });
  } catch (error: any) {
    console.error("Error cleaning up requests:", error);
    return NextResponse.json(
      { error: "Failed to cleanup requests", details: error?.message },
      { status: 500 }
    );
  }
}
