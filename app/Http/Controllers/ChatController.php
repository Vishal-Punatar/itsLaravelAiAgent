<?php

namespace App\Http\Controllers;

use App\Models\AiAgent;
use App\Models\AdminAiAgent;
use App\Models\Chat;
use App\Models\ChatMessage;
use App\Services\ChatService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ChatController extends Controller
{
    private ChatService $chatService;

    public function __construct(ChatService $chatService)
    {
        $this->chatService = $chatService;
    }

    /**
     * Parse the common (message, agent_id, model_id, attachments) payload
     * shared by store(), sendMessage() and streamMessage().
     *
     * Note: empty-input validation is left to the caller so each method can
     * return its preferred response shape (redirect-withErrors for store /
     * sendMessage, JSON 422 for streamMessage).
     */
    private function parseMessageInputs(Request $request): array
    {
        $validated = $request->validate([
            'message' => 'nullable|string|max:5000',
            'agent_id' => 'nullable|string|max:20',
            'model_id' => 'nullable|string|max:200',
            'attachments.*' => 'nullable|file|max:10240',
        ]);

        $messageText = trim($validated['message'] ?? '');

        // Runtime-only model selection from the chat UI's Model Selector.
        // Never persisted. Empty/whitespace → null.
        $modelIdRaw = $request->input('model_id');
        $modelIdRaw = is_string($modelIdRaw) ? trim($modelIdRaw) : '';
        $modelId = $modelIdRaw !== '' ? $modelIdRaw : null;

        $attachments = [];
        for ($i = 0; $request->hasFile("attachments.{$i}"); $i++) {
            $attachments[] = $request->file("attachments.{$i}");
        }

        return [
            $messageText,
            $request->input('agent_id'),
            $modelId,
            $attachments,
        ];
    }

    /**
     * Resolve the AI agent for this request.
     *
     * Selection logic (identical for store / sendMessage / streamMessage):
     *   agent_id === '' || 'admin_default' || null  → admin's default provider
     *   agent_id === <int>                          → that specific user agent
     *   no specific match                           → user's default agent
     *   user has no default                         → admin's default provider
     *
     * Loads the user's agents ONCE per request instead of issuing one
     * SELECT per fallback layer.
     */
    private function resolveAgent(?string $agentIdRaw): ?AiAgent
    {
        if ($agentIdRaw === '' || $agentIdRaw === 'admin_default' || $agentIdRaw === null) {
            return $this->buildAdminDefaultAgent();
        }

        $userAgents = Auth::user()->aiAgents()->get();

        $specific = $userAgents->firstWhere('id', (int) $agentIdRaw);
        if ($specific) {
            return $specific;
        }

        return $userAgents->firstWhere('is_default', true)
            ?? $this->buildAdminDefaultAgent();
    }

    /**
     * Wrap AdminAiAgent::getDefault() in an in-memory AiAgent for the
     * service layer. Centralized so the admin-default columns can't drift
     * between store / sendMessage / streamMessage.
     */
    private function buildAdminDefaultAgent(): ?AiAgent
    {
        $adminDefault = AdminAiAgent::getDefault();
        if (!$adminDefault) {
            return null;
        }

        $agent = new AiAgent();
        $agent->forceFill([
            'provider'  => $adminDefault->provider,
            'api_key'   => null,
            'is_default' => true,
            'user_id'   => Auth::id(),
        ]);
        return $agent;
    }

    /**
     * Persist the user's message and write attachment metadata.
     */
    private function saveUserMessage(Chat $chat, string $messageText, array $attachments): void
    {
        $attachmentData = $this->storeAttachments($attachments);

        ChatMessage::create([
            'chat_id'    => $chat->id,
            'user_id'    => Auth::id(),
            'role'       => 'user',
            'message'    => $messageText,
            'attachments' => !empty($attachmentData) ? json_encode($attachmentData) : null,
        ]);
    }

    /**
     * Persist the assistant's turn (real response OR error notice). Called
     * from the streaming onComplete callback and the synchronous path.
     */
    private function saveAssistantTurn(
        int $chatId,
        int $userId,
        string $message,
        ?string $modelToLog,
        ?string $modelFallback = null
    ): void {
        ChatMessage::create([
            'chat_id'    => $chatId,
            'user_id'    => $userId,
            'role'       => 'assistant',
            'message'    => $message,
            'model_used' => $modelToLog ?? $modelFallback,
        ]);
    }

    public function index()
    {
        $chats = Auth::user()->chats()
            ->with(['messages' => function($q) { 
                $q->orderBy('created_at', 'asc'); 
            }])
            ->orderBy('updated_at', 'desc')
            ->get();
        
        $aiConfigured = Auth::user()->aiAgents()->count() > 0;
        $aiAgents = Auth::user()->aiAgents()->get();
            
        return view('chat.index', compact('chats', 'aiConfigured', 'aiAgents'));
    }

    public function show($id)
    {
        $chat = Chat::where('id', $id)
            ->where('user_id', Auth::id())
            ->with(['messages' => function($q) { 
                $q->orderBy('created_at', 'asc'); 
            }])
            ->firstOrFail();
        
        $chats = Auth::user()->chats()
            ->with(['messages' => function($q) { 
                $q->orderBy('created_at', 'asc'); 
            }])
            ->orderBy('updated_at', 'desc')
            ->get();
        
        $aiConfigured = Auth::user()->aiAgents()->count() > 0;
        $aiAgents = Auth::user()->aiAgents()->get();
        
        return view('chat.index', compact('chat', 'chats', 'aiConfigured', 'aiAgents'));
    }

    public function store(Request $request)
    {
        Log::info('ChatController@store called', ['inputs' => $request->all()]);

        [$messageText, $agentIdRaw, $modelId, $attachments] = $this->parseMessageInputs($request);

        if ($messageText === '' && empty($attachments)) {
            return back()->withErrors(['message' => 'Message or attachment required']);
        }

        $chat = Chat::create([
            'user_id' => Auth::id(),
            'title' => $messageText !== '' ? substr($messageText, 0, 50) : 'File Attachment'
        ]);

        $aiAgent = $this->resolveAgent($agentIdRaw);

        // Image generation is non-streaming — handleImageGeneration saves
        // its own user/assistant messages and returns a redirect.
        if ($aiAgent && $this->isImageGenerationRequest($messageText)) {
            return $this->handleImageGeneration($chat, $aiAgent, $messageText);
        }

        $this->saveUserMessage($chat, $messageText, $attachments);

        $response = $this->chatService->sendMessage(
            chat: $chat,
            messageText: $messageText,
            aiAgent: $aiAgent,
            attachments: $attachments,
            model: $modelId, // runtime override — never persisted
        );

        ChatMessage::create([
            'chat_id' => $chat->id,
            'user_id' => Auth::id(),
            'role' => 'assistant',
            'message' => $response,
        ]);

        return redirect("/chat/{$chat->id}");
    }

    public function sendMessage(Request $request, $id)
    {
        Log::info('ChatController@sendMessage called', ['chat_id' => $id, 'inputs' => $request->all()]);

        [$messageText, $agentIdRaw, $modelId, $attachments] = $this->parseMessageInputs($request);

        if ($messageText === '' && empty($attachments)) {
            return back()->withErrors(['message' => 'Message is required when no attachment is provided']);
        }

        $chat = Chat::where('id', $id)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        $aiAgent = $this->resolveAgent($agentIdRaw);

        if ($aiAgent && $this->isImageGenerationRequest($messageText)) {
            return $this->handleImageGeneration($chat, $aiAgent, $messageText, $id);
        }

        $this->saveUserMessage($chat, $messageText, $attachments);

        $response = $this->chatService->sendMessage(
            chat: $chat,
            messageText: $messageText,
            aiAgent: $aiAgent,
            attachments: $attachments,
            model: $modelId,
        );

        ChatMessage::create([
            'chat_id' => $chat->id,
            'user_id' => Auth::id(),
            'role' => 'assistant',
            'message' => $response,
        ]);

        return redirect("/chat/{$id}");
    }

    /**
     * Stream a chat message via Server-Sent Events.
     *
     * Mirrors sendMessage() but returns the StreamableAgentResponse directly,
     * which Laravel auto-converts to a text/event-stream SSE response.
     *
     * Flow:
     *   1. Validate (same as sendMessage)
     *   2. Resolve agent + model
     *   3. Save user message to DB
     *   4. Call ChatService::streamMessage which returns StreamableAgentResponse
     *   5. Register a `then()` callback that saves the assistant message once
     *      the stream finishes (success OR error).
     *   6. Return the stream — Laravel emits each event as SSE until the
     *      generator is exhausted, then the response finalizes.
     *
     * If the browser closes mid-stream, Laravel's response()->stream() detects
     // the disconnect via its generator return — we still hit `then()` because
     // the SDK's generator fully consumes the upstream provider stream before
     // yielding back, and the `then()` callback fires from getIterator().
     */
    public function streamMessage(Request $request, $id)
    {
        Log::info('ChatController@streamMessage called', ['chat_id' => $id, 'inputs' => $request->all()]);

        [$messageText, $agentIdRaw, $modelId, $attachments] = $this->parseMessageInputs($request);

        if ($messageText === '' && empty($attachments)) {
            return response()->json(['error' => 'Message is required when no attachment is provided.'], 422);
        }

        $chat = Chat::where('id', $id)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        $aiAgent = $this->resolveAgent($agentIdRaw);

        // Image generation is non-streaming — tell the frontend to fall
        // back to the standard handler, after persisting the user message.
        if ($this->isImageGenerationRequest($messageText)) {
            $this->saveUserMessage($chat, $messageText, $attachments);
            return response()->json([
                'redirect' => url("/chat/{$chat->id}"),
                'image_request' => true,
            ], 202);
        }

        // Save user message BEFORE streaming so it's part of the conversation
        // context the AI sees and visible to the user immediately.
        $this->saveUserMessage($chat, $messageText, $attachments);

        $chatId = $chat->id;
        $userId = Auth::id();
        $modelToLog = $modelId;
        $defaultModel = $aiAgent ? AiAgent::defaultModelForProvider($aiAgent->provider) : null;

        // The `then()` callback fires once after the SDK's iterator is
        // exhausted (success or upstream error) and is the right place to
        // persist the assistant message + log usage.
        try {
            $stream = $this->chatService->streamMessage(
                chat: $chat,
                messageText: $messageText,
                aiAgent: $aiAgent,
                attachments: $attachments,
                model: $modelId,
                onComplete: function (\Laravel\Ai\Responses\StreamedAgentResponse $response) use ($chatId, $userId, $modelToLog, $defaultModel) {
                    $text = $response->text ?? null;

                    // Happy path: stream produced text. Save verbatim.
                    if ($text !== null && $text !== '') {
                        $this->saveAssistantTurn($chatId, $userId, $text, $modelToLog, $defaultModel);
                        return;
                    }

                    // Sad path: stream produced no text. Common reasons:
                    //   1. Aborted before first token (user clicked Stop) — don't save
                    //   2. SDK yielded an Error event (OpenAI insufficient_quota,
                    //      Groq request_too_large, etc.) — save the error as the turn
                    //      so it survives page refresh.
                    $errorEvent = $response->events->first(function ($e) {
                        return $e instanceof \Laravel\Ai\Streaming\Events\Error;
                    });

                    if ($errorEvent) {
                        $this->saveAssistantTurn(
                            $chatId, $userId,
                            '⚠️ ' . $errorEvent->message,
                            $modelToLog, $defaultModel
                        );
                        Log::info('ChatController@streamMessage: saved provider error as assistant turn', [
                            'chat_id' => $chatId,
                            'error_type' => $errorEvent->type,
                            'error_message' => $errorEvent->message,
                        ]);
                        return;
                    }

                    // No text, no error event → user aborted before first token.
                    // Don't save anything — the user knows they clicked Stop.
                    Log::info('ChatController@streamMessage: stream produced no text (likely user abort), skipping save', [
                        'chat_id' => $chatId,
                    ]);
                },
            );
        } catch (\Exception $e) {
            Log::error('ChatController@streamMessage: failed to start stream', [
                'chat_id' => $chat->id,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'error' => 'Failed to start stream: ' . $e->getMessage(),
            ], 500);
        }

        // Wrap the SDK's StreamableAgentResponse in a raw Symfony StreamedResponse.
        //
        // Why not `return $stream` (the SDK's Responsable interface):
        //   The SDK's toResponse() calls response()->stream(generator) which:
        //     1. Uses Laravel's StreamedResponse wrapper — slower than a
        //        raw Symfony StreamedResponse (extra closure layer)
        //     2. Does not set Cache-Control: no-cache (HTTP/1.0 proxies may
        //        cache the response and buffer chunks)
        //     3. Does not call flush() per event — relies entirely on
        //        flush() at end-of-callback which is buffered by PHP-FPM
        //
        // Direct iteration + flush() per event guarantees each SSE event
        // reaches the browser immediately, regardless of buffering layer.
        return new \Symfony\Component\HttpFoundation\StreamedResponse(
            function () use ($stream, $chatId, $userId, $modelToLog, $defaultModel) {
                // Disable any PHP output compression that might buffer the stream.
                @ini_set('output_buffering', 'off');
                @ini_set('implicit_flush', '1');
                while (@ob_get_level() > 0) { @ob_end_flush(); }

                try {
                    foreach ($stream as $event) {
                        echo 'data: ' . (string) $event . "\n\n";
                        // Flush all output layers — echo buffer, PHP ob_*, nginx, browser.
                        @ob_flush();
                        flush();
                    }
                } catch (\Throwable $e) {
                    // SDK error during streaming (e.g. OpenAI 429 insufficient_quota,
                    // Anthropic out of credits, Groq rate limit, network timeout).
                    // The response has already started so we can't change the status
                    // code — emit an SSE error event so the frontend can show the real
                    // message instead of the generic "couldn't reach AI service" fallback.
                    //
                    // Also persist the error as the assistant turn so it survives
                    // page refresh. (then() callback won't fire because the iterator
                    // didn't complete cleanly.)
                    //
                    // Shape mirrors the SDK's StreamableAgentResponse Error events
                    // (type/message/recoverable) so the frontend's signature-based
                    // detection picks it up uniformly with provider-emitted errors.
                    $errorPayload = json_encode([
                        'type' => 'error',
                        'message' => $e->getMessage(),
                        'recoverable' => false,
                        'code' => $e instanceof \Laravel\Ai\Exceptions\AiException ? $e->getCode() : 0,
                        'exception_class' => class_basename($e),
                    ], JSON_UNESCAPED_SLASHES);
                    echo 'data: ' . $errorPayload . "\n\n";
                    @ob_flush();
                    flush();

                    // Persist the error so the user sees it on refresh, not a
                    // missing reply. The ⚠️ prefix marks it as a system error
                    // rather than a real model response.
                    $this->saveAssistantTurn(
                        $chatId, $userId,
                        '⚠️ ' . $e->getMessage(),
                        $modelToLog, $defaultModel
                    );

                    Log::warning('ChatController@streamMessage: provider error mid-stream', [
                        'chat_id' => $chatId,
                        'error' => $e->getMessage(),
                        'exception_class' => get_class($e),
                    ]);
                }
                echo "data: [DONE]\n\n";
                @ob_flush();
                flush();
            },
            200,
            [
                'Content-Type' => 'text/event-stream',
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0',
                'Connection' => 'keep-alive',
                'X-Accel-Buffering' => 'no',
                // Tell nginx to pass through without compressing — gzip buffers
                // everything to compress, defeating token-by-token streaming.
                'Content-Encoding' => 'identity',
            ]
        );
    }

    /**
     * Check if the message is an image generation request.
     */
    private function isImageGenerationRequest(string $message): bool
    {
        $message = strtolower(trim($message));
        
        // Check for /image or /generateimage command
        if (str_starts_with($message, '/image') || str_starts_with($message, '/generateimage')) {
            return true;
        }
        
        // Check for explicit image generation phrases only
        $imageKeywords = [
            'generate an image',
            'generate image',
            'generate a picture',
            'generate a photo',
        ];
        
        foreach ($imageKeywords as $keyword) {
            if (str_contains($message, $keyword)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Extract the prompt from an image generation request.
     */
    private function extractImagePrompt(string $message): string
    {
        $message = trim($message);
        
        // Remove /image command
        if (str_starts_with($message, '/image')) {
            $message = substr($message, 6);
        }
        
        // Remove common phrases
        $removePhrases = [
            'generate an image of',
            'generate image of',
            'generate an image',
            'generate image',
            'create an image of',
            'create image of',
            'create an image',
            'create image',
            'draw an image of',
            'draw image of',
            'draw an image',
            'draw image',
            'make an image of',
            'make image of',
            'make an image',
            'make image',
            'generate a picture of',
            'generate a picture',
            'create a picture of',
            'create a picture',
            'generate a photo of',
            'generate a photo',
            'create a photo of',
            'create a photo',
        ];
        
        $message = str_ireplace($removePhrases, '', $message);
        
        return trim($message);
    }

    /**
     * Handle image generation request.
     */
    private function handleImageGeneration(Chat $chat, AiAgent $aiAgent, string $message, ?int $redirectToId = null)
    {
        $redirectUrl = $redirectToId ? "/chat/{$redirectToId}" : "/chat/{$chat->id}";
        
        // Check if provider supports image generation
        if (!AiAgent::supportsImageGeneration($aiAgent->provider)) {
            $provider = ucfirst($aiAgent->provider);
            
            // Save user message first
            ChatMessage::create([
                'chat_id' => $chat->id,
                'user_id' => Auth::id(),
                'role' => 'user',
                'message' => $message,
            ]);
            
            // Save error message
            ChatMessage::create([
                'chat_id' => $chat->id,
                'user_id' => Auth::id(),
                'role' => 'assistant',
                'message' => "Image generation is not supported for {$provider}. Please use OpenAI, Gemini, OpenRouter, or XAI.",
            ]);
            
            return redirect($redirectUrl);
        }
        
        $prompt = $this->extractImagePrompt($message);
        
        if (empty($prompt)) {
            // Save user message first
            ChatMessage::create([
                'chat_id' => $chat->id,
                'user_id' => Auth::id(),
                'role' => 'user',
                'message' => $message,
            ]);
            
            // Save error message
            ChatMessage::create([
                'chat_id' => $chat->id,
                'user_id' => Auth::id(),
                'role' => 'assistant',
                'message' => "Please provide a description for the image. For example: /image a beautiful sunset",
            ]);
            
            return redirect($redirectUrl);
        }
        
        // Save user message first (before attempting generation)
        ChatMessage::create([
            'chat_id' => $chat->id,
            'user_id' => Auth::id(),
            'role' => 'user',
            'message' => $message,
        ]);
        
        try {
            // Use ChatAgent for image generation
            $chatAgent = new \App\Ai\Agents\ChatAgent($aiAgent, $chat);
            Log::info('Generating image', [
                'provider' => $aiAgent->provider,
                'prompt' => $prompt,
            ]);
            
            // Generate image
            $response = $chatAgent->generateImage($prompt);
            
            // Save the image to storage
            $filename = Str::uuid() . '.png';
            $path = "chat-images/{$chat->id}";
            $fullPath = $response->firstImage()->storeAs($path, $filename, 'public');
            $imageUrl = Storage::url($fullPath);
            
            // Save assistant message with image
            $assistantMessage = ChatMessage::create([
                'chat_id' => $chat->id,
                'user_id' => Auth::id(),
                'role' => 'assistant',
                'message' => "Here's your generated image:",
                'attachments' => [
                    'type' => 'image',
                    'images' => [
                        [
                            'path' => $imageUrl,
                            'prompt' => $prompt,
                            'model' => $response->firstImage()->model ?? AiAgent::defaultImageModelForProvider($aiAgent->provider),
                            'provider' => $aiAgent->provider,
                            'generated_at' => now()->toIso8601String(),
                        ],
                    ],
                ],
            ]);
            
            Log::info('Image generated successfully', [
                'chat_id' => $chat->id,
                'message_id' => $assistantMessage->id,
                'image_path' => $imageUrl,
            ]);
            
            return redirect($redirectUrl);
            
        } catch (\Exception $e) {
            Log::error('Image generation failed', [
                'provider' => $aiAgent->provider,
                'error' => $e->getMessage(),
            ]);
            
            // Save error message as assistant response
            ChatMessage::create([
                'chat_id' => $chat->id,
                'user_id' => Auth::id(),
                'role' => 'assistant',
                'message' => "Image generation failed: " . $e->getMessage(),
            ]);
            
            return redirect($redirectUrl);
        }
    }

    /**
     * Store attachments to permanent storage and return metadata.
     */
    private function storeAttachments(array $attachments): array
    {
        $attachmentData = [];
        $userId = Auth::id();
        
        foreach ($attachments as $file) {
            if ($file) {
                $path = $file->storeAs(
                    "attachments/{$userId}",
                    $file->getClientOriginalName(),
                    'local'
                );
                
                $attachmentData[] = [
                    'name' => $file->getClientOriginalName(),
                    'path' => $path,
                    'mime' => $file->getMimeType(),
                    'size' => $file->getSize(),
                ];
            }
        }
        
        return $attachmentData;
    }

    public function destroy($id)
    {
        $chat = Chat::where('id', $id)
            ->where('user_id', Auth::id())
            ->firstOrFail();
        
        // Delete associated images
        foreach ($chat->messages as $message) {
            if ($message->hasImages()) {
                foreach ($message->getImages() as $image) {
                    $path = str_replace('/storage/', '', $image['path']);
                    Storage::disk('public')->delete($path);
                }
            }
        }
        
        $chat->messages()->delete();
        $chat->delete();

        return response()->json(['success' => true]);
    }

    public function togglePin($id)
    {
        $chat = Chat::where('user_id', auth()->id())->findOrFail($id);

        if ($chat->is_pinned) {
            $chat->update(['is_pinned' => false, 'pinned_order' => null]);
            return response()->json(['success' => true, 'pinned' => false]);
        } else {
            $maxOrder = Chat::where('user_id', auth()->id())->where('is_pinned', true)->max('pinned_order') ?? 0;
            $chat->update(['is_pinned' => true, 'pinned_order' => $maxOrder + 1]);
            return response()->json(['success' => true, 'pinned' => true]);
        }
    }

    public function toggleFavourite($id)
    {
        $chat = Chat::where('user_id', auth()->id())->findOrFail($id);

        if ($chat->is_favourite) {
            $chat->update(['is_favourite' => false, 'favourited_at' => null]);
            return response()->json([
                'success' => true,
                'favourited' => false,
                'favourited_at' => null,
            ]);
        } else {
            $chat->update(['is_favourite' => true, 'favourited_at' => now()]);
            return response()->json([
                'success' => true,
                'favourited' => true,
                'favourited_at' => $chat->favourited_at->toISOString(),
            ]);
        }
    }

    public function rename(Request $request, $id)
    {
        $request->validate([
            'title' => 'required|string|max:255',
        ]);

        $chat = Chat::where('user_id', auth()->id())->findOrFail($id);
        $chat->update(['title' => $request->title]);

        return response()->json(['success' => true, 'title' => $chat->title]);
    }
}
