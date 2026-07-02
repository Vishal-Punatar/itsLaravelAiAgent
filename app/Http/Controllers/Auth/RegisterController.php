<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class RegisterController extends Controller
{
    public function showRegistrationForm(Request $request)
    {
        return Inertia::render('Auth/Register', [
            'errors' => $request->session()->get('errors')
                ? (object) $request->session()->get('errors')->toArray()
                : (object) [],
        ]);
    }

    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $isFirstUser = User::count() === 0;

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'is_admin' => $isFirstUser,
        ]);

        // NOTE: We intentionally do NOT auto-create a default AI agent here.
        // Previously this code copied the admin's default provider config into
        // a new user-owned AiAgent, but without an API key the agent was
        // unusable — the user would see "Model error" on every chat attempt
        // until they manually added their own API key via /ai-agents/create.
        // Users now start with zero agents and add their own via the UI.

        auth()->login($user);

        return redirect('/chat');
    }
}
