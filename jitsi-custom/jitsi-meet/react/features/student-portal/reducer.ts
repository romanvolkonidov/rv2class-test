import ReducerRegistry from '../base/redux/ReducerRegistry';

import {
    SET_STUDENT_DATA,
    SET_HOMEWORK_COUNT,
    SET_LOADING,
    SET_ERROR
} from './actionTypes';

export interface IStudentPortalState {
    student: any | null;
    homeworkCount: number;
    loading: boolean;
    error: string | null;
}

const DEFAULT_STATE: IStudentPortalState = {
    student: null,
    homeworkCount: 0,
    loading: false,
    error: null
};

/**
 * Reduces the Redux actions of the feature student-portal.
 */
ReducerRegistry.register<IStudentPortalState>(
    'features/student-portal',
    (state = DEFAULT_STATE, action): IStudentPortalState => {
        switch (action.type) {
        case SET_STUDENT_DATA:
            return {
                ...state,
                student: action.student
            };

        case SET_HOMEWORK_COUNT:
            return {
                ...state,
                homeworkCount: action.count
            };

        case SET_LOADING:
            return {
                ...state,
                loading: action.loading
            };

        case SET_ERROR:
            return {
                ...state,
                error: action.error
            };

        default:
            return state;
        }
    }
);
