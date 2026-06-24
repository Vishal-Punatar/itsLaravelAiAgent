<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\AiAgent;
use App\Models\AiProvider;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class RegisterController extends Controller
{
    public function showRegistrationForm(Request $request)
    {
        return Inertia::render('Auth/Register', [
            'errors' => $request->session()->get('errors')
                ? (object) $request->session()->get('errors')->toArray()
                : (object) [],
        ]);
    }

    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $isFirstUser = User::count() === 0;

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'is_admin' => $isFirstUser,
        ]);

        // Auto-create an AI agent using the default provider
        $defaultProvider = AiProvider::getDefault();
        if ($defaultProvider) {
            $defaultModel = $this->defaultModelFor($defaultProvider->key);
            AiAgent::create([
                'user_id' => $user->id,
                'name' => $defaultProvider->label . ' Agent',
                'provider' => $defaultProvider->key,
                'model' => $defaultModel,
                'is_default' => true,
            ]);
        }

        auth()->login($user);

        return redirect('/chat');
    }

    private function defaultModelFor(string $provider): string
    {
        return match ($provider) {
            'openai' => 'gpt-4o-mini',
            'anthropic' => 'claude-3-5-haiku-20241022',
            'gemini' => 'gemini-2.0-flash',
            'azure' => 'gpt-4o-mini',
            'bedrock' => 'anthropic.claude-3-5-sonnet-20241022-v1_0',
            'groq' => 'llama-3.1-8b-instant',
            'xai' => 'grok-2-mini',
            'deepseek' => 'deepseek-chat',
            'mistral' => 'mistral-small-latest',
            'ollama' => 'llama3.2',
            'openrouter' => 'openrouter/auto',
            default => 'gemini-2.0-flash',
        };
    }
}
