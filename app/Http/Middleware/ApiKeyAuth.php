<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApiKeyAuth
{
    /**
     * Handle an incoming request.
     *
     * Validates API key from X-API-KEY header against configured key.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $apiKey = $request->header('X-API-KEY');
        $validKey = env('LARAVEL_API_KEY');

        if (empty($apiKey) || empty($validKey)) {
            return response()->json(['error' => 'API key required'], 401);
        }

        if (!hash_equals($validKey, $apiKey)) {
            return response()->json(['error' => 'Invalid API key'], 401);
        }

        return $next($request);
    }
}