"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchStudents, Student } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Loader2, Tag } from "lucide-react";

const TAG_COLORS = {
  red: {
    bg: "bg-red-100 dark:bg-red-900/30",
    border: "border-red-300 dark:border-red-700",
    hover: "hover:bg-red-200 dark:hover:bg-red-900/50",
    text: "text-red-900 dark:text-red-100",
    dot: "bg-red-500",
  },
  orange: {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    border: "border-orange-300 dark:border-orange-700",
    hover: "hover:bg-orange-200 dark:hover:bg-orange-900/50",
    text: "text-orange-900 dark:text-orange-100",
    dot: "bg-orange-500",
  },
  yellow: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    border: "border-yellow-300 dark:border-yellow-700",
    hover: "hover:bg-yellow-200 dark:hover:bg-yellow-900/50",
    text: "text-yellow-900 dark:text-yellow-100",
    dot: "bg-yellow-500",
  },
  green: {
    bg: "bg-green-100 dark:bg-green-900/30",
    border: "border-green-300 dark:border-green-700",
    hover: "hover:bg-green-200 dark:hover:bg-green-900/50",
    text: "text-green-900 dark:text-green-100",
    dot: "bg-green-500",
  },
  blue: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    border: "border-blue-300 dark:border-blue-700",
    hover: "hover:bg-blue-200 dark:hover:bg-blue-900/50",
    text: "text-blue-900 dark:text-blue-100",
    dot: "bg-blue-500",
  },
  purple: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    border: "border-purple-300 dark:border-purple-700",
    hover: "hover:bg-purple-200 dark:hover:bg-purple-900/50",
    text: "text-purple-900 dark:text-purple-100",
    dot: "bg-purple-500",
  },
  pink: {
    bg: "bg-pink-100 dark:bg-pink-900/30",
    border: "border-pink-300 dark:border-pink-700",
    hover: "hover:bg-pink-200 dark:hover:bg-pink-900/50",
    text: "text-pink-900 dark:text-pink-100",
    dot: "bg-pink-500",
  },
  gray: {
    bg: "bg-gray-100 dark:bg-gray-900/30",
    border: "border-gray-300 dark:border-gray-700",
    hover: "hover:bg-gray-200 dark:hover:bg-gray-900/50",
    text: "text-gray-900 dark:text-gray-100",
    dot: "bg-gray-500",
  },
};

export default function TagStudentsPage() {
  const params = useParams();
  const router = useRouter();
  const tagColor = params.tagColor as string;
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudents();
  }, [tagColor]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const allStudents = await fetchStudents();
      // Filter students by tag
      const taggedStudents = allStudents.filter((s) => s.tag === tagColor);
      setStudents(taggedStudents);
    } catch (error) {
      console.error("Error loading students:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentClick = (studentId: string) => {
    router.push(`/student/${studentId}`);
  };

  const colorScheme = TAG_COLORS[tagColor as keyof typeof TAG_COLORS] || TAG_COLORS.gray;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 shadow-xl border-2">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
            <div className="flex items-center justify-center gap-3">
              <Tag className="h-10 w-10" />
              <div className="text-center">
                <CardTitle className="text-3xl font-bold">
                  Выберите ученика
                </CardTitle>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className={`w-3 h-3 rounded-full ${colorScheme.dot}`}></div>
                  <span className="text-blue-100 text-sm capitalize">{tagColor} group</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8 pb-8">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  Нет учеников с этим тегом
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  Tag: <span className="capitalize font-mono">{tagColor}</span>
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {students.map((student) => (
                  <Button
                    key={student.id}
                    size="lg"
                    onClick={() => handleStudentClick(student.id)}
                    className={`h-auto py-6 border-2 transition-all shadow-lg ${colorScheme.bg} ${colorScheme.border} ${colorScheme.hover} ${colorScheme.text}`}
                    variant="outline"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-4 h-4 rounded-full ${colorScheme.dot}`}></div>
                      <span className="font-bold text-xl">{student.name}</span>
                      {student.teacher && (
                        <span className="text-xs opacity-70">
                          Учитель: {student.teacher}
                        </span>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            )}
            
            <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
              <p>Нажмите на своё имя, чтобы продолжить</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
