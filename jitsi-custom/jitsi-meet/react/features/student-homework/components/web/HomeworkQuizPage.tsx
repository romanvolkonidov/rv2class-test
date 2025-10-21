import React, { useEffect, useState } from 'react';
import { makeStyles } from 'tss-react/mui';
import {
    collection,
    getDocs,
    query,
    where,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp,
    getDoc
} from 'firebase/firestore';
import { db } from '../../../base/firebase/firebase';

const useStyles = makeStyles()((theme) => ({
    container: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        position: 'relative',
        overflow: 'hidden',
        padding: '20px',
        '&::before': {
            content: '""',
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, transparent 50%)',
            animation: '$pulseOrb 15s ease-in-out infinite'
        },
        '&::after': {
            content: '""',
            position: 'absolute',
            bottom: '-50%',
            right: '-50%',
            width: '200%',
            height: '200%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 50%)',
            animation: '$pulseOrb 20s ease-in-out infinite reverse'
        }
    },
    '@keyframes pulseOrb': {
        '0%, 100%': {
            transform: 'scale(1) translate(0, 0)'
        },
        '50%': {
            transform: 'scale(1.1) translate(5%, 5%)'
        }
    },
    content: {
        maxWidth: '900px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 1
    },
    loadingContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh'
    },
    spinner: {
        width: '48px',
        height: '48px',
        border: '4px solid rgba(168, 85, 247, 0.3)',
        borderTop: '4px solid rgba(168, 85, 247, 1)',
        borderRadius: '50%',
        animation: '$spin 1s linear infinite'
    },
    '@keyframes spin': {
        '0%': { transform: 'rotate(0deg)' },
        '100%': { transform: 'rotate(360deg)' }
    },
    backButton: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 20px',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '12px',
        color: '#fff',
        fontSize: '16px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        marginBottom: '24px',
        '&:hover': {
            background: 'rgba(255, 255, 255, 0.15)',
            transform: 'translateY(-2px)'
        }
    },
    headerCard: {
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.9) 0%, rgba(99, 102, 241, 0.9) 100%)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        padding: '32px',
        marginBottom: '24px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
    },
    headerContent: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
    },
    headerIcon: {
        width: '60px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255, 255, 255, 0.2)',
        borderRadius: '16px',
        fontSize: '32px'
    },
    headerText: {
        flex: 1
    },
    title: {
        fontSize: '32px',
        fontWeight: 'bold',
        color: '#fff',
        margin: 0,
        marginBottom: '8px'
    },
    subtitle: {
        fontSize: '18px',
        color: 'rgba(255, 255, 255, 0.9)',
        margin: 0
    },
    progressCard: {
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px'
    },
    progressInfo: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px'
    },
    progressLabel: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#fff'
    },
    progressCount: {
        fontSize: '14px',
        color: 'rgba(255, 255, 255, 0.7)'
    },
    progressBarContainer: {
        width: '100%',
        height: '8px',
        background: 'rgba(255, 255, 255, 0.2)',
        borderRadius: '4px',
        overflow: 'hidden'
    },
    progressBar: {
        height: '100%',
        background: 'linear-gradient(90deg, rgba(99, 102, 241, 1) 0%, rgba(168, 85, 247, 1) 100%)',
        borderRadius: '4px',
        transition: 'width 0.3s ease'
    },
    questionCard: {
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '20px',
        padding: '32px',
        marginBottom: '24px'
    },
    questionHeader: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '16px',
        marginBottom: '24px'
    },
    questionNumber: {
        width: '48px',
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 1) 0%, rgba(99, 102, 241, 1) 100%)',
        borderRadius: '50%',
        color: '#fff',
        fontSize: '20px',
        fontWeight: 'bold',
        flexShrink: 0
    },
    questionText: {
        flex: 1,
        fontSize: '20px',
        fontWeight: '500',
        color: '#fff',
        lineHeight: '1.6'
    },
    mediaContainer: {
        marginTop: '16px',
        marginBottom: '24px',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '2px solid rgba(255, 255, 255, 0.2)'
    },
    mediaHeader: {
        background: 'rgba(255, 255, 255, 0.1)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        color: 'rgba(255, 255, 255, 0.8)'
    },
    mediaContent: {
        width: '100%',
        maxHeight: '400px',
        objectFit: 'contain',
        background: '#000'
    },
    optionsContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },
    optionLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 20px',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '2px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        minHeight: '56px',
        userSelect: 'none',
        '&:hover': {
            background: 'rgba(255, 255, 255, 0.1)',
            borderColor: 'rgba(168, 85, 247, 0.5)'
        },
        '&.selected': {
            background: 'rgba(168, 85, 247, 0.2)',
            borderColor: 'rgba(168, 85, 247, 1)',
            boxShadow: '0 0 20px rgba(168, 85, 247, 0.3)'
        }
    },
    optionRadio: {
        width: '24px',
        height: '24px',
        accentColor: '#a855f7'
    },
    optionText: {
        fontSize: '18px',
        color: '#fff',
        flex: 1
    },
    textarea: {
        width: '100%',
        padding: '16px',
        fontSize: '18px',
        background: 'rgba(255, 255, 255, 0.08)',
        border: '2px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '12px',
        color: '#fff',
        resize: 'vertical',
        minHeight: '120px',
        fontFamily: 'inherit',
        '&:focus': {
            outline: 'none',
            borderColor: 'rgba(168, 85, 247, 1)',
            boxShadow: '0 0 20px rgba(168, 85, 247, 0.3)'
        },
        '&::placeholder': {
            color: 'rgba(255, 255, 255, 0.5)'
        }
    },
    navigationCard: {
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '40px'
    },
    navigationContent: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        '@media (max-width: 640px)': {
            flexDirection: 'column'
        }
    },
    navButton: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '16px 24px',
        borderRadius: '12px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        border: 'none',
        minHeight: '52px',
        '&:active': {
            transform: 'scale(0.95)'
        },
        '&:disabled': {
            opacity: 0.5,
            cursor: 'not-allowed'
        }
    },
    prevButton: {
        background: 'rgba(255, 255, 255, 0.1)',
        border: '2px solid rgba(255, 255, 255, 0.2)',
        color: '#fff',
        '&:hover:not(:disabled)': {
            background: 'rgba(255, 255, 255, 0.15)'
        }
    },
    nextButton: {
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 1) 0%, rgba(99, 102, 241, 1) 100%)',
        color: '#fff',
        '&:hover:not(:disabled)': {
            boxShadow: '0 8px 24px rgba(168, 85, 247, 0.4)'
        }
    },
    submitButton: {
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 1) 0%, rgba(5, 150, 105, 1) 100%)',
        color: '#fff',
        '&:hover:not(:disabled)': {
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)'
        }
    },
    navCenter: {
        textAlign: 'center',
        color: 'rgba(255, 255, 255, 0.8)'
    },
    navCenterNumber: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#fff',
        marginBottom: '4px'
    },
    navCenterStatus: {
        fontSize: '14px'
    },
    // Results styles
    resultsCard: {
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '20px',
        padding: '40px',
        marginTop: '40px',
        textAlign: 'center'
    },
    resultsHeader: {
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 1) 0%, rgba(5, 150, 105, 1) 100%)',
        borderRadius: '20px 20px 0 0',
        padding: '32px',
        marginTop: '-40px',
        marginLeft: '-40px',
        marginRight: '-40px',
        marginBottom: '32px'
    },
    resultsIcon: {
        fontSize: '80px',
        marginBottom: '16px'
    },
    resultsTitle: {
        fontSize: '40px',
        fontWeight: 'bold',
        color: '#fff',
        margin: 0,
        marginBottom: '8px'
    },
    resultsSubtitle: {
        fontSize: '20px',
        color: 'rgba(255, 255, 255, 0.9)',
        margin: 0
    },
    scoreBox: {
        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.2) 100%)',
        border: '2px solid rgba(251, 191, 36, 0.5)',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '24px'
    },
    trophyIcon: {
        fontSize: '64px',
        marginBottom: '16px'
    },
    scoreNumber: {
        fontSize: '72px',
        fontWeight: 'bold',
        color: '#fbbf24',
        marginBottom: '8px'
    },
    scoreText: {
        fontSize: '24px',
        color: '#fff'
    },
    encouragement: {
        fontSize: '20px',
        color: 'rgba(255, 255, 255, 0.8)',
        marginBottom: '32px'
    },
    returnButton: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '16px 32px',
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 1) 0%, rgba(99, 102, 241, 1) 100%)',
        border: 'none',
        borderRadius: '12px',
        color: '#fff',
        fontSize: '18px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        '&:hover': {
            boxShadow: '0 8px 24px rgba(168, 85, 247, 0.4)',
            transform: 'translateY(-2px)'
        }
    }
}));

interface Question {
    id: string;
    topicId: string;
    text: string;
    sentence?: string;
    question?: string;
    options?: string[];
    correctAnswer: string | number;
    type?: string;
    mediaUrl?: string;
    mediaType?: string;
    mediaFiles?: Array<{
        filename: string;
        url: string;
        type: string;
    }>;
    audioUrl?: string;
    videoUrl?: string;
    imageUrl?: string;
    explanation?: string;
    order?: number;
}

interface HomeworkAssignment {
    id: string;
    studentId: string;
    topicId?: string;
    topicIds?: string[];
    assignedAt: any;
    status?: string;
    topicName?: string;
    homeworkMediaFiles?: Array<{
        filename: string;
        url: string;
        type: string;
    }>;
}

const HomeworkQuizPage: React.FC = () => {
    const { classes, cx } = useStyles();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [assignment, setAssignment] = useState<HomeworkAssignment | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<{ [questionId: string]: string }>({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [results, setResults] = useState<{
        score: number;
        correctAnswers: number;
        totalQuestions: number;
    } | null>(null);

    useEffect(() => {
        loadHomeworkQuiz();
    }, []);

    const loadHomeworkQuiz = async () => {
        setLoading(true);
        try {
            // Get parameters from URL
            const params = new URLSearchParams(window.location.search);
            const studentId = params.get('studentId');
            const homeworkId = params.get('homeworkId');

            if (!studentId || !homeworkId) {
                alert('Missing student ID or homework ID');
                window.history.back();
                return;
            }

            // Fetch the assignment
            const assignmentRef = doc(db, 'telegramAssignments', homeworkId);
            const assignmentSnap = await getDoc(assignmentRef);

            if (!assignmentSnap.exists()) {
                alert('Homework not found!');
                window.history.back();
                return;
            }

            const assignmentData = {
                id: assignmentSnap.id,
                ...assignmentSnap.data()
            } as HomeworkAssignment;

            // Check if already completed
            if (assignmentData.status === 'completed') {
                alert('This homework has already been completed!');
                window.history.back();
                return;
            }

            setAssignment(assignmentData);

            // Get topicIds
            let topicIds = assignmentData.topicIds || [];
            if (topicIds.length === 0 && assignmentData.topicId) {
                topicIds = [assignmentData.topicId];
            }

            // Fetch questions
            const questionsRef = collection(db, 'telegramQuestions');
            const allQuestions: Question[] = [];

            for (const topicId of topicIds) {
                const q = query(questionsRef, where('topicId', '==', topicId));
                const querySnapshot = await getDocs(q);

                const topicQuestions = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Question[];

                allQuestions.push(...topicQuestions);
            }

            if (allQuestions.length === 0) {
                alert('No questions found for this homework!');
                window.history.back();
                return;
            }

            // Sort by order
            allQuestions.sort((a, b) => {
                const orderA = a.order ?? 999999;
                const orderB = b.order ?? 999999;
                return orderA - orderB;
            });

            setQuestions(allQuestions);
        } catch (error) {
            console.error('Error loading homework quiz:', error);
            alert('Failed to load homework. Please try again.');
            window.history.back();
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
            const params = new URLSearchParams(window.location.search);
            const studentId = params.get('studentId');
            const homeworkId = params.get('homeworkId');

            if (!studentId || !homeworkId) {
                throw new Error('Missing required parameters');
            }

            const answerArray = Object.entries(answers).map(([questionId, answer]) => ({
                questionId,
                answer
            }));

            if (answerArray.length === 0) {
                alert('Error: No answers to submit. Please answer at least one question.');
                setSubmitting(false);
                return;
            }

            // Calculate score
            let correctCount = 0;
            const totalCount = questions.length;

            answerArray.forEach(answer => {
                const question = questions.find(q => q.id === answer.questionId);
                if (question) {
                    let isCorrect = false;

                    if (typeof question.correctAnswer === 'number' && question.options) {
                        const correctOption = question.options[question.correctAnswer];
                        const userAnswerNorm = String(answer.answer).trim().toLowerCase();
                        const correctOptionNorm = String(correctOption).trim().toLowerCase();
                        isCorrect = correctOptionNorm === userAnswerNorm;
                    } else {
                        const userAnswerNorm = String(answer.answer).trim().toLowerCase();
                        const correctAnswerNorm = String(question.correctAnswer).trim().toLowerCase();
                        isCorrect = correctAnswerNorm === userAnswerNorm;
                    }

                    if (isCorrect) {
                        correctCount++;
                    }
                }
            });

            const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

            // Update assignment status
            const assignmentRef = doc(db, 'telegramAssignments', homeworkId);
            await updateDoc(assignmentRef, {
                status: 'completed',
                completedAt: serverTimestamp()
            });

            // Create homework report
            const reportData = {
                studentId,
                homeworkId,
                score,
                correctAnswers: correctCount,
                totalQuestions: totalCount,
                submittedAnswers: answerArray,
                completedAt: serverTimestamp(),
                completedVia: 'web-app'
            };

            await addDoc(collection(db, 'telegramHomeworkReports'), reportData);

            setResults({
                score,
                correctAnswers: correctCount,
                totalQuestions: totalCount
            });
            setSubmitted(true);
        } catch (error) {
            console.error('Error submitting homework:', error);
            alert('An error occurred. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReturnToList = () => {
        const params = new URLSearchParams(window.location.search);
        const studentId = params.get('studentId');
        window.location.href = `/static/student-homework.html?studentId=${encodeURIComponent(studentId || '')}`;
    };

    if (loading) {
        return (
            <div className={classes.container}>
                <div className={classes.loadingContainer}>
                    <div className={classes.spinner}></div>
                </div>
            </div>
        );
    }

    if (submitted && results) {
        const getEncouragementMessage = (score: number) => {
            if (score === 100) return '🎉 Perfect score! Outstanding work!';
            if (score >= 80) return '⭐ Excellent work! Keep it up!';
            if (score >= 60) return '👍 Good job! Keep practicing!';
            return '💪 Keep studying and you\'ll improve!';
        };

        return (
            <div className={classes.container}>
                <div className={classes.content}>
                    <div className={classes.resultsCard}>
                        <div className={classes.resultsHeader}>
                            <div className={classes.resultsIcon}>✅</div>
                            <h1 className={classes.resultsTitle}>Homework Complete!</h1>
                            <p className={classes.resultsSubtitle}>Great job!</p>
                        </div>

                        <div className={classes.scoreBox}>
                            <div className={classes.trophyIcon}>🏆</div>
                            <div className={classes.scoreNumber}>{results.score}%</div>
                            <div className={classes.scoreText}>
                                {results.correctAnswers} out of {results.totalQuestions} correct
                            </div>
                        </div>

                        <p className={classes.encouragement}>
                            {getEncouragementMessage(results.score)}
                        </p>

                        <button onClick={handleReturnToList} className={classes.returnButton}>
                            ← Back to Homework List
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];

    return (
        <div className={classes.container}>
            <div className={classes.content}>
                <button onClick={() => window.history.back()} className={classes.backButton}>
                    ← Back
                </button>

                <div className={classes.headerCard}>
                    <div className={classes.headerContent}>
                        <div className={classes.headerIcon}>📚</div>
                        <div className={classes.headerText}>
                            <h1 className={classes.title}>
                                {assignment?.topicName || 'Homework Quiz'}
                            </h1>
                            <p className={classes.subtitle}>
                                Answer all questions to complete this homework
                            </p>
                        </div>
                    </div>
                </div>

                <div className={classes.progressCard}>
                    <div className={classes.progressInfo}>
                        <span className={classes.progressLabel}>
                            Question {currentQuestionIndex + 1} of {questions.length}
                        </span>
                        <span className={classes.progressCount}>
                            {Object.keys(answers).length} answered
                        </span>
                    </div>
                    <div className={classes.progressBarContainer}>
                        <div
                            className={classes.progressBar}
                            style={{
                                width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`
                            }}
                        />
                    </div>
                </div>

                {/* Homework-level media */}
                {assignment?.homeworkMediaFiles && assignment.homeworkMediaFiles.length > 0 && (
                    <div className={classes.questionCard}>
                        <h3 style={{ color: '#fff', marginBottom: '16px' }}>📖 Homework Materials</h3>
                        {assignment.homeworkMediaFiles.map((file, index) => (
                            <div key={index} className={classes.mediaContainer}>
                                <div className={classes.mediaHeader}>
                                    {file.type === 'image' && '🖼️ Reference Image'}
                                    {file.type === 'audio' && '🔊 Audio File'}
                                    {file.type === 'video' && '🎬 Video File'}
                                </div>
                                {file.type === 'image' && (
                                    <img src={file.url} alt="Homework material" className={classes.mediaContent} />
                                )}
                                {file.type === 'audio' && (
                                    <audio controls style={{ width: '100%', padding: '16px' }}>
                                        <source src={file.url} />
                                    </audio>
                                )}
                                {file.type === 'video' && (
                                    <video controls className={classes.mediaContent}>
                                        <source src={file.url} />
                                    </video>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Current Question */}
                {currentQuestion && (
                    <div className={classes.questionCard}>
                        <div className={classes.questionHeader}>
                            <div className={classes.questionNumber}>
                                {currentQuestionIndex + 1}
                            </div>
                            <div className={classes.questionText}>
                                {currentQuestion.text}
                            </div>
                        </div>

                        {/* Question media */}
                        {currentQuestion.mediaFiles && currentQuestion.mediaFiles.length > 0 && (
                            currentQuestion.mediaFiles.map((file, index) => (
                                <div key={index} className={classes.mediaContainer}>
                                    <div className={classes.mediaHeader}>
                                        {file.type === 'image' && '🖼️ Question Image'}
                                        {file.type === 'audio' && '🔊 Listen to the audio'}
                                        {file.type === 'video' && '🎬 Watch the video'}
                                    </div>
                                    {file.type === 'image' && (
                                        <img src={file.url} alt="Question" className={classes.mediaContent} />
                                    )}
                                    {file.type === 'audio' && (
                                        <audio controls style={{ width: '100%', padding: '16px' }}>
                                            <source src={file.url} />
                                        </audio>
                                    )}
                                    {file.type === 'video' && (
                                        <video controls className={classes.mediaContent}>
                                            <source src={file.url} />
                                        </video>
                                    )}
                                </div>
                            ))
                        )}

                        {/* Legacy media support */}
                        {currentQuestion.imageUrl && (
                            <div className={classes.mediaContainer}>
                                <div className={classes.mediaHeader}>🖼️ Question Image</div>
                                <img src={currentQuestion.imageUrl} alt="Question" className={classes.mediaContent} />
                            </div>
                        )}
                        {currentQuestion.audioUrl && (
                            <div className={classes.mediaContainer}>
                                <div className={classes.mediaHeader}>🔊 Listen to the audio</div>
                                <audio controls style={{ width: '100%', padding: '16px' }}>
                                    <source src={currentQuestion.audioUrl} />
                                </audio>
                            </div>
                        )}
                        {currentQuestion.videoUrl && (
                            <div className={classes.mediaContainer}>
                                <div className={classes.mediaHeader}>🎬 Watch the video</div>
                                <video controls className={classes.mediaContent}>
                                    <source src={currentQuestion.videoUrl} />
                                </video>
                            </div>
                        )}

                        {/* Answer options */}
                        {currentQuestion.options && currentQuestion.options.length > 0 ? (
                            <div className={classes.optionsContainer}>
                                {currentQuestion.options.map((option, index) => (
                                    <label
                                        key={index}
                                        className={cx(
                                            classes.optionLabel,
                                            answers[currentQuestion.id] === option && 'selected'
                                        )}
                                    >
                                        <input
                                            type="radio"
                                            name={currentQuestion.id}
                                            value={option}
                                            checked={answers[currentQuestion.id] === option}
                                            onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                                            className={classes.optionRadio}
                                        />
                                        <span className={classes.optionText}>{option}</span>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <textarea
                                value={answers[currentQuestion.id] || ''}
                                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                                placeholder="Type your answer here..."
                                className={classes.textarea}
                            />
                        )}
                    </div>
                )}

                {/* Navigation */}
                <div className={classes.navigationCard}>
                    <div className={classes.navigationContent}>
                        <button
                            onClick={handlePrevious}
                            disabled={currentQuestionIndex === 0}
                            className={cx(classes.navButton, classes.prevButton)}
                        >
                            ← Previous
                        </button>

                        <div className={classes.navCenter}>
                            <div className={classes.navCenterNumber}>
                                {currentQuestionIndex + 1} / {questions.length}
                            </div>
                            <div className={classes.navCenterStatus}>
                                {answers[currentQuestion?.id] ? '✓ Answered' : 'Not answered'}
                            </div>
                        </div>

                        {currentQuestionIndex < questions.length - 1 ? (
                            <button
                                onClick={handleNext}
                                className={cx(classes.navButton, classes.nextButton)}
                            >
                                Next →
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className={cx(classes.navButton, classes.submitButton)}
                            >
                                {submitting ? (
                                    <>
                                        <span className={classes.spinner} style={{ width: '20px', height: '20px' }}></span>
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        ✓ Submit ({Object.keys(answers).length}/{questions.length})
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomeworkQuizPage;
