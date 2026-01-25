/**
 * Admin Check Middleware
 * Verifies if user is group admin or bot owner
 */

const { isOwner } = require('../config/botConfig');

/**
 * Check if user is a group administrator
 * @param {Object} bot - Telegram bot instance
 * @param {number} chatId - Telegram chat ID
 * @param {number} userId - User ID to check
 * @returns {Promise<boolean>}
 */
async function isGroupAdmin(bot, chatId, userId) {
    try {
        const admins = await bot.getChatAdministrators(chatId);
        return admins.some(admin => admin.user.id === userId);
    } catch (error) {
        console.error('[AdminCheck] Error getting admins:', error.message);
        return false;
    }
}

/**
 * Check if user is bot owner
 * @param {number} userId - User ID to check
 * @returns {boolean}
 */
function isBotOwner(userId) {
    return isOwner(userId);
}

/**
 * Check if user can manage bot settings
 * Only bot owner can manage settings
 * @param {number} userId - User ID to check
 * @returns {boolean}
 */
function canManageSettings(userId) {
    return isBotOwner(userId);
}

/**
 * Middleware to require admin access
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 * @param {Function} next - Next handler function
 */
async function requireAdmin(bot, msg, next) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Check if user is admin or owner
    const isAdmin = await isGroupAdmin(bot, chatId, userId);
    const isOwnerUser = isBotOwner(userId);

    if (isAdmin || isOwnerUser) {
        return next();
    }

    // User is not authorized
    await bot.sendMessage(chatId, '❌ Bu buyruqni faqat adminlar ishlatishi mumkin.', {
        reply_to_message_id: msg.message_id
    });

    return false;
}

/**
 * Middleware to require owner access
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 * @param {Function} next - Next handler function
 */
async function requireOwner(bot, msg, next) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (isBotOwner(userId)) {
        return next();
    }

    // User is not the owner
    await bot.sendMessage(chatId, '❌ Bu buyruqni faqat bot egasi ishlatishi mumkin.', {
        reply_to_message_id: msg.message_id
    });

    return false;
}

module.exports = {
    isGroupAdmin,
    isBotOwner,
    canManageSettings,
    requireAdmin,
    requireOwner
};
