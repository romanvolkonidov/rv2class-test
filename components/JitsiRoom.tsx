"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle, Pencil, UserCheck, UserX, Bell } from "lucide-react";
import MeetingFeedback from "@/components/MeetingFeedback";
import ExcalidrawWhiteboard from "@/components/ExcalidrawWhiteboard";
import JitsiAnnotationOverlay from "@/components/JitsiAnnotationOverlay";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";

interface FirebaseJoinRequest {
  id: string;
  studentName: string;
  studentId?: string;
  roomName: string;
  status: string;
  createdAt: any;
}

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
  subject?: string; // e.g., "English"
  teacherName?: string; // e.g., "Roman" or "Violeta"
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
  subject = "English", // Default to English
  teacherName, // Teacher's name for title
  onLeave,
}: JitsiRoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meetingEnded, setMeetingEnded] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [annotationsClosing, setAnnotationsClosing] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [knockingParticipants, setKnockingParticipants] = useState<KnockingParticipant[]>([]);
  const [admittedIds, setAdmittedIds] = useState<Set<string>>(new Set());
  const [firebaseJoinRequests, setFirebaseJoinRequests] = useState<FirebaseJoinRequest[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();
  
  // Draggable button state
  const [buttonPosition, setButtonPosition] = useState({ x: 24, y: window.innerHeight - 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);

  // Handle meeting end - show feedback for students, redirect teachers
  const handleMeetingEnd = async () => {
    console.log("Meeting ended", { isTutor, studentId });
    setMeetingEnded(true);
    
    if (!isTutor) {
      // Students: show feedback screen
      console.log("📝 Showing feedback screen for student");
      setShowFeedback(true);
    } else {
      // Teachers: redirect immediately to home
      console.log("👨‍🏫 Teacher leaving, redirecting to home");
      setTimeout(() => {
        handleRedirect();
      }, 1000); // Small delay for better UX
    }
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
    if (rating === 0) {
      // Skipped feedback
      console.log("Feedback skipped");
      handleRedirect();
      return;
    }

    try {
      console.log("💾 Saving feedback to Firebase:", { rating, comment, studentId, meetingID });
      
      // Save feedback to Firebase
      const feedbackData = {
        rating,
        comment,
        studentId,
        studentName: participantName,
        teacherName,
        roomName: meetingID,
        subject: subject,
        createdAt: new Date().toISOString(),
        timestamp: Date.now(),
      };

      const { collection, addDoc } = await import('firebase/firestore');
      await addDoc(collection(db, 'feedbacks'), feedbackData);
      
      console.log("✅ Feedback saved successfully");
    } catch (error) {
      console.error("❌ Error saving feedback:", error);
      // Continue to redirect even if save fails
    }
    
    // Small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Redirect after submission
    handleRedirect();
  };

  // Draggable button handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!buttonRef.current) return;
    
    setIsDragging(true);
    const rect = buttonRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Keep button within viewport bounds
    const maxX = window.innerWidth - 56; // 56px = button width
    const maxY = window.innerHeight - 56; // 56px = button height
    
    setButtonPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!buttonRef.current) return;
    
    const touch = e.touches[0];
    setIsDragging(true);
    const rect = buttonRef.current.getBoundingClientRect();
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    });
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging || e.touches.length === 0) return;
    
    const touch = e.touches[0];
    const newX = touch.clientX - dragOffset.x;
    const newY = touch.clientY - dragOffset.y;
    
    // Keep button within viewport bounds
    const maxX = window.innerWidth - 56;
    const maxY = window.innerHeight - 56;
    
    setButtonPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Add/remove drag event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, dragOffset]);

  // Initialize button position on mount and window resize
  useEffect(() => {
    const updateButtonPosition = () => {
      setButtonPosition({ x: 24, y: window.innerHeight - 80 });
    };
    
    window.addEventListener('resize', updateButtonPosition);
    return () => window.removeEventListener('resize', updateButtonPosition);
  }, []);

  useEffect(() => {
    // Load Jitsi Meet External API script
    const loadJitsiScript = () => {
      return new Promise((resolve, reject) => {
        if (window.JitsiMeetExternalAPI) {
          resolve(true);
          return;
        }

        const script = document.createElement("script");
        const jitsiDomain = process.env.NEXT_PUBLIC_JITSI_DOMAIN || "app.rv2class.com";
        script.src = `https://${jitsiDomain}/external_api.js`;
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
        const domain = process.env.NEXT_PUBLIC_JITSI_DOMAIN || "app.rv2class.com";
        const roomName = `RV2Class_${meetingID}`; // Prefix to avoid conflicts
        
        const options = {
          roomName: roomName,
          width: "100%",
          height: "100%",
          parentNode: containerRef.current,
          
          configOverwrite: {
            startWithAudioMuted: false, // Everyone starts with audio ON (unmuted)
            startWithVideoMuted: false, // Everyone starts with video ON
            // Enable standard Jitsi UX: welcome page and prejoin
            enableWelcomePage: false, // Disable welcome page for direct room join
            prejoinPageEnabled: true, // Keep prejoin to show name/camera/mic selection
            disableDeepLinking: true,
            defaultLanguage: "en",
            enableClosePage: false,
            // Set meeting title: "English with Roman" or "English with Violet"
            subject: `${subject} with ${teacherName || (isTutor ? participantName : 'Teacher')}`,
            // Lobby settings - teachers skip lobby, students wait
            enableLobbyChat: true,
            autoKnockLobby: !isTutor, // Only students auto-knock
            lobbyEnabled: !isTutor, // Only enable lobby for students
            hideLobbyButton: false,
            
            // Prevent students from becoming moderators (keep moderator UX for tutors)
            ...(!isTutor && {
              disableModeratorIndicator: true,
            }),
            
            // Let Jitsi use server's default config for connection settings
            // Only override STUN servers for better connectivity
            p2p: {
              enabled: true,
              stunServers: [
                { urls: `stun:${domain}:3478` }, // Your Coturn STUN
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
            console.log("� Using Firebase waiting room - lobby disabled in Jitsi");
          } else {
            // Student joined
            console.log("🎓 Student joined conference directly (no lobby)");
            
            // Set up listener for teacher broadcasts
            console.log('👂 Student setting up message listener after joining...');
            const handleEndpointMessage = (participant: any, data: any) => {
              console.log('📨 Student received message from:', participant?.getId?.(), 'data:', data, 'type:', typeof data);
              
              // Skip if data is undefined or empty
              if (!data || data === 'undefined' || typeof data !== 'string') {
                console.log('⏭️ Skipping invalid message data');
                return;
              }
              
              try {
                const message = JSON.parse(data);
                console.log('📨 Parsed message:', message);
                
                // Handle annotation toggle
                if (message.type === 'toggleAnnotations') {
                  console.log('🎨 Setting annotations to:', message.show);
                  if (message.show) {
                    setShowAnnotations(true);
                    setAnnotationsClosing(false);
                  } else {
                    setAnnotationsClosing(true);
                    setTimeout(() => {
                      setShowAnnotations(false);
                      setAnnotationsClosing(false);
                    }, 300);
                  }
                }
                
                // Handle whiteboard toggle
                if (message.type === 'toggleWhiteboard') {
                  console.log('📋 Received whiteboard toggle from teacher:', message.show);
                  setShowWhiteboard(message.show);
                }
              } catch (error) {
                console.error('Error parsing message:', error, 'data was:', data);
              }
            };
            
            api.addListener('endpointTextMessageReceived', handleEndpointMessage);
          }
        });

        // 🔔 WAITING ROOM: If Jitsi lobby is enabled we'll use Jitsi native lobby/events.
        // Otherwise we fall back to the existing Firebase waiting-room implementation.
        const jitsiLobbyEnabled = !!(options?.configOverwrite && options.configOverwrite.lobbyEnabled);

        if (jitsiLobbyEnabled) {
          console.log("👨‍🏫 Using Jitsi lobby for waiting-room flow");

          // Listen for knocking participants and surface admit/reject UI
          try {
            api.addListener('knockingParticipant', (p: any) => {
              try {
                const id = p?.id || p?.participantId || p?.participant?.id;
                const name = p?.name || p?.displayName || p?.participant?.name || 'Guest';
                console.log('🔔 Jitsi: Knocking participant received', { id, name, raw: p });

                if (!id) return;

                setKnockingParticipants(prev => {
                  // avoid duplicates
                  if (prev.some(x => x.id === id)) return prev;
                  return [...prev, { id, name, timestamp: Date.now() }];
                });
                playNotificationSound();
              } catch (err) {
                console.error('Error handling knockingParticipant event', err, p);
              }
            });

            // When participant is admitted/joins, remove from knocking list
            api.addListener('participantJoined', (participant: any) => {
              try {
                const id = participant?.id || participant?.participantId || participant?.participant?.id;
                if (!id) return;
                setKnockingParticipants(prev => prev.filter(k => k.id !== id));
              } catch (err) {
                // ignore
              }
            });
          } catch (err) {
            console.warn('Could not register lobby listeners on Jitsi API:', err);
          }

        } else if (isTutor) {
          console.log("👨‍🏫 Teacher: Using Firebase waiting room system");
        }

        // Helper function to handle new knocker (not used with Firebase, but kept for compatibility)
        const handleNewKnocker = (participant: any) => {
          console.log("Note: handleNewKnocker called but lobby is disabled, using Firebase instead");
        };

        // Helper function to remove knocker (not used with Firebase, but kept for compatibility)
        const removeKnocker = (participantId: string) => {
          console.log("Note: removeKnocker called but lobby is disabled, using Firebase instead");
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

        // Error handling - only show for actual errors (not normal meeting end)
        api.addEventListener("errorOccurred", (event: any) => {
          console.error("Jitsi error:", event);
          
          // Ignore "conference.destroyed" - it's fired when teacher ends meeting normally
          const errorName = event?.error?.name || "";
          if (errorName === "conference.destroyed") {
            console.log("Jitsi: Conference destroyed (normal meeting end), ignoring error");
            return;
          }
          
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

  // 🔥 LISTEN FOR FIREBASE JOIN REQUESTS (Teachers only, during lesson)
  useEffect(() => {
    if (!isTutor || !meetingID) return;

    console.log("👂 Teacher: Listening for Firebase join requests for room:", meetingID);

    const joinRequestsRef = collection(db, "joinRequests");
    const q = query(
      joinRequestsRef,
      where("roomName", "==", meetingID),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests: FirebaseJoinRequest[] = [];
      snapshot.forEach((doc) => {
        requests.push({
          id: doc.id,
          ...doc.data()
        } as FirebaseJoinRequest);
      });

      console.log(`📋 Found ${requests.length} pending join requests from Firebase`);
      setFirebaseJoinRequests(requests);

      // Play notification sound if new requests arrived
      if (requests.length > firebaseJoinRequests.length) {
        playNotificationSound();
      }
    });

    return () => unsubscribe();
  }, [isTutor, meetingID]);

  // 🖥️ DETECT SCREEN SHARE STATUS
  useEffect(() => {
    if (!jitsiApiRef.current) return;

    console.log('🔍 Setting up screen share detection...');

    // Function to check if anyone is screen sharing
    const checkScreenShareStatus = () => {
      try {
        // Method 1: Check via Jitsi API
        const participants = jitsiApiRef.current.getParticipantsInfo();
        const someoneSharing = participants.some((p: any) => p.screenShare === true);
        
        if (someoneSharing !== isScreenSharing) {
          console.log('📺 Screen share status changed via polling:', someoneSharing);
          setIsScreenSharing(someoneSharing);
        }
      } catch (error) {
        console.error('Error checking screen share status:', error);
      }
    };

    // Listen for screen share events
    const handleScreenShareToggled = (event: any) => {
      console.log('📺 Screen share toggled EVENT:', event);
      setIsScreenSharing(event.on);
      
      // If screen share stops, also hide annotations
      if (!event.on && showAnnotations) {
        setAnnotationsClosing(true);
        setTimeout(() => {
          setShowAnnotations(false);
          setAnnotationsClosing(false);
        }, 300);
      }
    };

    // Listen for video quality changes (more reliable for screen share detection)
    const handleVideoQualityChanged = (event: any) => {
      console.log('📹 Video quality changed:', event);
      // Recheck screen share status
      checkScreenShareStatus();
    };

    // Listen for participant changes
    const handleParticipantJoined = () => {
      console.log('👤 Participant joined, checking screen share...');
      setTimeout(checkScreenShareStatus, 500);
    };

    jitsiApiRef.current.addListener('screenSharingStatusChanged', handleScreenShareToggled);
    jitsiApiRef.current.addListener('videoQualityChanged', handleVideoQualityChanged);
    jitsiApiRef.current.addListener('participantJoined', handleParticipantJoined);
    jitsiApiRef.current.addListener('participantLeft', handleParticipantJoined);

    // Poll every 2 seconds as fallback (in case events don't fire)
    const pollInterval = setInterval(checkScreenShareStatus, 2000);

    // Initial check
    setTimeout(checkScreenShareStatus, 1000);

    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.removeListener('screenSharingStatusChanged', handleScreenShareToggled);
        jitsiApiRef.current.removeListener('videoQualityChanged', handleVideoQualityChanged);
        jitsiApiRef.current.removeListener('participantJoined', handleParticipantJoined);
        jitsiApiRef.current.removeListener('participantLeft', handleParticipantJoined);
      }
      clearInterval(pollInterval);
    };
  }, [showAnnotations, isScreenSharing]);

  // Helper to play notification sound
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

  // Handle approving Firebase join request
  const handleApproveFirebaseRequest = async (requestId: string, studentName: string) => {
    try {
      console.log("✅ Approving Firebase join request:", requestId, studentName);
      
      await updateDoc(doc(db, "joinRequests", requestId), {
        status: "approved"
      });

      // Remove from local state
      setFirebaseJoinRequests(prev => prev.filter(r => r.id !== requestId));

      console.log("✅ Join request approved, student will join automatically");
    } catch (error) {
      console.error("Failed to approve request:", error);
      alert(`Failed to approve ${studentName}. Please try again.`);
    }
  };

  // Handle denying Firebase join request
  const handleDenyFirebaseRequest = async (requestId: string, studentName: string) => {
    try {
      console.log("❌ Denying Firebase join request:", requestId, studentName);
      
      await updateDoc(doc(db, "joinRequests", requestId), {
        status: "denied"
      });

      // Remove from local state
      setFirebaseJoinRequests(prev => prev.filter(r => r.id !== requestId));

      console.log("❌ Join request denied");
    } catch (error) {
      console.error("Failed to deny request:", error);
      alert(`Failed to deny ${studentName}. Please try again.`);
    }
  };

  // Show feedback screen for students when meeting ends
  if (showFeedback && !isTutor) {
    return (
      <MeetingFeedback
        participantName={participantName}
        teacherName={teacherName || "Teacher"}
        studentId={studentId || ""}
        meetingID={meetingID}
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
      {isTutor && (knockingParticipants.length > 0 || firebaseJoinRequests.length > 0) && (
        <div className="fixed top-4 right-4 z-[100] space-y-2 animate-slideIn max-h-[80vh] overflow-y-auto">
          {/* Firebase Join Requests (Pre-Jitsi waiting room) */}
          {firebaseJoinRequests.map((request) => (
            <Card 
              key={`firebase-${request.id}`}
              className="w-80 shadow-2xl border-2 border-blue-400 bg-gradient-to-br from-blue-50 to-cyan-50"
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Notification Icon */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
                    <Bell className="w-5 h-5 text-white" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                      Join request (not in Jitsi yet)
                    </p>
                    <p className="text-lg font-bold text-gray-800 truncate mb-3">
                      {request.studentName}
                    </p>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApproveFirebaseRequest(request.id, request.studentName)}
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
                      >
                        <UserCheck className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleDenyFirebaseRequest(request.id, request.studentName)}
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                      >
                        <UserX className="w-4 h-4 mr-1" />
                        Deny
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Jitsi Lobby Knockers (LEGACY - Not used with Firebase waiting room) */}
          {/* With lobbyEnabled: false, this section will never be populated */}
          {knockingParticipants.length > 0 && knockingParticipants.map((participant) => (
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
      
      {/* Whiteboard Toggle Button - Teachers Only, shown when NOT screen sharing */}
      {!loading && isTutor && !isScreenSharing && (
        <div 
          ref={buttonRef}
          className="absolute z-[9999] cursor-move"
          style={{ 
            left: `${buttonPosition.x}px`, 
            top: `${buttonPosition.y}px`,
            transition: isDragging ? 'none' : 'transform 0.2s',
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <Button
            onClick={(e) => {
              e.stopPropagation();
              if (!isDragging) {
                const newState = !showWhiteboard;
                setShowWhiteboard(newState);
                
                // Broadcast toggle to all participants
                if (jitsiApiRef.current) {
                  try {
                    const message = JSON.stringify({
                      type: 'toggleWhiteboard',
                      show: newState
                    });
                    console.log('📋 Teacher broadcasting whiteboard toggle:', newState, 'message:', message);
                    jitsiApiRef.current.executeCommand('sendEndpointTextMessage', '', message);
                    console.log('✅ Broadcast sent successfully');
                  } catch (error) {
                    console.error('❌ Error broadcasting whiteboard toggle:', error);
                  }
                }
              }
            }}
            size="icon"
            className={cn(
              "h-14 w-14 rounded-full shadow-xl transition-all duration-200 backdrop-blur-sm",
              showWhiteboard 
                ? "bg-blue-600/95 hover:bg-blue-700 text-white border-2 border-blue-400" 
                : "bg-gray-800/90 hover:bg-gray-700/90 text-white border-2 border-gray-600"
            )}
            title={showWhiteboard ? "Hide Whiteboard" : "Show Whiteboard (Drag to move)"}
          >
            <Pencil className="w-6 h-6" />
          </Button>
        </div>
      )}

      {/* Annotation Toggle Button - Teachers Only, shown when screen sharing */}
      {!loading && isTutor && isScreenSharing && (
        <div 
          ref={buttonRef}
          className="absolute z-[9999] cursor-move"
          style={{ 
            left: `${buttonPosition.x}px`, 
            top: `${buttonPosition.y}px`,
            transition: isDragging ? 'none' : 'transform 0.2s',
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <Button
            onClick={(e) => {
              e.stopPropagation();
              if (!isDragging) {
                if (showAnnotations) {
                  setAnnotationsClosing(true);
                  setTimeout(() => {
                    setShowAnnotations(false);
                    setAnnotationsClosing(false);
                  }, 300);
                } else {
                  setShowAnnotations(true);
                }
                
                // Broadcast toggle to all participants
                if (jitsiApiRef.current) {
                  try {
                    jitsiApiRef.current.executeCommand('sendEndpointTextMessage', '', JSON.stringify({
                      type: 'toggleAnnotations',
                      show: !showAnnotations
                    }));
                  } catch (error) {
                    console.error('Error broadcasting annotation toggle:', error);
                  }
                }
              }
            }}
            size="icon"
            className={cn(
              "h-14 w-14 rounded-full shadow-xl transition-all duration-200 backdrop-blur-sm ring-4 ring-white/20",
              showAnnotations 
                ? "bg-green-600/95 hover:bg-green-700 text-white border-2 border-green-400 scale-110" 
                : "bg-red-600/95 hover:bg-red-700 text-white border-2 border-red-400 animate-pulse"
            )}
            title={showAnnotations ? "Hide Annotations" : "Show Annotations (Drag to move)"}
          >
            <Pencil className="w-6 h-6" />
          </Button>
        </div>
      )}
      
      {/* Excalidraw Whiteboard */}
      {showWhiteboard && !isScreenSharing && (
        <ExcalidrawWhiteboard
          roomId={`rv2class-${meetingID}`}
          onClose={() => {
            setShowWhiteboard(false);
            
            // Broadcast close to all participants (if teacher)
            if (isTutor && jitsiApiRef.current) {
              try {
                jitsiApiRef.current.executeCommand('sendEndpointTextMessage', '', JSON.stringify({
                  type: 'toggleWhiteboard',
                  show: false
                }));
                console.log('📋 Broadcasting whiteboard close');
              } catch (error) {
                console.error('Error broadcasting whiteboard close:', error);
              }
            }
          }}
          jitsiApi={jitsiApiRef.current}
          isTutor={isTutor}
        />
      )}

      {/* Annotation Overlay - Only during screen share */}
      {showAnnotations && isScreenSharing && (
        <JitsiAnnotationOverlay
          onClose={() => {
            setAnnotationsClosing(true);
            setTimeout(() => {
              setShowAnnotations(false);
              setAnnotationsClosing(false);
            }, 300);
            
            // Broadcast close to students
            if (jitsiApiRef.current) {
              try {
                jitsiApiRef.current.executeCommand('sendEndpointTextMessage', '', JSON.stringify({
                  type: 'toggleAnnotations',
                  show: false
                }));
              } catch (error) {
                console.error('Error broadcasting annotation close:', error);
              }
            }
          }}
          viewOnly={false}
          isClosing={annotationsClosing}
          isTutor={isTutor}
          jitsiApi={jitsiApiRef.current}
        />
      )}
      
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
