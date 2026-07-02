<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiAgent;
use App\Models\AdminAiAgent;
use App\Models\Chat;
use App\Models\ChatMessage;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class AdminController extends Controller
{
    public function index()
    {
        // Most used agent: agent with the most messages, attributed via user's default agent
        // chats table has no ai_agent_id, so we trace: chat_messages → chats → users → ai_agents (user's default)
        $topAgent = ChatMessage::query()
            ->join('chats', 'chat_messages.chat_id', '=', 'chats.id')
            ->join('users', 'chats.user_id', '=', 'users.id')
            ->join('ai_agents', 'users.id', '=', 'ai_agents.user_id')
            ->where('ai_agents.is_default', true)
            ->groupBy('ai_agents.id')
            ->orderByDesc(DB::raw('COUNT(chat_messages.id)'))
            ->select(['ai_agents.id', 'ai_agents.name', DB::raw('COUNT(chat_messages.id) as message_count')])
            ->first();

        // Active users in the last 24 hours
        $activeUsers24h = ChatMessage::where('created_at', '>=', now()->subDay())
            ->distinct('user_id')
            ->count('user_id');

        // Default admin AI agent
        $defaultAdmin = AdminAiAgent::where('is_default', true)->first();

        $stats = [
            'total_users' => User::count(),
            'total_chats' => Chat::count(),
            'total_messages' => ChatMessage::count(),
            'total_agents' => AiAgent::count(),
            'active_users_24h' => $activeUsers24h,
            'top_agent' => $topAgent ? [
                'name' => $topAgent->name,
                'message_count' => (int) $topAgent->message_count,
            ] : null,
            'default_provider' => $defaultAdmin ? [
                'name' => $defaultAdmin->name,
                'provider' => $defaultAdmin->provider,
                'is_active' => $defaultAdmin->is_active,
                'has_api_key' => !empty($defaultAdmin->api_key),
            ] : null,
        ];

        return Inertia::render('Admin/Dashboard', ['stats' => $stats]);
    }

    public function users()
    {
        $users = User::with('aiAgents')
            ->withCount('chats', 'messages')
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('Admin/Users', ['users' => $users]);
    }

    public function editUser($id)
    {
        $user = User::findOrFail($id);
        return Inertia::render('Admin/UserEdit', ['user' => $user]);
    }

    public function updateUser(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $id,
            'is_admin' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $user->update($validator->validated());

        return response()->json(['success' => true, 'message' => 'User updated successfully.']);
    }

    public function destroyUser($id)
    {
        $user = User::findOrFail($id);

        if ($user->id === auth()->id()) {
            return response()->json(['success' => false, 'message' => 'You cannot delete yourself!'], 422);
        }

        $user->chats()->delete();
        $user->aiAgents()->delete();
        $user->delete();

        return response()->json(['success' => true, 'message' => 'User deleted successfully.']);
    }

    public function providers()
    {
        // Get all supported providers from laravel-ai-sdk
        $availableProviders = [
            'openai' => ['label' => 'OpenAI', 'has_image' => true],
            'gemini' => ['label' => 'Gemini', 'has_image' => true],
            'anthropic' => ['label' => 'Anthropic', 'has_image' => false],
            'openrouter' => ['label' => 'OpenRouter', 'has_image' => true],
            'xai' => ['label' => 'xAI', 'has_image' => true],
            'groq' => ['label' => 'Groq', 'has_image' => false],
            'deepseek' => ['label' => 'DeepSeek', 'has_image' => false],
            'mistral' => ['label' => 'Mistral', 'has_image' => false],
            'ollama' => ['label' => 'Ollama', 'has_image' => false],
            'azure' => ['label' => 'Azure OpenAI', 'has_image' => true],
            'bedrock' => ['label' => 'AWS Bedrock', 'has_image' => true],
        ];

        // Get providers saved in database
        $dbProviders = AdminAiAgent::orderBy('provider')->get()->keyBy('provider');

        // Build final list - merge available providers with database config
        $providers = collect($availableProviders)->map(function ($info, $key) use ($dbProviders) {
            $dbProvider = $dbProviders->get($key);
            return [
                'id' => $dbProvider?->id,
                'provider' => $key,
                'name' => $dbProvider?->name ?? $info['label'],
                'api_key' => $dbProvider?->decrypted_api_key ?? null,
                'is_default' => $dbProvider?->is_default ?? false,
                'is_active' => $dbProvider?->is_active ?? true,
                'is_configured' => $dbProvider !== null,
            ];
        })->values();

        // Also include any custom providers in DB that aren't in our list
        $customDbProviders = $dbProviders->filter(fn ($p) => !isset($availableProviders[$p->provider]));
        if ($customDbProviders->isNotEmpty()) {
            $custom = $customDbProviders->map(fn ($p) => [
                'id' => $p->id,
                'provider' => $p->provider,
                'name' => $p->name,
                'api_key' => $p->decrypted_api_key,
                'is_default' => $p->is_default,
                'is_active' => $p->is_active,
                'is_configured' => true,
            ])->values()->toArray();
            $providers = $providers->merge($custom);
        }

        return Inertia::render('Admin/Providers', [
            'providers' => $providers,
        ]);
    }

    public function updateProvider(Request $request, $id)
    {
        $provider = AdminAiAgent::findOrFail($id);

        $validated = $request->validate([
            'api_key' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        if (empty($validated['api_key'])) {
            $provider->api_key = null;
        } else {
            $provider->api_key = encrypt($validated['api_key']);
        }

        $provider->is_active = $validated['is_active'] ?? $provider->is_active;
        $provider->save();

        return response()->json(['success' => true, 'message' => $provider->name . ' updated successfully.']);
    }

    /**
     * Test a provider's API key by hitting its live /models endpoint.
     * Accepts an unsaved candidate key from the form (so user can verify
     * BEFORE saving to DB). If no candidate is provided, uses the saved key.
     */
    public function testProviderConnection(Request $request, $id)
    {
        $provider = AdminAiAgent::findOrFail($id);

        $candidate = trim((string) $request->input('api_key', ''));
        $apiKey = $candidate !== '' ? $candidate : ($provider->decrypted_api_key ?? null);

        if (empty($apiKey)) {
            return response()->json([
                'success' => false,
                'ok' => false,
                'message' => 'No API key provided. Enter a key or save one first.',
            ], 422);
        }

        try {
            $models = match ($provider->provider) {
                'openai'    => $this->testOpenAi($apiKey),
                'anthropic' => $this->testAnthropic($apiKey),
                'gemini'    => $this->testGemini($apiKey),
                'groq'      => $this->testGroq($apiKey),
                'xai'       => $this->testXai($apiKey),
                'deepseek'  => $this->testDeepSeek($apiKey),
                'mistral'   => $this->testMistral($apiKey),
                default     => null,
            };

            if ($models === null) {
                return response()->json([
                    'success' => false,
                    'ok' => false,
                    'message' => "No live test endpoint for provider '{$provider->provider}'. Check the key manually.",
                ], 422);
            }

            return response()->json([
                'success' => true,
                'ok' => true,
                'provider' => $provider->provider,
                'count' => count($models),
                'models' => $models,
            ]);
        } catch (\Exception $e) {
            Log::error('Provider test connection error', [
                'provider' => $provider->provider,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'ok' => false,
                'message' => 'Test failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    private function testOpenAi(string $key): ?array
    {
        $r = Http::withToken($key)->get('https://api.openai.com/v1/models');
        if (!$r->successful()) return $this->failFromResponse('OpenAI', $r);
        return collect($r->json('data', []))->pluck('id')->sort()->values()->toArray();
    }

    private function testAnthropic(string $key): ?array
    {
        $r = Http::withHeaders([
            'x-api-key' => $key,
            'anthropic-version' => '2023-06-01',
        ])->get('https://api.anthropic.com/v1/models');
        if (!$r->successful()) return $this->failFromResponse('Anthropic', $r);
        return collect($r->json('data', []))->pluck('id')->sort()->values()->toArray();
    }

    private function testGemini(string $key): ?array
    {
        $r = Http::get('https://generativelanguage.googleapis.com/v1beta/models', [
            'key' => $key,
        ]);
        if (!$r->successful()) return $this->failFromResponse('Gemini', $r);
        $names = collect($r->json('models', []))
            ->map(fn ($m) => str_replace('models/', '', $m['name'] ?? ''))
            ->filter()
            ->unique()
            ->sort()
            ->values();
        return $names->toArray();
    }

    private function testGroq(string $key): ?array
    {
        $r = Http::withToken($key)->get('https://api.groq.com/openai/v1/models');
        if (!$r->successful()) return $this->failFromResponse('Groq', $r);
        return collect($r->json('data', []))->pluck('id')->sort()->values()->toArray();
    }

    private function testXai(string $key): ?array
    {
        $r = Http::withToken($key)->get('https://api.x.ai/v1/models');
        if (!$r->successful()) return $this->failFromResponse('xAI', $r);
        return collect($r->json('data', []))->pluck('id')->sort()->values()->toArray();
    }

    private function testDeepSeek(string $key): ?array
    {
        $r = Http::withToken($key)->get('https://api.deepseek.com/v1/models');
        if (!$r->successful()) return $this->failFromResponse('DeepSeek', $r);
        return collect($r->json('data', []))->pluck('id')->sort()->values()->toArray();
    }

    private function testMistral(string $key): ?array
    {
        $r = Http::withToken($key)->get('https://api.mistral.ai/v1/models');
        if (!$r->successful()) return $this->failFromResponse('Mistral', $r);
        return collect($r->json('data', []))->pluck('id')->sort()->values()->toArray();
    }

    /**
     * Used inside fetchers above: returns null and lets the controller catch the
     * response body so the user sees the actual API error message.
     */
    private function failFromResponse(string $provider, $response): ?array
    {
        $status = $response->status();
        $body = $response->json();
        $msg = $body['error']['message'] ?? $body['error'] ?? $response->body() ?? "HTTP {$status}";
        throw new \RuntimeException("[{$provider}] {$msg}");
    }


    public function storeProvider(Request $request)
    {
        $validated = $request->validate([
            'provider' => 'required|string|unique:admin_ai_agents,provider',
            'name' => 'required|string',
            'api_key' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $provider = new AdminAiAgent();
        $provider->provider = $validated['provider'];
        $provider->name = $validated['name'];

        if (!empty($validated['api_key'])) {
            $provider->api_key = encrypt($validated['api_key']);
        }

        $provider->is_active = $validated['is_active'] ?? true;
        $provider->save();

        return response()->json([
            'success' => true,
            'message' => $provider->name . ' created successfully.',
            'provider' => [
                'id' => $provider->id,
                'provider' => $provider->provider,
                'name' => $provider->name,
                'api_key' => $provider->decrypted_api_key,
                'is_default' => $provider->is_default,
                'is_active' => $provider->is_active,
                'is_configured' => true,
            ],
        ]);
    }

    public function setDefaultProvider(Request $request, $id)
    {
        $provider = AdminAiAgent::findOrFail($id);

        if (!$provider->is_active) {
            return response()->json(['success' => false, 'message' => 'Activate this provider first.'], 422);
        }

        $provider->setAsDefault();

        return response()->json(['success' => true, 'message' => $provider->name . ' is now the default provider.']);
    }

    public function toggleProviderActive(Request $request, $id)
    {
        $provider = AdminAiAgent::findOrFail($id);

        // Guard: don't allow deactivating the default provider — user would lose
        // their fallback for new users without their own API key.
        if ($provider->is_default && $provider->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Remove the default designation before deactivating.',
            ], 422);
        }

        $provider->is_active = !$provider->is_active;
        $provider->save();

        return response()->json([
            'success' => true,
            'is_active' => $provider->is_active,
            'message' => $provider->name . ($provider->is_active ? ' activated.' : ' deactivated.'),
        ]);
    }

    public function removeDefaultProvider()
    {
        $provider = AdminAiAgent::where('is_default', true)->first();

        if (!$provider) {
            return response()->json(['success' => false, 'message' => 'No default provider to remove.'], 422);
        }

        $provider->is_default = false;
        $provider->save();

        return response()->json(['success' => true, 'message' => $provider->name . ' is no longer the default provider.']);
    }

    public function allSettings()
    {
        $agents = AiAgent::with('user')
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('Admin/Settings', [
            'agents' => $agents,
        ]);
    }
}