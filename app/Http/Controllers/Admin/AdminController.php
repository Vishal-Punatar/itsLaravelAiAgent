<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiAgent;
use App\Models\Chat;
use App\Models\ChatMessage;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
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
