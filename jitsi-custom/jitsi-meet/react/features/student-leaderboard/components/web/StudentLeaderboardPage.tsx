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
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
        position: 'relative',
        overflow: 'hidden',
        padding: '20px'
    },
    backgroundAnimation: {
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
        animation: '$pulse 4s ease-in-out infinite'
    },
    bgBlob1: {
        top: '25%',
        left: '25%',
        width: '500px',
        height: '500px',
        background: 'rgba(251, 191, 36, 0.1)'
    },
    bgBlob2: {
        bottom: '25%',
        right: '25%',
        width: '400px',
        height: '400px',
        background: 'rgba(139, 92, 246, 0.1)',
        animationDelay: '2s'
    },
    '@keyframes pulse': {
        '0%, 100%': {
            transform: 'scale(1) translate(0, 0)',
            opacity: 1
        },
        '50%': {
            transform: 'scale(1.1) translate(10%, 10%)',
            opacity: 0.8
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
        border: '4px solid rgba(251, 191, 36, 0.3)',
        borderTop: '4px solid rgba(251, 191, 36, 1)',
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
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        color: '#fff',
        fontSize: '16px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        marginBottom: '24px',
        '&:hover': {
            background: 'rgba(255, 255, 255, 0.1)',
            transform: 'translateY(-2px)'
        }
    },
    headerCard: {
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        padding: '32px',
        marginBottom: '32px',
        textAlign: 'center'
    },
    title: {
        fontSize: '36px',
        fontWeight: 'bold',
        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '8px'
    },
    subtitle: {
        fontSize: '16px',
        color: 'rgba(255, 255, 255, 0.6)',
        maxWidth: '600px',
        margin: '0 auto'
    },
    leaderboardList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    },
    studentCard: {
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        transition: 'all 0.3s ease',
        '&:hover': {
            background: 'rgba(255, 255, 255, 0.05)',
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }
    },
    currentStudent: {
        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.1) 100%)',
        border: '2px solid rgba(251, 191, 36, 0.3)',
        boxShadow: '0 8px 32px rgba(251, 191, 36, 0.3)'
    },
    top1: {
        background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 193, 7, 0.1) 100%)',
        borderColor: 'rgba(255, 215, 0, 0.4)'
    },
    top2: {
        background: 'linear-gradient(135deg, rgba(192, 192, 192, 0.15) 0%, rgba(158, 158, 158, 0.1) 100%)',
        borderColor: 'rgba(192, 192, 192, 0.4)'
    },
    top3: {
        background: 'linear-gradient(135deg, rgba(205, 127, 50, 0.15) 0%, rgba(184, 115, 51, 0.1) 100%)',
        borderColor: 'rgba(205, 127, 50, 0.4)'
    },
    rankBadge: {
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        fontWeight: 800,
        flexShrink: 0,
        background: 'rgba(41, 41, 41, 0.8)',
        color: '#A4B5B8'
    },
    rankBadgeTop1: {
        background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
        color: '#ffffff',
        boxShadow: '0 4px 16px rgba(255, 215, 0, 0.4)'
    },
    rankBadgeTop2: {
        background: 'linear-gradient(135deg, #C0C0C0 0%, #9E9E9E 100%)',
        color: '#ffffff',
        boxShadow: '0 4px 16px rgba(192, 192, 192, 0.4)'
    },
    rankBadgeTop3: {
        background: 'linear-gradient(135deg, #CD7F32 0%, #B87333 100%)',
        color: '#ffffff',
        boxShadow: '0 4px 16px rgba(205, 127, 50, 0.4)'
    },
    studentInfo: {
        flex: 1,
        minWidth: 0
    },
    studentName: {
        fontSize: '22px',
        fontWeight: 700,
        color: '#ffffff',
        marginBottom: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap'
    },
    currentBadge: {
        fontSize: '11px',
        fontWeight: 700,
        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
        color: '#ffffff',
        padding: '4px 10px',
        borderRadius: '12px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    },
    medalEmoji: {
        fontSize: '24px'
    },
    studentStats: {
        display: 'flex',
        gap: '20px',
        flexWrap: 'wrap',
        fontSize: '14px',
        color: '#A4B5B8',
        marginTop: '8px'
    },
    statItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
    },
    studentScores: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px'
    },
    scoreMain: {
        fontSize: '28px',
        fontWeight: 800,
        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
    },
    scoreDetail: {
        fontSize: '14px',
        color: '#A4B5B8',
        fontWeight: 600
    },
    emptyState: {
        textAlign: 'center',
        padding: '80px 20px',
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px'
    },
    emptyIcon: {
        fontSize: '64px',
        marginBottom: '16px'
    },
    emptyText: {
        fontSize: '18px',
        fontWeight: 600,
        color: '#fff',
        marginBottom: '8px'
    },
    emptySubtext: {
        fontSize: '14px',
        color: 'rgba(255, 255, 255, 0.6)'
    }
}));

interface StudentRating {
    studentId: string;
    studentName: string;
    rank: number;
    overallRating: number;
    averagePercentage: number;
    completedHomeworks: number;
    totalAssigned: number;
}

const SHARED_COLLECTION_TEACHERS = ['romanvolkonidov@gmail.com', 'violetta6520@gmail.com'];

const StudentLeaderboardPage: React.FC = () => {
    const { classes, cx } = useStyles();
    const [loading, setLoading] = useState(true);
    const [ratings, setRatings] = useState<StudentRating[]>([]);
    const [currentStudentId, setCurrentStudentId] = useState<string>('');
    const [teacherEmail, setTeacherEmail] = useState<string>('');

    useEffect(() => {
        loadLeaderboard();
    }, []);

    const loadLeaderboard = async () => {
        setLoading(true);
        try {
            // Get studentId and teacherEmail from URL
            const params = new URLSearchParams(window.location.search);
            const sid = params.get('studentId');
            const tEmail = params.get('teacherEmail') || '';

            if (sid) {
                setCurrentStudentId(sid);
            }
            setTeacherEmail(tEmail);

            // Determine which collection to use
            const isSharedCollection = SHARED_COLLECTION_TEACHERS.includes(tEmail);
            const collectionName = isSharedCollection ? 'students' : `students_${tEmail}`;

            // Fetch students from the appropriate collection
            const studentsRef = collection(db, collectionName);
            const studentsSnapshot = await getDocs(studentsRef);
            let students = studentsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // For non-shared collections, filter by teacherEmail
            if (!isSharedCollection) {
                students = students.filter((s: any) => s.teacherEmail === tEmail);
            }

            const ratingsData: StudentRating[] = [];

            // Calculate ratings for each student
            for (const student of students) {
                // Get assignments
                const assignmentsRef = collection(db, 'telegramAssignments');
                const assignmentsQuery = query(assignmentsRef, where('studentId', '==', student.id));
                const assignmentsSnapshot = await getDocs(assignmentsQuery);
                const totalAssigned = assignmentsSnapshot.size;

                if (totalAssigned === 0) continue;

                // Get reports
                const reportsRef = collection(db, 'telegramHomeworkReports');
                const reportsQuery = query(reportsRef, where('studentId', '==', student.id));
                const reportsSnapshot = await getDocs(reportsQuery);

                let totalCorrect = 0;
                let totalQuestions = 0;
                let completedCount = 0;

                reportsSnapshot.forEach(doc => {
                    const report = doc.data();
                    if (report.totalQuestions && report.totalQuestions > 0) {
                        totalCorrect += report.correctAnswers || 0;
                        totalQuestions += report.totalQuestions;
                        completedCount++;
                    }
                });

                if (completedCount > 0) {
                    const percentage = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
                    const overallRating = (percentage / 100) * 10;

                    ratingsData.push({
                        studentId: student.id,
                        studentName: (student as any).name || 'Unknown Student',
                        rank: 0, // Will be set after sorting
                        overallRating: overallRating,
                        averagePercentage: percentage,
                        completedHomeworks: completedCount,
                        totalAssigned: totalAssigned
                    });
                }
            }

            // Sort by average percentage and assign ranks
            ratingsData.sort((a, b) => b.averagePercentage - a.averagePercentage);
            ratingsData.forEach((rating, index) => {
                rating.rank = index + 1;
            });

            setRatings(ratingsData);
        } catch (error) {
            console.error('Error loading leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (currentStudentId) {
            window.location.href = `/static/student-welcome.html?studentId=${encodeURIComponent(currentStudentId)}`;
        } else {
            window.history.back();
        }
    };

    const getMedalEmoji = (rank: number): string => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return '';
    };

    const getCardClass = (rank: number, isCurrentStudent: boolean): string => {
        const classes = [useStyles().classes.studentCard];
        if (isCurrentStudent) classes.push(useStyles().classes.currentStudent);
        if (rank === 1) classes.push(useStyles().classes.top1);
        else if (rank === 2) classes.push(useStyles().classes.top2);
        else if (rank === 3) classes.push(useStyles().classes.top3);
        return classes.join(' ');
    };

    const getRankBadgeClass = (rank: number): string => {
        if (rank === 1) return cx(classes.rankBadge, classes.rankBadgeTop1);
        if (rank === 2) return cx(classes.rankBadge, classes.rankBadgeTop2);
        if (rank === 3) return cx(classes.rankBadge, classes.rankBadgeTop3);
        return classes.rankBadge;
    };

    if (loading) {
        return (
            <div className={classes.container}>
                <div className={classes.backgroundAnimation}>
                    <div className={cx(classes.bgBlob, classes.bgBlob1)}></div>
                    <div className={cx(classes.bgBlob, classes.bgBlob2)}></div>
                </div>
                <div className={classes.loadingContainer}>
                    <div className={classes.spinner}></div>
                </div>
            </div>
        );
    }

    return (
        <div className={classes.container}>
            <div className={classes.backgroundAnimation}>
                <div className={cx(classes.bgBlob, classes.bgBlob1)}></div>
                <div className={cx(classes.bgBlob, classes.bgBlob2)}></div>
            </div>

            <div className={classes.content}>
                <button onClick={handleBack} className={classes.backButton}>
                    ← Back
                </button>

                <div className={classes.headerCard}>
                    <h1 className={classes.title}>🏆 Student Leaderboard</h1>
                    <p className={classes.subtitle}>
                        Rankings based on homework completion and average scores
                    </p>
                </div>

                {ratings.length === 0 ? (
                    <div className={classes.emptyState}>
                        <div className={classes.emptyIcon}>📊</div>
                        <p className={classes.emptyText}>No Data Available</p>
                        <p className={classes.emptySubtext}>Complete homework to see leaderboard</p>
                    </div>
                ) : (
                    <div className={classes.leaderboardList}>
                        {ratings.map((rating) => {
                            const isCurrentStudent = rating.studentId === currentStudentId;
                            const medalEmoji = getMedalEmoji(rating.rank);

                            return (
                                <div
                                    key={rating.studentId}
                                    className={getCardClass(rating.rank, isCurrentStudent)}
                                >
                                    <div className={getRankBadgeClass(rating.rank)}>
                                        {medalEmoji || rating.rank}
                                    </div>

                                    <div className={classes.studentInfo}>
                                        <div className={classes.studentName}>
                                            <span>{rating.studentName}</span>
                                            {medalEmoji && (
                                                <span className={classes.medalEmoji}>{medalEmoji}</span>
                                            )}
                                            {isCurrentStudent && (
                                                <span className={classes.currentBadge}>You!</span>
                                            )}
                                        </div>

                                        <div className={classes.studentStats}>
                                            <div className={classes.statItem}>
                                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                                </svg>
                                                <span>
                                                    {rating.completedHomeworks} of {rating.totalAssigned} completed
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={classes.studentScores}>
                                        <div className={classes.scoreMain}>
                                            {rating.averagePercentage.toFixed(1)}%
                                        </div>
                                        <div className={classes.scoreDetail}>
                                            {rating.overallRating.toFixed(1)}/10
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentLeaderboardPage;
