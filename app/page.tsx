"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Users, BookOpen, Calendar, Play, User } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

export default function Home() {
  const router = useRouter();
  const [showTeacherSelect, setShowTeacherSelect] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const startLessonAs = async (teacher: "Roman" | "Violet") => {
    setIsStarting(true);
    try {
      const teacherKey = teacher.toLowerCase();
      
      // Check if there's an existing active session
      const existingSessionDoc = await getDoc(doc(db, "activeSessions", teacherKey));
      
      if (existingSessionDoc.exists()) {
        const existingSession = existingSessionDoc.data();
        console.log(`📋 Found existing session for ${teacher}:`, existingSession);
        
        // Check if the LiveKit room actually still exists
        const roomCheckResponse = await fetch("/api/check-room", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomName: existingSession.roomName }),
        });
        
        if (roomCheckResponse.ok) {
          const roomStatus = await roomCheckResponse.json();
          
          if (roomStatus.exists) {
            console.log(`✅ Room ${existingSession.roomName} still exists with ${roomStatus.numParticipants} participants`);
            console.log(`🔄 Rejoining existing session...`);
            
            // Rejoin the existing room
            router.push(`/room?room=${existingSession.roomName}&name=${teacher}&isTutor=true&sessionCode=${existingSession.sessionCode}`);
            return;
          } else {
            console.log(`❌ Room ${existingSession.roomName} no longer exists on LiveKit server`);
            console.log(`🆕 Creating new session...`);
          }
        } else {
          // API error - log it but continue (room connection will fail later with better error)
          console.error('⚠️ Failed to check room status:', await roomCheckResponse.text());
          console.log('⚠️ Proceeding without room verification...');
        }
      }
      
      // No existing session or room is dead - create new session
      const sessionCode = Math.floor(100000 + Math.random() * 900000).toString();
      const room = `${teacherKey}-${sessionCode}`; // e.g., "roman-123456"
      
      console.log(`🆕 Creating NEW session for ${teacher}:`, {
        sessionCode,
        roomName: room,
        teacherKey,
        format: `${teacherKey}-${sessionCode}`
      });
      
      // Store the active session in Firestore
      await setDoc(doc(db, "activeSessions", teacherKey), {
        sessionCode,
        roomName: room,
        teacherName: teacher,
        startedAt: serverTimestamp(),
        isActive: true,
      });
      
      console.log(`✅ Session created and stored in Firestore:`, {
        docPath: `activeSessions/${teacherKey}`,
        sessionCode,
        roomName: room
      });
      
      // Join the room with the session code
      router.push(`/room?room=${room}&name=${teacher}&isTutor=true&sessionCode=${sessionCode}`);
    } catch (error) {
      console.error("Error starting lesson:", error);
      alert("Failed to start lesson. Please try again.");
      setIsStarting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            RV2Class
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Professional Teaching Platform
          </p>
        </div>

        <div className="mb-8">
          <Card className="backdrop-blur-sm bg-gradient-to-br from-blue-500 to-purple-600 border-0 shadow-2xl hover:shadow-3xl transition-all duration-300">
            <CardContent className="p-8">
              {!showTeacherSelect ? (
                <Button
                  size="lg"
                  onClick={() => setShowTeacherSelect(true)}
                  className="w-full h-auto py-8 bg-white hover:bg-gray-50 text-blue-600 text-2xl font-bold shadow-xl hover:scale-105 transition-all duration-300 group"
                  disabled={isStarting}
                >
                  <Play className="h-12 w-12 mr-4 group-hover:scale-110 transition-transform" />
                  <div className="flex flex-col items-start">
                    <span>Start a Lesson</span>
                    <span className="text-sm font-normal text-gray-500 mt-1">
                      Begin teaching session immediately
                    </span>
                  </div>
                </Button>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-white text-xl font-semibold text-center mb-4">
                    Select Teacher
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      size="lg"
                      onClick={() => startLessonAs("Roman")}
                      className="h-auto py-6 bg-white hover:bg-gray-50 text-blue-600 font-bold shadow-lg hover:scale-105 transition-all duration-300 group"
                      disabled={isStarting}
                    >
                      <User className="h-8 w-8 mr-3 group-hover:scale-110 transition-transform" />
                      <div className="flex flex-col items-start">
                        <span className="text-lg">Roman</span>
                        <span className="text-xs font-normal text-gray-500">Start as Roman</span>
                      </div>
                    </Button>
                    <Button
                      size="lg"
                      onClick={() => startLessonAs("Violet")}
                      className="h-auto py-6 bg-white hover:bg-gray-50 text-purple-600 font-bold shadow-lg hover:scale-105 transition-all duration-300 group"
                      disabled={isStarting}
                    >
                      <User className="h-8 w-8 mr-3 group-hover:scale-110 transition-transform" />
                      <div className="flex flex-col items-start">
                        <span className="text-lg">Violet</span>
                        <span className="text-xs font-normal text-gray-500">Start as Violet</span>
                      </div>
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setShowTeacherSelect(false)}
                    className="w-full text-white hover:text-white hover:bg-white/10"
                    disabled={isStarting}
                  >
                    {isStarting ? "Starting..." : "Cancel"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/students")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-6 w-6 text-blue-600" />
                Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                View and manage all registered students
              </p>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/homework")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-6 w-6 text-green-600" />
                Homework
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create and review homework assignments
              </p>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/schedule")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-6 w-6 text-purple-600" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage your teaching schedule
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 p-6 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Video className="h-5 w-5 text-blue-600" />
            Quick Tips
          </h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li>• Click "Start a Lesson" to begin teaching immediately</li>
            <li>• Students can join via their personalized links</li>
            <li>• You can approve student join requests during the session</li>
            <li>• Use the whiteboard and screen sharing tools during lessons</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
