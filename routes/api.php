<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\ProductTourController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Protected routes
Route::get('/tour', [ProductTourController::class, 'start']);
Route::post('/tour/complete', [ProductTourController::class, 'complete']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    
    // Chat API
    Route::get('/chats', [ChatController::class, 'index']);
    Route::get('/chats/{id}', [ChatController::class, 'show']);
    Route::post('/chats', [ChatController::class, 'store']);
    Route::post('/chats/{id}/messages', [ChatController::class, 'addMessage']);
    Route::post('/chats/bridge', [ChatController::class, 'bridgeMessage']);
});

// External bridge route (for OpenClaw) - uses API key auth
Route::middleware('auth.apikey')->group(function () {
    Route::post('/bridge/chat', [ChatController::class, 'bridgeMessage']);
    Route::post('/bridge/chat/{id}/message', [ChatController::class, 'addMessage']);
});