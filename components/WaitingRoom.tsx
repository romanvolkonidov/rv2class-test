"use client";

import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Loader2, Clock, UserCheck, Sparkles, Video, Mic } from "lucide-react";

interface WaitingRoomProps {
  studentName: string;
  teacherName: string;
  onApproved?: () => void;
}

export interface WaitingRoomHandle {
  stopPreview: () => void;
}

const motivationalQuotes = [
  {
    text: "Знание языка — это дверь к новому миру возможностей",
    author: "Нельсон Мандела"
  },
  {
    text: "Изучение языка открывает окно в другую культуру",
    author: "Фрэнк Смит"
  },
  {
    text: "Тот, кто знает много языков, живет столько же жизней",
    author: "Чешская пословица"
  },
  {
    text: "Границы моего языка означают границы моего мира",
    author: "Людвиг Витгенштейн"
  },
  {
    text: "Язык — это путь к сердцу народа",
    author: "Джоанна Харрис"
  },
  {
    text: "Изучать язык — значит открывать новые горизонты",
    author: "Древняя мудрость"
  },
  {
    text: "Каждый язык — это отдельный взгляд на жизнь",
    author: "Федерико Феллини"
  },
  {
    text: "Язык — это дорожная карта культуры",
    author: "Рита Мэй Браун"
  },
  {
    text: "Учить язык — значит расширять свой ум",
    author: "Роджер Бэкон"
  },
  {
    text: "Новый язык — это новая жизнь",
    author: "Персидская пословица"
  },
  {
    text: "Кто не знает иностранных языков, ничего не знает о своем собственном",
    author: "Иоганн Вольфганг фон Гёте"
  },
  {
    text: "Язык — это оружие мысли",
    author: "Хосе Марти"
  }
];

const WaitingRoom = forwardRef<WaitingRoomHandle, WaitingRoomProps>(({ studentName, teacherName, onApproved }, ref) => {
  const [currentQuote, setCurrentQuote] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  // Expose stopPreview function to parent
  useImperativeHandle(ref, () => ({
    stopPreview: () => {
      console.log('🛑 Stopping waiting room preview via ref...');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log(`🛑 Stopped ${track.kind} track`);
        });
        streamRef.current = null;
        setPreviewStream(null);
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }
    }
  }));

  // Start preview stream
  useEffect(() => {
    const startPreview = async () => {
      try {
        console.log('🎥 Starting waiting room preview...');
        
        // Check if AI noise suppression is enabled
        const aiNoiseCancellationEnabled = localStorage.getItem('aiNoiseCancellation');
        const shouldApplyNoiseCancellation = aiNoiseCancellationEnabled !== 'false'; // Default to true
        
        let processedStream: MediaStream;
        
        if (shouldApplyNoiseCancellation) {
          try {
            console.log('🔊 Getting microphone with AI noise suppression...');
            
            // Import the function dynamically to avoid SSR issues
            const { getProcessedMicrophoneAudio } = await import('@/lib/audioProcessor');
            
            // Get microphone audio that's already processed by RNNoise
            const audioStream = await getProcessedMicrophoneAudio();
            const audioTrack = audioStream.getAudioTracks()[0];
            
            // Get video separately
            const videoStream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 },
              },
              audio: false, // Don't get audio again
            });
            const videoTrack = videoStream.getVideoTracks()[0];
            
            // Combine processed audio with video
            const tracks = [];
            if (audioTrack) tracks.push(audioTrack);
            if (videoTrack) tracks.push(videoTrack);
            processedStream = new MediaStream(tracks);
            
            console.log('✅ AI noise-suppressed audio + video ready for waiting room');
          } catch (noiseError) {
            console.warn('⚠️ Could not apply noise suppression, using standard audio:', noiseError);
            // Fallback to standard method
            processedStream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 },
              },
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              }
            });
          }
        } else {
          console.log('ℹ️ AI noise suppression disabled by user preference');
          processedStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          });
        }

        streamRef.current = processedStream;
        setPreviewStream(processedStream);
        setHasVideo(processedStream.getVideoTracks().length > 0);
        setHasAudio(processedStream.getAudioTracks().length > 0);

        // Attach to video element
        if (videoRef.current && processedStream) {
          videoRef.current.srcObject = processedStream;
          console.log('✅ Preview stream attached to video element');
        }
      } catch (error) {
        console.error('❌ Error starting preview:', error);
        // Continue without preview - user already granted permissions earlier
      }
    };

    startPreview();

    // Cleanup function
    return () => {
      if (streamRef.current) {
        console.log('🛑 Stopping waiting room preview (cleanup)...');
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Update video element when stream changes
  useEffect(() => {
    if (videoRef.current && previewStream) {
      videoRef.current.srcObject = previewStream;
    }
  }, [previewStream]);

  // Rotate quotes every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % motivationalQuotes.length);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const quote = motivationalQuotes[currentQuote];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements - Apple-style subtle orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-cyan-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-indigo-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Glass morphism card */}
      <div className="max-w-4xl w-full backdrop-blur-2xl bg-white/60 border border-gray-200/50 shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] rounded-3xl overflow-hidden relative z-10">
        <div className="pt-12 pb-12 space-y-8 px-6">
          
          {/* Video Preview Section */}
          {previewStream && (
            <div className="flex justify-center">
              <div className="relative w-full max-w-md">
                {/* Video preview with mirror effect */}
                <div className="relative rounded-2xl overflow-hidden border-4 border-blue-200/50 shadow-xl">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-auto scale-x-[-1]"
                    style={{ maxHeight: '360px', objectFit: 'cover' }}
                  />
                  
                  {/* Student name overlay */}
                  <div className="absolute bottom-3 left-3 px-4 py-2 rounded-lg bg-black/50 backdrop-blur-md border border-white/20">
                    <p className="text-sm font-medium text-white">{studentName}</p>
                  </div>
                  
                  {/* Status indicators */}
                  <div className="absolute top-3 right-3 flex gap-2">
                    {hasVideo && (
                      <div className="p-2 rounded-lg bg-green-500/90 backdrop-blur-md border border-green-400/30">
                        <Video className="w-4 h-4 text-white" />
                      </div>
                    )}
                    {hasAudio && (
                      <div className="p-2 rounded-lg bg-green-500/90 backdrop-blur-md border border-green-400/30">
                        <Mic className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Preview label */}
                <p className="text-center text-sm text-gray-600 mt-2">
                  Так вас будет видеть учитель
                </p>
              </div>
            </div>
          )}

          {/* Animated Icon - show only if no preview */}
          {!previewStream && (
            <div className="flex justify-center">
              <div className="relative">
                {/* Outer spinning ring */}
                <div className="absolute inset-0 animate-spin-slow">
                  <div className="h-32 w-32 rounded-full border-4 border-blue-200/40 border-t-blue-500"></div>
                </div>
                
                {/* Inner pulsing circle */}
                <div className="relative h-32 w-32 flex items-center justify-center">
                  <div className="absolute inset-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm rounded-full animate-pulse"></div>
                  <Clock className="relative h-16 w-16 text-blue-600 z-10 animate-bounce-slow" />
                </div>
              </div>
            </div>
          )}

          {/* Status Text */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <UserCheck className="h-5 w-5" />
              <p className="text-lg">
                <span className="font-semibold">{teacherName}</span> скоро подключит вас к уроку
              </p>
            </div>
            <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
              Пожалуйста, подождите немного. Учитель проверит ваш запрос и пригласит вас на урок.
              Убедитесь, что ваш микрофон и камера включены.
            </p>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300/50"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white/60 backdrop-blur-xl px-4 py-1 rounded-full text-sm text-gray-600 flex items-center gap-2 border border-gray-200/50">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Мудрость дня
                <Sparkles className="h-4 w-4 text-amber-500" />
              </span>
            </div>
          </div>

          {/* Motivational Quote with fade animation */}
          <div 
            key={currentQuote}
            className="text-center space-y-3 animate-fade-in min-h-[120px] flex flex-col justify-center"
          >
            <blockquote className="text-xl font-serif italic text-gray-700 leading-relaxed px-4">
              "{quote.text}"
            </blockquote>
            <p className="text-sm font-medium text-blue-600">
              — {quote.author}
            </p>
          </div>

          {/* Progress indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Проверка запроса...</span>
              <span>⏱️ Обычно занимает менее минуты</span>
            </div>
            <div className="h-2 bg-gray-200/50 backdrop-blur-sm rounded-full overflow-hidden border border-gray-300/50">
              <div className="h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 animate-progress-bar shadow-lg"></div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes fade-in {
          from { 
            opacity: 0;
            transform: translateY(10px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes progress-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
        
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
        
        .animate-progress-bar {
          animation: progress-bar 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
});

WaitingRoom.displayName = 'WaitingRoom';

export default WaitingRoom;
