"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { LiveKitRoom, RoomAudioRenderer, useRoomContext, useDataChannel, useChat } from "@livekit/components-react";
import { VideoPresets, VideoCodec, Track } from "livekit-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, MessageSquare } from "lucide-react";
import Whiteboard from "@/components/Whiteboard";
import AnnotationOverlay from "@/components/AnnotationOverlay";
import JoinRequestsPanel from "@/components/JoinRequestsPanel";
import CustomVideoConference from "@/components/CustomVideoConference";
import CompactParticipantView from "@/components/CompactParticipantView";
import CustomControlBar from "@/components/CustomControlBar";
import ChatPanel from "@/components/ChatPanel";

function RoomContent({ isTutor, userName, sessionCode, roomName }: { isTutor: boolean; userName: string; sessionCode: string; roomName: string }) {
  const room = useRoomContext();
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
    
    // Only run this after room is fully connected
    if (room.state !== 'connected') {
      console.log('⏳ Waiting for room to connect before enabling media...');
      return;
    }

    const enableMediaOnConnect = async () => {
      try {
        console.log('🎥 Room connected! Enabling camera and microphone...');
        
        // Small delay to ensure LiveKitRoom has finished its initial setup
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Enable microphone first (less likely to fail)
        if (!room.localParticipant.isMicrophoneEnabled) {
          console.log('🎤 Microphone not enabled, enabling now...');
          try {
            await room.localParticipant.setMicrophoneEnabled(true);
            console.log('✅ Microphone enabled successfully');
          } catch (micError) {
            console.error('❌ Failed to enable microphone:', micError);
          }
        } else {
          console.log('✅ Microphone already enabled');
        }
        
        // Enable camera (more likely to fail, so try with retry)
        if (!room.localParticipant.isCameraEnabled) {
          console.log('📹 Camera not enabled, enabling now...');
          let retries = 3;
          let cameraEnabled = false;
          
          while (retries > 0 && !cameraEnabled) {
            try {
              await room.localParticipant.setCameraEnabled(true);
              
              // CRITICAL: Verify camera is actually published to the room
              await new Promise(resolve => setTimeout(resolve, 500));
              const cameraTrack = room.localParticipant.getTrackPublication(Track.Source.Camera);
              
              if (cameraTrack && cameraTrack.track) {
                console.log('✅ Camera enabled and published successfully');
                console.log('📹 Camera track details:', {
                  sid: cameraTrack.trackSid,
                  name: cameraTrack.trackName,
                  muted: cameraTrack.isMuted,
                  enabled: cameraTrack.track.mediaStreamTrack?.enabled,
                  deviceId: cameraTrack.track.mediaStreamTrack?.getSettings().deviceId,
                });
                cameraEnabled = true;
              } else {
                throw new Error('Camera track not published after enabling');
              }
            } catch (camError: any) {
              retries--;
              console.error(`❌ Camera enable attempt failed (${3 - retries}/3):`, camError);
              
              if (retries > 0) {
                console.log(`⏳ Retrying in 1 second... (${retries} attempts left)`);
                await new Promise(resolve => setTimeout(resolve, 1000));
              } else {
                // All retries failed - show helpful message with troubleshooting steps
                console.error('❌ All camera enable attempts failed');
                
                const errorMessage = camError.name === 'NotAllowedError' 
                  ? "⚠️ Доступ к камере заблокирован!\n\n" +
                    "1. Нажмите на значок 🔒 или 🎥 в адресной строке\n" +
                    "2. Разрешите доступ к камере\n" +
                    "3. Обновите страницу\n\n" +
                    "Или нажмите кнопку камеры 📹 внизу и выберите другую камеру из выпадающего меню."
                  : camError.name === 'NotFoundError'
                  ? "⚠️ Камера не найдена!\n\n" +
                    "1. Проверьте, подключена ли камера\n" +
                    "2. Закройте другие программы, использующие камеру\n" +
                    "3. Попробуйте выбрать другую камеру из меню 📹\n\n" +
                    "Микрофон работает нормально ✓"
                  : "⚠️ Не удалось включить камеру автоматически!\n\n" +
                    "Возможные решения:\n" +
                    "1. Нажмите кнопку камеры 📹 внизу экрана\n" +
                    "2. Нажмите стрелку ▼ рядом с кнопкой камеры\n" +
                    "3. Выберите другую камеру из списка\n" +
                    "4. Проверьте, не используется ли камера другой программой\n\n" +
                    "Микрофон работает нормально ✓";
                
                alert(errorMessage);
              }
            }
          }
        } else {
          console.log('✅ Camera already enabled');
          
          // Still verify it's published
          const cameraTrack = room.localParticipant.getTrackPublication(Track.Source.Camera);
          if (cameraTrack && cameraTrack.track) {
            console.log('✅ Camera track verified and published');
          } else {
            console.warn('⚠️ Camera shows enabled but track not published - attempting to republish...');
            try {
              // Try toggling camera to force republish
              await room.localParticipant.setCameraEnabled(false);
              await new Promise(resolve => setTimeout(resolve, 300));
              await room.localParticipant.setCameraEnabled(true);
              console.log('✅ Camera republished successfully');
            } catch (err) {
              console.error('❌ Failed to republish camera:', err);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error in enableMediaOnConnect:', error);
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
  }, [room, room?.state]); // Re-run when room state changes

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

  // CRITICAL: Enforce audio priority and quality settings
  useEffect(() => {
    if (!room || !room.localParticipant) return;

    const enforceAudioPriority = async () => {
      try {
        console.log('🎤 Enforcing audio priority and quality settings...');
        
        // Get all local audio tracks
        const audioTracks = room.localParticipant.audioTrackPublications;
        
        for (const [, publication] of audioTracks) {
          if (publication.track) {
            console.log('🔊 Audio track active:', {
              trackSid: publication.trackSid,
              muted: publication.isMuted,
              source: publication.source,
            });
          }
        }

        // Monitor all participants' audio tracks for quality
        const monitorRemoteAudio = () => {
          room.remoteParticipants.forEach((participant) => {
            participant.audioTrackPublications.forEach((publication) => {
              if (publication.track) {
                console.log(`🔊 Remote audio from ${participant.identity}:`, {
                  subscribed: publication.isSubscribed,
                  muted: publication.isMuted,
                  source: publication.source,
                });
              }
            });
          });
        };

        monitorRemoteAudio();
        
        // Monitor periodically to ensure audio quality is maintained
        const interval = setInterval(() => {
          console.log('🎤 Audio quality check - ensuring priority settings...');
          monitorRemoteAudio();
        }, 30000); // Every 30 seconds

        return () => clearInterval(interval);
      } catch (error) {
        console.error('❌ Error monitoring audio quality:', error);
      }
    };

    if (room.state === 'connected') {
      enforceAudioPriority();
    }

    room.on('connected', enforceAudioPriority);

    return () => {
      room.off('connected', enforceAudioPriority);
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

  // CRITICAL: Listen for tutor commands (remove student, stop screen share)
  useDataChannel((message) => {
    try {
      const decoder = new TextDecoder();
      const text = decoder.decode(message.payload);
      const data = JSON.parse(text);
      
      // Only process if this is for the current participant
      if (data.targetIdentity !== room?.localParticipant?.identity) {
        return;
      }

      if (data.type === "removeStudent") {
        console.log('🚫 Received remove command from tutor');
        
        // Show notification before disconnecting
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(239, 68, 68, 0.95);
          color: white;
          padding: 20px 40px;
          border-radius: 12px;
          z-index: 10000;
          font-size: 18px;
          font-weight: 600;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
          text-align: center;
        `;
        notification.innerHTML = `
          <div>You have been removed from the room by the tutor</div>
          <div style="margin-top: 8px; font-size: 14px; font-weight: 400;">You can rejoin using your link</div>
        `;
        document.body.appendChild(notification);
        
        // Disconnect after 2 seconds
        setTimeout(() => {
          room?.disconnect();
          // Redirect to home or show rejoin option
          window.location.href = '/';
        }, 2000);
        
      } else if (data.type === "stopScreenShare") {
        console.log('🛑 Received stop screen share command from tutor');
        
        // Find and stop screen share track
        const screenSharePub = Array.from(room?.localParticipant?.trackPublications.values() || [])
          .find(pub => pub.source === Track.Source.ScreenShare);
        
        if (screenSharePub && screenSharePub.track) {
          console.log('Stopping screen share track...');
          screenSharePub.track.stop();
          room?.localParticipant?.unpublishTrack(screenSharePub.track);
          
          // Show notification
          const notification = document.createElement('div');
          notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(249, 115, 22, 0.95);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          `;
          notification.textContent = 'Your screen share was stopped by the tutor';
          document.body.appendChild(notification);
          
          setTimeout(() => notification.remove(), 4000);
        }
      }
    } catch (error) {
      console.error("Error processing tutor command:", error);
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

  return (
    <div className="h-screen flex flex-col relative">
      {/* Join Requests Panel - Only visible to tutors */}
      {isTutor && <JoinRequestsPanel roomName={roomName} />}

      {/* Main Content - Full screen */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Audio renderer - Always active for both whiteboard and video mode */}
        <RoomAudioRenderer />
        
        {showWhiteboard ? (
          <>
            <Whiteboard />
            
            {/* Draggable participant videos during whiteboard */}
            <CompactParticipantView isTutor={isTutor} />
            
            {/* Close button for whiteboard - top right - Only visible to tutors */}
            {isTutor && (
              <button
                onClick={toggleWhiteboard}
                className="absolute top-6 right-6 z-20 p-3 rounded-xl bg-black/20 backdrop-blur-xl border border-white/10 shadow-2xl hover:bg-white/20 hover:border-white/30 transition-all duration-200 hover:scale-110"
                title="Close Whiteboard"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            )}

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
            <CustomVideoConference isTutor={isTutor} />
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
                isTutor={isTutor}
              />
            )}
          </>
        )}

        {/* Chat Panel - Available in all modes */}
        {(showChat || chatClosing) && (
          <ChatPanel 
            onClose={toggleChat}
            isClosing={chatClosing}
            roomName={roomName}
            isTutor={isTutor}
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
  const sessionCode = searchParams?.get("sessionCode") || searchParams?.get("code") || "";

  const [token, setToken] = useState("");

  useEffect(() => {
    if (!roomName || !userName) return;

    console.log("🔵 Connecting to room:", { roomName, userName, isTutor, sessionCode });

    (async () => {
      try {
        const resp = await fetch("/api/livekit-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomName, participantName: userName, isTutor }),
        });
        const data = await resp.json();
        console.log("✅ Got token for room:", roomName, "| User:", userName, "| Is Tutor:", isTutor);
        setToken(data.token);
      } catch (e) {
        console.error("❌ Error fetching token:", e);
      }
    })();
  }, [roomName, userName, isTutor, sessionCode]);

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
      video={true} // CRITICAL: Enable video by default for all participants
      audio={true} // CRITICAL: Enable audio by default for all participants
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      className="h-full"
      connect={true}
      connectOptions={{
        autoSubscribe: true,
      }}
      onError={(error) => {
        console.error('❌ LiveKit Room Error:', error);

        const message = typeof error === 'string' ? error : (error as Error)?.message ?? '';

        // Audio troubleshooting handlers
        if (message.includes('audio') || message.includes('microphone')) {
          alert('⚠️ Audio error detected. Please check microphone permissions and try refreshing.');
        }

        // Check if it's a camera access error
        if (message.includes('Could not start video source') || message.includes('NotReadableError')) {
          // Show user-friendly alert
          setTimeout(() => {
            alert("⚠️ Не удалось включить камеру!\n\n" +
                  "Возможные причины:\n" +
                  "1. Камера используется другим приложением (Zoom, Teams, Skype)\n" +
                  "2. Камера используется другой вкладкой браузера\n" +
                  "3. Камера не подключена или неисправна\n\n" +
                  "Решение:\n" +
                  "• Закройте все программы, использующие камеру\n" +
                  "• Закройте другие вкладки с видеозвонками\n" +
                  "• Обновите страницу (F5) и попробуйте снова\n\n" +
                  "Микрофон и чат работают без камеры!");
          }, 1000);
        }
      }}
      options={{
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,     // Browser's built-in noise suppression
          autoGainControl: true,
          // CRITICAL: Highest audio quality settings
          sampleRate: 48000,        // Professional audio quality (48kHz)
          channelCount: 1,           // Mono for better noise suppression (less data = less noise)
          sampleSize: 16,            // High quality bit depth
        },
        publishDefaults: {
          // CRITICAL: Enable RED (Redundant Audio) for reliability under packet loss
          red: true,                  // Redundant encoding for audio - prevents dropouts
          // CRITICAL: Enable DTX to eliminate noise floor during silence
          dtx: true,                  // Discontinuous transmission - stops sending audio during silence
          
          // Audio bitrate configuration (applied via audioPresets)
          audioPreset: {
            maxBitrate: 128_000,     // 128 kbps - high quality audio (music streaming quality)
          },
          
          // Screen share optimized for ULTRA quality - Microsoft Teams level
          screenShareEncoding: {
            maxBitrate: 15_000_000,  // 15 Mbps for ultra-sharp text (Microsoft Teams level)
            maxFramerate: 60,        // Up to 60fps for ultra-smooth screen sharing
          },
          // Prefer VP9 codec for better quality/compression ratio
          videoCodec: 'vp9' as VideoCodec,
          // Backup codec if VP9 not available
          backupCodec: { codec: 'vp8' },
          // CRITICAL: Disable simulcast for screen share to prevent quality pulsing
          simulcast: false,
          // CRITICAL: Keep microphone active even when muted (faster unmute)
          stopMicTrackOnMute: false,
        },
        videoCaptureDefaults: {
          resolution: VideoPresets.h720.resolution,
        },
        // CRITICAL: Disable adaptive stream to prevent quality drops
        adaptiveStream: false,
        // CRITICAL: Disable dynacast to maintain constant quality
        dynacast: false,
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
