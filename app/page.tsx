"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Users, UserCheck } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const origin = typeof window === "undefined" ? "https://online.rv2class.com" : window.location.origin;
  const tutors = [
    { name: "Roman", room: "roman-room", studentPath: "/roman" },
    { name: "Violet", room: "violet-room", studentPath: "/violet" },
  ];

  const startSession = (roomName: string, tutorName: string) => {
    router.push(
      `/room?room=${encodeURIComponent(roomName)}&name=${encodeURIComponent(tutorName)}&isTutor=true`
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            RV2Class
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Professional English Tutoring Platform
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-6 w-6 text-blue-600" />
                Start a Session
              </CardTitle>
              <CardDescription>
                Choose your tutor identity to jump straight into the classroom.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {tutors.map((tutor) => (
                <Button
                  key={tutor.name}
                  className="w-full justify-between"
                  size="lg"
                  onClick={() => startSession(tutor.room, tutor.name)}
                >
                  <span>{tutor.name}</span>
                  <span className="text-sm text-blue-100">Room: {tutor.room.replace(/-/g, " ")}</span>
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-6 w-6 text-green-600" />
                Student Access
              </CardTitle>
              <CardDescription>
                Share one of the dedicated links below with your student. They only need their name.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {tutors.map((tutor) => (
                <div
                  key={tutor.name}
                  className="flex items-center justify-between rounded-lg border border-green-200/60 dark:border-green-800/60 bg-green-50/60 dark:bg-green-900/30 p-3"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{tutor.name}'s Classroom</p>
                    <p className="text-gray-600 dark:text-gray-400">Link: {origin}{tutor.studentPath}</p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => router.push(tutor.studentPath)}
                  >
                    Open link
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-6 w-6 text-purple-600" />
                Registered Students
              </CardTitle>
              <CardDescription>
                View all students with personalized join links based on their assigned teacher.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                <p>Each student gets a unique link with their name pre-filled, automatically connecting them to their assigned teacher.</p>
              </div>
              <Button
                className="w-full"
                size="lg"
                variant="outline"
                onClick={() => router.push("/students")}
              >
                <UserCheck className="mr-2 h-5 w-5" />
                View All Students
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Powered by LiveKit • Secure real-time communication</p>
        </div>
      </div>
    </main>
  );
}

