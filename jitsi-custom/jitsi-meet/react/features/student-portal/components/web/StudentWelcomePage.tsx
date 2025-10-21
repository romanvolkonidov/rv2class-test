import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

import { ThemeProvider, useTheme } from '../../../base/ui/components/web/ThemeProvider';

import StudentWelcome from './StudentWelcome';

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
const app = initializeApp(firebaseConfig, 'student-portal');
const db = getFirestore(app);

interface IStudentData {
    id: string;
    name: string;
    teacher?: string;
    teacherName?: string;
    teacherUid?: string;
    teacherEmail?: string;  // NEW: Store teacher's email
}

interface IPageProps {
    /**
     * Student ID from URL parameter.
     */
    studentId?: string;
}

/**
 * Inner component that uses the theme context.
 *
 * @param {IPageProps} props - Component props.
 * @returns {JSX.Element}
 */
const StudentWelcomePageInner: React.FC<IPageProps> = ({ studentId: propStudentId }) => {
    const [student, setStudent] = useState<IStudentData | null>(null);
    const [uncompletedCount, setUncompletedCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { theme, setTheme } = useTheme();

    useEffect(() => {
        loadStudentData();
    }, [propStudentId]);

    const loadStudentData = async () => {
        // Get student ID and teacherEmail from props or URL query parameter
        const params = new URLSearchParams(window.location.search);
        const studentId = propStudentId || params.get('student') || params.get('studentId');
        const teacherEmail = params.get('teacherEmail') || '';

        if (!studentId) {
            setError('Student not found');
            setLoading(false);

            return;
        }

        try {
            let studentData: IStudentData | null = null;

            // Determine which collection to check based on teacherEmail
            const SHARED_TEACHERS = ['romanvolkonidov@gmail.com', 'violetta6520@gmail.com'];
            const isSharedCollection = !teacherEmail || SHARED_TEACHERS.includes(teacherEmail);

            if (isSharedCollection) {
                // Try shared 'students' collection
                const sharedDoc = await getDoc(doc(db, 'students', studentId));

                if (sharedDoc.exists()) {
                    const data = sharedDoc.data();

                    studentData = {
                        id: sharedDoc.id,
                        name: data.name || 'Student',
                        teacher: data.teacher || data.teacherName,
                        teacherName: data.teacherName || data.teacher,
                        teacherUid: data.teacherUid,
                        teacherEmail: data.teacherEmail || teacherEmail
                    };
                }
            } else {
                // Try teacher-specific collection
                const collectionName = `students_${teacherEmail}`;
                const teacherDoc = await getDoc(doc(db, collectionName, studentId));

                if (teacherDoc.exists()) {
                    const data = teacherDoc.data();

                    studentData = {
                        id: teacherDoc.id,
                        name: data.name || 'Student',
                        teacher: data.teacher || data.teacherName,
                        teacherName: data.teacherName || data.teacher,
                        teacherUid: data.teacherUid,
                        teacherEmail: data.teacherEmail || teacherEmail
                    };
                }
            }

            // Fallback: try 'teacherStudents' collection (legacy)
            if (!studentData) {
                const teacherDoc = await getDoc(doc(db, 'teacherStudents', studentId));

                if (teacherDoc.exists()) {
                    const data = teacherDoc.data();

                    studentData = {
                        id: teacherDoc.id,
                        name: data.name || 'Student',
                        teacher: data.teacher || data.teacherName,
                        teacherName: data.teacherName || data.teacher,
                        teacherUid: data.teacherUid,
                        teacherEmail: data.teacherEmail || teacherEmail
                    };
                }
            }

            if (!studentData) {
                setError('Student not found');
                setLoading(false);

                return;
            }

            setStudent(studentData);

            // Count uncompleted homework
            const homeworkQuery = query(
                collection(db, 'telegramAssignments'),
                where('studentId', '==', studentId),
                where('completed', '==', false)
            );
            const homeworkSnapshot = await getDocs(homeworkQuery);

            setUncompletedCount(homeworkSnapshot.docs.length);
            setLoading(false);

        } catch (err) {
            console.error('Error loading student:', err);
            setError('Error loading student data. Please refresh.');
            setLoading(false);
        }
    };

    const handleJoinLesson = () => {
        console.log('handleJoinLesson called, student:', student);

        if (!student) {
            console.error('No student data available');

            return;
        }

        const teacherUid = student.teacherUid || 'romanvolkonidov';
        const teacherRoom = `teacher-${teacherUid.substring(0, 8)}`;

        console.log('Joining room:', teacherRoom);

        // Store teacher info in localStorage for room
        const teacherFirstName = (student.teacher || 'Roman').split(' ')[0];

        localStorage.setItem('teacherFirstName', teacherFirstName);
        localStorage.setItem('teacherRoomId', teacherRoom);

        // Store student name for prejoin page (Jitsi will use this as display name)
        localStorage.setItem('studentName', student.name);
        localStorage.setItem('studentId', student.id);

        // Redirect to Jitsi room with student name in URL config
        // Jitsi prejoin page will show camera/mic preview before joining
        const roomUrl = `/${teacherRoom}#config.prejoinPageEnabled=true&userInfo.displayName=${encodeURIComponent(student.name)}`;

        console.log('Redirecting to prejoin:', roomUrl);
        window.location.href = roomUrl;
    };

    const handleViewHomework = () => {
        console.log('handleViewHomework called, student:', student);

        if (!student) {
            console.error('No student data available');

            return;
        }

        // Navigate to homework page
        const homeworkUrl = `/static/student-homework.html?studentId=${encodeURIComponent(student.id)}`;

        console.log('Redirecting to:', homeworkUrl);
        window.location.href = homeworkUrl;
    };

    const handleViewLeaderboard = () => {
        console.log('handleViewLeaderboard called, student:', student);

        if (!student) {
            console.error('No student data available');

            return;
        }

        // Navigate to leaderboard page with teacherEmail
        const teacherEmail = student.teacherEmail || '';
        const leaderboardUrl = `/static/student-leaderboard.html?studentId=${encodeURIComponent(student.id)}&teacherEmail=${encodeURIComponent(teacherEmail)}`;

        console.log('Redirecting to:', leaderboardUrl);
        window.location.href = leaderboardUrl;
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
                Loading...
            </div>
        );
    }

    if (error || !student) {
        return (
            <div style = {{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                fontSize: '18px',
                color: '#E15350'
            }}>
                {error || 'Student not found'}
            </div>
        );
    }

    return (
        <StudentWelcome
            onJoinLesson = { handleJoinLesson }
            onThemeChange = { handleThemeChange }
            onViewHomework = { handleViewHomework }
            onViewLeaderboard = { handleViewLeaderboard }
            student = { student }
            theme = { theme }
            uncompletedCount = { uncompletedCount } />
    );
};

/**
 * Container component for Student Welcome page wrapped with ThemeProvider.
 *
 * @param {IPageProps} props - Component props.
 * @returns {JSX.Element}
 */
const StudentWelcomePage: React.FC<IPageProps> = (props) => (
    <ThemeProvider>
        <StudentWelcomePageInner {...props} />
    </ThemeProvider>
);

export default StudentWelcomePage;
