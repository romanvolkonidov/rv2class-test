import React, { useEffect, useCallback, useState } from 'react';
import { connect } from 'react-redux';

import { IReduxState } from '../../../app/types';
import Icon from '../../../base/icons/components/Icon';
import { IconArrowLeft, IconCheck, IconPlay } from '../../../base/icons/svg';
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
    onBack,
    onStartHomework,
    onViewResults
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
            <div className = 'homework-loading'>
                <div className = 'spinner' />
            </div>
        );
    }

    return (
        <div className = 'homework-screen'>
            <div className = 'homework-header'>
                <button
                    className = 'homework-back-button'
                    onClick = { onBack }>
                    <Icon
                        size = { 20 }
                        src = { IconArrowLeft } />
                    <span>Back to Welcome Page</span>
                </button>

                <div className = 'homework-header-card'>
                    <div className = 'homework-header-content'>
                        <div className = 'homework-header-icon'>
                            <Icon
                                size = { 40 }
                                src = { IconBook } />
                        </div>
                        <div className = 'homework-header-text'>
                            <h1>{studentName}'s Homework</h1>
                            <p>Complete your assignments to improve your skills</p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className = 'homework-stats'>
                        <div className = 'homework-stat-item stat-total'>
                            <div className = 'stat-value'>{totalCount}</div>
                            <div className = 'stat-label'>Total</div>
                        </div>
                        <div className = 'homework-stat-item stat-completed'>
                            <div className = 'stat-value'>{completedCount}</div>
                            <div className = 'stat-label'>Completed</div>
                        </div>
                        <div className = 'homework-stat-item stat-pending'>
                            <div className = 'stat-value'>{totalCount - completedCount}</div>
                            <div className = 'stat-label'>Pending</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Assignments List */}
            <div className = 'homework-assignments-list'>
                {assignments.length === 0 ? (
                    <div className = 'homework-empty-state'>
                        <Icon
                            size = { 64 }
                            src = { IconBook } />
                        <p>No homework assignments yet.</p>
                        <span>Your teacher will assign homework for you to complete.</span>
                    </div>
                ) : (
                    assignments.map(assignment => {
                        const statusInfo = getHomeworkStatus(assignment);
                        const questionInfo = questionCounts[assignment.id];

                        return (
                            <div
                                className = { `homework-assignment-card ${statusInfo.status}` }
                                key = { assignment.id }>
                                <div className = 'assignment-header'>
                                    <div className = 'assignment-title-section'>
                                        <h3>{assignment.title || 'Homework Assignment'}</h3>

                                        {/* Course/Chapter Info */}
                                        {(assignment.courseName || assignment.chapterName) && (
                                            <div className = 'assignment-meta-info'>
                                                {assignment.courseName && (
                                                    <div className = 'meta-badge course-badge'>
                                                        <span className = 'badge-label'>COURSE</span>
                                                        <span className = 'badge-value'>{assignment.courseName}</span>
                                                    </div>
                                                )}
                                                {assignment.chapterName && (
                                                    <div className = 'meta-badge chapter-badge'>
                                                        <span className = 'badge-label'>CHAPTER</span>
                                                        <span className = 'badge-value'>{assignment.chapterName}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className = 'assignment-info'>
                                            <div className = 'info-item'>
                                                <Icon
                                                    size = { 16 }
                                                    src = { IconClock } />
                                                <span>{formatDate(assignment.assignedAt)}</span>
                                            </div>
                                            {questionInfo && (
                                                <div className = 'info-item'>
                                                    <span>{questionInfo.total} question{questionInfo.total !== 1 ? 's' : ''}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className = 'assignment-status-section'>
                                        <div className = { `status-badge ${statusInfo.status}` }>
                                            {statusInfo.status === 'completed' ? (
                                                <>
                                                    <Icon
                                                        size = { 16 }
                                                        src = { IconCheck } />
                                                    <span>Completed</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Icon
                                                        size = { 16 }
                                                        src = { IconClock } />
                                                    <span>Pending</span>
                                                </>
                                            )}
                                        </div>
                                        {statusInfo.score !== null && (
                                            <div className = 'assignment-score'>
                                                <Icon
                                                    size = { 20 }
                                                    src = { IconTrophy } />
                                                <span>{statusInfo.score}%</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className = 'assignment-actions'>
                                    {statusInfo.status === 'completed' ? (
                                        <button
                                            className = 'homework-button secondary'
                                            onClick = { () => onViewResults(assignment.id) }>
                                            <Icon
                                                size = { 16 }
                                                src = { IconEye } />
                                            <span>View Results</span>
                                        </button>
                                    ) : (
                                        <button
                                            className = 'homework-button primary'
                                            onClick = { () => onStartHomework(assignment.id) }>
                                            <Icon
                                                size = { 16 }
                                                src = { IconPlay } />
                                            <span>Start Homework</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
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
        // Map homework state from Redux here
    };
}

export default connect(_mapStateToProps)(StudentHomeworkList);
