"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchStudentHomework, fetchQuestionsForHomework, submitHomeworkAnswers, Question, HomeworkAssignment } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Loader2, CheckCircle, ArrowLeft, AlertCircle, Trophy, Volume2, Film, Image as ImageIcon } from "lucide-react";

interface HomeworkQuizProps {
  studentId: string;
  studentName: string;
  homeworkId: string;
}

export default function HomeworkQuiz({ studentId, studentName, homeworkId }: HomeworkQuizProps) {
  const router = useRouter();
  const [assignment, setAssignment] = useState<HomeworkAssignment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<{ [questionId: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<{ score: number; correctAnswers: number; totalQuestions: number } | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  useEffect(() => {
    loadHomeworkQuiz();
  }, [homeworkId, studentId]);

  const loadHomeworkQuiz = async () => {
    setLoading(true);
    try {
      // Fetch the assignment
      const assignments = await fetchStudentHomework(studentId);
      const hw = assignments.find(a => a.id === homeworkId);
      
      if (!hw) {
        alert("Homework not found!");
        router.back();
        return;
      }

      // Check if already completed
      if (hw.status === "completed") {
        alert("This homework has already been completed!");
        router.back();
        return;
      }

      setAssignment(hw);

      // Try both topicIds (array) and topicId (singular)
      let topicIds = hw.topicIds || [];
      if (topicIds.length === 0 && hw.topicId) {
        topicIds = [hw.topicId];
      }
      
      const questionsData = await fetchQuestionsForHomework(topicIds);
      
      if (questionsData.length === 0) {
        alert("No questions found for this homework!");
        router.back();
        return;
      }

      setQuestions(questionsData);
    } catch (error) {
      console.error("Error loading homework quiz:", error);
      alert("Failed to load homework. Please try again.");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    // Check if all questions are answered
    const unansweredCount = questions.length - Object.keys(answers).length;
    if (unansweredCount > 0) {
      const confirm = window.confirm(
        `You have ${unansweredCount} unanswered question(s). Submit anyway?`
      );
      if (!confirm) return;
    }

    setSubmitting(true);
    try {
      const answerArray = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer
      }));

      // Validation: Ensure we have answers to submit
      if (answerArray.length === 0) {
        console.error('❌ ERROR: No answers to submit!');
        alert("Error: No answers to submit. Please answer at least one question.");
        setSubmitting(false);
        return;
      }

      console.log('🚀 Submitting homework answers to database...');
      console.log('   Homework ID:', homeworkId);
      console.log('   Student ID:', studentId);
      console.log('   Answers count:', answerArray.length);
      console.log('   Questions count:', questions.length);
      console.log('   Sample answer:', answerArray[0]);
      console.log('   All answers:', answerArray);

      const result = await submitHomeworkAnswers(
        homeworkId,
        studentId,
        answerArray,
        questions
      );

      console.log('📥 Submission result:', result);

      if (result.success) {
        console.log('✅ Homework submitted successfully!');
        console.log('   Score:', result.score + '%');
        console.log('   Correct:', result.correctAnswers, '/', result.totalQuestions);
        setResults(result);
        setSubmitted(true);
      } else {
        console.error('❌ Submission failed - result.success is false');
        alert("Failed to submit homework. Please try again.");
      }
    } catch (error) {
      console.error("❌ ERROR submitting homework:", error);
      console.error("   Error details:", error instanceof Error ? error.message : 'Unknown error');
      alert("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
      </main>
    );
  }

  if (submitted && results) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <div className="max-w-2xl mx-auto mt-8">
          <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg text-center">
              <CheckCircle className="h-20 w-20 mx-auto mb-4" />
              <CardTitle className="text-4xl font-bold">Homework Complete!</CardTitle>
              <CardDescription className="text-green-100 text-lg mt-2">
                Great job, {studentName}!
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-8 pb-8">
              <div className="text-center space-y-6">
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl p-8 border-2 border-yellow-300 dark:border-yellow-700">
                  <Trophy className="h-16 w-16 text-yellow-600 mx-auto mb-4" />
                  <div className="text-6xl font-bold text-yellow-600 mb-2">{results.score}%</div>
                  <div className="text-xl text-gray-700 dark:text-gray-300">
                    {results.correctAnswers} out of {results.totalQuestions} correct
                  </div>
                </div>

                <div className="space-y-2 text-gray-600 dark:text-gray-400">
                  <p className="text-lg">
                    {results.score === 100 && "🎉 Perfect score! Outstanding work!"}
                    {results.score >= 80 && results.score < 100 && "⭐ Excellent work! Keep it up!"}
                    {results.score >= 60 && results.score < 80 && "👍 Good job! Keep practicing!"}
                    {results.score < 60 && "💪 Keep studying and you'll improve!"}
                  </p>
                </div>

                <Button
                  onClick={() => router.push(`/student/${studentId}/homework`)}
                  className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold px-8 py-6 text-lg"
                >
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Back to Homework List
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

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
            Back
          </Button>

          <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-t-lg">
              <div className="flex items-center gap-3">
                <BookOpen className="h-10 w-10" />
                <div>
                  <CardTitle className="text-3xl font-bold">
                    {assignment?.topicName || "Homework Quiz"}
                  </CardTitle>
                  <CardDescription className="text-purple-100 text-lg mt-1">
                    Answer all questions to complete this homework
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-blue-900 dark:text-blue-100">
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </span>
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    {Object.keys(answers).length} answered
                  </div>
                </div>
                <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Question */}
        {questions.length > 0 && (
          <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80">
            <CardContent className="pt-6">
              {/* Homework-level media (shown for all questions) */}
              {assignment?.homeworkMediaFiles && assignment.homeworkMediaFiles.length > 0 && (
                <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border-2 border-indigo-200 dark:border-indigo-800">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="h-5 w-5 text-indigo-600" />
                    <span className="font-semibold text-indigo-900 dark:text-indigo-100">Homework Materials</span>
                  </div>
                  <div className="space-y-3">
                    {assignment.homeworkMediaFiles.map((file, fileIndex) => (
                      <div key={fileIndex}>
                        {/* Image */}
                        {file.type === 'image' && (
                          <div className="rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                            <div className="bg-gray-100 dark:bg-gray-800 p-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <ImageIcon className="h-4 w-4" />
                              <span>Reference Image</span>
                            </div>
                            <img 
                              src={file.url} 
                              alt="Homework reference" 
                              className="w-full max-h-96 object-contain bg-white dark:bg-gray-900"
                            />
                          </div>
                        )}
                        
                        {/* Audio */}
                        {file.type === 'audio' && (
                          <div className="rounded-lg border-2 border-indigo-200 dark:border-indigo-700 p-4 bg-white dark:bg-gray-900">
                            <div className="flex items-center gap-3 mb-2">
                              <Volume2 className="h-5 w-5 text-indigo-600" />
                              <span className="font-semibold text-indigo-900 dark:text-indigo-100">Listen to the audio</span>
                            </div>
                            <audio 
                              controls 
                              className="w-full"
                              src={file.url}
                            >
                              Your browser does not support the audio element.
                            </audio>
                          </div>
                        )}
                        
                        {/* Video */}
                        {file.type === 'video' && (
                          <div className="rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                            <div className="bg-gray-100 dark:bg-gray-800 p-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <Film className="h-4 w-4" />
                              <span>Watch the video</span>
                            </div>
                            <video 
                              controls 
                              className="w-full bg-black"
                              src={file.url}
                            >
                              Your browser does not support the video element.
                            </video>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mb-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    {currentQuestionIndex + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-4">
                      {questions[currentQuestionIndex].text}
                    </p>
                      
                    <div className="space-y-3 mb-4">
                      {/* Handle mediaFiles array */}
                      {questions[currentQuestionIndex].mediaFiles && questions[currentQuestionIndex].mediaFiles!.length > 0 && (
                        <>
                          {questions[currentQuestionIndex].mediaFiles!.map((file, fileIndex) => (
                              <div key={fileIndex}>
                                {/* Image */}
                                {file.type === 'image' && (
                                  <div className="rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                                    <div className="bg-gray-100 dark:bg-gray-800 p-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                      <ImageIcon className="h-4 w-4" />
                                      <span>Question Image</span>
                                    </div>
                                    <img 
                                      src={file.url} 
                                      alt="Question illustration" 
                                      className="w-full max-h-96 object-contain bg-white dark:bg-gray-900"
                                    />
                                  </div>
                                )}
                                
                                {/* Audio */}
                                {file.type === 'audio' && (
                                  <div className="rounded-lg border-2 border-gray-200 dark:border-gray-700 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                                    <div className="flex items-center gap-3 mb-2">
                                      <Volume2 className="h-5 w-5 text-blue-600" />
                                      <span className="font-semibold text-blue-900 dark:text-blue-100">Listen to the audio</span>
                                    </div>
                                    <audio 
                                      controls 
                                      className="w-full"
                                      src={file.url}
                                    >
                                      Your browser does not support the audio element.
                                    </audio>
                                  </div>
                                )}
                                
                                {/* Video */}
                                {file.type === 'video' && (
                                  <div className="rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                                    <div className="bg-gray-100 dark:bg-gray-800 p-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                      <Film className="h-4 w-4" />
                                      <span>Watch the video</span>
                                    </div>
                                    <video 
                                      controls 
                                      className="w-full bg-black"
                                      src={file.url}
                                    >
                                      Your browser does not support the video element.
                                    </video>
                                  </div>
                                )}
                              </div>
                            ))}
                          </>
                        )}
                        
                        {/* Fallback: Handle single mediaUrl/mediaType */}
                        {!questions[currentQuestionIndex].mediaFiles && questions[currentQuestionIndex].mediaUrl && questions[currentQuestionIndex].mediaType && (
                          <>
                            {questions[currentQuestionIndex].mediaType === 'image' && (
                              <div className="rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                                <div className="bg-gray-100 dark:bg-gray-800 p-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                  <ImageIcon className="h-4 w-4" />
                                  <span>Question Image</span>
                                </div>
                                <img 
                                  src={questions[currentQuestionIndex].mediaUrl} 
                                  alt="Question illustration" 
                                  className="w-full max-h-96 object-contain bg-white dark:bg-gray-900"
                                />
                              </div>
                            )}
                            
                            {questions[currentQuestionIndex].mediaType === 'audio' && (
                              <div className="rounded-lg border-2 border-gray-200 dark:border-gray-700 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                                <div className="flex items-center gap-3 mb-2">
                                  <Volume2 className="h-5 w-5 text-blue-600" />
                                  <span className="font-semibold text-blue-900 dark:text-blue-100">Listen to the audio</span>
                                </div>
                                <audio 
                                  controls 
                                  className="w-full"
                                  src={questions[currentQuestionIndex].mediaUrl}
                                >
                                  Your browser does not support the audio element.
                                </audio>
                              </div>
                            )}
                            
                            {questions[currentQuestionIndex].mediaType === 'video' && (
                              <div className="rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                                <div className="bg-gray-100 dark:bg-gray-800 p-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                  <Film className="h-4 w-4" />
                                  <span>Watch the video</span>
                                </div>
                                <video 
                                  controls 
                                  className="w-full bg-black"
                                  src={questions[currentQuestionIndex].mediaUrl}
                                >
                                  Your browser does not support the video element.
                                </video>
                              </div>
                            )}
                          </>
                        )}
                        
                        {/* Legacy support: individual audioUrl, videoUrl, imageUrl */}
                        {questions[currentQuestionIndex].imageUrl && (
                          <div className="rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                            <div className="bg-gray-100 dark:bg-gray-800 p-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <ImageIcon className="h-4 w-4" />
                              <span>Question Image</span>
                            </div>
                            <img 
                              src={questions[currentQuestionIndex].imageUrl} 
                              alt="Question illustration" 
                              className="w-full max-h-96 object-contain bg-white dark:bg-gray-900"
                            />
                          </div>
                        )}
                        
                        {questions[currentQuestionIndex].audioUrl && (
                          <div className="rounded-lg border-2 border-gray-200 dark:border-gray-700 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                            <div className="flex items-center gap-3 mb-2">
                              <Volume2 className="h-5 w-5 text-blue-600" />
                              <span className="font-semibold text-blue-900 dark:text-blue-100">Listen to the audio</span>
                            </div>
                            <audio 
                              controls 
                              className="w-full"
                              src={questions[currentQuestionIndex].audioUrl}
                            >
                              Your browser does not support the audio element.
                            </audio>
                          </div>
                        )}
                        
                        {questions[currentQuestionIndex].videoUrl && (
                          <div className="rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                            <div className="bg-gray-100 dark:bg-gray-800 p-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <Film className="h-4 w-4" />
                              <span>Watch the video</span>
                            </div>
                            <video 
                              controls 
                              className="w-full bg-black"
                              src={questions[currentQuestionIndex].videoUrl}
                            >
                              Your browser does not support the video element.
                            </video>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Answer Section */}
                {questions[currentQuestionIndex].options && questions[currentQuestionIndex].options!.length > 0 ? (
                  <div className="space-y-3">
                    {questions[currentQuestionIndex].options!.map((option, optionIndex) => (
                      <label
                        key={optionIndex}
                        className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all min-h-[52px] touch-manipulation active:scale-[0.98] select-none ${
                          answers[questions[currentQuestionIndex].id] === option
                            ? "bg-purple-50 border-purple-500 dark:bg-purple-900/20 dark:border-purple-500"
                            : "bg-white border-gray-200 hover:border-purple-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-purple-600"
                        }`}
                      >
                        <input
                          type="radio"
                          name={questions[currentQuestionIndex].id}
                          value={option}
                          checked={answers[questions[currentQuestionIndex].id] === option}
                          onChange={(e) => handleAnswerChange(questions[currentQuestionIndex].id, e.target.value)}
                          className="w-6 h-6 text-purple-600 touch-manipulation"
                        />
                        <span className="text-lg text-gray-800 dark:text-gray-200">{option}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div>
                    <textarea
                      value={answers[questions[currentQuestionIndex].id] || ""}
                      onChange={(e) => handleAnswerChange(questions[currentQuestionIndex].id, e.target.value)}
                      placeholder="Type your answer here..."
                      rows={4}
                      className="w-full p-4 text-lg border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        {/* Navigation Buttons */}
        <div className="mt-8 mb-8">
          <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-800/90">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between gap-4">
                <Button
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                  variant="outline"
                  className="px-6 py-6 min-h-[48px] touch-manipulation active:scale-95 select-none"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>

                <div className="text-center text-gray-600 dark:text-gray-400">
                  <div className="font-semibold text-lg">{currentQuestionIndex + 1} / {questions.length}</div>
                  <div className="text-sm">{answers[questions[currentQuestionIndex]?.id] ? "✓ Answered" : "Not answered"}</div>
                </div>

                {currentQuestionIndex < questions.length - 1 ? (
                  <Button
                    onClick={handleNext}
                    className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold px-6 py-6 min-h-[48px] touch-manipulation active:scale-95 select-none"
                  >
                    Next
                    <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold px-6 py-6 min-h-[48px] touch-manipulation active:scale-95 select-none"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-5 w-5" />
                        Submit ({Object.keys(answers).length}/{questions.length})
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
