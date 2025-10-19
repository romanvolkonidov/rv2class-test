"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";

interface JitsiRedirectProps {
  meetingID: string;
  participantName: string;
  isTutor: boolean;
  subject?: string;
}

export default function JitsiRedirect({
  meetingID,
  participantName,
  isTutor,
  subject = "English",
}: JitsiRedirectProps) {
  useEffect(() => {
    // Build Jitsi URL with name prefilled
    const domain = process.env.NEXT_PUBLIC_JITSI_DOMAIN || "app.rv2class.com";
    const roomName = `${meetingID}`;
    
    // Jitsi URL format: https://domain/meet/room#userInfo.displayName="Name"
    const jitsiUrl = `https://${domain}/meet/${roomName}#userInfo.displayName="${encodeURIComponent(participantName)}"`;
    
    console.log("🚀 Redirecting to Jitsi:", jitsiUrl);
    
    // Redirect after a brief moment to show loading state
    setTimeout(() => {
      window.location.href = jitsiUrl;
    }, 500);
  }, [meetingID, participantName]);

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          Joining meeting...
        </h2>
        <p className="text-gray-600">
          Redirecting to {subject} class with {participantName}
        </p>
      </div>
    </div>
  );
}
