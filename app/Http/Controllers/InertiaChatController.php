<?php

namespace App\Http\Controllers;

use App\Models\AiAgent;
use App\Models\AiProvider;
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
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(function ($chat) {
                return [
                    'id' => $chat->id,
                    'title' => $chat->title,
                    'is_pinned' => $chat->is_pinned,
                    'pinned_order' => $chat->pinned_order,
                    'messages' => $chat->messages->map(function ($msg) {
                        return [
                            'id' => $msg->id,
                            'role' => $msg->role,
                            'message' => $msg->message,
                            'attachments' => $msg->attachments ? json_decode($msg->attachments, true) : null,
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
        $adminDefault = AiProvider::getDefault();

        // If user has no agents, create a virtual agent from admin's default provider
        if (!$userHasAgents && $adminDefault) {
            $agents = [[
                'id' => -1, // Virtual ID — not a real DB record
                'name' => $adminDefault->label . ' (Admin Default)',
                'provider' => $adminDefault->key,
                'is_default' => true,
                'has_api_key' => !empty($adminDefault->decrypted_api_key),
                'is_admin_default' => true,
            ]];
        }

        $adminDefaultProvider = $adminDefault ? [
            'key' => $adminDefault->key,
            'label' => $adminDefault->label,
            'has_api_key' => !empty($adminDefault->decrypted_api_key),
            'default_model' => $adminDefault->effective_model,
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
            ->orderByRaw('is_pinned DESC, COALESCE(pinned_order, 999999) ASC, updated_at DESC')
            ->get()
            ->map(function ($c) {
                return [
                    'id' => $c->id,
                    'title' => $c->title,
                    'is_pinned' => $c->is_pinned,
                    'pinned_order' => $c->pinned_order,
                    'messages' => $c->messages->map(function ($msg) {
                        return [
                            'id' => $msg->id,
                            'role' => $msg->role,
                            'message' => $msg->message,
                            'attachments' => $msg->attachments ? json_decode($msg->attachments, true) : null,
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
        $adminDefault = AiProvider::getDefault();

        if (!$userHasAgents && $adminDefault) {
            $agents = [[
                'id' => -1,
                'name' => $adminDefault->label . ' (Admin Default)',
                'provider' => $adminDefault->key,
                'is_default' => true,
                'has_api_key' => !empty($adminDefault->decrypted_api_key),
                'is_admin_default' => true,
            ]];
        }

        $adminDefaultProvider = $adminDefault ? [
            'key' => $adminDefault->key,
            'label' => $adminDefault->label,
            'has_api_key' => !empty($adminDefault->decrypted_api_key),
            'default_model' => $adminDefault->effective_model,
        ] : null;

        $chatData = [
            'id' => $chat->id,
            'title' => $chat->title,
            'messages' => $chat->messages->map(function ($msg) {
                return [
                    'id' => $msg->id,
                    'role' => $msg->role,
                    'message' => $msg->message,
                    'attachments' => $msg->attachments ? json_decode($msg->attachments, true) : null,
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
