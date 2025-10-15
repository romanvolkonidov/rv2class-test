"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";

interface JitsiRoomProps {
  meetingID: string;
  participantName: string;
  isTutor: boolean;
  studentId?: string;
  onLeave?: () => void;
}

// Declare Jitsi API types
declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

/**
 * Jitsi Meet Room Component
 * Embeds Jitsi meeting using the Jitsi Meet External API
 */
export default function JitsiRoom({
  meetingID,
  participantName,
  isTutor,
  studentId,
  onLeave,
}: JitsiRoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load Jitsi Meet External API script
    const loadJitsiScript = () => {
      return new Promise((resolve, reject) => {
        if (window.JitsiMeetExternalAPI) {
          resolve(true);
          return;
        }

        const script = document.createElement("script");
        script.src = "https://jitsi.rv2class.com/external_api.js"; // ✅ Your server!
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => reject(new Error("Failed to load Jitsi API"));
        document.body.appendChild(script);
      });
    };

    const initializeJitsi = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load the Jitsi script
        await loadJitsiScript();

        if (!containerRef.current) {
          throw new Error("Container ref not available");
        }

        // Configure Jitsi options
        const domain = "jitsi.rv2class.com"; // ✅ Your self-hosted Jitsi server!
        const options = {
          roomName: `RV2Class_${meetingID}`, // Prefix to avoid conflicts
          width: "100%",
          height: "100%",
          parentNode: containerRef.current,
          configOverwrite: {
            startWithAudioMuted: !isTutor, // Tutors start unmuted
            startWithVideoMuted: false,
            enableWelcomePage: false,
            prejoinPageEnabled: false, // Skip prejoin for smoother experience
            disableDeepLinking: true,
            defaultLanguage: "en",
            enableClosePage: false,
            
            // Let Jitsi use server's default config for connection settings
            // Only override STUN servers for better connectivity
            p2p: {
              enabled: true,
              stunServers: [
                { urls: 'stun:jitsi.rv2class.com:3478' }, // Your Coturn STUN
                { urls: 'stun:stun.l.google.com:19302' }, // Google backup
                { urls: 'stun:stun1.l.google.com:19302' }
              ],
            },
            
            // Moderator controls
            disableModeratorIndicator: false,
            startScreenSharing: false,
            enableEmailInStats: false,
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
              "microphone",
              "camera",
              "closedcaptions",
              "desktop",
              "fullscreen",
              "fodeviceselection",
              "hangup",
              "chat",
              "recording",
              "livestreaming",
              "etherpad",
              "sharedvideo",
              "settings",
              "raisehand",
              "videoquality",
              "filmstrip",
              "feedback",
              "stats",
              "shortcuts",
              "tileview",
              "videobackgroundblur",
              "download",
              "help",
              "mute-everyone",
              "security",
            ],
            SETTINGS_SECTIONS: ["devices", "language", "moderator", "profile"],
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            DEFAULT_REMOTE_DISPLAY_NAME: "Student",
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
            MOBILE_APP_PROMO: false,
          },
          userInfo: {
            displayName: participantName,
            email: studentId ? `student_${studentId}@rv2class.com` : undefined,
          },
        };

        // Create Jitsi instance
        const api = new window.JitsiMeetExternalAPI(domain, options);
        jitsiApiRef.current = api;

        // Add timeout for connection (30 seconds)
        const connectionTimeout = setTimeout(() => {
          if (loading) {
            console.error("Jitsi: Connection timeout after 30 seconds");
            setError("Connection timeout. The Jitsi server may be experiencing issues. Please try again.");
            setLoading(false);
          }
        }, 30000);

        // Wait for the conference to be joined
        api.addEventListener("videoConferenceJoined", () => {
          console.log("Jitsi: User joined conference");
          clearTimeout(connectionTimeout);
          setLoading(false);

          // If tutor, grant moderator rights
          if (isTutor) {
            // The first participant is automatically a moderator in Jitsi
            console.log("Jitsi: Tutor joined as moderator");
          }
        });

        // Handle user leaving
        api.addEventListener("videoConferenceLeft", () => {
          console.log("Jitsi: User left conference");
          if (onLeave) {
            onLeave();
          }
        });

        // Handle ready state
        api.addEventListener("readyToClose", () => {
          console.log("Jitsi: Ready to close");
          if (onLeave) {
            onLeave();
          }
        });

        // Error handling
        api.addEventListener("errorOccurred", (event: any) => {
          console.error("Jitsi error:", event);
          setError("An error occurred in the meeting. Please refresh and try again.");
        });
      } catch (err: any) {
        console.error("Error initializing Jitsi:", err);
        setError(err.message || "Failed to initialize meeting");
        setLoading(false);
      }
    };

    initializeJitsi();

    // Cleanup
    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
    };
  }, [meetingID, participantName, isTutor, studentId, onLeave]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-red-50 to-pink-100">
        <Card className="w-96">
          <CardContent className="p-8">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-600 mb-2 text-center">
              Connection Error
            </h2>
            <p className="text-gray-600 text-center mb-4">{error}</p>
            {onLeave && (
              <Button onClick={onLeave} className="w-full">
                Return Home
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-gray-900">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 z-10">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">
              Connecting to Jitsi Meet...
            </p>
            <p className="text-gray-500 text-sm mt-2">
              {isTutor ? "Starting as moderator" : "Joining as participant"}
            </p>
          </div>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
