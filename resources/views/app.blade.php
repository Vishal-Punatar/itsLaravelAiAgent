<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="csrf-token" content="{{ csrf_token() }}" />
        <title>{{ $title ?? 'ThinkChat' }}</title>
        <script>
            // Apply theme BEFORE React mounts to prevent flash of wrong theme.
            // Source of truth = DB (auth()->user()->theme) for logged-in users.
            // localStorage is only a fallback for guests or pre-login flashes.
            (function() {
                try {
                    var dbTheme = @json(auth()->user()->theme ?? null);
                    var lsTheme = null;
                    try { lsTheme = localStorage.getItem('app_theme'); } catch (e) {}
                    var theme = dbTheme || lsTheme || 'system';
                    var root = document.documentElement;
                    var resolved = theme;
                    if (theme === 'system') {
                        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                    }
                    // Always reset both classes first to avoid stale state
                    root.classList.remove('light', 'dark');
                    if (resolved === 'light') {
                        root.classList.add('light');
                    } else if (resolved === 'dark') {
                        root.classList.add('dark');
                    }
                    root.setAttribute('data-theme', theme);
                } catch (e) {
                    // localStorage might not be available
                }
            })();
        </script>
        @viteReactRefresh
        @vite(['resources/js/app.tsx', 'resources/css/app.css'])
    </head>
    <body>
        @inertia
    </body>
</html>
