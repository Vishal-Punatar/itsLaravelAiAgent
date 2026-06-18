<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Profile - itsLaravel13Setup</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0f0f1a; 
            color: #e0e0e0;
            min-height: 100vh;
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 0.875rem 1.5rem; 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            box-shadow: 0 2px 20px rgba(0,0,0,0.4);
        }
        .header h1 { font-size: 1.2rem; font-weight: 600; }
        .header-actions { display: flex; gap: 0.5rem; }
        .header-btn {
            background: rgba(255,255,255,0.15);
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            cursor: pointer;
            text-decoration: none;
            font-size: 0.85rem;
        }
        .header-btn:hover { background: rgba(255,255,255,0.25); }
        
        .content { padding: 2rem; max-width: 800px; margin: 0 auto; }
        
        .profile-card {
            background: #1a1a2e;
            border-radius: 16px;
            padding: 2rem;
            border: 1px solid #2d2d4a;
            margin-bottom: 1.5rem;
        }
        .profile-header {
            display: flex;
            align-items: center;
            gap: 1.5rem;
            margin-bottom: 1.5rem;
            padding-bottom: 1.5rem;
            border-bottom: 1px solid #2d2d4a;
        }
        .avatar {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            color: white;
            font-weight: 600;
        }
        .profile-info h2 { color: #fff; font-size: 1.5rem; margin-bottom: 0.25rem; }
        .profile-info p { color: #888; font-size: 0.9rem; }
        .profile-info .role {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            background: rgba(102, 126, 234, 0.2);
            color: #667eea;
            border-radius: 20px;
            font-size: 0.8rem;
            margin-top: 0.5rem;
        }
        .profile-info .role.admin {
            background: rgba(231, 76, 60, 0.2);
            color: #e74c3c;
        }
        
        .stats-row {
            display: flex;
            gap: 2rem;
            margin-bottom: 1.5rem;
        }
        .stat {
            text-align: center;
        }
        .stat-value { font-size: 1.5rem; font-weight: 700; color: #667eea; }
        .stat-label { font-size: 0.8rem; color: #666; margin-top: 0.25rem; }
        
        .section-title {
            color: #fff;
            font-size: 1rem;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid #2d2d4a;
        }
        
        .form-group { margin-bottom: 1.25rem; }
        .form-group label { display: block; color: #888; font-size: 0.85rem; margin-bottom: 0.5rem; }
        .form-group input {
            width: 100%;
            padding: 0.75rem 1rem;
            background: #252542;
            border: 2px solid #3a3a5a;
            border-radius: 8px;
            font-size: 0.9rem;
            color: #fff;
            font-family: inherit;
            transition: border-color 0.2s;
        }
        .form-group input:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.9rem;
            font-weight: 500;
            transition: all 0.2s;
        }
        .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); }
        
        .alert {
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
        }
        .alert-success { background: rgba(39, 174, 96, 0.2); color: #27ae60; border: 1px solid rgba(39, 174, 96, 0.3); }
        .alert-error { background: rgba(231, 76, 60, 0.2); color: #e74c3c; border: 1px solid rgba(231, 76, 60, 0.3); }
        
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        
        @media (max-width: 600px) {
            .grid-2 { grid-template-columns: 1fr; }
            .stats-row { flex-wrap: wrap; }
        }
    </style>
</head>
<body>
    <script>
        (function() {
            var theme = '{{ $userTheme ?? "system" }}';
            if (theme === 'system') {
                theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            if (theme === 'light') {
                document.documentElement.classList.add('light');
            }
        })();
    </script>
    <div class="header">
        <h1>👤 My Profile</h1>
        <div class="header-actions">
            <a href="/chat" class="header-btn">💬 Back to Chat</a>
            @if($user->is_admin)
                <a href="/admin" class="header-btn">🔧 Admin</a>
            @endif
            <form action="/logout" method="POST" style="display:inline;">
                @csrf
                <button type="submit" class="header-btn">Logout</button>
            </form>
        </div>
    </div>
    
    <div class="content">
        @if(session('success'))
            <div class="alert alert-success">{{ session('success') }}</div>
        @endif
        @if($errors->any())
            <div class="alert alert-error">{{ $errors->first() }}</div>
        @endif
        
        <div class="profile-card">
            <div class="profile-header">
                <div class="avatar">{{ strtoupper(substr($user->name, 0, 1)) }}</div>
                <div class="profile-info">
                    <h2>{{ $user->name }}</h2>
                    <p>{{ $user->email }}</p>
                    <span class="role {{ $user->is_admin ? 'admin' : '' }}">
                        {{ $user->is_admin ? 'Administrator' : 'User' }}
                    </span>
                </div>
            </div>
            
            <div class="stats-row">
                <div class="stat">
                    <div class="stat-value">{{ $stats['total_chats'] }}</div>
                    <div class="stat-label">Total Chats</div>
                </div>
                <div class="stat">
                    <div class="stat-value">{{ $stats['total_messages'] }}</div>
                    <div class="stat-label">Total Messages</div>
                </div>
                <div class="stat">
                    <div class="stat-value">{{ $stats['member_since'] }}</div>
                    <div class="stat-label">Member Since</div>
                </div>
            </div>
        </div>
        
        <div class="grid-2">
            <div class="profile-card">
                <h3 class="section-title">Update Profile</h3>
                <form action="/profile" method="POST">
                    @csrf
                    @method('POST')
                    <div class="form-group">
                        <label>Name <span style="color:#e74c3c;">*</span></label>
                        <input type="text" name="name" value="{{ old('name', $user->name) }}" required>
                    </div>
                    <div class="form-group">
                        <label>Email <span style="color:#e74c3c;">*</span></label>
                        <input type="email" name="email" value="{{ old('email', $user->email) }}" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </form>
            </div>
            
            <div class="profile-card">
                <h3 class="section-title">Change Password</h3>
                <form action="/profile/password" method="POST">
                    @csrf
                    <div class="form-group">
                        <label>Current Password <span style="color:#e74c3c;">*</span></label>
                        <input type="password" name="current_password" required>
                    </div>
                    <div class="form-group">
                        <label>New Password <span style="color:#e74c3c;">*</span></label>
                        <input type="password" name="password" required minlength="8">
                    </div>
                    <div class="form-group">
                        <label>Confirm New Password <span style="color:#e74c3c;">*</span></label>
                        <input type="password" name="password_confirmation" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Change Password</button>
                </form>
            </div>
        </div>
    </div>
</body>
</html>