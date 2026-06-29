<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiAgent;
use App\Services\ProviderModelsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

/**
 * GET /api/agents/{agent}/live-models
 *
 * Returns the live model list for the selected agent, along with the
 * auto-selected "preferred" model.
 *
 * {agent} may be:
 *   - integer: a real AiAgent ID owned by the current user
 *   - "-1": the admin's default virtual agent (provider + API key from admin_ai_agents table)
 *
 * Used by the runtime Model Selector dropdown in the chat UI.
 * NOT persisted — every selection re-fetches from the provider's live API.
 */
class AgentLiveModelsController extends Controller
{
    public function __construct(private ProviderModelsService $service) {}

    public function show(Request $request, string $agent): JsonResponse
    {
        // Authorize: real agents must belong to the current user.
        // Virtual agent id "-1" is global (admin default) — any logged-in user can use it.
        if ($agent !== '-1') {
            $owned = AiAgent::where('id', (int) $agent)
                ->where('user_id', Auth::id())
                ->exists();
            if (!$owned) {
                return response()->json([
                    'success' => false,
                    'error' => 'Agent not found or not owned by current user.',
                ], 403);
            }
        }

        try {
            $result = $this->service->getModelsForAgent($agent);

            return response()->json([
                'success' => true,
                'models' => $result['models'],
                'preferred' => $result['preferred'],
                'source' => $result['source'],
                'provider' => $result['provider'],
                'warning' => $result['error'],
            ]);
        } catch (\Exception $e) {
            Log::error('AgentLiveModelsController error', [
                'agent' => $agent,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Failed to load models: ' . $e->getMessage(),
            ], 500);
        }
    }
}
