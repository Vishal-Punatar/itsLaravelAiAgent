<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Auth\Middleware\RedirectIfAuthenticated;
use App\Http\Middleware\ApiKeyAuth;
use App\Http\Middleware\AdminMiddleware;

// Redirect authenticated users away from guest routes to /chat instead of /
RedirectIfAuthenticated::redirectUsing(fn () => '/chat');

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'auth.apikey' => ApiKeyAuth::class,
            'admin' => AdminMiddleware::class,
        ]);
        $middleware->validateCsrfTokens(except: [
            '/login',
            '/register',
        ]);
        // Inertia Laravel v3 does NOT auto-register its main middleware in
        // the web group on Laravel 11+. We need to add it manually so that
        // flashed validation errors from the previous request are made
        // available to Inertia as `page.props.errors`. Without this, errors
        // are silently dropped on Inertia form submissions and the user
        // never sees validation feedback.
        //
        // We register our HandleInertiaRequests subclass (not the bare
        // \Inertia\Middleware) so the typed `flash` prop — shape
        // `{type, message}` for toast messages — is also shared with all
        // Inertia responses.
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();