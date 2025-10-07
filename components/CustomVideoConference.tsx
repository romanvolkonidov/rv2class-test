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
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    const audioEl = audioRef.current;
    
    if (!trackRef?.publication?.track) return;

    const track = trackRef.publication.track;
    
    if (track.kind === Track.Kind.Video && videoEl) {
      track.attach(videoEl);
    } else if (track.kind === Track.Kind.Audio && audioEl && !isLocal) {
      // CRITICAL: Only attach audio for remote participants to prevent echo
      track.attach(audioEl);
      // Ensure audio element is not muted for remote participants
      audioEl.muted = false;
      audioEl.volume = 1.0;
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
        "relative rounded-xl overflow-hidden transition-all duration-200",
        "bg-black/20 backdrop-blur-md border",
        isSpeaking ? "border-blue-400 ring-2 ring-blue-400/50" : "border-white/10"
      )}
    >
      {/* Video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={cn(
          "w-full h-full object-cover",
          !isCameraEnabled && "hidden",
          isLocal && "scale-x-[-1]"
        )}
      />
      
      {/* Audio */}
      {!isLocal && <audio ref={audioRef} autoPlay />}

      {/* Placeholder when camera is off */}
      {!isCameraEnabled && (
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

      {/* Name overlay - Glass effect */}
      <div className="absolute bottom-2 left-2 px-3 py-1 rounded-lg bg-black/30 backdrop-blur-md border border-white/20">
        <p className="text-sm font-medium text-white">
          {participant.identity} {isLocal && "(You)"}
        </p>
      </div>

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
    <div className="w-full h-full flex bg-transparent p-4 gap-4">
      {/* Main content area */}
      <div className={cn(
        "flex-1 flex",
        screenShareTrack ? "flex-col" : "flex-col"
      )}>
        {/* Screen share view (if active) */}
        {screenShareTrack ? (
          <div className="flex-1">
            <ParticipantView
              participant={screenShareTrack.participant}
              trackRef={screenShareTrack}
            />
          </div>
        ) : (
          /* Participants grid when no screen share */
          <div
            className={cn(
              "grid gap-4 flex-1",
              remoteParticipants.length === 0 && "grid-cols-1",
              remoteParticipants.length === 1 && "grid-cols-2",
              remoteParticipants.length === 2 && "grid-cols-3",
              remoteParticipants.length >= 3 && "grid-cols-4"
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
        )}
      </div>

      {/* Sidebar for participants when screen sharing */}
      {screenShareTrack && (
        <div className="w-80 flex flex-col gap-3 overflow-y-auto">
          <div className="text-sm font-medium text-white/70 px-2">Participants</div>
          
          {/* Local participant */}
          {localParticipant && (
            <div className="h-56 flex-shrink-0">
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

          {/* Remote participants */}
          {remoteParticipants.map((participant) => {
            const trackRef = tracks.find(
              (t) => t.participant === participant && t.source === Track.Source.Camera
            );
            return (
              <div key={participant.identity} className="h-56 flex-shrink-0">
                <ParticipantView
                  participant={participant}
                  trackRef={trackRef}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
