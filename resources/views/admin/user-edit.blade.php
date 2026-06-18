<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit User - Admin - itsLaravel13Setup</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0f0f1a; 
            color: #e0e0e0;
            min-height: 100vh;
        }
        .header { 
            background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); 
            color: white; 
            padding: 1rem 1.5rem; 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
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
        
        .content { padding: 2rem; max-width: 600px; margin: 0 auto; }
        
        .card {
            background: #1a1a2e;
            border-radius: 12px;
            padding: 2rem;
            border: 1px solid #2d2d4a;
        }
        .card h2 { color: #fff; margin-bottom: 1.5rem; font-size: 1.1rem; }
        
        .form-group { margin-bottom: 1.25rem; }
        .form-group label { display: block; color: #888; font-size: 0.85rem; margin-bottom: 0.5rem; }
        .form-group input, .form-group select {
            width: 100%;
            padding: 0.75rem 1rem;
            background: #252542;
            border: 2px solid #3a3a5a;
            border-radius: 8px;
            font-size: 0.9rem;
            color: #fff;
            font-family: inherit;
        }
        .form-group input:focus, .form-group select:focus {
            outline: none;
            border-color: #667eea;
        }
        .form-group input[type="checkbox"] { width: auto; margin-right: 0.5rem; }
        .checkbox-label { display: flex; align-items: center; }
        
        .btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.9rem;
            font-weight: 500;
            text-decoration: none;
            display: inline-block;
            transition: all 0.2s;
        }
        .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); }
        .btn-secondary { background: #3a3a5a; color: #fff; }
        .btn-secondary:hover { background: #4a4a6a; }
        
        .alert {
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
        }
        .alert-success { background: rgba(39, 174, 96, 0.2); color: #27ae60; border: 1px solid rgba(39, 174, 96, 0.3); }
        .alert-error { background: rgba(231, 76, 60, 0.2); color: #e74c3c; border: 1px solid rgba(231, 76, 60, 0.3); }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔧 Edit User</h1>
        <div class="header-actions">
            <a href="/admin/users" class="header-btn">← Back to Users</a>
        </div>
    </div>
    
    <div class="content">
        @if(session('success'))
            <div class="alert alert-success">{{ session('success') }}</div>
        @endif
        
        <div class="card">
            <h2>User Details: {{ $user->name }}</h2>
            
            <form action="/admin/users/{{ $user->id }}" method="POST">
                @csrf
                @method('PUT')
                
                <div class="form-group">
                    <label>Name <span style="color:#e74c3c;">*</span></label>
                    <input type="text" name="name" value="{{ old('name', $user->name) }}" required>
                </div>
                
                <div class="form-group">
                    <label>Email <span style="color:#e74c3c;">*</span></label>
                    <input type="email" name="email" value="{{ old('email', $user->email) }}" required>
                </div>

                <div class="form-group">
                    <label>New Password <small style="color:#666; font-weight:normal;">(leave blank to keep current)</small></label>
                    <input type="password" name="password" value="" autocomplete="new-password">
                    @error('password') <small style="color:#e74c3c;">{{ $message }}</small> @enderror
                    <small style="color:#666; display:block; margin-top:0.25rem;">Minimum 8 characters. The user will be able to log in with the new password immediately.</small>
                </div>

                <div class="form-group">
                    <label>Confirm New Password</label>
                    <input type="password" name="password_confirmation" value="" autocomplete="new-password">
                    @error('password_confirmation') <small style="color:#e74c3c;">{{ $message }}</small> @enderror
                </div>
                
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" name="is_admin" value="1" {{ old('is_admin', $user->is_admin) ? 'checked' : '' }}>
                        <span>Administrator</span>
                    </label>
                    <small style="color:#666; margin-top:0.25rem; display:block;">Administrators can access the admin panel.</small>
                </div>
                
                <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                    <a href="/admin/users" class="btn btn-secondary">Cancel</a>
                </div>
            </form>
        </div>
    </div>
</body>
</html>