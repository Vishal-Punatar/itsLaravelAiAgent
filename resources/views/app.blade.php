<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="csrf-token" content="{{ csrf_token() }}" />
        <title>{{ $title ?? 'ThinkChat' }}</title>
        <script>
            // Apply theme BEFORE React mounts to prevent flash of wrong theme.
            // Source of truth = localStorage (user's active choice) for all navigations.
            (function() {
                try {
                    var lsTheme = localStorage.getItem('app_theme');
                    var theme = lsTheme || @json(auth()->user()->theme ?? null) || 'system';
                    var root = document.documentElement;
                    var resolved = theme;
                    if (theme === 'system') {
                        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                    }
                    root.classList.remove('light', 'dark');
                    document.body.classList.remove('light', 'dark');
                    if (resolved === 'light') {
                        root.classList.add('light');
                        document.body.classList.add('light');
                    } else if (resolved === 'dark') {
                        root.classList.add('dark');
                        document.body.classList.add('dark');
                    }
                    root.setAttribute('data-theme', resolved);
                    // Persist resolved value so inertia:start never sees 'system'
                    try { localStorage.setItem('app_theme', resolved); } catch (e) {}
                } catch (e) {}
            })();
        </script>
        @viteReactRefresh
        @vite(['resources/js/app.tsx', 'resources/css/app.css'])
        <script>
            // Re-apply theme on every Inertia client-side navigation.
            // ChatLayout saves the resolved (never 'system') value to localStorage,
            // so we just read it directly — no recalculation needed.
            document.addEventListener('inertia:start', function() {
                try {
                    var lsTheme = localStorage.getItem('app_theme');
                    var theme = lsTheme || @json(auth()->user()->theme ?? null) || 'dark';
                    var root = document.documentElement;
                    root.classList.remove('light', 'dark');
                    document.body.classList.remove('light', 'dark');
                    if (theme === 'light') {
                        root.classList.add('light');
                        document.body.classList.add('light');
                        root.setAttribute('data-theme', 'light');
                    } else {
                        root.classList.add('dark');
                        document.body.classList.add('dark');
                        root.setAttribute('data-theme', 'dark');
                    }
                } catch (e) {}
            });
        </script>
    </head>
    <body>
        @inertia
    </body>
</html>
