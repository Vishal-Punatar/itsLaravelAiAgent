<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\AiAgent;
use App\Models\AdminAiAgent;
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

        // Auto-create an AI agent using the admin's default provider
        $adminDefault = AdminAiAgent::getDefault();
        if ($adminDefault) {
            AiAgent::create([
                'user_id' => $user->id,
                'name' => $adminDefault->name . ' Agent',
                'provider' => $adminDefault->provider,
                'is_default' => true,
            ]);
        }

        auth()->login($user);

        return redirect('/chat');
    }
}