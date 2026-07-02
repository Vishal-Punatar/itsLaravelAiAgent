<?php

namespace App\Http\Controllers;

use App\Models\AiAgent;
use App\Models\AdminAiAgent;
use App\Models\Chat;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class InertiaChatController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        $chats = $user->chats()
            ->with(['messages' => function($q) {
                $q->orderBy('created_at', 'asc');
            }])
            // Same sort as show(): favourited (most recent first), then pinned,
            // then by updated_at desc.
            ->orderByRaw('is_favourite DESC, COALESCE(favourited_at, "1970-01-01") DESC, is_pinned DESC, COALESCE(pinned_order, 999999) ASC, updated_at DESC')
            ->get()
            ->map(function ($chat) {
                return [
                    'id' => $chat->id,
                    'title' => $chat->title,
                    'is_pinned' => $chat->is_pinned,
                    'pinned_order' => $chat->pinned_order,
                    'is_favourite' => (bool) $chat->is_favourite,
                    'favourited_at' => $chat->favourited_at ? $chat->favourited_at->toISOString() : null,
                    'messages' => $chat->messages->map(function ($msg) {
                        return [
                            'id' => $msg->id,
                            'role' => $msg->role,
                            'message' => $msg->message,
                            'attachments' => $msg->attachments,
                            'created_at' => $msg->created_at->toISOString(),
                        ];
                    })->toArray(),
                    'created_at' => $chat->created_at->toISOString(),
                ];
            })
            ->toArray();

        $agents = $user->aiAgents()
            ->get()
            ->map(function ($agent) {
                return [
                    'id' => $agent->id,
                    'name' => $agent->name,
                    'provider' => $agent->provider,
                    'is_default' => $agent->is_default,
                    'has_api_key' => !empty($agent->decrypted_api_key),
                ];
            })
            ->toArray();

        $userHasAgents = count($agents) > 0;
        $adminDefault = AdminAiAgent::getDefault();

        // If user has no agents, create a virtual agent from admin's default provider
        if (!$userHasAgents && $adminDefault) {
            $agents = [[
                'id' => -1, // Virtual ID — not a real DB record
                'name' => $adminDefault->name,
                'provider' => $adminDefault->provider,
                'is_default' => true,
                'has_api_key' => !empty($adminDefault->decrypted_api_key),
                'is_admin_default' => true,
            ]];
        }

        $adminDefaultProvider = $adminDefault ? [
            'provider' => $adminDefault->provider,
            'name' => $adminDefault->name,
            'has_api_key' => !empty($adminDefault->decrypted_api_key),
        ] : null;

        return Inertia::render('Chat', [
            'agents' => $agents,
            'chats' => $chats,
            'chat' => null,
            'user' => [
                'id' => $user->id,
                'is_admin' => $user->is_admin,
                'theme' => $user->theme ?? 'system',
                'name' => $user->name,
                'email' => $user->email,
            ],
            'userHasAgents' => $userHasAgents,
            'adminDefaultProvider' => $adminDefaultProvider,
        ]);
    }

    public function show($id)
    {
        $user = Auth::user();

        $chat = Chat::where('id', $id)
            ->where('user_id', $user->id)
            ->with(['messages' => function($q) {
                $q->orderBy('created_at', 'asc');
            }])
            ->firstOrFail();

        $chats = $user->chats()
            ->with(['messages' => function($q) {
                $q->orderBy('created_at', 'asc');
            }])
            // Sort: favourited (most recently favourited first), then pinned,
            // then by updated_at desc. COALESCE keeps nulls last in the
            // secondary order. The per-user "favourites at top" UX.
            ->orderByRaw('is_favourite DESC, COALESCE(favourited_at, "1970-01-01") DESC, is_pinned DESC, COALESCE(pinned_order, 999999) ASC, updated_at DESC')
            ->get()
            ->map(function ($c) {
                return [
                    'id' => $c->id,
                    'title' => $c->title,
                    'is_pinned' => $c->is_pinned,
                    'pinned_order' => $c->pinned_order,
                    'is_favourite' => (bool) $c->is_favourite,
                    'favourited_at' => $c->favourited_at ? $c->favourited_at->toISOString() : null,
                    'messages' => $c->messages->map(function ($msg) {
                        return [
                            'id' => $msg->id,
                            'role' => $msg->role,
                            'message' => $msg->message,
                            'attachments' => $msg->attachments,
                            'created_at' => $msg->created_at->toISOString(),
                        ];
                    })->toArray(),
                    'created_at' => $c->created_at->toISOString(),
                ];
            })
            ->toArray();

        $agents = $user->aiAgents()
            ->get()
            ->map(function ($agent) {
                return [
                    'id' => $agent->id,
                    'name' => $agent->name,
                    'provider' => $agent->provider,
                    'is_default' => $agent->is_default,
                    'has_api_key' => !empty($agent->decrypted_api_key),
                ];
            })
            ->toArray();

        $userHasAgents = count($agents) > 0;
        $adminDefault = AdminAiAgent::getDefault();

        if (!$userHasAgents && $adminDefault) {
            $agents = [[
                'id' => -1,
                'name' => $adminDefault->name,
                'provider' => $adminDefault->provider,
                'is_default' => true,
                'has_api_key' => !empty($adminDefault->decrypted_api_key),
                'is_admin_default' => true,
            ]];
        }

        $adminDefaultProvider = $adminDefault ? [
            'provider' => $adminDefault->provider,
            'name' => $adminDefault->name,
            'has_api_key' => !empty($adminDefault->decrypted_api_key),
        ] : null;

        $chatData = [
            'id' => $chat->id,
            'title' => $chat->title,
            'is_pinned' => (bool) $chat->is_pinned,
            'pinned_order' => $chat->pinned_order,
            'is_favourite' => (bool) $chat->is_favourite,
            'favourited_at' => $chat->favourited_at ? $chat->favourited_at->toISOString() : null,
            'messages' => $chat->messages->map(function ($msg) {
                return [
                    'id' => $msg->id,
                    'role' => $msg->role,
                    'message' => $msg->message,
                    'attachments' => $msg->attachments,
                    'created_at' => $msg->created_at->toISOString(),
                ];
            })->toArray(),
            'created_at' => $chat->created_at->toISOString(),
        ];

        return Inertia::render('Chat', [
            'agents' => $agents,
            'chats' => $chats,
            'chat' => $chatData,
            'user' => [
                'id' => $user->id,
                'is_admin' => $user->is_admin,
                'theme' => $user->theme ?? 'system',
                'name' => $user->name,
                'email' => $user->email,
            ],
            'userHasAgents' => $userHasAgents,
            'adminDefaultProvider' => $adminDefaultProvider,
        ]);
    }
}
