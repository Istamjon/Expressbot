/**
 * Settings Commands Handler
 * Bot configuration commands (owner only)
 */

const { getSettings, toggleSetting, updateSetting, resetSettings } = require('../config/botConfig');
const { isBotOwner } = require('../middleware/adminCheck');
const { formatTopInvitersMessage, resetStats } = require('../handlers/statistics');

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
🚫 APK/EXE fayl filtri
⚠️ Link va reklama nazorati
🗑 Kirdi-chiqdi tozalash
📊 Faol a'zolar reytingi

<i>Sozlamalar uchun: /settings</i>
        `.trim();

        await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'HTML' });
    });

    // /help command
    bot.onText(/\/help/, async (msg) => {
        const chatId = msg.chat.id;

        const helpMessage = `
📚 <b>Qo'llanma</b>

🔹 <b>Foydalanuvchilar uchun:</b>
/topinviters - 🏆 Reyting jadvali
/help - ❓ Yordam

🔹 <b>Adminlar uchun:</b>
/settings - ⚙️ Sozlamalar paneli
/toggle_filefilter - 📁 Fayl filtr (ON/OFF)
/toggle_linkwarning - 🔗 Link nazorat (ON/OFF)
/toggle_systemmsg - 🗑 Tizim xabar (ON/OFF)
/reset_settings - 🔄 Reset
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

${settings.fileFilterEnabled ? onCode : offCode} <b>APK filtr</b>
${settings.linkWarningEnabled ? onCode : offCode} <b>Link nazorat</b>
${settings.systemMessageDeleteEnabled ? onCode : offCode} <b>System xabar o'chirish</b>

✍️ <b>Matnlar:</b>
1️⃣ <b>APK:</b> <i>${settings.apkWarningMessage}</i>
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

    // /toggle_filefilter command (owner only, private chat redirect)
    bot.onText(/\/toggle_filefilter/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        // Redirect to private admin panel if in group
        if (msg.chat.type !== 'private') {
            await bot.sendMessage(chatId, '⚙️ Sozlamalar faqat <b>shaxsiy yozishmada</b> (/admin) o\'zgartiriladi.', { parse_mode: 'HTML' });
            return;
        }

        if (!isBotOwner(userId)) {
            await bot.sendMessage(chatId, '⛔️ Siz admin emassiz.');
            return;
        }

        const newValue = await toggleSetting(chatId, 'fileFilterEnabled');
        const status = newValue ? '🟢 Yoqildi' : '🔴 O\'chirildi';
        await bot.sendMessage(chatId, `📁 Fayl filtri: ${status}`);
    });

    // /toggle_linkwarning command (owner only)
    bot.onText(/\/toggle_linkwarning/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isBotOwner(userId)) {
            await bot.sendMessage(chatId, '⛔️ Siz admin emassiz.');
            return;
        }

        const newValue = await toggleSetting(chatId, 'linkWarningEnabled');
        const status = newValue ? '🟢 Yoqildi' : '🔴 O\'chirildi';
        await bot.sendMessage(chatId, `🔗 Link nazorat: ${status}`);
    });

    // /toggle_systemmsg command (owner only)
    bot.onText(/\/toggle_systemmsg/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isBotOwner(userId)) {
            await bot.sendMessage(chatId, '⛔️ Siz admin emassiz.');
            return;
        }

        const newValue = await toggleSetting(chatId, 'systemMessageDeleteEnabled');
        const status = newValue ? '🟢 Yoqildi' : '🔴 O\'chirildi';
        await bot.sendMessage(chatId, `🗑 Tizim xabarlari: ${status}`);
    });

    // /set_apk_warning command (owner only)
    bot.onText(/\/set_apk_warning (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isBotOwner(userId)) {
            await bot.sendMessage(chatId, '⛔️ Siz admin emassiz.');
            return;
        }

        const newMessage = match[1].trim();
        await updateSetting(chatId, 'apkWarningMessage', newMessage);
        await bot.sendMessage(chatId, `✅ <b>APK matni yangilandi:</b>\n\n"${newMessage}"`, {
            parse_mode: 'HTML'
        });
    });

    // /set_link_warning command (owner only)
    bot.onText(/\/set_link_warning (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isBotOwner(userId)) {
            await bot.sendMessage(chatId, '⛔️ Siz admin emassiz.');
            return;
        }

        const newMessage = match[1].trim();
        await updateSetting(chatId, 'linkWarningMessage', newMessage);
        await bot.sendMessage(chatId, `✅ <b>Link matni yangilandi:</b>\n\n"${newMessage}"`, {
            parse_mode: 'HTML'
        });
    });

    // /reset_settings command (owner only)
    bot.onText(/\/reset_settings/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isBotOwner(userId)) {
            await bot.sendMessage(chatId, '⛔️ Siz admin emassiz.');
            return;
        }

        await resetSettings(chatId);
        await bot.sendMessage(chatId, '🔄 Sozlamalar qayta tiklandi.');
    });

    // /reset_stats command (owner only)
    bot.onText(/\/reset_stats/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isBotOwner(userId)) {
            await bot.sendMessage(chatId, '⛔️ Siz admin emassiz.');
            return;
        }

        await resetStats(chatId);
        await bot.sendMessage(chatId, '🗑 Statistika tozalandi.');
    });

    console.log('[Settings] All commands registered');
}

module.exports = {
    registerSettingsCommands
};
