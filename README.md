# 🤖 Ximoyachi Bot (Telegram Group Management)

Professional Telegram bot for group security and management. Optimized with **PostgreSQL**, **Docker**, and a clean **Admin Panel**.

## 🚀 Features

- **🛡️ Xavfli Fayl Filtri** - Auto-detects and removes security threats: `.apk`, `.exe`, `.bat`, `.cmd`, `.scr`, `.msi`.
- **🔗 Link Monitor** - Detects and warns about URLs (HTTP/HTTPS), `t.me` links, and mentions.
- **🗑️ System Message Cleanup** - Automatically removes join/leave/pinned system messages.
- **📊 Premium Statistics** - Tracks member invitation statistics with unique referral detection.
- **⚙️ Admin Panel** - Powerful inline-keyboard based configuration for the bot owner.
- **🐘 PostgreSQL Database** - Reliable data storage for settings and statistics.
- **🐳 Docker Ready** - Easily deployable with `docker-compose`.

## 🛠️ Setup & Deployment

### 1. Prerequisites
- Docker & Docker Compose
- Telegram Bot Token ([@BotFather](https://t.me/BotFather))
- Your User ID ([@userinfobot](https://t.me/userinfobot))

### 2. Configuration
Copy the template and fill in your details:
```bash
cp .env.example .env
```

Edit `.env`:
```env
BOT_TOKEN=85xxx...
OWNER_ID=123xx...
# Database settings (defaults work with Docker)
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=telegram_bot_db
DB_HOST=localhost # Use 'bot-postgres' for Docker
```

### 3. Running with Docker (Recommended)
```bash
docker-compose up -d --build
```

### 4. Direct Node.js Run
```bash
npm install
npm start
```

## 🎮 Commands

| Command | Description | Visibility |
|---------|-------------|------------|
| `/start` | Welcome and feature list | All |
| `/help` | Bot usage guide | All |
| `/settings` | Current group settings (read-only) | Group |
| `/topinviters` | Invitation leaderboard | Group |
| `/admin` | Open Admin Panel | **Owner (Private Only)** |

## 📂 Project Structure

```
├── src/
│   ├── commands/      # Bot commands (/start, /help, etc)
│   ├── config/        # Database-backed settings manager
│   ├── db/            # PostgreSQL connection & schema
│   ├── handlers/      # Core logic (File filtering, Stats, Links)
│   ├── middleware/    # Admin/Owner check logic
│   ├── utils/         # Helpers & naming utils
│   └── bot.js         # Main bot initialization logic
├── server.js          # Entry point (Express server)
├── Dockerfile         # Bot container image
└── docker-compose.yml # Full stack definition (Bot + Postgres)
```

## 🔑 Permissions Required
To function correctly, the bot **must** be an Administrator in the group with **Delete Messages** permission.

## 📄 License
MIT
