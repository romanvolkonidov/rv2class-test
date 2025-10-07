"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchStudentHomework, fetchHomeworkReports, fetchAllHomework, fetchQuestionsForHomework, HomeworkAssignment, HomeworkReport, Question } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Loader2, CheckCircle, Clock, AlertCircle, ArrowLeft, Trophy, Play, HelpCircle } from "lucide-react";

interface HomeworkPageProps {
  studentId: string;
  studentName: string;
}

export default function StudentHomework({ studentId, studentName }: HomeworkPageProps) {
  const router = useRouter();
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([]);
  const [reports, setReports] = useState<HomeworkReport[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<string, { total: number; incomplete: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHomework();
  }, [studentId]);

  const loadHomework = async () => {
    setLoading(true);
    try {
      const [assignmentsData, reportsData] = await Promise.all([
        fetchStudentHomework(studentId),
        fetchHomeworkReports(studentId)
      ]);
      
      // Filter: Only show homework assigned from October 7, 2025 onwards
      const cutoffDate = new Date('2025-10-07T00:00:00.000Z');
      const filteredAssignments = assignmentsData.filter(assignment => {
        if (!assignment.assignedAt) return true; // Keep if no date
        
        let assignedDate;
        if (assignment.assignedAt.toDate && typeof assignment.assignedAt.toDate === "function") {
          assignedDate = assignment.assignedAt.toDate();
        } else if (assignment.assignedAt instanceof Date) {
          assignedDate = assignment.assignedAt;
        } else if (assignment.assignedAt.seconds !== undefined) {
          assignedDate = new Date(assignment.assignedAt.seconds * 1000);
        } else if (typeof assignment.assignedAt === "string" || typeof assignment.assignedAt === "number") {
          assignedDate = new Date(assignment.assignedAt);
        } else {
          return true; // Keep if can't parse date
        }
        
        return assignedDate >= cutoffDate;
      });
      
      // Sort: Newest first (latest assigned on top)
      filteredAssignments.sort((a, b) => {
        const getTime = (dateValue: any) => {
          if (!dateValue) return 0;
          if (dateValue.toDate && typeof dateValue.toDate === "function") {
            return dateValue.toDate().getTime();
          } else if (dateValue instanceof Date) {
            return dateValue.getTime();
          } else if (dateValue.seconds !== undefined) {
            return dateValue.seconds * 1000;
          } else if (typeof dateValue === "string" || typeof dateValue === "number") {
            return new Date(dateValue).getTime();
          }
          return 0;
        };
        
        return getTime(b.assignedAt) - getTime(a.assignedAt); // Descending order
      });
      
      setAssignments(filteredAssignments);
      setReports(reportsData);
      
      // Fetch question counts for each assignment
      const counts: Record<string, { total: number; incomplete: number }> = {};
      await Promise.all(
        filteredAssignments.map(async (assignment) => {
          const topicIds = assignment.topicIds || (assignment.topicId ? [assignment.topicId] : []);
          if (topicIds.length > 0) {
            const questions = await fetchQuestionsForHomework(topicIds);
            counts[assignment.id] = {
              total: questions.length,
              incomplete: 0
            };
          }
        })
      );
      setQuestionCounts(counts);
    } catch (error) {
      console.error("Error loading homework:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartHomework = (assignmentId: string) => {
    router.push(`/student/${studentId}/homework/${assignmentId}`);
  };

  const getReportForAssignment = (assignmentId: string) => {
    return reports.find(r => r.homeworkId === assignmentId);
  };

  const getStatusInfo = (assignment: HomeworkAssignment) => {
    const report = getReportForAssignment(assignment.id);
    
    if (report) {
      return {
        status: "completed",
        icon: <CheckCircle className="h-5 w-5 text-green-600" />,
        label: "Completed",
        color: "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800",
        score: report.score
      };
    } else if (assignment.status === "completed") {
      return {
        status: "completed",
        icon: <CheckCircle className="h-5 w-5 text-green-600" />,
        label: "Completed",
        color: "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
      };
    } else {
      return {
        status: "pending",
        icon: <Clock className="h-5 w-5 text-orange-600" />,
        label: "Pending",
        color: "bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800"
      };
    }
  };

  const formatDate = (dateValue: any) => {
    if (!dateValue) return "Unknown date";
    
    try {
      let date;
      
      if (dateValue.toDate && typeof dateValue.toDate === "function") {
        date = dateValue.toDate();
      } else if (dateValue instanceof Date) {
        date = dateValue;
      } else if (dateValue.seconds !== undefined) {
        date = new Date(dateValue.seconds * 1000);
      } else if (typeof dateValue === "string" || typeof dateValue === "number") {
        date = new Date(dateValue);
      } else {
        return "Invalid date";
      }
      
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }
      
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Date error";
    }
  };

  const completedCount = assignments.filter(a => {
    const status = getStatusInfo(a);
    return status.status === "completed";
  }).length;

  const totalCount = assignments.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 mt-8">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Welcome Page
          </Button>

          <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-10 w-10" />
                  <div>
                    <CardTitle className="text-3xl font-bold">
                      {studentName}'s Homework
                    </CardTitle>
                    <CardDescription className="text-purple-100 text-lg mt-1">
                      Track your assignments and progress
                    </CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold">{completionPercentage}%</div>
                  <div className="text-sm text-purple-100">Completed</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <div className="text-2xl font-bold text-blue-600">{totalCount}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <div className="text-2xl font-bold text-green-600">{completedCount}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                  <div className="text-2xl font-bold text-orange-600">{totalCount - completedCount}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : assignments.length === 0 ? (
          <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80">
            <CardContent className="py-12 text-center">
              <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                No homework assignments yet.
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                Your teacher will assign homework for you to complete via Telegram.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => {
              const statusInfo = getStatusInfo(assignment);
              const report = getReportForAssignment(assignment.id);
              const questionInfo = questionCounts[assignment.id];

              return (
                <Card
                  key={assignment.id}
                  className={`backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 border-2 ${statusInfo.color}`}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Status badge and title */}
                        <div className="flex items-center gap-3 mb-3">
                          {statusInfo.icon}
                          <div>
                            <h3 className="font-bold text-xl text-gray-900 dark:text-gray-100">
                              {assignment.topicName || assignment.chapterName || assignment.courseName || "Homework"}
                            </h3>
                          </div>
                        </div>
                        
                        {/* Course/Chapter info in prominent boxes - only show if data exists */}
                        {(assignment.courseName || assignment.chapterName) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                            {assignment.courseName && (
                              <div className="bg-blue-50 dark:bg-blue-900/30 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800">
                                <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold">COURSE</div>
                                <div className="text-sm font-bold text-blue-900 dark:text-blue-100">{assignment.courseName}</div>
                              </div>
                            )}
                            {assignment.chapterName && (
                              <div className="bg-purple-50 dark:bg-purple-900/30 px-3 py-2 rounded-lg border border-purple-200 dark:border-purple-800">
                                <div className="text-xs text-purple-600 dark:text-purple-400 font-semibold">CHAPTER</div>
                                <div className="text-sm font-bold text-purple-900 dark:text-purple-100">{assignment.chapterName}</div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Additional info */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            📅 <span className="font-medium">{formatDate(assignment.assignedAt)}</span>
                          </div>
                          {questionInfo && (
                            <div className="flex items-center gap-2">
                              <HelpCircle className="h-4 w-4" />
                              <span className="font-medium">{questionInfo.total} question{questionInfo.total !== 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end gap-2">
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
                          statusInfo.status === "completed" 
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                        }`}>
                          {statusInfo.label}
                        </div>
                        
                        {report && report.score !== undefined && (
                          <div className="mt-2 flex items-center gap-1 justify-end">
                            <Trophy className="h-4 w-4 text-yellow-600" />
                            <span className="text-lg font-bold text-yellow-600">
                              {report.score}%
                            </span>
                            {report.correctAnswers !== undefined && report.totalQuestions !== undefined && (
                              <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                                ({report.correctAnswers}/{report.totalQuestions})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {statusInfo.status === "pending" && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-start gap-2 flex-1">
                            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                              <strong>Ready to start?</strong> Click the button to begin answering questions.
                            </div>
                          </div>
                          <Button
                            onClick={() => handleStartHomework(assignment.id)}
                            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-md"
                          >
                            <Play className="mr-2 h-4 w-4" />
                            Start Homework
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>📝 Answer quiz questions to complete your homework and see your score</p>
        </div>
      </div>
    </main>
  );
}
