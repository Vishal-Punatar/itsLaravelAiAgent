<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Inertia Root View
    |--------------------------------------------------------------------------
    |
    | This is the root view that Inertia will use when rendering pages.
    |
    */
    'root_view' => 'app',

    /*
    |--------------------------------------------------------------------------
    | Inertia Version
    |--------------------------------------------------------------------------
    |
    | This value determines whether you are using the server-side or client-
    | side rendering of Inertia. By default, we use SSR when available.
    |
    */
    'version' => fn () => null,

    /*
    |--------------------------------------------------------------------------
    | SSR Endpoint
    |--------------------------------------------------------------------------
    |
    | This value determines the endpoint where Inertia will make SSR requests.
    |
    */
    'ssr_url' => env('INERTIA_SSR_URL'),

    /*
    |--------------------------------------------------------------------------
    | Asset URL
    |--------------------------------------------------------------------------
    |
    | This value determines the URL prefix for assets. This is useful when
    | you want to serve assets from a CDN.
    |
    */
    'asset_url' => env('ASSET_URL'),
];