<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Inertia\Inertia;

/**
 * Handles "reset password" flow (the destination of the reset email):
 *   GET  /reset-password/{token}  — show new-password form, prefilled with email
 *   POST /reset-password          — process new password and log the user in
 *
 * The token is single-use; once consumed it's deleted from
 * password_reset_tokens. Default expiry is 60 minutes (configurable via
 * auth.passwords.users.expire in config/auth.php).
 */
class NewPasswordController extends Controller
{
    public function create(Request $request)
    {
        return Inertia::render('Auth/ResetPassword', [
            'email' => $request->query('email'),
            'token' => $request->route('token'),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        // Password::reset attempts to find a user matching (email, token),
        // then calls the closure to actually update the password. Returns
        // PASSWORD_RESET on success, INVALID_TOKEN / INVALID_USER otherwise.
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                ])->setRememberToken(Str::random(60));
                $user->save();
                event(new PasswordReset($user));
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            // Auto-login the user after a successful reset so they land on /chat.
            auth()->loginUsingId(
                \App\Models\User::where('email', $request->input('email'))->value('id')
            );
            return redirect('/chat')->with('flash', [
                'type' => 'success',
                'message' => 'Your password has been reset. Welcome back!',
            ]);
        }

        return back()->withErrors(['email' => __($status)])
            ->with('flash', [
                'type' => 'error',
                'message' => 'This reset link is invalid or has expired. Please request a new one.',
            ]);
    }
}
