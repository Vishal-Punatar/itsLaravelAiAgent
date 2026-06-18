<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Models - Admin - itsLaravel13Setup</title>
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
        
        .nav {
            background: #1a1a2e;
            padding: 1rem;
            display: flex;
            gap: 0.5rem;
            border-bottom: 1px solid #2d2d4a;
        }
        .nav-btn {
            padding: 0.6rem 1.25rem;
            background: transparent;
            color: #b0b0b0;
            border: 1px solid #3a3a5a;
            border-radius: 8px;
            cursor: pointer;
            text-decoration: none;
            font-size: 0.85rem;
        }
        .nav-btn:hover, .nav-btn.active {
            background: rgba(231, 76, 60, 0.2);
            border-color: #e74c3c;
            color: #fff;
        }
        
        .content { padding: 2rem; max-width: 1200px; margin: 0 auto; }
        
        .provider-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 1.5rem;
        }
        
        .provider-card {
            background: #1a1a2e;
            border-radius: 12px;
            border: 1px solid #2d2d4a;
            overflow: hidden;
        }
        .provider-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 1rem 1.25rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }
        .provider-header h3 { color: white; font-size: 1rem; }
        .provider-header .count {
            background: rgba(255,255,255,0.2);
            color: white;
            padding: 0.2rem 0.6rem;
            border-radius: 20px;
            font-size: 0.75rem;
        }
        
        .model-list { padding: 1rem 1.25rem; }
        .model-item {
            padding: 0.6rem 0;
            border-bottom: 1px solid #2d2d4a;
        }
        .model-item:last-child { border-bottom: none; }
        .model-name { color: #fff; font-size: 0.9rem; font-weight: 500; }
        .model-key { color: #666; font-size: 0.75rem; font-family: monospace; margin-top: 0.2rem; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔧 Admin Panel</h1>
        <div class="header-actions">
            <a href="/chat" class="header-btn">← Back to Chat</a>
            <a href="/profile" class="header-btn">👤 Profile</a>
            <form action="/logout" method="POST" style="display:inline;">
                @csrf
                <button type="submit" class="header-btn">Logout</button>
            </form>
        </div>
    </div>
    
    <div class="nav">
        <a href="/admin" class="nav-btn">📊 Dashboard</a>
        <a href="/admin/users" class="nav-btn">👥 Users</a>
        <a href="/admin/models" class="nav-btn active">🤖 AI Models</a>
        <a href="/admin/settings" class="nav-btn">⚙️ All Settings</a>
    </div>
    
    <div class="content">
        <h2 style="color: #fff; margin-bottom: 1.5rem;">Supported AI Models</h2>
        
        <div class="provider-grid">
            @foreach($models as $key => $provider)
                <div class="provider-card">
                    <div class="provider-header">
                        <h3>{{ $provider['label'] }}</h3>
                        <span class="count">{{ count($provider['models']) }}</span>
                    </div>
                    <div class="model-list">
                        @foreach($provider['models'] as $modelKey => $modelName)
                            <div class="model-item">
                                <div class="model-name">{{ $modelName }}</div>
                                <div class="model-key">{{ $modelKey }}</div>
                            </div>
                        @endforeach
                    </div>
                </div>
            @endforeach
        </div>
    </div>
</body>
</html>