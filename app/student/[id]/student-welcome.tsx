"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCircle, Video, BookOpen, GraduationCap, Sparkles, Mic, MicOff, VideoOff, CheckCircle, XCircle, Star, TrendingUp } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import WaitingRoom, { WaitingRoomHandle } from "@/components/WaitingRoom";
import { db, fetchStudentRatings } from "@/lib/firebase";
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
  const [studentRating, setStudentRating] = useState<any>(null);
  const [loadingRating, setLoadingRating] = useState(true);
  const [showRatingDetails, setShowRatingDetails] = useState(false);
  const [isExcludedFromRating, setIsExcludedFromRating] = useState(false);

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
  
  // Load student ratings
  useEffect(() => {
    const loadRatings = async () => {
      setLoadingRating(true);
      try {
        console.log("🎯 Fetching ratings for student:", student.id);
        
        // Check if student is excluded from rating
        const profileRef = doc(db, 'studentProfiles', student.id);
        const profileSnap = await getDoc(profileRef);
        const excluded = profileSnap.exists() ? profileSnap.data()?.excludeFromRating : false;
        setIsExcludedFromRating(excluded);
        
        if (excluded) {
          console.log("⚠️ Student is excluded from rating");
          setStudentRating(null);
        } else {
          const ratings = await fetchStudentRatings(student.id);
          console.log("📊 Received ratings:", ratings);
          setStudentRating(ratings);
        }
      } catch (error) {
        console.error("❌ Error loading ratings:", error);
      } finally {
        setLoadingRating(false);
      }
    };
    
    loadRatings();
  }, [student.id]);

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
            {/* Student Info */}
            <div className="glass-surface rounded-2xl p-5">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="glass-accent-blue p-2 rounded-xl">
                    <GraduationCap className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="font-medium text-gray-600">Твой учитель:</span>
                  <span className="font-semibold text-lg text-gray-900">
                    {teacherName}
                  </span>
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
            
            {/* Rating Display */}
            {!loadingRating && isExcludedFromRating && (
              <div className="glass-surface rounded-2xl p-5 border-2 border-gray-300">
                <div className="flex items-center gap-3">
                  <div className="glass-surface-dark p-2 rounded-xl">
                    <Star className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <span className="font-medium text-gray-600 text-sm">Рейтинг</span>
                    <div className="text-sm text-gray-500 mt-1">
                      Вы не участвуете в общем рейтинге
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {!loadingRating && !isExcludedFromRating && studentRating && (
              <div className="glass-accent-amber rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="glass-surface-dark p-2 rounded-xl">
                      <Star className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <span className="font-medium text-gray-600 text-sm">Твой рейтинг</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-2xl text-amber-600">
                          {studentRating.overallRating ? studentRating.overallRating.toFixed(1) : "N/A"}
                        </span>
                        <span className="text-sm text-gray-500">/ 10</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Место: {studentRating.rank} из {studentRating.totalStudents}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRatingDetails(true)}
                    className="glass-button-dark text-amber-700 font-medium"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Подробнее
                  </Button>
                </div>
              </div>
            )}

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
                className="w-full h-auto py-5 min-h-[64px] glass-card text-gray-700 transition-all duration-300 shadow-xl font-medium touch-manipulation active:scale-95 select-none"
                onClick={handleHomeworks}
              >
                <div className="flex items-center gap-3">
                  <div className="glass-accent-blue p-2 rounded-xl">
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
      
      {/* Rating Details Modal */}
      {showRatingDetails && studentRating && (
        <div className="fixed inset-0 glass-backdrop-strong z-50 flex items-center justify-center p-4">
          <div className="glass-modal rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-yellow-500 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Star className="h-8 w-8" />
                  <div>
                    <h2 className="text-2xl font-bold">Your Rating Details</h2>
                    <p className="text-amber-100 mt-1">Complete performance overview</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRatingDetails(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Overall Rating */}
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-6 mb-6 border-2 border-amber-200">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-white mb-4">
                    <span className="text-4xl font-bold">{studentRating.overallRating?.toFixed(1) || "N/A"}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Overall Rating</h3>
                  <p className="text-gray-600 mt-1">Your total performance score</p>
                </div>
              </div>
              
              {/* Individual Ratings */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Rating Breakdown</h3>
                
                {/* Homework Completion */}
                {studentRating.homeworkCompletion !== undefined && (
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-gray-900">Homework Completion</span>
                      </div>
                      <span className="font-bold text-xl text-blue-600">
                        {(studentRating.homeworkCompletion * 10).toFixed(1)}/10
                      </span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${studentRating.homeworkCompletion * 100}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {(studentRating.homeworkCompletion * 100).toFixed(0)}% of homework completed
                    </p>
                  </div>
                )}
                
                {/* Homework Score */}
                {studentRating.homeworkScore !== undefined && (
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-gray-900">Homework Score</span>
                      </div>
                      <span className="font-bold text-xl text-green-600">
                        {(studentRating.homeworkScore * 10).toFixed(1)}/10
                      </span>
                    </div>
                    <div className="w-full bg-green-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${studentRating.homeworkScore * 100}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Average score: {(studentRating.homeworkScore * 100).toFixed(0)}%
                    </p>
                  </div>
                )}
                
                {/* Lesson Attendance */}
                {studentRating.lessonAttendance !== undefined && (
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Video className="h-5 w-5 text-purple-600" />
                        <span className="font-semibold text-gray-900">Lesson Attendance</span>
                      </div>
                      <span className="font-bold text-xl text-purple-600">
                        {(studentRating.lessonAttendance * 10).toFixed(1)}/10
                      </span>
                    </div>
                    <div className="w-full bg-purple-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${studentRating.lessonAttendance * 100}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {(studentRating.lessonAttendance * 100).toFixed(0)}% attendance rate
                    </p>
                  </div>
                )}
                
                {/* Statistics */}
                {studentRating.stats && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mt-6">
                    <h4 className="font-semibold text-gray-900 mb-3">Statistics</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {studentRating.stats.totalHomework !== undefined && (
                        <div>
                          <p className="text-sm text-gray-600">Total Homework</p>
                          <p className="text-xl font-bold text-gray-900">{studentRating.stats.totalHomework}</p>
                        </div>
                      )}
                      {studentRating.stats.completedHomework !== undefined && (
                        <div>
                          <p className="text-sm text-gray-600">Completed</p>
                          <p className="text-xl font-bold text-green-600">{studentRating.stats.completedHomework}</p>
                        </div>
                      )}
                      {studentRating.stats.totalLessons !== undefined && (
                        <div>
                          <p className="text-sm text-gray-600">Total Lessons</p>
                          <p className="text-xl font-bold text-gray-900">{studentRating.stats.totalLessons}</p>
                        </div>
                      )}
                      {studentRating.stats.attendedLessons !== undefined && (
                        <div>
                          <p className="text-sm text-gray-600">Attended</p>
                          <p className="text-xl font-bold text-purple-600">{studentRating.stats.attendedLessons}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer */}
            <div className="border-t p-4 bg-gray-50">
              <Button
                onClick={() => setShowRatingDetails(false)}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
