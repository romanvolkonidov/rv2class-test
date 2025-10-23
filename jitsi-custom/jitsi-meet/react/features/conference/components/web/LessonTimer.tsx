import React, { useState, useEffect } from 'react';
import { makeStyles } from 'tss-react/mui';

const useStyles = makeStyles()(theme => {
    return {
        timerContainer: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
        },
        pieChart: {
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: `conic-gradient(
                #3D7CC9 0deg,
                #3D7CC9 var(--progress-degrees, 360deg),
                rgba(255, 255, 255, 0.2) var(--progress-degrees, 360deg)
            )`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            transition: '--progress-degrees 1s linear',
            cursor: 'pointer',
            '&:hover': {
                transform: 'scale(1.05)'
            }
        },
        innerCircle: {
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            backgroundColor: '#1a1a1a',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 700,
            color: '#ffffff'
        },
        timeText: {
            fontSize: '14px',
            lineHeight: '1'
        },
        labelText: {
            fontSize: '8px',
            color: '#A4B5B8',
            marginTop: '2px'
        },
        hidden: {
            display: 'none'
        }
    };
});

interface IProps {
    /**
     * Initial duration in minutes.
     */
    durationMinutes: number;

    /**
     * Callback when timer ends.
     */
    onTimerEnd?: () => void;

    /**
     * Callback to stop the timer.
     */
    onStop?: () => void;
}

/**
 * Lesson timer component with circular progress indicator.
 *
 * @param {IProps} props - Component props.
 * @returns {JSX.Element}
 */
const LessonTimer: React.FC<IProps> = ({ durationMinutes, onTimerEnd, onStop }) => {
    const { classes } = useStyles();
    const [remainingSeconds, setRemainingSeconds] = useState(durationMinutes * 60);
    const totalSeconds = durationMinutes * 60;

    useEffect(() => {
        if (remainingSeconds <= 0) {
            onTimerEnd?.();
            return;
        }

        const interval = setInterval(() => {
            setRemainingSeconds(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [remainingSeconds, onTimerEnd]);

    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    const progressDegrees = (remainingSeconds / totalSeconds) * 360;

    const handleClick = () => {
        if (window.confirm('Stop the timer?')) {
            onStop?.();
        }
    };

    return (
        <div 
            className={classes.timerContainer}
            onClick={handleClick}
            style={{ 
                // @ts-ignore
                '--progress-degrees': `${progressDegrees}deg` 
            }}>
            <div className={classes.pieChart}>
                <div className={classes.innerCircle}>
                    <div className={classes.timeText}>
                        {minutes}:{seconds.toString().padStart(2, '0')}
                    </div>
                    <div className={classes.labelText}>LEFT</div>
                </div>
            </div>
        </div>
    );
};

export default LessonTimer;
