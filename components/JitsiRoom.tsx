"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle, Pencil, UserCheck, UserX, Bell } from "lucide-react";
import MeetingFeedback from "@/components/MeetingFeedback";
import TldrawWhiteboard from "@/components/TldrawWhiteboard";
import { cn } from "@/lib/utils";

interface KnockingParticipant {
  id: string;
  name: string;
  timestamp: number;
}

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
  const [meetingEnded, setMeetingEnded] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [knockingParticipants, setKnockingParticipants] = useState<KnockingParticipant[]>([]);
  const [admittedIds, setAdmittedIds] = useState<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();

  // Handle meeting end - show feedback for students, redirect teachers
    const handleMeetingEnd = async () => {
    console.log("Meeting ended");
    setMeetingEnded(true);
  };

  // 🚪 ADMIT STUDENT TO MEETING
  const handleAdmitStudent = (participantId: string, name: string) => {
    if (!jitsiApiRef.current) {
      console.error("Cannot admit: Jitsi API not ready");
      return;
    }

    // Prevent duplicate admissions
    if (admittedIds.has(participantId)) {
      console.log("Student already admitted:", name);
      removeKnockerFromList(participantId);
      return;
    }

    try {
      console.log("🎟️ ADMITTING STUDENT:", name, participantId);
      
      // Execute admit command
      jitsiApiRef.current.executeCommand('answerKnockingParticipant', participantId, true);
      
      // Track that we admitted them
      setAdmittedIds(prev => new Set([...prev, participantId]));
      
      // Remove from knockers list
      removeKnockerFromList(participantId);
      
      console.log("✅ Admission command sent for:", name);
    } catch (err) {
      console.error("Failed to admit student:", err);
      alert(`Failed to admit ${name}. Please try again.`);
    }
  };

  // ❌ REJECT STUDENT FROM MEETING
  const handleRejectStudent = (participantId: string, name: string) => {
    if (!jitsiApiRef.current) {
      console.error("Cannot reject: Jitsi API not ready");
      return;
    }

    try {
      console.log("❌ REJECTING STUDENT:", name, participantId);
      
      // Execute reject command
      jitsiApiRef.current.executeCommand('answerKnockingParticipant', participantId, false);
      
      // Remove from knockers list
      removeKnockerFromList(participantId);
      
      console.log("✅ Rejection command sent for:", name);
    } catch (err) {
      console.error("Failed to reject student:", err);
      alert(`Failed to reject ${name}. Please try again.`);
    }
  };

  // Helper to remove knocker from state
  const removeKnockerFromList = (participantId: string) => {
    setKnockingParticipants(prev => prev.filter(p => p.id !== participantId));
  };

  // Handle final redirect after feedback (or directly for teachers)
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

  // Handle feedback submission
  const handleFeedbackSubmit = async (rating: number, comment: string) => {
    // TODO: Save feedback to database
    console.log("Feedback submitted:", { rating, comment, studentId, meetingID });
    
    // Small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Redirect after submission
    handleRedirect();
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
            
            // 🔒 ROBUST WAITING ROOM CONFIGURATION
            enableLobbyChat: false, // Don't let students chat in lobby
            autoKnockLobby: true, // Automatically knock when entering lobby
            lobbyEnabled: true, // ALWAYS enable lobby for the room
            
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
            // Set moderator role for tutors
            ...(isTutor && { 
              moderator: true,
              role: 'moderator'
            }),
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
            
            // 🔒 ENABLE LOBBY IMMEDIATELY AFTER TEACHER JOINS
            api.executeCommand('toggleLobby', true);
            console.log("🔒 Lobby enabled - students will need approval");
            
            // 🔍 CHECK IF STUDENTS ARE ALREADY WAITING (joined before teacher)
            setTimeout(() => {
              try {
                api.getLobbyParticipants().then((waitingParticipants: any[]) => {
                  if (waitingParticipants && waitingParticipants.length > 0) {
                    console.log(`🔔 Found ${waitingParticipants.length} students already waiting!`);
                    waitingParticipants.forEach((p: any) => {
                      handleNewKnocker(p);
                    });
                  }
                }).catch((err: any) => {
                  console.log("Could not check for waiting participants:", err);
                });
              } catch (err) {
                console.log("getLobbyParticipants not available:", err);
              }
            }, 1000); // Wait 1 second for lobby to be fully initialized
          }
        });

        // 🔔 ROBUST WAITING ROOM EVENT LISTENERS (MULTIPLE REDUNDANCY)
        if (isTutor) {
          // Event 1: knockingParticipant - Primary event
          api.addEventListener('knockingParticipant', (participant: any) => {
            console.log("🚪 knockingParticipant event:", participant);
            handleNewKnocker(participant);
          });

          // Event 2: participantKickedOut - Backup detection
          api.addEventListener('participantKickedOut', (participant: any) => {
            console.log("👋 participantKickedOut event:", participant);
            // Remove from knockers if they were rejected
            if (participant && participant.id) {
              removeKnocker(participant.id);
            }
          });

          // Event 3: participantJoined - Detect if someone was admitted
          api.addEventListener('participantJoined', (participant: any) => {
            console.log("✅ participantJoined event:", participant);
            // Remove from knockers list when they join
            if (participant && participant.id) {
              removeKnocker(participant.id);
            }
          });

          // Event 4: lobbyMessageReceived - Additional lobby messages
          api.addEventListener('lobbyMessageReceived', (data: any) => {
            console.log("📨 lobbyMessageReceived:", data);
          });

          // Event 5: Poll for waiting participants every 2 seconds (ULTIMATE BACKUP)
          const pollInterval = setInterval(() => {
            try {
              // Check if there are pending lobby participants
              api.getLobbyParticipants().then((participants: any[]) => {
                if (participants && participants.length > 0) {
                  console.log("🔍 Poll detected waiting participants:", participants);
                  participants.forEach((p: any) => handleNewKnocker(p));
                }
              }).catch((err: any) => {
                // Silently handle errors to avoid spam
                console.debug("Lobby poll error:", err);
              });
            } catch (err) {
              console.debug("Lobby poll exception:", err);
            }
          }, 2000); // Poll every 2 seconds

          // Cleanup poll on unmount
          return () => {
            clearInterval(pollInterval);
          };
        }

        // Helper function to handle new knocker
        const handleNewKnocker = (participant: any) => {
          if (!participant || !participant.id) {
            console.warn("Invalid participant data:", participant);
            return;
          }

          const knocker: KnockingParticipant = {
            id: participant.id,
            name: participant.name || participant.displayName || "Unknown Student",
            timestamp: Date.now()
          };

          setKnockingParticipants(prev => {
            // Prevent duplicates
            if (prev.some(p => p.id === knocker.id)) {
              console.log("Knocker already in list:", knocker.name);
              return prev;
            }
            
            console.log("🔔 NEW KNOCKER ADDED:", knocker.name);
            
            // Play notification sound
            playNotificationSound();
            
            // Add to list
            return [...prev, knocker];
          });
        };

        // Helper function to remove knocker
        const removeKnocker = (participantId: string) => {
          setKnockingParticipants(prev => {
            const filtered = prev.filter(p => p.id !== participantId);
            if (filtered.length !== prev.length) {
              console.log("🗑️ Removed knocker:", participantId);
            }
            return filtered;
          });
        };

        // Helper function to play notification sound
        const playNotificationSound = () => {
          try {
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(err => {
                console.log("Audio play prevented:", err);
              });
            }
          } catch (err) {
            console.log("Audio error:", err);
          }
        };

        // **CRITICAL**: Listen for when iframe loads and auto-submit prejoin
        // Sometimes prejoinPageEnabled: false doesn't work with External API
        api.on('readyToClose', () => {
          console.log("Jitsi: Ready to close - meeting ended");
          handleMeetingEnd();
        });

        // Listen for when user clicks "Leave" button
        api.addListener('videoConferenceLeft', () => {
          console.log("Jitsi: User left the conference");
          handleMeetingEnd();
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

        // Error handling - only show for actual errors (not normal meeting end)
        api.addEventListener("errorOccurred", (event: any) => {
          console.error("Jitsi error:", event);
          
          // Check if this is a critical error that needs user attention
          const errorMsg = event?.error?.message || "An error occurred in the meeting";
          
          // Only show error if meeting hasn't ended normally
          if (!meetingEnded) {
            setError(`${errorMsg}. Redirecting...`);
            
            // Redirect after 3 seconds
            setTimeout(() => {
              handleRedirect();
            }, 3000);
          }
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

  // Show feedback screen for students when meeting ends
  if (showFeedback && !isTutor) {
    return (
      <MeetingFeedback
        participantName={participantName}
        onSubmit={handleFeedbackSubmit}
      />
    );
  }

  // Only show error screen for actual errors (not normal meeting end)
  if (error && !meetingEnded) {
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
      {/* Hidden audio for notifications */}
      <audio
        ref={(el) => { audioRef.current = el; }}
        src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjKJ0fPTgTIIHGi999+UPA0PVqzn77FfGgY7kdb0zH4sBS18yu/glUALE1mz6OyrWBIJRKHh8bdjHAU3jdHz2IU2Bxpru/je"
        preload="auto"
      />
      
      {/* 🔔 WAITING ROOM NOTIFICATIONS (Teachers Only) */}
      {isTutor && knockingParticipants.length > 0 && (
        <div className="fixed top-4 right-4 z-[100] space-y-2 animate-slideIn">
          {knockingParticipants.map((participant) => (
            <Card 
              key={participant.id}
              className="w-80 shadow-2xl border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50"
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Notification Icon */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center animate-bounce">
                    <Bell className="w-5 h-5 text-white" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                      Student waiting to join
                    </p>
                    <p className="text-lg font-bold text-gray-800 truncate mb-3">
                      {participant.name}
                    </p>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAdmitStudent(participant.id, participant.name)}
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
                      >
                        <UserCheck className="w-4 h-4 mr-1" />
                        Admit
                      </Button>
                      <Button
                        onClick={() => handleRejectStudent(participant.id, participant.name)}
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                      >
                        <UserX className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
      
      {/* Whiteboard Toggle Button */}
      {!loading && (
        <div className="absolute bottom-6 left-6 z-50">
          <Button
            onClick={() => setShowWhiteboard(!showWhiteboard)}
            size="icon"
            className={cn(
              "h-14 w-14 rounded-full shadow-2xl transition-all duration-300 border-2",
              showWhiteboard 
                ? "bg-blue-600 hover:bg-blue-700 border-blue-400 text-white scale-110" 
                : "bg-black hover:bg-gray-800 border-gray-700 text-white"
            )}
            title={showWhiteboard ? "Hide Whiteboard" : "Show Whiteboard"}
          >
            <Pencil className="w-6 h-6" />
          </Button>
        </div>
      )}
      
      {/* tldraw Whiteboard */}
      {showWhiteboard && (
        <TldrawWhiteboard
          roomId={`rv2class-${meetingID}`}
          onClose={() => setShowWhiteboard(false)}
        />
      )}
      
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
