<?php

namespace App\Ai\Agents;

use App\Models\AiAgent;
use App\Models\Chat;
use App\Models\ChatMessage;
use Illuminate\Contracts\Routing\Response;
use Illuminate\Support\Facades\Config;
use Laravel\Ai\AiManager;
use Laravel\Ai\Exceptions\FailoverableException;
use Laravel\Ai\Files\File as AiFile;
use Laravel\Ai\Files\Base64Image;
use Laravel\Ai\Files\LocalImage;
use Laravel\Ai\Files\Image as AiImage;
use Laravel\Ai\Files\Base64Document;
use Laravel\Ai\Files\LocalDocument;
use Laravel\Ai\Files\Document as AiDocument;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\Conversational;
use Laravel\Ai\Enums\Lab;
use Laravel\Ai\Messages\Message;
use Laravel\Ai\Promptable;
use Stringable;

class ChatAgent implements Agent, Conversational
{
    use Promptable;

    public function __construct(
        private AiAgent $aiAgent,
        private ?Chat $chat = null
    ) {}

    /**
     * Get the instructions that the agent should follow.
     */
    public function instructions(): Stringable|string
    {
        return 'You are a helpful AI assistant. You provide clear, concise, and accurate responses to user questions.';
    }

    /**
     * Get the list of messages comprising the conversation so far.
     */
    public function messages(): iterable
    {
        if (!$this->chat) {
            return [];
        }

        return $this->chat->messages->map(function (ChatMessage $msg) {
            return new Message($msg->role, $msg->message);
        })->all();
    }

    /**
     * Prompt the agent with a message and optional attachments.
     */
    public function promptWithAttachments(
        string $prompt,
        array $attachments = [],
        ?string $provider = null,
        ?string $model = null,
        int $timeout = 120
    ): mixed {
        // Set the API key in config for this request
        $this->setApiKeyInConfig();

        // Build the attachments array
        $files = [];
        foreach ($attachments as $attachment) {
            if ($attachment instanceof \Illuminate\Http\UploadedFile) {
                // Handle uploaded files - read as base64
                $contents = file_get_contents($attachment->getRealPath());
                $base64 = base64_encode($contents);
                $mime = $attachment->getMimeType();
                
                // Check if it's an image or document
                if ($mime && strpos($mime, 'image/') === 0) {
                    $files[] = new Base64Image($base64, $mime);
                } else {
                    $files[] = new Base64Document($base64, $mime);
                }
            } elseif (is_string($attachment)) {
                // Assume it's a path - determine if image or document
                $mime = mime_content_type($attachment);
                if ($mime && strpos($mime, 'image/') === 0) {
                    $files[] = new LocalImage($attachment, $mime);
                } else {
                    $files[] = new LocalDocument($attachment, $mime);
                }
            }
        }

        $providerEnum = $provider ? Lab::from($provider) : Lab::from($this->aiAgent->provider);
        $model = $model ?? $this->aiAgent->effective_model;

        $files = !empty($files) ? $files : [];

        // Retry up to 3 times on rate limit / overloaded errors
        $attempts = 0;
        $lastException = null;
        while ($attempts < 3) {
            try {
                if (!empty($files)) {
                    return $this->prompt($prompt, $files, $providerEnum, $model, $timeout);
                }
                return $this->prompt($prompt, [], $providerEnum, $model, $timeout);
            } catch (FailoverableException $e) {
                $lastException = $e;
                $attempts++;
                if ($attempts < 3) {
                    usleep(min(1000000 * pow(2, $attempts), 5000000)); // 2s, 4s backoff
                }
            }
        }

        throw $lastException;
    }

    /**
     * Set the API key in config for this request and clear cached provider instance.
     */
    private function setApiKeyInConfig(): void
    {
        $provider = $this->aiAgent->provider;
        $apiKey = $this->aiAgent->decrypted_api_key;

        // Map our provider names to config keys
        $configKey = match ($provider) {
            'openai' => 'OPENAI_API_KEY',
            'anthropic' => 'ANTHROPIC_API_KEY',
            'gemini' => 'GEMINI_API_KEY',
            'groq' => 'GROQ_API_KEY',
            'xai' => 'XAI_API_KEY',
            'deepseek' => 'DEEPSEEK_API_KEY',
            'mistral' => 'MISTRAL_API_KEY',
            'openrouter' => 'OPENROUTER_API_KEY',
            'ollama' => 'OLLAMA_API_KEY',
            default => null,
        };

        if ($configKey) {
            Config::set("ai.providers.{$provider}.key", $apiKey);
        }

        // Clear cached provider instance so the new API key is used
        app(AiManager::class)->forgetInstance($provider);
    }
}