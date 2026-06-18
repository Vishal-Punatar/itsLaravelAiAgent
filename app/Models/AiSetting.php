<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiSetting extends Model
{
    protected $fillable = ['user_id', 'provider', 'model', 'api_key'];

    protected $casts = [
        'api_key' => 'encrypted',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * List of supported AI providers and models per Laravel AI SDK
     */
    public static function allowedModels(): array
    {
        return [
            'openai' => [
                'label' => 'OpenAI',
                'models' => [
                    'gpt-4.5' => 'GPT-4.5',
                    'gpt-4o' => 'GPT-4o',
                    'gpt-4o-mini' => 'GPT-4o Mini',
                    'gpt-4-turbo' => 'GPT-4 Turbo',
                    'gpt-3.5-turbo' => 'GPT-3.5 Turbo',
                ],
            ],
            'anthropic' => [
                'label' => 'Anthropic Claude',
                'models' => [
                    'claude-3-5-sonnet-latest' => 'Claude 3.5 Sonnet',
                    'claude-3-5-sonnet-20241022' => 'Claude 3.5 Sonnet (Oct 2024)',
                    'claude-3-opus-latest' => 'Claude 3 Opus',
                    'claude-3-haiku-latest' => 'Claude 3 Haiku',
                ],
            ],
            'google' => [
                'label' => 'Google Gemini',
                'models' => [
                    'gemini-2.5-flash' => 'Gemini 2.5 Flash',
                    'gemini-2.0-flash' => 'Gemini 2.0 Flash',
                    'gemini-1.5-flash' => 'Gemini 1.5 Flash',
                    'gemini-1.5-pro' => 'Gemini 1.5 Pro',
                    'gemini-1.0-pro' => 'Gemini 1.0 Pro',
                ],
            ],
            'azure' => [
                'label' => 'Azure OpenAI',
                'models' => [
                    'gpt-4o' => 'GPT-4o',
                    'gpt-4o-mini' => 'GPT-4o Mini',
                    'gpt-4-turbo' => 'GPT-4 Turbo',
                    'gpt-35-turbo' => 'GPT-3.5 Turbo',
                ],
            ],
            'bedrock' => [
                'label' => 'AWS Bedrock',
                'models' => [
                    'us.amazon.nova-pro-v1_0' => 'Nova Pro',
                    'us.amazon.nova-lite-v1_0' => 'Nova Lite',
                    'us.amazon.nova-micro-v1_0' => 'Nova Micro',
                    'anthropic.claude-3-5-sonnet-20241022-v1_0' => 'Claude 3.5 Sonnet',
                    'anthropic.claude-3-opus-20240307-v1_0' => 'Claude 3 Opus',
                    'anthropic.claude-3-haiku-20240307-v1_0' => 'Claude 3 Haiku',
                    'meta.llama3-1-70b-instruct-v1_0' => 'Llama 3.1 70B',
                    'meta.llama3-1-8b-instruct-v1_0' => 'Llama 3.1 8B',
                ],
            ],
            'groq' => [
                'label' => 'GroqCloud',
                'models' => [
                    'llama-3.3-70b-versatile' => 'Llama 3.3 70B Versatile',
                    'llama-3.1-8b-instant' => 'Llama 3.1 8B Instant',
                    'mixtral-8x7b-32768' => 'Mixtral 8x7B',
                    'gemma2-9b-it' => 'Gemma 2 9B',
                ],
            ],
            'xai' => [
                'label' => 'xAI Grok',
                'models' => [
                    'grok-2' => 'Grok 2',
                    'grok-2-mini' => 'Grok 2 Mini',
                    'grok-1' => 'Grok 1',
                    'grok-1.5' => 'Grok 1.5',
                    'grok-1.5-vision' => 'Grok 1.5 Vision',
                ],
            ],
            'deepseek' => [
                'label' => 'DeepSeek',
                'models' => [
                    'deepseek-chat' => 'DeepSeek Chat',
                    'deepseek-coder' => 'DeepSeek Coder',
                    'deepseek-reasoner' => 'DeepSeek Reasoner',
                ],
            ],
            'mistral' => [
                'label' => 'Mistral AI',
                'models' => [
                    'mistral-large-latest' => 'Mistral Large',
                    'mistral-small-latest' => 'Mistral Small',
                    'mistral-nemo' => 'Mistral Nemo',
                    'codestral-latest' => 'Codestral',
                ],
            ],
            'ollama' => [
                'label' => 'Ollama (Local)',
                'models' => [
                    'llama3.3' => 'Llama 3.3',
                    'llama3.2' => 'Llama 3.2',
                    'llama3.1' => 'Llama 3.1',
                    'mistral' => 'Mistral',
                    'mixtral' => 'Mixtral',
                    'codellama' => 'Code Llama',
                    'phi3' => 'Phi-3',
                    'qwen2.5' => 'Qwen 2.5',
                    'deepseek-coder' => 'DeepSeek Coder',
                ],
            ],
            'openrouter' => [
                'label' => 'OpenRouter',
                'models' => [
                    'openrouter/auto' => 'Auto (Best Available)',
                    'openai/gpt-4o' => 'GPT-4o',
                    'openai/gpt-4o-mini' => 'GPT-4o Mini',
                    'anthropic/claude-3.5-sonnet' => 'Claude 3.5 Sonnet',
                    'google/gemini-2.0-flash' => 'Gemini 2.0 Flash',
                    'meta-llama/llama-3.3-70b-instruct' => 'Llama 3.3 70B',
                    'deepseek/deepseek-chat' => 'DeepSeek Chat',
                    'mistralai/mistral-large' => 'Mistral Large',
                    'x-ai/grok-2' => 'Grok 2',
                ],
            ],
        ];
    }

    /**
     * Get the API endpoint for a provider
     */
    public static function getApiEndpoint(string $provider, string $model): string
    {
        return match ($provider) {
            'openai' => 'https://api.openai.com/v1/chat/completions',
            'anthropic' => 'https://api.anthropic.com/v1/messages',
            'google' => 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
            'azure' => 'https://{your-resource}.openai.azure.com/openai/deployments/{model}/chat/completions?api-version=2024-02-01',
            'bedrock' => 'https://bedrock.{region}.amazonaws.com',
            'groq' => 'https://api.groq.com/openai/v1/chat/completions',
            'xai' => 'https://api.x.ai/v1/chat/completions',
            'deepseek' => 'https://api.deepseek.com/v1/chat/completions',
            'mistral' => 'https://api.mistral.ai/v1/chat/completions',
            'ollama' => 'http://localhost:11434/api/chat',
            'openrouter' => 'https://openrouter.ai/api/v1/chat/completions',
            default => '',
        };
    }
}