<?php

use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\AiAgentController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\InertiaChatController;
use App\Http\Controllers\Onboarding\OnboardingController;
use App\Http\Controllers\Profile\ProfileController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\AttachmentController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Test route for Inertia/React
Route::get('/react-test', function () {
    return Inertia::render('Welcome', ['name' => 'Vishal']);
});

// Original redirect
Route::get('/', function () {
    return redirect('/login');
});

Route::middleware('guest')->group(function () {
    Route::get('/login', [LoginController::class, 'showLoginForm'])->name('login');
    Route::post('/login', [LoginController::class, 'login']);
    Route::get('/register', [RegisterController::class, 'showRegistrationForm']);
    Route::post('/register', [RegisterController::class, 'register']);
});

Route::middleware('auth')->group(function () {
    // Redirect to chat (no onboarding required)
    Route::get('/', fn() => redirect('/chat'));
    
    Route::get('/onboarding', fn() => redirect('/chat'));
    Route::post('/onboarding/complete', fn() => redirect('/chat'))->name('onboarding.complete');
    
    Route::get('/dashboard', fn() => redirect('/chat'));
    
    // Chat routes - GET requests use Inertia (React), POST requests still use ChatController (Blade fallback)
    Route::get('/chat', [InertiaChatController::class, 'index'])->name('chat.index');
    Route::get('/chat/{id}', [InertiaChatController::class, 'show'])->name('chat.show');
    Route::post('/chat', [ChatController::class, 'store']);
    Route::post('/chat/{id}', [ChatController::class, 'sendMessage']);
    Route::post('/chat/{id}/pin', [ChatController::class, 'togglePin']);
    Route::post('/chat/{id}/rename', [ChatController::class, 'rename']);
    Route::delete('/chat/{id}', [ChatController::class, 'destroy']);
    Route::delete('/chat/{id}', [ChatController::class, 'destroy'])->name('chat.destroy');
    
    // Settings (redirects to profile)
    Route::get('/settings', fn() => redirect('/profile'))->name('settings.index');
    Route::put('/settings', fn() => redirect('/profile'))->name('settings.update');
    
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
    
    // Attachment serving route
    Route::get('/attachment/{userId}/{filename}', [AttachmentController::class, 'show'])->name('attachment.show');
    
    // Logout
    Route::post('/logout', [LoginController::class, 'logout'])->name('logout');
});

// Admin routes (protected by admin middleware - non-admins get logged out)
Route::middleware(['auth', 'admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', [AdminController::class, 'index'])->name('dashboard');
    Route::get('/users', [AdminController::class, 'users'])->name('users');
    Route::get('/users/{id}/edit', [AdminController::class, 'editUser'])->name('users.edit');
    Route::put('/users/{id}', [AdminController::class, 'updateUser'])->name('users.update');
    Route::delete('/users/{id}', [AdminController::class, 'destroyUser'])->name('users.delete');
    Route::get('/models', [AdminController::class, 'models'])->name('models');
    Route::get('/settings', [AdminController::class, 'allSettings'])->name('settings');
});