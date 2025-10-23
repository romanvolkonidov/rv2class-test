import ReducerRegistry from '../base/redux/ReducerRegistry';

import { SET_LESSON_TIMER, STOP_LESSON_TIMER } from './actionTypes';

export interface ILessonTimerState {
    durationMinutes: number | null;
    isActive: boolean;
}

const DEFAULT_STATE: ILessonTimerState = {
    durationMinutes: null,
    isActive: false
};

ReducerRegistry.register<ILessonTimerState>(
    'features/lesson-timer',
    (state = DEFAULT_STATE, action): ILessonTimerState => {
        switch (action.type) {
        case SET_LESSON_TIMER:
            return {
                ...state,
                durationMinutes: action.durationMinutes,
                isActive: true
            };

        case STOP_LESSON_TIMER:
            return {
                ...state,
                durationMinutes: null,
                isActive: false
            };

        default:
            return state;
        }
    }
);
