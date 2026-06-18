<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - itsLaravel13Setup</title>
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
            transition: all 0.2s;
        }
        .header-btn:hover { background: rgba(255,255,255,0.25); }
        
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
            transition: all 0.2s;
        }
        .nav-btn:hover, .nav-btn.active {
            background: rgba(231, 76, 60, 0.2);
            border-color: #e74c3c;
            color: #fff;
        }
        
        .content { padding: 2rem; max-width: 1200px; margin: 0 auto; }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        .stat-card {
            background: #1a1a2e;
            border-radius: 12px;
            padding: 1.5rem;
            border: 1px solid #2d2d4a;
        }
        .stat-card h3 { color: #888; font-size: 0.85rem; margin-bottom: 0.5rem; font-weight: 500; }
        .stat-card .value { font-size: 2rem; font-weight: 700; color: #e74c3c; }
        
        .card {
            background: #1a1a2e;
            border-radius: 12px;
            padding: 1.5rem;
            border: 1px solid #2d2d4a;
            margin-bottom: 1.5rem;
        }
        .card h2 { color: #fff; margin-bottom: 1rem; font-size: 1.1rem; }
        
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
        <a href="/admin" class="nav-btn active">📊 Dashboard</a>
        <a href="/admin/users" class="nav-btn">👥 Users</a>
        <a href="/admin/models" class="nav-btn">🤖 AI Models</a>
        <a href="/admin/settings" class="nav-btn">🤖 AI Agents</a>
    </div>
    
    <div class="content">
        @if(session('success'))
            <div class="alert alert-success">{{ session('success') }}</div>
        @endif
        @if($errors->any())
            <div class="alert alert-error">{{ $errors->first() }}</div>
        @endif
        
        <div class="stats-grid">
            <div class="stat-card">
                <h3>Total Users</h3>
                <div class="value">{{ $stats['total_users'] }}</div>
            </div>
            <div class="stat-card">
                <h3>Total Chats</h3>
                <div class="value">{{ $stats['total_chats'] }}</div>
            </div>
            <div class="stat-card">
                <h3>Total Messages</h3>
                <div class="value">{{ $stats['total_messages'] }}</div>
            </div>
            <div class="stat-card">
                <h3>AI Agents</h3>
                <div class="value">{{ $stats['total_agents'] }}</div>
            </div>
        </div>
        
        <div class="card">
            <h2>Quick Actions</h2>
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                <a href="/admin/users" class="header-btn" style="background: rgba(231, 76, 60, 0.2);">Manage Users</a>
                <a href="/admin/models" class="header-btn" style="background: rgba(231, 76, 60, 0.2);">View AI Models</a>
                <a href="/admin/settings" class="header-btn" style="background: rgba(231, 76, 60, 0.2);">View All Settings</a>
            </div>
        </div>
    </div>
</body>
</html>