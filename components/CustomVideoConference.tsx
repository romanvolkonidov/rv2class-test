"use client";

import { useEffect, useRef, memo } from "react";
import {
  useTracks,
  useParticipants,
  TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { Track, Participant, RemoteParticipant } from "livekit-client";
import { cn } from "@/lib/utils";

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
      {/* Screen share view (if active) - FULL SCREEN */}
      {screenShareTrack ? (
        <>
          {/* Full screen share - uses entire viewport, control bar auto-hides */}
          <div 
            className="absolute inset-0 bg-black flex items-center justify-center"
          >
            <div className="w-full h-full">
              <ParticipantView
                participant={screenShareTrack.participant}
                trackRef={screenShareTrack}
              />
            </div>
          </div>

          {/* Floating draggable thumbnails at top */}
          <div className="absolute top-2 md:top-4 left-2 md:left-4 right-2 md:right-4 z-10 flex gap-2 md:gap-3 pointer-events-none">
            <div className="flex gap-2 md:gap-3 pointer-events-auto overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2">
              {/* Local participant thumbnail */}
              {localParticipant && (
                <div 
                  className="w-32 h-24 md:w-48 md:h-36 flex-shrink-0 cursor-move hover:scale-105 transition-transform touch-manipulation snap-start" 
                  draggable
                >
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
                    className="w-32 h-24 md:w-48 md:h-36 flex-shrink-0 cursor-move hover:scale-105 transition-transform touch-manipulation snap-start" 
                    draggable
                  >
                    <ParticipantView
                      participant={participant}
                      trackRef={trackRef}
                    />
                  </div>
                );
              })}
            </div>
          </div>
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
    </div>
  );
}
