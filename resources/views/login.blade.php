<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <link rel="icon" type="image/png" href="/favicon.png">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Login - ThinkChat</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a1a;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            position: relative;
            overflow: hidden;
        }

        body::before {
            content: '';
            position: absolute;
            width: 600px;
            height: 600px;
            background: radial-gradient(circle, rgba(102, 126, 234, 0.3) 0%, transparent 70%);
            top: -200px;
            left: -200px;
            animation: pulse 8s ease-in-out infinite;
        }
        body::after {
            content: '';
            position: absolute;
            width: 500px;
            height: 500px;
            background: radial-gradient(circle, rgba(118, 75, 162, 0.25) 0%, transparent 70%);
            bottom: -150px;
            right: -150px;
            animation: pulse 8s ease-in-out infinite reverse;
        }

        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.15); opacity: 0.8; }
        }

        .bg-grid {
            position: absolute;
            inset: 0;
            background-image:
                linear-gradient(rgba(102, 126, 234, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(102, 126, 234, 0.03) 1px, transparent 1px);
            background-size: 50px 50px;
            pointer-events: none;
        }

        .container {
            background: linear-gradient(145deg, rgba(30, 30, 60, 0.9) 0%, rgba(20, 20, 45, 0.95) 100%);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(102, 126, 234, 0.2);
            border-radius: 28px;
            padding: 2.5rem 2rem;
            width: 100%;
            max-width: 420px;
            position: relative;
            z-index: 1;
            box-shadow:
                0 25px 60px rgba(0, 0, 0, 0.5),
                0 0 0 1px rgba(255, 255, 255, 0.05) inset,
                0 80px 80px rgba(102, 126, 234, 0.1);
        }

        .logo-wrapper {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            gap: 0.75rem;
            margin-bottom: 1.5rem;
        }

        .logo-img {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            object-fit: cover;
            box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
            flex-shrink: 0;
        }

        .logo-text {
            display: flex;
            flex-direction: column;
        }

        .logo-title {
            font-size: 1.4rem;
            font-weight: 800;
            background: linear-gradient(135deg, #667eea 0%, #a855f7 50%, #ec4899 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            line-height: 1.2;
        }

        .logo-subtitle {
            font-size: 0.75rem;
            color: rgba(255, 255, 255, 0.5);
            font-weight: 400;
            margin-top: 0.1rem;
        }

        .form-group {
            margin-bottom: 1.25rem;
        }

        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            color: rgba(255, 255, 255, 0.7);
            font-weight: 500;
            font-size: 0.85rem;
        }

        .input-wrapper {
            position: relative;
        }

        .input-wrapper input {
            width: 100%;
            padding: 0.9rem 1rem 0.9rem 2.75rem;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            font-size: 0.95rem;
            font-family: inherit;
            color: white;
            transition: all 0.3s ease;
        }

        .input-wrapper input::placeholder {
            color: rgba(255, 255, 255, 0.3);
        }

        .input-wrapper input:focus {
            outline: none;
            border-color: rgba(102, 126, 234, 0.6);
            background: rgba(102, 126, 234, 0.08);
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
        }

        .input-icon {
            position: absolute;
            left: 0.9rem;
            top: 50%;
            transform: translateY(-50%);
            color: rgba(255, 255, 255, 0.3);
            pointer-events: none;
        }

        .btn {
            width: 100%;
            padding: 1rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 0.95rem;
            font-weight: 600;
            font-family: inherit;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 20px rgba(102, 126, 234, 0.35);
            margin-top: 0.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 30px rgba(102, 126, 234, 0.5);
        }

        .btn:active { transform: translateY(0); }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .error {
            background: rgba(239, 68, 68, 0.1);
            color: #fca5a5;
            padding: 0.875rem 1rem;
            border-radius: 12px;
            margin-bottom: 1.25rem;
            font-size: 0.85rem;
            border: 1px solid rgba(239, 68, 68, 0.2);
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .error svg { flex-shrink: 0; color: #f87171; }

        .success {
            background: rgba(34, 197, 94, 0.1);
            color: #86efac;
            padding: 0.875rem 1rem;
            border-radius: 12px;
            margin-bottom: 1.25rem;
            font-size: 0.85rem;
            border: 1px solid rgba(34, 197, 94, 0.2);
        }

        .register-link {
            text-align: center;
            margin-top: 1.5rem;
            color: rgba(255, 255, 255, 0.5);
            font-size: 0.85rem;
        }

        .register-link a {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
            transition: color 0.2s;
        }

        .register-link a:hover { color: #818cf8; }

        .footer-note {
            text-align: center;
            margin-top: 2rem;
            font-size: 0.7rem;
            color: rgba(255, 255, 255, 0.25);
        }

        .loading {
            display: none;
            text-align: center;
            margin-top: 0.75rem;
            color: #667eea;
            font-size: 0.8rem;
        }

        .btn-arrow {
            transition: transform 0.2s;
        }
        .btn:hover .btn-arrow {
            transform: translateX(3px);
        }
    </style>
</head>
<body>
    <div class="bg-grid"></div>
    <div class="container">
        <div class="logo-wrapper">
            <img src="/build/assets/logo-brand.png" alt="ThinkChat" class="logo-img">
            <div class="logo-text">
                <div class="logo-title">ThinkChat</div>
                <div class="logo-subtitle">Where ideas meet instant answers</div>
            </div>
        </div>

        @if ($errors->any())
            <div class="error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {{ $errors->first() }}
            </div>
        @endif
        @if (session('success'))
            <div class="success">{{ session('success') }}</div>
        @endif

        <form id="loginForm" method="POST" action="/login">
            @csrf
            <div class="form-group">
                <label for="email">Email Address</label>
                <div class="input-wrapper">
                    <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    <input type="email" id="email" name="email" required autocomplete="email" value="{{ old('email') }}" placeholder="you@example.com">
                </div>
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <div class="input-wrapper">
                    <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    <input type="password" id="password" name="password" required autocomplete="current-password" placeholder="••••••••">
                </div>
            </div>
            <button type="submit" class="btn" id="submitBtn">
                Sign In
                <svg class="btn-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
            <div class="loading" id="loading">Signing in...</div>
        </form>

        <div class="register-link">
            Don't have an account? <a href="/register">Create one</a>
        </div>

        <div class="footer-note">ThinkChat — Powered by AI</div>
    </div>

    <script>
        document.getElementById('loginForm').addEventListener('submit', function() {
            document.getElementById('submitBtn').disabled = true;
            document.getElementById('submitBtn').innerHTML = 'Signing in... <svg class="btn-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';
            document.getElementById('loading').style.display = 'block';
        });
    </script>
</body>
</html>
