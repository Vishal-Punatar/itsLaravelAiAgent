<?php

namespace App\Services;

use App\Ai\Agents\ChatAgent;
use App\Models\AiAgent;
use App\Models\AdminAiAgent;
use App\Models\Chat;
use Illuminate\Support\Facades\Log;
use Laravel\Ai\Responses\StreamableAgentResponse;
use Laravel\Ai\Responses\StreamedAgentResponse;

class ChatService
{
    /**
     * Send a message to the AI with optional file attachments.
     * All calls go through ChatAgent (Laravel AI package).
     *
     * @param  string|null  $model  Runtime-only model selection from the chat UI's
     *                              Model Selector dropdown. Not persisted — this is
     *                              the user's per-request pick. When null, ChatAgent
     *                              falls back to AiAgent::defaultModelForProvider().
     */
    public function sendMessage(
        Chat $chat,
        string $messageText,
        ?AiAgent $aiAgent = null,
        array $attachments = [],
        ?string $model = null
    ): string {
        try {
            $aiAgent = $this->resolveAgent($chat, $aiAgent);
        } catch (\RuntimeException $e) {
            return $e->getMessage();
        }

        try {
            // Ensure chat has messages loaded (including newly saved user message)
            $chat->load('messages');

            // Use ChatAgent for all AI calls (Laravel AI package).
            // The $model argument overrides the per-provider default when provided
            // (driven by the runtime Model Selector dropdown — never persisted).
            $agent = new ChatAgent($aiAgent, $chat);
            $response = $agent->promptWithAttachments(
                prompt: $messageText,
                attachments: $attachments,
                provider: null,
                model: $model,
                timeout: 120,
            );

            // ChatAgent returns AgentResponse — extract text (it's a public property)
            if (isset($response->text)) {
                return $response->text ?: 'Sorry, I could not generate a response.';
            }

            return 'Unexpected response format from AI.';
        } catch (\Exception $e) {
            Log::error('ChatAgent error', [
                'error_message' => $e->getMessage(),
                'provider' => $aiAgent->provider,
                'model' => $model ?? AiAgent::defaultModelForProvider($aiAgent->provider),
            ]);
            return 'Error: ' . $e->getMessage();
        }
    }

    /**
     * Stream a message to the AI and return a StreamableAgentResponse.
     *
     * The controller is responsible for:
     *   1. Saving the user message BEFORE calling this (it's already in
     *      $chat->messages when the conversation history is built).
     *   2. Returning the response from a controller method — Laravel
     *      auto-converts StreamableAgentResponse to a text/event-stream
     *      SSE response via its Responsable interface.
     *
     * On stream completion (success or failure), the assistant message is
     * saved to the database with the full accumulated text. If the user
     * aborts (closes browser mid-stream), Laravel fires the connection
     * abort handler and we still persist whatever was generated so far.
     *
     * @param  callable|null  $onComplete  Optional callback that runs after
     *                                    the stream finishes. Receives the
     *                                    StreamedAgentResponse. Used by the
     *                                    controller to save the assistant
     *                                    message and log usage.
     */
    public function streamMessage(
        Chat $chat,
        string $messageText,
        ?AiAgent $aiAgent = null,
        array $attachments = [],
        ?string $model = null,
        ?callable $onComplete = null
    ): StreamableAgentResponse {
        // Resolve (or fall back to user default / admin default). Throws
        // RuntimeException when nothing is available so the controller can
        // return an SSE error frame instead of returning empty text.
        $aiAgent = $this->resolveAgent($chat, $aiAgent, throwOnMissing: true);

        // Ensure chat has messages loaded (including the newly-saved user message)
        $chat->load('messages');

        $agent = new ChatAgent($aiAgent, $chat);
        $stream = $agent->streamWithAttachments(
            prompt: $messageText,
            attachments: $attachments,
            provider: null,
            model: $model,
            timeout: 120,
        );

        // Register the post-stream callback. Fires once after iteration
        // completes (success or error). The controller uses this to save
        // the assistant message to the database.
        if ($onComplete !== null) {
            $stream->then($onComplete);
        }

        return $stream;
    }

    /**
     * Resolve an agent for the given chat. Tries in order:
     *   1. The passed-in $aiAgent.
     *   2. The user's default agent (DB lookup).
     *   3. The admin's default provider (forceFill into a virtual AiAgent).
     *
     * @param  bool  $throwOnMissing  If true, throw RuntimeException when no
     *                                agent is available (used by streamMessage
     *                                to surface a clean SSE error frame).
     *                                If false (default, sendMessage path),
     *                                return a human-readable error string.
     */
    private function resolveAgent(Chat $chat, ?AiAgent $aiAgent, bool $throwOnMissing = false): ?AiAgent
    {
        $missing = static fn () => $throwOnMissing
            ? throw new \RuntimeException(
                'No AI agent configured. Please add an AI agent in the AI Agents settings.'
            )
            : new \RuntimeException(
                'No AI agent configured. Please add an AI agent in the AI Agents settings.'
            );

        if (!$aiAgent) {
            $aiAgent = AiAgent::where('user_id', $chat->user_id)
                ->where('is_default', true)
                ->first();
        }

        if (!$aiAgent) {
            $adminDefault = AdminAiAgent::getDefault();
            if ($adminDefault) {
                $aiAgent = new AiAgent();
                $aiAgent->forceFill([
                    'provider'  => $adminDefault->provider,
                    'api_key'   => null,
                    'is_default' => true,
                    'user_id'   => $chat->user_id,
                ]);
            }
        }

        if (!$aiAgent) {
            // Touch the closure so PHP doesn't think it's unused; we never
            // actually need it when we got here.
            $missing();
        }

        return $aiAgent;
    }
}