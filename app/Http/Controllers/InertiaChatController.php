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
    /**
     * Sidebar uses two separate slices:
     *   - favouriteChats: un-paginated, always the full list.
     *   - allChatsPage: paginated first page of non-favourite chats.
     *
     * Plus the `recentChats` prop with up to 4 chats for the dashboard
     * "Recent chats" grid on /chat (no chat opened yet).
     */
    private function mapChatSummary($chat): array
    {
        return [
            'id' => $chat->id,
            'title' => $chat->title,
            'is_pinned' => (bool) $chat->is_pinned,
            'pinned_order' => $chat->pinned_order,
            'is_favourite' => (bool) $chat->is_favourite,
            'favourited_at' => $chat->favourited_at ? $chat->favourited_at->toISOString() : null,
            'created_at' => $chat->created_at->toISOString(),
        ];
    }

    /**
     * Build the full sidebar-chat shape that ChatLayout reads:
     *   - favouriteChats  : un-paginated, full list
     *   - allChatsPage    : paginated first page of non-favourites
     *                       (with has_more + next_page_url at top level)
     *   - recentChats     : top 4 by updated_at (dashboard grid)
     *
     * Reused by index(), show(), and any other Inertia page that needs a
     * paginated sidebar (AiAgentController, ProfileController, etc.).
     */
    public function buildSidebarChatProps(int $perPage = 20): array
    {
        $user = Auth::user();

        $favouriteChats = $user->chats()
            ->where('is_favourite', true)
            ->orderByRaw('COALESCE(favourited_at, "1970-01-01") DESC, updated_at DESC')
            ->get()
            ->map(fn ($chat) => $this->mapChatSummary($chat))
            ->values()
            ->toArray();

        $allChatsPage = $user->chats()
            ->where('is_favourite', false)
            ->orderByRaw('is_pinned DESC, COALESCE(pinned_order, 999999) ASC, updated_at DESC')
            ->paginate($perPage)
            ->withPath('/api/chats');

        $allChatsPage->setCollection(
            collect($allChatsPage->items())->map(fn ($chat) => $this->mapChatSummary($chat))
        );

        $recentChats = $user->chats()
            ->with(['messages' => function ($q) {
                $q->orderBy('created_at', 'desc')->limit(1);
            }])
            ->orderBy('updated_at', 'desc')
            ->limit(4)
            ->get()
            ->map(function ($chat) {
                $latest = $chat->messages->first();
                return [
                    'id' => $chat->id,
                    'title' => $chat->title,
                    'is_favourite' => (bool) $chat->is_favourite,
                    'is_pinned' => (bool) $chat->is_pinned,
                    'updated_at' => $chat->updated_at->toISOString(),
                    'latest_message' => $latest ? [
                        'role' => $latest->role,
                        'content' => $latest->content,
                        'created_at' => $latest->created_at->toISOString(),
                    ] : null,
                ];
            })
            ->values()
            ->toArray();

        return [
            'favouriteChats' => $favouriteChats,
            'allChatsPage' => [
                'data' => $allChatsPage->items(),
                'current_page' => $allChatsPage->currentPage(),
                'last_page' => $allChatsPage->lastPage(),
                'per_page' => $allChatsPage->perPage(),
                'total' => $allChatsPage->total(),
                'has_more' => $allChatsPage->hasMorePages(),
                'next_page_url' => $allChatsPage->nextPageUrl(),
            ],
            'recentChats' => $recentChats,
        ];
    }

    public function index()
    {
        $user = Auth::user();

        // Favourites — un-paginated so the sidebar "Favourites" header can
        // always show every starred chat, no matter how long the list grows.
        $favouriteChats = $user->chats()
            ->where('is_favourite', true)
            ->orderByRaw('COALESCE(favourited_at, "1970-01-01") DESC, updated_at DESC')
            ->get()
            ->map(fn ($chat) => $this->mapChatSummary($chat))
            ->values()
            ->toArray();

        // All Chats (non-favourites) — paginated, first page only. The
        // sidebar's "Load more" sentinel hits /api/chats for subsequent
        // pages.
        $allChatsPage = $user->chats()
            ->where('is_favourite', false)
            ->orderByRaw('is_pinned DESC, COALESCE(pinned_order, 999999) ASC, updated_at DESC')
            ->paginate(20)
            // Pin the paginator's URL to /api/chats so:
            //   1. `next_page_url` resolves to a real JSON endpoint (not
            //      the Inertia /chat page, which is the default path).
            //   2. `withQueryString()` preserves any per_page filter.
            ->withPath('/api/chats');

        $items = collect($allChatsPage->items())->map(fn ($chat) => $this->mapChatSummary($chat));
        $allChatsPage->setCollection($items);

        // Wrap the paginator in a plain array with `has_more` and
        // `next_page_url` exposed at the top level (matching the shape
        // of the /api/chats JSON endpoint, which the React frontend
        // already reads). Laravel's default toArray() uses
        // `has_more_pages` which the frontend doesn't read.
        $allChatsPageForInertia = [
            'data' => $allChatsPage->items(),
            'current_page' => $allChatsPage->currentPage(),
            'last_page' => $allChatsPage->lastPage(),
            'per_page' => $allChatsPage->perPage(),
            'total' => $allChatsPage->total(),
            'has_more' => $allChatsPage->hasMorePages(),
            'next_page_url' => $allChatsPage->nextPageUrl(),
        ];

        // Recent chats for the dashboard grid on /chat — top 4 by updated_at,
        // eager-loading the latest message so the dashboard can show a
        // last-message preview.
        $recentChats = $user->chats()
            ->with(['messages' => function ($q) {
                $q->orderBy('created_at', 'desc')->limit(1);
            }])
            ->orderBy('updated_at', 'desc')
            ->limit(4)
            ->get()
            ->map(function ($chat) {
                return [
                    'id' => $chat->id,
                    'title' => $chat->title,
                    'is_pinned' => (bool) $chat->is_pinned,
                    'pinned_order' => $chat->pinned_order,
                    'is_favourite' => (bool) $chat->is_favourite,
                    'favourited_at' => $chat->favourited_at ? $chat->favourited_at->toISOString() : null,
                    'messages' => $chat->messages->map(fn ($msg) => [
                        'id' => $msg->id,
                        'role' => $msg->role,
                        'message' => $msg->message,
                        'attachments' => $msg->attachments,
                        'created_at' => $msg->created_at->toISOString(),
                    ])->toArray(),
                    'created_at' => $chat->created_at->toISOString(),
                ];
            })
            ->values()
            ->toArray();

        $agents = $user->aiAgents()->get()->map(function ($agent) {
            return [
                'id' => $agent->id,
                'name' => $agent->name,
                'provider' => $agent->provider,
                'is_default' => $agent->is_default,
                'has_api_key' => !empty($agent->decrypted_api_key),
            ];
        })->toArray();

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
            'favouriteChats' => $favouriteChats,
            'allChatsPage' => $allChatsPageForInertia,
            'recentChats' => $recentChats,
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
            ->with(['messages' => function ($q) {
                $q->orderBy('created_at', 'asc');
            }])
            ->firstOrFail();

        // Same shape as index(): split favourites vs paginated all-chats.
        $favouriteChats = $user->chats()
            ->where('is_favourite', true)
            ->orderByRaw('COALESCE(favourited_at, "1970-01-01") DESC, updated_at DESC')
            ->get()
            ->map(fn ($chat) => $this->mapChatSummary($chat))
            ->values()
            ->toArray();

        $allChatsPage = $user->chats()
            ->where('is_favourite', false)
            ->orderByRaw('is_pinned DESC, COALESCE(pinned_order, 999999) ASC, updated_at DESC')
            ->paginate(20)
            ->withPath('/api/chats');

        $items = collect($allChatsPage->items())->map(fn ($chat) => $this->mapChatSummary($chat));
        $allChatsPage->setCollection($items);

        // Wrap the paginator in a plain array with `has_more` and
        // `next_page_url` exposed at the top level (same shape as the
        // /api/chats JSON endpoint that ChatLayout already reads).
        $allChatsPageForInertia = [
            'data' => $allChatsPage->items(),
            'current_page' => $allChatsPage->currentPage(),
            'last_page' => $allChatsPage->lastPage(),
            'per_page' => $allChatsPage->perPage(),
            'total' => $allChatsPage->total(),
            'has_more' => $allChatsPage->hasMorePages(),
            'next_page_url' => $allChatsPage->nextPageUrl(),
        ];

        $agents = $user->aiAgents()->get()->map(function ($agent) {
            return [
                'id' => $agent->id,
                'name' => $agent->name,
                'provider' => $agent->provider,
                'is_default' => $agent->is_default,
                'has_api_key' => !empty($agent->decrypted_api_key),
            ];
        })->toArray();

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
            'favouriteChats' => $favouriteChats,
            'allChatsPage' => $allChatsPageForInertia,
            'recentChats' => [],
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

    /**
     * Return a paginated chunk of the user's chats for the sidebar's
     * infinite scroll. Pure-runtime endpoint — never persisted.
     *
     * The chunk keeps the same sort order as index()/show() so already-
     * rendered favourites stay pinned at top, and "All Chats" grows in the
     * same order the user would see if the whole list were loaded at once.
     *
     * If a `q` (search) query is provided, we filter by chat title before
     * paginating. The frontend resets to page 1 when the search term
     * changes.
     */
    public function chatsPage(Request $request)
    {
        $user = Auth::user();

        $perPage = in_array((int) $request->query('per_page'), [10, 15, 20, 50, 100], true)
            ? (int) $request->query('per_page')
            : 20;

        $query = $user->chats()
            ->orderByRaw('is_favourite DESC, COALESCE(favourited_at, "1970-01-01") DESC, is_pinned DESC, COALESCE(pinned_order, 999999) ASC, updated_at DESC');

        // Sidebar search box filters the list server-side. We don't need
        // eager-loaded messages for the sidebar (the chat item only shows
        // title + status), so this stays a single-shot query.
        if ($search = trim((string) $request->query('q', ''))) {
            $query->where('title', 'like', '%' . str_replace(['%', '_'], ['\\%', '\\_'], $search) . '%');
        }

        $paginator = $query->paginate($perPage)
            ->withQueryString()
            // Pin the URL to /api/chats so `next_page_url` points to the
            // JSON endpoint, not the Inertia /chat page.
            ->withPath('/api/chats');

        $items = collect($paginator->items())->map(fn ($chat) => $this->mapChatSummary($chat));

        return response()->json([
            'data' => $items->values(),
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'next_page_url' => $paginator->nextPageUrl(),
            'has_more' => $paginator->hasMorePages(),
        ]);
    }
}
