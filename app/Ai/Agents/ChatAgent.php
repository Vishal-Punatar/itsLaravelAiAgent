<?php

namespace App\Ai\Agents;

use App\Models\AiAgent;
use App\Models\AdminAiAgent;
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
use Laravel\Ai\Responses\StreamableAgentResponse;
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
        $this->setApiKeyInConfig();

        [$providerEnum, $resolvedModel] = $this->resolveProviderAndModel($provider, $model);
        $files = $this->buildAiFiles($attachments);

        // Retry up to 3 times on rate limit / overloaded errors
        $attempts = 0;
        $lastException = null;
        while ($attempts < 3) {
            try {
                return $this->prompt($prompt, $files, $providerEnum, $resolvedModel, $timeout);
            } catch (FailoverableException $e) {
                $lastException = $e;
                $attempts++;
                if ($attempts < 3) {
                    usleep(min(1_000_000 * (2 ** $attempts), 5_000_000)); // 2s, 4s backoff
                }
            }
        }

        throw $lastException;
    }

    /**
     * Stream a prompt to the agent with optional attachments, returning a
     * StreamableAgentResponse. Mirrors promptWithAttachments() but uses the
     * SDK's stream() method so tokens arrive one-by-one over SSE.
     *
     * Works with any provider that uses the StreamsText trait (OpenAI,
     * Anthropic, Gemini, Groq, xAI, DeepSeek, Mistral, Azure, Bedrock,
     * OpenRouter, Ollama).
     */
    public function streamWithAttachments(
        string $prompt,
        array $attachments = [],
        ?string $provider = null,
        ?string $model = null,
        int $timeout = 120
    ): StreamableAgentResponse {
        $this->setApiKeyInConfig();

        [$providerEnum, $resolvedModel] = $this->resolveProviderAndModel($provider, $model);
        $files = $this->buildAiFiles($attachments);

        // Single call — streaming has its own retry semantics upstream.
        // Note: FailoverableException can still fire from the SDK's inner
        // stream iterator; let it propagate so the controller can decide.
        return $this->stream($prompt, $files, $providerEnum, $resolvedModel, $timeout);
    }

    /**
     * Convert an array of UploadedFile / path-string attachments into the
     * SDK's Base64Image / Base64Document / LocalImage / LocalDocument objects.
     * Empty input → empty array.
     */
    private function buildAiFiles(array $attachments): array
    {
        $files = [];
        foreach ($attachments as $attachment) {
            if ($attachment instanceof \Illuminate\Http\UploadedFile) {
                $contents = file_get_contents($attachment->getRealPath());
                $files[] = str_starts_with((string) $attachment->getMimeType(), 'image/')
                    ? new Base64Image(base64_encode($contents), $attachment->getMimeType())
                    : new Base64Document(base64_encode($contents), $attachment->getMimeType());
            } elseif (is_string($attachment)) {
                $mime = (string) mime_content_type($attachment);
                $files[] = str_starts_with($mime, 'image/')
                    ? new LocalImage($attachment, $mime)
                    : new LocalDocument($attachment, $mime);
            }
        }
        return $files;
    }

    /**
     * Resolve the (provider enum, model string) tuple for an SDK call.
     * `$provider` overrides the agent's stored provider; `$model` overrides
     * the provider's default model.
     */
    private function resolveProviderAndModel(?string $provider, ?string $model): array
    {
        return [
            $provider ? Lab::from($provider) : Lab::from($this->aiAgent->provider),
            $model ?? AiAgent::defaultModelForProvider($this->aiAgent->provider),
        ];
    }

    /**
     * Set the API key in config for this request and clear cached provider instance.
     */
    private function setApiKeyInConfig(): void
    {
        $provider = $this->aiAgent->provider;
        $apiKey = $this->aiAgent->decrypted_api_key;

        // If user's agent has no API key, fall back to admin's default provider
        if (empty($apiKey)) {
            $adminDefault = AdminAiAgent::getDefault();
            if ($adminDefault && $adminDefault->decrypted_api_key) {
                $apiKey = $adminDefault->decrypted_api_key;
            }
        }

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

    /**
     * Generate an image using the configured provider.
     */
    public function generateImage(string $prompt, ?string $model = null, string $size = '1024x1024', string $quality = 'high'): \Laravel\Ai\Responses\ImageResponse
    {
        $this->setApiKeyInConfig();

        $model = $model ?? AiAgent::defaultImageModelForProvider($this->aiAgent->provider);

        if (!$model) {
            throw new \Exception("No image model configured for provider: {$this->aiAgent->provider}");
        }

        // Map size to provider-specific format
        $mappedSize = $size;
        $mappedQuality = $quality;
        
        if ($this->aiAgent->provider === 'gemini') {
            // Gemini uses aspect_ratio and image_size
            // Map common sizes to aspect ratios
            $mappedSize = match ($size) {
                '1024x1024' => '1:1',
                '1024x1792', '896x1792' => '2:3',
                '1792x1024', '1792x896' => '3:2',
                default => '1:1',
            };
            // Map quality to image_size
            $mappedQuality = match ($quality) {
                'low' => '1K',
                'medium' => '2K',
                'high' => '4K',
                default => '2K',
            };
        }

        $ai = app(\Laravel\Ai\AiManager::class)->imageProvider($this->aiAgent->provider);

        return $ai->image($prompt, [], $mappedSize, $mappedQuality, $model);
    }
}