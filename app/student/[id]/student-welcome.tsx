"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCircle, Video, BookOpen, GraduationCap, Sparkles, Mic, MicOff, VideoOff, CheckCircle, XCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import WaitingRoom, { WaitingRoomHandle } from "@/components/WaitingRoom";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

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
  const waitingRoomRef = useRef<WaitingRoomHandle>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [micPermission, setMicPermission] = useState<"granted" | "denied" | "prompt" | "checking">("checking");
  const [videoPermission, setVideoPermission] = useState<"granted" | "denied" | "prompt" | "checking">("checking");
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [shouldPulseMic, setShouldPulseMic] = useState(false);
  const [shouldPulseCamera, setShouldPulseCamera] = useState(false);
  const [hasShownWelcomePopup, setHasShownWelcomePopup] = useState(false);
  const [isWaitingForTeacher, setIsWaitingForTeacher] = useState(false);
  const [joinRequestId, setJoinRequestId] = useState<string | null>(null);

  const teacherName = student.teacher || "Roman";
  const teacherPath = `/${teacherName.toLowerCase()}`;

  // Show welcome popup on FIRST visit ever (using localStorage for persistence)
  useEffect(() => {
    const hasSeenPopup = localStorage.getItem(`welcome-popup-${student.id}`);
    if (!hasSeenPopup) {
      setTimeout(() => {
        const isAndroid = /android/i.test(navigator.userAgent);
        
        if (isAndroid) {
          alert("🎓 Добро пожаловать на урок!\n\n" +
                "Для подключения нужно разрешить доступ:\n" +
                "📹 К камере\n" +
                "🎤 К микрофону\n\n" +
                "⚠️ На Android оба разрешения запрашиваются вместе.\n" +
                "Когда браузер спросит - нажмите 'Разрешить' для обоих.");
        } else {
          alert("🎓 Добро пожаловать на урок!\n\n" +
                "Для подключения к уроку нужно разрешить доступ:\n" +
                "📹 К камере\n" +
                "🎤 К микрофону\n\n" +
                "Когда браузер спросит разрешение - нажмите 'Разрешить'.");
        }
        
        localStorage.setItem(`welcome-popup-${student.id}`, 'true');
        setHasShownWelcomePopup(true);
      }, 500);
    } else {
      setHasShownWelcomePopup(true);
    }
  }, [student.id]);

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

  // Listen for join request approval/denial
  useEffect(() => {
    if (!joinRequestId) return;

    console.log("👂 Listening for join request status:", joinRequestId);
    
    const unsubscribe = onSnapshot(
      doc(db, "joinRequests", joinRequestId),
      (docSnapshot) => {
        if (!docSnapshot.exists()) {
          console.log("❌ Join request document not found");
          return;
        }

        const data = docSnapshot.data();
        console.log("📄 Join request status:", data.status);

        if (data.status === "approved") {
          console.log("✅ Join request approved! Redirecting to room...");
          const roomName = teacherName.toLowerCase() === "roman" ? "roman-room" : "violet-room";
          const roomUrl = `/room?room=${encodeURIComponent(roomName)}&name=${encodeURIComponent(student.name)}&isTutor=false`;
          router.push(roomUrl);
        } else if (data.status === "denied") {
          console.log("❌ Join request denied");
          alert("😔 Учитель отклонил ваш запрос на подключение.\n\nПожалуйста, свяжитесь с учителем или попробуйте позже.");
          setIsWaitingForTeacher(false);
          setIsJoining(false);
          setJoinRequestId(null);
        }
      },
      (error) => {
        console.error("Error listening to join request:", error);
      }
    );

    return () => {
      console.log("🔇 Unsubscribing from join request listener");
      unsubscribe();
    };
  }, [joinRequestId, teacherName, student.name, router]);

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
      
      // ANDROID FIX: Request both audio AND video together
      // Android Chrome requires both in one call to show proper permission UI
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
        video: videoPermission !== "granted" ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        } : false // Don't request video if already granted
      });
      
      // Separate audio and video tracks
      const audioTracks = stream.getAudioTracks();
      const videoTracks = stream.getVideoTracks();
      
      if (audioTracks.length > 0) {
        const audioStream = new MediaStream(audioTracks);
        setMicStream(audioStream);
        setMicPermission("granted");
      }
      
      if (videoTracks.length > 0 && videoPermission !== "granted") {
        const videoStream = new MediaStream(videoTracks);
        setVideoStream(videoStream);
        setVideoPermission("granted");
      }
    } catch (error) {
      console.error("Microphone permission denied:", error);
      setMicPermission("denied");
      
      // Detect if on Android
      const isAndroid = /android/i.test(navigator.userAgent);
      
      // Show helpful alert in Russian
      setTimeout(() => {
        if (isAndroid) {
          alert("🎤 Доступ к микрофону заблокирован!\n\n" +
                "На Android:\n" +
                "1. Нажмите на 🔒 рядом с адресом сайта\n" +
                "2. Нажмите 'Разрешения' или 'Permissions'\n" +
                "3. Включите 'Микрофон' и 'Камера'\n" +
                "4. Обновите страницу");
        } else {
          alert("🎤 Доступ к микрофону заблокирован!\n\n" +
                "Чтобы включить:\n" +
                "1. Нажмите на иконку 🔒 замка в адресной строке браузера\n" +
                "2. Найдите 'Микрофон' в списке разрешений\n" +
                "3. Выберите 'Разрешить'\n" +
                "4. Обновите страницу (F5) и попробуйте снова");
        }
      }, 500);
    }
  };

  const requestVideoPermission = async () => {
    try {
      setVideoPermission("checking");
      
      // ANDROID FIX: Request both audio AND video together
      // Android Chrome requires both in one call to show proper permission UI
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: micPermission !== "granted" ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        } : false // Don't request audio if already granted
      });
      
      // Separate audio and video tracks
      const audioTracks = stream.getAudioTracks();
      const videoTracks = stream.getVideoTracks();
      
      if (videoTracks.length > 0) {
        const videoStream = new MediaStream(videoTracks);
        setVideoStream(videoStream);
        setVideoPermission("granted");
      }
      
      if (audioTracks.length > 0 && micPermission !== "granted") {
        const audioStream = new MediaStream(audioTracks);
        setMicStream(audioStream);
        setMicPermission("granted");
      }
    } catch (error) {
      console.error("Camera permission denied:", error);
      setVideoPermission("denied");
      
      // Detect if on Android
      const isAndroid = /android/i.test(navigator.userAgent);
      
      // Show helpful alert in Russian
      setTimeout(() => {
        if (isAndroid) {
          alert("📹 Доступ к камере заблокирован!\n\n" +
                "На Android:\n" +
                "1. Нажмите на 🔒 рядом с адресом сайта\n" +
                "2. Нажмите 'Разрешения' или 'Permissions'\n" +
                "3. Включите 'Камера' и 'Микрофон'\n" +
                "4. Обновите страницу");
        } else {
          alert("📹 Доступ к камере заблокирован!\n\n" +
                "Чтобы включить:\n" +
                "1. Нажмите на иконку 🔒 замка в адресной строке браузера\n" +
                "2. Найдите 'Камера' в списке разрешений\n" +
                "3. Выберите 'Разрешить'\n" +
                "4. Обновите страницу (F5) и попробуйте снова");
        }
      }, 500);
    }
  };
  
  const getTeacherColor = (teacher?: string) => {
    switch (teacher?.toLowerCase()) {
      case "roman":
        return {
          gradient: "from-blue-500/90 via-blue-600/90 to-cyan-600/90",
          accent: "text-blue-500",
          bg: "bg-blue-50 dark:bg-blue-900/20",
          border: "border-blue-200 dark:border-blue-800",
        };
      case "violet":
        return {
          gradient: "from-purple-500/90 via-violet-600/90 to-fuchsia-600/90",
          accent: "text-purple-500",
          bg: "bg-purple-50 dark:bg-purple-900/20",
          border: "border-purple-200 dark:border-purple-800",
        };
      default:
        return {
          gradient: "from-blue-500/90 via-blue-600/90 to-cyan-600/90",
          accent: "text-blue-500",
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
      
      // Pulse the buttons that need attention
      if (micPermission !== "granted") {
        setShouldPulseMic(true);
        setTimeout(() => setShouldPulseMic(false), 2000);
      }
      if (videoPermission !== "granted") {
        setShouldPulseCamera(true);
        setTimeout(() => setShouldPulseCamera(false), 2000);
      }
      
      return;
    }

    setIsJoining(true);
    setIsWaitingForTeacher(true);
    
    // CRITICAL: Stop all preview streams before joining to prevent echo
    // The room will request fresh streams with proper settings
    console.log("🛑 Stopping preview streams to prevent echo...");
    
    // Stop WaitingRoom preview stream
    if (waitingRoomRef.current) {
      console.log("🛑 Stopping WaitingRoom preview via ref...");
      waitingRoomRef.current.stopPreview();
    }
    
    // Stop local preview streams
    if (micStream) {
      micStream.getTracks().forEach(track => {
        track.stop();
        console.log("🎤 Stopped microphone preview track");
      });
      setMicStream(null);
    }
    if (videoStream) {
      videoStream.getTracks().forEach(track => {
        track.stop();
        console.log("📹 Stopped camera preview track");
      });
      setVideoStream(null);
    }
    
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
        console.log("📝 Join request created:", data.requestId);
        // Store the request ID to start listening for approval
        setJoinRequestId(data.requestId);
        // The useEffect hook will now listen for status changes
      } else {
        alert("Не удалось подключиться к уроку. Попробуйте снова.");
        setIsJoining(false);
        setIsWaitingForTeacher(false);
      }
    } catch (error) {
      console.error("Error joining class:", error);
      alert("Не удалось подключиться к уроку. Попробуйте снова.");
      setIsJoining(false);
      setIsWaitingForTeacher(false);
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

  // Show waiting room if waiting for teacher
  if (isWaitingForTeacher) {
    return (
      <WaitingRoom 
        ref={waitingRoomRef}
        studentName={student.name}
        teacherName={teacherName}
      />
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements - Apple-style subtle orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-cyan-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-indigo-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Permission Toggles - Fixed at top with refined glass effect */}
      <div className="w-full max-w-2xl mb-6 relative z-10">
        <div className="backdrop-blur-2xl bg-white/60 border border-gray-200/50 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-lg shadow-blue-500/50"></div>
              <span className="text-sm font-medium text-gray-700">
                Проверьте разрешения перед подключением
              </span>
            </div>
            
            <div className="flex gap-3 items-center flex-wrap">
              {/* Microphone Toggle */}
              <Button
                size="sm"
                onClick={requestMicPermission}
                disabled={micPermission === "granted" || micPermission === "checking"}
                className={`flex items-center gap-2 transition-all duration-300 backdrop-blur-xl border min-h-[44px] touch-manipulation active:scale-95 select-none ${
                  shouldPulseMic ? 'animate-pulse ring-4 ring-blue-400/40' : ''
                } ${
                  micPermission === "granted"
                    ? "bg-green-500 hover:bg-green-600 border-green-600 text-white cursor-default shadow-lg shadow-green-500/30"
                    : micPermission === "denied"
                    ? "bg-orange-500/90 hover:bg-orange-500 border-orange-500 text-white cursor-pointer shadow-lg shadow-orange-500/20"
                    : "bg-blue-500/90 hover:bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/20"
                }`}
                title={
                  micPermission === "granted"
                    ? "Доступ к микрофону разрешён ✓"
                    : micPermission === "denied"
                    ? "Нажмите для инструкций по включению микрофона"
                    : "Нажмите чтобы разрешить микрофон"
                }
              >
                {micPermission === "granted" ? (
                  <>
                    <Mic className="h-4 w-4" />
                    <CheckCircle className="h-4 w-4 text-green-300" />
                    <span className="font-semibold">Микрофон ✓</span>
                  </>
                ) : micPermission === "denied" ? (
                  <>
                    <MicOff className="h-4 w-4" />
                    <span className="font-medium">Включить микрофон</span>
                  </>
                ) : micPermission === "checking" ? (
                  <>
                    <Mic className="h-4 w-4 animate-pulse" />
                    <span className="font-medium">Проверяем...</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4" />
                    <span className="font-medium">Разрешить микрофон</span>
                  </>
                )}
              </Button>

              {/* Video Toggle */}
              <Button
                size="sm"
                onClick={requestVideoPermission}
                disabled={videoPermission === "granted" || videoPermission === "checking"}
                className={`flex items-center gap-2 transition-all duration-300 backdrop-blur-xl border min-h-[44px] touch-manipulation active:scale-95 select-none ${
                  shouldPulseCamera ? 'animate-pulse ring-4 ring-blue-400/40' : ''
                } ${
                  videoPermission === "granted"
                    ? "bg-green-500 hover:bg-green-600 border-green-600 text-white cursor-default shadow-lg shadow-green-500/30"
                    : videoPermission === "denied"
                    ? "bg-orange-500/90 hover:bg-orange-500 border-orange-500 text-white cursor-pointer shadow-lg shadow-orange-500/20"
                    : "bg-blue-500/90 hover:bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/20"
                }`}
                title={
                  videoPermission === "granted"
                    ? "Доступ к камере разрешён ✓"
                    : videoPermission === "denied"
                    ? "Нажмите для инструкций по включению камеры"
                    : "Нажмите чтобы разрешить камеру"
                }
              >
                {videoPermission === "granted" ? (
                  <>
                    <Video className="h-4 w-4" />
                    <CheckCircle className="h-4 w-4 text-green-300" />
                    <span className="font-semibold">Камера ✓</span>
                  </>
                ) : videoPermission === "denied" ? (
                  <>
                    <VideoOff className="h-4 w-4" />
                    <span className="font-medium">Включить камеру</span>
                  </>
                ) : videoPermission === "checking" ? (
                  <>
                    <Video className="h-4 w-4 animate-pulse" />
                    <span className="font-medium">Проверяем...</span>
                  </>
                ) : (
                  <>
                    <Video className="h-4 w-4" />
                    <span className="font-medium">Разрешить камеру</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl w-full space-y-6 relative z-10">
        {/* Welcome Card - Apple-style refined glass */}
        <div className="backdrop-blur-2xl bg-white/60 border border-gray-200/50 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] overflow-hidden">
          <div className={`bg-gradient-to-r ${colors.gradient} p-8`}>
            <div className="flex items-center gap-4">
              <div className="backdrop-blur-xl bg-white/20 p-3 rounded-2xl border border-white/30">
                <UserCircle className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-white tracking-tight">
                  Добро пожаловать, {student.name}! 👋
                </h1>
                <p className="text-white/90 text-base mt-1">
                  Твоё личное учебное пространство
                </p>
              </div>
            </div>
          </div>
          <div className="p-8 space-y-6">
            {/* Student Info */}
            <div className="backdrop-blur-xl bg-white/40 border border-gray-200/50 rounded-2xl p-5">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="backdrop-blur-xl bg-blue-500/15 p-2 rounded-xl border border-blue-400/30">
                    <GraduationCap className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="font-medium text-gray-600">Твой учитель:</span>
                  <span className="font-semibold text-lg text-gray-900">
                    {teacherName}
                  </span>
                </div>
                
                {activeSubjects.length > 0 && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="backdrop-blur-xl bg-blue-500/15 p-2 rounded-xl border border-blue-400/30">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-600">Твои предметы:</span>
                    {activeSubjects.map((subject) => (
                      <span
                        key={subject}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium backdrop-blur-xl border ${
                          subject === "English"
                            ? "bg-green-500/20 text-green-700 border-green-400/30"
                            : "bg-blue-500/20 text-blue-700 border-blue-400/30"
                        }`}
                      >
                        {subject}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons - Apple-style spacing and refinement */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <Button
                size="lg"
                className={`w-full h-auto py-5 min-h-[64px] bg-gradient-to-r ${colors.gradient} hover:scale-105 hover:shadow-2xl active:scale-100 transition-all duration-300 shadow-xl border border-white/20 backdrop-blur-xl font-medium group touch-manipulation select-none`}
                onClick={handleJoinClass}
                disabled={isJoining}
              >
                <div className="flex items-center gap-3">
                  <div className="backdrop-blur-xl bg-white/10 p-2 rounded-xl group-hover:bg-white/20 transition-all duration-300">
                    <Video className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-semibold text-base">Войти на урок</span>
                    <span className="text-xs opacity-80">Подключиться к {teacherName}</span>
                  </div>
                </div>
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="w-full h-auto py-5 min-h-[64px] backdrop-blur-xl bg-white/40 border border-gray-200/50 hover:bg-white/60 text-gray-700 transition-all duration-300 shadow-xl font-medium touch-manipulation active:scale-95 select-none"
                onClick={handleHomeworks}
              >
                <div className="flex items-center gap-3">
                  <div className="backdrop-blur-xl bg-blue-500/15 p-2 rounded-xl border border-blue-400/30">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-semibold text-base">Домашние задания</span>
                    <span className="text-xs opacity-70">Посмотреть задания</span>
                  </div>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
