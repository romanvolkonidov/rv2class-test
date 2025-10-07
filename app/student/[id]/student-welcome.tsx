"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCircle, Video, BookOpen, GraduationCap, Sparkles, Mic, MicOff, VideoOff, CheckCircle, XCircle } from "lucide-react";
import { useState, useEffect } from "react";

interface StudentData {
  id: string;
  name: string;
  teacher?: string;
  subjects?: { English?: boolean; IT?: boolean };
  price?: number;
  currency?: string;
}

export default function StudentWelcome({ student }: { student: StudentData }) {
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);
  const [micPermission, setMicPermission] = useState<"granted" | "denied" | "prompt" | "checking">("checking");
  const [videoPermission, setVideoPermission] = useState<"granted" | "denied" | "prompt" | "checking">("checking");
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  const teacherName = student.teacher || "Roman";
  const teacherPath = `/${teacherName.toLowerCase()}`;

  // Check initial permissions
  useEffect(() => {
    checkPermissions();
  }, []);

  // Cleanup streams on unmount
  useEffect(() => {
    return () => {
      if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
      }
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [micStream, videoStream]);

  const checkPermissions = async () => {
    try {
      // Check microphone permission
      if (navigator.permissions) {
        const micPerm = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setMicPermission(micPerm.state);
        
        const cameraPerm = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setVideoPermission(cameraPerm.state);
      } else {
        // Fallback: try to get access to check
        setMicPermission("prompt");
        setVideoPermission("prompt");
      }
    } catch (error) {
      console.error("Error checking permissions:", error);
      setMicPermission("prompt");
      setVideoPermission("prompt");
    }
  };

  const requestMicPermission = async () => {
    try {
      setMicPermission("checking");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStream(stream);
      setMicPermission("granted");
    } catch (error) {
      console.error("Microphone permission denied:", error);
      setMicPermission("denied");
    }
  };

  const requestVideoPermission = async () => {
    try {
      setVideoPermission("checking");
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setVideoStream(stream);
      setVideoPermission("granted");
    } catch (error) {
      console.error("Camera permission denied:", error);
      setVideoPermission("denied");
    }
  };
  
  const getTeacherColor = (teacher?: string) => {
    switch (teacher?.toLowerCase()) {
      case "roman":
        return {
          gradient: "from-blue-500 to-indigo-600",
          accent: "text-blue-600",
          bg: "bg-blue-50 dark:bg-blue-900/20",
          border: "border-blue-200 dark:border-blue-800",
        };
      case "violet":
        return {
          gradient: "from-purple-500 to-pink-600",
          accent: "text-purple-600",
          bg: "bg-purple-50 dark:bg-purple-900/20",
          border: "border-purple-200 dark:border-purple-800",
        };
      default:
        return {
          gradient: "from-blue-500 to-indigo-600",
          accent: "text-blue-600",
          bg: "bg-blue-50 dark:bg-blue-900/20",
          border: "border-blue-200 dark:border-blue-800",
        };
    }
  };

  const colors = getTeacherColor(student.teacher);

  const handleJoinClass = async () => {
    // Check if permissions are granted
    if (micPermission !== "granted" || videoPermission !== "granted") {
      // Scroll to top to show permission toggles
      window.scrollTo({ top: 0, behavior: 'smooth' });
      alert("⚠️ Please enable both Microphone and Camera permissions above before joining the class!");
      return;
    }

    setIsJoining(true);
    
    // Get the room name based on the teacher
    const roomName = teacherName.toLowerCase() === "roman" ? "roman-room" : "violet-room";
    
    // Send join request to get approval
    try {
      const response = await fetch("/api/join-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName: roomName,
          studentName: student.name,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Wait for teacher approval by polling or redirect directly
        // For now, redirect to the room directly (bypass approval)
        const roomUrl = `/room?room=${encodeURIComponent(roomName)}&name=${encodeURIComponent(student.name)}&isTutor=false`;
        router.push(roomUrl);
      } else {
        alert("Failed to join class. Please try again.");
        setIsJoining(false);
      }
    } catch (error) {
      console.error("Error joining class:", error);
      alert("Failed to join class. Please try again.");
      setIsJoining(false);
    }
  };

  const handleHomeworks = () => {
    // Navigate to homework page
    router.push(`/student/${student.id}/homework`);
  };

  const activeSubjects = student.subjects 
    ? Object.entries(student.subjects)
        .filter(([_, isActive]) => isActive)
        .map(([subject]) => subject)
    : [];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col items-center justify-center p-4">
      {/* Permission Toggles - Fixed at top */}
      <div className="w-full max-w-2xl mb-4">
        <Card className="backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 shadow-lg border-2 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Check Permissions Before Joining
                </span>
              </div>
              
              <div className="flex gap-3">
                {/* Microphone Toggle */}
                <Button
                  size="sm"
                  onClick={requestMicPermission}
                  disabled={micPermission === "granted" || micPermission === "checking"}
                  className={`flex items-center gap-2 transition-all ${
                    micPermission === "granted"
                      ? "bg-green-600 hover:bg-green-600 text-white"
                      : micPermission === "denied"
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                  title={
                    micPermission === "granted"
                      ? "Microphone access granted"
                      : micPermission === "denied"
                      ? "Microphone access denied - check browser settings"
                      : "Click to enable microphone"
                  }
                >
                  {micPermission === "granted" ? (
                    <>
                      <Mic className="h-4 w-4" />
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">Mic On</span>
                    </>
                  ) : micPermission === "denied" ? (
                    <>
                      <MicOff className="h-4 w-4" />
                      <XCircle className="h-4 w-4" />
                      <span className="font-medium">Mic Blocked</span>
                    </>
                  ) : micPermission === "checking" ? (
                    <>
                      <Mic className="h-4 w-4 animate-pulse" />
                      <span className="font-medium">Checking...</span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4" />
                      <span className="font-medium">Enable Mic</span>
                    </>
                  )}
                </Button>

                {/* Video Toggle */}
                <Button
                  size="sm"
                  onClick={requestVideoPermission}
                  disabled={videoPermission === "granted" || videoPermission === "checking"}
                  className={`flex items-center gap-2 transition-all ${
                    videoPermission === "granted"
                      ? "bg-green-600 hover:bg-green-600 text-white"
                      : videoPermission === "denied"
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                  title={
                    videoPermission === "granted"
                      ? "Camera access granted"
                      : videoPermission === "denied"
                      ? "Camera access denied - check browser settings"
                      : "Click to enable camera"
                  }
                >
                  {videoPermission === "granted" ? (
                    <>
                      <Video className="h-4 w-4" />
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">Camera On</span>
                    </>
                  ) : videoPermission === "denied" ? (
                    <>
                      <VideoOff className="h-4 w-4" />
                      <XCircle className="h-4 w-4" />
                      <span className="font-medium">Camera Blocked</span>
                    </>
                  ) : videoPermission === "checking" ? (
                    <>
                      <Video className="h-4 w-4 animate-pulse" />
                      <span className="font-medium">Checking...</span>
                    </>
                  ) : (
                    <>
                      <Video className="h-4 w-4" />
                      <span className="font-medium">Enable Camera</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {/* Help text */}
            {(micPermission === "denied" || videoPermission === "denied") && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                  ⚠️ Permission denied. Click the 🔒 lock icon in your browser's address bar to allow access.
                </p>
              </div>
            )}
            {(micPermission === "granted" && videoPermission === "granted") && (
              <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700">
                <p className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  All set! You're ready to join the class.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="max-w-2xl w-full space-y-6">
        {/* Welcome Card */}
        <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 shadow-xl border-2">
          <CardHeader className={`bg-gradient-to-r ${colors.gradient} text-white rounded-t-lg`}>
            <div className="flex items-center gap-3">
              <UserCircle className="h-12 w-12" />
              <div>
                <CardTitle className="text-3xl font-bold">
                  Welcome, {student.name}! 👋
                </CardTitle>
                <CardDescription className="text-blue-100 text-lg mt-1">
                  Your personal learning space
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Student Info */}
            <div className={`rounded-lg p-4 ${colors.bg} ${colors.border} border-2`}>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <GraduationCap className={`h-5 w-5 ${colors.accent}`} />
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Your Teacher:</span>
                  <span className={`font-bold text-lg ${colors.accent}`}>
                    {teacherName}
                  </span>
                </div>
                
                {activeSubjects.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <BookOpen className={`h-5 w-5 ${colors.accent}`} />
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Your Subjects:</span>
                    {activeSubjects.map((subject) => (
                      <span
                        key={subject}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          subject === "English"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                        }`}
                      >
                        {subject}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Motivational Message */}
            <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <Sparkles className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                Ready to learn something amazing today? Your teacher <strong>{teacherName}</strong> is 
                excited to see you in class!
              </p>
            </div>

            {/* Warning Banner if permissions not granted */}
            {(micPermission !== "granted" || videoPermission !== "granted") && (
              <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-lg border-2 border-red-300 dark:border-red-700 animate-pulse">
                <XCircle className="h-6 w-6 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-700 dark:text-red-300 mb-1">
                    ⚠️ Action Required: Enable Permissions First!
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">
                    Please click the <strong>"Enable Mic"</strong> and <strong>"Enable Camera"</strong> buttons 
                    at the top of this page before joining the class. Your teacher needs to see and hear you!
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button
                size="lg"
                className={`w-full h-auto py-4 transition-all shadow-lg ${
                  micPermission === "granted" && videoPermission === "granted"
                    ? `bg-gradient-to-r ${colors.gradient} hover:opacity-90`
                    : 'bg-gray-400 hover:bg-gray-500 cursor-not-allowed'
                }`}
                onClick={handleJoinClass}
                disabled={isJoining || micPermission !== "granted" || videoPermission !== "granted"}
              >
                <Video className="mr-2 h-5 w-5" />
                <div className="flex flex-col items-start">
                  <span className="font-bold text-base">
                    {micPermission === "granted" && videoPermission === "granted" 
                      ? "Join Class" 
                      : "🔒 Enable Permissions First"}
                  </span>
                  <span className="text-xs opacity-90">
                    {micPermission === "granted" && videoPermission === "granted"
                      ? `Connect with ${teacherName}`
                      : "Check permissions above"}
                  </span>
                </div>
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="w-full h-auto py-4 border-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={handleHomeworks}
              >
                <BookOpen className="mr-2 h-5 w-5" />
                <div className="flex flex-col items-start">
                  <span className="font-bold text-base">Homeworks</span>
                  <span className="text-xs opacity-70">View assignments</span>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Info Card */}
        <Card className="backdrop-blur-sm bg-white/70 dark:bg-gray-800/70">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                📌 Bookmark this page for quick access to your classes
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Student ID: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{student.id}</code>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
