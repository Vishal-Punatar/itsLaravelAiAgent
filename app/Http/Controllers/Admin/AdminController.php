<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiAgent;
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
            ->get();

        return Inertia::render('Admin/Users', [
            'users' => $users,
        ]);
    }

    public function editUser($id)
    {
        $user = User::findOrFail($id);
        return Inertia::render('Admin/UserEdit', [
            'user' => $user,
        ]);
    }

    public function updateUser(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $id,
            'is_admin' => 'boolean',
        ]);

        $user->update($validated);

        return redirect('/admin/users')->with('success', 'User updated successfully!');
    }

    public function destroyUser($id)
    {
        $user = User::findOrFail($id);

        if ($user->id === auth()->id()) {
            return redirect('/admin/users')->withErrors(['delete' => 'You cannot delete yourself!']);
        }

        $user->chats()->delete();
        $user->aiAgents()->delete();
        $user->delete();

        return redirect('/admin/users')->with('success', 'User deleted successfully!');
    }

    public function models()
    {
        $models = AiAgent::allowedModels();

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
            ->get();

        return Inertia::render('Admin/Settings', [
            'agents' => $agents,
        ]);
    }
}
