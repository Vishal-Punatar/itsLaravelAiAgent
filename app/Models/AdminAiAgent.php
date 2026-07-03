<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminAiAgent extends Model
{
    protected $table = 'admin_ai_agents';

    protected $fillable = [
        'provider',
        'name',
        'api_key',
        'is_default',
        'is_active',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'is_active' => 'boolean',
    ];

    protected $hidden = ['api_key'];

    /**
     * Get the decrypted API key.
     *
     * Returns null on decrypt failure (with a logged error) so that upstream
     * services like ProviderModelsService treat it as missing → user sees a
     * clear "no_api_key" message instead of providers rejecting an encrypted
     * blob as malformed.
     */
    public function getDecryptedApiKeyAttribute(): ?string
    {
        if (!$this->api_key) {
            return null;
        }
        try {
            return decrypt($this->api_key);
        } catch (\Exception $e) {
            \Log::error('AdminAiAgent API key decryption failed', [
                'provider_id' => $this->id,
                'provider'    => $this->provider,
                'error'       => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Scope to get the default provider.
     */
    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }

    /**
     * Scope to get active providers.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Get the default provider (or null).
     */
    public static function getDefault(): ?self
    {
        return static::default()->active()->first();
    }

    /**
     * Set this provider as the default (unset others first).
     */
    public function setAsDefault(): void
    {
        static::where('is_default', true)->update(['is_default' => false]);
        $this->is_default = true;
        $this->save();
    }
}