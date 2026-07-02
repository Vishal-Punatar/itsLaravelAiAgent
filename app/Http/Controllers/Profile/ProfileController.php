<?php

namespace App\Http\Controllers\Profile;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
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
        $stats = [
            'total_chats' => $user->chats()->count(),
            'total_messages' => $user->chats()->withCount('messages')->get()->sum('messages_count'),
            'member_since' => $user->created_at->format('M j, Y'),
        ];

        return Inertia::render('Profile/Profile', [
            'agents' => $agents,
            'chats' => $chats,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_admin' => $user->is_admin,
                'theme' => $user->theme ?? 'system',
            ],
            'stats' => $stats,
        ]);
    }

    public function update(Request $request)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $user->id,
        ]);

        $user->update($validated);

        return response()->json(['success' => true, 'message' => 'Profile updated successfully!']);
    }

    public function changePassword(Request $request)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'current_password' => 'required',
            'password' => 'required|min:8|confirmed',
        ]);

        if (!Hash::check($validated['current_password'], $user->password)) {
            return response()->json(['success' => false, 'error' => 'Current password is incorrect.'], 422);
        }

        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        return response()->json(['success' => true, 'message' => 'Password changed successfully!']);
    }

    public function updateTheme(Request $request)
    {
        $validated = $request->validate([
            'theme' => 'required|in:light,dark,system',
        ]);

        Auth::user()->update(['theme' => $validated['theme']]);

        return response()->json(['success' => true, 'theme' => $validated['theme']]);
    }
}
