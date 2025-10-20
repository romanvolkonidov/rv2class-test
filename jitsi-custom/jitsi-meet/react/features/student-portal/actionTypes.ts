/**
 * The type of Redux action which sets the current student data.
 *
 * {
 *     type: SET_STUDENT_DATA,
 *     student: Object
 * }
 */
export const SET_STUDENT_DATA = 'SET_STUDENT_DATA';

/**
 * The type of Redux action which sets the homework count.
 *
 * {
 *     type: SET_HOMEWORK_COUNT,
 *     count: number
 * }
 */
export const SET_HOMEWORK_COUNT = 'SET_HOMEWORK_COUNT';

/**
 * The type of Redux action which sets loading state.
 *
 * {
 *     type: SET_LOADING,
 *     loading: boolean
 * }
 */
export const SET_LOADING = 'SET_LOADING';

/**
 * The type of Redux action which sets error state.
 *
 * {
 *     type: SET_ERROR,
 *     error: string | null
 * }
 */
export const SET_ERROR = 'SET_ERROR';
