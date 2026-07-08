<?php

namespace App\Http\Controllers\Profile;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Support\AdminDefaultProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class ProfileController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $agents = $user->aiAgents()->get()->map(fn($a) => [
            'id' => $a->id,
            'name' => $a->name,
            'provider' => $a->provider,
            'model' => $a->model,
            'is_default' => $a->is_default,
        ]);
        $chats = $user->chats()
            ->orderByDesc('created_at')
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
        // Sidebar chats: paginated three-slice shape, same as /chat and
        // /chat/{id}. Reused from InertiaChatController::buildSidebarChatProps()
        // so the sidebar on /profile supports the same infinite-scroll
        // "Load more" pattern.
        $chatProps = app(\App\Http\Controllers\InertiaChatController::class)
            ->buildSidebarChatProps();
        $stats = [
            'total_chats' => $user->chats()->count(),
            'total_messages' => $user->chats()->withCount('messages')->get()->sum('messages_count'),
            'member_since' => $user->created_at->format('M j, Y'),
        ];

        return Inertia::render('Profile/Profile', [
            'agents' => $agents,
            'favouriteChats' => $chatProps['favouriteChats'],
            'allChatsPage' => $chatProps['allChatsPage'],
            'recentChats' => $chatProps['recentChats'],
            // Keep `chats` (legacy 20-item list) so the profile page's
            // "Recent chats" cards continue to render — the page reads
            // `chats` directly, not from the sidebar's allChatsPage.
            'chats' => $chats,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_admin' => $user->is_admin,
                'theme' => $user->theme ?? 'system',
            ],
            'stats' => $stats,
            // Drives the "New Chat" button in the ChatLayout sidebar. Button
            // is enabled when the user has agents OR the admin default has
            // an API key configured (so brand-new users can chat immediately).
            'adminDefaultProvider' => AdminDefaultProvider::payload(),
        ]);
    }

    /**
     * Profile update — returns Inertia redirect with typed flash on success.
     * Validation failures (Laravel's validate() throws) are auto-converted
     * to a 422 response by Laravel's exception handler; no flash is set
     * so the frontend shows ONLY field-level errors (never a toast).
     */
    public function update(Request $request)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $user->id,
        ]);

        $user->update($validated);

        return back()->with('flash', [
            'type' => 'success',
            'message' => 'Profile updated successfully!',
        ]);
    }

    /**
     * Password change — only sets a flash on success. ALL failure paths
     * throw ValidationException so the response is a 422 (not 302):
     *   - Field validation: $request->validate() throws → 422
     *   - Wrong current password: ValidationException::withMessages(...) → 422
     * Inertia surfaces the 422 errors as `$page.props.errors` and the
     * frontend's useEffect on pageErrors renders them as field-level only
     * (never a toast).
     */
    public function changePassword(Request $request)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'current_password' => 'required',
            'password' => 'required|min:8|confirmed',
        ]);

        if (!Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => 'Current password is incorrect.',
            ]);
        }

        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        return back()->with('flash', [
            'type' => 'success',
            'message' => 'Password changed successfully!',
        ]);
    }

    /**
     * Theme updates are silent (UI flips instantly from local state) so we
     * don't flash a toast. We still redirect back so the page props refresh.
     */
    public function updateTheme(Request $request)
    {
        $validated = $request->validate([
            'theme' => 'required|in:light,dark,system',
        ]);

        Auth::user()->update(['theme' => $validated['theme']]);

        return back();
    }
}
