<?php

namespace App\Services;

use App\Ai\Agents\ChatAgent;
use App\Models\AiAgent;
use App\Models\AiProvider;
use App\Models\Chat;
use App\Models\ChatMessage;
use Illuminate\Support\Facades\Log;

class ChatService
{
    /**
     * Send a message to the AI with optional file attachments.
     * All calls go through ChatAgent (Laravel AI package).
     */
    public function sendMessage(
        Chat $chat,
        string $messageText,
        ?AiAgent $aiAgent = null,
        array $attachments = []
    ): string {
        if (!$aiAgent) {
            $aiAgent = $this->getDefaultAgent($chat->user_id);
        }

        // If user has no agents, fall back to admin's default provider
        if (!$aiAgent) {
            $adminDefault = AiProvider::getDefault();
            if ($adminDefault) {
                $aiAgent = new AiAgent();
                $aiAgent->forceFill([
                    'provider' => $adminDefault->key,
                    'model' => $adminDefault->effective_model,
                    'api_key' => null,
                    'is_default' => true,
                    'user_id' => $chat->user_id,
                ]);
            }
        }

        if (!$aiAgent) {
            return 'No AI agent configured. Please add an AI agent in the AI Agents settings.';
        }

        try {
            // Ensure chat has messages loaded (including newly saved user message)
            $chat->load('messages');

            // Use ChatAgent for all AI calls (Laravel AI package)
            $agent = new ChatAgent($aiAgent, $chat);
            $response = $agent->promptWithAttachments($messageText, $attachments);

            // ChatAgent returns AgentResponse — extract text (it's a public property)
            if (isset($response->text)) {
                return $response->text ?: 'Sorry, I could not generate a response.';
            }

            return 'Unexpected response format from AI.';
        } catch (\Exception $e) {
            Log::error('ChatAgent error', [
                'message' => $e->getMessage(),
                'provider' => $aiAgent->provider,
                'model' => $aiAgent->effective_model,
            ]);
            return 'Error: ' . $e->getMessage();
        }
    }

    private function getDefaultAgent(int $userId): ?AiAgent
    {
        return AiAgent::where('user_id', $userId)
            ->where('is_default', true)
            ->first();
    }
}
