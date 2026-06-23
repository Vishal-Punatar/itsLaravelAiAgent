<?php

namespace Database\Seeders;

use App\Models\AiAgent;
use App\Models\AiProvider;
use Illuminate\Database\Seeder;

class AiProviderSeeder extends Seeder
{
    // Map our app's provider keys to Laravel AI Lab enum values
    private const LAB_KEY_MAP = [
        'google' => 'gemini',
    ];

    public function run(): void
    {
        $providers = AiAgent::allowedModels();
        $defaultKey = 'gemini'; // Must match Lab enum value

        $defaults = [
            'gemini' => 'gemini-2.0-flash',
            'openai' => 'gpt-4o-mini',
            'anthropic' => 'claude-3-5-haiku-20241022',
            'azure' => 'gpt-4o-mini',
            'bedrock' => 'anthropic.claude-3-5-sonnet-20241022-v1_0',
            'groq' => 'llama-3.1-8b-instant',
            'xai' => 'grok-2-mini',
            'deepseek' => 'deepseek-chat',
            'mistral' => 'mistral-small-latest',
            'ollama' => 'llama3.2',
            'openrouter' => 'openrouter/auto',
        ];

        foreach ($providers as $key => $config) {
            // Map to Lab enum key (google -> gemini, others unchanged)
            $labKey = self::LAB_KEY_MAP[$key] ?? $key;

            AiProvider::updateOrCreate(
                ['key' => $labKey],
                [
                    'label' => $config['label'],
                    'is_default' => $labKey === $defaultKey,
                    'is_active' => true,
                    'default_model' => $defaults[$labKey] ?? null,
                ]
            );
        }
    }
}
