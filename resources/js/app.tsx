import React from 'react';
import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import '../css/app.css';

createInertiaApp({
    title: (title) => `${title || 'ThinkChat'}`,
    resolve: (name) => {
        const pages = import.meta.glob('./pages/**/*.tsx', { eager: false });
        return pages[`./pages/${name}.tsx`]();
    },
    setup({ el, App, props }) {
        const root = createRoot(el);
        root.render(<App {...props} />);
    },
    progress: {
        color: '#667eea',
    },
});