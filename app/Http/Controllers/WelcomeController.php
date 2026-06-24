<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class WelcomeController extends Controller
{
    public function index()
    {
        if (Auth::check()) {
            return redirect('/chat');
        }

        return Inertia::render('Welcome');
    }
}
