"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCircle, Video, BookOpen, GraduationCap, Sparkles } from "lucide-react";
import { useState } from "react";

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

  const teacherName = student.teacher || "Roman";
  const teacherPath = `/${teacherName.toLowerCase()}`;
  
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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
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

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button
                size="lg"
                className={`w-full h-auto py-4 bg-gradient-to-r ${colors.gradient} hover:opacity-90 transition-opacity shadow-lg`}
                onClick={handleJoinClass}
                disabled={isJoining}
              >
                <Video className="mr-2 h-5 w-5" />
                <div className="flex flex-col items-start">
                  <span className="font-bold text-base">Join Class</span>
                  <span className="text-xs opacity-90">Connect with {teacherName}</span>
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
