/**
 * File Filter Handler
 * Detects and removes .apk, .xapk, .apkm files from groups
 */

const { getSettings } = require('../config/botConfig');
const { sendWarningWithPhoto } = require('../utils/helpers');

// Dangerous file extensions to filter
const DANGEROUS_EXTENSIONS = ['.apk', '.xapk', '.apkm', '.exe', '.bat', '.cmd', '.scr', '.msi'];

/**
 * Check if a filename has a dangerous extension
 * @param {string} fileName - File name to check
 * @returns {boolean}
 */
function isDangerousFile(fileName) {
    if (!fileName) return false;
    const lowerName = fileName.toLowerCase();
    return DANGEROUS_EXTENSIONS.some(ext => lowerName.endsWith(ext));
}

/**
 * Get user's full name (first name + last name)
 * @param {Object} user - Telegram user object
 * @returns {string}
 */
function getUserFullName(user) {
    if (!user) return 'Noma\'lum';
    return user.first_name + (user.last_name ? ` ${user.last_name}` : '');
}

/**
 * Handle file filter for incoming messages
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 */
async function handleFileFilter(bot, msg) {
    // Only process group/supergroup messages
    if (msg.chat.type !== 'group' && msg.chat.type !== 'supergroup') {
        return;
    }

    const chatId = msg.chat.id;
    const settings = await getSettings(chatId);

    // Check if file filter is enabled
    if (!settings.fileFilterEnabled) {
        return;
    }

    // Check if message has a document
    const document = msg.document;
    if (!document || !document.file_name) {
        return;
    }

    // Check if file is dangerous
    if (!isDangerousFile(document.file_name)) {
        return;
    }

    try {
        // Delete the message with dangerous file
        await bot.deleteMessage(chatId, msg.message_id);

        // Prepare warning message with full name
        const fullName = getUserFullName(msg.from);
        const warningText = settings.apkWarningMessage.replace('{fullname}', fullName);

        // Send warning with user's profile photo
        await sendWarningWithPhoto(bot, chatId, msg.from, warningText);

        console.log(`[FileFilter] Deleted ${document.file_name} from ${fullName} in chat ${chatId}`);
    } catch (error) {
        console.error('[FileFilter] Error:', error.message);
        // Bot might not have delete permissions
        if (error.message.includes('not enough rights')) {
            console.error('[FileFilter] Bot lacks delete permissions in chat:', chatId);
        }
    }
}

module.exports = {
    handleFileFilter,
    isDangerousFile,
    DANGEROUS_EXTENSIONS
};
