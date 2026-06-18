<?php

namespace App\Http\Controllers;

use App\Models\AiAgent;
use App\Models\Chat;
use App\Models\ChatMessage;
use App\Services\ChatService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

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
        
        $validated = $request->validate([
            'message' => 'nullable|string|max:5000',
            'agent_id' => 'nullable|integer|exists:ai_agents,id',
            'attachments.*' => 'nullable|file|max:10240', // Max 10MB per file
        ]);

        $messageText = $validated['message'] ?? '';
        $hasText = trim($messageText) !== '';
        // Check 'attachments.0' since FormData sends files as attachments[0], attachments[1], ...
        $hasAttachments = $request->hasFile('attachments.0');

        if (!$hasText && !$hasAttachments) {
            return back()->withErrors(['message' => 'Message or attachment required']);
        }

        $messageText = trim($messageText);
        $agentId = $validated['agent_id'] ?? null;
        // Collect indexed files: attachments[0], attachments[1], ...
        $attachments = [];
        for ($i = 0; $request->hasFile("attachments.{$i}"); $i++) {
            $attachments[] = $request->file("attachments.{$i}");
        }

        // Create new chat
        $chat = Chat::create([
            'user_id' => Auth::id(),
            'title' => $messageText ? substr($messageText, 0, 50) : 'File Attachment'
        ]);

        // Save user message with attachments
        $attachmentData = $this->storeAttachments($attachments);

        ChatMessage::create([
            'chat_id' => $chat->id,
            'user_id' => Auth::id(),
            'role' => 'user',
            'message' => $messageText,
            'attachments' => !empty($attachmentData) ? json_encode($attachmentData) : null,
        ]);

        // Get AI response
        $aiAgent = $agentId 
            ? Auth::user()->aiAgents()->where('id', $agentId)->first() 
            : Auth::user()->aiAgents()->where('is_default', true)->first();
        
        $response = $this->chatService->sendMessage($chat, $messageText, $aiAgent, $attachments);
        
        ChatMessage::create([
            'chat_id' => $chat->id,
            'user_id' => Auth::id(),
            'role' => 'assistant',
            'message' => $response
        ]);

        return redirect("/chat/{$chat->id}");
    }

    public function sendMessage(Request $request, $id)
    {
        Log::info('ChatController@sendMessage called', ['chat_id' => $id, 'inputs' => $request->all()]);
        
        $validated = $request->validate([
            'message' => 'nullable|string|max:5000',
            'agent_id' => 'nullable|integer|exists:ai_agents,id',
            'attachments.*' => 'nullable|file|max:10240', // Max 10MB per file
        ]);

        $messageText = $validated['message'] ?? '';
        $hasText = trim($messageText) !== '';
        // Check 'attachments.0' since FormData sends files as attachments[0], attachments[1], ...
        $hasAttachments = $request->hasFile('attachments.0');

        if (!$hasText && !$hasAttachments) {
            return back()->withErrors(['message' => 'Message is required when no attachment is provided']);
        }

        $chat = Chat::where('id', $id)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        $messageText = trim($messageText);
        $agentId = $validated['agent_id'] ?? null;
        // Collect indexed files: attachments[0], attachments[1], ...
        $attachments = [];
        for ($i = 0; $request->hasFile("attachments.{$i}"); $i++) {
            $attachments[] = $request->file("attachments.{$i}");
        }
        Log::info('sendMessage attachments', [
            'count' => count($attachments),
            'files' => array_map(fn($f) => $f ? ['name' => $f->getClientOriginalName(), 'size' => $f->getSize()] : null, $attachments),
        ]);

        // Save user message with attachments
        $attachmentData = $this->storeAttachments($attachments);

        ChatMessage::create([
            'chat_id' => $chat->id,
            'user_id' => Auth::id(),
            'role' => 'user',
            'message' => $messageText,
            'attachments' => !empty($attachmentData) ? json_encode($attachmentData) : null,
        ]);

        // Get AI response
        $aiAgent = $agentId 
            ? Auth::user()->aiAgents()->where('id', $agentId)->first() 
            : Auth::user()->aiAgents()->where('is_default', true)->first();
        
        $response = $this->chatService->sendMessage($chat, $messageText, $aiAgent, $attachments);
        
        ChatMessage::create([
            'chat_id' => $chat->id,
            'user_id' => Auth::id(),
            'role' => 'assistant',
            'message' => $response
        ]);

        return redirect("/chat/{$id}");
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
                // Store in storage/app/attachments/{user_id}/
                $path = $file->storeAs(
                    "attachments/{$userId}",
                    $file->getClientOriginalName(),
                    'local'
                );
                
                $attachmentData[] = [
                    'name' => $file->getClientOriginalName(),
                    'path' => $path, // Store relative path for URL generation
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