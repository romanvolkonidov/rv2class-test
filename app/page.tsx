"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Users, BookOpen, Calendar, Play } from "lucide-react";

export default function Home() {
  const router = useRouter();

  const startLesson = () => {
    router.push("/room?room=teaching-room&name=Teacher&isTutor=true");
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
              <Button
                size="lg"
                onClick={startLesson}
                className="w-full h-auto py-8 bg-white hover:bg-gray-50 text-blue-600 text-2xl font-bold shadow-xl hover:scale-105 transition-all duration-300 group"
              >
                <Play className="h-12 w-12 mr-4 group-hover:scale-110 transition-transform" />
                <div className="flex flex-col items-start">
                  <span>Start a Lesson</span>
                  <span className="text-sm font-normal text-gray-500 mt-1">
                    Begin teaching session immediately
                  </span>
                </div>
              </Button>
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
