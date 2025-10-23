import React, { useState, useEffect } from 'react';

import { ThemeProvider, useTheme } from '../../../base/ui/components/web/ThemeProvider';

import HomeworkQuiz from './HomeworkQuiz';

// Use Firebase Compat API from window
declare global {
    interface Window {
        firebaseApp: any;
        firebaseDb: any;
        firebaseAuth: any;
        firebase: any;
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

        console.log('Loading quiz:', { homeworkId, studentId, allParams: Object.fromEntries(params) });

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

            console.log('Checking students collection:', { exists: sharedDoc.exists, id: studentId });

            if (sharedDoc.exists) {
                studentData = { id: sharedDoc.id, ...sharedDoc.data() };
            } else {
                const teacherDoc = await db.collection('teacherStudents').doc(studentId).get();

                console.log('Checking teacherStudents collection:', { exists: teacherDoc.exists, id: studentId });

                if (teacherDoc.exists) {
                    studentData = { id: teacherDoc.id, ...teacherDoc.data() };
                }
            }

            if (!studentData) {
                setError('Student not found');
                setLoading(false);

                return;
            }

            console.log('Student loaded:', studentData);
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

            console.log('Homework loaded:', { 
                id: homeworkData.id, 
                topicIds: topicIds
            });
            setHomework(homeworkData);

            // OPTIMIZED: Load questions in parallel or with 'in' query if few topics
            let allQuestions: any[] = [];
            
            if (topicIds.length === 0) {
                console.log('No topics assigned to homework');
            } else if (topicIds.length <= 10) {
                // Use 'in' query for up to 10 topics (Firestore limit)
                console.log('Using optimized "in" query for', topicIds.length, 'topics');
                const questionsSnapshot = await db.collection('telegramQuestions')
                    .where('topicId', 'in', topicIds)
                    .get();
                
                allQuestions = questionsSnapshot.docs.map((doc: any) => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                console.log(`Found ${allQuestions.length} questions for ${topicIds.length} topics`);
            } else {
                // For more than 10 topics, use parallel queries
                console.log('Using parallel queries for', topicIds.length, 'topics');
                const questionPromises = topicIds.map((topicId: string) => 
                    db.collection('telegramQuestions')
                        .where('topicId', '==', topicId)
                        .get()
                );
                
                const snapshots = await Promise.all(questionPromises);
                
                snapshots.forEach((snapshot, index) => {
                    const topicQuestions = snapshot.docs.map((doc: any) => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    console.log(`Found ${topicQuestions.length} questions for topic ${topicIds[index]}`);
                    allQuestions.push(...topicQuestions);
                });
            }

            // Sort by order field to maintain correct sequence
            allQuestions.sort((a, b) => {
                const orderA = a.order ?? 999999;
                const orderB = b.order ?? 999999;
                return orderA - orderB;
            });

            console.log('Total questions loaded:', allQuestions.length);
            setQuestions(allQuestions);

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

        window.location.href = `/static/student-homework.html?student=${encodeURIComponent(student.id)}`;
    };

    const handleSubmit = async (answers: Record<string, any>) => {
        if (!student || !homework) {
            return;
        }

        setSubmitting(true);

        if (!window.firebaseDb) {
            alert('Firebase not initialized');
            setSubmitting(false);
            return;
        }

        const db = window.firebaseDb;

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

            // Convert answers object to array format for database
            const submittedAnswers = Object.entries(answers).map(([questionId, answer]) => ({
                questionId,
                answer
            }));

            console.log('📊 Submission Summary:');
            console.log(`   Total questions: ${totalQuestions}`);
            console.log(`   Correct answers: ${correctAnswers}`);
            console.log(`   Score: ${score}%`);
            console.log(`   Submitted answers count: ${submittedAnswers.length}`);

            // Save report to Firebase
            const reportData = {
                studentId: student.id,
                homeworkId: homework.id,
                score,
                correctAnswers,
                totalQuestions,
                submittedAnswers,
                completedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
                completedVia: 'jitsi-web',
                teacherId: homework.teacherId || student.teacherUid
            };

            console.log('💾 Saving report to database...');
            console.log('   Sample submitted answer:', submittedAnswers[0]);

            await db.collection('telegramHomeworkReports').add(reportData);
            
            console.log('✅ Report saved successfully!');

            // Navigate to results
            window.location.href = `/static/homework-results.html?homework=${encodeURIComponent(homework.id)}&student=${encodeURIComponent(student.id)}&score=${score}`;

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
