/**
 * Main Bot Initialization
 * Telegram Group Management Bot
 */

const TelegramBot = require('node-telegram-bot-api');

// Import handlers
const { handleFileFilter } = require('./handlers/fileFilter');
const { handleSystemMessage } = require('./handlers/systemMessageHandler');
const { handleLinkMonitor } = require('./handlers/linkMonitor');
const { handleStatistics } = require('./handlers/statistics');

// Import commands
const { registerSettingsCommands } = require('./commands/settings');

/**
 * Initialize and configure the Telegram bot
 * @returns {Object} Configured bot instance
 */
function initializeBot() {
    const token = process.env.BOT_TOKEN;

    if (!token) {
        console.error('[Bot] ERROR: BOT_TOKEN is not defined in environment variables');
        process.exit(1);
    }

    if (!process.env.OWNER_ID) {
        console.warn('[Bot] WARNING: OWNER_ID is not defined. Settings will be locked.');
    }

    // Create bot instance with polling
    const bot = new TelegramBot(token, {
        polling: {
            interval: 300,
            autoStart: true,
            params: {
                timeout: 10
            }
        }
    });

    console.log('[Bot] Bot instance created, starting polling...');

    // Register command handlers
    registerSettingsCommands(bot);

    // Help message
    const helpMessage = `🤖 <b>Xush kelibsiz!</b>

Bot guruhlarni zararli fayllar va havolalardan himoya qiladi.

<b>Botni ishlatish uchun:</b>
1️⃣ Botni guruhga qo'shing
2️⃣ Botga admin huquqini bering
3️⃣ Bot avtomatik .apk fayllarni o'chiradi va linklar uchun ogohlantiradi
 

<b>Mavjud buyruqlar:</b>
/start - Botni ishga tushirish
/help - Yordam xabarini ko'rish
/settings - Sozlamalarni ko'rish (faqat admin)`;

    // /start command handler
    bot.onText(/\/start/, async (msg) => {
        try {
            await bot.sendMessage(msg.chat.id, helpMessage, { parse_mode: 'HTML' });
        } catch (error) {
            console.error('[Bot] Start command error:', error.message);
        }
    });

    // /help command handler
    bot.onText(/\/help/, async (msg) => {
        try {
            await bot.sendMessage(msg.chat.id, helpMessage, { parse_mode: 'HTML' });
        } catch (error) {
            console.error('[Bot] Help command error:', error.message);
        }
    });

    // Main message handler
    bot.on('message', async (msg) => {
        try {
            // Track statistics first (before message might be deleted)
            await handleStatistics(bot, msg);

            // Handle system messages (join/leave, etc.)
            const wasSystemMessage = await handleSystemMessage(bot, msg);

            // If it was a system message that got deleted, skip other handlers
            if (wasSystemMessage) {
                return;
            }

            // Handle file filtering (.apk, .xapk, .apkm)
            await handleFileFilter(bot, msg);

            // Handle link monitoring
            await handleLinkMonitor(bot, msg);

        } catch (error) {
            console.error('[Bot] Message handler error:', error.message);
        }
    });

    // Handle polling errors
    bot.on('polling_error', (error) => {
        console.error('[Bot] Polling error:', error.code, error.message);
    });

    // Handle webhook errors (in case webhook is used later)
    bot.on('webhook_error', (error) => {
        console.error('[Bot] Webhook error:', error.code, error.message);
    });

    // Log when bot starts
    bot.getMe().then((botInfo) => {
        console.log(`[Bot] ✅ Bot started successfully!`);
        console.log(`[Bot] 🤖 Bot name: @${botInfo.username}`);
        console.log(`[Bot] 📋 Bot ID: ${botInfo.id}`);
    }).catch((error) => {
        console.error('[Bot] Failed to get bot info:', error.message);
    });

    return bot;
}

/**
 * Gracefully stop the bot
 * @param {Object} bot - Bot instance
 */
function stopBot(bot) {
    if (bot) {
        console.log('[Bot] Stopping bot...');
        bot.stopPolling();
        console.log('[Bot] Bot stopped.');
    }
}

module.exports = {
    initializeBot,
    stopBot
};
