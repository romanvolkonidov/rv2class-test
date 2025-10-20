import React from 'react';
import { makeStyles } from 'tss-react/mui';

import { IconUsers, IconVideo, IconMessage } from '../../../base/icons/svg';
import Icon from '../../../base/icons/components/Icon';
import ThemeToggle from '../../../base/ui/components/web/ThemeToggle';

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

    /**
     * Current theme mode.
     */
    theme?: 'dark' | 'light';

    /**
     * Callback when theme changes.
     */
    onThemeChange?: (newTheme: 'dark' | 'light') => void;
}

const useStyles = makeStyles()(theme => {
    return {
        container: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: 'var(--rv2class-bg-primary, #111111)',
            padding: theme.spacing(3),
            position: 'relative'
        },

        themeToggleWrapper: {
            position: 'absolute',
            top: theme.spacing(3),
            right: theme.spacing(3)
        },

        card: {
            backgroundColor: 'var(--rv2class-card-bg, #1c1c1c)',
            borderRadius: theme.shape.borderRadius * 2,
            padding: theme.spacing(5),
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 4px 24px var(--rv2class-card-shadow, rgba(0, 0, 0, 0.25))'
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
            color: 'var(--rv2class-text-primary, #ffffff)',
            marginBottom: theme.spacing(1)
        },

        studentName: {
            ...theme.typography.heading3,
            color: 'var(--rv2class-accent, #1c9ba4)',
            marginBottom: theme.spacing(2),
            fontWeight: 700
        },

        message: {
            ...theme.typography.bodyShortRegular,
            color: 'var(--rv2class-text-secondary, #a4b5b8)',
            marginBottom: theme.spacing(1)
        },

        buttonContainer: {
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(2),
            marginTop: theme.spacing(3)
        },

        joinButton: {
            width: '100%',
            padding: `${theme.spacing(3)} ${theme.spacing(4)}`,
            backgroundColor: 'var(--rv2class-accent, #1c9ba4)',
            color: 'var(--rv2class-text-primary, #ffffff)',
            borderRadius: theme.shape.borderRadius,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing(2),
            border: 0,
            ...theme.typography.heading6,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontSize: '20px',

            '&:hover': {
                backgroundColor: 'var(--rv2class-accent-hover, #1a8a92)',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 24px rgba(28, 155, 164, 0.5)'
            },

            '&:active': {
                backgroundColor: 'var(--rv2class-accent-hover, #1a8a92)',
                transform: 'translateY(0)'
            }
        },

        homeworkButtonWrapper: {
            position: 'relative',
            width: '100%'
        },

        homeworkButton: {
            width: '100%',
            padding: `${theme.spacing(2)} ${theme.spacing(3)}`,
            backgroundColor: 'var(--rv2class-bg-tertiary, #292929)',
            color: 'var(--rv2class-text-primary, #ffffff)',
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
                backgroundColor: 'var(--rv2class-hover, #2a2a2a)'
            },

            '&:active': {
                backgroundColor: 'var(--rv2class-hover, #2a2a2a)'
            }
        },

        badge: {
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            backgroundColor: 'var(--rv2class-error, #e04757)',
            color: 'var(--rv2class-text-primary, #ffffff)',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 700,
            boxShadow: '0 2px 8px rgba(224, 71, 87, 0.5)',
            border: '2px solid var(--rv2class-card-bg, #1c1c1c)'
        },

        teacherInfo: {
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing(2),
            backgroundColor: 'var(--rv2class-bg-secondary, #1c1c1c)',
            borderRadius: theme.shape.borderRadius,
            padding: theme.spacing(2),
            marginBottom: theme.spacing(2)
        },

        teacherText: {
            ...theme.typography.bodyShortRegular,
            color: 'var(--rv2class-text-secondary, #a4b5b8)'
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
    uncompletedCount = 0,
    theme = 'dark',
    onThemeChange
}) => {
    const { classes } = useStyles();
    const teacherName = student.teacher || student.teacherName || 'Роман';

    return (
        <div className = { classes.container }>
            {/* Theme Toggle */}
            {onThemeChange && (
                <div className = { classes.themeToggleWrapper }>
                    <ThemeToggle
                        onThemeChange = { onThemeChange }
                        theme = { theme } />
                </div>
            )}

            <div className = { classes.card }>
                {/* Header */}
                <div className = { classes.header }>
                    <div className = { classes.welcomeIcon }>🎓</div>
                    <h1 className = { classes.title }>Добро пожаловать на урок!</h1>
                    <h2 className = { classes.studentName }>{student.name}</h2>
                    <p className = { classes.message }>
                        Готовы начать обучение?
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
                        <div className = { classes.teacherText }>Ваш учитель:</div>
                        <div className = { classes.teacherName }>{teacherName}</div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className = { classes.buttonContainer }>
                    {/* Join Lesson Button - Primary/Prominent */}
                    <button
                        className = { classes.joinButton }
                        onClick = { () => {
                            console.log('Join lesson clicked!');
                            onJoinLesson();
                        } }
                        type = 'button'>
                        <Icon
                            size = { 24 }
                            src = { IconVideo } />
                        <span>📹 Присоединиться к уроку</span>
                    </button>

                    {/* Homework Button with Badge - Secondary */}
                    <div className = { classes.homeworkButtonWrapper }>
                        <button
                            className = { classes.homeworkButton }
                            onClick = { () => {
                                console.log('Homework clicked!');
                                onViewHomework();
                            } }
                            type = 'button'>
                            <Icon
                                size = { 20 }
                                src = { IconMessage } />
                            <span>📚 Домашние задания</span>
                        </button>
                        {uncompletedCount > 0 && (
                            <span className = { classes.badge }>{uncompletedCount}</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentWelcome;
