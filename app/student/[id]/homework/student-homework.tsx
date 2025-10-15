"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { fetchStudentHomework, fetchHomeworkReports, fetchAllHomework, fetchQuestionsForHomework, fetchStudentRatings, fetchAllStudentRatings, HomeworkAssignment, HomeworkReport, Question } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Loader2, CheckCircle, Clock, AlertCircle, ArrowLeft, Trophy, Play, HelpCircle, Eye, X, Check, Star, TrendingUp, XCircle } from "lucide-react";

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
  const [viewingResultsFor, setViewingResultsFor] = useState<string | null>(null);
  const [resultsQuestions, setResultsQuestions] = useState<Question[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [studentRating, setStudentRating] = useState<any>(null);
  const [loadingRating, setLoadingRating] = useState(true);
  const [showRatingDetails, setShowRatingDetails] = useState(false);
  const [allStudentRatings, setAllStudentRatings] = useState<any[]>([]);
  const [loadingAllRatings, setLoadingAllRatings] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    loadHomework();
    loadRatings();
  }, [studentId]);
  
  const loadRatings = async () => {
    setLoadingRating(true);
    try {
      const ratings = await fetchStudentRatings(studentId);
      setStudentRating(ratings);
    } catch (error) {
      console.error("Error loading ratings:", error);
    } finally {
      setLoadingRating(false);
    }
  };

  const handleShowRatingDetails = async () => {
    setShowRatingDetails(true);
    
    // Fetch all student ratings for comparison
    if (allStudentRatings.length === 0) {
      setLoadingAllRatings(true);
      try {
        console.log("📊 Fetching all student ratings for leaderboard...");
        // We need to extract teacher key from studentId or pass it as a prop
        // For now, let's assume we can get it from the student rating
        const ratings = await fetchAllStudentRatings();
        console.log("✅ Got all ratings:", ratings);
        
        // Filter out students who have never completed any homework
        const filteredRatings = ratings.filter((rating: any) => 
          rating.completedHomeworks && rating.completedHomeworks > 0
        );
        console.log(`📊 Filtered ratings: ${ratings.length} -> ${filteredRatings.length} (excluding students with 0 completed homework)`);
        
        setAllStudentRatings(filteredRatings);
      } catch (error) {
        console.error("❌ Error fetching all ratings:", error);
      } finally {
        setLoadingAllRatings(false);
      }
    }
  };

  const loadHomework = async () => {
    setLoading(true);
    try {
      const [assignmentsData, reportsData] = await Promise.all([
        fetchStudentHomework(studentId),
        fetchHomeworkReports(studentId)
      ]);
      
      // Sort: Newest first (latest assigned on top)
      const sortedAssignments = assignmentsData.sort((a, b) => {
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
      
      setAssignments(sortedAssignments);
      setReports(reportsData);
      
      // Fetch question counts for each assignment
      const counts: Record<string, { total: number; incomplete: number }> = {};
      await Promise.all(
        sortedAssignments.map(async (assignment) => {
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
  
  const handleViewResults = async (assignment: HomeworkAssignment) => {
    setLoadingResults(true);
    setViewingResultsFor(assignment.id);
    
    try {
      const topicIds = assignment.topicIds || (assignment.topicId ? [assignment.topicId] : []);
      const questions = await fetchQuestionsForHomework(topicIds);
      setResultsQuestions(questions);
    } catch (error) {
      console.error("Error loading questions for results:", error);
      alert("Failed to load results. Please try again.");
      setViewingResultsFor(null);
    } finally {
      setLoadingResults(false);
    }
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
        color: "bg-green-50/80 border-green-200/50",
        score: report.score
      };
    } else if (assignment.status === "completed") {
      return {
        status: "completed",
        icon: <CheckCircle className="h-5 w-5 text-green-600" />,
        label: "Completed",
        color: "bg-green-50/80 border-green-200/50"
      };
    } else {
      return {
        status: "pending",
        icon: <Clock className="h-5 w-5 text-orange-600" />,
        label: "Pending",
        color: "bg-orange-50/80 border-orange-200/50"
      };
    }
  };

  const formatDate = (dateValue: any) => {
    // Return placeholder during SSR to prevent hydration mismatch
    if (!isClient) return "Loading...";
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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 p-4 relative overflow-hidden">
      {/* Animated background elements - Apple-style subtle orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-blue-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="mb-6 mt-8">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mb-4 glass-card hover:glass-hover min-h-[44px] touch-manipulation active:scale-95 select-none"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Welcome Page
          </Button>

          {/* Glass morphism card */}
          <div className="glass-panel rounded-3xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500/90 via-purple-600/90 to-indigo-600/90 p-4 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="glass-surface-dark p-2 sm:p-3 rounded-2xl">
                    <BookOpen className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                      {studentName}'s Homework
                    </h1>
                    <p className="text-white/90 text-sm sm:text-base mt-1">
                      Track your assignments and progress
                    </p>
                  </div>
                </div>
                <div className="w-full sm:w-auto sm:text-right">
                  {!loadingRating && studentRating && studentRating.overallRating && (
                    <div className="w-full sm:w-auto">
                        <div className="flex items-center justify-center sm:justify-end gap-2 sm:gap-3 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 px-3 sm:px-4 py-1.5 sm:py-2 shadow-lg shadow-amber-400/40">
                        <Star className="h-4 w-4 sm:h-5 sm:w-5 text-white fill-white drop-shadow-sm" />
                        <div className="flex items-baseline gap-1 text-white">
                          <span className="text-xl sm:text-2xl font-extrabold">{studentRating.overallRating.toFixed(1)}</span>
                          <span className="text-xs sm:text-sm font-semibold text-white/80">/10</span>
                        </div>
                        </div>
                      <Button
                        size="sm"
                        onClick={handleShowRatingDetails}
                        className="mt-2 w-full sm:w-auto bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-semibold shadow-md min-h-[36px] text-xs"
                      >
                        <TrendingUp className="mr-1 h-3 w-3" />
                        Подробнее
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
                <div className="text-center p-2 sm:p-4 rounded-xl glass-accent-blue">
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">{totalCount}</div>
                  <div className="text-xs sm:text-sm text-gray-600">Total</div>
                </div>
                <div className="text-center p-2 sm:p-4 rounded-xl glass-accent-green">
                  <div className="text-xl sm:text-2xl font-bold text-green-600">{completedCount}</div>
                  <div className="text-xs sm:text-sm text-gray-600">Completed</div>
                </div>
                <div className="text-center p-2 sm:p-4 rounded-xl glass-accent-amber">
                  <div className="text-xl sm:text-2xl font-bold text-orange-600">{totalCount - completedCount}</div>
                  <div className="text-xs sm:text-sm text-gray-600">Pending</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : assignments.length === 0 ? (
          <div className="glass-panel rounded-3xl overflow-hidden">
            <div className="py-12 text-center px-6">
              <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">
                No homework assignments yet.
              </p>
              <p className="text-gray-500 text-sm mt-2">
                Your teacher will assign homework for you to complete via Telegram.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => {
              const statusInfo = getStatusInfo(assignment);
              const report = getReportForAssignment(assignment.id);
              const questionInfo = questionCounts[assignment.id];

              return (
                <div
                  key={assignment.id}
                  className={`glass-card rounded-3xl overflow-hidden ${statusInfo.color}`}
                >
                  <div className="pt-6 px-6 pb-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Status badge and title */}
                        <div className="flex items-center gap-3 mb-3">
                          {statusInfo.icon}
                          <div>
                            <h3 className="font-bold text-xl text-gray-900">
                              {assignment.topicName || assignment.chapterName || assignment.courseName || "Homework"}
                            </h3>
                          </div>
                        </div>
                        
                        {/* Course/Chapter info in prominent boxes - only show if data exists */}
                        {(assignment.courseName || assignment.chapterName) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                            {assignment.courseName && (
                              <div className="glass-accent-blue px-3 py-2 rounded-lg">
                                <div className="text-xs text-blue-600 font-semibold">COURSE</div>
                                <div className="text-sm font-bold text-blue-900">{assignment.courseName}</div>
                              </div>
                            )}
                            {assignment.chapterName && (
                              <div className="glass-accent-purple px-3 py-2 rounded-lg">
                                <div className="text-xs text-purple-600 font-semibold">CHAPTER</div>
                                <div className="text-sm font-bold text-purple-900">{assignment.chapterName}</div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Additional info */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
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
                            ? "bg-green-100 text-green-800"
                            : "bg-orange-100 text-orange-800"
                        }`}>
                          {statusInfo.label}
                        </div>
                        
                        {report && report.correctAnswers !== undefined && report.totalQuestions !== undefined && (
                          <div className="mt-2 flex items-center gap-1 justify-end">
                            <Trophy className="h-4 w-4 text-yellow-600" />
                            <span className="text-lg font-bold text-yellow-600">
                              {report.correctAnswers ?? 0}/{report.totalQuestions ?? 0}
                            </span>
                          </div>
                        )}
                        {/* Debug info - remove after testing */}
                        {report && (
                          <div className="mt-1 text-xs text-gray-500 text-right">
                            Score: {report.score}% | CA: {report.correctAnswers} | TQ: {report.totalQuestions}
                          </div>
                        )}
                      </div>
                    </div>

                    {statusInfo.status === "completed" && report && (
                      <div className="mt-4">
                        <Button
                          onClick={() => handleViewResults(assignment)}
                          variant="outline"
                          className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200 text-blue-700 font-semibold min-h-[44px] touch-manipulation active:scale-95"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Results & Answers
                        </Button>
                      </div>
                    )}

                    {statusInfo.status === "pending" && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-xl rounded-lg border border-blue-200/50">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-start gap-2 flex-1">
                            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-gray-700">
                              <strong>Ready to start?</strong> Click the button to begin answering questions.
                            </div>
                          </div>
                          <Button
                            onClick={() => handleStartHomework(assignment.id)}
                            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-md min-h-[44px] touch-manipulation active:scale-95 select-none"
                          >
                            <Play className="mr-2 h-4 w-4" />
                            Start Homework
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>📝 Answer quiz questions to complete your homework and see your score</p>
        </div>
      </div>
      
      {/* Results Modal */}
      {viewingResultsFor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 sm:p-6 text-white">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <Trophy className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg sm:text-2xl font-bold truncate">Homework Results</h2>
                    {(() => {
                      const assignment = assignments.find(a => a.id === viewingResultsFor);
                      const report = getReportForAssignment(viewingResultsFor);
                      return (
                        <p className="text-blue-100 mt-1 text-sm sm:text-base truncate">
                          {assignment?.topicName || "Homework"} - Score: {report?.score}%
                        </p>
                      );
                    })()}
                  </div>
                </div>
                <button
                  onClick={() => setViewingResultsFor(null)}
                  className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {loadingResults ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="space-y-6">
                  {resultsQuestions.map((question, index) => {
                    const report = getReportForAssignment(viewingResultsFor);
                    
                    // Enhanced answer extraction with better debugging
                    const submittedAnswerObj = report?.submittedAnswers?.find(
                      (a: any) => a.questionId === question.id
                    );
                    const submittedAnswer = submittedAnswerObj?.answer;
                    
                    // Debug: Log the first question to understand the data structure
                    if (index === 0) {
                      console.log('🔍 First Question Debug:', {
                        questionId: question.id,
                        submittedAnswerObj,
                        submittedAnswer,
                        allSubmittedAnswers: report?.submittedAnswers,
                        reportExists: !!report,
                        submittedAnswersExists: !!report?.submittedAnswers,
                        submittedAnswersLength: report?.submittedAnswers?.length
                      });
                    }
                    
                    // More robust correctness check
                    let isCorrect = false;
                    if (submittedAnswer !== undefined && submittedAnswer !== null && submittedAnswer !== "") {
                      // If correctAnswer is a number (index), compare it with the option at that index
                      if (typeof question.correctAnswer === 'number' && question.options) {
                        const correctOption = question.options[question.correctAnswer];
                        isCorrect = String(submittedAnswer) === String(correctOption);
                      } else {
                        // Direct string comparison
                        isCorrect = String(submittedAnswer) === String(question.correctAnswer);
                      }
                    }
                    
                    // Debug logging to see what data we have
                    console.log(`Question ${index + 1}:`, {
                      questionId: question.id,
                      submittedAnswer,
                      correctAnswer: question.correctAnswer,
                      correctAnswerType: typeof question.correctAnswer,
                      options: question.options,
                      isCorrect,
                      allSubmittedAnswers: report?.submittedAnswers
                    });
                    
                    return (
                      <div
                        key={question.id}
                        className={`border-2 rounded-2xl p-5 ${
                          isCorrect
                            ? "bg-green-50/50 border-green-300"
                            : "bg-red-50/50 border-red-300"
                        }`}
                      >
                        {/* Question Header */}
                        <div className="flex items-start gap-3 mb-4">
                          <div
                            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              isCorrect
                                ? "bg-green-500 text-white"
                                : "bg-red-500 text-white"
                            }`}
                          >
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-gray-900">
                              {question.text || question.question}
                            </h3>
                            {question.sentence && (
                              <p className="text-gray-700 mt-1">{question.sentence}</p>
                            )}
                          </div>
                          {isCorrect ? (
                            <Check className="h-6 w-6 text-green-600 flex-shrink-0" />
                          ) : (
                            <X className="h-6 w-6 text-red-600 flex-shrink-0" />
                          )}
                        </div>
                        
                        {/* Media */}
                        {(question.mediaUrl || question.imageUrl || question.audioUrl || question.videoUrl) && (
                          <div className="mb-4">
                            {(question.mediaType === "image" || question.imageUrl) && (
                              <img
                                src={question.mediaUrl || question.imageUrl}
                                alt="Question media"
                                className="max-w-full h-auto rounded-lg"
                              />
                            )}
                            {(question.mediaType === "audio" || question.audioUrl) && (
                              <audio controls className="w-full">
                                <source src={question.mediaUrl || question.audioUrl} />
                              </audio>
                            )}
                            {(question.mediaType === "video" || question.videoUrl) && (
                              <video controls className="w-full max-h-64 rounded-lg">
                                <source src={question.mediaUrl || question.videoUrl} />
                              </video>
                            )}
                          </div>
                        )}
                        
                        {/* Options (for multiple choice) */}
                        {question.options && question.options.length > 0 && (
                          <div className="space-y-2 mb-4">
                            {question.options.map((option, optIndex) => {
                              // Determine if this option is the correct answer
                              let isThisCorrect = false;
                              if (typeof question.correctAnswer === 'number') {
                                // correctAnswer is an index
                                isThisCorrect = optIndex === question.correctAnswer;
                              } else {
                                // correctAnswer is the text
                                isThisCorrect = String(question.correctAnswer).trim().toLowerCase() === String(option).trim().toLowerCase();
                              }
                              
                              // Determine if this option was selected by the student
                              // Fixed: More lenient comparison that handles undefined/null/empty string cases
                              let isThisSelected = false;
                              if (submittedAnswer !== undefined && submittedAnswer !== null && submittedAnswer !== "") {
                                const submittedStr = String(submittedAnswer).trim().toLowerCase();
                                const optionStr = String(option).trim().toLowerCase();
                                isThisSelected = submittedStr === optionStr;
                                
                                // Debug log for troubleshooting
                                if (index === 0 && optIndex === 0) {
                                  console.log(`Q${index + 1} Option comparison:`, {
                                    option,
                                    submittedAnswer,
                                    submittedStr,
                                    optionStr,
                                    isThisSelected,
                                    isThisCorrect,
                                    match: submittedStr === optionStr
                                  });
                                }
                              }
                              
                              return (
                                <div
                                  key={optIndex}
                                  className={`p-3 rounded-lg border-2 transition-all ${
                                    isThisCorrect && isThisSelected
                                      ? "bg-green-100 border-green-400 font-semibold shadow-md"
                                      : isThisCorrect
                                      ? "bg-green-50 border-green-300"
                                      : isThisSelected
                                      ? "bg-red-100 border-red-400 shadow-md"
                                      : "bg-white border-gray-200"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <span className={isThisSelected ? "font-bold text-gray-900" : "text-gray-700"}>{option}</span>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {isThisSelected && (
                                        <span className={`text-sm font-bold flex items-center gap-1 px-2 py-1 rounded-md ${
                                          isThisCorrect 
                                            ? "text-green-700 bg-green-200" 
                                            : "text-red-700 bg-red-200"
                                        }`}>
                                          {isThisCorrect ? (
                                            <>
                                              <Check className="h-4 w-4" /> Your Answer
                                            </>
                                          ) : (
                                            <>
                                              <X className="h-4 w-4" /> Your Answer
                                            </>
                                          )}
                                        </span>
                                      )}
                                      {isThisCorrect && !isThisSelected && (
                                        <span className="text-green-700 text-sm font-bold flex items-center gap-1 px-2 py-1 rounded-md bg-green-200">
                                          <Check className="h-4 w-4" /> Correct Answer
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {/* Answer Summary (for text answers or fill-in-blank) */}
                        {(!question.options || question.options.length === 0) && (
                          <div className="space-y-2 mb-3">
                            <div className={`p-4 rounded-lg border-2 ${
                              isCorrect 
                                ? "bg-green-50 border-green-300" 
                                : "bg-red-50 border-red-300"
                            }`}>
                              <div className="flex items-center gap-2 mb-2">
                                {isCorrect ? (
                                  <Check className="h-5 w-5 text-green-600" />
                                ) : (
                                  <X className="h-5 w-5 text-red-600" />
                                )}
                                <div className={`text-sm font-bold ${
                                  isCorrect ? "text-green-700" : "text-red-700"
                                }`}>
                                  Your Answer:
                                </div>
                              </div>
                              <div className={`font-bold text-lg ${
                                isCorrect ? "text-green-900" : "text-red-900"
                              }`}>
                                {submittedAnswer || "(No answer provided)"}
                              </div>
                            </div>
                            {!isCorrect && (
                              <div className="p-4 rounded-lg bg-green-50 border-2 border-green-300">
                                <div className="flex items-center gap-2 mb-2">
                                  <Check className="h-5 w-5 text-green-600" />
                                  <div className="text-sm font-bold text-green-700">Correct Answer:</div>
                                </div>
                                <div className="font-bold text-lg text-green-900">
                                  {typeof question.correctAnswer === 'number' && question.options 
                                    ? question.options[question.correctAnswer] 
                                    : question.correctAnswer}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Explanation */}
                        {question.explanation && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="text-sm font-semibold text-blue-700 mb-1">💡 Explanation:</div>
                            <div className="text-sm text-gray-700">{question.explanation}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="border-t p-4 bg-gray-50">
              <Button
                onClick={() => setViewingResultsFor(null)}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Rating Details Modal */}
      {showRatingDetails && studentRating && (
        <div className="fixed inset-0 glass-backdrop-strong z-50 flex items-center justify-center p-4">
          <div className="glass-modal rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-yellow-500 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Star className="h-8 w-8" />
                  <div>
                    <h2 className="text-2xl font-bold">Рейтинг всех учеников</h2>
                    <p className="text-amber-100 mt-1">Сравни свои результаты с другими</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRatingDetails(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            {/* Content - Leaderboard */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingAllRatings ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Загрузка рейтинга...</p>
                  </div>
                </div>
              ) : allStudentRatings.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Общий рейтинг</h3>
                  {allStudentRatings.map((rating, index) => {
                    const isCurrentStudent = rating.studentId === studentId;
                    const medalEmoji = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "";
                    
                    return (
                      <div
                        key={rating.studentId}
                        className={`rounded-xl p-4 border-2 transition-all ${
                          isCurrentStudent
                            ? "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300 shadow-lg"
                            : "bg-white border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                              isCurrentStudent
                                ? "bg-amber-600 text-white"
                                : "bg-gray-100 text-gray-600"
                            }`}>
                              {medalEmoji || rating.rank}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`font-semibold ${isCurrentStudent ? "text-amber-900" : "text-gray-900"}`}>
                                  {rating.studentName}
                                </span>
                                {isCurrentStudent && (
                                  <span className="text-xs bg-amber-600 text-white px-2 py-0.5 rounded-full font-medium">
                                    Это ты!
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {rating.completedHomeworks} из {rating.totalAssigned} заданий
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-600">
                              балл: {rating.overallRating.toFixed(1)}/10
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600">Нет данных для отображения</p>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="border-t p-4 bg-gray-50">
              <Button
                onClick={() => setShowRatingDetails(false)}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white"
              >
                Закрыть
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
