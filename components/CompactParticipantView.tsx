"use client";

import { useEffect, useRef, memo, useState } from "react";
import { useTracks, useParticipants, TrackReferenceOrPlaceholder, useRoomContext } from "@livekit/components-react";
import { Track, Participant } from "livekit-client";
import { cn } from "@/lib/utils";
import { GripVertical, UserX, MonitorX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CompactParticipantProps {
  participant: Participant;
  trackRef?: TrackReferenceOrPlaceholder;
  isLocal?: boolean;
  isTutor?: boolean;
  onRemoveStudent?: (participantIdentity: string) => void;
  onStopScreenShare?: (participantIdentity: string) => void;
}

const CompactParticipant = memo(function CompactParticipant({ 
  participant, 
  trackRef, 
  isLocal, 
  isTutor, 
  onRemoveStudent, 
  onStopScreenShare 
}: CompactParticipantProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [showControls, setShowControls] = useState(false);

  // Check if participant has screen share
  const hasScreenShare = participant.getTrackPublications().some(
    (pub) => pub.source === Track.Source.ScreenShare
  );

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

  return (
    <div
      className={cn(
        "relative w-[160px] h-[120px] rounded-lg overflow-hidden transition-all duration-200",
        "bg-black/20 backdrop-blur-md border",
        isSpeaking ? "border-blue-400 ring-2 ring-blue-400/50" : "border-white/10"
      )}
      onMouseEnter={() => isTutor && !isLocal && setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={cn(
          "w-full h-full object-cover",
          !isCameraEnabled && "hidden"
        )}
      />
      
      {/* Audio */}
      {!isLocal && <audio ref={audioRef} autoPlay />}

      {/* Placeholder when camera is off */}
      {!isCameraEnabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <span className="text-lg font-bold text-white">
              {participant.identity.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Tutor Controls - Only shown when hovering and user is tutor and not local participant */}
      {isTutor && !isLocal && showControls && (
        <div className="absolute top-1 right-1 flex gap-1 z-10">
          {/* Stop Screen Share Button - Only show if participant has screen share */}
          {hasScreenShare && onStopScreenShare && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 bg-orange-500/80 hover:bg-orange-600/90 text-white backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation();
                onStopScreenShare(participant.identity);
              }}
              title="Stop their screen share"
            >
              <MonitorX className="h-3 w-3" />
            </Button>
          )}
          
          {/* Remove Student Button */}
          {onRemoveStudent && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 bg-red-500/80 hover:bg-red-600/90 text-white backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Remove ${participant.identity} from the room? They can rejoin using their link.`)) {
                  onRemoveStudent(participant.identity);
                }
              }}
              title="Remove from room"
            >
              <UserX className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      {/* Name overlay */}
      <div className="absolute bottom-1 left-1 right-1 px-2 py-0.5 rounded bg-black/40 backdrop-blur-sm border border-white/10">
        <p className="text-xs font-medium text-white truncate">
          {participant.identity} {isLocal && "(You)"}
        </p>
      </div>

      {/* Microphone muted indicator */}
      {!participant.isMicrophoneEnabled && (
        <div className="absolute top-1 left-1 p-1 rounded bg-red-500/40 backdrop-blur-sm border border-red-400/30">
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.participant.identity === nextProps.participant.identity &&
    prevProps.participant.isCameraEnabled === nextProps.participant.isCameraEnabled &&
    prevProps.participant.isMicrophoneEnabled === nextProps.participant.isMicrophoneEnabled &&
    prevProps.participant.isSpeaking === nextProps.participant.isSpeaking &&
    prevProps.trackRef?.publication?.trackSid === nextProps.trackRef?.publication?.trackSid &&
    prevProps.isLocal === nextProps.isLocal
  );
});

export default function CompactParticipantView({ isTutor }: { isTutor?: boolean }) {
  const participants = useParticipants();
  const room = useRoomContext();
  const [position, setPosition] = useState({ x: 24, y: 24 }); // Default: top-left (6 * 4 = 24px)
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
  ]);

  const localParticipant = participants.find((p) => p.isLocal);
  const remoteParticipants = participants.filter((p) => !p.isLocal);

  // Handler to remove a student from the room
  const handleRemoveStudent = (participantIdentity: string) => {
    if (!room || !isTutor) return;
    
    console.log('🚫 Tutor removing student:', participantIdentity);
    
    // Send data message to the student to disconnect
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify({ 
      type: "removeStudent", 
      targetIdentity: participantIdentity,
      reason: "Removed by tutor"
    }));
    
    room.localParticipant.publishData(data, { reliable: true, destinationIdentities: [participantIdentity] });
    
    // Show notification
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

  // Handler to stop a student's screen share
  const handleStopScreenShare = (participantIdentity: string) => {
    if (!room || !isTutor) return;
    
    console.log('🛑 Tutor stopping screen share for:', participantIdentity);
    
    // Send data message to the student to stop screen sharing
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify({ 
      type: "stopScreenShare", 
      targetIdentity: participantIdentity 
    }));
    
    room.localParticipant.publishData(data, { reliable: true, destinationIdentities: [participantIdentity] });
    
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
    notification.textContent = `Stopped screen share for ${participantIdentity}`;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Keep within viewport bounds
      const maxX = window.innerWidth - (containerRef.current?.offsetWidth || 160);
      const maxY = window.innerHeight - (containerRef.current?.offsetHeight || 120);
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed z-50 flex flex-col gap-2 transition-opacity",
        isDragging ? "cursor-grabbing opacity-90" : "cursor-grab"
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Drag handle */}
      <div className="drag-handle absolute -top-8 left-0 right-0 h-8 flex items-center justify-center">
        <div className="px-3 py-1 rounded-t-lg bg-black/30 backdrop-blur-md border border-white/10 border-b-0">
          <GripVertical className="w-4 h-4 text-white/60" />
        </div>
      </div>

      {/* Local participant */}
      {localParticipant && (
        <CompactParticipant
          key={localParticipant.identity}
          participant={localParticipant}
          trackRef={tracks.find(
            (t) => t.participant === localParticipant && t.source === Track.Source.Camera
          )}
          isLocal
          isTutor={isTutor}
        />
      )}

      {/* Remote participants */}
      {remoteParticipants.map((participant) => {
        const trackRef = tracks.find(
          (t) => t.participant === participant && t.source === Track.Source.Camera
        );
        return (
          <CompactParticipant
            key={participant.identity}
            participant={participant}
            trackRef={trackRef}
            isTutor={isTutor}
            onRemoveStudent={isTutor ? handleRemoveStudent : undefined}
            onStopScreenShare={isTutor ? handleStopScreenShare : undefined}
          />
        );
      })}
    </div>
  );
}
