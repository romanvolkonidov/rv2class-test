import React, { useEffect, useCallback, useState } from 'react';
import { connect } from 'react-redux';
import {
    Box,
    Typography,
    Card as MuiCard,
    CardContent as MuiCardContent,
    Button as MuiButton,
    Stack,
    Chip,
    List,
    ListItem,
    ListItemAvatar,
    Avatar,
    ListItemText,
    Divider,
    Badge,
    CircularProgress,
} from '@mui/material';

import { IReduxState } from '../../../app/types';
import Icon from '../../../base/icons/components/Icon';
import { IconArrowLeft, IconCheck, IconPlay } from '../../../base/icons/svg';
import ThemeToggle from '../../../base/ui/components/web/ThemeToggle';
import { IconBook, IconClock, IconEye, IconTrophy } from '../../icons';

interface IProps {
    /**
     * Student ID.
     */
    studentId: string;

    /**
     * Student name.
     */
    studentName: string;

    /**
     * Homework assignments.
     */
    assignments: any[];

    /**
     * Homework reports.
     */
    reports: any[];

    /**
     * Loading state.
     */
    loading: boolean;

    /**
     * Student's overall rating percentage (0-100).
     */
    rating?: number | null;

    /**
     * Function to navigate back.
     */
    onBack: () => void;

    /**
     * Function to start homework.
     */
    onStartHomework: (homeworkId: string) => void;

    /**
     * Function to view results.
     */
    onViewResults: (homeworkId: string) => void;

    /**
     * Current theme mode.
     */
    theme?: 'dark' | 'light';

    /**
     * Callback when theme changes.
     */
    onThemeChange?: (newTheme: 'dark' | 'light') => void;
}

/**
 * Component that renders the student homework list.
 *
 * @param {IProps} props - The props of the component.
 * @returns {ReactElement}
 */
function StudentHomeworkList({
    studentId,
    studentName,
    assignments,
    reports,
    loading,
    rating,
    onBack,
    onStartHomework,
    onViewResults,
    theme = 'dark',
    onThemeChange
}: IProps) {
    const [questionCounts, setQuestionCounts] = useState<Record<string, { total: number; incomplete: number }>>({});

    const formatDate = useCallback((timestamp: any) => {
        if (!timestamp) return 'N/A';

        try {
            let date;

            if (timestamp.toDate && typeof timestamp.toDate === 'function') {
                date = timestamp.toDate();
            } else if (timestamp instanceof Date) {
                date = timestamp;
            } else if (timestamp.seconds !== undefined) {
                date = new Date(timestamp.seconds * 1000);
            } else {
                date = new Date(timestamp);
            }

            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            console.error('Error formatting date:', error);

            return 'Date error';
        }
    }, []);

    const getHomeworkStatus = useCallback((assignment: any) => {
        const report = reports.find(r => r.homeworkId === assignment.id);

        if (report) {
            return {
                status: 'completed',
                score: report.score,
                completedAt: report.completedAt
            };
        }

        return {
            status: 'pending',
            score: null,
            completedAt: null
        };
    }, [reports]);

    const totalCount = assignments.length;
    const completedCount = assignments.filter(a => getHomeworkStatus(a).status === 'completed').length;

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <CircularProgress size={60} />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3, minHeight: '100vh', bgcolor: theme === 'dark' ? '#0f1720' : '#f5f5f5' }}>
            {/* Back Button and Theme Toggle */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <MuiButton
                    startIcon={<Icon size={20} src={IconArrowLeft} />}
                    onClick={onBack}
                    sx={{
                        color: theme === 'dark' ? '#a8b6c8' : '#666',
                        '&:hover': { bgcolor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                    }}
                >
                    Back to Welcome Page
                </MuiButton>
                {onThemeChange && (
                    <ThemeToggle
                        onThemeChange={onThemeChange}
                        theme={theme}
                    />
                )}
            </Stack>

            <MuiCard 
                sx={{ 
                    maxWidth: 980, 
                    mx: 'auto', 
                    borderRadius: 3, 
                    boxShadow: 6,
                    bgcolor: theme === 'dark' ? '#111827' : '#ffffff'
                }}
            >
                <MuiCardContent>
                    {/* Header Section */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" gap={2}>
                        <Stack>
                            <Typography 
                                variant="h5" 
                                sx={{ 
                                    fontWeight: 700, 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 1,
                                    color: theme === 'dark' ? '#e6eef8' : '#000'
                                }}
                            >
                                <Icon size={28} src={IconBook} />
                                {studentName}'s Homework
                            </Typography>
                            <Typography 
                                variant="body2" 
                                sx={{ color: theme === 'dark' ? '#a8b6c8' : '#666' }}
                            >
                                Track your assignments and progress
                            </Typography>
                        </Stack>

                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            <Chip 
                                label={`Total: ${totalCount}`} 
                                sx={{ 
                                    bgcolor: '#2b90d9',
                                    color: 'white',
                                    fontWeight: 600
                                }} 
                            />
                            <Chip 
                                label={`Completed: ${completedCount}`}
                                variant="outlined"
                                sx={{
                                    borderColor: '#10b981',
                                    color: '#10b981',
                                    fontWeight: 600
                                }}
                            />
                            <Chip 
                                label={`Pending: ${totalCount - completedCount}`}
                                variant="outlined"
                                sx={{
                                    borderColor: '#f59e0b',
                                    color: '#f59e0b',
                                    fontWeight: 600
                                }}
                            />
                            
                            {/* Rating Badge */}
                            {rating !== null && rating !== undefined && (
                                <Chip
                                    icon={<Icon size={16} src={IconTrophy} />}
                                    label={`${rating}%`}
                                    sx={{
                                        bgcolor: '#f59e0b',
                                        color: 'white',
                                        fontWeight: 700,
                                        '& .MuiChip-icon': { color: 'white' }
                                    }}
                                    onClick={() => window.location.href = `/student-leaderboard.html?student=${studentId}`}
                                />
                            )}
                        </Stack>
                    </Stack>

                    <Divider sx={{ my: 2, bgcolor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />

                    {/* Empty State */}
                    {assignments.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 8 }}>
                            <Icon size={64} src={IconBook} />
                            <Typography 
                                variant="h6" 
                                sx={{ mt: 2, color: theme === 'dark' ? '#a8b6c8' : '#666' }}
                            >
                                No homework assignments yet.
                            </Typography>
                            <Typography 
                                variant="body2" 
                                sx={{ mt: 1, color: theme === 'dark' ? '#6b7280' : '#999' }}
                            >
                                Your teacher will assign homework for you to complete.
                            </Typography>
                        </Box>
                    ) : (
                        /* Homework List */
                        <List>
                            {assignments.map((assignment) => {
                                const statusInfo = getHomeworkStatus(assignment);
                                const questionInfo = questionCounts[assignment.id];
                                const isCompleted = statusInfo.status === 'completed';

                                return (
                                    <div key={assignment.id}>
                                        <ListItem
                                            sx={{
                                                bgcolor: isCompleted 
                                                    ? 'rgba(16, 185, 129, 0.1)' 
                                                    : 'rgba(245, 158, 11, 0.1)',
                                                borderRadius: 2,
                                                mb: 2,
                                                border: '1px solid',
                                                borderColor: isCompleted 
                                                    ? theme === 'dark' ? 'rgba(16, 185, 129, 0.3)' : '#10b981'
                                                    : theme === 'dark' ? 'rgba(245, 158, 11, 0.3)' : '#f59e0b',
                                                flexDirection: 'column',
                                                alignItems: 'stretch',
                                                px: 2,
                                                py: 2,
                                            }}
                                        >
                                            {/* Main Content Row */}
                                            <Stack direction="row" spacing={2} sx={{ width: '100%', mb: 2 }}>
                                                <ListItemAvatar>
                                                    <Badge
                                                        badgeContent={
                                                            isCompleted 
                                                                ? <Icon size={16} src={IconCheck} />
                                                                : <Icon size={16} src={IconClock} />
                                                        }
                                                        color={isCompleted ? "success" : "warning"}
                                                        overlap="circular"
                                                    >
                                                        <Avatar 
                                                            sx={{ 
                                                                bgcolor: '#2b90d9', 
                                                                width: 48, 
                                                                height: 48 
                                                            }}
                                                        >
                                                            {(assignment.title || "H").charAt(0).toUpperCase()}
                                                        </Avatar>
                                                    </Badge>
                                                </ListItemAvatar>

                                                <ListItemText
                                                    primary={
                                                        <Typography 
                                                            sx={{ 
                                                                fontWeight: 700, 
                                                                fontSize: '1.1rem',
                                                                color: theme === 'dark' ? '#e6eef8' : '#000'
                                                            }}
                                                        >
                                                            {assignment.title || assignment.topicName || "Homework"}
                                                        </Typography>
                                                    }
                                                    secondary={
                                                        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                                                            {assignment.courseName && (
                                                                <Typography 
                                                                    component="span" 
                                                                    variant="body2"
                                                                    sx={{ color: theme === 'dark' ? '#a8b6c8' : '#666' }}
                                                                >
                                                                    📚 {assignment.courseName}
                                                                    {assignment.chapterName && ` > ${assignment.chapterName}`}
                                                                </Typography>
                                                            )}
                                                            <Typography 
                                                                component="span" 
                                                                variant="body2"
                                                                sx={{ color: theme === 'dark' ? '#a8b6c8' : '#666' }}
                                                            >
                                                                📅 Assigned: {formatDate(assignment.assignedAt)}
                                                            </Typography>
                                                            {questionInfo && (
                                                                <Typography 
                                                                    component="span" 
                                                                    variant="body2"
                                                                    sx={{ color: theme === 'dark' ? '#a8b6c8' : '#666' }}
                                                                >
                                                                    ❓ {questionInfo.total} question{questionInfo.total !== 1 ? 's' : ''}
                                                                </Typography>
                                                            )}
                                                            {isCompleted && statusInfo.score !== null && (
                                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                                    <Icon size={16} src={IconTrophy} />
                                                                    <Typography 
                                                                        component="span" 
                                                                        variant="body2" 
                                                                        sx={{ fontWeight: 700, color: '#f59e0b' }}
                                                                    >
                                                                        Score: {statusInfo.score}%
                                                                    </Typography>
                                                                </Stack>
                                                            )}
                                                        </Stack>
                                                    }
                                                />

                                                <Stack alignItems="flex-end" justifyContent="center">
                                                    <Chip
                                                        label={isCompleted ? "Completed" : "Pending"}
                                                        color={isCompleted ? "success" : "warning"}
                                                        size="small"
                                                        sx={{ fontWeight: 700 }}
                                                    />
                                                </Stack>
                                            </Stack>

                                            {/* Action Buttons */}
                                            <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
                                                {isCompleted ? (
                                                    <MuiButton
                                                        variant="contained"
                                                        startIcon={<Icon size={16} src={IconEye} />}
                                                        onClick={() => onViewResults(assignment.id)}
                                                        fullWidth
                                                        sx={{ bgcolor: '#2b90d9', '&:hover': { bgcolor: '#2070b9' } }}
                                                    >
                                                        View Results
                                                    </MuiButton>
                                                ) : (
                                                    <MuiButton
                                                        variant="contained"
                                                        startIcon={<Icon size={16} src={IconPlay} />}
                                                        onClick={() => onStartHomework(assignment.id)}
                                                        fullWidth
                                                        sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
                                                    >
                                                        Start Homework
                                                    </MuiButton>
                                                )}
                                            </Stack>
                                        </ListItem>
                                    </div>
                                );
                            })}
                        </List>
                    )}

                    {/* Footer Note */}
                    <Typography 
                        variant="body2" 
                        sx={{ 
                            textAlign: 'center', 
                            mt: 3,
                            color: theme === 'dark' ? '#6b7280' : '#999'
                        }}
                    >
                        📝 Answer quiz questions to complete your homework and see your score
                    </Typography>
                </MuiCardContent>
            </MuiCard>
        </Box>
    );
}

/**
 * Maps (parts of) the redux state to the associated props for this component.
 *
 * @param {Object} state - The Redux state.
 * @returns {IProps}
 */
function _mapStateToProps(state: IReduxState) {
    return {
        // Map homework state from Redux here
    };
}

export default connect(_mapStateToProps)(StudentHomeworkList);
