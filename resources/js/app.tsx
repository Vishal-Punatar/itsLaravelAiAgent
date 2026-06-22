import React from 'react';
import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import '../css/app.css';

const syncThemeFromStorage = () => {
    try {
        const lsTheme = localStorage.getItem('app_theme');
        if (!lsTheme) return;
        const theme = lsTheme === 'system'
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : lsTheme;
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        document.body.classList.remove('light', 'dark');
        root.classList.add(theme);
        document.body.classList.add(theme);
        root.setAttribute('data-theme', theme);
    } catch (e) {}
};

createInertiaApp({
    title: (title) => `${title || 'ThinkChat'}`,
    resolve: (name) => {
        const pages = import.meta.glob('./pages/**/*.tsx', { eager: false });
        return pages[`./pages/${name}.tsx`]();
    },
    setup({ el, App, props }) {
        syncThemeFromStorage();
        const root = createRoot(el);
        root.render(<App {...props} />);
    },
    onBefore: () => {
        syncThemeFromStorage();
    },
    progress: {
        color: '#667eea',
    },
    onCancel: () => {
        // Silently handle cancelled navigation to prevent AbortError
    },
});
