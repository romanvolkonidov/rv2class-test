import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import { IconCalendar } from '../../../base/icons/svg';
import { openSetTimerDialog } from '../../../lesson-timer/actions';

const useStyles = makeStyles()(() => {
    return {
        button: {
            appearance: 'none',
            background: 'transparent',
            border: 0,
            color: '#fff',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            fontSize: '14px',
            fontWeight: 400,
            '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }
        },
        icon: {
            width: '20px',
            height: '20px'
        }
    };
});

/**
 * Button to set remaining lesson time.
 *
 * @returns {JSX.Element}
 */
const SetTimerButton: React.FC = () => {
    const { classes } = useStyles();
    const dispatch = useDispatch();

    const handleClick = useCallback(() => {
        dispatch(openSetTimerDialog());
    }, [dispatch]);

    return (
        <button
            className={classes.button}
            onClick={handleClick}
            type="button">
            <IconCalendar className={classes.icon} />
            <span>Remaining Time</span>
        </button>
    );
};

export default SetTimerButton;
