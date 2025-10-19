import React, { useEffect, useState, useCallback } from 'react';
import { connect } from 'react-redux';

import { IReduxState } from '../../../app/types';
import Icon from '../../../base/icons/components/Icon';
import { IconArrowLeft, IconCheck, IconUser } from '../../../base/icons/svg';
import { IconBook, IconX, IconClock, IconTrophy, IconEye } from '../../icons';

interface IHomeworkReport {
    id: string;
    studentName: string;
    studentId: string;
    homeworkId: string;
    score: number;
    completedAt: any;
    answers: Record<string, string>;
    seenByTeacher: boolean;
}

interface IProps {
    /**
     * List of homework reports.
     */
    homeworks: IHomeworkReport[];

    /**
     * Loading state.
     */
    loading: boolean;

    /**
     * Function to navigate back.
     */
    onBack: () => void;

    /**
     * Function to mark homework as seen.
     */
    onMarkAsSeen: (homeworkId: string) => void;

    /**
     * Function to mark all homework as seen.
     */
    onMarkAllAsSeen: () => void;

    /**
     * Function to view homework details.
     */
    onViewDetails: (homeworkId: string) => void;
}

/**
 * Component that renders the teacher homework review interface.
 *
 * @param {IProps} props - The props of the component.
 * @returns {ReactElement}
 */
function TeacherHomeworkReview({
    homeworks,
    loading,
    onBack,
    onMarkAsSeen,
    onMarkAllAsSeen,
    onViewDetails
}: IProps) {
    const [expandedHomework, setExpandedHomework] = useState<string | null>(null);

    const formatDate = useCallback((timestamp: any) => {
        if (!timestamp) return 'N/A';

        try {
            let date;

            if (timestamp.seconds) {
                date = new Date(timestamp.seconds * 1000);
            } else if (timestamp.toDate && typeof timestamp.toDate === 'function') {
                date = timestamp.toDate();
            } else {
                date = new Date(timestamp);
            }

            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Error formatting date:', error);

            return 'Date error';
        }
    }, []);

    const handleToggleExpand = useCallback((homeworkId: string) => {
        setExpandedHomework(prev => (prev === homeworkId ? null : homeworkId));

        if (!expandedHomework || expandedHomework !== homeworkId) {
            onMarkAsSeen(homeworkId);
        }
    }, [expandedHomework, onMarkAsSeen]);

    const unseenCount = homeworks.filter(hw => !hw.seenByTeacher).length;

    if (loading) {
        return (
            <div className = 'homework-loading'>
                <div className = 'spinner' />
            </div>
        );
    }

    return (
        <div className = 'teacher-homework-review'>
            <div className = 'review-header'>
                <button
                    className = 'homework-back-button'
                    onClick = { onBack }>
                    <Icon
                        size = { 20 }
                        src = { IconArrowLeft } />
                    <span>Back to Dashboard</span>
                </button>

                <div className = 'review-header-card'>
                    <div className = 'review-header-content'>
                        <div className = 'review-header-icon'>
                            <Icon
                                size = { 40 }
                                src = { IconBook } />
                        </div>
                        <div className = 'review-header-text'>
                            <h1>All Completed Homework</h1>
                            <p>Review student submissions</p>
                        </div>
                    </div>
                    {unseenCount > 0 && (
                        <div className = 'unseen-badge'>
                            {unseenCount} new
                        </div>
                    )}
                </div>

                {unseenCount > 0 && (
                    <button
                        className = 'homework-button secondary'
                        onClick = { onMarkAllAsSeen }>
                        <Icon
                            size = { 16 }
                            src = { IconCheck } />
                        <span>Mark All as Seen</span>
                    </button>
                )}
            </div>

            {/* Homework List */}
            <div className = 'review-homework-list'>
                {homeworks.length === 0 ? (
                    <div className = 'homework-empty-state'>
                        <Icon
                            size = { 64 }
                            src = { IconBook } />
                        <p>No homework submissions yet.</p>
                    </div>
                ) : (
                    homeworks.map(homework => (
                        <div
                            className = { `review-homework-card ${!homework.seenByTeacher ? 'unseen' : ''}` }
                            key = { homework.id }>
                            <div className = 'homework-summary'>
                                <div className = 'summary-left'>
                                    <div className = 'student-info'>
                                        <Icon
                                            size = { 20 }
                                            src = { IconUser } />
                                        <h3>{homework.studentName || 'Unknown Student'}</h3>
                                        {!homework.seenByTeacher && (
                                            <span className = 'new-badge'>NEW</span>
                                        )}
                                    </div>

                                    <div className = 'homework-meta'>
                                        <div className = 'meta-item'>
                                            <Icon
                                                size = { 16 }
                                                src = { IconClock } />
                                            <span>{formatDate(homework.completedAt)}</span>
                                        </div>
                                        {homework.score !== undefined && (
                                            <div className = 'meta-item'>
                                                <Icon
                                                    size = { 16 }
                                                    src = { IconTrophy } />
                                                <span>{homework.score}%</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className = 'summary-right'>
                                    <button
                                        className = 'expand-button'
                                        onClick = { () => handleToggleExpand(homework.id) }>
                                        <Icon
                                            size = { 20 }
                                            src = { expandedHomework === homework.id ? IconX : IconEye } />
                                        <span>{expandedHomework === homework.id ? 'Close' : 'View Details'}</span>
                                    </button>
                                </div>
                            </div>

                            {expandedHomework === homework.id && (
                                <div className = 'homework-details'>
                                    <div className = 'details-header'>
                                        <h4>Homework Details</h4>
                                        <div className = 'score-display'>
                                            <Icon
                                                size = { 24 }
                                                src = { IconTrophy } />
                                            <span className = 'score-value'>{homework.score}%</span>
                                        </div>
                                    </div>

                                    {/* Question Answers */}
                                    <div className = 'question-answers-list'>
                                        {/* Placeholder for questions - will be populated when viewing details */}
                                        <p>Question details will be displayed here when implemented.</p>
                                    </div>

                                    <div className = 'details-footer'>
                                        <button
                                            className = 'homework-button secondary'
                                            onClick = { () => setExpandedHomework(null) }>
                                            Close Details
                                        </button>
                                        {!homework.seenByTeacher && (
                                            <button
                                                className = 'homework-button primary'
                                                onClick = { () => onMarkAsSeen(homework.id) }>
                                                <Icon
                                                    size = { 16 }
                                                    src = { IconCheck } />
                                                <span>Mark as Seen</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
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
        // Map homework review state from Redux here
    };
}

export default connect(_mapStateToProps)(TeacherHomeworkReview);
