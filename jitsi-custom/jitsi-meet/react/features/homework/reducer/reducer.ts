import ReducerRegistry from '../../base/redux/ReducerRegistry';
import { AnyAction } from 'redux';
import {
    SET_HOMEWORK_ASSIGNMENTS,
    SET_HOMEWORK_REPORTS,
    SET_HOMEWORK_QUESTIONS,
    SET_HOMEWORK_LOADING,
    SET_HOMEWORK_SUBMITTING,
    SET_CURRENT_STUDENT,
    SET_HOMEWORK_RESULTS,
    SET_TEACHER_HOMEWORK_LIST,
    MARK_HOMEWORK_AS_SEEN,
    CLEAR_HOMEWORK_RESULTS
} from '../actionTypes';

export interface IHomeworkState {
    assignments: any[];
    reports: any[];
    questions: Record<string, any[]>;
    loading: boolean;
    submitting: boolean;
    currentStudent: {
        id: string;
        name: string;
    };
    results: any;
    teacherHomeworkList: any[];
}

/**
 * The initial state of the homework feature.
 */
const DEFAULT_STATE: IHomeworkState = {
    assignments: [],
    reports: [],
    questions: {},
    loading: false,
    submitting: false,
    currentStudent: {
        id: '',
        name: ''
    },
    results: null,
    teacherHomeworkList: []
};

/**
 * Reduces redux actions for the homework feature.
 *
 * @param {IHomeworkState} state - The current state.
 * @param {AnyAction} action - The redux action to reduce.
 * @returns {IHomeworkState} The next state.
 */
ReducerRegistry.register<IHomeworkState>('features/homework', (state = DEFAULT_STATE, action: AnyAction): IHomeworkState => {
    switch (action.type) {
    case SET_HOMEWORK_ASSIGNMENTS:
        return {
            ...state,
            assignments: action.assignments
        };

    case SET_HOMEWORK_REPORTS:
        return {
            ...state,
            reports: action.reports
        };

    case SET_HOMEWORK_QUESTIONS:
        return {
            ...state,
            questions: {
                ...state.questions,
                [action.homeworkId]: action.questions
            }
        };

    case SET_HOMEWORK_LOADING:
        return {
            ...state,
            loading: action.loading
        };

    case SET_HOMEWORK_SUBMITTING:
        return {
            ...state,
            submitting: action.submitting
        };

    case SET_CURRENT_STUDENT:
        return {
            ...state,
            currentStudent: {
                id: action.studentId,
                name: action.studentName
            }
        };

    case SET_HOMEWORK_RESULTS:
        return {
            ...state,
            results: action.results
        };

    case SET_TEACHER_HOMEWORK_LIST:
        return {
            ...state,
            teacherHomeworkList: action.homeworks
        };

    case MARK_HOMEWORK_AS_SEEN:
        return {
            ...state,
            teacherHomeworkList: state.teacherHomeworkList.map(hw =>
                hw.id === action.homeworkId ? { ...hw, seenByTeacher: true } : hw
            )
        };

    case CLEAR_HOMEWORK_RESULTS:
        return {
            ...state,
            results: null
        };

    default:
        return state;
    }
});
