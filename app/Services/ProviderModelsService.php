<?php

namespace App\Services;

use App\Models\AdminAiAgent;
use App\Models\AiAgent;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Fetches live models for a given provider/agent.
 *
 * Pure runtime — no DB persistence of model lists.
 * Used by the chat UI's Model Selector dropdown.
 *
 * Resolution order:
 *   1. Try live provider API (OpenAI, Anthropic, Gemini, Groq, Mistral, xAI, DeepSeek)
 *   2. Empty list with clear source marker (no hardcoded fallback)
 *
 * Auto-selects a "preferred" model from the returned list using PROVIDER_PREFERRED map.
 */
class ProviderModelsService
{
    /**
     * Preferred model candidates per provider, tried in order.
     * - Exact match (case-insensitive) wins first
     * - Then starts-with match in given order
     * - Then first model in list
     *
     * @var array<string, array<int, string>>
     */
    public const PROVIDER_PREFERRED = [
        'openai' => ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        'anthropic' => ['claude-sonnet-4-6', 'claude-haiku-4-5', 'claude-sonnet-4-5', 'claude-opus-4-5'],
        'gemini' => ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
        'xai' => ['grok-2', 'grok-2-mini', 'grok-1.5', 'grok-1'],
        'openrouter' => ['openrouter/auto'],
        'groq' => ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral'],
        'mistral' => ['mistral-large-latest', 'mistral-small-latest', 'codestral-latest'],
        'deepseek' => ['deepseek-chat', 'deepseek-reasoner'],
        // azure, bedrock, ollama: no live fetcher — will return empty list with 'unsupported' source
    ];

    /**
     * Resolve live model list + auto-selected preferred for the given agent.
     *
     * @param  int|string  $agentId  integer agent ID, or -1 for admin default virtual agent
     * @return array{
     *     models: array<int, string>,
     *     preferred: ?string,
     *     source: string,
     *     provider: string,
     *     error: ?string
     * }
     */
    public function getModelsForAgent(int|string $agentId): array
    {
        $resolved = $this->resolveAgent($agentId);
        $provider = $resolved['provider'];
        $apiKey = $resolved['api_key'];

        if (empty($apiKey)) {
            return [
                'models' => [],
                'preferred' => null,
                'source' => 'no_api_key',
                'provider' => $provider,
                'error' => "No API key configured for provider '{$provider}'.",
            ];
        }

        // Try live API first (and only — no hardcoded fallback)
        $liveModels = $this->fetchFromApi($provider, $apiKey);
        if ($liveModels !== null && !empty($liveModels)) {
            return [
                'models' => $liveModels,
                'preferred' => $this->pickPreferred($provider, $liveModels),
                'source' => 'live_api',
                'provider' => $provider,
                'error' => null,
            ];
        }

        return [
            'models' => [],
            'preferred' => null,
            'source' => 'unsupported',
            'provider' => $provider,
            'error' => $liveModels === null
                ? "Provider '{$provider}' has no live model API configured."
                : 'Live API returned no models for this key.',
        ];
    }

    /**
     * Resolve agent → { provider, api_key }.
     * Works for both real agents (int id) and the admin-default virtual agent (id = -1).
     *
     * @return array{provider: string, api_key: ?string}
     */
    public function resolveAgent(int|string $agentId): array
    {
        if ((int) $agentId === -1) {
            $adminDefault = AdminAiAgent::getDefault();
            return [
                'provider' => $adminDefault?->provider ?? 'openai',
                'api_key' => $adminDefault?->decrypted_api_key,
            ];
        }

        $agent = AiAgent::find((int) $agentId);
        if (!$agent) {
            return ['provider' => 'openai', 'api_key' => null];
        }

        return [
            'provider' => $agent->provider ?? 'openai',
            'api_key' => $agent->decrypted_api_key ?: null,
        ];
    }

    /**
     * Pick the best-matching preferred model from the list.
     * Falls back to the first model.
     */
    public function pickPreferred(string $provider, array $models): ?string
    {
        if (empty($models)) {
            return null;
        }

        $modelsLower = array_map(fn ($m) => strtolower((string) $m), $models);
        $candidates = self::PROVIDER_PREFERRED[$provider] ?? [];

        // Single-pass priority: for each candidate (in priority order), find the first model
        // that matches it by exact (case-insensitive) OR starts-with. Exact match is a subset
        // of starts-with when the candidate is a non-empty prefix of the model — so we test
        // both in one loop per candidate. This ensures earlier candidates always win, even
        // when a later candidate happens to be an exact match in the list (the prior bug).
        foreach ($candidates as $candidate) {
            $candLower = strtolower($candidate);
            foreach ($models as $i => $m) {
                $mLower = $modelsLower[$i];
                if ($mLower === $candLower || str_starts_with($mLower, $candLower)) {
                    return $models[$i];
                }
            }
        }

        // No preferred candidate matched — fall back to the first model in the list
        return $models[0] ?? null;
    }

    /**
     * Dispatch to the right live fetcher for the provider.
     * Returns null if no live fetcher exists for that provider.
     *
     * @return array<int, string>|null  flat list of model IDs, or null if unsupported / errored
     */
    private function fetchFromApi(string $provider, string $apiKey): ?array
    {
        return match ($provider) {
            'groq' => $this->fetchGroq($apiKey),
            'deepseek' => $this->fetchDeepSeek($apiKey),
            'openai' => $this->fetchOpenAi($apiKey),
            'anthropic' => $this->fetchAnthropic($apiKey),
            'gemini' => $this->fetchGemini($apiKey),
            'mistral' => $this->fetchMistral($apiKey),
            'xai' => $this->fetchXai($apiKey),
            default => null,
        };
    }

    private function fetchGroq(string $apiKey): ?array
    {
        try {
            $r = Http::withToken($apiKey)->get('https://api.groq.com/openai/v1/models');
            if (!$r->successful()) {
                Log::warning('Groq models fetch failed', ['status' => $r->status()]);
                return null;
            }
            return collect($r->json('data', []))
                ->pluck('id')
                ->filter(fn ($id) => !str_contains((string) $id, 'whisper'))
                ->values()->toArray();
        } catch (\Exception $e) {
            Log::error('Groq models fetch error', ['error' => $e->getMessage()]);
            return null;
        }
    }

    private function fetchDeepSeek(string $apiKey): ?array
    {
        try {
            $r = Http::withToken($apiKey)->get('https://api.deepseek.com/v1/models');
            if (!$r->successful()) {
                Log::warning('DeepSeek models fetch failed', ['status' => $r->status()]);
                return null;
            }
            return collect($r->json('data', []))
                ->pluck('id')
                ->values()->toArray();
        } catch (\Exception $e) {
            Log::error('DeepSeek models fetch error', ['error' => $e->getMessage()]);
            return null;
        }
    }

    private function fetchOpenAi(string $apiKey): ?array
    {
        try {
            $r = Http::withToken($apiKey)->get('https://api.openai.com/v1/models');
            if (!$r->successful()) {
                Log::warning('OpenAI models fetch failed', ['status' => $r->status()]);
                return null;
            }
            $blocked = ['embedding', 'whisper', 'tts', 'dall-e', 'sora', 'realtime', 'audio'];
            return collect($r->json('data', []))
                ->pluck('id')
                ->filter(function ($id) use ($blocked) {
                    $id = (string) $id;
                    foreach ($blocked as $b) {
                        if (str_contains($id, $b)) return false;
                    }
                    return true;
                })
                ->values()->toArray();
        } catch (\Exception $e) {
            Log::error('OpenAI models fetch error', ['error' => $e->getMessage()]);
            return null;
        }
    }

    private function fetchAnthropic(string $apiKey): ?array
    {
        try {
            $r = Http::withHeaders([
                    'x-api-key' => $apiKey,
                    'anthropic-version' => '2023-06-01',
                ])
                ->get('https://api.anthropic.com/v1/models');
            if (!$r->successful()) {
                Log::warning('Anthropic models fetch failed', ['status' => $r->status(), 'body' => substr($r->body(), 0, 200)]);
                return null;
            }
            $blocked = ['image', 'audio', 'video'];
            return collect($r->json('data', []))
                ->pluck('id')
                ->filter(function ($id) use ($blocked) {
                    $id = (string) $id;
                    foreach ($blocked as $b) {
                        if (str_contains($id, $b)) return false;
                    }
                    return true;
                })
                ->values()->toArray();
        } catch (\Exception $e) {
            Log::error('Anthropic models fetch error', ['error' => $e->getMessage()]);
            return null;
        }
    }

    private function fetchGemini(string $apiKey): ?array
    {
        try {
            $r = Http::get('https://generativelanguage.googleapis.com/v1beta/models', [
                'key' => $apiKey,
            ]);
            if (!$r->successful()) {
                Log::warning('Gemini models fetch failed', ['status' => $r->status()]);
                return null;
            }
            $blocked = ['vision', 'audio', 'video', 'image'];
            return collect($r->json('models', []))
                ->pluck('name')
                ->map(fn ($name) => last(explode('/', (string) $name)))
                ->filter(function ($id) use ($blocked) {
                    foreach ($blocked as $b) {
                        if (str_contains((string) $id, $b)) return false;
                    }
                    return true;
                })
                ->values()->toArray();
        } catch (\Exception $e) {
            Log::error('Gemini models fetch error', ['error' => $e->getMessage()]);
            return null;
        }
    }

    private function fetchMistral(string $apiKey): ?array
    {
        try {
            $r = Http::withToken($apiKey)->get('https://api.mistral.ai/v1/models');
            if (!$r->successful()) {
                Log::warning('Mistral models fetch failed', ['status' => $r->status()]);
                return null;
            }
            return collect($r->json('data', []))
                ->pluck('id')
                ->values()->toArray();
        } catch (\Exception $e) {
            Log::error('Mistral models fetch error', ['error' => $e->getMessage()]);
            return null;
        }
    }

    private function fetchXai(string $apiKey): ?array
    {
        try {
            $r = Http::withToken($apiKey)->get('https://api.x.ai/v1/models');
            if (!$r->successful()) {
                Log::warning('xAI models fetch failed', ['status' => $r->status()]);
                return null;
            }
            $blocked = ['image', 'audio', 'video'];
            return collect($r->json('data', []))
                ->pluck('id')
                ->filter(function ($id) use ($blocked) {
                    foreach ($blocked as $b) {
                        if (str_contains((string) $id, $b)) return false;
                    }
                    return true;
                })
                ->values()->toArray();
        } catch (\Exception $e) {
            Log::error('xAI models fetch error', ['error' => $e->getMessage()]);
            return null;
        }
    }
}