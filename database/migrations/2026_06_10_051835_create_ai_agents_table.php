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
        Schema::create('ai_agents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('name'); // User-defined name like "Gemini for Images"
            $table->string('provider'); // openai, gemini, etc.
            $table->text('api_key'); // Encrypted API key
            $table->string('model')->nullable(); // Optional specific model
            $table->boolean('is_default')->default(false);
            $table->timestamps();
 });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_agents');
    }
};
