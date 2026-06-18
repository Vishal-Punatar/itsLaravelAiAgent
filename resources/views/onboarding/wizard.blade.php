<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome - Setup Your AI Chat</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%);
            min-height: 100vh;
            color: #e0e0e0;
        }
        
        .container {
            max-width: 700px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        .header-with-nav {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2.5rem;
            flex-wrap: wrap;
            gap: 1rem;
        }
        .header {
            text-align: left;
            margin-bottom: 0;
        }
        .header-nav {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
        }
        .header-nav-btn {
            background: rgba(255,255,255,0.1);
            color: white;
            border: none;
            padding: 0.4rem 0.875rem;
            border-radius: 20px;
            cursor: pointer;
            font-size: 0.8rem;
            text-decoration: none;
            transition: all 0.2s;
        }
        .header-nav-btn:hover {
            background: rgba(255,255,255,0.2);
        }
        .header-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
        }
        .header h1 {
            color: #fff;
            font-size: 2rem;
            margin-bottom: 0.5rem;
        }
        .header p {
            color: #888;
            font-size: 1rem;
        }
        
        .steps-indicator {
            display: flex;
            justify-content: center;
            gap: 0.5rem;
            margin-bottom: 2rem;
        }
        .step-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #3a3a5a;
            transition: all 0.3s;
        }
        .step-dot.active { background: #667eea; transform: scale(1.2); }
        .step-dot.completed { background: #27ae60; }
        
        .card {
            background: #1a1a2e;
            border-radius: 20px;
            padding: 2.5rem;
            border: 1px solid #2d2d4a;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }
        
        .step-title {
            color: #fff;
            font-size: 1.3rem;
            margin-bottom: 0.5rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }
        .step-number {
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.9rem;
            font-weight: 600;
        }
        .step-desc {
            color: #888;
            font-size: 0.9rem;
            margin-bottom: 1.5rem;
            line-height: 1.5;
        }
        
        .form-group {
            margin-bottom: 1.5rem;
        }
        .form-group label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: #fff;
            font-size: 0.9rem;
            font-weight: 500;
            margin-bottom: 0.5rem;
        }
        .tooltip {
            position: relative;
            display: inline-flex;
            align-items: center;
            cursor: help;
            color: #667eea;
            font-size: 0.85rem;
        }
        .tooltip-text {
            visibility: hidden;
            opacity: 0;
            position: absolute;
            bottom: 120%;
            left: 50%;
            transform: translateX(-50%);
            background: #252542;
            color: #fff;
            padding: 0.75rem 1rem;
            border-radius: 8px;
            font-size: 0.8rem;
            width: 250px;
            line-height: 1.5;
            z-index: 100;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            transition: opacity 0.2s;
        }
        .tooltip-text::after {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 6px solid transparent;
            border-top-color: #252542;
        }
        .tooltip:hover .tooltip-text {
            visibility: visible;
            opacity: 1;
        }
        
        .form-group select,
        .form-group input {
            width: 100%;
            padding: 0.875rem 1rem;
            background: #252542;
            border: 2px solid #3a3a5a;
            border-radius: 12px;
            font-size: 0.95rem;
            font-family: inherit;
            color: #fff;
            transition: all 0.2s;
        }
        .form-group select:focus,
        .form-group input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
        }
        .form-group select option {
            background: #252542;
            color: #fff;
        }
        .form-group input::placeholder {
            color: #666;
        }
        
        .btn {
            width: 100%;
            padding: 1rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        
        .tips-section {
            margin-top: 2rem;
            padding: 1.5rem;
            background: rgba(102, 126, 234, 0.1);
            border-radius: 12px;
            border: 1px solid rgba(102, 126, 234, 0.2);
        }
        .tips-title {
            color: #667eea;
            font-size: 0.9rem;
            font-weight: 600;
            margin-bottom: 0.75rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .tips-list {
            list-style: none;
            font-size: 0.85rem;
            color: #aaa;
            line-height: 1.8;
        }
        .tips-list li {
            display: flex;
            align-items: flex-start;
            gap: 0.5rem;
        }
        .tips-list li::before {
            content: '✓';
            color: #27ae60;
            font-weight: bold;
        }
        
        .alert {
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            font-size: 0.9rem;
        }
        .alert-error {
            background: rgba(231, 76, 60, 0.2);
            color: #e74c3c;
            border: 1px solid rgba(231, 76, 60, 0.3);
        }
        
        .progress-bar {
            height: 4px;
            background: #3a3a5a;
            border-radius: 2px;
            margin-bottom: 2rem;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            width: 25%;
            transition: width 0.3s;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-icon">🤖</div>
            <h1>Welcome to AI Chat!</h1>
            <p>Let's set up your AI preferences in just a few steps</p>
        </div>
        
        <div class="steps-indicator">
            <div class="step-dot active"></div>
            <div class="step-dot"></div>
            <div class="step-dot"></div>
            <div class="step-dot"></div>
        </div>
        
        <div class="progress-bar">
            <div class="progress-fill"></div>
        </div>
        
        <div class="card">
            @if($errors->any())
                <div class="alert alert-error">{{ $errors->first() }}</div>
            @endif
            
            <h2 class="step-title">
                <span class="step-number">1</span>
                Choose Your AI Provider
            </h2>
            <p class="step-desc">Select the AI service you want to use. Each provider offers different models with varying capabilities and pricing.</p>
            
            <form action="/onboarding/complete" method="POST">
                @csrf
                
                <div class="form-group">
                    <label>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                        AI Provider <span style="color:#e74c3c;">*</span>
                        <span class="tooltip">ℹ️
                            <span class="tooltip-text">Different providers have different strengths. OpenAI excels at general tasks, Anthropic (Claude) is great for analysis and coding, Google Gemini offers strong multimodal capabilities.</span>
                        </span>
                    </label>
                    <select id="provider" name="provider" onchange="updateModels()" required>
                        <option value="">Select a provider...</option>
                        @foreach($models as $key => $provider)
                            <option value="{{ $key }}">{{ $provider['label'] }}</option>
                        @endforeach
                    </select>
                </div>
                
                <div class="form-group">
                    <label>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                        AI Model <span style="color:#e74c3c;">*</span>
                        <span class="tooltip">ℹ️
                            <span class="tooltip-text">Models vary in intelligence, speed, and cost. "Flash" models are faster and cheaper. "Pro" models are more capable but slower and more expensive. Choose based on your needs.</span>
                        </span>
                    </label>
                    <select id="model" name="model" required disabled>
                        <option value="">Select a provider first...</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        API Key <span style="color:#e74c3c;">*</span>
                        <span class="tooltip">ℹ️
                            <span class="tooltip-text">Your API key is stored securely and encrypted. It's only used to authenticate requests to your chosen AI provider. Get your API key from the provider's website.</span>
                        </span>
                    </label>
                    <input 
                        type="password" 
                        name="api_key" 
                        placeholder="Enter your API key (e.g., sk-... for OpenAI)"
                        required
                    >
                </div>
                
                <div class="tips-section">
                    <div class="tips-title">💡 Quick Tips</div>
                    <ul class="tips-list">
                        <li>You can change these settings anytime from the Settings page</li>
                        <li>Your API key is encrypted and never shared</li>
                        <li>Start with a free tier provider like Google Gemini or Groq</li>
                    </ul>
                </div>
                
                <div style="margin-top: 1.5rem;">
                    <button type="submit" class="btn">
                        🚀 Start Chatting
                    </button>
                </div>
            </form>
        </div>
    </div>

    <script>
        const allowedModels = @json($models);
        
        function updateModels() {
            const provider = document.getElementById('provider').value;
            const modelSelect = document.getElementById('model');
            
            modelSelect.innerHTML = '<option value="">Loading models...</option>';
            modelSelect.disabled = true;
            
            if (!provider || !allowedModels[provider]) {
                modelSelect.innerHTML = '<option value="">Select a provider first...</option>';
                return;
            }
            
            const models = allowedModels[provider].models || {};
            modelSelect.innerHTML = '<option value="">Select a model...</option>';
            
            for (const [key, name] of Object.entries(models)) {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = name;
                modelSelect.appendChild(option);
            }
            
            modelSelect.disabled = false;
        }
    </script>
</body>
</html>