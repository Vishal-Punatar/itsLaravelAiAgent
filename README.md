# itsLaravelAiAgent

AI-powered chat agent application built with Laravel, Inertia.js, and React.

## Features

- AI Agent chat interface
- User authentication (register/login)
- Admin dashboard
- Chat history with persistence
- File attachments support
- Multi-theme support
- Product tour / onboarding

## Tech Stack

- **Backend:** Laravel 11, PHP 8.3
- **Frontend:** React, Inertia.js, TypeScript, Vite
- **Database:** MySQL
- **AI:** OpenRouter-compatible AI providers

## Setup

### Requirements

- PHP 8.3+
- Composer 2
- Node.js 18+
- MySQL 8.0+
- Nginx (or Apache)

### Installation

After cloning the repository, follow these steps to get the site live:

```bash
# 1. Clone the repo
git clone git@github.com:Vishal-Punatar/itsLaravelAiAgent.git
cd itsLaravelAiAgent

# 2. Install PHP dependencies
composer install

# 3. Install Node.js dependencies
npm install

# 4. Create environment file
cp .env.example .env

# 5. Generate application key
php artisan key:generate

# 6. Configure your .env file
# Set your database credentials:
#   DB_CONNECTION=mysql
#   DB_HOST=127.0.0.1
#   DB_PORT=3306
#   DB_DATABASE=itsLaravelAiAgent
#   DB_USERNAME=your_username
#   DB_PASSWORD=your_password

# 7. Create the database
# Log into MySQL and run:
#   CREATE DATABASE itsLaravelAiAgent;

# 8. Run migrations
php artisan migrate

# 9. Build assets
npm run build

# 10. Start the development server
php artisan serve
```

Visit `http://localhost:8000` after starting the dev server.

---

### Production Setup (Nginx)

Point your web server to the `public/` directory:

```nginx
server_name itslaravelai.178.105.228.192.nip.io;
root /var/www/itsLaravelAiAgent/public;

# Add Laravel-specific config:
# - Rewrite URLs to public/index.php
# - Set max upload size
# - Configure SSL (recommended)

# Storage link (for file uploads)
php artisan storage:link
```

### First Admin Account

After running migrations, manually set a user as admin via database or tinker:

```bash
php artisan tinker
>>> \App\Models\User::where('email', 'your@email.com')->update(['is_admin' => true]);
```

## AI Configuration

After cloning, configure your AI provider in the admin settings panel or via `.env`:

```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=your_api_key
```

## License

MIT
