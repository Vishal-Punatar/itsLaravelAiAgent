<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit AI Agent - itsLaravel13Setup</title>
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
        
        .container { max-width: 500px; margin: 0 auto; padding: 2rem; }
        .back-link { color: #667eea; text-decoration: none; margin-bottom: 1.5rem; display: inline-block; }
        .back-link:hover { text-decoration: underline; }
        .card {
            background: #1e1e32;
            border: 1px solid #2d2d4a;
            border-radius: 12px;
            padding: 1.5rem;
        }
        h1 { font-size: 1.5rem; font-weight: 600; margin-bottom: 1.5rem; }
        .form-group { margin-bottom: 1.25rem; }
        label { display: block; font-size: 0.9rem; color: #ccc; margin-bottom: 0.5rem; }
        input, select {
            width: 100%;
            padding: 0.75rem 1rem;
            background: #252542;
            border: 2px solid #3a3a5a;
            border-radius: 8px;
            font-size: 0.9rem;
            color: #fff;
            font-family: inherit;
        }
        input:focus, select:focus { outline: none; border-color: #667eea; }
        input::placeholder { color: #666; }
        .checkbox-group { display: flex; align-items: center; gap: 0.5rem; }
        .checkbox-group input { width: auto; }
        .error { color: #e74c3c; font-size: 0.8rem; margin-top: 0.25rem; }
        .hint { color: #666; font-size: 0.8rem; margin-top: 0.25rem; }
        .btn-group { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem; }
        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 0.6rem 1.25rem;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.9rem;
            transition: all 0.2s;
        }
        .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); }
        .btn-outline { background: transparent; border: 1px solid #3a3a5a; color: #888; }
        .btn-outline:hover { background: #252542; color: #fff; }
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
        <a href="{{ route('ai-agents.index') }}" class="back-link">← Back to AI Agents</a>
        
        <div class="card">
            <h1>✏️ Edit AI Agent</h1>

            <form action="{{ route('ai-agents.update', $aiAgent) }}" method="POST">
                @csrf
                @method('PUT')

                <div class="form-group">
                    <label for="name">Agent Name <span style="color:#e74c3c;">*</span></label>
                    <input type="text" id="name" name="name" value="{{ old('name', $aiAgent->name) }}" required>
                    @error('name')
                        <p class="error">{{ $message }}</p>
                    @enderror
                </div>

                <div class="form-group">
                    <label for="provider">Provider <span style="color:#e74c3c;">*</span></label>
                    <select id="provider" name="provider" required>
                        <option value="openai" {{ $aiAgent->provider == 'openai' ? 'selected' : '' }}>OpenAI (GPT)</option>
                        <option value="anthropic" {{ $aiAgent->provider == 'anthropic' ? 'selected' : '' }}>Anthropic (Claude)</option>
                        <option value="azure" {{ $aiAgent->provider == 'azure' ? 'selected' : '' }}>Azure OpenAI</option>
                        <option value="bedrock" {{ $aiAgent->provider == 'bedrock' ? 'selected' : '' }}>AWS Bedrock</option>
                        <option value="groq" {{ $aiAgent->provider == 'groq' ? 'selected' : '' }}>GroqCloud</option>
                        <option value="xai" {{ $aiAgent->provider == 'xai' ? 'selected' : '' }}>xAI (Grok)</option>
                        <option value="deepseek" {{ $aiAgent->provider == 'deepseek' ? 'selected' : '' }}>DeepSeek</option>
                        <option value="mistral" {{ $aiAgent->provider == 'mistral' ? 'selected' : '' }}>Mistral AI</option>
                        <option value="ollama" {{ $aiAgent->provider == 'ollama' ? 'selected' : '' }}>Ollama (Local)</option>
                        <option value="openrouter" {{ $aiAgent->provider == 'openrouter' ? 'selected' : '' }}>OpenRouter</option>
                    </select>
                    @error('provider')
                        <p class="error">{{ $message }}</p>
                    @enderror
                </div>

                <div class="form-group">
                    <label for="api_key">API Key</label>
                    <input type="password" id="api_key" name="api_key" placeholder="Leave blank to keep current key">
                    <p class="hint">Only fill if you want to change the API key</p>
                    @error('api_key')
                        <p class="error">{{ $message }}</p>
                    @enderror
                </div>

                <div class="form-group">
                    <label for="model">Model (Optional)</label>
                    <input type="text" id="model" name="model" value="{{ old('model', $aiAgent->model) }}"
                        placeholder="e.g., gpt-4, gemini-pro, sonar">
                    @error('model')
                        <p class="error">{{ $message }}</p>
                    @enderror
                </div>

                <div class="form-group">
                    <label class="checkbox-group">
                        <input type="checkbox" name="is_default" value="1" {{ $aiAgent->is_default ? 'checked' : '' }}>
                        <span>Set as default agent</span>
                    </label>
                </div>

                <div class="btn-group">
                    <a href="{{ route('ai-agents.index') }}" class="btn btn-outline">Cancel</a>
                    <button type="submit" class="btn">Update Agent</button>
                </div>
            </form>
        </div>
    </div>
</body>
</html>
