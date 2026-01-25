# Telegram Group Management Bot

Professional Telegram bot for group management with file filtering, link monitoring, and member statistics.

## Features

- **🔒 APK File Filtering** - Auto-detects and removes `.apk`, `.xapk`, `.apkm` files
- **🔗 Link Monitoring** - Warns about HTTP/HTTPS, t.me, and hidden links
- **🗑 System Message Cleanup** - Removes join/leave notifications automatically
- **📊 Invitation Statistics** - Tracks who invited the most members

## Quick Start

### 1. Create a Bot
1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow instructions
3. Copy the bot token

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
BOT_TOKEN=your_bot_token_here
OWNER_ID=your_telegram_user_id
PORT=3000
```

> 💡 **Get your User ID**: Message [@userinfobot](https://t.me/userinfobot)

### 3. Install & Run
```bash
npm install
npm start
```

## Commands

| Command | Description | Access |
|---------|-------------|--------|
| `/start` | Welcome message | All |
| `/help` | Show all commands | All |
| `/settings` | View current settings | All |
| `/topinviters` | Show invitation statistics | All |
| `/toggle_filefilter` | Toggle APK filtering | Owner |
| `/toggle_linkwarning` | Toggle link warnings | Owner |
| `/toggle_systemmsg` | Toggle system message deletion | Owner |
| `/set_apk_warning <text>` | Custom APK warning text | Owner |
| `/set_link_warning <text>` | Custom link warning text | Owner |
| `/reset_settings` | Reset to defaults | Owner |
| `/reset_stats` | Clear statistics | Owner |

## Project Structure

```
├── src/
│   ├── config/
│   │   └── botConfig.js       # Settings management
│   ├── handlers/
│   │   ├── fileFilter.js      # APK detection
│   │   ├── systemMessageHandler.js
│   │   ├── linkMonitor.js     # Link detection
│   │   └── statistics.js      # Invitation tracking
│   ├── middleware/
│   │   └── adminCheck.js      # Permission checks
│   ├── commands/
│   │   └── settings.js        # Bot commands
│   ├── utils/
│   │   └── helpers.js         # Utility functions
│   └── bot.js                 # Bot initialization
├── server.js                  # Express entry point
├── .env.example
└── package.json
```

## Adding Bot to Groups

1. Add bot to your group
2. Make bot an **Administrator** with permissions:
   - Delete messages
   - Ban users (optional)

## License

MIT
