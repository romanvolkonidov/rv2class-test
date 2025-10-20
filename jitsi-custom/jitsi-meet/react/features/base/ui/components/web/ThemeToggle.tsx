import React, { useCallback } from 'react';
import { makeStyles } from 'tss-react/mui';

import Icon from '../../../icons/components/Icon';
import { IconHighlight } from '../../../icons/svg';
import Switch from './Switch';

const useStyles = makeStyles()(theme => {
    return {
        container: {
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing(1.5),
            padding: theme.spacing(1.5),
            backgroundColor: theme.palette.ui02,
            borderRadius: theme.shape.borderRadius,
            ...theme.typography.bodyShortRegular
        },

        label: {
            color: theme.palette.text01,
            fontSize: '14px'
        },

        icon: {
            '& svg': {
                fill: theme.palette.icon01
            }
        }
    };
});

interface IProps {
    /**
     * Current theme mode ('dark' or 'light').
     */
    theme: 'dark' | 'light';

    /**
     * Callback when theme changes.
     */
    onThemeChange: (newTheme: 'dark' | 'light') => void;
}

/**
 * Component that displays a theme toggle switch for dark/light mode.
 *
 * @param {IProps} props - Component props.
 * @returns {JSX.Element}
 */
const ThemeToggle: React.FC<IProps> = ({ theme, onThemeChange }) => {
    const { classes } = useStyles();

    const handleToggle = useCallback((checked?: boolean) => {
        onThemeChange(checked ? 'dark' : 'light');
    }, [ onThemeChange ]);

    return (
        <div className = { classes.container }>
            <Icon
                className = { classes.icon }
                size = { 20 }
                src = { IconHighlight } />
            <span className = { classes.label }>
                {theme === 'dark' ? 'Тёмная тема' : 'Светлая тема'}
            </span>
            <Switch
                checked = { theme === 'dark' }
                onChange = { handleToggle } />
        </div>
    );
};

export default ThemeToggle;
