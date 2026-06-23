<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE ai_agents MODIFY api_key text NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE ai_agents MODIFY api_key text NOT NULL");
    }
};
