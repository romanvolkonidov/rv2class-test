/**
 * The type of Redux action which sets the homework assignments for a student.
 *
 * {
 *     type: SET_HOMEWORK_ASSIGNMENTS,
 *     assignments: Array<Object>
 * }
 */
export const SET_HOMEWORK_ASSIGNMENTS = 'SET_HOMEWORK_ASSIGNMENTS';

/**
 * The type of Redux action which sets the homework reports for a student.
 *
 * {
 *     type: SET_HOMEWORK_REPORTS,
 *     reports: Array<Object>
 * }
 */
export const SET_HOMEWORK_REPORTS = 'SET_HOMEWORK_REPORTS';

/**
 * The type of Redux action which sets the questions for a homework assignment.
 *
 * {
 *     type: SET_HOMEWORK_QUESTIONS,
 *     homeworkId: string,
 *     questions: Array<Object>
 * }
 */
export const SET_HOMEWORK_QUESTIONS = 'SET_HOMEWORK_QUESTIONS';

/**
 * The type of Redux action which sets the loading state for homework.
 *
 * {
 *     type: SET_HOMEWORK_LOADING,
 *     loading: boolean
 * }
 */
export const SET_HOMEWORK_LOADING = 'SET_HOMEWORK_LOADING';

/**
 * The type of Redux action which sets the submission state for homework.
 *
 * {
 *     type: SET_HOMEWORK_SUBMITTING,
 *     submitting: boolean
 * }
 */
export const SET_HOMEWORK_SUBMITTING = 'SET_HOMEWORK_SUBMITTING';

/**
 * The type of Redux action which sets the current student information.
 *
 * {
 *     type: SET_CURRENT_STUDENT,
 *     studentId: string,
 *     studentName: string
 * }
 */
export const SET_CURRENT_STUDENT = 'SET_CURRENT_STUDENT';

/**
 * The type of Redux action which sets the homework results after submission.
 *
 * {
 *     type: SET_HOMEWORK_RESULTS,
 *     results: Object
 * }
 */
export const SET_HOMEWORK_RESULTS = 'SET_HOMEWORK_RESULTS';

/**
 * The type of Redux action which sets all completed homework for teacher review.
 *
 * {
 *     type: SET_TEACHER_HOMEWORK_LIST,
 *     homeworks: Array<Object>
 * }
 */
export const SET_TEACHER_HOMEWORK_LIST = 'SET_TEACHER_HOMEWORK_LIST';

/**
 * The type of Redux action which marks a homework as seen by teacher.
 *
 * {
 *     type: MARK_HOMEWORK_AS_SEEN,
 *     homeworkId: string
 * }
 */
export const MARK_HOMEWORK_AS_SEEN = 'MARK_HOMEWORK_AS_SEEN';

/**
 * The type of Redux action which clears homework results.
 *
 * {
 *     type: CLEAR_HOMEWORK_RESULTS
 * }
 */
export const CLEAR_HOMEWORK_RESULTS = 'CLEAR_HOMEWORK_RESULTS';
