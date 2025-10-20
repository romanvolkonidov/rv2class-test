import React from 'react';
import { makeStyles } from 'tss-react/mui';

import { IconUsers, IconVideo, IconMessage } from '../../../base/icons/svg';
import Icon from '../../../base/icons/components/Icon';
import Button from '../../../base/ui/components/web/Button';
import { BUTTON_TYPES } from '../../../base/ui/constants.web';

interface IProps {
    /**
     * Student data from Firebase.
     */
    student: {
        id: string;
        name: string;
        teacher?: string;
        teacherName?: string;
        teacherUid?: string;
    };

    /**
     * Callback when user clicks Join button.
     */
    onJoinLesson: () => void;

    /**
     * Callback when user clicks Homework button.
     */
    onViewHomework: () => void;

    /**
     * Number of uncompleted homework assignments.
     */
    uncompletedCount?: number;
}

const useStyles = makeStyles()(theme => {
    return {
        container: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: theme.palette.uiBackground,
            padding: theme.spacing(3)
        },

        card: {
            backgroundColor: theme.palette.ui01,
            borderRadius: theme.shape.borderRadius * 2,
            padding: theme.spacing(5),
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.25)'
        },

        header: {
            textAlign: 'center',
            marginBottom: theme.spacing(4)
        },

        welcomeIcon: {
            fontSize: '48px',
            marginBottom: theme.spacing(2)
        },

        title: {
            ...theme.typography.heading4,
            color: theme.palette.text01,
            marginBottom: theme.spacing(1)
        },

        studentName: {
            ...theme.typography.heading3,
            color: theme.palette.action01,
            marginBottom: theme.spacing(2),
            fontWeight: 700
        },

        message: {
            ...theme.typography.bodyShortRegular,
            color: theme.palette.text02,
            marginBottom: theme.spacing(3)
        },

        buttonContainer: {
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(2),
            marginTop: theme.spacing(3)
        },

        homeworkButton: {
            position: 'relative',
            width: '100%',
            padding: `${theme.spacing(2)} ${theme.spacing(3)}`,
            backgroundColor: theme.palette.action01,
            color: theme.palette.text01,
            borderRadius: theme.shape.borderRadius,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing(2),
            border: 0,
            ...theme.typography.bodyShortBold,
            cursor: 'pointer',
            transition: 'all 0.2s',

            '&:hover': {
                backgroundColor: theme.palette.action01Hover,
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 20px rgba(59, 130, 246, 0.4)'
            },

            '&:active': {
                backgroundColor: theme.palette.action01Active,
                transform: 'translateY(0)'
            }
        },

        joinButton: {
            width: '100%',
            padding: `${theme.spacing(2)} ${theme.spacing(3)}`,
            backgroundColor: theme.palette.action02,
            color: theme.palette.text04,
            borderRadius: theme.shape.borderRadius,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing(2),
            border: 0,
            ...theme.typography.bodyShortBold,
            cursor: 'pointer',
            transition: 'background 0.2s',

            '&:hover': {
                backgroundColor: theme.palette.action02Hover
            },

            '&:active': {
                backgroundColor: theme.palette.action02Active
            }
        },

        badge: {
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            backgroundColor: theme.palette.actionDanger,
            color: theme.palette.text01,
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 700,
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.5)'
        },

        infoBox: {
            backgroundColor: theme.palette.ui02,
            borderLeft: `3px solid ${theme.palette.action01}`,
            borderRadius: theme.shape.borderRadius,
            padding: theme.spacing(3),
            marginTop: theme.spacing(4)
        },

        infoTitle: {
            ...theme.typography.bodyShortBold,
            color: theme.palette.text01,
            marginBottom: theme.spacing(2)
        },

        infoItem: {
            ...theme.typography.bodyShortRegular,
            color: theme.palette.text02,
            marginBottom: theme.spacing(1),
            display: 'flex',
            alignItems: 'flex-start',
            gap: theme.spacing(1)
        },

        teacherInfo: {
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing(2),
            backgroundColor: theme.palette.ui02,
            borderRadius: theme.shape.borderRadius,
            padding: theme.spacing(2),
            marginBottom: theme.spacing(3)
        },

        teacherText: {
            ...theme.typography.bodyShortRegular,
            color: theme.palette.text02
        },

        teacherName: {
            ...theme.typography.bodyShortBold,
            color: theme.palette.text01,
            fontSize: '18px'
        },

        icon: {
            '& svg': {
                fill: theme.palette.icon01
            }
        }
    };
});

/**
 * Student Welcome component - displays welcome screen with Join and Homework buttons.
 *
 * @param {IProps} props - Component props.
 * @returns {JSX.Element}
 */
const StudentWelcome: React.FC<IProps> = ({
    student,
    onJoinLesson,
    onViewHomework,
    uncompletedCount = 0
}) => {
    const { classes } = useStyles();
    const teacherName = student.teacher || student.teacherName || 'Roman';

    return (
        <div className = { classes.container }>
            <div className = { classes.card }>
                {/* Header */}
                <div className = { classes.header }>
                    <div className = { classes.welcomeIcon }>🎓</div>
                    <h1 className = { classes.title }>Welcome to your lesson!</h1>
                    <h2 className = { classes.studentName }>{student.name}</h2>
                    <p className = { classes.message }>
                        Ready to start learning with {teacherName}?
                    </p>
                </div>

                {/* Teacher Info */}
                <div className = { classes.teacherInfo }>
                    <div className = { classes.icon }>
                        <Icon
                            size = { 24 }
                            src = { IconUsers } />
                    </div>
                    <div>
                        <div className = { classes.teacherText }>Your teacher:</div>
                        <div className = { classes.teacherName }>{teacherName}</div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className = { classes.buttonContainer }>
                    {/* Homework Button with Badge */}
                    <button
                        className = { classes.homeworkButton }
                        onClick = { onViewHomework }
                        type = 'button'>
                        <Icon
                            size = { 20 }
                            src = { IconMessage } />
                        <span>📚 Homework</span>
                        {uncompletedCount > 0 && (
                            <span className = { classes.badge }>{uncompletedCount}</span>
                        )}
                    </button>

                    {/* Join Lesson Button */}
                    <button
                        className = { classes.joinButton }
                        onClick = { onJoinLesson }
                        type = 'button'>
                        <Icon
                            size = { 20 }
                            src = { IconVideo } />
                        <span>📹 Join Lesson</span>
                    </button>
                </div>

                {/* Info Box */}
                <div className = { classes.infoBox }>
                    <div className = { classes.infoTitle }>Before joining:</div>
                    <div className = { classes.infoItem }>
                        <span>✓</span>
                        <span>Make sure your camera and microphone are working</span>
                    </div>
                    <div className = { classes.infoItem }>
                        <span>✓</span>
                        <span>Find a quiet place for your lesson</span>
                    </div>
                    <div className = { classes.infoItem }>
                        <span>✓</span>
                        <span>Have your materials ready</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentWelcome;
