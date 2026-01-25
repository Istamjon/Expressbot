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
🤖 <b>Guruh Boshqaruv Boti</b>

Ushbu bot guruhingizni boshqarishda yordam beradi:

📁 <b>Fayl filtrlash</b> - .apk, .xapk, .apkm fayllarini avtomatik o'chiradi
🔗 <b>Link monitoring</b> - Havolalar haqida ogohlantiradi
🗑 <b>Tizim xabarlari</b> - Kirdi/chiqdi xabarlarini o'chiradi
📊 <b>Statistika</b> - Eng ko'p a'zo qo'shganlarni ko'rsatadi

<b>Buyruqlar:</b>
/settings - Sozlamalarni ko'rish
/topinviters - Statistika ko'rish
/help - Yordam

<i>Sozlamalarni faqat bot egasi o'zgartirishi mumkin.</i>
        `.trim();

        await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'HTML' });
    });

    // /help command
    bot.onText(/\/help/, async (msg) => {
        const chatId = msg.chat.id;

        const helpMessage = `
📚 <b>Bot Buyruqlari</b>

<b>Umumiy:</b>
/start - Botni ishga tushirish
/help - Ushbu yordam
/settings - Joriy sozlamalar
/topinviters - Statistika

<b>Sozlamalar (faqat egasi):</b>
/toggle_filefilter - Fayl filtrlash ON/OFF
/toggle_linkwarning - Link ogohlantirish ON/OFF
/toggle_systemmsg - Tizim xabarlari ON/OFF
/set_apk_warning &lt;matn&gt; - APK ogohlantirish matni
/set_link_warning &lt;matn&gt; - Link ogohlantirish matni
/reset_settings - Sozlamalarni tiklash
/reset_stats - Statistikani tozalash
        `.trim();

        await bot.sendMessage(chatId, helpMessage, { parse_mode: 'HTML' });
    });

    // /settings command
    bot.onText(/\/settings/, async (msg) => {
        const chatId = msg.chat.id;
        const settings = getSettings(chatId);

        const statusEmoji = (enabled) => enabled ? '✅' : '❌';

        const settingsMessage = `
⚙️ <b>Joriy Sozlamalar</b>

${statusEmoji(settings.fileFilterEnabled)} Fayl filtrlash (.apk)
${statusEmoji(settings.linkWarningEnabled)} Link ogohlantirish
${statusEmoji(settings.systemMessageDeleteEnabled)} Tizim xabarlari o'chirish

<b>APK ogohlantirish matni:</b>
<i>${settings.apkWarningMessage}</i>

<b>Link ogohlantirish matni:</b>
<i>${settings.linkWarningMessage}</i>
        `.trim();

        await bot.sendMessage(chatId, settingsMessage, { parse_mode: 'HTML' });
    });

    // /topinviters command
    bot.onText(/\/topinviters/, async (msg) => {
        const chatId = msg.chat.id;
        const message = formatTopInvitersMessage(chatId);
        await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    });

    // /toggle_filefilter command (owner only)
    bot.onText(/\/toggle_filefilter/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isBotOwner(userId)) {
            await bot.sendMessage(chatId, '❌ Bu buyruqni faqat bot egasi ishlatishi mumkin.');
            return;
        }

        const newValue = toggleSetting(chatId, 'fileFilterEnabled');
        const status = newValue ? '✅ YOQILDI' : '❌ O\'CHIRILDI';
        await bot.sendMessage(chatId, `📁 Fayl filtrlash: ${status}`);
    });

    // /toggle_linkwarning command (owner only)
    bot.onText(/\/toggle_linkwarning/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isBotOwner(userId)) {
            await bot.sendMessage(chatId, '❌ Bu buyruqni faqat bot egasi ishlatishi mumkin.');
            return;
        }

        const newValue = toggleSetting(chatId, 'linkWarningEnabled');
        const status = newValue ? '✅ YOQILDI' : '❌ O\'CHIRILDI';
        await bot.sendMessage(chatId, `🔗 Link ogohlantirish: ${status}`);
    });

    // /toggle_systemmsg command (owner only)
    bot.onText(/\/toggle_systemmsg/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isBotOwner(userId)) {
            await bot.sendMessage(chatId, '❌ Bu buyruqni faqat bot egasi ishlatishi mumkin.');
            return;
        }

        const newValue = toggleSetting(chatId, 'systemMessageDeleteEnabled');
        const status = newValue ? '✅ YOQILDI' : '❌ O\'CHIRILDI';
        await bot.sendMessage(chatId, `🗑 Tizim xabarlari o'chirish: ${status}`);
    });

    // /set_apk_warning command (owner only)
    bot.onText(/\/set_apk_warning (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isBotOwner(userId)) {
            await bot.sendMessage(chatId, '❌ Bu buyruqni faqat bot egasi ishlatishi mumkin.');
            return;
        }

        const newMessage = match[1].trim();
        updateSetting(chatId, 'apkWarningMessage', newMessage);
        await bot.sendMessage(chatId, `✅ APK ogohlantirish matni yangilandi:\n\n<i>${newMessage}</i>`, {
            parse_mode: 'HTML'
        });
    });

    // /set_link_warning command (owner only)
    bot.onText(/\/set_link_warning (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isBotOwner(userId)) {
            await bot.sendMessage(chatId, '❌ Bu buyruqni faqat bot egasi ishlatishi mumkin.');
            return;
        }

        const newMessage = match[1].trim();
        updateSetting(chatId, 'linkWarningMessage', newMessage);
        await bot.sendMessage(chatId, `✅ Link ogohlantirish matni yangilandi:\n\n<i>${newMessage}</i>`, {
            parse_mode: 'HTML'
        });
    });

    // /reset_settings command (owner only)
    bot.onText(/\/reset_settings/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isBotOwner(userId)) {
            await bot.sendMessage(chatId, '❌ Bu buyruqni faqat bot egasi ishlatishi mumkin.');
            return;
        }

        resetSettings(chatId);
        await bot.sendMessage(chatId, '✅ Sozlamalar boshlang\'ich holatga qaytarildi.');
    });

    // /reset_stats command (owner only)
    bot.onText(/\/reset_stats/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (!isBotOwner(userId)) {
            await bot.sendMessage(chatId, '❌ Bu buyruqni faqat bot egasi ishlatishi mumkin.');
            return;
        }

        resetStats(chatId);
        await bot.sendMessage(chatId, '✅ Statistika tozalandi.');
    });

    console.log('[Settings] All commands registered');
}

module.exports = {
    registerSettingsCommands
};
