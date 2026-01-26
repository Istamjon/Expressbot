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
const { handleAdminCommand, handleCallbackQuery, handlePendingInput } = require('./handlers/adminPanel');

// Import config
const { registerGroup, unregisterGroup } = require('./config/botConfig');

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

    // /admin command handler (private chat only)
    bot.onText(/\/admin/, async (msg) => {
        try {
            await handleAdminCommand(bot, msg);
        } catch (error) {
            console.error('[Bot] Admin command error:', error.message);
        }
    });

    // Help message for groups
    const groupHelpMessage = `🤖 <b>Xush kelibsiz!</b>

Bot guruhlarni zararli fayllar va havolalardan himoya qiladi.

<b>Mavjud buyruqlar:</b>
/settings - Sozlamalarni ko'rish
/topinviters - Statistika

<b>Admin panel:</b>
Bot egasi menga private xabar yuborib /admin buyrug'i orqali sozlamalarni boshqarishi mumkin.`;

    // Help message for private
    const privateHelpMessage = `🤖 <b>Xush kelibsiz!</b>

Bot guruhlarni zararli fayllar va havolalardan himoya qiladi.

<b>Botni ishlatish uchun:</b>
1️⃣ Botni guruhga qo'shing
2️⃣ Botga admin huquqini bering
3️⃣ Bot avtomatik .apk fayllarni o'chiradi

<b>Admin panel:</b>
/admin - Sozlamalarni boshqarish (faqat bot egasi)`;

    // /start command handler
    bot.onText(/\/start/, async (msg) => {
        try {
            const helpMessage = msg.chat.type === 'private' ? privateHelpMessage : groupHelpMessage;
            await bot.sendMessage(msg.chat.id, helpMessage, { parse_mode: 'HTML' });
        } catch (error) {
            console.error('[Bot] Start command error:', error.message);
        }
    });

    // /help command handler
    bot.onText(/\/help/, async (msg) => {
        try {
            const helpMessage = msg.chat.type === 'private' ? privateHelpMessage : groupHelpMessage;
            await bot.sendMessage(msg.chat.id, helpMessage, { parse_mode: 'HTML' });
        } catch (error) {
            console.error('[Bot] Help command error:', error.message);
        }
    });

    // Callback query handler for inline buttons
    bot.on('callback_query', async (query) => {
        try {
            await handleCallbackQuery(bot, query);
        } catch (error) {
            console.error('[Bot] Callback query error:', error.message);
        }
    });

    // Main message handler
    bot.on('message', async (msg) => {
        try {
            // Handle pending text input for admin panel (private chat)
            if (msg.chat.type === 'private' && msg.text && !msg.text.startsWith('/')) {
                const handled = await handlePendingInput(bot, msg);
                if (handled) return;
            }

            // Track group registration when bot is added to a group
            if (msg.new_chat_members) {
                const botInfo = await bot.getMe();
                const botWasAdded = msg.new_chat_members.some(member => member.id === botInfo.id);
                if (botWasAdded && (msg.chat.type === 'group' || msg.chat.type === 'supergroup')) {
                    registerGroup(msg.chat.id, msg.chat.title);
                }
            }

            // Track group unregistration when bot is removed
            if (msg.left_chat_member) {
                const botInfo = await bot.getMe();
                if (msg.left_chat_member.id === botInfo.id) {
                    unregisterGroup(msg.chat.id);
                }
            }

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

