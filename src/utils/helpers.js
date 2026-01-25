/**
 * Utility Helper Functions
 */

/**
 * Escape HTML special characters for Telegram HTML parse mode
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Format a user mention safely
 * @param {Object} user - Telegram user object
 * @returns {string} Formatted mention
 */
function formatUserMention(user) {
    if (!user) return 'Unknown User';

    if (user.username) {
        return `@${user.username}`;
    }

    const name = escapeHtml(user.first_name + (user.last_name ? ` ${user.last_name}` : ''));
    return `<a href="tg://user?id=${user.id}">${name}</a>`;
}

/**
 * Get user's profile photo file_id
 * @param {Object} bot - Telegram bot instance
 * @param {number} userId - User ID
 * @returns {Promise<string|null>} Photo file_id or null
 */
async function getUserProfilePhoto(bot, userId) {
    try {
        const photos = await bot.getUserProfilePhotos(userId, { limit: 1 });

        if (photos.total_count > 0 && photos.photos.length > 0) {
            // Get the smallest size for faster sending (last one is usually biggest)
            const photoSizes = photos.photos[0];
            // Use medium size if available, otherwise first
            const photo = photoSizes.length > 1 ? photoSizes[1] : photoSizes[0];
            return photo.file_id;
        }

        return null;
    } catch (error) {
        console.error('[Helpers] Error getting profile photo:', error.message);
        return null;
    }
}

/**
 * Send warning message with optional user photo
 * @param {Object} bot - Telegram bot instance
 * @param {number} chatId - Chat ID
 * @param {Object} user - User object
 * @param {string} warningText - Warning message text
 * @param {Object} options - Additional options (reply_to_message_id, etc.)
 */
async function sendWarningWithPhoto(bot, chatId, user, warningText, options = {}) {
    try {
        // Try to get user's profile photo
        const photoFileId = await getUserProfilePhoto(bot, user.id);

        if (photoFileId) {
            // Send photo with caption
            await bot.sendPhoto(chatId, photoFileId, {
                caption: `⚠️ ${warningText}`,
                parse_mode: 'HTML',
                ...options
            });
        } else {
            // No photo available, send text only
            await bot.sendMessage(chatId, `⚠️ ${warningText}`, {
                parse_mode: 'HTML',
                ...options
            });
        }
    } catch (error) {
        console.error('[Helpers] Error sending warning with photo:', error.message);
        // Fallback to text-only message
        try {
            await bot.sendMessage(chatId, `⚠️ ${warningText}`, {
                parse_mode: 'HTML',
                ...options
            });
        } catch (fallbackError) {
            console.error('[Helpers] Fallback message also failed:', fallbackError.message);
        }
    }
}

/**
 * Sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum retry attempts
 * @param {number} baseDelay - Base delay in ms
 * @returns {Promise}
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Don't retry on certain errors
            if (error.message.includes('not enough rights') ||
                error.message.includes('chat not found') ||
                error.message.includes('bot was blocked')) {
                throw error;
            }

            const delay = baseDelay * Math.pow(2, i);
            console.log(`[Retry] Attempt ${i + 1} failed, retrying in ${delay}ms...`);
            await sleep(delay);
        }
    }

    throw lastError;
}

/**
 * Check if chat is a group type
 * @param {Object} msg - Telegram message object
 * @returns {boolean}
 */
function isGroupChat(msg) {
    return msg.chat.type === 'group' || msg.chat.type === 'supergroup';
}

/**
 * Log message with timestamp
 * @param {string} module - Module name
 * @param {string} message - Log message
 */
function logWithTime(module, message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${module}] ${message}`);
}

module.exports = {
    escapeHtml,
    formatUserMention,
    getUserProfilePhoto,
    sendWarningWithPhoto,
    sleep,
    retryWithBackoff,
    isGroupChat,
    logWithTime
};
