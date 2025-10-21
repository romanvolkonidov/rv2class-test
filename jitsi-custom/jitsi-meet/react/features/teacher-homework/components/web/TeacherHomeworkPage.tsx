import React, { useEffect, useState } from 'react';
import { makeStyles } from 'tss-react/mui';

interface Question {
    id: string;
    question: string;
    options?: string[];
    correctAnswer: string;
    type: 'multiple-choice' | 'open-ended';
}

interface SubmittedAnswer {
    questionId: string;
    answer: string;
}

interface HomeworkReport {
    id: string;
    studentId: string;
    studentName?: string;
    homeworkId: string;
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    completedAt: any;
    seenByTeacher: boolean;
    submittedAnswers?: SubmittedAnswer[];
    topicIds?: string[];
}

const useStyles = makeStyles()(theme => ({
    container: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        padding: '20px',
        position: 'relative',
        overflow: 'auto'
    },
    bgAnimation: {
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0
    },
    bgBlob: {
        position: 'absolute',
        borderRadius: '50%',
        filter: 'blur(80px)',
        animation: 'pulse 4s ease-in-out infinite',
        '@keyframes pulse': {
            '0%, 100%': {
                transform: 'scale(1)',
                opacity: 0.8
            },
            '50%': {
                transform: 'scale(1.1)',
                opacity: 1
            }
        }
    },
    bgBlob1: {
        top: '25%',
        left: '25%',
        width: '500px',
        height: '500px',
        background: 'rgba(6, 182, 212, 0.1)'
    },
    bgBlob2: {
        bottom: '25%',
        right: '25%',
        width: '500px',
        height: '500px',
        background: 'rgba(59, 130, 246, 0.1)',
        animationDelay: '1s'
    },
    content: {
        maxWidth: '1200px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 1
    },
    header: {
        marginBottom: '30px',
        marginTop: '20px'
    },
    backButton: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
        background: 'rgba(51, 65, 85, 0.8)',
        backdropFilter: 'blur(10px)',
        color: '#ffffff',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 500,
        marginBottom: '20px',
        transition: 'all 0.2s',
        '&:hover': {
            background: 'rgba(51, 65, 85, 1)',
            transform: 'translateX(-4px)'
        }
    },
    headerCard: {
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
    },
    headerGradient: {
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.9) 0%, rgba(14, 165, 233, 0.9) 50%, rgba(59, 130, 246, 0.9) 100%)',
        padding: '32px'
    },
    headerContent: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap'
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
    },
    headerIcon: {
        background: 'rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(10px)',
        padding: '12px',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    headerTitle: {
        fontSize: '32px',
        fontWeight: 600,
        color: '#ffffff',
        marginBottom: '4px'
    },
    headerSubtitle: {
        fontSize: '15px',
        color: 'rgba(255, 255, 255, 0.9)'
    },
    unseenBadge: {
        background: '#ef4444',
        color: '#ffffff',
        borderRadius: '50%',
        padding: '8px 16px',
        fontSize: '16px',
        fontWeight: 700,
        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
    },
    loading: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 20px',
        color: '#94a3b8'
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '3px solid rgba(6, 182, 212, 0.2)',
        borderTopColor: '#06b6d4',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        '@keyframes spin': {
            to: { transform: 'rotate(360deg)' }
        }
    },
    emptyState: {
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        padding: '60px 24px',
        textAlign: 'center'
    },
    emptyIcon: {
        margin: '0 auto 16px',
        color: '#475569'
    },
    emptyText: {
        color: '#94a3b8',
        fontSize: '18px'
    },
    homeworkList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    },
    homeworkCard: {
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        padding: '24px',
        transition: 'all 0.3s',
        '&:hover': {
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3)',
            transform: 'translateY(-2px)'
        }
    },
    unseen: {
        border: '2px solid rgba(239, 68, 68, 0.5)',
        boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)'
    },
    homeworkContent: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap'
    },
    homeworkInfo: {
        flex: 1,
        minWidth: '250px'
    },
    studentHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '12px'
    },
    studentName: {
        fontSize: '20px',
        fontWeight: 700,
        color: '#ffffff'
    },
    newBadge: {
        background: '#ef4444',
        color: '#ffffff',
        fontSize: '11px',
        fontWeight: 700,
        padding: '4px 10px',
        borderRadius: '12px'
    },
    homeworkMeta: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '16px',
        fontSize: '14px',
        color: '#94a3b8'
    },
    metaItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
    },
    scoreText: {
        fontWeight: 700,
        color: '#fbbf24'
    },
    correctText: {
        fontWeight: 600,
        color: '#10b981'
    },
    viewButton: {
        padding: '12px 24px',
        background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
        color: '#ffffff',
        border: 'none',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s',
        '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 20px rgba(59, 130, 246, 0.4)'
        }
    },
    modal: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
    },
    modalContent: {
        background: '#1e293b',
        borderRadius: '24px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        maxWidth: '1000px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
    },
    modalHeader: {
        background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
        padding: '24px',
        color: '#ffffff'
    },
    modalHeaderTop: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: '8px'
    },
    modalHeaderLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    modalTitle: {
        fontSize: '24px',
        fontWeight: 700
    },
    modalSubtitle: {
        fontSize: '15px',
        color: 'rgba(255, 255, 255, 0.9)'
    },
    closeButton: {
        background: 'rgba(255, 255, 255, 0.2)',
        border: 'none',
        color: '#ffffff',
        width: '40px',
        height: '40px',
        borderRadius: '12px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        '&:hover': {
            background: 'rgba(255, 255, 255, 0.3)'
        }
    },
    modalBody: {
        flex: 1,
        overflowY: 'auto',
        padding: '24px'
    },
    questionList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
    },
    questionCard: {
        background: 'rgba(51, 65, 85, 0.5)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '20px'
    },
    questionHeader: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: '16px'
    },
    questionNumber: {
        background: 'rgba(59, 130, 246, 0.2)',
        color: '#60a5fa',
        fontSize: '14px',
        fontWeight: 700,
        padding: '6px 12px',
        borderRadius: '8px',
        flexShrink: 0
    },
    questionText: {
        flex: 1,
        fontSize: '16px',
        fontWeight: 600,
        color: '#f1f5f9',
        lineHeight: 1.5
    },
    correctBadge: {
        background: 'rgba(16, 185, 129, 0.2)',
        color: '#10b981',
        padding: '6px 12px',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
    },
    incorrectBadge: {
        background: 'rgba(239, 68, 68, 0.2)',
        color: '#ef4444',
        padding: '6px 12px',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
    },
    answerSection: {
        marginTop: '12px',
        padding: '12px',
        background: 'rgba(15, 23, 42, 0.5)',
        borderRadius: '12px'
    },
    answerLabel: {
        fontSize: '13px',
        color: '#94a3b8',
        fontWeight: 600,
        marginBottom: '6px'
    },
    answerText: {
        fontSize: '15px',
        color: '#f1f5f9',
        lineHeight: 1.5
    },
    correctAnswerSection: {
        marginTop: '8px',
        padding: '12px',
        background: 'rgba(16, 185, 129, 0.1)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '12px'
    }
}));

const TeacherHomeworkPage: React.FC = () => {
    const { classes } = useStyles();
    const [homeworks, setHomeworks] = useState<HomeworkReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewingReport, setViewingReport] = useState<HomeworkReport | null>(null);
    const [viewingQuestions, setViewingQuestions] = useState<Question[]>([]);
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    const [firebaseReady, setFirebaseReady] = useState(false);

    useEffect(() => {
        loadFirebase();
    }, []);

    const loadFirebase = async () => {
        if ((window as any).firebaseApp && (window as any).firebaseFirestore) {
            setFirebaseReady(true);
            loadHomeworks();
            return;
        }

        try {
            const appScript = document.createElement('script');
            appScript.type = 'module';
            appScript.textContent = `
                import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
                import * as firebaseFirestore from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
                
                window.firebaseApp = initializeApp;
                window.firebaseFirestore = firebaseFirestore;
                window.dispatchEvent(new Event('firebaseReady'));
            `;
            document.head.appendChild(appScript);

            await new Promise((resolve) => {
                window.addEventListener('firebaseReady', resolve, { once: true });
            });

            setFirebaseReady(true);
            loadHomeworks();
        } catch (err) {
            console.error('Failed to load Firebase:', err);
            setLoading(false);
        }
    };

    const loadHomeworks = async () => {
        if (!firebaseReady && !(window as any).firebaseFirestore) return;

        setLoading(true);
        try {
            const firebaseConfig = {
                apiKey: "AIzaSyB_VsLZaaQ_m3WNVlPjfhy715BXo8ax004",
                authDomain: "tracking-budget-app.firebaseapp.com",
                databaseURL: "https://tracking-budget-app-default-rtdb.firebaseio.com",
                projectId: "tracking-budget-app",
                storageBucket: "tracking-budget-app.appspot.com",
                messagingSenderId: "912992088190",
                appId: "1:912992088190:web:926c8826b3bc39e2eb282f"
            };

            const app = (window as any).firebaseApp(firebaseConfig);
            const db = (window as any).firebaseFirestore.getFirestore(app);

            // Get all homework reports
            const reportsQuery = (window as any).firebaseFirestore.query(
                (window as any).firebaseFirestore.collection(db, 'homeworkReports'),
                (window as any).firebaseFirestore.orderBy('completedAt', 'desc')
            );
            const reportsSnapshot = await (window as any).firebaseFirestore.getDocs(reportsQuery);

            const homeworkData: HomeworkReport[] = [];
            for (const docSnap of reportsSnapshot.docs) {
                const data = docSnap.data();
                
                // Get student name
                let studentName = 'Unknown Student';
                if (data.studentId) {
                    const studentDoc = await (window as any).firebaseFirestore.getDoc(
                        (window as any).firebaseFirestore.doc(db, 'students', data.studentId)
                    );
                    if (studentDoc.exists()) {
                        studentName = studentDoc.data().name || 'Unknown Student';
                    }
                }

                homeworkData.push({
                    id: docSnap.id,
                    studentId: data.studentId,
                    studentName,
                    homeworkId: data.homeworkId,
                    score: data.score || 0,
                    correctAnswers: data.correctAnswers || 0,
                    totalQuestions: data.totalQuestions || 0,
                    completedAt: data.completedAt,
                    seenByTeacher: data.seenByTeacher || false,
                    submittedAnswers: data.submittedAnswers || [],
                    topicIds: data.topicIds || []
                });
            }

            setHomeworks(homeworkData);

            // Mark all as seen
            for (const homework of homeworkData) {
                if (!homework.seenByTeacher) {
                    await (window as any).firebaseFirestore.updateDoc(
                        (window as any).firebaseFirestore.doc(db, 'homeworkReports', homework.id),
                        { seenByTeacher: true }
                    );
                }
            }
        } catch (error) {
            console.error('Error loading homeworks:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewReport = async (report: HomeworkReport) => {
        setViewingReport(report);
        setLoadingQuestions(true);

        try {
            const firebaseConfig = {
                apiKey: "AIzaSyB_VsLZaaQ_m3WNVlPjfhy715BXo8ax004",
                authDomain: "tracking-budget-app.firebaseapp.com",
                databaseURL: "https://tracking-budget-app-default-rtdb.firebaseio.com",
                projectId: "tracking-budget-app",
                storageBucket: "tracking-budget-app.appspot.com",
                messagingSenderId: "912992088190",
                appId: "1:912992088190:web:926c8826b3bc39e2eb282f"
            };

            const app = (window as any).firebaseApp(firebaseConfig);
            const db = (window as any).firebaseFirestore.getFirestore(app);

            if (report.topicIds && report.topicIds.length > 0) {
                const questions: Question[] = [];
                
                for (const topicId of report.topicIds) {
                    const questionsQuery = (window as any).firebaseFirestore.query(
                        (window as any).firebaseFirestore.collection(db, 'questions'),
                        (window as any).firebaseFirestore.where('topicId', '==', topicId)
                    );
                    const questionsSnapshot = await (window as any).firebaseFirestore.getDocs(questionsQuery);
                    
                    questionsSnapshot.docs.forEach((doc: any) => {
                        const data = doc.data();
                        questions.push({
                            id: doc.id,
                            question: data.question,
                            options: data.options,
                            correctAnswer: data.correctAnswer,
                            type: data.type || 'multiple-choice'
                        });
                    });
                }

                setViewingQuestions(questions);
            }
        } catch (error) {
            console.error('Error loading questions:', error);
        } finally {
            setLoadingQuestions(false);
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'Unknown date';
        
        try {
            let date: Date;
            
            if (timestamp.seconds) {
                date = new Date(timestamp.seconds * 1000);
            } else if (timestamp.toDate && typeof timestamp.toDate === 'function') {
                date = timestamp.toDate();
            } else {
                date = new Date(timestamp);
            }
            
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Date error';
        }
    };

    const unseenCount = homeworks.filter(hw => !hw.seenByTeacher).length;

    return (
        <div className={classes.container}>
            <div className={classes.bgAnimation}>
                <div className={`${classes.bgBlob} ${classes.bgBlob1}`} />
                <div className={`${classes.bgBlob} ${classes.bgBlob2}`} />
            </div>

            <div className={classes.content}>
                <div className={classes.header}>
                    <button
                        className={classes.backButton}
                        onClick={() => window.history.back()}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                        Back to Dashboard
                    </button>

                    <div className={classes.headerCard}>
                        <div className={classes.headerGradient}>
                            <div className={classes.headerContent}>
                                <div className={classes.headerLeft}>
                                    <div className={classes.headerIcon}>
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'white' }}>
                                            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h1 className={classes.headerTitle}>All Completed Homework</h1>
                                        <p className={classes.headerSubtitle}>Review student submissions</p>
                                    </div>
                                </div>
                                {unseenCount > 0 && (
                                    <div className={classes.unseenBadge}>
                                        {unseenCount} new
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className={classes.loading}>
                        <div className={classes.spinner} />
                    </div>
                ) : homeworks.length === 0 ? (
                    <div className={classes.emptyState}>
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={classes.emptyIcon}>
                            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                        </svg>
                        <p className={classes.emptyText}>No homework submissions yet.</p>
                    </div>
                ) : (
                    <div className={classes.homeworkList}>
                        {homeworks.map((homework) => (
                            <div
                                key={homework.id}
                                className={`${classes.homeworkCard} ${!homework.seenByTeacher ? classes.unseen : ''}`}
                            >
                                <div className={classes.homeworkContent}>
                                    <div className={classes.homeworkInfo}>
                                        <div className={classes.studentHeader}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#06b6d4' }}>
                                                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                            </svg>
                                            <h3 className={classes.studentName}>{homework.studentName}</h3>
                                            {!homework.seenByTeacher && (
                                                <span className={classes.newBadge}>NEW</span>
                                            )}
                                        </div>

                                        <div className={classes.homeworkMeta}>
                                            <div className={classes.metaItem}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <circle cx="12" cy="12" r="10"/>
                                                    <path d="M12 6v6l4 2"/>
                                                </svg>
                                                <span>{formatDate(homework.completedAt)}</span>
                                            </div>
                                            <div className={classes.metaItem}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#fbbf24' }}>
                                                    <path d="M12 15l3.5 2-1-4L18 10l-4-.35L12 6l-1.5 3.65L6 10l3.5 3-1 4z"/>
                                                </svg>
                                                <span className={classes.scoreText}>{homework.score}%</span>
                                            </div>
                                            <div className={classes.metaItem}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#10b981' }}>
                                                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                                </svg>
                                                <span className={classes.correctText}>{homework.correctAnswers}/{homework.totalQuestions} correct</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        className={classes.viewButton}
                                        onClick={() => handleViewReport(homework)}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                            <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                        </svg>
                                        View Details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Details Modal */}
            {viewingReport && (
                <div className={classes.modal} onClick={() => setViewingReport(null)}>
                    <div className={classes.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={classes.modalHeader}>
                            <div className={classes.modalHeaderTop}>
                                <div className={classes.modalHeaderLeft}>
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'white' }}>
                                        <path d="M12 15l3.5 2-1-4L18 10l-4-.35L12 6l-1.5 3.65L6 10l3.5 3-1 4z"/>
                                    </svg>
                                    <div>
                                        <h2 className={classes.modalTitle}>{viewingReport.studentName}</h2>
                                        <p className={classes.modalSubtitle}>
                                            Score: {viewingReport.score}% | {viewingReport.correctAnswers}/{viewingReport.totalQuestions} correct
                                        </p>
                                    </div>
                                </div>
                                <button
                                    className={classes.closeButton}
                                    onClick={() => setViewingReport(null)}
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className={classes.modalBody}>
                            {loadingQuestions ? (
                                <div className={classes.loading}>
                                    <div className={classes.spinner} />
                                </div>
                            ) : viewingQuestions.length > 0 ? (
                                <div className={classes.questionList}>
                                    {viewingQuestions.map((question, index) => {
                                        const submittedAnswerObj = viewingReport.submittedAnswers?.find(
                                            (a: SubmittedAnswer) => a.questionId === question.id
                                        );
                                        const submittedAnswer = submittedAnswerObj?.answer || 'No answer';
                                        const isCorrect = submittedAnswer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();

                                        return (
                                            <div key={question.id} className={classes.questionCard}>
                                                <div className={classes.questionHeader}>
                                                    <span className={classes.questionNumber}>Q{index + 1}</span>
                                                    <p className={classes.questionText}>{question.question}</p>
                                                    {isCorrect ? (
                                                        <span className={classes.correctBadge}>
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M5 13l4 4L19 7"/>
                                                            </svg>
                                                            Correct
                                                        </span>
                                                    ) : (
                                                        <span className={classes.incorrectBadge}>
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M6 18L18 6M6 6l12 12"/>
                                                            </svg>
                                                            Incorrect
                                                        </span>
                                                    )}
                                                </div>

                                                <div className={classes.answerSection}>
                                                    <div className={classes.answerLabel}>Student's Answer:</div>
                                                    <div className={classes.answerText}>{submittedAnswer}</div>
                                                </div>

                                                {!isCorrect && (
                                                    <div className={classes.correctAnswerSection}>
                                                        <div className={classes.answerLabel} style={{ color: '#10b981' }}>
                                                            Correct Answer:
                                                        </div>
                                                        <div className={classes.answerText} style={{ color: '#10b981' }}>
                                                            {question.correctAnswer}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className={classes.emptyState}>
                                    <p className={classes.emptyText}>No questions found for this homework.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherHomeworkPage;
