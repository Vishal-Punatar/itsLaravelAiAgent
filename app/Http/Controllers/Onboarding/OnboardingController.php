<?php

namespace App\Http\Controllers\Onboarding;

use App\Http\Controllers\Controller;
use App\Models\AiSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class OnboardingController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        
        // If already completed onboarding, redirect to chat
        if ($user->onboarding_completed && $user->aiSetting && $user->aiSetting->api_key) {
            return redirect('/chat');
        }

        $models = AiSetting::allowedModels();
        return view('onboarding.wizard', compact('models'));
    }

    public function complete(Request $request)
    {
        $validated = $request->validate([
            'provider' => 'required|string',
            'model' => 'required|string',
            'api_key' => 'required|string|min:10',
        ]);

        // Validate model belongs to provider
        $allowedModels = AiSetting::allowedModels();
        $providerModels = $allowedModels[$validated['provider']]['models'] ?? [];
        
        if (!isset($providerModels[$validated['model']])) {
            return back()->withErrors(['model' => 'Selected model is not valid for the chosen provider.']);
        }

        // Save AI settings
        AiSetting::updateOrCreate(
            ['user_id' => Auth::id()],
            [
                'provider' => $validated['provider'],
                'model' => $validated['model'],
                'api_key' => $validated['api_key'],
            ]
        );

        // Mark onboarding as completed
        Auth::user()->update(['onboarding_completed' => true]);

        return redirect('/chat')->with('success', 'Setup complete! Welcome to AI Chat.');
    }
}