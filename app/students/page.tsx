"use client";

import { useEffect, useState } from "react";
import { fetchStudents, Student } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Loader2, Link as LinkIcon, UserCheck, ExternalLink, Copy, Check } from "lucide-react";

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const origin = typeof window === "undefined" ? "https://online.rv2class.com" : window.location.origin;

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const data = await fetchStudents();
      setStudents(data);
    } catch (error) {
      console.error("Error loading students:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateJoinLink = (student: Student) => {
    const teacher = student.teacher?.toLowerCase() || "roman";
    const studentName = encodeURIComponent(student.name || "");
    return `${origin}/${teacher}?name=${studentName}`;
  };

  const copyToClipboard = async (text: string, studentId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(studentId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const getTeacherBadgeColor = (teacher?: string) => {
    switch (teacher?.toLowerCase()) {
      case "roman":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "violet":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const studentsByTeacher = {
    Roman: students.filter((s) => s.teacher?.toLowerCase() === "roman"),
    Violet: students.filter((s) => s.teacher?.toLowerCase() === "violet"),
    Unassigned: students.filter((s) => !s.teacher || s.teacher === "unassigned"),
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 mt-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-center gap-3">
            <Users className="h-10 w-10 text-blue-600" />
            Students
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            All registered students with their personalized join links
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : students.length === 0 ? (
          <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80">
            <CardContent className="py-12 text-center">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                No students found. Add students via Student Management.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(studentsByTeacher).map(([teacher, studentList]) => {
              if (studentList.length === 0) return null;
              
              return (
                <Card key={teacher} className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserCheck className={`h-6 w-6 ${teacher === "Roman" ? "text-blue-600" : teacher === "Violet" ? "text-purple-600" : "text-gray-600"}`} />
                      {teacher === "Unassigned" ? "Unassigned Students" : `${teacher}'s Students`}
                    </CardTitle>
                    <CardDescription>
                      {studentList.length} {studentList.length === 1 ? "student" : "students"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {studentList.map((student) => {
                        const joinLink = generateJoinLink(student);
                        const isCopied = copiedId === student.id;
                        
                        return (
                          <div
                            key={student.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40 hover:shadow-md transition-shadow"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                  {student.name}
                                </h3>
                                {student.teacher && (
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getTeacherBadgeColor(student.teacher)}`}>
                                    {student.teacher}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <LinkIcon className="h-4 w-4" />
                                <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                  {joinLink}
                                </code>
                              </div>
                              {student.subjects && (
                                <div className="flex gap-2 mt-2">
                                  {student.subjects.English && (
                                    <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                      English
                                    </span>
                                  )}
                                  {student.subjects.IT && (
                                    <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                      IT
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(joinLink, student.id)}
                                className="flex items-center gap-2"
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="h-4 w-4" />
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-4 w-4" />
                                    Copy Link
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => window.open(joinLink, "_blank")}
                                className="flex items-center gap-2"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Open
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-8 text-center">
          <Button
            variant="outline"
            onClick={() => window.location.href = "/"}
            className="mr-2"
          >
            Back to Home
          </Button>
          <Button
            variant="outline"
            onClick={loadStudents}
          >
            Refresh
          </Button>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Students can click their personalized link to join with their name pre-filled</p>
        </div>
      </div>
    </main>
  );
}
