<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiAgent;
use App\Models\AiProviderModel;
use App\Models\AiProvider;
use App\Models\Chat;
use App\Models\ChatMessage;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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

        // Default AI provider
        $defaultProvider = AiProvider::where('is_default', true)->first();

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
            'default_provider' => $defaultProvider ? [
                'name' => $defaultProvider->label,
                'model' => $defaultProvider->default_model,
                'is_active' => $defaultProvider->is_active,
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

    public function models()
    {
        $providers = AiAgent::allowedModels();
        $dbModels = AiProviderModel::all()->groupBy('provider_key');

        $cleanModels = [];
        foreach ($providers as $key => $provider) {
            $dbProviderModels = $dbModels->get($key, collect());

            if ($dbProviderModels->isEmpty()) {
                continue;
            }

            $modelList = [];
            foreach ($dbProviderModels as $m) {
                $modelList[$m->model_id] = [
                    'label' => $m->model_label,
                    'status' => $m->status,
                ];
            }

            $dbProvider = AiProvider::where('key', $key)->active()->first();
            $hasApiKey = $dbProvider && !empty($dbProvider->decrypted_api_key);

            $cleanModels[$key] = [
                'label' => $provider['label'],
                'models' => $modelList,
                'has_api_key' => $hasApiKey,
            ];
        }

        return Inertia::render('Admin/Models', [
            'models' => $cleanModels,
        ]);
    }
    public function providers()
    {
        $dbModels = AiProviderModel::where('is_supported', true)
            ->where('status', 'active')
            ->get()
            ->groupBy('provider_key');

        $providers = AiProvider::orderBy('key')->get()->map(fn ($p) => [
            'id' => $p->id,
            'key' => $p->key,
            'label' => $p->label,
            'api_key' => $p->decrypted_api_key,
            'is_default' => $p->is_default,
            'is_active' => $p->is_active,
            'default_model' => $p->default_model,
        ]);

        return Inertia::render('Admin/Providers', [
            'providers' => $providers,
            'models' => $this->buildModelsListFromDb($dbModels),
        ]);
    }

    private function buildModelsListFromDb($dbModels): array
    {
        $clean = [];
        foreach ($dbModels as $providerKey => $models) {
            $modelList = [];
            foreach ($models as $model) {
                $modelList[$model->model_id] = $model->model_label;
            }
            $clean[$providerKey] = [
                'label' => ucfirst($providerKey),
                'models' => $modelList,
            ];
        }
        return $clean;
    }

    public function updateProvider(Request $request, $id)
    {
        $provider = AiProvider::findOrFail($id);

        $validated = $request->validate([
            'api_key' => 'nullable|string',
            'default_model' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        if (empty($validated['api_key'])) {
            $provider->api_key = null;
        } else {
            $provider->api_key = encrypt($validated['api_key']);
        }

        $provider->default_model = $validated['default_model'] ?? null;
        $provider->is_active = $validated['is_active'] ?? $provider->is_active;
        $provider->save();

        return response()->json(['success' => true, 'message' => $provider->label . ' updated successfully.']);
    }

    public function setDefaultProvider(Request $request, $id)
    {
        $provider = AiProvider::findOrFail($id);

        if (!$provider->is_active) {
            return response()->json(['success' => false, 'message' => 'Activate this provider first.'], 422);
        }

        $provider->setAsDefault();

        return response()->json(['success' => true, 'message' => $provider->label . ' is now the default provider.']);
    }

    public function removeDefaultProvider()
    {
        $provider = AiProvider::where('is_default', true)->first();

        if (!$provider) {
            return response()->json(['success' => false, 'message' => 'No default provider to remove.'], 422);
        }

        $provider->is_default = false;
        $provider->save();

        return response()->json(['success' => true, 'message' => $provider->label . ' is no longer the default provider.']);
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
