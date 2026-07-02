<?php

namespace App\Http\Controllers;

use App\Models\AiAgent;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AiAgentController extends Controller
{
    private function getUserData()
    {
        $user = auth()->user();
        $agents = $user->aiAgents()->get()->map(fn($a) => [
            'id' => $a->id,
            'name' => $a->name,
            'provider' => $a->provider,
            'is_default' => $a->is_default,
        ]);
        $chats = $user->chats()
            ->orderByRaw('is_favourite DESC, COALESCE(favourited_at, "1970-01-01") DESC, is_pinned DESC, COALESCE(pinned_order, 999999) ASC, updated_at DESC')
            ->limit(20)
            ->get()
            ->map(fn($c) => [
                'id' => $c->id,
                'title' => $c->title,
                'created_at' => $c->created_at->toIso8601String(),
                'is_favourite' => (bool) $c->is_favourite,
                'is_pinned' => (bool) $c->is_pinned,
                'favourited_at' => $c->favourited_at?->toIso8601String() ?? null,
            ]);
        return [
            'agents' => $agents,
            'chats' => $chats,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_admin' => $user->is_admin,
                'theme' => $user->theme ?? 'system',
            ],
        ];
    }

    /**
     * Display a listing of the user's AI agents.
     */
    public function index()
    {
        $data = $this->getUserData();
        return Inertia::render('Agents/Agents', $data);
    }

    /**
     * Show the form for creating a new AI agent.
     */
    public function create()
    {
        $data = $this->getUserData();
        return Inertia::render('Agents/AgentForm', $data);
    }

    /**
     * Store a newly created AI agent.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'provider' => 'required|in:openai,gemini,anthropic,groq,xai,deepseek,mistral,azure,bedrock,ollama,openrouter',
            'api_key' => 'required|string',
        ]);

        // If this is the first agent or user wants it as default, set as default
        $isDefault = !AiAgent::where('user_id', auth()->id())->exists() || $request->boolean('is_default');

        // If setting as default, unset other defaults
        if ($isDefault) {
            AiAgent::where('user_id', auth()->id())->update(['is_default' => false]);
        }

        $agent = AiAgent::create([
            'user_id' => auth()->id(),
            'name' => $validated['name'],
            'provider' => $validated['provider'],
            'api_key' => encrypt($validated['api_key']),
            'is_default' => $isDefault,
        ]);

        Inertia::flash('success', 'Agent "' . $agent->name . '" created successfully.');
        return redirect()->route('ai-agents.index');
    }

    /**
     * Show the form for editing the specified AI agent.
     */
    public function edit(AiAgent $aiAgent)
    {
        $this->authorize('update', $aiAgent);
        $data = $this->getUserData();
        $data['agent'] = [
            'id' => $aiAgent->id,
            'name' => $aiAgent->name,
            'provider' => $aiAgent->provider,
            'is_default' => $aiAgent->is_default,
        ];
        $data['isEdit'] = true;
        return Inertia::render('Agents/AgentForm', $data);
    }

    /**
     * Update the specified AI agent.
     */
    public function update(Request $request, AiAgent $aiAgent)
    {
        $this->authorize('update', $aiAgent);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'provider' => 'required|in:openai,gemini,anthropic,groq,xai,deepseek,mistral,azure,bedrock,ollama,openrouter',
            'api_key' => 'nullable|string',
            'is_default' => 'boolean',
        ]);

        // If setting as default, unset other defaults
        if ($request->boolean('is_default')) {
            AiAgent::where('user_id', auth()->id())->where('id', '!=', $aiAgent->id)->update(['is_default' => false]);
        }

        $updateData = [
            'name' => $validated['name'],
            'provider' => $validated['provider'],
            'is_default' => $request->boolean('is_default'),
        ];

        // Only update API key if provided
        if (!empty($validated['api_key'])) {
            $updateData['api_key'] = encrypt($validated['api_key']);
        }

        $aiAgent->update($updateData);

        Inertia::flash('success', 'Agent "' . $aiAgent->name . '" updated successfully.');
        return redirect()->route('ai-agents.index');
    }

    /**
     * Remove the specified AI agent.
     */
    public function destroy(AiAgent $aiAgent)
    {
        $this->authorize('delete', $aiAgent);
        $name = $aiAgent->name;
        $aiAgent->delete();
        Inertia::flash('success', 'Agent "' . $name . '" deleted successfully.');
        return redirect()->route('ai-agents.index');
    }

    /**
     * Set an AI agent as default.
     */
    public function setDefault(AiAgent $aiAgent)
    {
        $this->authorize('update', $aiAgent);

        AiAgent::where('user_id', auth()->id())->update(['is_default' => false]);
        $aiAgent->update(['is_default' => true]);

        return response()->json(['success' => true]);
    }

    /**
     * Get all AI agents for the current user (API endpoint).
     */
    public function list()
    {
        $agents = AiAgent::where('user_id', auth()->id())
            ->select('id', 'name', 'provider', 'is_default')
            ->get();

        return response()->json($agents);
    }
}
