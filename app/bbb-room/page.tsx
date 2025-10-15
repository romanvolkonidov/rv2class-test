"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import BBBRoom from "@/components/BBBRoom";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

function BBBRoomContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const roomName = searchParams.get("room");
  const userName = searchParams.get("name");
  const isTutor = searchParams.get("tutor") === "true";
  const studentId = searchParams.get("studentId") || undefined;

  if (!roomName || !userName) {
    return (
      <div className="flex items-center justify-center h-screen">
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
    // Navigate back to appropriate page
    if (isTutor) {
      // Tutor goes back to their home page (e.g., /roman or /violet)
      router.push(`/${roomName}`);
    } else if (studentId) {
      // Student goes back to their welcome page
      router.push(`/student/${studentId}`);
    } else {
      // Fallback to home
      router.push('/');
    }
  };

  return (
    <BBBRoom
      meetingID={roomName}
      participantName={userName}
      isTutor={isTutor}
      studentId={studentId}
      onLeave={handleLeave}
    />
  );
}

export default function BBBRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
        </div>
      }
    >
      <BBBRoomContent />
    </Suspense>
  );
}
