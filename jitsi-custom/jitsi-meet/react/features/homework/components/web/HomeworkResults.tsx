import React from 'react';
import { makeStyles } from 'tss-react/mui';

import Icon from '../../../base/icons/components/Icon';
import { IconArrowLeft, IconCheck, IconCloseLarge } from '../../../base/icons/svg';
import ThemeToggle from '../../../base/ui/components/web/ThemeToggle';

const useStyles = makeStyles()(theme => {
    return {
        container: {
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            backgroundColor: theme.palette.uiBackground,
            padding: theme.spacing(3)
        },

        header: {
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing(2),
            marginBottom: theme.spacing(3)
        },

        backButton: {
            padding: theme.spacing(2),
            backgroundColor: theme.palette.ui02,
            border: 'none',
            borderRadius: theme.shape.borderRadius,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s',

            '&:hover': {
                backgroundColor: theme.palette.ui03
            },

            '& svg': {
                fill: theme.palette.icon01
            }
        },

        title: {
            ...theme.typography.heading4,
            color: theme.palette.text01,
            margin: 0
        },

        content: {
            maxWidth: '800px',
            width: '100%',
            margin: '0 auto'
        },

        scoreCard: {
            backgroundColor: theme.palette.ui01,
            borderRadius: theme.shape.borderRadius * 2,
            padding: theme.spacing(4),
            marginBottom: theme.spacing(3),
            textAlign: 'center',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.25)'
        },

        celebrationIcon: {
            fontSize: '64px',
            marginBottom: theme.spacing(2)
        },

        scoreTitle: {
            ...theme.typography.heading5,
            color: theme.palette.text01,
            marginBottom: theme.spacing(2)
        },

        score: {
            fontSize: '72px',
            fontWeight: 700,
            marginBottom: theme.spacing(2)
        },

        scoreExcellent: {
            color: '#10B981'
        },

        scoreGood: {
            color: theme.palette.action01
        },

        scoreFair: {
            color: '#F59E0B'
        },

        scorePoor: {
            color: theme.palette.actionDanger
        },

        scoreMessage: {
            ...theme.typography.bodyLongRegular,
            color: theme.palette.text02,
            marginBottom: theme.spacing(3)
        },

        stats: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: theme.spacing(2),
            marginTop: theme.spacing(3)
        },

        statItem: {
            backgroundColor: theme.palette.ui02,
            borderRadius: theme.shape.borderRadius,
            padding: theme.spacing(2),
            textAlign: 'center'
        },

        statValue: {
            ...theme.typography.heading6,
            color: theme.palette.text01,
            fontWeight: 700,
            marginBottom: theme.spacing(1)
        },

        statLabel: {
            ...theme.typography.bodyShortRegular,
            color: theme.palette.text02,
            fontSize: '12px'
        },

        detailsCard: {
            backgroundColor: theme.palette.ui01,
            borderRadius: theme.shape.borderRadius * 2,
            padding: theme.spacing(3),
            marginBottom: theme.spacing(3)
        },

        detailsTitle: {
            ...theme.typography.heading6,
            color: theme.palette.text01,
            marginBottom: theme.spacing(2)
        },

        questionsList: {
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(2)
        },

        questionItem: {
            backgroundColor: theme.palette.ui02,
            borderRadius: theme.shape.borderRadius,
            padding: theme.spacing(2),
            display: 'flex',
            alignItems: 'flex-start',
            gap: theme.spacing(2)
        },

        questionIcon: {
            marginTop: '4px',

            '& svg': {
                fill: theme.palette.success01
            }
        },

        questionIconWrong: {
            marginTop: '4px',

            '& svg': {
                fill: theme.palette.actionDanger
            }
        },

        questionContent: {
            flex: 1
        },

        questionText: {
            ...theme.typography.bodyShortRegular,
            color: theme.palette.text01,
            marginBottom: theme.spacing(1)
        },

        questionAnswer: {
            ...theme.typography.bodyShortRegular,
            color: theme.palette.text02,
            fontSize: '14px'
        },

        correct: {
            color: theme.palette.success01
        },

        incorrect: {
            color: theme.palette.actionDanger
        },

        actions: {
            display: 'flex',
            gap: theme.spacing(2),
            justifyContent: 'center',
            marginTop: theme.spacing(3)
        },

        button: {
            padding: `${theme.spacing(2)} ${theme.spacing(3)}`,
            borderRadius: theme.shape.borderRadius,
            border: 'none',
            cursor: 'pointer',
            ...theme.typography.bodyShortBold,
            transition: 'all 0.2s'
        },

        primaryButton: {
            backgroundColor: theme.palette.action01,
            color: theme.palette.text01,

            '&:hover': {
                backgroundColor: theme.palette.action01Hover,
                boxShadow: '0 4px 12px rgba(61, 124, 201, 0.3)'
            }
        },

        secondaryButton: {
            backgroundColor: theme.palette.action02,
            color: theme.palette.text04,

            '&:hover': {
                backgroundColor: theme.palette.action02Hover
            }
        }
    };
});

interface IProps {
    student: any;
    homework: any;
    report: any;
    questions: any[];
    onBackToHomework: () => void;
    onBackToWelcome: () => void;
    theme?: 'dark' | 'light';
    onThemeChange?: (newTheme: 'dark' | 'light') => void;
}

/**
 * Component that displays homework results with detailed breakdown.
 *
 * @param {IProps} props - Component props.
 * @returns {JSX.Element}
 */
const HomeworkResults: React.FC<IProps> = ({
    student,
    homework,
    report,
    questions,
    onBackToHomework,
    onBackToWelcome,
    theme = 'dark',
    onThemeChange
}) => {
    const { classes, cx } = useStyles();

    const score = report.score || 0;
    const correctAnswers = report.correctAnswers || 0;
    const totalQuestions = report.totalQuestions || questions.length;
    const answers = report.answers || {};

    // Determine score class and message
    let scoreClass = classes.scorePoor;
    let message = 'Нужно больше практики. Не сдавайтесь!';
    let celebrationIcon = '😔';

    if (score >= 90) {
        scoreClass = classes.scoreExcellent;
        message = 'Превосходно! Вы отлично справились!';
        celebrationIcon = '🎉';
    } else if (score >= 70) {
        scoreClass = classes.scoreGood;
        message = 'Хорошая работа! Продолжайте в том же духе!';
        celebrationIcon = '😊';
    } else if (score >= 50) {
        scoreClass = classes.scoreFair;
        message = 'Неплохо! Есть над чем поработать.';
        celebrationIcon = '🙂';
    }

    return (
        <div className = { classes.container }>
            {/* Logo Header */}
            <div style = {{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '12px'
            }}>
                <img
                    alt = "RV2Class"
                    src = "/images/logo-white-tight.png"
                    style = {{
                        width: '150px',
                        height: 'auto'
                    }} />
            </div>

            <div className = { classes.header }>
                <div style = {{ display: 'flex', gap: '16px', alignItems: 'center', flex: 1 }}>
                    <button
                        className = { classes.backButton }
                        onClick = { onBackToHomework }
                        type = 'button'>
                        <Icon
                            size = { 24 }
                            src = { IconArrowLeft } />
                    </button>
                    <h1 className = { classes.title }>Результаты задания</h1>
                </div>

                {/* Theme Toggle */}
                {onThemeChange && (
                    <ThemeToggle
                        onThemeChange = { onThemeChange }
                        theme = { theme } />
                )}
            </div>

            <div className = { classes.content }>
                {/* Score Card */}
                <div className = { classes.scoreCard }>
                    <div className = { classes.celebrationIcon }>{celebrationIcon}</div>
                    <h2 className = { classes.scoreTitle }>Задание выполнено!</h2>
                    <div className = { cx(classes.score, scoreClass) }>
                        {score}%
                    </div>
                    <p className = { classes.scoreMessage }>{message}</p>

                    <div className = { classes.stats }>
                        <div className = { classes.statItem }>
                            <div className = { classes.statValue }>{correctAnswers}</div>
                            <div className = { classes.statLabel }>Правильных</div>
                        </div>
                        <div className = { classes.statItem }>
                            <div className = { classes.statValue }>{totalQuestions - correctAnswers}</div>
                            <div className = { classes.statLabel }>Ошибок</div>
                        </div>
                        <div className = { classes.statItem }>
                            <div className = { classes.statValue }>{totalQuestions}</div>
                            <div className = { classes.statLabel }>Всего вопросов</div>
                        </div>
                    </div>
                </div>

                {/* Detailed Results */}
                {questions.length > 0 && (
                    <div className = { classes.detailsCard }>
                        <h3 className = { classes.detailsTitle }>Подробные результаты</h3>
                        <div className = { classes.questionsList }>
                            {questions.map((question, index) => {
                                // Get student's answer from submittedAnswers array OR answers array (legacy Telegram bot format)
                                const answersArray = report.submittedAnswers || report.answers || [];
                                const submittedAnswerObj = answersArray.find(
                                    (a: any) => a.questionId === question.id
                                );
                                const submittedAnswer = submittedAnswerObj?.answer;
                                
                                // Debug logging
                                if (index === 0) {
                                    console.log('🔍 Debug first question:', {
                                        questionId: question.id,
                                        hasSubmittedAnswers: !!report.submittedAnswers,
                                        hasAnswers: !!report.answers,
                                        usingField: report.submittedAnswers ? 'submittedAnswers' : 'answers',
                                        answersArray,
                                        submittedAnswerObj,
                                        submittedAnswer
                                    });
                                }
                                
                                // Determine if answer is correct (matching rv2class logic)
                                let isCorrect = false;
                                
                                // If correctAnswer is a number, it might be an index into the options array
                                if (typeof question.correctAnswer === 'number' && question.options) {
                                    const correctOption = question.options[question.correctAnswer];
                                    if (typeof submittedAnswer === 'number') {
                                        // Both are indices
                                        isCorrect = submittedAnswer === question.correctAnswer;
                                    } else {
                                        // Compare submitted string with correct option text
                                        const correctStr = String(correctOption || '').trim().toLowerCase();
                                        const submittedStr = String(submittedAnswer || '').trim().toLowerCase();
                                        isCorrect = correctStr === submittedStr;
                                    }
                                } else {
                                    // Direct string comparison (for text answers or string-based correct answers)
                                    const correctStr = String(question.correctAnswer || '').trim().toLowerCase();
                                    const submittedStr = String(submittedAnswer || '').trim().toLowerCase();
                                    isCorrect = correctStr === submittedStr;
                                }

                                return (
                                    <div
                                        className = { classes.questionItem }
                                        key = { question.id }
                                        style = {{ display: 'block' }}>
                                        {/* Question Header */}
                                        <div style = {{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                                            <div style = {{
                                                backgroundColor: isCorrect ? '#10B981' : '#EF4444',
                                                color: 'white',
                                                padding: '4px 12px',
                                                borderRadius: '8px',
                                                fontWeight: 700,
                                                fontSize: '14px',
                                                minWidth: '32px',
                                                textAlign: 'center'
                                            }}>
                                                {index + 1}
                                            </div>
                                            <div style = {{ flex: 1 }}>
                                                <div className = { classes.questionText }>
                                                    {question.text || question.sentence || 'Вопрос'}
                                                </div>
                                            </div>
                                            <div className = { isCorrect ? classes.questionIcon : classes.questionIconWrong }>
                                                <Icon
                                                    size = { 24 }
                                                    src = { isCorrect ? IconCheck : IconCloseLarge } />
                                            </div>
                                        </div>

                                        {/* Media Display */}
                                        {(question.imageUrl || question.audioUrl || question.videoUrl || question.mediaUrl) && (
                                            <div style = {{ marginBottom: '16px', marginLeft: '44px' }}>
                                                {(question.imageUrl || (question.mediaUrl && question.mediaFiles?.some((f: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(f)))) && (
                                                    <img
                                                        alt = "Question media"
                                                        src = { question.imageUrl || question.mediaUrl }
                                                        style = {{
                                                            maxWidth: '100%',
                                                            maxHeight: '300px',
                                                            borderRadius: '8px',
                                                            objectFit: 'contain'
                                                        }} />
                                                )}
                                                {(question.audioUrl || (question.mediaUrl && question.mediaFiles?.some((f: string) => /\.(mp3|wav|ogg)$/i.test(f)))) && (
                                                    <audio
                                                        controls = { true }
                                                        src = { question.audioUrl || question.mediaUrl }
                                                        style = {{ width: '100%', maxWidth: '400px' }} />
                                                )}
                                                {(question.videoUrl || (question.mediaUrl && question.mediaFiles?.some((f: string) => /\.(mp4|webm|ogg)$/i.test(f)))) && (
                                                    <video
                                                        controls = { true }
                                                        src = { question.videoUrl || question.mediaUrl }
                                                        style = {{
                                                            maxWidth: '100%',
                                                            maxHeight: '300px',
                                                            borderRadius: '8px'
                                                        }} />
                                                )}
                                            </div>
                                        )}

                                        {/* Multiple Choice Options */}
                                        {question.options && question.options.length > 0 && (
                                            <div style = {{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '44px' }}>
                                                {question.options.map((option: string, optionIndex: number) => {
                                                    // Handle both index-based and string-based correct answers
                                                    let isThisCorrect = false;
                                                    if (typeof question.correctAnswer === 'number') {
                                                        isThisCorrect = question.correctAnswer === optionIndex;
                                                    } else {
                                                        isThisCorrect = String(question.correctAnswer).trim().toLowerCase() === String(option).trim().toLowerCase();
                                                    }
                                                    
                                                    // Handle both index-based and string-based submitted answers
                                                    let isThisSelected = false;
                                                    if (typeof submittedAnswer === 'number') {
                                                        isThisSelected = submittedAnswer === optionIndex;
                                                    } else if (submittedAnswer !== undefined && submittedAnswer !== null && submittedAnswer !== '') {
                                                        isThisSelected = String(submittedAnswer).trim().toLowerCase() === String(option).trim().toLowerCase();
                                                    }
                                                    
                                                    let backgroundColor = 'transparent';
                                                    let borderColor = '#4B5563';
                                                    
                                                    if (isThisCorrect) {
                                                        backgroundColor = 'rgba(16, 185, 129, 0.1)';
                                                        borderColor = '#10B981';
                                                    } else if (isThisSelected && !isThisCorrect) {
                                                        backgroundColor = 'rgba(239, 68, 68, 0.1)';
                                                        borderColor = '#EF4444';
                                                    }

                                                    return (
                                                        <div
                                                            key = { optionIndex }
                                                            style = {{
                                                                padding: '12px 16px',
                                                                borderRadius: '8px',
                                                                border: `2px solid ${borderColor}`,
                                                                backgroundColor,
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center'
                                                            }}>
                                                            <span style = {{ color: '#E5E7EB' }}>{option}</span>
                                                            <div style = {{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                                                {isThisSelected && (
                                                                    <span style = {{
                                                                        fontSize: '13px',
                                                                        fontWeight: 700,
                                                                        padding: '6px 12px',
                                                                        borderRadius: '6px',
                                                                        backgroundColor: isThisCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                                        color: isThisCorrect ? '#10B981' : '#EF4444',
                                                                        border: `2px solid ${isThisCorrect ? '#10B981' : '#EF4444'}`,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '6px'
                                                                    }}>
                                                                        <Icon
                                                                            size = { 16 }
                                                                            src = { isThisCorrect ? IconCheck : IconCloseLarge } />
                                                                        <strong>Student's Answer</strong>
                                                                    </span>
                                                                )}
                                                                {isThisCorrect && !isThisSelected && (
                                                                    <span style = {{
                                                                        fontSize: '13px',
                                                                        fontWeight: 700,
                                                                        padding: '6px 12px',
                                                                        borderRadius: '6px',
                                                                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                                                                        color: '#10B981',
                                                                        border: '2px solid #10B981',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '6px'
                                                                    }}>
                                                                        <Icon
                                                                            size = { 16 }
                                                                            src = { IconCheck } />
                                                                        <strong>Correct Answer</strong>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Text Answer (for fill-in-blank or text questions) */}
                                        {(!question.options || question.options.length === 0) && (
                                            <div style = {{ marginLeft: '44px' }}>
                                                <div style = {{
                                                    padding: '12px 16px',
                                                    borderRadius: '8px',
                                                    border: `2px solid ${isCorrect ? '#10B981' : '#EF4444'}`,
                                                    backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                    marginBottom: '8px'
                                                }}>
                                                    <div style = {{
                                                        fontSize: '12px',
                                                        fontWeight: 700,
                                                        color: isCorrect ? '#10B981' : '#EF4444',
                                                        marginBottom: '4px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}>
                                                        <Icon
                                                            size = { 14 }
                                                            src = { isCorrect ? IconCheck : IconCloseLarge } />
                                                        Ваш ответ:
                                                    </div>
                                                    <div style = {{
                                                        fontSize: '16px',
                                                        fontWeight: 700,
                                                        color: isCorrect ? '#10B981' : '#EF4444'
                                                    }}>
                                                        {submittedAnswer || '(не указан)'}
                                                    </div>
                                                </div>
                                                {!isCorrect && (
                                                    <div style = {{
                                                        padding: '12px 16px',
                                                        borderRadius: '8px',
                                                        border: '2px solid #10B981',
                                                        backgroundColor: 'rgba(16, 185, 129, 0.1)'
                                                    }}>
                                                        <div style = {{
                                                            fontSize: '12px',
                                                            fontWeight: 700,
                                                            color: '#10B981',
                                                            marginBottom: '4px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}>
                                                            <Icon
                                                                size = { 14 }
                                                                src = { IconCheck } />
                                                            Правильный ответ:
                                                        </div>
                                                        <div style = {{
                                                            fontSize: '16px',
                                                            fontWeight: 700,
                                                            color: '#10B981'
                                                        }}>
                                                            {typeof question.correctAnswer === 'number' && question.options 
                                                                ? question.options[question.correctAnswer] 
                                                                : question.correctAnswer}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Explanation */}
                                        {question.explanation && (
                                            <div style = {{
                                                marginTop: '12px',
                                                marginLeft: '44px',
                                                padding: '12px',
                                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                                borderRadius: '8px',
                                                border: '1px solid #3B82F6'
                                            }}>
                                                <div style = {{
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    color: '#3B82F6',
                                                    marginBottom: '4px'
                                                }}>
                                                    💡 Объяснение:
                                                </div>
                                                <div style = {{
                                                    fontSize: '14px',
                                                    color: '#9CA3AF'
                                                }}>
                                                    {question.explanation}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className = { classes.actions }>
                    <button
                        className = { cx(classes.button, classes.primaryButton) }
                        onClick = { onBackToHomework }
                        type = 'button'>
                        Назад к заданиям
                    </button>
                    <button
                        className = { cx(classes.button, classes.secondaryButton) }
                        onClick = { onBackToWelcome }
                        type = 'button'>
                        На главную
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HomeworkResults;
