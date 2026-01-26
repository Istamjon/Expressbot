/**
 * Settings Commands Handler
 * Bot configuration commands (owner only)
 */

const { getSettings } = require('../config/botConfig');
const { formatTopInvitersMessage } = require('../handlers/statistics');

/**
 * Register all settings commands
 * @param {Object} bot - Telegram bot instance
 */
function registerSettingsCommands(bot) {

    // /start command
    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;

        const welcomeMessage = `
⚡️ <b>Bot ishga tushdi!</b>

Men guruhlarni nazorat qiluvchi yordamchiman.
Botni guruhingizga qo'shing va <b>Admin</b> qiling.

⚙️ <b>Imkoniyatlarim:</b>
🚫 Xavfli fayllarni filtrlash
⚠️ Havolalar nazorati
🗑 Kirdi-chiqdi tozalash
📊 Faol a'zolar reytingi

<i>Sozlamalar uchun: /admin (shaxsiy chatda)</i>
        `.trim();

        await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'HTML' });
    });

    // /help command
    bot.onText(/\/help/, async (msg) => {
        const chatId = msg.chat.id;

        const helpMessage = `
📚 <b>Qo'llanma</b>

<b>Mavjud buyruqlar:</b>
/topinviters - 🏆 Reyting jadvali
/settings - ⚙️ Joriy sozlamalar
/help - ❓ Ushbu yordam

<b>Admin panel:</b>
Bot egasi shaxsiy chatda /admin buyrug'i orqali sozlamalarni boshqaradi.
        `.trim();

        await bot.sendMessage(chatId, helpMessage, { parse_mode: 'HTML' });
    });

    // /settings command
    bot.onText(/\/settings/, async (msg) => {
        const chatId = msg.chat.id;
        const settings = await getSettings(chatId);

        const onCode = '🟢';
        const offCode = '🔴';

        const settingsMessage = `
⚙️ <b>Guruh Sozlamalari</b>

${settings.fileFilterEnabled ? onCode : offCode} <b>Fayl filtri</b>
${settings.linkWarningEnabled ? onCode : offCode} <b>Link nazorat</b>
${settings.systemMessageDeleteEnabled ? onCode : offCode} <b>System xabar o'chirish</b>

✍️ <b>Matnlar:</b>
1️⃣ <b>Fayl:</b> <i>${settings.apkWarningMessage}</i>
2️⃣ <b>Link:</b> <i>${settings.linkWarningMessage}</i>

<i>O'zgartirish uchun admin panelga o'ting:</i> /start
        `.trim();

        await bot.sendMessage(chatId, settingsMessage, { parse_mode: 'HTML' });
    });

    // /topinviters command
    bot.onText(/\/topinviters/, async (msg) => {
        const chatId = msg.chat.id;
        const message = await formatTopInvitersMessage(chatId);
        await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    });

    console.log('[Settings] All commands registered');
}

module.exports = {
    registerSettingsCommands
};
