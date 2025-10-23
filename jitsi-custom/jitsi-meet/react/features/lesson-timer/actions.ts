import { SET_LESSON_TIMER, STOP_LESSON_TIMER } from './actionTypes';

/**
 * Sets the lesson timer duration.
 *
 * @param {number} durationMinutes - Duration in minutes.
 * @returns {Object}
 */
export function setLessonTimer(durationMinutes: number) {
    return {
        type: SET_LESSON_TIMER,
        durationMinutes
    };
}

/**
 * Stops the lesson timer.
 *
 * @returns {Object}
 */
export function stopLessonTimer() {
    return {
        type: STOP_LESSON_TIMER
    };
}

/**
 * Opens a dialog to set the lesson timer.
 *
 * @returns {Function}
 */
export function openSetTimerDialog() {
    return (dispatch: any) => {
        const minutes = prompt('Enter lesson duration in minutes:', '45');
        
        if (minutes && !isNaN(Number(minutes)) && Number(minutes) > 0) {
            dispatch(setLessonTimer(Number(minutes)));
        }
    };
}
