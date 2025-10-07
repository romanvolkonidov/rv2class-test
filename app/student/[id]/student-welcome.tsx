"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCircle, Video, BookOpen, GraduationCap, Sparkles, Mic, MicOff, VideoOff, CheckCircle, XCircle, Download } from "lucide-react";
import { useState, useEffect } from "react";
import WaitingRoom from "@/components/WaitingRoom";

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
  const [shouldPulseMic, setShouldPulseMic] = useState(false);
  const [shouldPulseCamera, setShouldPulseCamera] = useState(false);
  const [hasShownWelcomePopup, setHasShownWelcomePopup] = useState(false);
  const [isWaitingForTeacher, setIsWaitingForTeacher] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isSafari, setIsSafari] = useState(false);

  const teacherName = student.teacher || "Roman";
  const teacherPath = `/${teacherName.toLowerCase()}`;

  // Show welcome popup on first load
  useEffect(() => {
    const hasSeenPopup = sessionStorage.getItem(`welcome-popup-${student.id}`);
    if (!hasSeenPopup) {
      setTimeout(() => {
        alert("🎓 Добро пожаловать на урок!\n\n" +
              "Для подключения к уроку нужно разрешить доступ:\n" +
              "📹 К камере\n" +
              "🎤 К микрофону\n\n" +
              "Когда браузер спросит разрешение - нажмите 'Разрешить'.");
        sessionStorage.setItem(`welcome-popup-${student.id}`, 'true');
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

  // Detect Safari and listen for PWA install prompt
  useEffect(() => {
    // Detect Safari
    const userAgent = navigator.userAgent.toLowerCase();
    const isSafariBrowser = /safari/.test(userAgent) && !/chrome|chromium|edg/.test(userAgent);
    setIsSafari(isSafariBrowser);

    // Listen for install prompt (Chrome, Edge, Firefox)
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallButton(false);
    } else {
      // Show button for Safari or if install prompt is available
      if (isSafariBrowser) {
        setShowInstallButton(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
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
      
      // Show helpful alert in Russian
      setTimeout(() => {
        alert("🎤 Доступ к микрофону заблокирован!\n\n" +
              "Чтобы включить:\n" +
              "1. Нажмите на иконку 🔒 замка в адресной строке браузера\n" +
              "2. Найдите 'Микрофон' в списке разрешений\n" +
              "3. Выберите 'Разрешить'\n" +
              "4. Обновите страницу (F5) и попробуйте снова");
      }, 500);
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
      
      // Show helpful alert in Russian
      setTimeout(() => {
        alert("📹 Доступ к камере заблокирован!\n\n" +
              "Чтобы включить:\n" +
              "1. Нажмите на иконку 🔒 замка в адресной строке браузера\n" +
              "2. Найдите 'Камера' в списке разрешений\n" +
              "3. Выберите 'Разрешить'\n" +
              "4. Обновите страницу (F5) и попробуйте снова");
      }, 500);
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
        // Show waiting room for a moment before redirecting
        // In production, you would poll for teacher approval here
        setTimeout(() => {
          const roomUrl = `/room?room=${encodeURIComponent(roomName)}&name=${encodeURIComponent(student.name)}&isTutor=false`;
          router.push(roomUrl);
        }, 2000);
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

  const handleInstallApp = async () => {
    // For Safari, always show instructions
    if (isSafari) {
      const userAgent = navigator.userAgent.toLowerCase();
      let instructions = "";
      
      if (/iphone|ipad|ipod/.test(userAgent)) {
        instructions = "1. Нажмите кнопку 'Поделиться' (Share) ⬆️\n" +
                      "2. Прокрутите вниз и выберите 'На экран «Домой»'\n" +
                      "3. Нажмите 'Добавить'";
      } else {
        // macOS Safari
        instructions = "1. Нажмите 'Файл' в меню\n" +
                      "2. Выберите 'Добавить в Dock'\n" +
                      "Или добавьте страницу в закладки для быстрого доступа";
      }
      
      alert("🏠 Добавить app на главный экран\n\n" + instructions);
      return;
    }

    // For Chrome, Edge, Firefox - trigger native install
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setShowInstallButton(false);
      }
      
      setDeferredPrompt(null);
    }
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
        studentName={student.name}
        teacherName={teacherName}
      />
    );
  }

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
                  Проверьте разрешения перед подключением
                </span>
              </div>
              
              <div className="flex gap-3 items-center flex-wrap">
                {/* Microphone Toggle */}
                <Button
                  size="sm"
                  onClick={requestMicPermission}
                  disabled={micPermission === "granted" || micPermission === "checking"}
                  className={`flex items-center gap-2 transition-all ${
                    shouldPulseMic ? 'animate-pulse ring-4 ring-blue-400' : ''
                  } ${
                    micPermission === "granted"
                      ? "bg-green-600 hover:bg-green-600 text-white cursor-default"
                      : micPermission === "denied"
                      ? "bg-orange-600 hover:bg-orange-700 text-white cursor-pointer"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
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
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">Микрофон вкл</span>
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
                  className={`flex items-center gap-2 transition-all ${
                    shouldPulseCamera ? 'animate-pulse ring-4 ring-blue-400' : ''
                  } ${
                    videoPermission === "granted"
                      ? "bg-green-600 hover:bg-green-600 text-white cursor-default"
                      : videoPermission === "denied"
                      ? "bg-orange-600 hover:bg-orange-700 text-white cursor-pointer"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
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
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">Камера вкл</span>
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
                
                {/* PWA Install Button - shows on Safari or when install prompt available */}
                {showInstallButton && (
                  <Button
                    size="sm"
                    onClick={handleInstallApp}
                    variant="outline"
                    className="flex items-center gap-2 border-2 border-blue-300 hover:bg-blue-50 dark:border-blue-700 dark:hover:bg-blue-900/20"
                    title={isSafari ? "Инструкции по добавлению на главный экран" : "Установить app"}
                  >
                    <Download className="h-4 w-4" />
                    <span className="font-medium hidden sm:inline">
                      {isSafari ? "Добавить app" : "Установить app"}
                    </span>
                    <span className="font-medium sm:hidden">🏠</span>
                  </Button>
                )}
              </div>
            </div>
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
                  Добро пожаловать, {student.name}! 👋
                </CardTitle>
                <CardDescription className="text-blue-100 text-lg mt-1">
                  Твоё личное учебное пространство
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
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Твой учитель:</span>
                  <span className={`font-bold text-lg ${colors.accent}`}>
                    {teacherName}
                  </span>
                </div>
                
                {activeSubjects.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <BookOpen className={`h-5 w-5 ${colors.accent}`} />
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Твои предметы:</span>
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

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button
                size="lg"
                className={`w-full h-auto py-4 bg-gradient-to-r ${colors.gradient} hover:opacity-90 transition-all shadow-lg`}
                onClick={handleJoinClass}
                disabled={isJoining}
              >
                <Video className="mr-2 h-5 w-5" />
                <div className="flex flex-col items-start">
                  <span className="font-bold text-base">Войти на урок</span>
                  <span className="text-xs opacity-90">Подключиться к {teacherName}</span>
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
                  <span className="font-bold text-base">Домашние задания</span>
                  <span className="text-xs opacity-70">Посмотреть задания</span>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
