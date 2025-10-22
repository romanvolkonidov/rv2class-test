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

            setReport(reportData);

            // Load questions from telegramQuestions collection by topicId (rv2class structure)
            const allQuestions: any[] = [];
            
            for (const topicId of topicIds) {
                const questionsSnapshot = await db.collection('telegramQuestions')
                    .where('topicId', '==', topicId)
                    .get();
                
                const topicQuestions = questionsSnapshot.docs.map((doc: any) => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                allQuestions.push(...topicQuestions);
            }

            // Sort by order field to maintain correct sequence
            allQuestions.sort((a, b) => {
                const orderA = a.order ?? 999999;
                const orderB = b.order ?? 999999;
                return orderA - orderB;
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
        if (!student) {
            window.location.href = '/';

            return;
        }

        window.location.href = `/static/student-homework.html?student=${encodeURIComponent(student.id)}`;
    };

    const handleBackToWelcome = () => {
        if (!student) {
            window.location.href = '/';

            return;
        }

        window.location.href = `/static/student-welcome.html?student=${encodeURIComponent(student.id)}`;
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
