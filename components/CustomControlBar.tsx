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
        console.log('🖥️ Starting screen share with simplified approach...');
        
        // Use absolute minimal constraints - let browser handle everything
        // This is the most compatible approach across all browsers
        await localParticipant.setScreenShareEnabled(true, {
          audio: true,
          // No resolution constraints - browser will use optimal settings
          // No video presets - avoid any potential conflicts
        });
        
        console.log('✅ Screen share enabled successfully');
        console.log('📊 Quality settings from room config will apply automatically');
        
      } catch (error) {
        console.error('❌ Screen share failed:', error);
        
        // Absolute last resort: no options at all
        try {
          console.log('⚠️ Trying screen share with zero constraints...');
          await localParticipant.setScreenShareEnabled(true);
          console.log('✅ Screen share enabled with zero constraints');
        } catch (fallbackError) {
          console.error('❌ All screen share attempts failed:', fallbackError);
          alert('Screen sharing failed. Please try:\n1. Refresh the page\n2. Check browser permissions\n3. Try a different browser (Chrome works best)');
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
