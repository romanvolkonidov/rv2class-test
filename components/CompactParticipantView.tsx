"use client";

import { useEffect, useRef, memo, useState, useCallback } from "react";
import { useTracks, useParticipants, TrackReferenceOrPlaceholder, useRoomContext } from "@livekit/components-react";
import { Track, Participant } from "livekit-client";
import { cn } from "@/lib/utils";
import { X, Minimize2, Maximize2, GripHorizontal } from "lucide-react";

// Draggable Thumbnail Container - same as CustomVideoConference
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
  const [scale, setScale] = useState(1.0);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeMode, setResizeMode] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, scale: 1.0, posX: 0, posY: 0, width: 0, height: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  const MIN_SCALE = 0.5;
  const MAX_SCALE = 3.0;

  const handleResizeStart = (e: React.MouseEvent, mode: string) => {
    e.preventDefault();
    e.stopPropagation();
    const element = elementRef.current;
    if (!element) return;

    setIsResizing(true);
    setResizeMode(mode);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      scale: scale,
      posX: position.x,
      posY: position.y,
      width: element.offsetWidth,
      height: element.offsetHeight,
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!dragHandleRef.current?.contains(e.target as Node)) return;
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!dragHandleRef.current?.contains(e.target as Node)) return;
    e.stopPropagation();
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    });
  };

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

  useEffect(() => {
    if (!isResizing || !resizeMode) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      
      let newScale = resizeStart.scale;
      let newX = resizeStart.posX;
      let newY = resizeStart.posY;

      if (resizeMode === 'se') {
        const scaleX = (resizeStart.width + deltaX) / resizeStart.width;
        const scaleY = (resizeStart.height + deltaY) / resizeStart.height;
        const scaleFactor = Math.max(scaleX, scaleY);
        newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, resizeStart.scale * scaleFactor));
      } else if (resizeMode === 'ne') {
        const scaleX = (resizeStart.width + deltaX) / resizeStart.width;
        const scaleY = (resizeStart.height - deltaY) / resizeStart.height;
        const scaleFactor = Math.max(scaleX, scaleY);
        newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, resizeStart.scale * scaleFactor));
        const heightDiff = (resizeStart.height * newScale / resizeStart.scale) - resizeStart.height;
        newY = resizeStart.posY - heightDiff;
      } else if (resizeMode === 'sw') {
        const scaleX = (resizeStart.width - deltaX) / resizeStart.width;
        const scaleY = (resizeStart.height + deltaY) / resizeStart.height;
        const scaleFactor = Math.max(scaleX, scaleY);
        newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, resizeStart.scale * scaleFactor));
        const widthDiff = (resizeStart.width * newScale / resizeStart.scale) - resizeStart.width;
        newX = resizeStart.posX - widthDiff;
      } else if (resizeMode === 'nw') {
        const scaleX = (resizeStart.width - deltaX) / resizeStart.width;
        const scaleY = (resizeStart.height - deltaY) / resizeStart.height;
        const scaleFactor = Math.max(scaleX, scaleY);
        newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, resizeStart.scale * scaleFactor));
        const widthDiff = (resizeStart.width * newScale / resizeStart.scale) - resizeStart.width;
        const heightDiff = (resizeStart.height * newScale / resizeStart.scale) - resizeStart.height;
        newX = resizeStart.posX - widthDiff;
        newY = resizeStart.posY - heightDiff;
      }

      const element = elementRef.current;
      if (element) {
        const newWidth = resizeStart.width * (newScale / resizeStart.scale);
        const newHeight = resizeStart.height * (newScale / resizeStart.scale);
        
        newX = Math.max(10, Math.min(newX, window.innerWidth - newWidth - 10));
        newY = Math.max(10, Math.min(newY, window.innerHeight - newHeight - 10));
      }

      setScale(newScale);
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeMode(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeMode, resizeStart]);

  return (
    <div
      ref={elementRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => !isResizing && setIsHovered(false)}
      className={cn(
        "select-none",
        isDragging ? "z-[100]" : "z-50"
      )}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
        transformOrigin: 'top left',
        willChange: isDragging || isResizing ? 'transform' : 'auto',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
    >
      {(isHovered || isResizing) && !isDragging && !isMinimized && (
        <>
          <div
            className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize hover:bg-blue-500/50 transition-colors rounded-tl-lg"
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
            style={{ zIndex: 1001 }}
          />
          <div
            className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize hover:bg-blue-500/50 transition-colors rounded-tr-lg"
            onMouseDown={(e) => handleResizeStart(e, 'ne')}
            style={{ zIndex: 1001 }}
          />
          <div
            className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize hover:bg-blue-500/50 transition-colors rounded-bl-lg"
            onMouseDown={(e) => handleResizeStart(e, 'sw')}
            style={{ zIndex: 1001 }}
          />
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize hover:bg-blue-500/50 transition-colors rounded-br-lg"
            onMouseDown={(e) => handleResizeStart(e, 'se')}
            style={{ zIndex: 1001 }}
          />
        </>
      )}
      <div className="bg-black/60 backdrop-blur-md rounded-t-lg border border-white/20 px-2 py-1 flex items-center gap-2">
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

        <div className="flex items-center gap-1">
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

      {!isMinimized && (
        <div 
          className="bg-black/40 backdrop-blur-md rounded-b-lg border border-white/20 p-2 flex gap-2 items-start overflow-auto"
          style={{
            maxWidth: '100%',
          }}
        >
          <div className="flex gap-2" style={{
            transform: `scale(${1 / scale})`,
            transformOrigin: 'top left',
          }}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

// ParticipantView component - simplified for thumbnails
interface ParticipantViewProps {
  participant: Participant;
  trackRef?: TrackReferenceOrPlaceholder;
  isLocal?: boolean;
  isTutor?: boolean;
  onRemoveStudent?: (participantIdentity: string) => void;
  onStopScreenShare?: (participantIdentity: string) => void;
}

const ParticipantView = memo(function ParticipantView({ 
  participant, 
  trackRef, 
  isLocal, 
  isTutor,
  onRemoveStudent,
  onStopScreenShare,
}: ParticipantViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    const audioEl = audioRef.current;
    
    if (!trackRef?.publication?.track) return;

    const track = trackRef.publication.track;
    
    if (track.kind === Track.Kind.Video && videoEl) {
      track.attach(videoEl);
    } else if (track.kind === Track.Kind.Audio && audioEl && !isLocal) {
      track.attach(audioEl);
    }

    return () => {
      if (track.kind === Track.Kind.Video && videoEl) {
        track.detach(videoEl);
      } else if (track.kind === Track.Kind.Audio && audioEl && !isLocal) {
        track.detach(audioEl);
      }
    };
  }, [trackRef?.publication?.track, isLocal]);

  const isSpeaking = participant.isSpeaking;
  const isCameraEnabled = participant.isCameraEnabled;
  const [showControls, setShowControls] = useState(false);

  const hasScreenShare = participant.getTrackPublications().some(
    (pub) => pub.source === Track.Source.ScreenShare
  );

  return (
    <div
      className={cn(
        "relative w-28 h-20 sm:w-32 sm:h-24 md:w-40 md:h-28 max-w-[30vw] max-h-[25vh] rounded-lg overflow-hidden transition-all duration-200",
        "bg-black/20 backdrop-blur-md",
        isSpeaking ? "outline outline-2 outline-blue-400 ring-2 ring-blue-400/50" : "outline outline-1 outline-white/10"
      )}
      onMouseEnter={() => isTutor && !isLocal && setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={cn(
          "w-full h-full object-contain",
          !isCameraEnabled && "hidden",
          isLocal && "scale-x-[-1]"
        )}
      />
      {!isLocal && <audio ref={audioRef} autoPlay />}
      
      {!isCameraEnabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <span className="text-lg font-bold text-white">
              {participant.identity.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      )}

      <div className="absolute bottom-0.5 left-0.5 right-0.5 px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-sm">
        <p className="text-[10px] font-medium text-white/90 truncate leading-tight">
          {participant.identity} {isLocal && "(You)"}
        </p>
      </div>

      {!participant.isMicrophoneEnabled && (
        <div className="absolute top-1 right-1 p-1.5 rounded-md bg-red-500/80 backdrop-blur-sm border border-red-400/50 shadow-lg">
          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}

      {isTutor && !isLocal && showControls && (
        <div className="absolute top-1 left-1 flex gap-1 z-10">
          {hasScreenShare && onStopScreenShare && (
            <button
              onClick={() => onStopScreenShare(participant.identity)}
              className="px-2 py-1 text-[10px] font-medium text-white bg-orange-600/80 hover:bg-orange-500 rounded transition-colors"
              title="Stop their screen share"
            >
              Stop Share
            </button>
          )}
          {onRemoveStudent && (
            <button
              onClick={() => {
                if (confirm(`Remove ${participant.identity} from the room? They can rejoin.`)) {
                  onRemoveStudent(participant.identity);
                }
              }}
              className="px-2 py-1 text-[10px] font-medium text-white bg-red-600/80 hover:bg-red-500 rounded transition-colors"
              title="Remove from room"
            >
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
});

export default function CompactParticipantView({ isTutor }: { isTutor?: boolean }) {
  const participants = useParticipants();
  const room = useRoomContext();
  const [isMinimized, setIsMinimized] = useState(false);
  const [showLocal, setShowLocal] = useState(true);
  
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { room }
  );

  const localParticipant = participants.find((p) => p.isLocal);
  const remoteParticipants = participants.filter((p) => !p.isLocal);

  const handleRemoveStudent = (participantIdentity: string) => {
    if (!room || !isTutor) return;
    
    console.log('🚫 Tutor removing student:', participantIdentity);
    
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify({ 
      type: "removeStudent", 
      targetIdentity: participantIdentity,
      reason: "Removed by tutor"
    }));
    
    room.localParticipant.publishData(data, { reliable: true, destinationIdentities: [participantIdentity] });
    
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
    notification.textContent = `Removed ${participantIdentity} from room`;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
  };

  const handleStopScreenShare = (participantIdentity: string) => {
    if (!room || !isTutor) return;
    
    console.log('🛑 Tutor stopping screen share for:', participantIdentity);
    
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify({ 
      type: "stopScreenShare", 
      targetIdentity: participantIdentity 
    }));
    
    room.localParticipant.publishData(data, { reliable: true, destinationIdentities: [participantIdentity] });
    
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
    notification.textContent = `Stopped screen share for ${participantIdentity}`;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
  };

  const getTrack = (participant: Participant) => {
    return tracks.find(
      (t) => t.participant.identity === participant.identity && t.source === Track.Source.Camera
    );
  };

  return (
    <DraggableThumbnailContainer
      isMinimized={isMinimized}
      onToggleMinimize={() => setIsMinimized(!isMinimized)}
      showLocal={showLocal}
      onHideLocal={() => setShowLocal(!showLocal)}
    >
      {showLocal && localParticipant && (
        <ParticipantView
          key={localParticipant.identity}
          participant={localParticipant}
          trackRef={getTrack(localParticipant)}
          isLocal
          isTutor={isTutor}
        />
      )}
      {remoteParticipants.map((participant) => (
        <ParticipantView
          key={participant.identity}
          participant={participant}
          trackRef={getTrack(participant)}
          isTutor={isTutor}
          onRemoveStudent={handleRemoveStudent}
          onStopScreenShare={handleStopScreenShare}
        />
      ))}
    </DraggableThumbnailContainer>
  );
}
