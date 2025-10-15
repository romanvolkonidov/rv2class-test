"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAllCompletedHomework, markHomeworkAsSeen, HomeworkReport } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Loader2, ArrowLeft, User, Clock, Trophy, CheckCircle, Eye, X } from "lucide-react";

export default function TeacherHomeworksPage() {
  const router = useRouter();
  const [homeworks, setHomeworks] = useState<Array<HomeworkReport & { studentName?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [viewingReport, setViewingReport] = useState<(HomeworkReport & { studentName?: string }) | null>(null);
  const [viewingAnswers, setViewingAnswers] = useState<any[]>([]);
  const [loadingAnswers, setLoadingAnswers] = useState(false);

  useEffect(() => {
    loadHomeworks();
  }, []);

  const loadHomeworks = async () => {
    setLoading(true);
    try {
      const data = await fetchAllCompletedHomework();
      setHomeworks(data);
    } catch (error) {
      console.error("Error loading homeworks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = async (report: HomeworkReport & { studentName?: string }) => {
    setViewingReport(report);
    setLoadingAnswers(true);
    
    try {
      // Mark as seen by teacher
      if (!report.seenByTeacher) {
        await markHomeworkAsSeen(report.id);
        // Update local state
        setHomeworks(prev => prev.map(hw => 
          hw.id === report.id ? { ...hw, seenByTeacher: true } : hw
        ));
      }

      // Load questions to show answers
      if (report.submittedAnswers && Array.isArray(report.submittedAnswers)) {
        setViewingAnswers(report.submittedAnswers);
      }
    } catch (error) {
      console.error("Error viewing report:", error);
    } finally {
      setLoadingAnswers(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Unknown date";
    
    try {
      let date: Date;
      
      if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else {
        date = new Date(timestamp);
      }
      
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Date error";
    }
  };

  const unseenCount = homeworks.filter(hw => !hw.seenByTeacher).length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="mb-6 mt-8">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mb-4 glass-card hover:glass-hover min-h-[44px] touch-manipulation active:scale-95 select-none"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>

          {/* Header */}
          <div className="glass-panel rounded-3xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500/90 via-purple-600/90 to-indigo-600/90 p-8">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="glass-surface-dark p-3 rounded-2xl">
                    <BookOpen className="h-10 w-10 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-semibold text-white tracking-tight">
                      All Completed Homework
                    </h1>
                    <p className="text-white/90 text-base mt-1">
                      Review student submissions
                    </p>
                  </div>
                </div>
                {unseenCount > 0 && (
                  <div className="bg-red-500 text-white rounded-full px-4 py-2 font-bold text-lg shadow-lg">
                    {unseenCount} new
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : homeworks.length === 0 ? (
          <div className="glass-panel rounded-3xl overflow-hidden">
            <div className="py-12 text-center px-6">
              <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">
                No homework submissions yet.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {homeworks.map((homework) => (
              <div
                key={homework.id}
                className={`glass-card rounded-3xl overflow-hidden ${
                  !homework.seenByTeacher ? 'ring-2 ring-red-400' : ''
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <User className="h-5 w-5 text-purple-600" />
                        <h3 className="font-bold text-xl text-gray-900">
                          {homework.studentName || "Unknown Student"}
                        </h3>
                        {!homework.seenByTeacher && (
                          <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                            NEW
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatDate(homework.completedAt)}</span>
                        </div>
                        {homework.score !== undefined && (
                          <div className="flex items-center gap-1">
                            <Trophy className="h-4 w-4 text-yellow-600" />
                            <span className="font-bold text-yellow-600">
                              {homework.score}%
                            </span>
                          </div>
                        )}
                        {homework.correctAnswers !== undefined && homework.totalQuestions !== undefined && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="font-medium">
                              {homework.correctAnswers}/{homework.totalQuestions} correct
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      onClick={() => handleViewReport(homework)}
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {viewingReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Trophy className="h-8 w-8" />
                  <div>
                    <h2 className="text-2xl font-bold">{viewingReport.studentName}</h2>
                    <p className="text-blue-100 mt-1">
                      Score: {viewingReport.score}% | {viewingReport.correctAnswers}/{viewingReport.totalQuestions} correct
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setViewingReport(null)}
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingAnswers ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : viewingAnswers.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Submitted Answers</h3>
                  {viewingAnswers.map((answer, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm text-gray-600">Question {index + 1}</p>
                          <p className="font-medium text-gray-900 mt-1">{answer.answer}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600">No detailed answers available</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t p-4 bg-gray-50">
              <div className="flex gap-2 justify-between">
                <div className="text-sm text-gray-600">
                  Completed: {formatDate(viewingReport.completedAt)}
                </div>
                <Button
                  onClick={() => setViewingReport(null)}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
