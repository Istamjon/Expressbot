/**
 * System Message Handler
 * Automatically deletes Telegram system messages (join/leave, etc.)
 */

const { getSettings } = require('../config/botConfig');

/**
 * Check if a message is a system message
 * @param {Object} msg - Telegram message object
 * @returns {boolean}
 */
function isSystemMessage(msg) {
    return !!(
        msg.new_chat_members ||           // User(s) joined
        msg.left_chat_member ||           // User left
        msg.new_chat_title ||             // Group name changed
        msg.new_chat_photo ||             // Group photo added/changed
        msg.delete_chat_photo ||          // Group photo deleted
        msg.pinned_message ||             // Message was pinned
        msg.group_chat_created ||         // Group was created
        msg.supergroup_chat_created ||    // Supergroup was created
        msg.channel_chat_created ||       // Channel was created
        msg.migrate_to_chat_id ||         // Group migrated to supergroup
        msg.migrate_from_chat_id          // Message about migration
    );
}

/**
 * Get description of system message type for logging
 * @param {Object} msg - Telegram message object
 * @returns {string}
 */
function getSystemMessageType(msg) {
    if (msg.new_chat_members) return 'new_chat_members';
    if (msg.left_chat_member) return 'left_chat_member';
    if (msg.new_chat_title) return 'new_chat_title';
    if (msg.new_chat_photo) return 'new_chat_photo';
    if (msg.delete_chat_photo) return 'delete_chat_photo';
    if (msg.pinned_message) return 'pinned_message';
    if (msg.group_chat_created) return 'group_chat_created';
    if (msg.supergroup_chat_created) return 'supergroup_chat_created';
    if (msg.channel_chat_created) return 'channel_chat_created';
    if (msg.migrate_to_chat_id) return 'migrate_to_chat_id';
    if (msg.migrate_from_chat_id) return 'migrate_from_chat_id';
    return 'unknown';
}

/**
 * Handle system message deletion
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 * @returns {boolean} True if message was handled
 */
async function handleSystemMessage(bot, msg) {
    // Only process group/supergroup messages
    if (msg.chat.type !== 'group' && msg.chat.type !== 'supergroup') {
        return false;
    }

    // Check if this is a system message
    if (!isSystemMessage(msg)) {
        return false;
    }

    const chatId = msg.chat.id;
    const settings = await getSettings(chatId);

    // Check if system message deletion is enabled
    if (!settings.systemMessageDeleteEnabled) {
        return false;
    }

    try {
        // Delete the system message
        await bot.deleteMessage(chatId, msg.message_id);

        const messageType = getSystemMessageType(msg);
        console.log(`[SystemMessage] Deleted ${messageType} in chat ${chatId}`);

        return true;
    } catch (error) {
        console.error('[SystemMessage] Error:', error.message);
        // Bot might not have delete permissions
        if (error.message.includes('not enough rights')) {
            console.error('[SystemMessage] Bot lacks delete permissions in chat:', chatId);
        }
        return false;
    }
}

module.exports = {
    handleSystemMessage,
    isSystemMessage,
    getSystemMessageType
};
