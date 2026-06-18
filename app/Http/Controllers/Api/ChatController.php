<?php

namespace App\Http\Controllers\Api;

use App\Models\Chat;
use App\Models\ChatMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Http;

class ChatController extends Controller
{
    /**
     * List all chats for authenticated user
     */
    public function index(Request $request)
    {
        $chats = Auth::user()->chats()
            ->with(['messages' => function($q) { 
                $q->orderBy('created_at', 'asc'); 
            }])
            ->orderBy('updated_at', 'desc')
            ->get();
            
        return response()->json($chats);
    }

    /**
     * Get single chat with messages
     */
    public function show(Request $request, $id)
    {
        $chat = Chat::where('id', $id)
            ->where('user_id', Auth::id())
            ->with(['messages' => function($q) { 
                $q->orderBy('created_at', 'asc'); 
            }])
            ->first();
            
        if (!$chat) {
            return response()->json(['error' => 'Chat not found'], 404);
        }
            
        return response()->json($chat);
    }

    /**
     * Create new chat with initial message (used by OpenClaw Discord bridge)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'message' => 'required|string|max:5000',
            'ai_response' => 'nullable|string',
        ]);

        $messageText = trim($validated['message']);
        
        // Create new chat
        $chat = Chat::create([
            'user_id' => Auth::id(),
            'title' => substr($messageText, 0, 50)
        ]);

        // Save user message
        ChatMessage::create([
            'chat_id' => $chat->id,
            'user_id' => Auth::id(),
            'role' => 'user',
            'message' => $messageText
        ]);

        // Save AI response if provided
        if (!empty($validated['ai_response'])) {
            ChatMessage::create([
                'chat_id' => $chat->id,
                'user_id' => Auth::id(),
                'role' => 'assistant',
                'message' => $validated['ai_response']
            ]);
        }

        return response()->json([
            'chat_id' => $chat->id,
            'title' => $chat->title,
        ], 201);
    }

    /**
     * Add message to existing chat (used by OpenClaw Discord bridge)
     */
    public function addMessage(Request $request, $id)
    {
        $validated = $request->validate([
            'message' => 'required|string|max:5000',
            'role' => 'required|in:user,assistant',
            'ai_response' => 'nullable|string',
        ]);

        $chat = Chat::where('id', $id)
            ->where('user_id', Auth::id())
            ->first();
            
        if (!$chat) {
            return response()->json(['error' => 'Chat not found'], 404);
        }

        // Save message
        ChatMessage::create([
            'chat_id' => $chat->id,
            'user_id' => Auth::id(),
            'role' => $validated['role'],
            'message' => trim($validated['message'])
        ]);

        // Save AI response if provided
        if (!empty($validated['ai_response'])) {
            ChatMessage::create([
                'chat_id' => $chat->id,
                'user_id' => Auth::id(),
                'role' => 'assistant',
                'message' => $validated['ai_response']
            ]);
        }

        $chat->touch(); // Update timestamp

        return response()->json(['success' => true]);
    }

    /**
     * Get or create chat session by Discord message (bridge endpoint)
     * Creates a new chat if none exists for today, otherwise adds to existing
     */
    public function bridgeMessage(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|integer',
            'user_message' => 'required|string|max:5000',
            'ai_response' => 'nullable|string',
            'session_id' => 'nullable|string|max:255',
        ]);

        // Find existing chat for today or create new one
        $chat = Chat::where('user_id', $validated['user_id'])
            ->whereDate('created_at', today())
            ->orderBy('updated_at', 'desc')
            ->first();

        if (!$chat) {
            $chat = Chat::create([
                'user_id' => $validated['user_id'],
                'title' => substr($validated['user_message'], 0, 50)
            ]);
        }

        // Save user message
        ChatMessage::create([
            'chat_id' => $chat->id,
            'user_id' => $validated['user_id'],
            'role' => 'user',
            'message' => trim($validated['user_message'])
        ]);

        // Save AI response if provided
        if (!empty($validated['ai_response'])) {
            ChatMessage::create([
                'chat_id' => $chat->id,
                'user_id' => $validated['user_id'],
                'role' => 'assistant',
                'message' => $validated['ai_response']
            ]);
        }

        return response()->json([
            'chat_id' => $chat->id,
            'title' => $chat->title,
        ]);
    }
}