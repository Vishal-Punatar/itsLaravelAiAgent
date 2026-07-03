<?php

use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\Api\AgentLiveModelsController;
use App\Http\Controllers\AiAgentController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\InertiaChatController;
use App\Http\Controllers\Profile\ProfileController;
use App\Http\Controllers\AttachmentController;
use App\Http\Controllers\WelcomeController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::get('/', [WelcomeController::class, 'index'])->name('welcome');
    Route::get('/login', [LoginController::class, 'showLoginForm'])->name('login');
    Route::post('/login', [LoginController::class, 'login']);
    Route::get('/register', [RegisterController::class, 'showRegistrationForm']);
    Route::post('/register', [RegisterController::class, 'register']);

    // Password reset flow — user clicks "Forgot password?" on /login,
    // submits email, gets a reset link via email (currently logged to
    // storage/logs/laravel.log while MAIL_MAILER=log). The link lands
    // on /reset-password/{token} where they set a new password.
    Route::get('/forgot-password', [PasswordResetLinkController::class, 'create'])->name('password.request');
    Route::post('/forgot-password', [PasswordResetLinkController::class, 'store'])->name('password.email');
    Route::get('/reset-password/{token}', [NewPasswordController::class, 'create'])->name('password.reset');
    Route::post('/reset-password', [NewPasswordController::class, 'store'])->name('password.store');
});

Route::middleware('auth')->group(function () {
    // Chat routes - GET requests use Inertia (React), POST/DELETE use ChatController
    Route::get('/chat', [InertiaChatController::class, 'index'])->name('chat.index');
    Route::get('/chat/{id}', [InertiaChatController::class, 'show'])->name('chat.show');
    Route::post('/chat', [ChatController::class, 'store']);
    Route::post('/chat/{id}', [ChatController::class, 'sendMessage']);
    Route::post('/chat/{id}/pin', [ChatController::class, 'togglePin']);
    Route::post('/chat/{id}/favourite', [ChatController::class, 'toggleFavourite']);
    Route::post('/chat/{id}/rename', [ChatController::class, 'rename']);
    Route::delete('/chat/{id}', [ChatController::class, 'destroy'])->name('chat.destroy');

    // Profile
    Route::get('/profile', [ProfileController::class, 'index'])->name('profile.index');
    Route::post('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::post('/profile/password', [ProfileController::class, 'changePassword'])->name('profile.password');
    Route::post('/profile/theme', [ProfileController::class, 'updateTheme'])->name('profile.theme');

    // AI Agents
    Route::get('/ai-agents', [AiAgentController::class, 'index'])->name('ai-agents.index');
    Route::get('/ai-agents/create', [AiAgentController::class, 'create'])->name('ai-agents.create');
    Route::post('/ai-agents', [AiAgentController::class, 'store'])->name('ai-agents.store');
    Route::get('/ai-agents/{aiAgent}/edit', [AiAgentController::class, 'edit'])->name('ai-agents.edit');
    Route::put('/ai-agents/{aiAgent}', [AiAgentController::class, 'update'])->name('ai-agents.update');
    Route::delete('/ai-agents/{aiAgent}', [AiAgentController::class, 'destroy'])->name('ai-agents.destroy');
    Route::post('/ai-agents/{aiAgent}/set-default', [AiAgentController::class, 'setDefault'])->name('ai-agents.setDefault');
    Route::get('/ai-agents/list', [AiAgentController::class, 'list'])->name('ai-agents.list');

    // Chat UI runtime: live model list for the Model Selector dropdown.
    // {agent} may be an integer agent ID (real, owned by user) or -1 for admin default.
    // Pure runtime fetch — no DB persistence of the returned list.
    Route::get('/api/agents/{agent}/live-models', [AgentLiveModelsController::class, 'show'])
        ->name('api.agents.liveModels');

    // Attachment serving route
    Route::get('/attachment/{userId}/{filename}', [AttachmentController::class, 'show'])->name('attachment.show');

    // Logout
    Route::post('/logout', [LoginController::class, 'logout'])->name('logout');
});

// Admin routes
Route::middleware(['auth', 'admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', [AdminController::class, 'index'])->name('dashboard');
    Route::get('/users', [AdminController::class, 'users'])->name('users');
    Route::get('/users/{id}/edit', [AdminController::class, 'editUser'])->name('users.edit');
    Route::put('/users/{id}', [AdminController::class, 'updateUser'])->name('users.update');
    Route::delete('/users/{id}', [AdminController::class, 'destroyUser'])->name('users.delete');
    Route::get('/providers', [AdminController::class, 'providers'])->name('providers');
    Route::post('/providers', [AdminController::class, 'storeProvider'])->name('providers.store');
    Route::put('/providers/{id}', [AdminController::class, 'updateProvider'])->name('providers.update');
    Route::post('/providers/{id}/set-default', [AdminController::class, 'setDefaultProvider'])->name('providers.setDefault');
    Route::post('/providers/{id}/toggle-active', [AdminController::class, 'toggleProviderActive'])->name('providers.toggleActive');
    Route::post('/providers/{id}/test-connection', [AdminController::class, 'testProviderConnection'])->name('providers.testConnection');
    Route::post('/providers/default/remove', [AdminController::class, 'removeDefaultProvider'])->name('providers.removeDefault');
    Route::get('/settings', [AdminController::class, 'allSettings'])->name('settings');
});
