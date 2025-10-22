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
            background: '#1E1E1E',
            padding: theme.spacing(2),
            position: 'relative',
            overflow: 'auto'
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
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            background: '#292929',
            border: '1px solid #3A3A3A',
            zIndex: 1,
            position: 'relative'
        },

        header: {
            background: '#3D7CC9',
            padding: theme.spacing(4),
            position: 'relative'
        },

        headerContent: {
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing(2)
        },

        userIcon: {
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(12px)',
            padding: theme.spacing(1.5),
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
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
            background: '#333333',
            borderRadius: '12px',
            padding: theme.spacing(2.5),
            border: '1px solid #3A3A3A',
            marginBottom: theme.spacing(3)
        },

        teacherInfo: {
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing(1.5),
            margin: theme.spacing(3),
            flexWrap: 'wrap'
        },

        teacherText: {
            fontSize: '15px',
            color: '#A4B5B8',
            fontWeight: 500
        },

        teacherName: {
            fontSize: '18px',
            fontWeight: 700,
            color: '#E7E7E7',
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
            background: '#3D7CC9',
            color: '#ffffff',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing(1.5),
            border: 'none',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s',
            letterSpacing: '-0.01em',
            position: 'relative',
            overflow: 'hidden',

            '&:hover': {
                background: '#4A8BD6'
            },

            '&:active': {
                background: '#3570B8'
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
            top: '-10px',
            right: '-10px',
            background: '#dc2626',
            color: '#ffffff',
            borderRadius: '50%',
            minWidth: '32px',
            height: '32px',
            padding: '0 6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 700,
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.5)',
            border: '3px solid #292929',
            zIndex: 10
        },

        joinSection: {
            marginTop: theme.spacing(3),
            paddingTop: theme.spacing(2)
        },

        joinButtonWrapper: {
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '12px',
            background: '#10b981',
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
            border: 'none',
            transition: 'background 0.2s',

            '&:hover': {
                background: '#059669'
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
            transition: 'background 0.2s',
            letterSpacing: '-0.01em',

            '&:hover': {
                background: 'rgba(255, 255, 255, 0.05)'
            },

            '&:active': {
                background: 'rgba(255, 255, 255, 0.1)'
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

        '@keyframes pulse': {
            '0%, 100%': {
                opacity: 1
            },
            '50%': {
                opacity: 0.7
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
        // Go directly to prejoin page where user can grant permissions
        console.log('Join button clicked, redirecting to prejoin...');
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
                        <img 
                            src="/images/logo-white-tight.png" 
                            alt="RV2Class" 
                            style={{ 
                                width: '120px',
                                height: 'auto',
                                flexShrink: 0,
                                marginRight: '24px'
                            }}
                        />
                        <div style={{ flex: 1 }}>
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
                            <span className = { classes.teacherText }>Твой учитель: </span>
                            <span className = { classes.teacherName }>{teacherName}</span>
                        </div>

                        {activeSubjects.length > 0 && (
                            <div className = { classes.subjectsWrapper }>
                                <span className = { classes.subjectsLabel }>Твои предметы: </span>
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
                                <span>Домашние задания</span>
                            </button>
                            {uncompletedCount > 0 && (
                                <span className = { classes.badge }>{uncompletedCount}</span>
                            )}
                        </div>
                    </div>

                    {/* Join Button */}
                    <div className = { classes.joinSection }>
                        <div className = { classes.joinButtonWrapper }>
                            <button
                                className = { classes.joinButton }
                                onClick = { handleJoinClick }
                                type = 'button'>
                                <div className = { classes.joinButtonText }>
                                    <span className = { classes.joinButtonTitle }>Войти на урок</span>
                                    <span className = { classes.joinButtonSubtitle }>
                                        Подключиться к {teacherName}
                                    </span>
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
