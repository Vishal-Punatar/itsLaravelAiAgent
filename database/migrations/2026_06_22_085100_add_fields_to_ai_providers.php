<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE ai_providers ADD api_key text NULL AFTER label");
        DB::statement("ALTER TABLE ai_providers ADD is_active tinyint(1) NOT NULL DEFAULT 1 AFTER is_default");
        DB::statement("ALTER TABLE ai_providers ADD default_model varchar(255) NULL AFTER api_key");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE ai_providers DROP COLUMN api_key");
        DB::statement("ALTER TABLE ai_providers DROP COLUMN is_active");
        DB::statement("ALTER TABLE ai_providers DROP COLUMN default_model");
    }
};
