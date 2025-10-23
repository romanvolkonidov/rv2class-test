import React, { useState, useEffect } from 'react';

import { ThemeProvider, useTheme } from '../../../base/ui/components/web/ThemeProvider';

import HomeworkResults from './HomeworkResults';

// Use Firebase Compat API from window
declare global {
    interface Window {
        firebaseApp: any;
        firebaseDb: any;
        firebaseAuth: any;
    }
}

interface IPageProps {
    homeworkId?: string;
    studentId?: string;
}

/**
 * Inner component that uses theme context.
 *
 * @param {IPageProps} props - Component props.
 * @returns {JSX.Element}
 */
const HomeworkResultsPageInner: React.FC<IPageProps> = ({ homeworkId: propHomeworkId, studentId: propStudentId }) => {
    const [student, setStudent] = useState<any>(null);
    const [homework, setHomework] = useState<any>(null);
    const [report, setReport] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { theme, setTheme } = useTheme();

    useEffect(() => {
        loadResultsData();
    }, [propHomeworkId, propStudentId]);

    const loadResultsData = async () => {
        const params = new URLSearchParams(window.location.search);
        const homeworkId = propHomeworkId || params.get('homework');
        const studentId = propStudentId || params.get('student') || params.get('studentId');

        console.log('Loading results:', { homeworkId, studentId });

        if (!homeworkId || !studentId) {
            setError('Homework ID or Student ID not provided');
            setLoading(false);

            return;
        }

        if (!window.firebaseDb) {
            setError('Firebase not initialized');
            setLoading(false);
            return;
        }

        const db = window.firebaseDb;

        try {
            // Load student
            let studentData: any = null;
            const sharedDoc = await db.collection('students').doc(studentId).get();

            if (sharedDoc.exists) {
                studentData = { id: sharedDoc.id, ...sharedDoc.data() };
            } else {
                const teacherDoc = await db.collection('teacherStudents').doc(studentId).get();

                if (teacherDoc.exists) {
                    studentData = { id: teacherDoc.id, ...teacherDoc.data() };
                }
            }

            if (!studentData) {
                setError('Student not found');
                setLoading(false);

                return;
            }

            setStudent(studentData);

            // Load homework
            const homeworkDoc = await db.collection('telegramAssignments').doc(homeworkId).get();

            if (!homeworkDoc.exists) {
                setError('Homework not found');
                setLoading(false);

                return;
            }

            const homeworkData = { id: homeworkDoc.id, ...homeworkDoc.data() };

            // Get topicIds from homework (rv2class structure)
            let topicIds = homeworkData.topicIds || [];
            if (topicIds.length === 0 && homeworkData.topicId) {
                topicIds = [homeworkData.topicId];
            }

            setHomework(homeworkData);

            // Load report
            const reportsSnapshot = await db.collection('telegramHomeworkReports')
                .where('studentId', '==', studentId)
                .where('homeworkId', '==', homeworkId)
                .get();

            if (reportsSnapshot.empty) {
                setError('No results found for this homework');
                setLoading(false);

                return;
            }

            const reportData = {
                id: reportsSnapshot.docs[0].id,
                ...reportsSnapshot.docs[0].data()
            };

            console.log('📊 Report data loaded:', {
                reportId: reportData.id,
                hasSubmittedAnswers: !!reportData.submittedAnswers,
                hasAnswers: !!reportData.answers,
                submittedAnswersLength: reportData.submittedAnswers?.length,
                answersLength: reportData.answers?.length,
                usingField: reportData.submittedAnswers ? 'submittedAnswers' : 'answers',
                sampleAnswer: (reportData.submittedAnswers || reportData.answers)?.[0],
                score: reportData.score,
                correctAnswers: reportData.correctAnswers
            });

            setReport(reportData);

            // OPTIMIZED: Load questions efficiently
            let allQuestions: any[] = [];
            
            if (topicIds.length === 0) {
                console.log('No topics assigned to homework');
            } else if (topicIds.length <= 10) {
                // Use 'in' query for up to 10 topics (Firestore limit)
                const questionsSnapshot = await db.collection('telegramQuestions')
                    .where('topicId', 'in', topicIds)
                    .get();
                
                allQuestions = questionsSnapshot.docs.map((doc: any) => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } else {
                // For more than 10 topics, use parallel queries
                const questionPromises = topicIds.map((topicId: string) => 
                    db.collection('telegramQuestions')
                        .where('topicId', '==', topicId)
                        .get()
                );
                
                const snapshots = await Promise.all(questionPromises);
                
                snapshots.forEach((snapshot) => {
                    const topicQuestions = snapshot.docs.map((doc: any) => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    allQuestions.push(...topicQuestions);
                });
            }

            // Sort by order field to maintain correct sequence
            allQuestions.sort((a, b) => {
                const orderA = a.order ?? 999999;
                const orderB = b.order ?? 999999;
                return orderA - orderB;
            });

            console.log('❓ Questions loaded:', {
                totalQuestions: allQuestions.length,
                firstQuestion: allQuestions[0],
                questionIds: allQuestions.map(q => q.id)
            });

            setQuestions(allQuestions);

            setLoading(false);

        } catch (err) {
            console.error('Error loading results:', err);
            setError('Error loading results. Please refresh.');
            setLoading(false);
        }
    };

    const handleBackToHomework = () => {
        // Go back to student homework list
        if (student?.id) {
            window.location.href = `/static/student-homework.html?student=${encodeURIComponent(student.id)}`;
        } else {
            window.location.href = '/';
        }
    };

    const handleBackToWelcome = () => {
        // Go back to student welcome page
        if (student?.id) {
            window.location.href = `/static/student-welcome.html?studentId=${encodeURIComponent(student.id)}`;
        } else {
            window.location.href = '/';
        }
    };

    const handleThemeChange = (newTheme: 'dark' | 'light') => {
        setTheme(newTheme);
    };

    if (loading) {
        return (
            <div style = {{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                fontSize: '18px',
                color: '#A4B5B8'
            }}>
                Загрузка результатов...
            </div>
        );
    }

    if (error || !student || !homework || !report) {
        return (
            <div style = {{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                fontSize: '18px',
                color: '#E15350',
                gap: '16px'
            }}>
                <div>{error || 'Результаты не найдены'}</div>
                <button
                    onClick = { handleBackToHomework }
                    style = {{
                        padding: '12px 24px',
                        backgroundColor: '#3D7CC9',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                    }}>
                    Назад к заданиям
                </button>
            </div>
        );
    }

    return (
        <HomeworkResults
            homework = { homework }
            onBackToHomework = { handleBackToHomework }
            onBackToWelcome = { handleBackToWelcome }
            onThemeChange = { handleThemeChange }
            questions = { questions }
            report = { report }
            student = { student }
            theme = { theme } />
    );
};

/**
 * Container component for Homework Results page wrapped with ThemeProvider.
 *
 * @param {IPageProps} props - Component props.
 * @returns {JSX.Element}
 */
const HomeworkResultsPage: React.FC<IPageProps> = (props) => (
    <ThemeProvider>
        <HomeworkResultsPageInner {...props} />
    </ThemeProvider>
);

export default HomeworkResultsPage;
