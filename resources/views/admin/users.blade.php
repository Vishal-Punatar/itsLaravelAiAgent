<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Users - Admin - itsLaravel13Setup</title>
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
            padding: 0.25rem 0.6rem;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 500;
        }
        .badge-admin { background: rgba(231, 76, 60, 0.2); color: #e74c3c; }
        .badge-user { background: rgba(102, 126, 234, 0.2); color: #667eea; }
        
        .btn {
            padding: 0.4rem 0.8rem;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.8rem;
            text-decoration: none;
            display: inline-block;
            transition: all 0.2s;
        }
        .btn-edit { background: rgba(102, 126, 234, 0.2); color: #667eea; }
        .btn-edit:hover { background: rgba(102, 126, 234, 0.3); }
        .btn-delete { background: rgba(231, 76, 60, 0.2); color: #e74c3c; }
        .btn-delete:hover { background: rgba(231, 76, 60, 0.3); }
        
        .alert {
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
        }
        .alert-success { background: rgba(39, 174, 96, 0.2); color: #27ae60; border: 1px solid rgba(39, 174, 96, 0.3); }
        .alert-error { background: rgba(231, 76, 60, 0.2); color: #e74c3c; border: 1px solid rgba(231, 76, 60, 0.3); }
        
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
        <a href="/admin/users" class="nav-btn active">👥 Users</a>
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
        
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Chats</th>
                        <th>Messages</th>
                        <th>AI Agents</th>
                        <th>Joined</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($users as $user)
                        <tr>
                            <td>{{ $user->id }}</td>
                            <td>{{ $user->name }}</td>
                            <td>{{ $user->email }}</td>
                            <td>
                                <span class="badge {{ $user->is_admin ? 'badge-admin' : 'badge-user' }}">
                                    {{ $user->is_admin ? 'Admin' : 'User' }}
                                </span>
                            </td>
                            <td>{{ $user->chats_count }}</td>
                            <td>{{ $user->messages_count }}</td>
                            <td>
                                @php $agents = $user->aiAgents; @endphp
                                @if($agents->count() > 0)
                                    @foreach($agents as $agent)
                                        <span style="color: #667eea;">{{ ucfirst($agent->provider) }}</span>{{ $agent->is_default ? ' ⭐' : '' }}<br>
                                    @endforeach
                                @else
                                    <span style="color:#666;">None</span>
                                @endif
                            </td>
                            <td>{{ $user->created_at->format('M j, Y') }}</td>
                            <td>
                                <a href="/admin/users/{{ $user->id }}/edit" class="btn btn-edit">✏️ Edit</a>
                                <form action="/admin/users/{{ $user->id }}" method="POST" style="display:inline;" onsubmit="return confirm('Delete this user and all their data?');">
                                    @csrf
                                    @method('DELETE')
                                    <button type="submit" class="btn btn-delete">🗑️ Delete</button>
                                </form>
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="9" style="text-align:center; color:#666; padding: 2rem;">No users found.</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        
        <div class="pagination">
            {{ $users->links() }}
        </div>
    </div>
</body>
</html>