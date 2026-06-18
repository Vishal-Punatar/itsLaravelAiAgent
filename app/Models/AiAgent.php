<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Crypt;

class AiAgent extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'provider',
        'api_key',
        'model',
        'is_default',
    ];

    protected $hidden = [
        'api_key',
    ];

    protected $casts = [
        'is_default' => 'boolean',
    ];

    /**
     * Get the user that owns the AI agent.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the decrypted API key.
     */
    public function getDecryptedApiKeyAttribute(): string
    {
        if (!$this->api_key) {
            return '';
        }
        try {
            return decrypt($this->api_key);
        } catch (\Exception $e) {
            return $this->api_key;
        }
    }

    /**
     * Get the effective model name.
     */
    public function getEffectiveModelAttribute(): string
    {
        if ($this->model) {
            return $this->model;
        }
        
        // Return default model based on provider
        return match ($this->provider) {
            'openai' => 'gpt-4o-mini',
            'gemini' => 'gemini-2.0-flash',
            'anthropic' => 'claude-3-5-haiku-20241022',
            'ollama' => 'llama3.2',
            'openrouter' => 'openrouter/auto',
            'bedrock' => 'anthropic.claude-3-5-sonnet-20241022-v1_0',
            default => 'gpt-4o-mini',
        };
    }

    /**
     * Scope to get only the user's agents.
     */
    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope to get the default agent.
     */
    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }

    /**
     * Get the provider brand color for icon backgrounds
     */
    public static function getProviderColor(string $provider): string
    {
        return match ($provider) {
            'openai' => '#10A37F',
            'anthropic' => '#CC785C',
            'gemini' => '#4285F4',
            'azure' => '#0078D4',
            'bedrock' => '#FF9900',
            'groq' => '#2ECC71',
            'xai' => '#000000',
            'deepseek' => '#0066CC',
            'mistral' => '#E26F4E',
            'ollama' => '#333333',
            'openrouter' => '#8B5CF6',
            default => '#667eea',
        };
    }

    /**
     * Get the provider icon (SVG)
     */
    public static function getProviderIcon(string $provider): string
    {
        return match ($provider) {
            'openai' => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="20" height="20"><path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.365 5.98 5.98 0 0 0 .743 7.097 5.98 5.98 0 0 0 .73.675 5.965 5.965 0 0 0 5.664 1.735 5.943 5.943 0 0 0 3.997-2.365 5.985 5.985 0 0 0-.516-4.91 5.986 5.986 0 0 0-4.446-2.974 5.947 5.947 0 0 1 3.898.433 4.636 4.636 0 0 1-.352.838 5.554 5.554 0 0 1-.771.934 5.526 5.526 0 0 0 1.113-.074 5.926 5.926 0 0 0 1.844-.73 6.026 6.026 0 0 0 4.446 2.974 5.987 5.987 0 0 0 3.276-.733 5.965 5.965 0 0 0 1.111-1.094 5.98 5.98 0 0 0 .516-4.91zM13.345 9.2a5.55 5.55 0 0 1-1.83.403 5.59 5.59 0 0 1-3.847-.873 5.477 5.477 0 0 1-2.195-2.092 5.413 5.413 0 0 1-.938-3.308 5.55 5.55 0 0 1 .291-2.137 5.487 5.487 0 0 1 1.245-1.918 5.522 5.522 0 0 1 1.822-1.265 5.354 5.354 0 0 1 2.014-.411 4.564 4.564 0 0 1 2.014.41 5.635 5.635 0 0 1 1.822 1.266 5.487 5.487 0 0 1 1.245 1.918 5.55 5.55 0 0 1 .291 2.137 5.413 5.413 0 0 1-.938 3.308 5.477 5.477 0 0 1-2.195 2.092 5.59 5.59 0 0 1-3.847.873 5.55 5.55 0 0 1-1.83-.403zm-1.278 5.465a6.016 6.016 0 0 0 3.476-1.635 5.93 5.93 0 0 0 1.635-3.466 5.955 5.955 0 0 0-1.635-3.466 6.016 6.016 0 0 0-3.476-1.635 5.968 5.968 0 0 0-3.476 1.635 5.955 5.955 0 0 0-1.635 3.466 5.93 5.93 0 0 0 1.635 3.466 6.016 6.016 0 0 0 3.476 1.635z"/></svg>',
            'anthropic' => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="20" height="20"><circle cx="12" cy="12" r="10" fill="#CC785C"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold" font-family="Arial">A</text></svg>',
            'gemini' => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="20" height="20"><path d="M12 2L2 9l10 13 10-13L12 2z"/><circle cx="12" cy="12" r="3" fill="white"/></svg>',
            'azure' => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="20" height="20"><rect width="24" height="24" rx="4" fill="#0078D4"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="11" font-weight="bold" font-family="Arial">A</text></svg>',
            'bedrock' => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="20" height="20"><rect width="24" height="24" rx="4" fill="#FF9900"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="10" font-weight="bold" font-family="Arial">AWS</text></svg>',
            'groq' => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="20" height="20"><circle cx="12" cy="12" r="10" fill="#2ECC71"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="10" font-weight="bold" font-family="Arial">G</text></svg>',
            'xai' => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="20" height="20"><circle cx="12" cy="12" r="10" fill="#000"/><text x="12" y="16" text-anchor="middle" fill="#fff" font-size="10" font-weight="bold" font-family="Arial">x</text></svg>',
            'deepseek' => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="20" height="20"><circle cx="12" cy="12" r="10" fill="#0066CC"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="9" font-weight="bold" font-family="Arial">DS</text></svg>',
            'mistral' => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="20" height="20"><circle cx="12" cy="12" r="10" fill="#E26F4E"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="9" font-weight="bold" font-family="Arial">M</text></svg>',
            'ollama' => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="20" height="20"><circle cx="12" cy="12" r="10" stroke="white" stroke-width="2"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="8" font-weight="bold" font-family="Arial">O</text></svg>',
            'openrouter' => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="20" height="20"><circle cx="12" cy="12" r="10" stroke="#8B5CF6" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="#8B5CF6"/></svg>',
            default => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="20" height="20"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 12a4.5 4.5 0 0 0 0 9h9a4.5 4.5 0 0 0 0-9h-9z"/></svg>',
        };
    }
}