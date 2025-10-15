"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle, ExternalLink } from "lucide-react";

interface BBBRoomProps {
  meetingID: string;
  participantName: string;
  isTutor: boolean;
  studentId?: string;
  onLeave?: () => void;
}

/**
 * BigBlueButton Room Component
 * Embeds BBB meeting in an iframe
 */
export default function BBBRoom({
  meetingID,
  participantName,
  isTutor,
  studentId,
  onLeave,
}: BBBRoomProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const fetchJoinUrl = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/bbb-join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName: meetingID,
            participantName,
            isTutor,
            studentId,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to join meeting');
        }

        const data = await response.json();
        setJoinUrl(data.joinUrl);
      } catch (err: any) {
        console.error('Error joining BBB meeting:', err);
        setError(err.message || 'Failed to join meeting');
      } finally {
        setLoading(false);
      }
    };

    fetchJoinUrl();
  }, [meetingID, participantName, isTutor, studentId]);

  // Listen for BBB window close/leave events
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // BBB sends messages when user leaves
      if (event.data && typeof event.data === 'object') {
        if (event.data.response === 'loggedOut' || 
            event.data.response === 'endMeeting' ||
            event.data === 'userLeftMeeting') {
          console.log('BBB: User left meeting');
          if (onLeave) {
            onLeave();
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onLeave]);

  // Handle iframe load
  const handleIframeLoad = () => {
    console.log('BBB iframe loaded successfully');
  };

  // Handle leaving the meeting
  const handleLeave = async () => {
    if (isTutor) {
      // Ask tutor if they want to end the meeting for everyone
      const endForAll = window.confirm(
        'Do you want to end the meeting for all participants?'
      );

      if (endForAll) {
        try {
          await fetch('/api/bbb-end', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ meetingID }),
          });
        } catch (err) {
          console.error('Error ending meeting:', err);
        }
      }
    }

    if (onLeave) {
      onLeave();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Joining Meeting...
            </h2>
            <p className="text-gray-600 text-center">
              Connecting to BigBlueButton
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-red-50 to-pink-100">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <AlertCircle className="w-12 h-12 text-red-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Connection Error
            </h2>
            <p className="text-gray-600 text-center mb-4">{error}</p>
            <div className="flex gap-2">
              <Button
                onClick={() => window.location.reload()}
                variant="default"
              >
                Retry
              </Button>
              {onLeave && (
                <Button onClick={onLeave} variant="outline">
                  Go Back
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!joinUrl) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Unable to generate join URL</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-black">
      {/* BBB Iframe */}
      <iframe
        ref={iframeRef}
        src={joinUrl}
        onLoad={handleIframeLoad}
        className="w-full h-full border-0"
        allow="camera; microphone; fullscreen; speaker; display-capture"
        title="BigBlueButton Meeting"
      />
    </div>
  );
}
