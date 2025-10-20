import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface IThemeContext {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<IThemeContext>({
    theme: 'dark',
    setTheme: () => {}
});

export const useTheme = () => useContext(ThemeContext);

interface IProps {
    children: ReactNode;
}

/**
 * Theme provider component that manages light/dark theme state
 * and applies CSS variables to the document root.
 */
export const ThemeProvider: React.FC<IProps> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>('dark');

    // Load theme from localStorage on mount
    useEffect(() => {
        const savedTheme = localStorage.getItem('rv2class-theme') as Theme | null;

        if (savedTheme === 'light' || savedTheme === 'dark') {
            setTheme(savedTheme);
        }
    }, []);

    // Apply theme to document root and save to localStorage
    useEffect(() => {
        // Save to localStorage
        localStorage.setItem('rv2class-theme', theme);

        // Apply CSS class to body
        document.body.classList.remove('theme-light', 'theme-dark');
        document.body.classList.add(`theme-${theme}`);

        // Apply CSS variables
        const root = document.documentElement;

        if (theme === 'light') {
            // Light theme colors
            root.style.setProperty('--rv2class-bg-primary', '#ffffff');
            root.style.setProperty('--rv2class-bg-secondary', '#f5f5f5');
            root.style.setProperty('--rv2class-bg-tertiary', '#e8e8e8');
            root.style.setProperty('--rv2class-text-primary', '#1a1a1a');
            root.style.setProperty('--rv2class-text-secondary', '#4a4a4a');
            root.style.setProperty('--rv2class-text-tertiary', '#6a6a6a');
            root.style.setProperty('--rv2class-border', '#d0d0d0');
            root.style.setProperty('--rv2class-hover', '#e0e0e0');
            root.style.setProperty('--rv2class-accent', '#0e5462');
            root.style.setProperty('--rv2class-accent-hover', '#0d4a56');
            root.style.setProperty('--rv2class-success', '#2e7d32');
            root.style.setProperty('--rv2class-error', '#c62828');
            root.style.setProperty('--rv2class-warning', '#f57c00');
            root.style.setProperty('--rv2class-card-bg', '#ffffff');
            root.style.setProperty('--rv2class-card-shadow', 'rgba(0, 0, 0, 0.1)');
        } else {
            // Dark theme colors (Jitsi-like)
            root.style.setProperty('--rv2class-bg-primary', '#111111');
            root.style.setProperty('--rv2class-bg-secondary', '#1c1c1c');
            root.style.setProperty('--rv2class-bg-tertiary', '#292929');
            root.style.setProperty('--rv2class-text-primary', '#ffffff');
            root.style.setProperty('--rv2class-text-secondary', '#a4b5b8');
            root.style.setProperty('--rv2class-text-tertiary', '#8a9294');
            root.style.setProperty('--rv2class-border', '#525a5e');
            root.style.setProperty('--rv2class-hover', '#2a2a2a');
            root.style.setProperty('--rv2class-accent', '#1c9ba4');
            root.style.setProperty('--rv2class-accent-hover', '#1a8a92');
            root.style.setProperty('--rv2class-success', '#31b76a');
            root.style.setProperty('--rv2class-error', '#e04757');
            root.style.setProperty('--rv2class-warning', '#f8ae1a');
            root.style.setProperty('--rv2class-card-bg', '#1c1c1c');
            root.style.setProperty('--rv2class-card-shadow', 'rgba(0, 0, 0, 0.5)');
        }
    }, [theme]);

    const value = {
        theme,
        setTheme: (newTheme: Theme) => {
            setTheme(newTheme);
        }
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};
