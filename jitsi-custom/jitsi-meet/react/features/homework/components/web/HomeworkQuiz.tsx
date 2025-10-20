import React, { useState, useEffect, useCallback } from 'react';
import { connect } from 'react-redux';

import { IReduxState } from '../../../app/types';
import Icon from '../../../base/icons/components/Icon';
import { IconArrowLeft, IconCheck } from '../../../base/icons/svg';
import ThemeToggle from '../../../base/ui/components/web/ThemeToggle';
import { IconX, IconPlay, IconImage, IconAudio, IconVideo } from '../../icons';

interface IQuestion {
    id: string;
    text: string;
    type: string;
    correctAnswer?: string;
    choices?: string[];
    mediaFiles?: any[];
    sentence?: string;
}

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
     * Homework ID.
     */
    homeworkId: string;

    /**
     * Questions for the homework.
     */
    questions: IQuestion[];

    /**
     * Loading state.
     */
    loading: boolean;

    /**
     * Submission state.
     */
    submitting: boolean;

    /**
     * Results after submission.
     */
    results: any;

    /**
     * Function to navigate back.
     */
    onBack: () => void;

    /**
     * Function to submit homework.
     */
    onSubmit: (answers: Record<string, string>) => void;

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
 * Component that renders the homework quiz interface.
 *
 * @param {IProps} props - The props of the component.
 * @returns {ReactElement}
 */
function HomeworkQuiz({
    studentId,
    studentName,
    homeworkId,
    questions,
    loading,
    submitting,
    results,
    onBack,
    onSubmit,
    theme = 'dark',
    onThemeChange
}: IProps) {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});

    const currentQuestion = questions[currentQuestionIndex];

    const handleAnswerChange = useCallback((questionId: string, answer: string) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: answer
        }));
    }, []);

    const handleNext = useCallback(() => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    }, [currentQuestionIndex, questions.length]);

    const handlePrevious = useCallback(() => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    }, [currentQuestionIndex]);

    const handleSubmit = useCallback(() => {
        onSubmit(answers);
    }, [answers, onSubmit]);

    const answeredCount = Object.keys(answers).length;
    const progress = (answeredCount / questions.length) * 100;

    if (loading) {
        return (
            <div className = 'homework-loading'>
                <div className = 'spinner' />
            </div>
        );
    }

    // Show results if homework is completed
    if (results) {
        return (
            <div className = 'homework-results'>
                <div className = 'results-header'>
                    <h1>Quiz Complete!</h1>
                    <div className = 'results-score'>
                        <div className = 'score-circle'>
                            <span className = 'score-value'>{results.score}%</span>
                        </div>
                        <p className = 'score-message'>
                            {results.score === 100 && '🎉 Perfect score! Outstanding work!'}
                            {results.score >= 80 && results.score < 100 && '⭐ Excellent work! Keep it up!'}
                            {results.score >= 60 && results.score < 80 && '👍 Good job! Keep practicing!'}
                            {results.score < 60 && '💪 Keep studying and you\'ll improve!'}
                        </p>
                    </div>
                </div>

                <button
                    className = 'homework-button primary'
                    onClick = { onBack }>
                    <Icon
                        size = { 16 }
                        src = { IconArrowLeft } />
                    <span>Back to Homework List</span>
                </button>
            </div>
        );
    }

    return (
        <div className = 'homework-quiz'>
            <div className = 'quiz-header'>
                <div style = {{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '16px' }}>
                    <button
                        className = 'homework-back-button'
                        onClick = { onBack }>
                        <Icon
                            size = { 20 }
                            src = { IconArrowLeft } />
                        <span>Назад</span>
                    </button>

                    {/* Theme Toggle */}
                    {onThemeChange && (
                        <ThemeToggle
                            onThemeChange = { onThemeChange }
                            theme = { theme } />
                    )}
                </div>

                <button
                    className = 'homework-back-button-hidden'
                    onClick = { onBack }>
                    <Icon
                        size = { 20 }
                        src = { IconArrowLeft } />
                    <span>Back</span>
                </button>

                <div className = 'quiz-progress'>
                    <div className = 'progress-info'>
                        <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                        <span>{answeredCount} / {questions.length} answered</span>
                    </div>
                    <div className = 'progress-bar'>
                        <div
                            className = 'progress-fill'
                            style = {{ width: `${progress}%` }} />
                    </div>
                </div>
            </div>

            <div className = 'quiz-content'>
                {currentQuestion && (
                    <div className = 'question-card'>
                        <div className = 'question-header'>
                            <div className = 'question-number'>
                                <span>Q{currentQuestionIndex + 1}</span>
                            </div>
                            <h2 className = 'question-text'>{currentQuestion.text}</h2>
                        </div>

                        {/* Media files */}
                        {currentQuestion.mediaFiles && currentQuestion.mediaFiles.length > 0 && (
                            <div className = 'question-media'>
                                {currentQuestion.mediaFiles.map((file, index) => (
                                    <div
                                        className = 'media-item'
                                        key = { index }>
                                        {file.type === 'image' && (
                                            <div className = 'media-image'>
                                                <Icon
                                                    size = { 16 }
                                                    src = { IconImage } />
                                                <img
                                                    alt = 'Question media'
                                                    src = { file.url } />
                                            </div>
                                        )}
                                        {file.type === 'audio' && (
                                            <div className = 'media-audio'>
                                                <Icon
                                                    size = { 16 }
                                                    src = { IconAudio } />
                                                <audio
                                                    controls
                                                    src = { file.url } />
                                            </div>
                                        )}
                                        {file.type === 'video' && (
                                            <div className = 'media-video'>
                                                <Icon
                                                    size = { 16 }
                                                    src = { IconVideo } />
                                                <video
                                                    controls
                                                    src = { file.url } />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Answer options */}
                        <div className = 'question-answers'>
                            {currentQuestion.type === 'multiple_choice' && currentQuestion.choices && (
                                <div className = 'answer-choices'>
                                    {currentQuestion.choices.map((choice, index) => (
                                        <button
                                            className = { `answer-choice ${answers[currentQuestion.id] === choice ? 'selected' : ''}` }
                                            key = { index }
                                            onClick = { () => handleAnswerChange(currentQuestion.id, choice) }>
                                            <div className = 'choice-indicator'>
                                                {answers[currentQuestion.id] === choice && (
                                                    <Icon
                                                        size = { 16 }
                                                        src = { IconCheck } />
                                                )}
                                            </div>
                                            <span className = 'choice-text'>{choice}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {currentQuestion.type === 'text' && (
                                <div className = 'answer-text-input'>
                                    <textarea
                                        onChange = { (e) => handleAnswerChange(currentQuestion.id, e.target.value) }
                                        placeholder = 'Type your answer here...'
                                        rows = { 4 }
                                        value = { answers[currentQuestion.id] || '' } />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div className = 'quiz-navigation'>
                    <button
                        className = 'nav-button'
                        disabled = { currentQuestionIndex === 0 }
                        onClick = { handlePrevious }>
                        <Icon
                            size = { 16 }
                            src = { IconArrowLeft } />
                        <span>Previous</span>
                    </button>

                    <div className = 'nav-info'>
                        <div className = 'current-page'>{currentQuestionIndex + 1} / {questions.length}</div>
                        <div className = 'answer-status'>
                            {answers[currentQuestion?.id] ? '✓ Answered' : 'Not answered'}
                        </div>
                    </div>

                    {currentQuestionIndex < questions.length - 1 ? (
                        <button
                            className = 'nav-button'
                            onClick = { handleNext }>
                            <span>Next</span>
                            <Icon
                                size = { 16 }
                                src = { IconArrowLeft }
                                style = {{ transform: 'rotate(180deg)' }} />
                        </button>
                    ) : (
                        <button
                            className = 'nav-button primary'
                            disabled = { submitting }
                            onClick = { handleSubmit }>
                            {submitting ? (
                                <>
                                    <div className = 'spinner-small' />
                                    <span>Submitting...</span>
                                </>
                            ) : (
                                <>
                                    <Icon
                                        size = { 16 }
                                        src = { IconCheck } />
                                    <span>Submit Homework</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
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
        // Map homework quiz state from Redux here
    };
}

export default connect(_mapStateToProps)(HomeworkQuiz);
