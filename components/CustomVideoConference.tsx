"use client";

import { useEffect, useRef, memo, useState, useCallback } from "react";
import {
  useTracks,
  useParticipants,
  TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { Track, Participant, RemoteParticipant } from "livekit-client";
import { cn } from "@/lib/utils";
import { X, Minimize2, Maximize2, GripHorizontal } from "lucide-react";

// Draggable Thumbnail Container - moves all thumbnails as a group
function DraggableThumbnailContainer({ 
  children,
  isMinimized,
  onToggleMinimize,
  onHideLocal,
  showLocal,
}: { 
  children: React.ReactNode;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  onHideLocal: () => void;
  showLocal: boolean;
}) {
  const [position, setPosition] = useState({ x: 10, y: 10 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const elementRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  // Mouse drag handlers - only drag handle is draggable
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only allow dragging from the drag handle
    if (!dragHandleRef.current?.contains(e.target as Node)) return;
    if (e.button !== 0) return; // Only left click
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  // Touch drag handlers - only drag handle is draggable
  const handleTouchStart = (e: React.TouchEvent) => {
    // Only allow dragging from the drag handle
    if (!dragHandleRef.current?.contains(e.target as Node)) return;
    e.stopPropagation();
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    });
  };

  // Throttle position updates for better performance
  const rafRef = useRef<number | undefined>(undefined);
  const updatePosition = useCallback((newX: number, newY: number) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    rafRef.current = requestAnimationFrame(() => {
      const element = elementRef.current;
      if (element) {
        const maxX = window.innerWidth - element.offsetWidth - 10;
        const maxY = window.innerHeight - element.offsetHeight - 10;
        
        setPosition({
          x: Math.max(10, Math.min(newX, maxX)),
          y: Math.max(10, Math.min(newY, maxY)),
        });
      } else {
        setPosition({ x: newX, y: newY });
      }
    });
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      updatePosition(newX, newY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const newX = touch.clientX - dragStart.x;
      const newY = touch.clientY - dragStart.y;
      updatePosition(newX, newY);
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('touchcancel', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
      document.removeEventListener('touchcancel', handleEnd);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isDragging, dragStart, updatePosition]);

  return (
    <div
      ref={elementRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className={cn(
        "select-none",
        isDragging ? "z-[100]" : "z-10"
      )}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        transform: `translate(${position.x}px, ${position.y}px)`,
        willChange: isDragging ? 'transform' : 'auto',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
    >
      {/* Control bar with buttons */}
      <div className="bg-black/60 backdrop-blur-md rounded-t-lg border border-white/20 border-b-0 px-2 py-1 flex items-center gap-2">
        {/* Drag handle */}
        <div 
          ref={dragHandleRef}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded cursor-move hover:bg-white/10 transition-colors touch-manipulation",
            isDragging && "bg-white/20"
          )}
          title="Drag to move"
        >
          <GripHorizontal className="w-4 h-4 text-white/70" />
          <span className="text-xs text-white/70 font-medium hidden sm:inline">Drag</span>
        </div>

        {/* Button controls */}
        <div className="flex items-center gap-1">
          {/* Hide/Show local thumbnail */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onHideLocal();
            }}
            className="p-1.5 rounded hover:bg-white/10 transition-colors group"
            title={showLocal ? "Hide your camera" : "Show your camera"}
          >
            {showLocal ? (
              <X className="w-4 h-4 text-white/70 group-hover:text-white" />
            ) : (
              <svg className="w-4 h-4 text-white/70 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>

          {/* Minimize/Maximize */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMinimize();
            }}
            className="p-1.5 rounded hover:bg-white/10 transition-colors group"
            title={isMinimized ? "Show thumbnails" : "Minimize"}
          >
            {isMinimized ? (
              <Maximize2 className="w-4 h-4 text-white/70 group-hover:text-white" />
            ) : (
              <Minimize2 className="w-4 h-4 text-white/70 group-hover:text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Thumbnails container - hidden when minimized */}
      {!isMinimized && (
        <div className="bg-black/40 backdrop-blur-md rounded-b-lg border border-white/20 p-2 flex gap-2 items-start">
          {children}
        </div>
      )}
    </div>
  );
}

interface ParticipantViewProps {
  participant: Participant;
  trackRef?: TrackReferenceOrPlaceholder;
  isLocal?: boolean;
}

const ParticipantView = memo(function ParticipantView({ participant, trackRef, isLocal }: ParticipantViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    
    if (!trackRef?.publication?.track) return;

    const track = trackRef.publication.track;
    
    // Only handle VIDEO tracks - RoomAudioRenderer handles all audio
    if (track.kind === Track.Kind.Video && videoEl) {
      const isScreenShare = trackRef.source === Track.Source.ScreenShare;
      
      console.log('🎥 Attaching video track:', {
        source: trackRef.source,
        participant: participant.identity,
        trackSid: track.sid,
        isScreenShare,
      });
      
      track.attach(videoEl);
      
      // For screen share, log the video element properties after attachment
      if (isScreenShare) {
        setTimeout(() => {
          console.log('📺 Screen share video element stats:', {
            videoWidth: videoEl.videoWidth,
            videoHeight: videoEl.videoHeight,
            clientWidth: videoEl.clientWidth,
            clientHeight: videoEl.clientHeight,
            aspectRatio: (videoEl.videoWidth / videoEl.videoHeight).toFixed(2),
          });
        }, 500);
      }
      
      // Force video to play - critical for screen share
      videoEl.play().catch(err => {
        console.warn('⚠️ Video autoplay failed:', err);
      });
    }

    return () => {
      if (track.kind === Track.Kind.Video && videoEl) {
        console.log('🔌 Detaching video track:', track.sid);
        track.detach(videoEl);
      }
    };
  }, [trackRef?.publication?.track, isLocal, participant.identity, trackRef?.source]);

  const isSpeaking = participant.isSpeaking;
  const isCameraEnabled = participant.isCameraEnabled;
  const isScreenShare = trackRef?.source === Track.Source.ScreenShare;

  return (
    <div
      className={cn(
        "relative transition-all duration-200 w-full h-full",
        // NO rounded corners or borders for screen share - shows full content
        isScreenShare ? "overflow-visible bg-black flex items-center justify-center" : "overflow-hidden bg-black/20 backdrop-blur-md rounded-xl",
        !isScreenShare && "border",
        !isScreenShare && (isSpeaking ? "border-blue-400 ring-2 ring-blue-400/50" : "border-white/10")
      )}
    >
      {/* Video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={cn(
          isScreenShare ? "object-contain" : "object-cover", // contain for screen share, cover for camera
          !isCameraEnabled && !isScreenShare && "hidden",
          isLocal && !isScreenShare && "scale-x-[-1]" // Don't mirror screen share
        )}
        style={isScreenShare ? { 
          backgroundColor: '#000',
          // CRITICAL: These ensure the ENTIRE shared window is visible
          width: '100%',
          height: '100%',
          objectFit: 'contain',           // Fit entire content, no cropping
          objectPosition: 'center',        // Center the content
          display: 'block',
          maxWidth: '100%',
          maxHeight: '100%',
        } : {
          width: '100%',
          height: '100%',
        }}
      />
      
      {/* Audio is handled by RoomAudioRenderer - no manual audio elements needed */}

      {/* Placeholder when camera is off (but not for screen share) */}
      {!isCameraEnabled && !isScreenShare && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-2 border border-white/20">
              <span className="text-2xl font-bold text-white">
                {participant.identity.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Name overlay - Glass effect (hide for screen share to maximize space) */}
      {!isScreenShare && (
        <div className="absolute bottom-2 left-2 px-3 py-1 rounded-lg bg-black/30 backdrop-blur-md border border-white/20">
          <p className="text-sm font-medium text-white">
            {participant.identity} {isLocal && "(You)"}
          </p>
        </div>
      )}

      {/* Microphone muted indicator */}
      {!participant.isMicrophoneEnabled && (
        <div className="absolute top-2 right-2 p-2 rounded-lg bg-red-500/30 backdrop-blur-md border border-red-400/30">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if participant identity, camera state, mic state, or track changes
  return (
    prevProps.participant.identity === nextProps.participant.identity &&
    prevProps.participant.isCameraEnabled === nextProps.participant.isCameraEnabled &&
    prevProps.participant.isMicrophoneEnabled === nextProps.participant.isMicrophoneEnabled &&
    prevProps.participant.isSpeaking === nextProps.participant.isSpeaking &&
    prevProps.trackRef?.publication?.trackSid === nextProps.trackRef?.publication?.trackSid &&
    prevProps.isLocal === nextProps.isLocal
  );
});

export default function CustomVideoConference() {
  const participants = useParticipants();
  
  // State for thumbnail controls
  const [isMinimized, setIsMinimized] = useState(false);
  const [showLocalThumbnail, setShowLocalThumbnail] = useState(true);
  
  // Get all video and audio tracks
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);

  // Separate local and remote participants
  const localParticipant = participants.find((p) => p.isLocal);
  const remoteParticipants = participants.filter((p) => !p.isLocal);

  // Check if anyone is screen sharing
  const screenShareTrack = tracks.find(
    (track) => track.publication?.source === Track.Source.ScreenShare
  );

  return (
    <div className="w-full h-full relative bg-transparent">
      {/* Screen share view (if active) - FULL SCREEN with smooth fade-in */}
      {screenShareTrack ? (
        <>
          {/* Full screen share - uses entire viewport, control bar auto-hides */}
          <div 
            className="absolute inset-0 bg-black flex items-center justify-center animate-fade-in"
            style={{
              animation: 'fadeIn 0.4s ease-out'
            }}
          >
            <div className="w-full h-full">
              <ParticipantView
                participant={screenShareTrack.participant}
                trackRef={screenShareTrack}
              />
            </div>
          </div>

          {/* Floating draggable thumbnail container */}
          <DraggableThumbnailContainer
            isMinimized={isMinimized}
            onToggleMinimize={() => setIsMinimized(!isMinimized)}
            onHideLocal={() => setShowLocalThumbnail(!showLocalThumbnail)}
            showLocal={showLocalThumbnail}
          >
            {/* Local participant thumbnail */}
            {localParticipant && showLocalThumbnail && (
              <div className="w-28 h-20 sm:w-32 sm:h-24 md:w-40 md:h-28 max-w-[30vw] max-h-[25vh] flex-shrink-0">
                <ParticipantView
                  key={localParticipant.identity}
                  participant={localParticipant}
                  trackRef={tracks.find(
                    (t) => t.participant === localParticipant && t.source === Track.Source.Camera
                  )}
                  isLocal
                />
              </div>
            )}

            {/* Remote participants thumbnails */}
            {remoteParticipants.map((participant) => {
              const trackRef = tracks.find(
                (t) => t.participant === participant && t.source === Track.Source.Camera
              );
              return (
                <div 
                  key={participant.identity}
                  className="w-28 h-20 sm:w-32 sm:h-24 md:w-40 md:h-28 max-w-[30vw] max-h-[25vh] flex-shrink-0"
                >
                  <ParticipantView
                    participant={participant}
                    trackRef={trackRef}
                  />
                </div>
              );
            })}
          </DraggableThumbnailContainer>
        </>
      ) : (
        /* Participants grid when no screen share */
        <div className="w-full h-full p-2 md:p-4">
          <div
            className={cn(
              "grid gap-2 md:gap-4 h-full",
              // Mobile-first responsive grid
              "grid-cols-1",  // 1 column on mobile
              remoteParticipants.length === 0 && "md:grid-cols-1",
              remoteParticipants.length === 1 && "sm:grid-cols-2",
              remoteParticipants.length === 2 && "sm:grid-cols-2 lg:grid-cols-3",
              remoteParticipants.length >= 3 && "sm:grid-cols-2 lg:grid-cols-4"
            )}
          >
            {/* Local participant */}
            {localParticipant && (
              <ParticipantView
                key={localParticipant.identity}
                participant={localParticipant}
                trackRef={tracks.find(
                  (t) => t.participant === localParticipant && t.source === Track.Source.Camera
                )}
                isLocal
              />
            )}

            {/* Remote participants */}
            {remoteParticipants.map((participant) => {
              const trackRef = tracks.find(
                (t) => t.participant === participant && t.source === Track.Source.Camera
              );
              return (
                <ParticipantView
                  key={participant.identity}
                  participant={participant}
                  trackRef={trackRef}
                />
              );
            })}
          </div>
        </div>
      )}
      
      {/* Animation styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slideInTop {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
