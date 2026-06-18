<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ProductTourController extends Controller
{
    public function start(Request $request)
    {
        $step = $request->get('step', 1);
        $totalSteps = 3;
        
        return response()->json([
            'step' => $step,
            'totalSteps' => $totalSteps,
            'content' => $this->getStepContent($step),
        ]);
    }
    
    public function complete(Request $request)
    {
        Auth::user()->update(['tour_completed' => true]);
        return response()->json(['success' => true]);
    }
    
    private function getStepContent($step)
    {
        return match($step) {
            1 => [
                'title' => 'Welcome to AI Chat! 👋',
                'description' => 'This is your AI-powered chat interface. Let me show you around!',
                'target' => null,
                'position' => 'center',
            ],
            2 => [
                'title' => '⚙️ Configure AI Settings',
                'description' => 'Go to Settings, select your AI provider, choose a model, and enter your API key to start chatting!',
                'target' => 'a[href="/settings"]',
                'position' => 'bottom',
            ],
            3 => [
                'title' => '📝 Create Your First Chat',
                'description' => 'Click the "New Chat" button to start a conversation with AI. Each chat is saved so you can revisit previous conversations anytime.',
                'target' => '.new-chat-btn',
                'position' => 'bottom',
            ],
            default => [
                'title' => '🎉 You\'re All Set!',
                'description' => 'You\'re ready to start chatting with AI. Click "Finish" to begin your first conversation!',
                'target' => null,
                'position' => 'center',
            ],
        };
    }
}