import React from 'react';
import { useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import { getConferenceName } from '../../../base/conference/functions';

import LessonTimerContainer from './LessonTimerContainer';

const useStyles = makeStyles()(theme => {
    return {
        container: {
            position: 'absolute',
            top: '16px',
            left: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            zIndex: 1000,
            pointerEvents: 'none',
            
            '& > *': {
                pointerEvents: 'auto'
            }
        },
        logo: {
            height: '48px',
            width: 'auto',
            filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4))'
        }
    };
});

/**
 * Top left panel containing logo and timer.
 *
 * @returns {JSX.Element}
 */
const TopLeftPanel = () => {
    const { classes } = useStyles();
    const subject = useSelector(getConferenceName);
    
    // Only show in conference (not prejoin/lobby)
    if (!subject) {
        return null;
    }

    return (
        <div className={classes.container}>
            <img
                alt="RV2Class"
                className={classes.logo}
                src="/images/logo-white-tight.png" />
            <LessonTimerContainer />
        </div>
    );
};

export default TopLeftPanel;
