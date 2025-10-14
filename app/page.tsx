"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Users, BookOpen, Calendar, Play, User, X, LogIn } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

interface ActiveRoom {
  name: string;
  numParticipants: number;
  teacher: string;
}

export default function Home() {
  const router = useRouter();
  const [showTeacherSelect, setShowTeacherSelect] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Fetch active rooms on component mount
  useEffect(() => {
    fetchActiveRooms();
    // Refresh every 5 seconds
    const interval = setInterval(fetchActiveRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchActiveRooms = async () => {
    try {
      setLoadingRooms(true);
      const response = await fetch("/api/list-rooms");
      if (response.ok) {
        const data = await response.json();
        setActiveRooms(data.rooms || []);
      }
    } catch (error) {
      console.error("Error fetching rooms:", error);
    } finally {
      setLoadingRooms(false);
    }
  };

  const closeRoom = async (roomName: string) => {
    if (!confirm(`Close room "${roomName}"? All participants will be disconnected.`)) {
      return;
    }

    try {
      const response = await fetch("/api/close-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName }),
      });

      if (response.ok) {
        console.log(`✅ Room ${roomName} closed`);
        // Refresh the room list
        await fetchActiveRooms();
      } else {
        alert("Failed to close room. Please try again.");
      }
    } catch (error) {
      console.error("Error closing room:", error);
      alert("Failed to close room. Please try again.");
    }
  };

  const startLessonAs = async (teacher: "Roman" | "Violet") => {
    setIsStarting(true);
    try {
      const teacherKey = teacher.toLowerCase(); // "roman" or "violet"
      const room = teacherKey; // Simple room name: just "roman" or "violet"
      
      console.log(`🚀 Starting lesson for ${teacher}:`, {
        roomName: room,
        teacherKey
      });
      
      // Check if there are any other rooms for this teacher and close them
      const otherRooms = activeRooms.filter(r => r.teacher === room);
      for (const otherRoom of otherRooms) {
        console.log(`🗑️ Closing existing room: ${otherRoom.name}`);
        await fetch("/api/close-room", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomName: otherRoom.name }),
        });
      }
      
      // Join the room directly - no session codes needed
      router.push(`/room?room=${room}&name=${teacher}&isTutor=true`);
    } catch (error) {
      console.error("Error starting lesson:", error);
      alert("Failed to start lesson. Please try again.");
      setIsStarting(false);
    }
  };

  const rejoinRoom = (roomName: string, teacher: string) => {
    const teacherName = teacher.charAt(0).toUpperCase() + teacher.slice(1); // "roman" -> "Roman"
    router.push(`/room?room=${roomName}&name=${teacherName}&isTutor=true`);
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

        {/* Active Rooms Section */}
        {activeRooms.length > 0 && (
          <div className="mb-8">
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Video className="h-6 w-6 text-green-600" />
                  Active Rooms
                  {loadingRooms && <span className="text-sm font-normal text-gray-500">(updating...)</span>}
                </CardTitle>
                <CardDescription>
                  Rooms currently open on LiveKit server
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeRooms.map((room) => (
                    <div
                      key={room.name}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-lg border border-blue-200 dark:border-gray-600"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {room.teacher.charAt(0).toUpperCase() + room.teacher.slice(1)}'s Room
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {room.numParticipants} participant{room.numParticipants !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => rejoinRoom(room.name, room.teacher)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <LogIn className="h-4 w-4 mr-2" />
                          Rejoin
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => closeRoom(room.name)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
