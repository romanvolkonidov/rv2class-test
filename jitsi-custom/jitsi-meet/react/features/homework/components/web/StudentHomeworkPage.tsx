import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';

import { ThemeProvider, useTheme } from '../../../base/ui/components/web/ThemeProvider';

import StudentHomeworkList from './StudentHomeworkList';

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
const app = initializeApp(firebaseConfig, 'student-homework');
const db = getFirestore(app);

interface IPageProps {
    /**
     * Student ID from URL parameter.
     */
    studentId?: string;
}

/**
 * Inner component that uses theme context.
 *
 * @param {IPageProps} props - Component props.
 * @returns {JSX.Element}
 */
const StudentHomeworkPageInner: React.FC<IPageProps> = ({ studentId: propStudentId }) => {
    const [student, setStudent] = useState<any>(null);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { theme, setTheme } = useTheme();

    useEffect(() => {
        loadHomeworkData();
    }, [propStudentId]);

    const loadHomeworkData = async () => {
        // Get student ID from props or URL query parameter
        const params = new URLSearchParams(window.location.search);
        const studentId = propStudentId || params.get('student') || params.get('studentId');

        console.log('Loading homework for student:', studentId);

        if (!studentId) {
            setError('Student ID not provided');
            setLoading(false);

            return;
        }

        try {
            // Load student info
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

            console.log('Student loaded:', studentData);
            setStudent(studentData);

            // Load homework assignments
            const assignmentsRef = collection(db, 'telegramAssignments');
            const assignmentsQuery = query(
                assignmentsRef,
                where('studentId', '==', studentId),
                orderBy('assignedAt', 'desc')
            );
            const assignmentsSnapshot = await getDocs(assignmentsQuery);
            const assignmentsData = assignmentsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            console.log('Assignments loaded:', assignmentsData.length);
            setAssignments(assignmentsData);

            // Load homework reports
            const reportsRef = collection(db, 'telegramHomeworkReports');
            const reportsQuery = query(reportsRef, where('studentId', '==', studentId));
            const reportsSnapshot = await getDocs(reportsQuery);
            const reportsData = reportsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            console.log('Reports loaded:', reportsData.length);
            setReports(reportsData);

            setLoading(false);

        } catch (err) {
            console.error('Error loading homework:', err);
            setError('Error loading homework data. Please refresh.');
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (!student) {
            window.location.href = '/';

            return;
        }

        // Go back to welcome page
        window.location.href = `/static/student-welcome.html?studentId=${encodeURIComponent(student.id)}`;
    };

    const handleStartHomework = (homeworkId: string) => {
        console.log('Starting homework:', homeworkId);

        // Navigate to homework quiz page
        window.location.href = `/static/homework-quiz.html?homework=${encodeURIComponent(homeworkId)}&student=${encodeURIComponent(student.id)}`;
    };

    const handleViewResults = (homeworkId: string) => {
        console.log('Viewing results for homework:', homeworkId);

        // Navigate to homework results page
        window.location.href = `/static/homework-results.html?homework=${encodeURIComponent(homeworkId)}&student=${encodeURIComponent(student.id)}`;
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
                Загрузка...
            </div>
        );
    }

    if (error || !student) {
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
                <div>{error || 'Студент не найден'}</div>
                <button
                    onClick = { () => window.location.href = '/' }
                    style = {{
                        padding: '12px 24px',
                        backgroundColor: '#3D7CC9',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                    }}>
                    На главную
                </button>
            </div>
        );
    }

    return (
        <StudentHomeworkList
            assignments = { assignments }
            loading = { loading }
            onBack = { handleBack }
            onStartHomework = { handleStartHomework }
            onThemeChange = { handleThemeChange }
            onViewResults = { handleViewResults }
            reports = { reports }
            studentId = { student.id }
            studentName = { student.name }
            theme = { theme } />
    );
};

/**
 * Container component for Student Homework page wrapped with ThemeProvider.
 *
 * @param {IPageProps} props - Component props.
 * @returns {JSX.Element}
 */
const StudentHomeworkPage: React.FC<IPageProps> = (props) => (
    <ThemeProvider>
        <StudentHomeworkPageInner {...props} />
    </ThemeProvider>
);

export default StudentHomeworkPage;
