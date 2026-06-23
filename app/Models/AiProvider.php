<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiProvider extends Model
{
    protected $fillable = ['key', 'label', 'api_key', 'is_default', 'is_active', 'default_model'];

    protected $casts = [
        'is_default' => 'boolean',
        'is_active' => 'boolean',
    ];

    protected $hidden = ['api_key'];

    /**
     * Get the decrypted API key.
     */
    public function getDecryptedApiKeyAttribute(): ?string
    {
        if (!$this->api_key) {
            return null;
        }
        try {
            return decrypt($this->api_key);
        } catch (\Exception $e) {
            return $this->api_key;
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

    /**
     * Get the effective model to use (default_model or first available).
     */
    public function getEffectiveModelAttribute(): string
    {
        if ($this->default_model) {
            return $this->default_model;
        }
        $allowed = AiAgent::allowedModels()[$this->key] ?? [];
        return array_key_first($allowed['models'] ?? []) ?? '';
    }
}
