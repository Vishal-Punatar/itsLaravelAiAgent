<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Agents - itsLaravel13Setup</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0f0f1a;
            min-height: 100vh;
            color: #e0e0e0;
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
        
        .container { max-width: 800px; margin: 0 auto; padding: 2rem; }
        
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .page-header h1 { font-size: 1.5rem; font-weight: 600; }
        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 0.6rem 1.25rem;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.9rem;
            text-decoration: none;
            transition: all 0.2s;
        }
        .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); }
        .success { background: rgba(39, 174, 96, 0.2); color: #27ae60; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border: 1px solid rgba(39, 174, 96, 0.3); }
        .empty { background: #1a1a2e; padding: 3rem; border-radius: 12px; text-align: center; }
        .empty p { color: #888; margin-bottom: 1rem; }
        .agent-card {
            background: #1e1e32;
            border: 1px solid #2d2d4a;
            border-radius: 12px;
            padding: 1.25rem;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .agent-info { display: flex; align-items: center; gap: 1rem; }
        .agent-icon {
            width: 48px;
            height: 48px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .agent-icon svg {
            width: 24px;
            height: 24px;
        }
        .agent-name { font-weight: 600; color: #fff; display: flex; align-items: center; gap: 0.5rem; }
        .agent-provider { font-size: 0.85rem; color: #888; }
        .badge {
            background: rgba(39, 174, 96, 0.2);
            color: #27ae60;
            font-size: 0.7rem;
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
        }
        .agent-actions { display: flex; gap: 1rem; align-items: center; }
        .agent-actions a, .agent-actions button { color: #888; font-size: 0.85rem; text-decoration: none; cursor: pointer; transition: color 0.2s; background: none; border: none; padding: 0; font-family: inherit; }
        .agent-actions a:hover, .agent-actions button:hover { color: #667eea; }
        .agent-actions form { display: inline; }
        .agent-actions button.delete { color: #e74c3c; }
        .agent-actions button.delete:hover { color: #c0392b; }
        .back-link { color: #667eea; text-decoration: none; margin-bottom: 1rem; display: inline-block; }
        .back-link:hover { text-decoration: underline; }
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
        <h1><span>🤖</span> AI Agents</h1>
        <div class="header-actions">
            <a href="/chat" class="header-btn">💬 Chat</a>
            <a href="/profile" class="header-btn">👤 Profile</a>
            <form action="/logout" method="POST">
                @csrf
                <button type="submit" class="header-btn">Logout</button>
            </form>
        </div>
    </div>
    
    <div class="container">
        <div class="page-header">
            <h1>Manage AI Agents</h1>
            <a href="{{ route('ai-agents.create') }}" class="btn">+ Add New Agent</a>
        </div>

        @if(session('success'))
            <div class="success">{{ session('success') }}</div>
        @endif

        @if($agents->isEmpty())
            <div class="empty">
                <p>You haven't added any AI agents yet.</p>
                <a href="{{ route('ai-agents.create') }}" class="btn">Add your first AI agent →</a>
            </div>
        @else
            @foreach($agents as $agent)
                <div class="agent-card" id="agent-card-{{ $agent->id }}">
                    <div class="agent-info">
                        <div class="agent-icon" style="background: {{ App\Models\AiAgent::getProviderColor($agent->provider) }};">
                            {!! App\Models\AiAgent::getProviderIcon($agent->provider) !!}
                        </div>
                        <div>
                            <div class="agent-name">
                                {{ $agent->name }}
                                @if($agent->is_default)
                                    <span class="badge">Default</span>
                                @endif
                            </div>
                            <div class="agent-provider">
                                {{ ucfirst($agent->provider) }}
                                @if($agent->model)
                                    • {{ $agent->model }}
                                @endif
                            </div>
                        </div>
                    </div>
                    <div class="agent-actions">
                        @if(!$agent->is_default)
                            <form action="{{ route('ai-agents.setDefault', $agent) }}" method="POST" class="set-default-form" data-agent-id="{{ $agent->id }}">
                                @csrf
                                <button type="submit" class="set-default-btn">Set as Default</button>
                            </form>
                        @else
                            <button type="button" class="set-default-btn" disabled style="color: #555; cursor: not-allowed;">Default</button>
                        @endif
                        <a href="{{ route('ai-agents.edit', $agent) }}">Edit</a>
                        <form action="{{ route('ai-agents.destroy', $agent) }}" method="POST" onsubmit="return confirm('Delete this agent?')">
                            @csrf
                            @method('DELETE')
                            <button type="submit" class="delete">Delete</button>
                        </form>
                    </div>
                </div>
            @endforeach
        @endif
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Handle Set as Default form via AJAX
            document.querySelectorAll('.set-default-form').forEach(function(form) {
                form.addEventListener('submit', function(e) {
                    e.preventDefault();
                    
                    const formEl = this;
                    const agentId = formEl.dataset.agentId;
                    const action = formEl.action;
                    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || formEl.querySelector('input[name="_token"]')?.value;
                    
                    fetch(action, {
                        method: 'POST',
                        headers: {
                            'X-CSRF-TOKEN': csrfToken,
                            'Accept': 'application/json',
                        }
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            // First, find the card that was previously default (has badge or disabled Default button)
                            let previousDefaultCard = null;
                            document.querySelectorAll('.agent-card').forEach(function(card) {
                                const badge = card.querySelector('.agent-name .badge');
                                const disabledBtn = card.querySelector('.set-default-btn[disabled]');
                                if (badge || disabledBtn) {
                                    previousDefaultCard = card;
                                }
                            });
                            
                            // Now update all cards - remove badges and reset buttons
                            document.querySelectorAll('.agent-card').forEach(function(card) {
                                const nameEl = card.querySelector('.agent-name');
                                const badge = nameEl.querySelector('.badge');
                                if (badge) badge.remove();
                                
                                const setDefaultBtn = card.querySelector('.set-default-btn');
                                if (setDefaultBtn) {
                                    setDefaultBtn.disabled = false;
                                    setDefaultBtn.style.display = '';
                                    setDefaultBtn.style.color = '';
                                    setDefaultBtn.style.cursor = '';
                                    setDefaultBtn.textContent = 'Set as Default';
                                }
                            });
                            
                            // Add default badge to current agent and hide its button
                            const currentCard = document.getElementById('agent-card-' + agentId);
                            if (currentCard) {
                                const nameEl = currentCard.querySelector('.agent-name');
                                const badge = document.createElement('span');
                                badge.className = 'badge';
                                badge.textContent = 'Default';
                                nameEl.appendChild(badge);
                                
                                const setDefaultBtn = currentCard.querySelector('.set-default-btn');
                                if (setDefaultBtn) {
                                    setDefaultBtn.style.display = 'none';
                                }
                            }
                            
                            // Show success message
                            let successMsg = document.querySelector('.success');
                            if (!successMsg) {
                                successMsg = document.createElement('div');
                                successMsg.className = 'success';
                                document.querySelector('.page-header').after(successMsg);
                            }
                            successMsg.textContent = 'Default agent updated successfully!';
                            successMsg.style.display = 'block';
                            
                            // Hide after 3 seconds
                            setTimeout(() => {
                                successMsg.style.display = 'none';
                            }, 3000);
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                    });
                });
            });
        });
    </script>
</body>
</html>
