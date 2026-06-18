<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;

class AttachmentController extends Controller
{
    /**
     * Serve an attachment file.
     */
    public function show(Request $request, $userId, $filename)
    {
        // Security: ensure user can only access their own attachments
        if (!Auth::check() || Auth::id() != $userId) {
            abort(403);
        }
        
        $path = "attachments/{$userId}/{$filename}";
        
        if (!Storage::disk('local')->exists($path)) {
            abort(404);
        }
        
        $fullPath = Storage::disk('local')->path($path);
        $mime = Storage::disk('local')->mimeType($path);
        
        return response()->file($fullPath, [
            'Content-Type' => $mime,
        ]);
    }
}