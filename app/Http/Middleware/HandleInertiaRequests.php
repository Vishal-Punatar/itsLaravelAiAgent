<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Define the props that are shared by default.
     *
     * `errors` is inherited from Inertia\Middleware::share() — it surfaces
     * Laravel validation errors as `$page.props.errors` for form components.
     *
     * `flash` is the typed toast payload: shape is
     *   ['type' => 'success'|'error'|'warning'|'info', 'message' => string]
     *
     * Controllers set it via two paths:
     *   1. `back()->with('flash', ['type' => ..., 'message' => ...])` —
     *      writes to session('flash') directly.
     *   2. `Inertia::flash($type, $message)` or
     *      `Inertia::flash('success', 'msg')` — Inertia v3 stores under
     *      session key `inertia.flash_data`.
     *
     * We check BOTH locations, normalize legacy per-key shape into typed
     * shape, then wrap with a unique `_id` so the frontend's useEffect with
     * `[flash]` dep fires reliably on each new flash (even if the user does
     * the same action twice in a row, where type+message would be identical
     * and React's reference-equality check would otherwise skip the effect).
     *
     * @return array<string, mixed>
     */
    public function share(Request $request)
    {
        return array_merge(parent::share($request), [
            'flash' => function () use ($request) {
                // Try both possible source locations. Typed shape takes
                // precedence (it's what `back()->with('flash', [...])`
                // controllers write explicitly).
                $typed = $request->session()->get('flash');
                $legacy = $request->session()->get('inertia.flash_data');

                $flash = $typed ?? $legacy;
                if (!is_array($flash)) {
                    return $flash;
                }

                // Normalize legacy per-key shape (e.g. {success: 'msg'})
                // into the typed shape (e.g. {type: 'success', message: 'msg'}).
                if (!isset($flash['type']) || !isset($flash['message'])) {
                    foreach (['success', 'error', 'warning', 'info'] as $kind) {
                        if (!empty($flash[$kind])) {
                            $flash = ['type' => $kind, 'message' => $flash[$kind]];
                            break;
                        }
                    }
                    // Could not normalize (no recognized key) — return as-is
                    // so the frontend can still inspect it.
                    if (!isset($flash['type']) || !isset($flash['message'])) {
                        return $flash;
                    }
                }

                return array_merge($flash, ['_id' => uniqid('flash_', true)]);
            },
        ]);
    }
}
