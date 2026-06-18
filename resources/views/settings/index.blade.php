<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Settings - itsLaravel13Setup</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0f0f1a; 
            min-height: 100vh; 
            color: #e0e0e0;
        }
        
        .container { max-width: 600px; margin: 0 auto; padding: 2rem; }
        
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 1rem 1.5rem; 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            box-shadow: 0 2px 20px rgba(0,0,0,0.4);
        }
        .header h1 { font-size: 1.1rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; }
        .header-actions { display: flex; gap: 0.5rem; }
        .header-btn {
            background: rgba(255,255,255,0.15);
            color: white;
            border: none;
            padding: 0.4rem 0.875rem;
            border-radius: 20px;
            cursor: pointer;
            font-size: 0.8rem;
            text-decoration: none;
            transition: all 0.2s;
        }
        .header-btn:hover { background: rgba(255,255,255,0.25); }
        
        .card {
            background: #1a1a2e;
            border-radius: 16px;
            padding: 2rem;
            margin-top: 1.5rem;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        
        .card h2 {
            color: #fff;
            font-size: 1.25rem;
            margin-bottom: 0.5rem;
        }
        
        .card > p {
            color: #888;
            font-size: 0.85rem;
            margin-bottom: 2rem;
            line-height: 1.5;
        }
        
        .form-group {
            margin-bottom: 1.5rem;
        }
        
        .form-group label {
            display: block;
            color: #e0e0e0;
            font-size: 0.85rem;
            font-weight: 500;
            margin-bottom: 0.5rem;
        }
        
        .form-group input {
            width: 100%;
            padding: 0.875rem 1rem;
            background: #252542;
            border: 2px solid #3a3a5a;
            border-radius: 10px;
            font-size: 0.9rem;
            font-family: inherit;
            color: #fff;
            transition: border-color 0.2s;
        }
        
        .form-group input:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .form-group input::placeholder {
            color: #666;
        }
        
        .save-btn {
            width: 100%;
            padding: 1rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 600;
            font-size: 0.9rem;
            transition: all 0.2s;
        }
        
        .save-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        
        .alert {
            padding: 1rem;
            border-radius: 10px;
            margin-bottom: 1.5rem;
            font-size: 0.85rem;
        }
        
        .alert-success {
            background: rgba(39, 174, 96, 0.2);
            color: #27ae60;
            border: 1px solid rgba(39, 174, 96, 0.3);
        }
        
        .alert-error {
            background: rgba(231, 76, 60, 0.2);
            color: #e74c3c;
            border: 1px solid rgba(231, 76, 60, 0.3);
        }
        
        .ai-link {
            background: #252542;
            border-radius: 12px;
            padding: 1.5rem;
            margin-top: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            text-decoration: none;
            transition: all 0.2s;
        }
        
        .ai-link:hover {
            background: #2d2d4a;
        }
        
        .ai-link-left {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        
        .ai-link-icon {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
        }
        
        .ai-link-text h3 {
            color: #fff;
            font-size: 1rem;
            margin-bottom: 0.25rem;
        }
        
        .ai-link-text p {
            color: #888;
            font-size: 0.8rem;
        }
        
        .ai-link-arrow {
            color: #667eea;
            font-size: 1.25rem;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1><span>⚙️</span> Settings</h1>
        <div class="header-actions">
            <a href="/chat" class="header-btn">💬 Chat</a>
            <a href="/ai-agents" class="header-btn">🤖 AI Agents</a>
            <form action="/logout" method="POST">
                @csrf
                <button type="submit" class="header-btn">Logout</button>
            </form>
        </div>
    </div>
    
    <div class="container">
        <div class="card">
            <h2>👤 Profile Settings</h2>
            <p>Update your account information below.</p>
            
            @if(session('success'))
                <div class="alert alert-success">{{ session('success') }}</div>
            @endif
            
            @if($errors->any())
                <div class="alert alert-error">
                    {{ $errors->first() }}
                </div>
            @endif
            
            <form action="/settings" method="POST">
                @csrf
                @method('PUT')
                
                <div class="form-group">
                    <label for="name">Name <span style="color:#e74c3c;">*</span></label>
                    <input type="text" id="name" name="name" value="{{ old('name', $user->name) }}" required>
                </div>
                
                <div class="form-group">
                    <label for="email">Email <span style="color:#e74c3c;">*</span></label>
                    <input type="email" id="email" name="email" value="{{ old('email', $user->email) }}" required>
                </div>
                
                <button type="submit" class="save-btn">Save Profile</button>
            </form>
        </div>
        
        <a href="/ai-agents" class="ai-link">
            <div class="ai-link-left">
                <div class="ai-link-icon">🤖</div>
                <div class="ai-link-text">
                    <h3>AI Agents</h3>
                    <p>Manage your AI providers and API keys</p>
                </div>
            </div>
            <span class="ai-link-arrow">→</span>
        </a>
    </div>
</body>
</html>
