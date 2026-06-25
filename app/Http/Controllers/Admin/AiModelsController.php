<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiAgent;
use App\Models\AiProvider;
use App\Models\AiProviderModel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class AiModelsController extends Controller
{
    /**
     * Render the AI Models sync admin page.
     */
    public function index()
    {
        $providers = AiAgent::allowedModels();
        $dbModels = AiProviderModel::all()->groupBy('provider_key');

        $result = [];
        foreach ($providers as $key => $provider) {
            $dbProviderModels = $dbModels->get($key, collect())->keyBy('model_id');
            $codeModels = $provider['models'] ?? [];

            $dbTotalCount = $dbProviderModels->count();
            
            $result[] = [
                'provider_key' => $key,
                'label' => $provider['label'],
                'current_count' => count($codeModels),
                'db_count' => $dbTotalCount,
                'status' => $this->getSyncStatus($codeModels, $dbProviderModels),
                'last_checked' => $dbProviderModels->first()?->last_checked_at?->toIso8601String(),
                'has_api_key' => $this->providerHasApiKey($key),
            ];
        }

        return Inertia::render('Admin/AiModels', ['providers' => $result]);
    }

    /**
     * Get all providers with their model sync status (API endpoint).
     */
    public function apiIndex()
    {
        $providers = AiAgent::allowedModels();
        $dbModels = AiProviderModel::all()->groupBy('provider_key');

        $result = [];
        foreach ($providers as $key => $provider) {
            $dbProviderModels = $dbModels->get($key, collect())->keyBy('model_id');
            $codeModels = $provider['models'] ?? [];

            $dbTotalCount = $dbProviderModels->count();
            
            $result[] = [
                'provider_key' => $key,
                'label' => $provider['label'],
                'current_count' => count($codeModels),
                'db_count' => $dbTotalCount,
                'status' => $this->getSyncStatus($codeModels, $dbProviderModels),
                'last_checked' => $dbProviderModels->first()?->last_checked_at?->toIso8601String(),
                'has_api_key' => $this->providerHasApiKey($key),
            ];
        }

        return response()->json(['providers' => $result]);
    }

    /**
     * Preview changes for a specific provider (dry-run).
     */
    public function preview(string $provider)
    {
        $allowedProviders = array_keys(AiAgent::allowedModels());

        if (!in_array($provider, $allowedProviders)) {
            return response()->json(['success' => false, 'message' => 'Provider not found'], 404);
        }

        $providerModels = AiAgent::allowedModels()[$provider] ?? [];
        $codeModels = $providerModels['models'] ?? [];

        $dbModels = AiProviderModel::forProvider($provider)->get()->keyBy('model_id');
        $providerModelsFromApi = $this->fetchProviderModelsFromApi($provider);

        if ($providerModelsFromApi === null) {
            // Fallback: compare code models vs db models
            return $this->previewFromCode($provider, $codeModels, $dbModels);
        }

        return $this->buildPreview($provider, $codeModels, $dbModels, $providerModelsFromApi);
    }

    /**
     * Sync models for a specific provider.
     */
    public function sync(string $provider)
    {
        $allowedProviders = array_keys(AiAgent::allowedModels());

        if (!in_array($provider, $allowedProviders)) {
            return response()->json(['success' => false, 'message' => 'Provider not found'], 404);
        }

        $providerModels = AiAgent::allowedModels()[$provider] ?? [];
        $codeModels = $providerModels['models'] ?? [];

        $dbModels = AiProviderModel::forProvider($provider)->get()->keyBy('model_id');
        $providerModelsFromApi = $this->fetchProviderModelsFromApi($provider);

        if ($providerModelsFromApi === null) {
            // Fallback: sync from code models
            $this->syncFromCode($provider, $codeModels);
        } else {
            $this->syncWithApi($provider, $codeModels, $dbModels, $providerModelsFromApi);
        }

        return response()->json([
            'success' => true,
            'message' => ucfirst($provider) . ' models synced successfully.',
        ]);
    }

    /**
     * Get sync status summary.
     */
    private function getSyncStatus(array $codeModels, $dbModels): string
    {
        $dbSupportedCount = $dbModels->where('is_supported', true)->count();

        if ($dbSupportedCount === 0) {
            return 'not_synced';
        }

        // Check if all CODE models exist in DB with is_supported=true
        // (API may return more models than hardcoded, which is fine)
        foreach ($codeModels as $codeId => $label) {
            $dbModel = $dbModels->get($codeId);
            if (!$dbModel || !$dbModel->is_supported) {
                return 'out_of_sync';
            }
        }

        return 'synced';
    }

    private function providerHasApiKey(string $provider): bool
    {
        $dbProvider = AiProvider::where('key', $provider)->active()->first();
        
        if (!$dbProvider) {
            return false;
        }
        
        return !empty($dbProvider->decrypted_api_key);
    }
    /**
     * Get decrypted API key from database for a provider.
     */
    private function getDatabaseApiKey(string $provider): ?string
    {
        $dbProvider = AiProvider::where('key', $provider)->active()->first();
        return $dbProvider?->decrypted_api_key;
    }



    /**
     * Preview sync from code models (fallback when API is unavailable).
     */
    private function previewFromCode(string $provider, array $codeModels, $dbModels): \Illuminate\Http\JsonResponse
    {
        $preview = [
            'provider_key' => $provider,
            'source' => 'code',
            'added' => [],
            'removed' => [],
            'unchanged' => [],
        ];

        $codeModelIds = collect($codeModels)->keys()->toArray();
        $dbModelIds = $dbModels->keyBy('model_id');

        foreach ($codeModels as $id => $label) {
            if ($dbModelIds->has($id)) {
                $preview['unchanged'][] = ['model_id' => $id, 'label' => $label];
            } else {
                $preview['added'][] = ['model_id' => $id, 'label' => $label];
            }
        }

        // Find removed models (in DB but not in code, and not already in unchanged/added)
        $handledIds = collect($preview['unchanged'])->pluck('model_id')->merge(collect($preview['added'])->pluck('model_id'));
        foreach ($dbModelIds as $id => $model) {
            if (!in_array($id, $codeModelIds) && !$handledIds->contains($id)) {
                $preview['removed'][] = ['model_id' => $id, 'label' => $model->model_label];
            }
        }

        return response()->json($preview);
    }

    /**
     * Build preview comparing API models vs DB models.
     * Shows what actually needs to change in the database.
     */
    private function buildPreview(string $provider, array $codeModels, $dbModels, array $apiModels): \Illuminate\Http\JsonResponse
    {
        $preview = [
            'provider_key' => $provider,
            'source' => 'api',
            'added' => [],
            'removed' => [],
            'unchanged' => [],
        ];

        $dbModelIds = $dbModels->keyBy('model_id');

        // Find removed models (in DB but not in API)
        foreach ($dbModelIds as $id => $model) {
            if (!in_array($id, $apiModels)) {
                $preview['removed'][] = ['model_id' => $id, 'label' => $model->model_label];
            }
        }

        // Find added/unchanged models (in API vs DB)
        foreach ($apiModels as $id) {
            $label = $codeModels[$id] ?? $this->formatModelId($id);
            if ($dbModelIds->has($id)) {
                $preview['unchanged'][] = ['model_id' => $id, 'label' => $label];
            } else {
                $preview['added'][] = ['model_id' => $id, 'label' => $label];
            }
        }

        return response()->json($preview);
    }

    /**
     * Sync models from code (fallback).
     */
    private function syncFromCode(string $provider, array $codeModels): void
    {
        $now = now();
        $codeModelIds = collect($codeModels)->keys()->toArray();

        // Sync models from code: update/create as active
        foreach ($codeModels as $id => $label) {
            AiProviderModel::updateOrCreate(
                ['provider_key' => $provider, 'model_id' => $id],
                [
                    'model_label' => $label,
                    'status' => 'active',
                    'is_supported' => true,
                    'last_checked_at' => $now,
                ]
            );
        }

        // Mark models in DB but not in code as deprecated
        $dbModels = AiProviderModel::forProvider($provider)->get()->keyBy('model_id');
        foreach ($dbModels as $id => $model) {
            if (!in_array($id, $codeModelIds)) {
                $model->update([
                    'status' => 'deprecated',
                    'is_supported' => false,
                    'last_checked_at' => $now,
                ]);
            }
        }
    }

    /**
     * Sync models using API data.
     */
    private function syncWithApi(string $provider, array $codeModels, $dbModels, array $apiModels): void
    {
        $now = now();
        $codeModelIds = collect($codeModels)->keys()->toArray();
        $apiModelIds = collect($apiModels);

        // Update/create from API models
        foreach ($apiModels as $id) {
            $label = $codeModels[$id] ?? $this->formatModelId($id);
            $isInCode = in_array($id, $codeModelIds);

            AiProviderModel::updateOrCreate(
                ['provider_key' => $provider, 'model_id' => $id],
                [
                    'model_label' => $label,
                    'status' => $isInCode ? 'active' : 'new',
                    'is_supported' => true,
                    'last_checked_at' => $now,
                ]
            );
        }

        // Mark models not in API as deprecated
        foreach ($dbModels as $id => $model) {
            if (!$apiModelIds->contains($id)) {
                $model->update([
                    'status' => 'deprecated',
                    'is_supported' => false,
                    'last_checked_at' => $now,
                ]);
            }
        }
    }

    /**
     * Fetch available models from provider API.
     */
    private function fetchProviderModelsFromApi(string $provider): ?array
    {
        return match ($provider) {
            'groq' => $this->fetchGroqModels(),
            'deepseek' => $this->fetchDeepSeekModels(),
            'openai' => $this->fetchOpenAiModels(),
            'anthropic' => $this->fetchAnthropicModels(),
            'gemini' => $this->fetchGeminiModels(),
            'mistral' => $this->fetchMistralModels(),
            'xai' => $this->fetchXaiModels(),
            default => null,
        };
    }

    /**
     * Fetch models from Groq API.
     */
    private function fetchGroqModels(): ?array
    {
        try {
            $apiKey = $this->getDatabaseApiKey('groq');
            if (empty($apiKey)) {
                return null;
            }

            $response = Http::withToken($apiKey)
                ->get('https://api.groq.com/openai/v1/models');

            if (!$response->successful()) {
                Log::warning('Groq API fetch failed', ['status' => $response->status()]);
                return null;
            }

            $models = $response->json('data', []);
            return collect($models)
                ->pluck('id')
                ->filter(fn ($id) => !str_contains($id, 'whisper'))
                ->values()
                ->toArray();
        } catch (\Exception $e) {
            Log::error('Groq API fetch error', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Fetch models from DeepSeek API.
     */
    private function fetchDeepSeekModels(): ?array
    {
        try {
            $apiKey = $this->getDatabaseApiKey('deepseek');
            if (empty($apiKey)) {
                return null;
            }

            $response = Http::withToken($apiKey)
                ->get('https://api.deepseek.com/v1/models');

            if (!$response->successful()) {
                Log::warning('DeepSeek API fetch failed', ['status' => $response->status()]);
                return null;
            }

            $models = $response->json('data', []);
            return collect($models)
                ->pluck('id')
                ->values()
                ->toArray();
        } catch (\Exception $e) {
            Log::error('DeepSeek API fetch error', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Fetch models from OpenAI API.
     */
    private function fetchOpenAiModels(): ?array
    {
        try {
            $apiKey = $this->getDatabaseApiKey('openai');
            if (empty($apiKey)) {
                return null;
            }

            $response = Http::withToken($apiKey)
                ->get('https://api.openai.com/v1/models');

            if (!$response->successful()) {
                Log::warning('OpenAI API fetch failed', ['status' => $response->status()]);
                return null;
            }

            $models = $response->json('data', []);
            // Filter to only chat models
            return collect($models)
                ->filter(fn ($m) => isset($m['id']) && !str_contains($m['id'], '-vision'))
                ->pluck('id')
                ->values()
                ->toArray();
        } catch (\Exception $e) {
            Log::error('OpenAI API fetch error', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Fetch models from Anthropic API.
     */
    private function fetchAnthropicModels(): ?array
    {
        try {
            $apiKey = $this->getDatabaseApiKey('anthropic');
            if (empty($apiKey)) {
                return null;
            }

            $response = Http::withToken($apiKey)
                ->withHeaders(['anthropic-version' => '2023-06-01'])
                ->get('https://api.anthropic.com/v1/models');

            if (!$response->successful()) {
                Log::warning('Anthropic API fetch failed', ['status' => $response->status()]);
                return null;
            }

            $models = $response->json('data', []);
            return collect($models)
                ->pluck('id')
                ->filter(fn ($id) => !str_contains($id, 'image') && !str_contains($id, 'audio') && !str_contains($id, 'video'))
                ->values()
                ->toArray();
        } catch (\Exception $e) {
            Log::error('Anthropic API fetch error', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Fetch models from Google Gemini API.
     */
    private function fetchGeminiModels(): ?array
    {
        try {
            $apiKey = $this->getDatabaseApiKey('gemini');
            if (empty($apiKey)) {
                return null;
            }

            $response = Http::get('https://generativelanguage.googleapis.com/v1beta/models', [
                'key' => $apiKey,
            ]);

            if (!$response->successful()) {
                Log::warning('Gemini API fetch failed', ['status' => $response->status()]);
                return null;
            }

            $models = $response->json('models', []);
            return collect($models)
                ->pluck('name')
                ->map(fn ($name) => last(explode('/', $name)))
                ->filter(fn ($id) => !str_contains($id, 'vision') && !str_contains($id, 'audio') && !str_contains($id, 'video'))
                ->values()
                ->toArray();
        } catch (\Exception $e) {
            Log::error('Gemini API fetch error', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Fetch models from Mistral AI API.
     */
    private function fetchMistralModels(): ?array
    {
        try {
            $apiKey = $this->getDatabaseApiKey('mistral');
            if (empty($apiKey)) {
                return null;
            }

            $response = Http::withToken($apiKey)
                ->get('https://api.mistral.ai/v1/models');

            if (!$response->successful()) {
                Log::warning('Mistral API fetch failed', ['status' => $response->status()]);
                return null;
            }

            $models = $response->json('data', []);
            return collect($models)
                ->pluck('id')
                ->values()
                ->toArray();
        } catch (\Exception $e) {
            Log::error('Mistral API fetch error', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Fetch models from xAI API.
     */
    private function fetchXaiModels(): ?array
    {
        try {
            $apiKey = $this->getDatabaseApiKey('xai');
            if (empty($apiKey)) {
                return null;
            }

            $response = Http::withToken($apiKey)
                ->get('https://api.x.ai/v1/models');

            if (!$response->successful()) {
                Log::warning('xAI API fetch failed', ['status' => $response->status()]);
                return null;
            }

            $models = $response->json('data', []);
            return collect($models)
                ->pluck('id')
                ->filter(fn ($id) => !str_contains($id, 'image') && !str_contains($id, 'audio') && !str_contains($id, 'video'))
                ->values()
                ->toArray();
        } catch (\Exception $e) {
            Log::error('xAI API fetch error', ['error' => $e->getMessage()]);
            return null;
        }
    }


    /**
     * Format a model ID into a readable label.
     */
    private function formatModelId(string $id): string
    {
        return ucwords(str_replace(['-', '_'], ' ', $id));
    }
}
