<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Agents - Admin - itsLaravel13Setup</title>
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
        
        .table-container { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 1rem; text-align: left; border-bottom: 1px solid #2d2d4a; }
        th { color: #888; font-weight: 500; font-size: 0.85rem; }
        td { color: #e0e0e0; font-size: 0.9rem; }
        tr:hover { background: rgba(255,255,255,0.02); }
        
        .badge {
            display: inline-block;
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            font-size: 0.7rem;
            font-weight: 600;
        }
        .badge-default {
            background: rgba(39, 174, 96, 0.2);
            color: #27ae60;
        }
        
        .pagination { margin-top: 1.5rem; display: flex; gap: 0.5rem; justify-content: center; }
        .pagination a {
            padding: 0.5rem 1rem;
            background: #1a1a2e;
            color: #888;
            border-radius: 6px;
            text-decoration: none;
            font-size: 0.85rem;
        }
        .pagination a:hover { background: #252542; color: #fff; }
        
        .alert {
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
        }
        .alert-success { background: rgba(39, 174, 96, 0.2); color: #27ae60; border: 1px solid rgba(39, 174, 96, 0.3); }
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
        <a href="/admin/settings" class="nav-btn active">🤖 AI Agents</a>
    </div>
    
    <div class="content">
        @if(session('success'))
            <div class="alert alert-success">{{ session('success') }}</div>
        @endif
        
        <h2 style="color: #fff; margin-bottom: 1.5rem;">All AI Agents</h2>
        
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>User</th>
                        <th>Name</th>
                        <th>Provider</th>
                        <th>Model</th>
                        <th>Default</th>
                        <th>Created</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($agents as $agent)
                        <tr>
                            <td>{{ $agent->id }}</td>
                            <td>
                                @if($agent->user)
                                    {{ $agent->user->name }}
                                    <br><small style="color:#666;">{{ $agent->user->email }}</small>
                                @else
                                    <span style="color:#e74c3c;">User deleted</span>
                                @endif
                            </td>
                            <td><strong>{{ $agent->name }}</strong></td>
                            <td><span style="color: #667eea;">{{ ucfirst($agent->provider) }}</span></td>
                            <td>{{ $agent->model ?: '-' }}</td>
                            <td>
                                @if($agent->is_default)
                                    <span class="badge badge-default">Default</span>
                                @else
                                    -
                                @endif
                            </td>
                            <td>{{ $agent->created_at->format('M j, Y') }}</td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="7" style="text-align:center; color:#666; padding: 2rem;">No AI agents found.</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        
        <div class="pagination">
            {{ $agents->links() }}
        </div>
    </div>
</body>
</html>