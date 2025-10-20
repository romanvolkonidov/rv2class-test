import {
    SET_STUDENT_DATA,
    SET_HOMEWORK_COUNT,
    SET_LOADING,
    SET_ERROR
} from './actionTypes';

/**
 * Sets the current student data.
 *
 * @param {Object} student - The student data.
 * @returns {{
 *     type: SET_STUDENT_DATA,
 *     student: Object
 * }}
 */
export function setStudentData(student: any) {
    return {
        type: SET_STUDENT_DATA,
        student
    };
}

/**
 * Sets the homework count.
 *
 * @param {number} count - The number of uncompleted homework assignments.
 * @returns {{
 *     type: SET_HOMEWORK_COUNT,
 *     count: number
 * }}
 */
export function setHomeworkCount(count: number) {
    return {
        type: SET_HOMEWORK_COUNT,
        count
    };
}

/**
 * Sets the loading state.
 *
 * @param {boolean} loading - Whether data is loading.
 * @returns {{
 *     type: SET_LOADING,
 *     loading: boolean
 * }}
 */
export function setLoading(loading: boolean) {
    return {
        type: SET_LOADING,
        loading
    };
}

/**
 * Sets the error state.
 *
 * @param {string | null} error - The error message.
 * @returns {{
 *     type: SET_ERROR,
 *     error: string | null
 * }}
 */
export function setError(error: string | null) {
    return {
        type: SET_ERROR,
        error
    };
}

/**
 * Loads student data from Firebase.
 *
 * @param {string} studentId - The student ID from URL.
 * @returns {Function}
 */
export function loadStudentData(studentId: string) {
    return async (dispatch: any) => {
        dispatch(setLoading(true));
        dispatch(setError(null));

        try {
            // TODO: Implement Firebase loading
            // Example:
            /*
            const { db } = require('../../../app/firebase');
            const { doc, getDoc, collection, query, where, getDocs } = require('firebase/firestore');

            // Try shared 'students' collection first
            const sharedDoc = await getDoc(doc(db, 'students', studentId));
            let studentData = null;

            if (sharedDoc.exists()) {
                studentData = { id: sharedDoc.id, ...sharedDoc.data() };
            } else {
                // Try 'teacherStudents' collection
                const teacherDoc = await getDoc(doc(db, 'teacherStudents', studentId));
                if (teacherDoc.exists()) {
                    studentData = { id: teacherDoc.id, ...teacherDoc.data() };
                }
            }

            if (!studentData) {
                dispatch(setError('Student not found'));
                dispatch(setLoading(false));
                return;
            }

            dispatch(setStudentData(studentData));

            // Count uncompleted homework
            const homeworkQuery = query(
                collection(db, 'telegramAssignments'),
                where('studentId', '==', studentId)
            );
            const homeworkSnapshot = await getDocs(homeworkQuery);
            const uncompleted = homeworkSnapshot.docs.filter(
                doc => !doc.data().completed
            ).length;
            dispatch(setHomeworkCount(uncompleted));
            */

            // Mock data for now
            const mockStudent = {
                id: studentId,
                name: 'Alex Johnson',
                teacher: 'Roman',
                teacherUid: 'romanvolkonidov'
            };

            dispatch(setStudentData(mockStudent));
            dispatch(setHomeworkCount(3));
            dispatch(setLoading(false));

        } catch (error) {
            console.error('Error loading student:', error);
            dispatch(setError('Error loading student data. Please refresh.'));
            dispatch(setLoading(false));
        }
    };
}
