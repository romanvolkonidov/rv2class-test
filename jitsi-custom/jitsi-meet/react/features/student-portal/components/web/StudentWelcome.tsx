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
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
            padding: theme.spacing(4),
            position: 'relative',
            overflow: 'auto',
            '&::before': {
                content: '""',
                position: 'fixed',
                top: '25%',
                left: '25%',
                width: '500px',
                height: '500px',
                background: 'rgba(6, 182, 212, 0.1)',
                borderRadius: '50%',
                filter: 'blur(80px)',
                animation: 'pulseOrb 4s ease-in-out infinite',
                zIndex: 0
            },
            '&::after': {
                content: '""',
                position: 'fixed',
                bottom: '25%',
                right: '25%',
                width: '500px',
                height: '500px',
                background: 'rgba(14, 165, 233, 0.1)',
                borderRadius: '50%',
                filter: 'blur(80px)',
                animation: 'pulseOrb 4s ease-in-out infinite 1s',
                zIndex: 0
            },
            '@keyframes pulseOrb': {
                '0%, 100%': {
                    transform: 'scale(1)',
                    opacity: 0.8
                },
                '50%': {
                    transform: 'scale(1.1)',
                    opacity: 1
                }
            }
        },

        themeToggleWrapper: {
            position: 'absolute',
            top: theme.spacing(3),
            right: theme.spacing(3),
            zIndex: 10
        },

        card: {
            maxWidth: '640px',
            width: '100%',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            background: 'rgba(30, 41, 59, 0.7)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            animation: 'scaleIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 1,
            position: 'relative',
            
            '@keyframes scaleIn': {
                from: {
                    opacity: 0,
                    transform: 'scale(0.95) translateY(10px)'
                },
                to: {
                    opacity: 1,
                    transform: 'scale(1) translateY(0)'
                }
            }
        },

        header: {
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.9) 0%, rgba(14, 165, 233, 0.9) 50%, rgba(59, 130, 246, 0.9) 100%)',
            padding: theme.spacing(4),
            position: 'relative',
            '&::before': {
                content: '""',
                position: 'absolute',
                inset: 0,
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(8px)'
            }
        },

        headerContent: {
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing(2)
        },

        userIcon: {
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            padding: theme.spacing(1.5),
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            '& svg': {
                fill: '#ffffff',
                width: '40px',
                height: '40px'
            }
        },

        title: {
            fontSize: '28px',
            fontWeight: 600,
            color: '#ffffff',
            marginBottom: theme.spacing(0.5),
            letterSpacing: '-0.02em',
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
        },

        subtitle: {
            fontSize: '15px',
            color: 'rgba(255, 255, 255, 0.9)',
            fontWeight: 400
        },

        studentName: {
            display: 'inline',
            fontWeight: 600
        },

        message: {
            fontSize: '15px',
            color: '#8891a1',
            marginBottom: theme.spacing(1),
            lineHeight: 1.5
        },

        content: {
            padding: theme.spacing(4),
            background: 'transparent'
        },

        infoCard: {
            background: 'rgba(51, 65, 85, 0.5)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: theme.spacing(2.5),
            border: '1px solid rgba(255, 255, 255, 0.1)',
            marginBottom: theme.spacing(3)
        },

        teacherInfo: {
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing(1.5),
            padding: theme.spacing(1.5, 0)
        },

        teacherIconWrapper: {
            background: 'rgba(6, 182, 212, 0.15)',
            backdropFilter: 'blur(8px)',
            padding: theme.spacing(1),
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            '& svg': {
                fill: '#06b6d4',
                width: '20px',
                height: '20px'
            }
        },

        teacherText: {
            fontSize: '14px',
            color: '#94a3b8',
            marginBottom: '0px',
            fontWeight: 500
        },

        teacherName: {
            fontSize: '16px',
            fontWeight: 600,
            color: '#f1f5f9',
            marginLeft: 'auto',
            letterSpacing: '-0.01em'
        },

        buttonContainer: {
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(2),
            marginTop: theme.spacing(1.5)
        },

        joinButton: {
            width: '100%',
            padding: '20px 24px',
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.9) 0%, rgba(14, 165, 233, 0.9) 50%, rgba(59, 130, 246, 0.9) 100%)',
            color: '#ffffff',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing(1.5),
            border: '1px solid rgba(255, 255, 255, 0.2)',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 8px 24px rgba(6, 182, 212, 0.3)',
            letterSpacing: '-0.01em',
            position: 'relative',
            overflow: 'hidden',

            '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(255, 255, 255, 0.05)',
                opacity: 0,
                transition: 'opacity 0.2s'
            },

            '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 12px 32px rgba(6, 182, 212, 0.4)',
                
                '&::before': {
                    opacity: 1
                }
            },

            '&:active': {
                transform: 'translateY(0)',
                transition: 'all 0.1s'
            },

            '& svg': {
                fill: '#ffffff',
                width: '20px',
                height: '20px'
            }
        },

        homeworkButtonWrapper: {
            position: 'relative',
            width: '100%'
        },

        homeworkButton: {
            width: '100%',
            padding: '16px 24px',
            background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
            color: '#ffffff',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing(1),
            border: 'none',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 4px 16px rgba(14, 165, 233, 0.3)',
            letterSpacing: '-0.01em',
            position: 'relative',
            overflow: 'hidden',

            '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(255, 255, 255, 0.1)',
                opacity: 0,
                transition: 'opacity 0.2s'
            },

            '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 24px rgba(14, 165, 233, 0.4)',
                
                '&::before': {
                    opacity: 1
                }
            },

            '&:active': {
                transform: 'translateY(0)',
                transition: 'all 0.1s'
            },

            '& svg': {
                fill: '#ffffff',
                width: '20px',
                height: '20px'
            }
        },

        badge: {
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            background: '#ef4444',
            color: '#ffffff',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: 700,
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4), 0 0 0 3px #1C1E22',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            
            '@keyframes pulse': {
                '0%, 100%': {
                    opacity: 1,
                    transform: 'scale(1)'
                },
                '50%': {
                    opacity: 0.85,
                    transform: 'scale(1.1)'
                }
            }
        },

        icon: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
        },
        
        // Responsive styles are applied directly to each element above using theme.breakpoints
        // instead of a separate @media query to avoid TypeScript issues with tss-react
        mobileCard: {
            [theme.breakpoints.down('sm')]: {
                borderRadius: '20px'
            }
        },

        mobileHeader: {
            [theme.breakpoints.down('sm')]: {
                padding: theme.spacing(4, 3)
            }
        },

        mobileContent: {
            [theme.breakpoints.down('sm')]: {
                padding: theme.spacing(3)
            }
        },
        
        mobileTitle: {
            [theme.breakpoints.down('sm')]: {
                fontSize: '24px'
            }
        },
        
        mobileJoinButton: {
            [theme.breakpoints.down('sm')]: {
                padding: '18px 20px',
                fontSize: '15px'
            }
        },
        
        mobileHomeworkButton: {
            [theme.breakpoints.down('sm')]: {
                padding: '18px 20px',
                fontSize: '15px'
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
                {/* Header with gradient background */}
                <div className = { classes.header }>
                    <div className = { classes.headerContent }>
                        <div className = { classes.userIcon }>
                            <Icon
                                size = { 40 }
                                src = { IconUsers } />
                        </div>
                        <div>
                            <h1 className = { classes.title }>
                                Добро пожаловать, {student.name}! 👋
                            </h1>
                            <p className = { classes.subtitle }>
                                Твоё личное учебное пространство
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content section */}
                <div className = { classes.content }>
                    {/* Teacher Info Card */}
                    <div className = { classes.infoCard }>
                        <div className = { classes.teacherInfo }>
                            <div className = { classes.teacherIconWrapper }>
                                <Icon
                                    size = { 20 }
                                    src = { IconUsers } />
                            </div>
                            <span className = { classes.teacherText }>Твой преподаватель:</span>
                            <span className = { classes.teacherName }>{teacherName}</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className = { classes.buttonContainer }>
                        {/* Homework Button with Badge */}
                        <div className = { classes.homeworkButtonWrapper }>
                            <button
                                className = { classes.homeworkButton }
                                onClick = { () => {
                                    console.log('Homework clicked!');
                                    onViewHomework();
                                } }
                                type = 'button'>
                                <div className = { classes.icon }>
                                    <Icon
                                        size = { 20 }
                                        src = { IconMessage } />
                                </div>
                                <span>Домашние задания</span>
                            </button>
                            {uncompletedCount > 0 && (
                                <span className = { classes.badge }>{uncompletedCount}</span>
                            )}
                        </div>

                        {/* Join Lesson Button - Primary */}
                        <button
                            className = { classes.joinButton }
                            onClick = { () => {
                                console.log('Join lesson clicked!');
                                onJoinLesson();
                            } }
                            type = 'button'>
                            <div className = { classes.icon }>
                                <Icon
                                    size = { 20 }
                                    src = { IconVideo } />
                            </div>
                            <span>Присоединиться к уроку</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentWelcome;
