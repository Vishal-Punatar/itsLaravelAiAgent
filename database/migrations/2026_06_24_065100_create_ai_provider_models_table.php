<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('ai_provider_models', function (Blueprint $table) {
            $table->id();
            $table->string('provider_key'); // 'groq', 'anthropic', 'deepseek', etc.
            $table->string('model_id'); // 'llama-3.3-70b-versatile', 'claude-opus-4-8', etc.
            $table->string('model_label'); // 'Llama 3.3 70B Versatile'
            $table->string('status')->default('active'); // 'active', 'deprecated', 'new'
            $table->boolean('is_supported')->default(true); // still supported by provider
            $table->timestamp('last_checked_at')->nullable();
            $table->timestamps();

            // Unique per provider
            $table->unique(['provider_key', 'model_id']);
            // Index for fast lookups
            $table->index('provider_key');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_provider_models');
    }
};
