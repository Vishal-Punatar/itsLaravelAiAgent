<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class AiProviderModel extends Model
{
    use HasFactory;

    protected $fillable = [
        'provider_key',
        'model_id',
        'model_label',
        'status',
        'is_supported',
        'last_checked_at',
    ];

    protected $casts = [
        'is_supported' => 'boolean',
        'last_checked_at' => 'datetime',
    ];

    /**
     * Scope to get models for a specific provider.
     */
    public function scopeForProvider($query, string $providerKey)
    {
        return $query->where('provider_key', $providerKey);
    }

    /**
     * Scope to get only supported models.
     */
    public function scopeSupported($query)
    {
        return $query->where('is_supported', true);
    }

    /**
     * Scope to get deprecated models.
     */
    public function scopeDeprecated($query)
    {
        return $query->where('status', 'deprecated');
    }

    /**
     * Scope to get new models.
     */
    public function scopeNew($query)
    {
        return $query->where('status', 'new');
    }

    /**
     * Scope to get active models.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }
}
