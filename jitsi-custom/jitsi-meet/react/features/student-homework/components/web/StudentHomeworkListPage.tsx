import React, { useEffect, useState } from 'react';
import { makeStyles } from 'tss-react/mui';
import {
    collection,
    getDocs,
    query,
    where
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
        marginBottom: '32px',
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
    title: {
        fontSize: '32px',
        fontWeight: 'bold',
        color: '#fff',
        margin: 0
    },
    statsRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
    },
    statCard: {
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '16px',
        padding: '20px',
        textAlign: 'center'
    },
    statValue: {
        fontSize: '36px',
        fontWeight: 'bold',
        marginBottom: '8px'
    },
    statLabel: {
        fontSize: '14px',
        color: 'rgba(255, 255, 255, 0.8)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    },
    homeworkList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    },
    homeworkCard: {
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '16px',
        padding: '24px',
        transition: 'all 0.3s ease',
        '&:hover': {
            background: 'rgba(255, 255, 255, 0.12)',
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)'
        }
    },
    homeworkHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px'
    },
    homeworkTitle: {
        fontSize: '20px',
        fontWeight: '600',
        color: '#fff',
        margin: 0
    },
    statusBadge: {
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '14px',
        fontWeight: '600'
    },
    pendingBadge: {
        background: 'rgba(251, 191, 36, 0.2)',
        color: '#fbbf24',
        border: '1px solid rgba(251, 191, 36, 0.5)'
    },
    completedBadge: {
        background: 'rgba(16, 185, 129, 0.2)',
        color: '#10b981',
        border: '1px solid rgba(16, 185, 129, 0.5)'
    },
    homeworkDate: {
        fontSize: '14px',
        color: 'rgba(255, 255, 255, 0.6)',
        marginBottom: '16px'
    },
    actionButton: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
        borderRadius: '10px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        border: 'none',
        '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)'
        }
    },
    startButton: {
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 1) 0%, rgba(99, 102, 241, 1) 100%)',
        color: '#fff'
    },
    viewButton: {
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        color: '#fff'
    },
    emptyState: {
        textAlign: 'center',
        padding: '60px 20px',
        color: 'rgba(255, 255, 255, 0.6)'
    },
    emptyIcon: {
        fontSize: '64px',
        marginBottom: '16px'
    },
    emptyText: {
        fontSize: '20px',
        marginBottom: '8px'
    }
}));

interface HomeworkAssignment {
    id: string;
    studentId: string;
    topicId?: string;
    topicIds?: string[];
    assignedAt: any;
    status?: string;
    topicName?: string;
    completedAt?: any;
}

interface HomeworkReport {
    id: string;
    studentId: string;
    homeworkId: string;
    score?: number;
    completedAt?: any;
    correctAnswers?: number;
    totalQuestions?: number;
}

const StudentHomeworkListPage: React.FC = () => {
    const { classes } = useStyles();
    const [loading, setLoading] = useState(true);
    const [assignments, setAssignments] = useState<HomeworkAssignment[]>([]);
    const [reports, setReports] = useState<HomeworkReport[]>([]);
    const [studentId, setStudentId] = useState<string>('');

    useEffect(() => {
        loadHomeworkList();
    }, []);

    const loadHomeworkList = async () => {
        setLoading(true);
        try {
            // Get studentId from URL
            const params = new URLSearchParams(window.location.search);
            const sid = params.get('studentId');

            if (!sid) {
                alert('Student ID is missing');
                return;
            }

            setStudentId(sid);

            // Fetch assignments
            const assignmentsRef = collection(db, 'telegramAssignments');
            const q = query(assignmentsRef, where('studentId', '==', sid));
            const querySnapshot = await getDocs(q);

            const assignmentsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as HomeworkAssignment[];

            // Fetch reports
            const reportsRef = collection(db, 'telegramHomeworkReports');
            const reportsQuery = query(reportsRef, where('studentId', '==', sid));
            const reportsSnapshot = await getDocs(reportsQuery);

            const reportsData = reportsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as HomeworkReport[];

            setAssignments(assignmentsData);
            setReports(reportsData);
        } catch (error) {
            console.error('Error loading homework list:', error);
            alert('Failed to load homework. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getHomeworkReport = (homeworkId: string): HomeworkReport | undefined => {
        return reports.find(r => r.homeworkId === homeworkId);
    };

    const handleStartHomework = (homeworkId: string) => {
        window.location.href = `/static/homework-quiz.html?studentId=${encodeURIComponent(studentId)}&homeworkId=${encodeURIComponent(homeworkId)}`;
    };

    const handleViewResults = (homeworkId: string) => {
        window.location.href = `/static/homework-results.html?studentId=${encodeURIComponent(studentId)}&homeworkId=${encodeURIComponent(homeworkId)}`;
    };

    const handleBack = () => {
        // Get student name from localStorage if available
        const studentName = localStorage.getItem('studentName');
        if (studentName) {
            window.location.href = `/static/student-welcome.html?studentId=${encodeURIComponent(studentId)}`;
        } else {
            window.history.back();
        }
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

    const completedCount = assignments.filter(a => {
        const report = getHomeworkReport(a.id);
        return !!report;
    }).length;

    const pendingCount = assignments.length - completedCount;

    const avgScore = reports.length > 0
        ? Math.round(reports.reduce((sum, r) => sum + (r.score || 0), 0) / reports.length)
        : 0;

    return (
        <div className={classes.container}>
            <div className={classes.content}>
                <button onClick={handleBack} className={classes.backButton}>
                    ← Back to Portal
                </button>

                <div className={classes.headerCard}>
                    <div className={classes.headerContent}>
                        <div className={classes.headerIcon}>📚</div>
                        <h1 className={classes.title}>My Homework</h1>
                    </div>
                </div>

                <div className={classes.statsRow}>
                    <div className={classes.statCard}>
                        <div className={classes.statValue} style={{ color: '#60a5fa' }}>
                            {assignments.length}
                        </div>
                        <div className={classes.statLabel}>Total Assigned</div>
                    </div>
                    <div className={classes.statCard}>
                        <div className={classes.statValue} style={{ color: '#34d399' }}>
                            {completedCount}
                        </div>
                        <div className={classes.statLabel}>Completed</div>
                    </div>
                    <div className={classes.statCard}>
                        <div className={classes.statValue} style={{ color: '#fb923c' }}>
                            {pendingCount}
                        </div>
                        <div className={classes.statLabel}>Pending</div>
                    </div>
                    <div className={classes.statCard}>
                        <div className={classes.statValue} style={{ color: '#fbbf24' }}>
                            {avgScore}%
                        </div>
                        <div className={classes.statLabel}>Average Score</div>
                    </div>
                </div>

                {assignments.length === 0 ? (
                    <div className={classes.emptyState}>
                        <div className={classes.emptyIcon}>📝</div>
                        <div className={classes.emptyText}>No homework assigned yet</div>
                        <p>Your teacher will assign homework soon!</p>
                    </div>
                ) : (
                    <div className={classes.homeworkList}>
                        {assignments.map(assignment => {
                            const report = getHomeworkReport(assignment.id);
                            const isCompleted = !!report;

                            return (
                                <div key={assignment.id} className={classes.homeworkCard}>
                                    <div className={classes.homeworkHeader}>
                                        <h3 className={classes.homeworkTitle}>
                                            {assignment.topicName || 'Homework Assignment'}
                                        </h3>
                                        <span
                                            className={`${classes.statusBadge} ${
                                                isCompleted
                                                    ? classes.completedBadge
                                                    : classes.pendingBadge
                                            }`}
                                        >
                                            {isCompleted ? '✓ Completed' : '⏱️ Pending'}
                                        </span>
                                    </div>

                                    <div className={classes.homeworkDate}>
                                        Assigned: {new Date(assignment.assignedAt?.seconds * 1000).toLocaleDateString()}
                                        {isCompleted && report.completedAt && (
                                            <> • Completed: {new Date(report.completedAt.seconds * 1000).toLocaleDateString()}</>
                                        )}
                                    </div>

                                    {isCompleted && report ? (
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fbbf24' }}>
                                                    {report.score}%
                                                </div>
                                                <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>
                                                    {report.correctAnswers}/{report.totalQuestions} correct
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleViewResults(assignment.id)}
                                                className={`${classes.actionButton} ${classes.viewButton}`}
                                            >
                                                View Results →
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleStartHomework(assignment.id)}
                                            className={`${classes.actionButton} ${classes.startButton}`}
                                        >
                                            Start Homework →
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentHomeworkListPage;
