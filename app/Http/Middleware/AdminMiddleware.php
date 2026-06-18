<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AdminMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!Auth::check()) {
            return redirect('/login');
        }

        if (!Auth::user()->is_admin) {
            // Log out non-admin users trying to access admin
            Auth::logout();
            return redirect('/login')->withErrors(['admin' => 'Access denied. Administrator privileges required.']);
        }

        return $next($request);
    }
}