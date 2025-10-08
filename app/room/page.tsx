"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { LiveKitRoom, RoomAudioRenderer, useRoomContext, useDataChannel, useChat } from "@livekit/components-react";
import { VideoPresets, VideoCodec } from "livekit-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, Check, X, MessageSquare } from "lucide-react";
import Whiteboard from "@/components/Whiteboard";
import AnnotationOverlay from "@/components/AnnotationOverlay";
import JoinRequestsPanel from "@/components/JoinRequestsPanel";
import CustomVideoConference from "@/components/CustomVideoConference";
import CompactParticipantView from "@/components/CompactParticipantView";
import CustomControlBar from "@/components/CustomControlBar";
import ChatPanel from "@/components/ChatPanel";
import AudioDiagnostics from "@/components/AudioDiagnostics";

function RoomContent({ isTutor, userName, sessionCode, roomName }: { isTutor: boolean; userName: string; sessionCode: string; roomName: string }) {
  const room = useRoomContext();
  const [copied, setCopied] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [annotationsClosing, setAnnotationsClosing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatClosing, setChatClosing] = useState(false);
  const [hasScreenShare, setHasScreenShare] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastMessagePreview, setLastMessagePreview] = useState<{ from: string; message: string } | null>(null);
  const [showMessageToast, setShowMessageToast] = useState(false);
  const lastMessageCountRef = useRef(0);
  const { chatMessages } = useChat();

  // Monitor for new chat messages when chat is closed
  useEffect(() => {
    if (!room || !room.localParticipant) return;

    // If chat is open, reset unread count
    if (showChat) {
      setUnreadCount(0);
      lastMessageCountRef.current = chatMessages.length;
      return;
    }

    // Check for new messages when chat is closed
    if (chatMessages.length > lastMessageCountRef.current && lastMessageCountRef.current > 0) {
      const newMessagesCount = chatMessages.length - lastMessageCountRef.current;
      const latestMessage = chatMessages[chatMessages.length - 1];
      
      // Only show notification if message is not from current user
      const isFromCurrentUser = latestMessage.from?.identity === room.localParticipant.identity;
      
      if (!isFromCurrentUser) {
        setUnreadCount(prev => prev + newMessagesCount);
        
        // Show toast with message preview
        const senderName = latestMessage.from?.identity || latestMessage.from?.name || "Someone";
        const messageText = latestMessage.message.length > 50 
          ? latestMessage.message.substring(0, 50) + "..." 
          : latestMessage.message;
        
        setLastMessagePreview({ from: senderName, message: messageText });
        setShowMessageToast(true);
        
        // Hide toast after 5 seconds
        setTimeout(() => {
          setShowMessageToast(false);
        }, 5000);
      }
    }
    
    lastMessageCountRef.current = chatMessages.length;
  }, [chatMessages, showChat, room]);

  // CRITICAL: Ensure camera and microphone are enabled on room connection
  useEffect(() => {
    if (!room || !room.localParticipant) return;

    const enableMediaOnConnect = async () => {
      try {
        console.log('🎥 Ensuring camera and microphone are enabled...');
        
        // Enable microphone
        if (!room.localParticipant.isMicrophoneEnabled) {
          await room.localParticipant.setMicrophoneEnabled(true);
          console.log('✅ Microphone enabled');
        } else {
          console.log('✅ Microphone already enabled');
        }
        
        // Enable camera
        if (!room.localParticipant.isCameraEnabled) {
          await room.localParticipant.setCameraEnabled(true);
          console.log('✅ Camera enabled');
        } else {
          console.log('✅ Camera already enabled');
        }
      } catch (error) {
        console.error('❌ Error enabling media:', error);
      }
    };

    // Enable media when room is connected
    if (room.state === 'connected') {
      enableMediaOnConnect();
    }

    // Also enable when connection state changes to connected
    room.on('connected', enableMediaOnConnect);

    return () => {
      room.off('connected', enableMediaOnConnect);
    };
  }, [room]);

  // Debug: Log room participants
  useEffect(() => {
    if (!room) return;
    
    const logParticipants = () => {
      // Only log if the room is actually connected
      if (!room.name || !room.localParticipant?.identity) {
        console.log('⏳ Room not yet connected...');
        return;
      }
      const participants = Array.from(room.remoteParticipants.values());
      console.log(`👥 Room participants (${participants.length + 1} total):`, {
        local: room.localParticipant.identity,
        remote: participants.map(p => p.identity),
        roomName: room.name,
      });
    };

    // Wait for the room to be fully connected
    room.on('connected', () => {
      console.log('🎉 Room connected!');
      logParticipants();
    });
    
    room.on('participantConnected', (participant) => {
      console.log('✅ Participant connected:', participant.identity);
      logParticipants();
    });
    
    room.on('participantDisconnected', (participant) => {
      console.log('❌ Participant disconnected:', participant.identity);
      logParticipants();
    });
    
    // Debug audio tracks
    room.on('trackSubscribed', (track, publication, participant) => {
      console.log('🎵 Track subscribed:', {
        participant: participant.identity,
        kind: track.kind,
        source: publication.source,
        muted: track.isMuted,
      });
      
      // Special attention to audio tracks
      if (track.kind === 'audio') {
        console.log('🔊 AUDIO TRACK RECEIVED from:', participant.identity);
        console.log('   - Track SID:', publication.trackSid);
        console.log('   - Is muted:', track.isMuted);
        console.log('   - Source:', publication.source);
        
        // Show visual notification
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          bottom: 80px;
          left: 20px;
          background: rgba(34, 197, 94, 0.95);
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          z-index: 10000;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        notification.textContent = `🔊 Audio connected: ${participant.identity}`;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 3000);
      }
    });
    
    room.on('trackUnsubscribed', (track, publication, participant) => {
      console.log('🔇 Track unsubscribed:', {
        participant: participant.identity,
        kind: track.kind,
        source: publication.source,
      });
      
      if (track.kind === 'audio') {
        console.log('🔇 AUDIO TRACK LOST from:', participant.identity);
      }
    });
    
    // Debug track publications
    room.on('trackPublished', (publication, participant) => {
      console.log('📢 Track published:', {
        participant: participant.identity,
        kind: publication.kind,
        source: publication.source,
      });
    });
    
    room.on('trackUnpublished', (publication, participant) => {
      console.log('📢 Track unpublished:', {
        participant: participant.identity,
        kind: publication.kind,
        source: publication.source,
      });
    });

    // Check if already connected
    if (room.state === 'connected') {
      logParticipants();
    }

    return () => {
      room.off('connected', logParticipants);
      room.off('participantConnected', logParticipants);
      room.off('participantDisconnected', logParticipants);
    };
  }, [room]);

  // Connection state monitoring and automatic recovery
  useEffect(() => {
    if (!room) return;

    let reconnectAttempts = 0;
    const maxReconnectAttempts = 3;

    const handleConnectionStateChange = (state: string) => {
      console.log('🔌 Connection state changed:', state);

      if (state === 'reconnecting') {
        console.log('🔄 Connection lost, attempting to reconnect...');
        reconnectAttempts++;
        
        if (reconnectAttempts <= maxReconnectAttempts) {
          // Show user-friendly message
          const notification = document.createElement('div');
          notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 165, 0, 0.95);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          `;
          notification.textContent = `🔄 Переподключение... (попытка ${reconnectAttempts}/${maxReconnectAttempts})`;
          document.body.appendChild(notification);
          
          setTimeout(() => notification.remove(), 5000);
        }
      } else if (state === 'connected') {
        console.log('✅ Connection restored!');
        reconnectAttempts = 0;
        
        // Show success message
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(34, 197, 94, 0.95);
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          z-index: 10000;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        notification.textContent = '✅ Соединение восстановлено!';
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 3000);
      } else if (state === 'disconnected') {
        console.log('❌ Connection failed');
        
        if (reconnectAttempts >= maxReconnectAttempts) {
          // Show error message
          const notification = document.createElement('div');
          notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(239, 68, 68, 0.95);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          `;
          notification.textContent = '❌ Не удалось восстановить соединение. Обновите страницу.';
          document.body.appendChild(notification);
        }
      }
    };

    room.on('connectionStateChanged', handleConnectionStateChange);
    room.on('reconnecting', () => handleConnectionStateChange('reconnecting'));
    room.on('reconnected', () => handleConnectionStateChange('connected'));

    return () => {
      room.off('connectionStateChanged', handleConnectionStateChange);
      room.off('reconnecting', () => handleConnectionStateChange('reconnecting'));
      room.off('reconnected', () => handleConnectionStateChange('connected'));
    };
  }, [room]);

  // Monitor for screen share
  useEffect(() => {
    const checkScreenShare = () => {
      const videos = document.querySelectorAll('video');
      let found = false;
      for (const video of videos) {
        const source = video.getAttribute('data-lk-source');
        if (source === 'screen_share' || source === 'screen_share_audio') {
          found = true;
          break;
        }
      }
      setHasScreenShare(found);
      
      // If screen share stops, clear annotations
      if (!found && hasScreenShare) {
        setShowAnnotations(false);
      }
    };

    checkScreenShare();
    const interval = setInterval(checkScreenShare, 1000);
    return () => clearInterval(interval);
  }, [hasScreenShare]);

  // Listen for whiteboard state changes from tutor
  useDataChannel((message) => {
    try {
      const decoder = new TextDecoder();
      const text = decoder.decode(message.payload);
      const data = JSON.parse(text);
      
      if (data.type === "toggleWhiteboard") {
        setShowWhiteboard(data.show);
      } else if (data.type === "toggleAnnotations") {
        // Students follow teacher's annotation state
        if (!isTutor) {
          setShowAnnotations(data.show);
        }
      }
    } catch (error) {
      console.error("Error processing whiteboard toggle:", error);
    }
  });

  const toggleWhiteboard = () => {
    const newState = !showWhiteboard;
    setShowWhiteboard(newState);
    
    // If tutor, broadcast the state to all participants
    if (isTutor) {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify({ type: "toggleWhiteboard", show: newState }));
      room.localParticipant.publishData(data, { reliable: true });
    }
  };

  const toggleAnnotations = () => {
    const newState = !showAnnotations;
    
    if (showAnnotations) {
      // Trigger closing animation
      setAnnotationsClosing(true);
      // Wait for animation to complete before hiding
      setTimeout(() => {
        setShowAnnotations(false);
        setAnnotationsClosing(false);
      }, 300);
    } else {
      // Open immediately
      setShowAnnotations(true);
    }
    
    // If tutor, broadcast the state to all participants
    if (isTutor) {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify({ type: "toggleAnnotations", show: newState }));
      room.localParticipant.publishData(data, { reliable: true });
    }
  };

  const toggleChat = () => {
    if (showChat) {
      // Trigger closing animation
      setChatClosing(true);
      // Wait for animation to complete before hiding
      setTimeout(() => {
        setShowChat(false);
        setChatClosing(false);
      }, 300);
    } else {
      // Open immediately
      setShowChat(true);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-screen flex flex-col relative">
      {/* Join Requests Panel - Only visible to tutors */}
      {isTutor && <JoinRequestsPanel roomName={roomName} />}

      {/* Session Code - Floating top-right corner for tutors only */}
      {isTutor && sessionCode && (
        <div className="absolute top-6 right-6 z-10">
          <Card className="bg-black/20 backdrop-blur-xl border-white/10 shadow-2xl">
            <CardContent className="p-3 flex items-center gap-3">
              <div>
                <p className="text-xs text-gray-400">Session Code</p>
                <p className="text-lg font-mono font-bold text-white">{sessionCode}</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={copyCode}
                className="text-white hover:bg-white/20"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content - Full screen */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Audio renderer - Always active for both whiteboard and video mode */}
        <RoomAudioRenderer />
        
        {showWhiteboard ? (
          <>
            <Whiteboard />
            
            {/* Draggable participant videos during whiteboard */}
            <CompactParticipantView />
            
            {/* Close button for whiteboard - top right */}
            <button
              onClick={toggleWhiteboard}
              className="absolute top-6 right-6 z-20 p-3 rounded-xl bg-black/20 backdrop-blur-xl border border-white/10 shadow-2xl hover:bg-white/20 hover:border-white/30 transition-all duration-200 hover:scale-110"
              title="Close Whiteboard"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            {/* Control bar available even in whiteboard mode */}
            <CustomControlBar 
              isTutor={isTutor}
              showWhiteboard={showWhiteboard}
              showAnnotations={showAnnotations}
              showChat={showChat}
              onToggleWhiteboard={toggleWhiteboard}
              onToggleAnnotations={toggleAnnotations}
              onToggleChat={toggleChat}
              unreadChatCount={unreadCount}
            />
          </>
        ) : (
          <>
            <CustomVideoConference />
            <CustomControlBar 
              isTutor={isTutor}
              showWhiteboard={showWhiteboard}
              showAnnotations={showAnnotations}
              showChat={showChat}
              onToggleWhiteboard={toggleWhiteboard}
              onToggleAnnotations={toggleAnnotations}
              onToggleChat={toggleChat}
              unreadChatCount={unreadCount}
            />
            {/* Show annotations for everyone when active - tutor gets close button, students don't */}
            {(showAnnotations || annotationsClosing) && (
              <AnnotationOverlay 
                onClose={isTutor ? () => toggleAnnotations() : undefined} 
                viewOnly={false}
                isClosing={annotationsClosing}
              />
            )}
          </>
        )}

        {/* Chat Panel - Available in all modes */}
        {(showChat || chatClosing) && (
          <ChatPanel 
            onClose={toggleChat}
            isClosing={chatClosing}
          />
        )}

        {/* New Message Toast Notification */}
        {showMessageToast && lastMessagePreview && (
          <div 
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] animate-slide-in-fade"
            style={{
              animation: 'slideInFade 0.3s ease-out, slideOutFade 0.3s ease-out 4.7s'
            }}
          >
            <div className="backdrop-blur-xl bg-blue-500/90 text-white px-6 py-4 rounded-2xl shadow-2xl border border-blue-400/30 max-w-sm">
              <div className="flex items-start gap-3">
                <MessageSquare className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{lastMessagePreview.from}</p>
                  <p className="text-sm text-white/90 mt-0.5 truncate">{lastMessagePreview.message}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Audio Diagnostics - Press Ctrl+Shift+A to show */}
        <AudioDiagnostics />
      </div>

      <style jsx>{`
        @keyframes slideInFade {
          from {
            opacity: 0;
            transform: translate(-50%, -20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        
        @keyframes slideOutFade {
          from {
            opacity: 1;
            transform: translate(-50%, 0);
          }
          to {
            opacity: 0;
            transform: translate(-50%, -20px);
          }
        }
      `}</style>
    </div>
  );
}

function RoomPage() {
  const searchParams = useSearchParams();
  const roomName = searchParams?.get("room") || "";
  const userName = searchParams?.get("name") || "";
  const isTutor = searchParams?.get("isTutor") === "true";
  const sessionCode = searchParams?.get("code") || "";

  const [token, setToken] = useState("");

  useEffect(() => {
    if (!roomName || !userName) return;

    console.log("🔵 Connecting to room:", { roomName, userName, isTutor });

    (async () => {
      try {
        const resp = await fetch("/api/livekit-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomName, participantName: userName, isTutor }),
        });
        const data = await resp.json();
        console.log("✅ Got token for room:", roomName);
        setToken(data.token);
      } catch (e) {
        console.error("❌ Error fetching token:", e);
      }
    })();
  }, [roomName, userName, isTutor]);

  if (token === "") {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Connecting to session...</p>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={true} // Enable video for everyone to ensure proper WebRTC setup
      audio={true} // Enable audio for everyone - ensures proper audio receiving
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      className="h-full"
      connect={true}
      connectOptions={{
        autoSubscribe: true,
      }}
      options={{
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        publishDefaults: {
          // Screen share optimized for ULTRA quality - Microsoft Teams level
          screenShareEncoding: {
            maxBitrate: 15_000_000, // 15 Mbps for ultra-sharp text (Microsoft Teams level)
            maxFramerate: 60, // Up to 60fps for ultra-smooth screen sharing
          },
          // Prefer VP9 codec for better quality/compression ratio
          videoCodec: 'vp9' as VideoCodec,
          // Backup codec if VP9 not available
          backupCodec: { codec: 'vp8' },
          // CRITICAL: Disable simulcast for screen share to prevent quality pulsing
          simulcast: false,
          // CRITICAL: Force constant bitrate (no adaptive reduction)
          stopMicTrackOnMute: false,
          // CRITICAL: Ensure audio and video are published immediately
          dtx: false,
        },
        videoCaptureDefaults: {
          resolution: VideoPresets.h720.resolution,
        },
        // CRITICAL: Disable adaptive stream to prevent quality drops
        adaptiveStream: false,
        // CRITICAL: Disable dynacast to maintain constant quality
        dynacast: false,
      }}
      // Audio troubleshooting handlers
      onError={(error) => {
        console.error('❌ LiveKit Room Error:', error);
        if (error.message.includes('audio') || error.message.includes('microphone')) {
          alert('⚠️ Audio error detected. Please check microphone permissions and try refreshing.');
        }
      }}
      onConnected={() => {
        console.log('✅ Successfully connected to room - audio and video should be enabled');
      }}
      onDisconnected={() => {
        console.log('❌ Disconnected from room');
      }}
    >
      <RoomContent isTutor={isTutor} userName={userName} sessionCode={sessionCode} roomName={roomName} />
    </LiveKitRoom>
  );
}

export default function RoomPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <RoomPage />
    </Suspense>
  );
}
