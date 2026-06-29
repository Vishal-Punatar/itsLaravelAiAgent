<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatMessage extends Model
{
    use HasFactory;

    protected $fillable = ['chat_id', 'user_id', 'role', 'message', 'attachments'];

    protected $casts = [
        'attachments' => 'array',
    ];

    public function chat(): BelongsTo
    {
        return $this->belongsTo(Chat::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if this message has images.
     */
    public function hasImages(): bool
    {
        $attachments = $this->attachments ?? [];
        return isset($attachments['type']) && $attachments['type'] === 'image' && !empty($attachments['images']);
    }

    /**
     * Get the images from this message.
     */
    public function getImages(): array
    {
        if (!$this->hasImages()) {
            return [];
        }
        $attachments = $this->attachments ?? [];
        return $attachments['images'] ?? [];
    }

    /**
     * Get the first image from this message.
     */
    public function getFirstImage(): ?array
    {
        $images = $this->getImages();
        return $images[0] ?? null;
    }

    /**
     * Set images for this message.
     */
    public function setImages(string $path, string $prompt, string $model, string $provider): void
    {
        $this->attachments = [
            'type' => 'image',
            'images' => [
                [
                    'path' => $path,
                    'prompt' => $prompt,
                    'model' => $model,
                    'provider' => $provider,
                    'generated_at' => now()->toIso8601String(),
                ],
            ],
        ];
    }
}
