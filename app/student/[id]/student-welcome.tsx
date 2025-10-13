"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCircle, Video, BookOpen, GraduationCap, Sparkles, Mic, MicOff, VideoOff, CheckCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import WaitingRoom, { WaitingRoomHandle } from "@/components/WaitingRoom";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, getDoc } from "firebase/firestore";

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
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        
        if (isIOS) {
          alert("🎓 Добро пожаловать на урок!\n\n" +
                "Для подключения нужно разрешить доступ:\n" +
                "📹 К камере\n" +
                "🎤 К микрофону\n\n" +
                "⚠️ На iPhone/iPad оба разрешения запрашиваются вместе.\n" +
                "Когда Safari спросит - нажмите 'Разрешить' для обоих.\n\n" +
                "Если не работает - проверьте Настройки → Safari → Камера/Микрофон");
        } else if (isAndroid) {
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
      async (docSnapshot) => {
        if (!docSnapshot.exists()) {
          console.log("❌ Join request document not found");
          return;
        }

        const data = docSnapshot.data();
        console.log("📄 Join request status:", data.status);

        if (data.status === "approved") {
          console.log("✅ Join request approved! Redirecting to room...");
          
          // Fetch the active session to get the room name and session code
          const teacherKey = teacherName.toLowerCase();
          try {
            const sessionDoc = await getDoc(doc(db, "activeSessions", teacherKey));
            
            if (sessionDoc.exists() && sessionDoc.data().isActive) {
              const sessionData = sessionDoc.data();
              const roomUrl = `/room?room=${encodeURIComponent(sessionData.roomName)}&name=${encodeURIComponent(student.name)}&isTutor=false&sessionCode=${sessionData.sessionCode}`;
              console.log("🚀 Joining room:", roomUrl);
              router.push(roomUrl);
            } else {
              alert("Урок завершился. Попробуйте позже.");
              setIsWaitingForTeacher(false);
              setIsJoining(false);
              setJoinRequestId(null);
            }
          } catch (error) {
            console.error("Error fetching session:", error);
            alert("Не удалось подключиться к уроку.");
            setIsWaitingForTeacher(false);
            setIsJoining(false);
            setJoinRequestId(null);
          }
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
      // Safari (especially iOS) doesn't support navigator.permissions.query()
      // Check if API is available before using
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const micPerm = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          setMicPermission(micPerm.state);
          
          const cameraPerm = await navigator.permissions.query({ name: 'camera' as PermissionName });
          setVideoPermission(cameraPerm.state);
        } catch (permError) {
          // Safari might throw error even if API exists
          console.log('⚠️ Permissions API not fully supported (likely Safari), using fallback');
          setMicPermission("prompt");
          setVideoPermission("prompt");
        }
      } else {
        // Fallback for Safari iOS and older browsers
        console.log('⚠️ Permissions API not available (Safari iOS?), using fallback');
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
      
      // Detect browser type
      const isAndroid = /android/i.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      // ANDROID/iOS FIX: Request both audio AND video together
      // Both Android Chrome and iOS Safari require both in one call
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Safari iOS doesn't support sampleRate constraint
          ...(!(isSafari || isIOS) && { sampleRate: 48000 })
        },
        video: videoPermission !== "granted" ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        } : false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
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
      
      // Detect browser
      const isAndroid = /android/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      // Show helpful alert in Russian
      setTimeout(() => {
        if (isIOS) {
          alert("🎤 Доступ к микрофону заблокирован!\n\n" +
                "На iPhone/iPad:\n" +
                "1. Откройте Настройки iOS\n" +
                "2. Прокрутите вниз до Safari\n" +
                "3. Найдите 'Камера' и 'Микрофон'\n" +
                "4. Выберите 'Разрешить'\n" +
                "5. Закройте и заново откройте Safari");
        } else if (isAndroid) {
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
      
      // Detect browser type
      const isAndroid = /android/i.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      // ANDROID/iOS FIX: Request both audio AND video together
      // Both Android Chrome and iOS Safari require both in one call
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: micPermission !== "granted" ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Safari iOS doesn't support sampleRate constraint
          ...(!(isSafari || isIOS) && { sampleRate: 48000 })
        } : false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
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
      
      // Detect browser
      const isAndroid = /android/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      // Show helpful alert in Russian
      setTimeout(() => {
        if (isIOS) {
          alert("📹 Доступ к камере заблокирован!\n\n" +
                "На iPhone/iPad:\n" +
                "1. Откройте Настройки iOS\n" +
                "2. Прокрутите вниз до Safari\n" +
                "3. Найдите 'Камера' и 'Микрофон'\n" +
                "4. Выберите 'Разрешить'\n" +
                "5. Закройте и заново откройте Safari");
        } else if (isAndroid) {
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
    
    // CRITICAL: Stop all preview streams before joining to prevent echo and camera lock
    // The room will request fresh streams with proper settings
    console.log("🛑 Stopping preview streams to prevent echo and camera lock...");
    
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
    
    // CRITICAL: Extra safety - stop ALL active media tracks system-wide
    // This ensures no track is holding the camera when room tries to use it
    try {
      const allTracks = await navigator.mediaDevices.enumerateDevices();
      console.log("🔍 Found devices:", allTracks.length);
      
      // Small delay to ensure all stops are processed
      await new Promise(resolve => setTimeout(resolve, 300));
      console.log("✅ All preview tracks released, ready to join room");
    } catch (err) {
      console.warn("⚠️ Error during device enumeration:", err);
    }
    
    // Fetch the active session code for this teacher from Firestore
    const teacherKey = teacherName.toLowerCase();
    let sessionCode = "";
    let roomName = "";
    
    try {
      const sessionDoc = await getDoc(doc(db, "activeSessions", teacherKey));
      
      if (sessionDoc.exists() && sessionDoc.data().isActive) {
        const sessionData = sessionDoc.data();
        sessionCode = sessionData.sessionCode;
        roomName = sessionData.roomName;
        console.log(`✅ Found active session for ${teacherName}: ${sessionCode}`);
        
        // Verify the room actually exists on LiveKit server
        console.log(`🔍 Checking if room ${roomName} exists on LiveKit...`);
        const roomCheckResponse = await fetch("/api/check-room", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomName }),
        });
        
        if (roomCheckResponse.ok) {
          const roomStatus = await roomCheckResponse.json();
          
          if (!roomStatus.exists) {
            console.log(`❌ Room ${roomName} doesn't exist on LiveKit server`);
            alert(`${teacherName} еще не начал урок или урок уже завершился.\n\nПопробуйте позже.`);
            setIsJoining(false);
            setIsWaitingForTeacher(false);
            return;
          }
          
          console.log(`✅ Room ${roomName} exists with ${roomStatus.numParticipants} participants`);
        } else {
          console.warn("⚠️ Failed to check room status, proceeding anyway...");
        }
      } else {
        // No active session - teacher hasn't started yet
        alert(`${teacherName} еще не начал урок. Попробуйте позже.`);
        setIsJoining(false);
        setIsWaitingForTeacher(false);
        return;
      }
    } catch (error) {
      console.error("Error fetching active session:", error);
      alert("Не удалось подключиться к уроку. Попробуйте снова.");
      setIsJoining(false);
      setIsWaitingForTeacher(false);
      return;
    }
    
    // Send join request to get approval
    try {
      const response = await fetch("/api/join-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName: roomName,
          studentName: student.name,
          sessionCode: sessionCode, // Include session code
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

      <div className="max-w-2xl w-full space-y-6 relative z-10">
        {/* Welcome Card - Apple-style refined glass */}
        <div className="glass-panel rounded-3xl overflow-hidden">
          <div className={`bg-gradient-to-r ${colors.gradient} p-8`}>
            <div className="flex items-center gap-4">
              <div className="glass-surface-dark p-3 rounded-2xl">
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
            {/* Student Info with Homework Button */}
            <div className="glass-surface rounded-2xl p-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="glass-accent-blue p-2 rounded-xl">
                      <GraduationCap className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-600">Твой учитель:</span>
                    <span className="font-semibold text-lg text-gray-900">
                      {teacherName}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transition-all duration-300 shadow-lg hover:shadow-xl font-semibold touch-manipulation active:scale-95 select-none h-10 px-4 border-0"
                    onClick={handleHomeworks}
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      <span className="text-sm">Домашние задания</span>
                    </div>
                  </Button>
                </div>
                
                {activeSubjects.length > 0 && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="glass-accent-blue p-2 rounded-xl">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-600">Твои предметы:</span>
                    {activeSubjects.map((subject) => (
                      <span
                        key={subject}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                          subject === "English"
                            ? "glass-accent-green text-green-700"
                            : "glass-accent-blue text-blue-700"
                        }`}
                      >
                        {subject}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Join Button with Integrated Toggles */}
            <div className="relative pt-2">
              <Button
                size="lg"
                className={`w-full h-auto py-5 min-h-[64px] bg-gradient-to-r ${colors.gradient} hover:scale-[1.02] hover:shadow-2xl active:scale-100 transition-all duration-300 shadow-xl border border-white/20 backdrop-blur-xl font-medium group touch-manipulation select-none`}
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

              {/* Elegant Mic/Camera Toggles - Positioned on button edge */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                {/* Microphone Toggle */}
                <button
                  onClick={requestMicPermission}
                  disabled={micPermission === "granted" || micPermission === "checking"}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 backdrop-blur-xl border-2 touch-manipulation active:scale-90 select-none shadow-lg ${
                    shouldPulseMic ? 'animate-pulse ring-4 ring-white/30' : ''
                  } ${
                    micPermission === "granted"
                      ? "bg-white/20 border-white/30 text-white cursor-default hover:bg-white/25"
                      : micPermission === "denied"
                      ? "bg-orange-500/80 border-orange-400/50 text-white cursor-pointer hover:bg-orange-500"
                      : "bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30"
                  }`}
                  title={
                    micPermission === "granted"
                      ? "Микрофон разрешён ✓"
                      : micPermission === "denied"
                      ? "Включить микрофон"
                      : "Разрешить микрофон"
                  }
                >
                  {micPermission === "granted" ? (
                    <Mic className="h-5 w-5" />
                  ) : micPermission === "denied" ? (
                    <MicOff className="h-4 w-4" />
                  ) : micPermission === "checking" ? (
                    <Mic className="h-5 w-5 animate-pulse" />
                  ) : (
                    <Mic className="h-5 w-5 opacity-70" />
                  )}
                </button>

                {/* Video Toggle */}
                <button
                  onClick={requestVideoPermission}
                  disabled={videoPermission === "granted" || videoPermission === "checking"}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 backdrop-blur-xl border-2 touch-manipulation active:scale-90 select-none shadow-lg ${
                    shouldPulseCamera ? 'animate-pulse ring-4 ring-white/30' : ''
                  } ${
                    videoPermission === "granted"
                      ? "bg-white/20 border-white/30 text-white cursor-default hover:bg-white/25"
                      : videoPermission === "denied"
                      ? "bg-orange-500/80 border-orange-400/50 text-white cursor-pointer hover:bg-orange-500"
                      : "bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30"
                  }`}
                  title={
                    videoPermission === "granted"
                      ? "Камера разрешена ✓"
                      : videoPermission === "denied"
                      ? "Включить камеру"
                      : "Разрешить камеру"
                  }
                >
                  {videoPermission === "granted" ? (
                    <Video className="h-5 w-5" />
                  ) : videoPermission === "denied" ? (
                    <VideoOff className="h-4 w-4" />
                  ) : videoPermission === "checking" ? (
                    <Video className="h-5 w-5 animate-pulse" />
                  ) : (
                    <Video className="h-5 w-5 opacity-70" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
