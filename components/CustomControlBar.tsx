"use client";

import { useState, useEffect } from "react";
import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { Track, VideoPresets } from "livekit-client";
import { Mic, MicOff, Video, VideoOff, Monitor, MessageSquare, PhoneOff, Pencil, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface CustomControlBarProps {
  isTutor?: boolean;
  showWhiteboard?: boolean;
  showAnnotations?: boolean;
  showChat?: boolean;
  onToggleWhiteboard?: () => void;
  onToggleAnnotations?: () => void;
  onToggleChat?: () => void;
}

export default function CustomControlBar({ 
  isTutor = false,
  showWhiteboard = false,
  showAnnotations = false,
  showChat = false,
  onToggleWhiteboard,
  onToggleAnnotations,
  onToggleChat,
}: CustomControlBarProps) {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const router = useRouter();
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [hasScreenShare, setHasScreenShare] = useState(false);

  // Sync with actual participant state
  const isMuted = localParticipant ? !localParticipant.isMicrophoneEnabled : true;
  const isCameraOff = localParticipant ? !localParticipant.isCameraEnabled : true;

  // Check if anyone (local or remote) is screen sharing
  useEffect(() => {
    if (!room || !localParticipant) return;

    const checkForScreenShare = () => {
      // Check local participant - use trackPublications Map directly
      let hasShare = false;
      
      // Check all local tracks including screen share
      const localScreenShare = localParticipant.getTrackPublication(Track.Source.ScreenShare);
      if (localScreenShare) {
        hasShare = true;
        console.log('�️ Found local screen share track!');
      }

      // Also check videoTrackPublications
      if (!hasShare) {
        localParticipant.videoTrackPublications.forEach((pub) => {
          console.log('📹 Local video publication:', { source: pub.source, trackName: pub.trackName });
          if (pub.source === Track.Source.ScreenShare) {
            hasShare = true;
          }
        });
      }

      // Check remote participants
      if (!hasShare) {
        room.remoteParticipants.forEach(participant => {
          const remoteScreenShare = participant.getTrackPublication(Track.Source.ScreenShare);
          if (remoteScreenShare) {
            hasShare = true;
            console.log(`🖥️ Found remote screen share from ${participant.identity}!`);
          }
        });
      }

      console.log('🖥️ Screen share detected:', hasShare);
      setHasScreenShare(hasShare);
      setIsScreenSharing(hasShare && localParticipant.getTrackPublication(Track.Source.ScreenShare) !== undefined);
    };

    // Check immediately
    checkForScreenShare();

    // Check with slight delay to ensure tracks are updated
    const timer = setTimeout(checkForScreenShare, 300);

    // Listen to track events
    const handleTrackPublished = (pub: any) => {
      console.log('🎬 Track published:', { source: pub.source, kind: pub.kind });
      checkForScreenShare();
    };

    const handleTrackUnpublished = (pub: any) => {
      console.log('🎬 Track unpublished:', { source: pub.source, kind: pub.kind });
      checkForScreenShare();
    };

    localParticipant.on('trackPublished', handleTrackPublished);
    localParticipant.on('trackUnpublished', handleTrackUnpublished);
    room.on('trackPublished', handleTrackPublished);
    room.on('trackUnpublished', handleTrackUnpublished);
    room.on('participantConnected', checkForScreenShare);
    room.on('participantDisconnected', checkForScreenShare);

    return () => {
      clearTimeout(timer);
      localParticipant.off('trackPublished', handleTrackPublished);
      localParticipant.off('trackUnpublished', handleTrackUnpublished);
      room.off('trackPublished', handleTrackPublished);
      room.off('trackUnpublished', handleTrackUnpublished);
      room.off('participantConnected', checkForScreenShare);
      room.off('participantDisconnected', checkForScreenShare);
    };
  }, [room, localParticipant]);

  // Debug: Log state changes
  useEffect(() => {
    console.log('🎨 Button states:', { 
      hasScreenShare, 
      showAnnotations, 
      willBeGreen: hasScreenShare && !showAnnotations 
    });
  }, [hasScreenShare, showAnnotations]);

  // Removed duplicate useEffect for isScreenSharing - now handled above

  const toggleMicrophone = async () => {
    if (localParticipant) {
      const enabled = localParticipant.isMicrophoneEnabled;
      await localParticipant.setMicrophoneEnabled(!enabled);
    }
  };

  const toggleCamera = async () => {
    if (localParticipant) {
      const enabled = localParticipant.isCameraEnabled;
      await localParticipant.setCameraEnabled(!enabled);
    }
  };

  const toggleScreenShare = async () => {
    if (!localParticipant || !room) return;

    if (isScreenSharing) {
      await localParticipant.setScreenShareEnabled(false);
    } else {
      try {
        // Show user-friendly reminder
        const reminderDiv = document.createElement('div');
        reminderDiv.style.cssText = `
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 16px 24px;
          border-radius: 12px;
          z-index: 10000;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          backdrop-filter: blur(10px);
        `;
        reminderDiv.innerHTML = '🔊 <strong>Don\'t forget:</strong> Check "Share audio" or "Share tab audio" in the popup!';
        document.body.appendChild(reminderDiv);
        
        setTimeout(() => {
          reminderDiv.style.transition = 'opacity 0.5s';
          reminderDiv.style.opacity = '0';
          setTimeout(() => reminderDiv.remove(), 500);
        }, 8000);
        
        console.log('🖥️ Requesting ULTRA quality screen share (up to 4K @ 60fps with VP9)...');
        
        // STEP 1: Request maximum resolution from browser using native getDisplayMedia
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 3840, max: 3840 },      // 4K width
            height: { ideal: 2160, max: 2160 },     // 4K height
            frameRate: { ideal: 30, max: 60 },      // Up to 60fps
            cursor: "always" as any,
            displaySurface: "monitor" as any,
          },
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: 48000,
          } as any,
          selfBrowserSurface: "exclude" as any,
          surfaceSwitching: "include" as any,
          systemAudio: "include" as any,
        } as any);
        
        // STEP 2: Get the video track and set contentHint for text optimization
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack && 'contentHint' in videoTrack) {
          (videoTrack as any).contentHint = "detail"; // Optimize for text/detail
        }
        
        // Log actual resolution obtained
        const settings = videoTrack.getSettings();
        console.log(`✅ Captured screen at: ${settings.width}x${settings.height} @ ${settings.frameRate}fps`);
        
        // STEP 3: Publish with LiveKit using maximum quality settings
        // The room options specify VP9 codec and 10 Mbps bitrate
        await localParticipant.publishTrack(videoTrack, {
          name: 'screen',
          source: Track.Source.ScreenShare,
          // These are inherited from room publishDefaults
        });
        
        // Publish audio track if available
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          await localParticipant.publishTrack(audioTrack, {
            name: 'screen-audio',
            source: Track.Source.ScreenShareAudio,
          });
          console.log('✅ Screen audio published');
        }
        
        console.log('✅ Screen share published with ULTRA settings:');
        console.log(`   • Resolution: ${settings.width}x${settings.height}`);
        console.log(`   • Frame Rate: ${settings.frameRate}fps`);
        console.log('   • Bitrate: 10 Mbps (gaming-level quality)');
        console.log('   • Codec: VP9 (superior compression)');
        console.log('   • Content Hint: DETAIL (optimized for text)');
        
        // Handle stream ending (user stops sharing)
        videoTrack.addEventListener('ended', async () => {
          console.log('🛑 Screen share stopped by user');
          await localParticipant.unpublishTrack(videoTrack);
          if (audioTrack) {
            await localParticipant.unpublishTrack(audioTrack);
          }
        });
        
      } catch (error) {
        console.warn('⚠️ Ultra quality screen share failed, trying fallback:', error);
        
        // Fallback: Use LiveKit's built-in method
        try {
          await localParticipant.setScreenShareEnabled(true, {
            audio: true,
            selfBrowserSurface: "exclude",
            surfaceSwitching: "include",
            systemAudio: "include",
          });
          console.log('✅ Screen share enabled with standard LiveKit method');
        } catch (fallbackError) {
          console.warn('⚠️ Standard screen share failed:', fallbackError);
          await localParticipant.setScreenShareEnabled(true);
        }
      }
    }
  };

  const handleLeave = async () => {
    await room.disconnect();
    router.push('/');
  };

  const GlassButton = ({
    onClick,
    active = false,
    danger = false,
    success = false,
    children,
    title,
  }: {
    onClick: () => void;
    active?: boolean;
    danger?: boolean;
    success?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "group relative p-4 rounded-xl transition-all duration-200",
        "bg-white/10 backdrop-blur-md border border-white/20",
        "hover:bg-white/20 hover:border-white/30 hover:-translate-y-0.5 hover:scale-110",
        "active:translate-y-0",
        danger && "bg-red-500/20 border-red-400/30 hover:bg-red-500/30",
        success && "bg-green-500/50 border-green-400/60 hover:bg-green-500/60 shadow-lg shadow-green-500/30",
        active && !success && "bg-white/25 border-white/40"
      )}
    >
      <div className={cn("text-white transition-transform")}>
        {children}
      </div>
    </button>
  );

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
      <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-black/20 backdrop-blur-xl border border-white/10 shadow-2xl">
        {/* Basic controls - always visible */}
        <GlassButton
          onClick={toggleMicrophone}
          active={!isMuted}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </GlassButton>

        <GlassButton
          onClick={toggleCamera}
          active={!isCameraOff}
          title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
        >
          {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </GlassButton>

        <GlassButton
          onClick={toggleScreenShare}
          active={isScreenSharing}
          title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
        >
          <Monitor className="w-5 h-5" />
        </GlassButton>

        <div className="w-px h-10 bg-white/20 mx-2" />

        {/* Chat Button - Available to everyone */}
        {onToggleChat && (
          <GlassButton
            onClick={onToggleChat}
            active={showChat}
            title={showChat ? "Close Chat" : "Open Chat"}
          >
            <MessageSquare className="w-5 h-5" />
          </GlassButton>
        )}

        {/* Tutor-only controls */}
        {isTutor && (
          <>
            <div className="w-px h-10 bg-white/20 mx-2" />
            
            {!showWhiteboard && onToggleAnnotations && (
              <>
                {console.log('🔴 Rendering annotate button with:', { hasScreenShare, showAnnotations, success: hasScreenShare })}
                <GlassButton
                  onClick={onToggleAnnotations}
                  active={showAnnotations}
                  success={hasScreenShare}
                  title={showAnnotations ? "Hide Annotations" : "Annotate Screen"}
                >
                  <Pencil className="w-5 h-5" />
                </GlassButton>
              </>
            )}

            {onToggleWhiteboard && (
              <GlassButton
                onClick={onToggleWhiteboard}
                active={showWhiteboard}
                title={showWhiteboard ? "Show Video" : "Open Whiteboard"}
              >
                <Square className="w-5 h-5" />
              </GlassButton>
            )}
          </>
        )}

        <div className="w-px h-10 bg-white/20 mx-2" />

        <GlassButton onClick={handleLeave} danger title="Leave Session">
          <PhoneOff className="w-5 h-5" />
        </GlassButton>
      </div>
    </div>
  );
}
