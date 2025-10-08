"use client";

import { useEffect, useRef, memo, useState } from "react";
import { useTracks, useParticipants, TrackReferenceOrPlaceholder, useRoomContext } from "@livekit/components-react";
import { Track, Participant } from "livekit-client";
import { cn } from "@/lib/utils";
import { GripVertical, UserX, MonitorX, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ParticipantView } from "@/components/DraggableThumbnails";

interface CompactParticipantProps {
  participant: Participant;
  trackRef?: TrackReferenceOrPlaceholder;
  isLocal?: boolean;
  isTutor?: boolean;
  onRemoveStudent?: (participantIdentity: string) => void;
  onStopScreenShare?: (participantIdentity: string) => void;
}

// Use the same ParticipantView component as screen share thumbnails
const CompactParticipant = memo(function CompactParticipant({ 
  participant, 
  trackRef, 
  isLocal, 
  isTutor, 
  onRemoveStudent, 
  onStopScreenShare 
}: CompactParticipantProps) {
  const [showControls, setShowControls] = useState(false);

  // Check if participant has screen share
  const hasScreenShare = participant.getTrackPublications().some(
    (pub) => pub.source === Track.Source.ScreenShare
  );

  return (
    <div
      className="relative"
      onMouseEnter={() => isTutor && !isLocal && setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Use the same ParticipantView component as screen share thumbnails */}
      <ParticipantView
        participant={participant}
        trackRef={trackRef}
        isLocal={isLocal}
        isTutor={isTutor}
        isThumbnail={true}
      />

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
    // Make entire container draggable, except when clicking on control buttons
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="button"]')) {
      return; // Don't drag when clicking buttons
    }
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
    e.preventDefault();
    e.stopPropagation();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // Make entire container draggable on touch
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="button"]')) {
      return; // Don't drag when touching buttons
    }
    
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    });
    e.stopPropagation();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
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

  const handleTouchMove = (e: TouchEvent) => {
    if (isDragging) {
      e.preventDefault(); // Prevent scrolling while dragging
      const touch = e.touches[0];
      const newX = touch.clientX - dragStart.x;
      const newY = touch.clientY - dragStart.y;
      
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

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      window.addEventListener('touchcancel', handleTouchEnd);
      window.addEventListener('touchcancel', handleTouchEnd);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
        window.removeEventListener('touchcancel', handleTouchEnd);
      };
    }
  }, [isDragging, dragStart]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed z-50 flex flex-col gap-2 touch-manipulation select-none",
        isDragging ? "cursor-grabbing opacity-90 scale-105" : "cursor-grab hover:opacity-100",
        "transition-all duration-150"
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: 'none', // Prevent default touch behaviors
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Drag handle - visual indicator */}
      <div className="absolute -top-8 left-0 right-0 h-8 flex items-center justify-center pointer-events-none">
        <div className="px-3 py-1 rounded-t-lg bg-black/30 backdrop-blur-md border border-white/10 border-b-0">
          <div className="flex items-center gap-1.5">
            <GripVertical className="w-4 h-4 text-white/60" />
            <span className="text-xs text-white/70 font-medium">Drag anywhere</span>
          </div>
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
