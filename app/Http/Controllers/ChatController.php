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
        
        // agent_id: integer = specific user agent, '' (empty string) = admin default, null = user's default
        // model_id: runtime-only model selection from the chat UI's Model Selector dropdown.
        //           Never stored in DB. Resolved live per request.
        $validated = $request->validate([
            'message' => 'nullable|string|max:5000',
            'agent_id' => 'nullable|string|max:20',
            'model_id' => 'nullable|string|max:200',
            'attachments.*' => 'nullable|file|max:10240',
        ]);

        $messageText = $validated['message'] ?? '';
        $hasText = trim($messageText) !== '';
        $hasAttachments = $request->hasFile('attachments.0');

        if (!$hasText && !$hasAttachments) {
            return back()->withErrors(['message' => 'Message or attachment required']);
        }

        $messageText = trim($messageText);
        $agentIdRaw = $request->input('agent_id');
        // Normalize empty/whitespace model_id -> null (chat UI may send '' if dropdown is empty).
        $modelIdRaw = $request->input('model_id');
        $modelIdRaw = is_string($modelIdRaw) ? trim($modelIdRaw) : '';
        $modelIdRaw = $modelIdRaw !== '' ? $modelIdRaw : null;

        $attachments = [];
        for ($i = 0; $request->hasFile("attachments.{$i}"); $i++) {
            $attachments[] = $request->file("attachments.{$i}");
        }

        $chat = Chat::create([
            'user_id' => Auth::id(),
            'title' => $messageText ? substr($messageText, 0, 50) : 'File Attachment'
        ]);

        $attachmentData = $this->storeAttachments($attachments);

        // Determine which agent/provider to use:
        // - agent_id = '' (empty string) -> explicitly use admin's default provider
        // - agent_id = null/not provided -> use user's default agent
        // - agent_id = integer -> use that specific user agent
        $aiAgent = null;
        
        if ($agentIdRaw === '' || $agentIdRaw === 'admin_default' || $agentIdRaw === null) {
            $adminDefault = AdminAiAgent::getDefault();
            if ($adminDefault) {
                $aiAgent = new AiAgent();
                $aiAgent->forceFill([
                    'provider' => $adminDefault->provider,
                    'api_key' => null,
                    'is_default' => true,
                    'user_id' => Auth::id(),
                ]);
            }
        } elseif ($agentIdRaw !== null && $agentIdRaw !== '') {
            // Specific agent ID selected
            $aiAgent = Auth::user()->aiAgents()->where('id', (int) $agentIdRaw)->first();
        }
        
        // Fallback to user's default if no agent selected yet
        if (!$aiAgent) {
            $aiAgent = Auth::user()->aiAgents()->where('is_default', true)->first();
        }
        
        // Final fallback: if user has no agents, use admin default
        if (!$aiAgent) {
            $adminDefault = AdminAiAgent::getDefault();
            if ($adminDefault) {
                $aiAgent = new AiAgent();
                $aiAgent->forceFill([
                    'provider' => $adminDefault->provider,
                    'api_key' => null,
                    'is_default' => true,
                    'user_id' => Auth::id(),
                ]);
            }
        }

        // Check for image generation request
        if ($aiAgent && $this->isImageGenerationRequest($messageText)) {
            return $this->handleImageGeneration($chat, $aiAgent, $messageText);
        }

        ChatMessage::create([
            'chat_id' => $chat->id,
            'user_id' => Auth::id(),
            'role' => 'user',
            'message' => $messageText,
            'attachments' => !empty($attachmentData) ? json_encode($attachmentData) : null,
        ]);

        $response = $this->chatService->sendMessage(
            chat: $chat,
            messageText: $messageText,
            aiAgent: $aiAgent,
            attachments: $attachments,
            model: $modelIdRaw, // runtime override — never persisted
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
        
        $validated = $request->validate([
            'message' => 'nullable|string|max:5000',
            'agent_id' => 'nullable|string|max:20',
            'model_id' => 'nullable|string|max:200',
            'attachments.*' => 'nullable|file|max:10240',
        ]);

        $messageText = $validated['message'] ?? '';
        $hasText = trim($messageText) !== '';
        $hasAttachments = $request->hasFile('attachments.0');

        if (!$hasText && !$hasAttachments) {
            return back()->withErrors(['message' => 'Message is required when no attachment is provided']);
        }

        $messageText = trim($messageText);
        $agentIdRaw = $request->input('agent_id');
        // Normalize empty/whitespace model_id -> null.
        $modelIdRaw = $request->input('model_id');
        $modelIdRaw = is_string($modelIdRaw) ? trim($modelIdRaw) : '';
        $modelIdRaw = $modelIdRaw !== '' ? $modelIdRaw : null;

        $attachments = [];
        for ($i = 0; $request->hasFile("attachments.{$i}"); $i++) {
            $attachments[] = $request->file("attachments.{$i}");
        }

        $chat = Chat::where('id', $id)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        $attachmentData = $this->storeAttachments($attachments);

        // Determine which agent/provider to use:
        // - agent_id = '' (empty string) -> explicitly use admin's default provider
        // - agent_id = null/not provided -> use user's default agent
        // - agent_id = integer -> use that specific user agent
        $aiAgent = null;
        
        if ($agentIdRaw === '' || $agentIdRaw === 'admin_default' || $agentIdRaw === null) {
            $adminDefault = AdminAiAgent::getDefault();
            if ($adminDefault) {
                $aiAgent = new AiAgent();
                $aiAgent->forceFill([
                    'provider' => $adminDefault->provider,
                    'api_key' => null,
                    'is_default' => true,
                    'user_id' => Auth::id(),
                ]);
            }
        } elseif ($agentIdRaw !== null && $agentIdRaw !== '') {
            // Specific agent ID selected
            $aiAgent = Auth::user()->aiAgents()->where('id', (int) $agentIdRaw)->first();
        }
        
        // Fallback to user's default if no agent selected yet
        if (!$aiAgent) {
            $aiAgent = Auth::user()->aiAgents()->where('is_default', true)->first();
        }
        
        // Final fallback: if user has no agents and no admin default, show error
        if (!$aiAgent) {
            $adminDefault = AdminAiAgent::getDefault();
            if ($adminDefault) {
                $aiAgent = new AiAgent();
                $aiAgent->forceFill([
                    'provider' => $adminDefault->provider,
                    'api_key' => null,
                    'is_default' => true,
                    'user_id' => Auth::id(),
                ]);
            }
        }
        // Check for image generation request
        if ($aiAgent && $this->isImageGenerationRequest($messageText)) {
            return $this->handleImageGeneration($chat, $aiAgent, $messageText, $id);
        }

        ChatMessage::create([
            'chat_id' => $chat->id,
            'user_id' => Auth::id(),
            'role' => 'user',
            'message' => $messageText,
            'attachments' => !empty($attachmentData) ? json_encode($attachmentData) : null,
        ]);

        $response = $this->chatService->sendMessage(
            chat: $chat,
            messageText: $messageText,
            aiAgent: $aiAgent,
            attachments: $attachments,
            model: $modelIdRaw,
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
