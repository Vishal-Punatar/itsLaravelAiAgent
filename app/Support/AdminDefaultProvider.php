<?php

namespace App\Support;

use App\Models\AdminAiAgent;

/**
 * Shared helper for controllers that need to expose the admin's default
 * AI provider to the frontend (used to drive sidebar UX like the "New Chat"
 * button enable/disable state).
 *
 * Returns:
 *   [
 *     'provider' => 'gemini',
 *     'name' => 'Gemini',
 *     'has_api_key' => true,
 *   ]
 * or null if no active default is configured.
 */
class AdminDefaultProvider
{
    public static function payload(): ?array
    {
        $adminDefault = AdminAiAgent::getDefault();
        if (!$adminDefault) {
            return null;
        }
        return [
            'provider' => $adminDefault->provider,
            'name' => $adminDefault->name,
            'has_api_key' => !empty($adminDefault->decrypted_api_key),
        ];
    }
}
