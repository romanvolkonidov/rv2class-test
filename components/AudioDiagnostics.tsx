"use client";

import { useEffect, useState } from "react";
import { useParticipants, useRoomContext } from "@livekit/components-react";
import { Track } from "livekit-client";

/**
 * Audio Diagnostics Panel - Shows real-time audio status for all participants
 * Helps troubleshoot "no audio" issues
 */
export default function AudioDiagnostics() {
  const room = useRoomContext();
  const participants = useParticipants();
  const [isVisible, setIsVisible] = useState(false);

  // Toggle with Ctrl+Shift+A
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        setIsVisible((v) => !v);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="px-3 py-2 bg-blue-500 text-white text-xs rounded-lg shadow-lg hover:bg-blue-600"
          title="Show Audio Diagnostics (Ctrl+Shift+A)"
        >
          🔊 Audio Debug
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black/90 text-white p-4 rounded-lg shadow-2xl max-w-md backdrop-blur-md border border-white/20">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold">🔊 Audio Diagnostics</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-white/60 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2 text-xs">
        <div className="border-b border-white/20 pb-2">
          <div className="font-semibold text-green-400">Room Status</div>
          <div>State: {room.state}</div>
          <div>Participants: {participants.length}</div>
        </div>

        {participants.map((participant) => {
          const audioTrack = participant.getTrackPublication(Track.Source.Microphone);
          const hasAudio = !!audioTrack;
          const isAudioMuted = audioTrack?.isMuted ?? true;
          const isAudioEnabled = audioTrack?.track ? !audioTrack.track.isMuted : false;

          return (
            <div
              key={participant.identity}
              className="border border-white/10 rounded p-2 space-y-1"
            >
              <div className="font-semibold flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    hasAudio && !isAudioMuted ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                {participant.identity}
                {participant.isLocal && " (You)"}
              </div>

              <div className="pl-4 space-y-0.5 text-white/70">
                <div>
                  Audio Published:{" "}
                  {hasAudio ? (
                    <span className="text-green-400">✓ Yes</span>
                  ) : (
                    <span className="text-red-400">✗ No</span>
                  )}
                </div>
                {hasAudio && (
                  <>
                    <div>
                      Muted:{" "}
                      {isAudioMuted ? (
                        <span className="text-yellow-400">Yes</span>
                      ) : (
                        <span className="text-green-400">No</span>
                      )}
                    </div>
                    <div>
                      Track Enabled:{" "}
                      {isAudioEnabled ? (
                        <span className="text-green-400">Yes</span>
                      ) : (
                        <span className="text-red-400">No</span>
                      )}
                    </div>
                    <div className="text-white/50 text-[10px]">
                      SID: {audioTrack?.trackSid}
                    </div>
                  </>
                )}
                <div>
                  Camera:{" "}
                  {participant.isCameraEnabled ? (
                    <span className="text-green-400">✓</span>
                  ) : (
                    <span className="text-white/40">✗</span>
                  )}
                </div>
                <div>
                  Speaking:{" "}
                  {participant.isSpeaking ? (
                    <span className="text-green-400">🎤 YES</span>
                  ) : (
                    <span className="text-white/40">—</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-white/20 text-[10px] text-white/50">
        Press Ctrl+Shift+A to toggle
      </div>
    </div>
  );
}
