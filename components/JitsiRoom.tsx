"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle, Pencil } from "lucide-react";
import AnnotationOverlay from "@/components/AnnotationOverlay";
import { cn } from "@/lib/utils";

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
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const router = useRouter();

  // Handle redirects when meeting ends or errors occur
  const handleRedirect = () => {
    if (onLeave) {
      onLeave(); // Use parent's handler if provided
    } else {
      // Default redirect behavior
      if (isTutor) {
        // Teacher goes to home page
        router.push("/");
      } else if (studentId) {
        // Student goes back to their welcome page
        router.push(`/student/${studentId}`);
      } else {
        // Fallback to home
        router.push("/");
      }
    }
  };

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
        const roomName = `RV2Class_${meetingID}`; // Prefix to avoid conflicts
        
        const options = {
          roomName: roomName,
          width: "100%",
          height: "100%",
          parentNode: containerRef.current,
          
          configOverwrite: {
            startWithAudioMuted: !isTutor, // Tutors start unmuted
            startWithVideoMuted: false,
            enableWelcomePage: false,
            prejoinPageEnabled: false, // Disable prejoin page
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
          
          // 🎯 NEW: Add JWT and config params to URL to force skip prejoin
          jwt: undefined, // No JWT for now, but this enables the feature
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

        // Track if we've successfully joined
        let hasJoined = false;
        
        // Listen for successful conference join
        api.addListener("videoConferenceJoined", () => {
          console.log("✅ Jitsi: Conference joined successfully");
          hasJoined = true;
          clearTimeout(connectionTimeout);
          setLoading(false);

          if (isTutor) {
            console.log("Jitsi: Tutor joined as moderator");
          }
        });

        // **CRITICAL**: Listen for when iframe loads and auto-submit prejoin
        // Sometimes prejoinPageEnabled: false doesn't work with External API
        api.on('readyToClose', () => {
          console.log("Jitsi: Ready to close - meeting ended");
          handleRedirect();
        });

        // Listen for when user clicks "Leave" button
        api.addListener('videoConferenceLeft', () => {
          console.log("Jitsi: User left the conference");
          handleRedirect();
        });

        // Listen for screen sharing events
        api.addListener('screenSharingStatusChanged', (event: any) => {
          console.log("📺 Jitsi: Screen sharing status changed:", event);
          setIsScreenSharing(event.on);
          
          // Auto-hide annotations when screen share stops
          if (!event.on && showAnnotations) {
            setShowAnnotations(false);
          }
        });

        // Listen for prejoin page rendered
        api.on('prejoinVideoChanged', () => {
          console.log("🎥 Jitsi: Prejoin video changed, attempting auto-submit");
          // Use postMessage to trigger prejoin submit via iframe communication
          try {
            const iframe = api.getIFrame();
            if (iframe && iframe.contentWindow) {
              // Send submit prejoin command via postMessage (cross-origin safe)
              iframe.contentWindow.postMessage({
                type: 'submit-prejoin'
              }, 'https://jitsi.rv2class.com');
              console.log("📤 Sent submit-prejoin postMessage to iframe");
            }
          } catch (err) {
            console.error("Failed to send prejoin submit message:", err);
          }
        });

        // Also try executeCommand approach after delay
        setTimeout(() => {
          if (!hasJoined && loading) {
            console.log("⚠️ Jitsi: Auto-join taking too long, trying alternative methods");
            try {
              // Method 1: Try executeCommand to skip prejoin
              api.executeCommand('toggleLobby', false);
              console.log("📞 Executed toggleLobby(false) command");
              
              // Method 2: Send postMessage as fallback
              const iframe = api.getIFrame();
              if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage({
                  type: 'submit-prejoin'
                }, 'https://jitsi.rv2class.com');
                console.log("📤 Sent submit-prejoin postMessage");
              }
            } catch (err) {
              console.error("Failed alternative auto-join methods:", err);
            }
          }
        }, 4000); // Wait 4 seconds before trying alternatives

        // Error handling - redirect on critical errors
        api.addEventListener("errorOccurred", (event: any) => {
          console.error("Jitsi error:", event);
          const errorMsg = event?.error?.message || "An error occurred in the meeting";
          
          // Show error briefly then redirect
          setError(`${errorMsg}. Redirecting...`);
          
          // Redirect after 3 seconds
          setTimeout(() => {
            handleRedirect();
          }, 3000);
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
  }, [meetingID, participantName, isTutor, studentId, router]); // Added router to deps

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
            <Button onClick={handleRedirect} className="w-full">
              {isTutor ? "Return to Home" : "Back to Welcome Page"}
            </Button>
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
      
      {/* Annotation Toggle Button - Only visible during screen share */}
      {!loading && isScreenSharing && (
        <div className="absolute bottom-6 left-6 z-50">
          <Button
            onClick={() => setShowAnnotations(!showAnnotations)}
            size="icon"
            className={cn(
              "h-14 w-14 rounded-full shadow-2xl transition-all duration-300 border-2",
              showAnnotations 
                ? "bg-blue-600 hover:bg-blue-700 border-blue-400 text-white scale-110" 
                : "bg-black hover:bg-gray-800 border-gray-700 text-white"
            )}
          >
            <Pencil className="w-6 h-6" />
          </Button>
        </div>
      )}
      
      {/* Annotation Overlay */}
      {showAnnotations && (
        <AnnotationOverlay
          onClose={() => setShowAnnotations(false)}
          viewOnly={false}
          isClosing={false}
          isTutor={isTutor}
        />
      )}
      
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
