<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <meta name="csrf-token" content="{{ csrf_token() }}" />
        <title>{{ $title ?? 'ThinkChat' }}</title>
        <script>
            // Apply theme BEFORE React mounts to prevent flash of wrong theme.
            // Preserves 'system' as 'system' so OS pref is re-checked on every load.
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
                    // Keep 'system' as 'system' in storage so OS pref stays live.
                    // Only persist a resolved value for explicit 'light'/'dark' picks.
                    try {
                        if (lsTheme === null) {
                            // First visit: persist whatever the user's DB choice resolved to
                            // (so the choice is sticky for explicit picks, live for 'system').
                            localStorage.setItem('app_theme', theme);
                        }
                        // else: user already has a stored choice — don't clobber it
                    } catch (e) {}
                } catch (e) {}
            })();
        </script>
        @viteReactRefresh
        @vite(['resources/js/app.tsx', 'resources/css/app.css'])
        <script>
            // Re-apply theme on every Inertia client-side navigation.
            // Handles 'system' by re-evaluating the OS preference live.
            document.addEventListener('inertia:start', function() {
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
                        root.setAttribute('data-theme', 'light');
                    } else {
                        root.classList.add('dark');
                        document.body.classList.add('dark');
                        root.setAttribute('data-theme', resolved);
                    }
                } catch (e) {}
            });
        </script>
    </head>
    <body>
        @inertia
    </body>
</html>
