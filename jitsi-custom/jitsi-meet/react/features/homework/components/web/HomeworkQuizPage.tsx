import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

import { ThemeProvider, useTheme } from '../../../base/ui/components/web/ThemeProvider';

import HomeworkQuiz from './HomeworkQuiz';

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

// Initialize Firebase (use different name to avoid conflicts)
const app = initializeApp(firebaseConfig, 'homework-quiz');
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
const HomeworkQuizPageInner: React.FC<IPageProps> = ({ homeworkId: propHomeworkId, studentId: propStudentId }) => {
    const [student, setStudent] = useState<any>(null);
    const [homework, setHomework] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { theme, setTheme } = useTheme();

    useEffect(() => {
        loadQuizData();
    }, [propHomeworkId, propStudentId]);

    const loadQuizData = async () => {
        const params = new URLSearchParams(window.location.search);
        const homeworkId = propHomeworkId || params.get('homework');
        const studentId = propStudentId || params.get('student') || params.get('studentId');

        console.log('Loading quiz:', { homeworkId, studentId });

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

            // Load questions
            const questionsRef = collection(db, 'telegramAssignmentQuestions');
            const questionsQuery = query(questionsRef, where('assignmentId', '==', homeworkId));
            const questionsSnapshot = await getDocs(questionsQuery);
            const questionsData = questionsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            console.log('Questions loaded:', questionsData.length);
            setQuestions(questionsData);

            setLoading(false);

        } catch (err) {
            console.error('Error loading quiz:', err);
            setError('Error loading quiz. Please refresh.');
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (!student) {
            window.location.href = '/';

            return;
        }

        window.location.href = `/student-homework.html?student=${encodeURIComponent(student.id)}`;
    };

    const handleSubmit = async (answers: Record<string, any>) => {
        if (!student || !homework) {
            return;
        }

        setSubmitting(true);

        try {
            console.log('Submitting answers:', answers);

            // Calculate score
            let correctAnswers = 0;
            const totalQuestions = questions.length;

            questions.forEach(question => {
                const userAnswer = answers[question.id];
                const correctAnswer = question.correctAnswer;

                if (userAnswer === correctAnswer) {
                    correctAnswers++;
                }
            });

            const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

            // Save report to Firebase
            const reportData = {
                studentId: student.id,
                homeworkId: homework.id,
                answers,
                correctAnswers,
                totalQuestions,
                score,
                completedAt: serverTimestamp(),
                teacherId: homework.teacherId || student.teacherUid
            };

            console.log('Saving report:', reportData);

            await addDoc(collection(db, 'telegramHomeworkReports'), reportData);

            // Navigate to results
            window.location.href = `/homework-results.html?homework=${encodeURIComponent(homework.id)}&student=${encodeURIComponent(student.id)}&score=${score}`;

        } catch (err) {
            console.error('Error submitting homework:', err);
            alert('Ошибка при отправке. Пожалуйста, попробуйте снова.');
            setSubmitting(false);
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
                Загрузка задания...
            </div>
        );
    }

    if (error || !student || !homework) {
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
                <div>{error || 'Задание не найдено'}</div>
                <button
                    onClick = { handleBack }
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
        <HomeworkQuiz
            homeworkId = { homework.id }
            loading = { loading }
            onBack = { handleBack }
            onSubmit = { handleSubmit }
            onThemeChange = { handleThemeChange }
            questions = { questions }
            results = { null }
            studentId = { student.id }
            studentName = { student.name }
            submitting = { submitting }
            theme = { theme } />
    );
};

/**
 * Container component for Homework Quiz page wrapped with ThemeProvider.
 *
 * @param {IPageProps} props - Component props.
 * @returns {JSX.Element}
 */
const HomeworkQuizPage: React.FC<IPageProps> = (props) => (
    <ThemeProvider>
        <HomeworkQuizPageInner {...props} />
    </ThemeProvider>
);

export default HomeworkQuizPage;
