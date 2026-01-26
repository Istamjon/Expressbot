/**
 * Admin Panel Handler
 * Private chat admin panel with inline buttons
 */

const { getSettings, toggleSetting, updateSetting, resetSettings, getRegisteredGroups } = require('../config/botConfig');
const { isBotOwner } = require('../middleware/adminCheck');
const { formatTopInvitersMessage, resetStats } = require('./statistics');

// Store pending text input states
const pendingInputs = new Map();

/**
 * Generate main admin panel keyboard
 * @returns {Object} Inline keyboard markup
 */
function getMainPanelKeyboard() {
    return {
        inline_keyboard: [
            [{ text: '📋 Guruhlarim', callback_data: 'panel_groups' }],
            [{ text: '📢 Broadcast xabar', callback_data: 'panel_broadcast' }],
            [{ text: '📊 Umumiy statistika', callback_data: 'panel_stats' }],
            [{ text: '❓ Yordam', callback_data: 'panel_help' }]
        ]
    };
}

/**
 * Generate groups list keyboard
 * @returns {Object} Inline keyboard markup
 */
function getGroupsKeyboard() {
    const groups = getRegisteredGroups();
    const keyboard = [];

    if (groups.size === 0) {
        keyboard.push([{ text: '📭 Hech qanday guruh topilmadi', callback_data: 'no_groups' }]);
    } else {
        for (const [chatId, groupInfo] of groups) {
            keyboard.push([{
                text: `📌 ${groupInfo.title}`,
                callback_data: `settings_${chatId}`
            }]);
        }
    }

    keyboard.push([{ text: '⬅️ Orqaga', callback_data: 'panel_main' }]);
    return { inline_keyboard: keyboard };
}

/**
 * Generate group settings keyboard
 * @param {number} chatId - Group chat ID
 * @returns {Object} Inline keyboard markup
 */
function getGroupSettingsKeyboard(chatId) {
    const settings = getSettings(chatId);

    // Status icons
    const on = '🟢';
    const off = '🔴';

    const fileSt = settings.fileFilterEnabled ? on : off;
    const linkSt = settings.linkWarningEnabled ? on : off;
    const sysSt = settings.systemMessageDeleteEnabled ? on : off;

    return {
        inline_keyboard: [
            [
                { text: `APK: ${fileSt}`, callback_data: `toggle_file_${chatId}` },
                { text: `Link: ${linkSt}`, callback_data: `toggle_link_${chatId}` }
            ],
            [
                { text: `System Msg: ${sysSt}`, callback_data: `toggle_sys_${chatId}` }
            ],
            [
                { text: '✏️ APK matn', callback_data: `edit_apk_${chatId}` },
                { text: '✏️ Link matn', callback_data: `edit_link_${chatId}` }
            ],
            [
                { text: '📊 Statistika', callback_data: `stats_${chatId}` },
                { text: '🗑 Tozalash', callback_data: `reset_stats_${chatId}` }
            ],
            [
                { text: '🔄 Reset', callback_data: `reset_settings_${chatId}` },
                { text: '⬅️ Orqaga', callback_data: 'panel_groups' }
            ]
        ]
    };
}

/**
 * Handle /admin command
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 */
async function handleAdminCommand(bot, msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (msg.chat.type !== 'private') {
        await bot.sendMessage(chatId, '⚙️ Panelga kirish uchun menga <b>/admin</b> deb yozing.', { parse_mode: 'HTML' });
        return;
    }

    if (!isBotOwner(userId)) {
        await bot.sendMessage(chatId, '⛔️ Siz admin emassiz.');
        return;
    }

    const message = `
🛠 <b>Boshqaruv Paneli</b>

Qyidagilardan birini tanlang:
    `.trim();

    await bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: getMainPanelKeyboard()
    });
}

/**
 * Handle callback queries from inline buttons
 * @param {Object} bot - Telegram bot instance
 * @param {Object} query - Callback query object
 */
async function handleCallbackQuery(bot, query) {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const userId = query.from.id;
    const data = query.data;

    if (!isBotOwner(userId)) {
        await bot.answerCallbackQuery(query.id, {
            text: '⛔️ Siz admin emassiz!',
            show_alert: true
        });
        return;
    }

    try {
        // Main panel
        if (data === 'panel_main') {
            const message = `
🛠 <b>Boshqaruv Paneli</b>

Quyidagilardan birini tanlang:
            `.trim();

            await bot.editMessageText(message, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: getMainPanelKeyboard()
            });
        }

        // Groups list
        else if (data === 'panel_groups') {
            const groups = await getRegisteredGroups();
            const count = groups.size;

            const message = `
📋 <b>Guruhlarim (${count})</b>

Sozlash uchun guruhni tanlang:
            `.trim();

            await bot.editMessageText(message, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: await getGroupsKeyboard()
            });
        }

        // Group settings
        else if (data.startsWith('settings_')) {
            const targetChatId = parseInt(data.replace('settings_', ''));
            const groups = await getRegisteredGroups();
            const groupInfo = groups.get(targetChatId);
            const settings = await getSettings(targetChatId);

            const message = `
⚙️ <b>${groupInfo?.title || 'Guruh'}</b>

🟢 = Yoqilgan
🔴 = O'chirilgan

👇 Kerakli tugmani bosing:
            `.trim();

            await bot.editMessageText(message, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: await getGroupSettingsKeyboard(targetChatId)
            });
        }

        // Toggle file filter
        else if (data.startsWith('toggle_file_')) {
            const targetChatId = parseInt(data.replace('toggle_file_', ''));
            const newValue = await toggleSetting(targetChatId, 'fileFilterEnabled');

            await bot.answerCallbackQuery(query.id, {
                text: `APK filtri: ${newValue ? '🟢 Yoqildi' : '🔴 O\'chirildi'}`
            });

            // Refresh settings view
            const groups = await getRegisteredGroups();
            const groupInfo = groups.get(targetChatId);

            const message = `
⚙️ <b>${groupInfo?.title || 'Guruh'}</b>

🟢 = Yoqilgan
🔴 = O'chirilgan

👇 Kerakli tugmani bosing:
            `.trim();

            await bot.editMessageText(message, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: await getGroupSettingsKeyboard(targetChatId)
            });
        }

        // Toggle link warning
        else if (data.startsWith('toggle_link_')) {
            const targetChatId = parseInt(data.replace('toggle_link_', ''));
            const newValue = await toggleSetting(targetChatId, 'linkWarningEnabled');

            await bot.answerCallbackQuery(query.id, {
                text: `Link nazorati: ${newValue ? '🟢 Yoqildi' : '🔴 O\'chirildi'}`
            });

            // Refresh settings view
            const groups = await getRegisteredGroups();
            const groupInfo = groups.get(targetChatId);

            const message = `
⚙️ <b>${groupInfo?.title || 'Guruh'}</b>

🟢 = Yoqilgan
🔴 = O'chirilgan

👇 Kerakli tugmani bosing:
            `.trim();

            await bot.editMessageText(message, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: await getGroupSettingsKeyboard(targetChatId)
            });
        }

        // Toggle system message
        else if (data.startsWith('toggle_sys_')) {
            const targetChatId = parseInt(data.replace('toggle_sys_', ''));
            const newValue = await toggleSetting(targetChatId, 'systemMessageDeleteEnabled');

            await bot.answerCallbackQuery(query.id, {
                text: `System MSG: ${newValue ? '🟢 Yoqildi' : '🔴 O\'chirildi'}`
            });

            // Refresh settings view
            const groups = await getRegisteredGroups();
            const groupInfo = groups.get(targetChatId);

            const message = `
⚙️ <b>${groupInfo?.title || 'Guruh'}</b>

🟢 = Yoqilgan
🔴 = O'chirilgan

👇 Kerakli tugmani bosing:
            `.trim();

            await bot.editMessageText(message, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: await getGroupSettingsKeyboard(targetChatId)
            });
        }

        // Edit APK warning message
        else if (data.startsWith('edit_apk_')) {
            const targetChatId = parseInt(data.replace('edit_apk_', ''));
            const settings = await getSettings(targetChatId);

            pendingInputs.set(userId, {
                type: 'apk_message',
                targetChatId: targetChatId
            });

            const message = `
✏️ <b>APK ogohlantirish matnini o'zgartirish</b>

<b>Joriy matn:</b>
<i>${settings.apkWarningMessage}</i>

📝 Yangi matnni yuboring.
<i>Bekor qilish uchun /cancel yozing.</i>

💡 <code>{fullname}</code> - foydalanuvchi ismi uchun
            `.trim();

            await bot.editMessageText(message, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '❌ Bekor qilish', callback_data: `settings_${targetChatId}` }]
                    ]
                }
            });
        }

        // Edit link warning message
        else if (data.startsWith('edit_link_')) {
            const targetChatId = parseInt(data.replace('edit_link_', ''));
            const settings = await getSettings(targetChatId);

            pendingInputs.set(userId, {
                type: 'link_message',
                targetChatId: targetChatId
            });

            const message = `
✏️ <b>Link ogohlantirish matnini o'zgartirish</b>

<b>Joriy matn:</b>
<i>${settings.linkWarningMessage}</i>

📝 Yangi matnni yuboring.
<i>Bekor qilish uchun /cancel yozing.</i>

💡 <code>{fullname}</code> - foydalanuvchi ismi uchun
            `.trim();

            await bot.editMessageText(message, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '❌ Bekor qilish', callback_data: `settings_${targetChatId}` }]
                    ]
                }
            });
        }

        // Show statistics
        else if (data.startsWith('stats_')) {
            const targetChatId = parseInt(data.replace('stats_', ''));
            const groups = await getRegisteredGroups();
            const groupInfo = groups.get(targetChatId);
            const statsMessage = await formatTopInvitersMessage(targetChatId);

            const message = `
📊 <b>${groupInfo?.title || 'Guruh'} statistikasi</b>

${statsMessage}
            `.trim();

            await bot.editMessageText(message, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '⬅️ Orqaga', callback_data: `settings_${targetChatId}` }]
                    ]
                }
            });
        }

        // Reset settings
        else if (data.startsWith('reset_settings_')) {
            const targetChatId = parseInt(data.replace('reset_settings_', ''));
            await resetSettings(targetChatId);

            await bot.answerCallbackQuery(query.id, {
                text: '✅ Sozlamalar tiklandi!',
                show_alert: true
            });

            // Refresh settings view
            const groups = await getRegisteredGroups();
            const groupInfo = groups.get(targetChatId);
            const settings = await getSettings(targetChatId);

            const message = `
⚙️ <b>${groupInfo?.title || 'Guruh'}</b>

<b>Joriy sozlamalar:</b>
📁 Fayl filter: ${settings.fileFilterEnabled ? '✅ Yoq' : '❌ O\'ch'}
🔗 Link warning: ${settings.linkWarningEnabled ? '✅ Yoq' : '❌ O\'ch'}
🗑 System msg: ${settings.systemMessageDeleteEnabled ? '✅ Yoq' : '❌ O\'ch'}

Sozlashni boshlash uchun tugmalarni bosing:
            `.trim();

            await bot.editMessageText(message, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: await getGroupSettingsKeyboard(targetChatId)
            });
        }

        // Reset stats
        else if (data.startsWith('reset_stats_')) {
            const targetChatId = parseInt(data.replace('reset_stats_', ''));
            await resetStats(targetChatId);

            await bot.answerCallbackQuery(query.id, {
                text: '✅ Statistika tozalandi!',
                show_alert: true
            });
        }

        // Overall stats
        else if (data === 'panel_stats') {
            const groups = await getRegisteredGroups();
            let totalGroups = groups.size;

            const message = `
📊 <b>Umumiy Statistika</b>

📋 Jami guruhlar: ${totalGroups}
🤖 Bot holati: ✅ Faol
⏱ Uptime: ${Math.floor(process.uptime() / 60)} daqiqa
            `.trim();

            await bot.editMessageText(message, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '⬅️ Orqaga', callback_data: 'panel_main' }]
                    ]
                }
            });
        }

        // Help
        else if (data === 'panel_help') {
            const message = `
❓ <b>Yordam</b>

<b>Admin panel qanday ishlaydi?</b>

1️⃣ <b>Guruhlarim</b> - bot qo'shilgan guruhlarni ko'rish
2️⃣ Guruhni tanlang - sozlamalar oynasi ochiladi
3️⃣ Tugmalarni bosib sozlamalarni o'zgartiring

<b>Sozlamalar:</b>
📁 <b>Fayl filter</b> - .apk fayllarni avtomatik o'chiradi
🔗 <b>Link warning</b> - havolalar haqida ogohlantiradi
🗑 <b>System msg</b> - kirdi/chiqdi xabarlarini o'chiradi

<b>Guruh qo'shish:</b>
Botni guruhga qo'shing va admin qiling - avtomatik ro'yxatga olinadi.
            `.trim();

            await bot.editMessageText(message, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '⬅️ Orqaga', callback_data: 'panel_main' }]
                    ]
                }
            });
        }

        // Broadcast panel
        else if (data === 'panel_broadcast') {
            const groups = await getRegisteredGroups();
            const count = groups.size;

            if (count === 0) {
                await bot.answerCallbackQuery(query.id, {
                    text: '📭 Hech qanday guruh yo\'q!',
                    show_alert: true
                });
                return;
            }

            pendingInputs.set(userId, {
                type: 'broadcast'
            });

            const message = `
📢 <b>Broadcast Xabar</b>

Barcha <b>${count}</b> ta guruhga xabar yuborish.

📝 Xabaringizni yozing va yuboring.
<i>Bekor qilish uchun /cancel yozing.</i>

⚠️ <i>Xabar barcha guruhlarga yuboriladi!</i>
            `.trim();

            await bot.editMessageText(message, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '❌ Bekor qilish', callback_data: 'panel_main' }]
                    ]
                }
            });
        }

        // No groups placeholder
        else if (data === 'no_groups') {
            await bot.answerCallbackQuery(query.id, {
                text: '📭 Botni guruhga qo\'shing va admin qiling!',
                show_alert: true
            });
        }

    } catch (error) {
        console.error('[AdminPanel] Callback error:', error.message);
        await bot.answerCallbackQuery(query.id, {
            text: '❌ Xatolik yuz berdi',
            show_alert: true
        });
    }
}

/**
 * Handle text input for pending actions (like editing messages)
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 * @returns {boolean} True if message was handled
 */
async function handlePendingInput(bot, msg) {
    // Only in private chat
    if (msg.chat.type !== 'private') {
        return false;
    }

    const userId = msg.from.id;
    const pending = pendingInputs.get(userId);

    if (!pending) {
        return false;
    }

    // Cancel command
    if (msg.text === '/cancel') {
        pendingInputs.delete(userId);
        await bot.sendMessage(msg.chat.id, '❌ Bekor qilindi.', {
            reply_markup: getMainPanelKeyboard()
        });
        return true;
    }

    const { type, targetChatId } = pending;
    const newText = msg.text;

    if (type === 'apk_message') {
        await updateSetting(targetChatId, 'apkWarningMessage', newText);
        pendingInputs.delete(userId);

        await bot.sendMessage(msg.chat.id, `
✅ <b>APK ogohlantirish matni yangilandi!</b>

<b>Yangi matn:</b>
<i>${newText}</i>
        `.trim(), {
            parse_mode: 'HTML',
            reply_markup: await getGroupSettingsKeyboard(targetChatId)
        });
        return true;
    }

    if (type === 'link_message') {
        await updateSetting(targetChatId, 'linkWarningMessage', newText);
        pendingInputs.delete(userId);

        await bot.sendMessage(msg.chat.id, `
✅ <b>Link ogohlantirish matni yangilandi!</b>

<b>Yangi matn:</b>
<i>${newText}</i>
        `.trim(), {
            parse_mode: 'HTML',
            reply_markup: await getGroupSettingsKeyboard(targetChatId)
        });
        return true;
    }

    // Handle broadcast message
    if (type === 'broadcast') {
        pendingInputs.delete(userId);

        const groups = await getRegisteredGroups();
        const totalGroups = groups.size;

        if (totalGroups === 0) {
            await bot.sendMessage(msg.chat.id, '❌ Hech qanday guruh topilmadi.', {
                reply_markup: getMainPanelKeyboard()
            });
            return true;
        }

        // Start broadcast with progress
        await bot.sendMessage(msg.chat.id, `📢 Broadcast boshlanmoqda...\n\n📋 Jami: ${totalGroups} ta guruh`);

        let successCount = 0;
        let failCount = 0;
        let totalReach = 0; // Total potential viewers
        const errors = [];
        const RATE_LIMIT_DELAY = 100; // 100ms between messages (Telegram limit: 30 msg/sec)

        for (const [groupChatId, groupInfo] of groups) {
            try {
                // Get member count for reach calculation
                try {
                    const memberCount = await bot.getChatMemberCount(groupChatId);
                    totalReach += memberCount;
                } catch (err) {
                    console.error(`[Broadcast] Failed to get member count for ${groupInfo.title}`);
                }

                // Forward text, photo, video, document etc.
                if (msg.photo) {
                    await bot.sendPhoto(groupChatId, msg.photo[msg.photo.length - 1].file_id, {
                        caption: msg.caption || '',
                        parse_mode: 'HTML'
                    });
                } else if (msg.video) {
                    await bot.sendVideo(groupChatId, msg.video.file_id, {
                        caption: msg.caption || '',
                        parse_mode: 'HTML'
                    });
                } else if (msg.document) {
                    await bot.sendDocument(groupChatId, msg.document.file_id, {
                        caption: msg.caption || '',
                        parse_mode: 'HTML'
                    });
                } else if (msg.text) {
                    await bot.sendMessage(groupChatId, msg.text, {
                        parse_mode: 'HTML'
                    });
                }

                successCount++;
                console.log(`[Broadcast] Sent to ${groupInfo.title}`);
            } catch (error) {
                failCount++;
                errors.push(`${groupInfo.title}: ${error.message}`);
                console.error(`[Broadcast] Failed for ${groupInfo.title}:`, error.message);

                // If bot was kicked from group, unregister it
                if (error.message.includes('bot was kicked') ||
                    error.message.includes('chat not found') ||
                    error.message.includes('bot is not a member')) {
                    // Use helper from config since require inside loop is bad practice generally but works here
                    const { unregisterGroup } = require('../config/botConfig');
                    await unregisterGroup(groupChatId);
                }
            }

            // Rate limiting delay
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
        }

        // Send result
        let resultMessage = `
📢 <b>Broadcast yakunlandi!</b>

✅ Muvaffaqiyatli: ${successCount}
❌ Xato: ${failCount}
📋 Jami guruhlar: ${totalGroups}
👥 <b>Umumiy qamrov:</b> ~${totalReach} ta a'zo
        `.trim();

        if (errors.length > 0 && errors.length <= 5) {
            resultMessage += `\n\n<b>Xatolar:</b>\n${errors.join('\n')}`;
        } else if (errors.length > 5) {
            resultMessage += `\n\n<b>Xatolar:</b> ${errors.length} ta (log ga yozildi)`;
        }

        await bot.sendMessage(msg.chat.id, resultMessage, {
            parse_mode: 'HTML',
            reply_markup: getMainPanelKeyboard()
        });
        return true;
    }

    return false;
}

/**
 * Check if there's a pending input for user
 * @param {number} userId - User ID
 * @returns {boolean}
 */
function hasPendingInput(userId) {
    return pendingInputs.has(userId);
}

module.exports = {
    handleAdminCommand,
    handleCallbackQuery,
    handlePendingInput,
    hasPendingInput
};
