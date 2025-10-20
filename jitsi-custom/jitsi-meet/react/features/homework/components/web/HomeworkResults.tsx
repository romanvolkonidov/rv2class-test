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
            padding: theme.spacing(1.5),
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
            marginBottom: theme.spacing(0.5)
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
                transform: 'translateY(-2px)'
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
                                const userAnswer = answers[question.id];
                                const isCorrect = userAnswer === question.correctAnswer;

                                return (
                                    <div
                                        className = { classes.questionItem }
                                        key = { question.id }>
                                        <div className = { isCorrect ? classes.questionIcon : classes.questionIconWrong }>
                                            <Icon
                                                size = { 20 }
                                                src = { isCorrect ? IconCheck : IconCloseLarge } />
                                        </div>
                                        <div className = { classes.questionContent }>
                                            <div className = { classes.questionText }>
                                                <strong>{index + 1}.</strong> {question.text || question.sentence || 'Вопрос'}
                                            </div>
                                            <div className = { classes.questionAnswer }>
                                                <span className = { isCorrect ? classes.correct : classes.incorrect }>
                                                    Ваш ответ: {userAnswer || '(не выбран)'}
                                                </span>
                                                {!isCorrect && question.correctAnswer && (
                                                    <span style = {{ marginLeft: '12px' }} className = { classes.correct }>
                                                        Правильный ответ: {question.correctAnswer}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
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
