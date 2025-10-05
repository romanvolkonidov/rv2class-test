"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Video, Users, MonitorPlay } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [tutorName, setTutorName] = useState("");
  const [sessionCode, setSessionCode] = useState("");
  const [studentName, setStudentName] = useState("");
  const [loading, setLoading] = useState(false);

  const createSession = async () => {
    if (!tutorName.trim()) {
      alert("Please enter your name");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tutorName }),
      });

      const data = await res.json();
      router.push(`/room?room=${data.roomName}&name=${tutorName}&isTutor=true&code=${data.sessionCode}`);
    } catch (error) {
      console.error("Error creating session:", error);
      alert("Failed to create session");
    } finally {
      setLoading(false);
    }
  };

  const joinSession = async () => {
    if (!studentName.trim() || !sessionCode.trim()) {
      alert("Please enter your name and session code");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/session?code=${sessionCode}`);
      const data = await res.json();

      if (data.found) {
        router.push(`/room?room=${data.roomName}&name=${studentName}&isTutor=false`);
      } else {
        alert("Session not found");
      }
    } catch (error) {
      console.error("Error joining session:", error);
      alert("Failed to join session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            RV2Class
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Professional English Tutoring Platform
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Tutor Card */}
          <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-6 w-6 text-blue-600" />
                Start as Tutor
              </CardTitle>
              <CardDescription>
                Create a new tutoring session and share the code with your student
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Your Name</label>
                <Input
                  placeholder="Enter your name"
                  value={tutorName}
                  onChange={(e) => setTutorName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && createSession()}
                />
              </div>
              <Button
                onClick={createSession}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                Create Session
              </Button>
              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <MonitorPlay className="h-4 w-4" />
                  Screen sharing with audio
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Users className="h-4 w-4" />
                  Collaborative whiteboard
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Student Card */}
          <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-6 w-6 text-green-600" />
                Join as Student
              </CardTitle>
              <CardDescription>
                Enter the session code provided by your tutor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Your Name</label>
                <Input
                  placeholder="Enter your name"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Session Code</label>
                <Input
                  placeholder="Enter 6-digit code"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && joinSession()}
                  maxLength={6}
                />
              </div>
              <Button
                onClick={joinSession}
                disabled={loading}
                className="w-full"
                variant="secondary"
                size="lg"
              >
                Join Session
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Powered by LiveKit • Secure real-time communication</p>
        </div>
      </div>
    </main>
  );
}
