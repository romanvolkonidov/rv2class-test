"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import JitsiRoom from "@/components/JitsiRoom";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

function RoomContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const roomName = searchParams?.get("room") || "";
  const userName = searchParams?.get("name") || "";
  const isTutor = searchParams?.get("isTutor") === "true" || searchParams?.get("tutor") === "true";
  const studentId = searchParams?.get("studentId") || searchParams?.get("sessionCode") || undefined;

  console.log("Room Page - Jitsi Integration", { 
    roomName, 
    userName, 
    isTutor, 
    studentId 
  });

  if (!roomName || !userName) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-red-50 to-pink-100">
        <Card className="w-96">
          <CardContent className="p-8">
            <h2 className="text-xl font-semibold text-red-600 mb-2">
              Invalid Room Parameters
            </h2>
            <p className="text-gray-600">
              Missing room name or user name. Please use a valid link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleLeave = () => {
    console.log("Leaving room...");
    if (isTutor) {
      router.push(`/${userName}`);
    } else {
      router.push('/');
    }
  };

  // Always use Jitsi
  return (
    <JitsiRoom
      meetingID={roomName}
      participantName={userName}
      isTutor={isTutor}
      studentId={studentId}
      onLeave={handleLeave}
    />
  );
}

export default function RoomPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading room...</p>
          </div>
        </div>
      }
    >
      <RoomContent />
    </Suspense>
  );
}
