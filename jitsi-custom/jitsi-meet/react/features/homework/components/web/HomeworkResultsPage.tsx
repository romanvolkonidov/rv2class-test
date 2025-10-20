import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

import { ThemeProvider, useTheme } from '../../../base/ui/components/web/ThemeProvider';

import HomeworkResults from './HomeworkResults';

// Firebase configuration
const firebaseConfig = {
    apiKey: 'AIzaSyB_VsLZaaQ_m3WNVlPjfhy715BXo8ax004',
    authDomain: 'tracking-budget-app.firebaseapp.com',
    databaseURL: 'https://tracking-budget-app-default-rtdb.firebaseio.com',
    projectId: 'tracking-budget-app',
    storageBucket: 'tracking-budget-app.appspot.com',
    messagingSenderId: '912992088190',
    appId: '1:912992088190:web:926c8826b3bc39e2eb282f'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig, 'homework-results');
const db = getFirestore(app);

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

        try {
            // Load student
            let studentData: any = null;
            const sharedDoc = await getDoc(doc(db, 'students', studentId));

            if (sharedDoc.exists()) {
                studentData = { id: sharedDoc.id, ...sharedDoc.data() };
            } else {
                const teacherDoc = await getDoc(doc(db, 'teacherStudents', studentId));

                if (teacherDoc.exists()) {
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
            const homeworkDoc = await getDoc(doc(db, 'telegramAssignments', homeworkId));

            if (!homeworkDoc.exists()) {
                setError('Homework not found');
                setLoading(false);

                return;
            }

            const homeworkData = { id: homeworkDoc.id, ...homeworkDoc.data() };

            setHomework(homeworkData);

            // Load report
            const reportsRef = collection(db, 'telegramHomeworkReports');
            const reportsQuery = query(
                reportsRef,
                where('studentId', '==', studentId),
                where('homeworkId', '==', homeworkId)
            );
            const reportsSnapshot = await getDocs(reportsQuery);

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

            // Load questions for detailed results
            const questionsRef = collection(db, 'telegramAssignmentQuestions');
            const questionsQuery = query(questionsRef, where('assignmentId', '==', homeworkId));
            const questionsSnapshot = await getDocs(questionsQuery);
            const questionsData = questionsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setQuestions(questionsData);

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

        window.location.href = `/student-homework.html?student=${encodeURIComponent(student.id)}`;
    };

    const handleBackToWelcome = () => {
        if (!student) {
            window.location.href = '/';

            return;
        }

        window.location.href = `/student-welcome.html?student=${encodeURIComponent(student.id)}`;
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
