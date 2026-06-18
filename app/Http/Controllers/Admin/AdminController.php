<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiAgent;
use App\Models\AiSetting;
use App\Models\Chat;
use App\Models\ChatMessage;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AdminController extends Controller
{
    public function index()
    {
        $stats = [
            'total_users' => User::count(),
            'total_chats' => Chat::count(),
            'total_messages' => ChatMessage::count(),
            'total_agents' => AiAgent::count(),
        ];

        return Inertia::render('Admin/Dashboard', [
            'stats' => $stats,
        ]);
    }

    public function users()
    {
        $users = User::with('aiAgents')
            ->withCount('chats', 'messages')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'is_admin' => $user->is_admin,
                    'chats_count' => $user->chats_count,
                    'messages_count' => $user->messages_count,
                    'created_at' => $user->created_at->toISOString(),
                ];
            });

        return Inertia::render('Admin/Users', [
            'users' => $users,
        ]);
    }

    public function editUser($id)
    {
        $user = User::findOrFail($id);

        return Inertia::render('Admin/UserEdit', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_admin' => $user->is_admin,
            ],
        ]);
    }

    public function updateUser(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $id,
            'is_admin' => 'boolean',
            // Password is optional. If blank/unset, we keep the existing one.
            // If provided, must be 8+ chars and match the confirmation field.
            'password' => 'nullable|string|min:8|confirmed',
        ]);

        // Strip password from the validated array if it was left blank,
        // so we never overwrite the existing hash with an empty string.
        $password = $validated['password'] ?? null;
        unset($validated['password']);
        if (isset($validated['password_confirmation'])) {
            unset($validated['password_confirmation']);
        }

        $user->update($validated);

        if (!empty($password)) {
            // The User model has 'password' => 'hashed' cast, so passing
            // the plaintext here will be auto-hashed by Eloquent.
            $user->update(['password' => $password]);
        }

        $message = !empty($password)
            ? 'User and password updated successfully!'
            : 'User updated successfully!';

        return redirect('/admin/users')->with('success', $message);
    }

    public function destroyUser($id)
    {
        $user = User::findOrFail($id);

        if ($user->id === auth()->id()) {
            return redirect('/admin/users')->withErrors(['delete' => 'You cannot delete yourself!']);
        }

        $user->chats()->delete();
        $user->aiAgents()->delete();
        $user->aiSetting?->delete();
        $user->delete();

        return redirect('/admin/users')->with('success', 'User deleted successfully!');
    }

    public function models()
    {
        $models = AiSetting::allowedModels();

        $cleanModels = [];
        foreach ($models as $key => $provider) {
            $cleanModels[$key] = [
                'label' => $provider['label'],
                'models' => $provider['models'],
            ];
        }

        return Inertia::render('Admin/Models', [
            'models' => $cleanModels,
        ]);
    }

    public function allSettings()
    {
        $agents = AiAgent::with('user')
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return Inertia::render('Admin/Settings', [
            'agents' => $agents,
        ]);
    }
}