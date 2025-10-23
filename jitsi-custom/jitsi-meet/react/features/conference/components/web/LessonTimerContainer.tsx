import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { IReduxState } from '../../../app/types';
import { stopLessonTimer } from '../../../lesson-timer/actions';

import LessonTimer from './LessonTimer';

/**
 * Container component for the lesson timer.
 *
 * @returns {JSX.Element | null}
 */
const LessonTimerContainer: React.FC = () => {
    const dispatch = useDispatch();
    const { durationMinutes, isActive } = useSelector((state: IReduxState) => 
        state['features/lesson-timer'] || { durationMinutes: null, isActive: false }
    );

    const handleStop = () => {
        dispatch(stopLessonTimer());
    };

    if (!isActive || !durationMinutes) {
        return null;
    }

    return (
        <LessonTimer
            durationMinutes={durationMinutes}
            onStop={handleStop}
            onTimerEnd={handleStop}
        />
    );
};

export default LessonTimerContainer;
