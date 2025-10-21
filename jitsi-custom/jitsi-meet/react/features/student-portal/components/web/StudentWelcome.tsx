import React, { useState, useEffect } from 'react';
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
        subjects?: { English?: boolean; IT?: boolean };
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
     * Callback when user clicks Leaderboard button.
     */
    onViewLeaderboard?: () => void;

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

    /**
     * Microphone permission state.
     */
    micPermission?: 'granted' | 'denied' | 'prompt' | 'checking';

    /**
     * Video permission state.
     */
    videoPermission?: 'granted' | 'denied' | 'prompt' | 'checking';

    /**
     * Callback to request mic permission.
     */
    onRequestMic?: () => void;

    /**
     * Callback to request video permission.
     */
    onRequestVideo?: () => void;
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
            padding: theme.spacing(2),
            position: 'relative',
            overflow: 'auto',
            '&::before': {
                content: '""',
                position: 'fixed',
                top: '25%',
                left: '25%',
                width: '500px',
                height: '500px',
                background: 'rgba(59, 130, 246, 0.15)',
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
                background: 'rgba(14, 165, 233, 0.15)',
                borderRadius: '50%',
                filter: 'blur(80px)',
                animation: 'pulseOrb 4s ease-in-out infinite 1.5s',
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
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(37, 99, 235, 0.9) 50%, rgba(29, 78, 216, 0.9) 100%)',
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
            marginBottom: theme.spacing(2)
        },

        teacherIconWrapper: {
            background: 'rgba(59, 130, 246, 0.2)',
            backdropFilter: 'blur(8px)',
            padding: theme.spacing(1),
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            '& svg': {
                fill: '#60a5fa',
                width: '20px',
                height: '20px'
            }
        },

        teacherText: {
            fontSize: '14px',
            color: '#94a3b8',
            fontWeight: 500
        },

        teacherName: {
            fontSize: '16px',
            fontWeight: 600,
            color: '#f1f5f9',
            marginLeft: 'auto',
            letterSpacing: '-0.01em'
        },

        subjectsWrapper: {
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing(1.5),
            flexWrap: 'wrap'
        },

        subjectIcon: {
            background: 'rgba(59, 130, 246, 0.2)',
            backdropFilter: 'blur(8px)',
            padding: theme.spacing(1),
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            '& svg': {
                fill: '#60a5fa',
                width: '20px',
                height: '20px'
            }
        },

        subjectsLabel: {
            fontSize: '14px',
            color: '#94a3b8',
            fontWeight: 500
        },

        subjectBadge: {
            padding: '6px 16px',
            borderRadius: '20px',
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            color: '#60a5fa',
            fontSize: '13px',
            fontWeight: 600
        },

        homeworkButtonWrapper: {
            position: 'relative',
            paddingTop: theme.spacing(2),
            marginBottom: theme.spacing(1)
        },

        homeworkButton: {
            width: '100%',
            padding: '16px 24px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: '#ffffff',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing(1.5),
            border: 'none',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)',
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
                boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)',
                
                '&::before': {
                    opacity: 1
                }
            },

            '&:active': {
                transform: 'scale(0.98)',
                transition: 'all 0.1s'
            },

            '& svg': {
                fill: '#ffffff',
                width: '20px',
                height: '20px'
            }
        },

        leaderboardButton: {
            width: '100%',
            padding: '16px 24px',
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
            color: '#ffffff',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing(1.5),
            border: 'none',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 4px 16px rgba(251, 191, 36, 0.3)',
            letterSpacing: '-0.01em',

            '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 24px rgba(251, 191, 36, 0.4)'
            },

            '&:active': {
                transform: 'translateY(0)',
                boxShadow: '0 4px 12px rgba(251, 191, 36, 0.3)'
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
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4), 0 0 0 3px rgba(30, 41, 59, 0.8)',
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

        joinSection: {
            marginTop: theme.spacing(3),
            paddingTop: theme.spacing(2)
        },

        joinButtonWrapper: {
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(37, 99, 235, 0.9) 50%, rgba(29, 78, 216, 0.9) 100%)',
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',

            '&:hover': {
                boxShadow: '0 12px 32px rgba(59, 130, 246, 0.4)',
                transform: 'translateY(-2px)'
            }
        },

        joinButton: {
            width: '100%',
            padding: '20px 24px',
            background: 'transparent',
            color: '#ffffff',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.3s',
            letterSpacing: '-0.01em',

            '&:hover': {
                background: 'rgba(255, 255, 255, 0.05)'
            },

            '&:active': {
                background: 'rgba(255, 255, 255, 0.1)',
                transform: 'scale(0.98)'
            }
        },

        joinButtonLeft: {
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing(1.5)
        },

        joinButtonIcon: {
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            padding: theme.spacing(1),
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',

            '&:hover': {
                background: 'rgba(255, 255, 255, 0.3)',
                transform: 'scale(1.05)'
            },

            '& svg': {
                fill: '#ffffff',
                width: '20px',
                height: '20px'
            }
        },

        joinButtonText: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start'
        },

        joinButtonTitle: {
            fontSize: '16px',
            fontWeight: 600,
            color: '#ffffff'
        },

        joinButtonSubtitle: {
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.8)',
            fontWeight: 400,
            marginTop: '2px'
        },

        permissionToggles: {
            display: 'flex',
            gap: theme.spacing(1)
        },

        permissionButton: {
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            color: '#ffffff',
            cursor: 'pointer',
            transition: 'all 0.2s',

            '&:hover': {
                background: 'rgba(255, 255, 255, 0.25)',
                transform: 'scale(1.05)'
            },

            '&:active': {
                transform: 'scale(0.95)'
            },

            '& svg': {
                fill: '#ffffff',
                width: '16px',
                height: '16px'
            }
        },

        permissionGranted: {
            background: 'rgba(255, 255, 255, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            cursor: 'default',

            '&:hover': {
                background: 'rgba(255, 255, 255, 0.3)',
                transform: 'none'
            }
        },

        permissionDenied: {
            background: 'rgba(239, 68, 68, 0.6)',
            border: '1px solid rgba(239, 68, 68, 0.6)',
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)',

            '&:hover': {
                background: 'rgba(239, 68, 68, 0.8)'
            }
        },

        permissionPulse: {
            animation: 'permissionPulse 1s ease-in-out 3',

            '@keyframes permissionPulse': {
                '0%, 100%': {
                    boxShadow: '0 0 0 0 rgba(255, 255, 255, 0.7)'
                },
                '50%': {
                    boxShadow: '0 0 0 8px rgba(255, 255, 255, 0)'
                }
            }
        },

        icon: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
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
    onViewLeaderboard,
    uncompletedCount = 0,
    theme = 'dark',
    onThemeChange,
    micPermission = 'prompt',
    videoPermission = 'prompt',
    onRequestMic,
    onRequestVideo
}) => {
    const { classes } = useStyles();
    const [shouldPulseMic, setShouldPulseMic] = useState(false);
    const [shouldPulseCamera, setShouldPulseCamera] = useState(false);

    const teacherName = student.teacher || student.teacherName || 'Роман';
    
    const activeSubjects = student.subjects 
        ? Object.entries(student.subjects)
            .filter(([_, isActive]) => isActive)
            .map(([subject]) => subject)
        : [];

    const handleJoinClick = () => {
        // Check if permissions are granted
        if (micPermission !== 'granted' || videoPermission !== 'granted') {
            // Pulse the buttons that need attention
            if (micPermission !== 'granted') {
                setShouldPulseMic(true);
                setTimeout(() => setShouldPulseMic(false), 3000);
            }
            if (videoPermission !== 'granted') {
                setShouldPulseCamera(true);
                setTimeout(() => setShouldPulseCamera(false), 3000);
            }
            return;
        }

        onJoinLesson();
    };

    const getMicIcon = () => {
        if (micPermission === 'granted') {
            return IconVideo; // Using available icons
        } else if (micPermission === 'denied') {
            return IconVideo; // Would ideally be MicOff icon
        } else {
            return IconVideo;
        }
    };

    const getCameraIcon = () => {
        if (videoPermission === 'granted') {
            return IconVideo;
        } else if (videoPermission === 'denied') {
            return IconVideo;
        } else {
            return IconVideo;
        }
    };

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
                    {/* Student Info Card */}
                    <div className = { classes.infoCard }>
                        <div className = { classes.teacherInfo }>
                            <div className = { classes.teacherIconWrapper }>
                                <Icon
                                    size = { 20 }
                                    src = { IconUsers } />
                            </div>
                            <span className = { classes.teacherText }>Твой учитель:</span>
                            <span className = { classes.teacherName }>{teacherName}</span>
                        </div>

                        {activeSubjects.length > 0 && (
                            <div className = { classes.subjectsWrapper }>
                                <div className = { classes.subjectIcon }>
                                    <Icon
                                        size = { 20 }
                                        src = { IconMessage } />
                                </div>
                                <span className = { classes.subjectsLabel }>Твои предметы:</span>
                                {activeSubjects.map((subject) => (
                                    <span key = { subject } className = { classes.subjectBadge }>
                                        {subject}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Homework Button */}
                        <div className = { classes.homeworkButtonWrapper }>
                            <button
                                className = { classes.homeworkButton }
                                onClick = { onViewHomework }
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

                        {/* Leaderboard Button */}
                        {onViewLeaderboard && (
                            <div className = { classes.homeworkButtonWrapper }>
                                <button
                                    className = { classes.leaderboardButton }
                                    onClick = { onViewLeaderboard }
                                    type = 'button'>
                                    <span>🏆</span>
                                    <span>Рейтинг студентов</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Join Button with Permission Toggles */}
                    <div className = { classes.joinSection }>
                        <div className = { classes.joinButtonWrapper }>
                            <button
                                className = { classes.joinButton }
                                onClick = { handleJoinClick }
                                type = 'button'>
                                <div className = { classes.joinButtonLeft }>
                                    <div className = { classes.joinButtonIcon }>
                                        <Icon
                                            size = { 20 }
                                            src = { IconVideo } />
                                    </div>
                                    <div className = { classes.joinButtonText }>
                                        <span className = { classes.joinButtonTitle }>Войти на урок</span>
                                        <span className = { classes.joinButtonSubtitle }>
                                            Подключиться к {teacherName}
                                        </span>
                                    </div>
                                </div>

                                {/* Permission Toggles */}
                                <div className = { classes.permissionToggles } onClick = { (e) => e.stopPropagation() }>
                                    {/* Microphone */}
                                    <button
                                        className = { `${classes.permissionButton} ${
                                            micPermission === 'granted' ? classes.permissionGranted :
                                            micPermission === 'denied' ? classes.permissionDenied :
                                            ''
                                        } ${shouldPulseMic ? classes.permissionPulse : ''}` }
                                        onClick = { onRequestMic }
                                        disabled = { micPermission === 'granted' || micPermission === 'checking' }
                                        type = 'button'
                                        title = {
                                            micPermission === 'granted' ? 'Микрофон разрешён ✓' :
                                            micPermission === 'denied' ? 'Включить микрофон' :
                                            'Разрешить микрофон'
                                        }>
                                        <Icon
                                            size = { 16 }
                                            src = { getMicIcon() } />
                                    </button>

                                    {/* Camera */}
                                    <button
                                        className = { `${classes.permissionButton} ${
                                            videoPermission === 'granted' ? classes.permissionGranted :
                                            videoPermission === 'denied' ? classes.permissionDenied :
                                            ''
                                        } ${shouldPulseCamera ? classes.permissionPulse : ''}` }
                                        onClick = { onRequestVideo }
                                        disabled = { videoPermission === 'granted' || videoPermission === 'checking' }
                                        type = 'button'
                                        title = {
                                            videoPermission === 'granted' ? 'Камера разрешена ✓' :
                                            videoPermission === 'denied' ? 'Включить камеру' :
                                            'Разрешить камеру'
                                        }>
                                        <Icon
                                            size = { 16 }
                                            src = { getCameraIcon() } />
                                    </button>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentWelcome;
