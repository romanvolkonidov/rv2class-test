"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Clock, UserCheck, Sparkles } from "lucide-react";

interface WaitingRoomProps {
  studentName: string;
  teacherName: string;
  onApproved?: () => void;
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

export default function WaitingRoom({ studentName, teacherName, onApproved }: WaitingRoomProps) {
  const [currentQuote, setCurrentQuote] = useState(0);
  const [dots, setDots] = useState("");

  // Rotate quotes every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % motivationalQuotes.length);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === "...") return "";
        return prev + ".";
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const quote = motivationalQuotes[currentQuote];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 shadow-2xl border-2 border-purple-200 dark:border-purple-800">
        <CardContent className="pt-12 pb-12 space-y-8">
          {/* Animated Icon */}
          <div className="flex justify-center">
            <div className="relative">
              {/* Outer spinning ring */}
              <div className="absolute inset-0 animate-spin-slow">
                <div className="h-32 w-32 rounded-full border-4 border-purple-200 dark:border-purple-800 border-t-purple-600 dark:border-t-purple-400"></div>
              </div>
              
              {/* Inner pulsing circle */}
              <div className="relative h-32 w-32 flex items-center justify-center">
                <div className="absolute inset-4 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full animate-pulse"></div>
                <Clock className="relative h-16 w-16 text-white z-10 animate-bounce-slow" />
              </div>
            </div>
          </div>

          {/* Status Text */}
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white">
              Ожидаем подключения{dots}
            </h2>
            <div className="flex items-center justify-center gap-2 text-purple-600 dark:text-purple-400">
              <UserCheck className="h-5 w-5" />
              <p className="text-lg">
                <span className="font-semibold">{teacherName}</span> скоро подключит вас к уроку
              </p>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              Пожалуйста, подождите немного. Учитель проверит ваш запрос и пригласит вас на урок.
              Убедитесь, что ваш микрофон и камера включены.
            </p>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white dark:bg-gray-800 px-4 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
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
            <blockquote className="text-xl font-serif italic text-gray-700 dark:text-gray-300 leading-relaxed px-4">
              "{quote.text}"
            </blockquote>
            <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
              — {quote.author}
            </p>
          </div>

          {/* Progress indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Проверка запроса...</span>
              <span>⏱️ Обычно занимает менее минуты</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 animate-progress-bar"></div>
            </div>
          </div>
        </CardContent>
      </Card>

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
}
