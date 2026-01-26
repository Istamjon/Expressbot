/**
 * Link Monitor Handler
 * Detects links in messages and sends warnings
 */

const { getSettings } = require('../config/botConfig');
const { sendWarningWithPhoto } = require('../utils/helpers');

// Regular expressions for different link types
const LINK_PATTERNS = {
    // HTTP/HTTPS URLs
    httpUrl: /https?:\/\/[^\s<>"\]]+/gi,

    // Telegram t.me links
    telegramLink: /t\.me\/[^\s<>"\]]+/gi,

    // Telegram username mentions (min 5 chars after @)
    username: /@[a-zA-Z][a-zA-Z0-9_]{4,}/g,

    // Various URL shorteners and common domains
    shortUrl: /(?:bit\.ly|goo\.gl|tinyurl\.com|ow\.ly|is\.gd|buff\.ly|t\.co)\/[^\s<>"\]]+/gi
};

/**
 * Check if message contains any links
 * @param {Object} msg - Telegram message object
 * @returns {Object} { hasLink: boolean, linkTypes: string[] }
 */
function detectLinks(msg) {
    const text = msg.text || msg.caption || '';
    const linkTypes = [];

    // Check text patterns
    if (LINK_PATTERNS.httpUrl.test(text)) {
        linkTypes.push('URL');
        LINK_PATTERNS.httpUrl.lastIndex = 0; // Reset regex
    }

    if (LINK_PATTERNS.telegramLink.test(text)) {
        linkTypes.push('Telegram');
        LINK_PATTERNS.telegramLink.lastIndex = 0;
    }

    if (LINK_PATTERNS.username.test(text)) {
        linkTypes.push('Username');
        LINK_PATTERNS.username.lastIndex = 0;
    }

    if (LINK_PATTERNS.shortUrl.test(text)) {
        linkTypes.push('Short URL');
        LINK_PATTERNS.shortUrl.lastIndex = 0;
    }

    // Check message entities for hidden links (e.g., anchor text)
    if (msg.entities) {
        for (const entity of msg.entities) {
            if (entity.type === 'url') {
                if (!linkTypes.includes('URL')) linkTypes.push('URL');
            }
            if (entity.type === 'text_link') {
                if (!linkTypes.includes('Hidden Link')) linkTypes.push('Hidden Link');
            }
            if (entity.type === 'mention') {
                if (!linkTypes.includes('Mention')) linkTypes.push('Mention');
            }
        }
    }

    // Check caption entities too
    if (msg.caption_entities) {
        for (const entity of msg.caption_entities) {
            if (entity.type === 'url') {
                if (!linkTypes.includes('URL')) linkTypes.push('URL');
            }
            if (entity.type === 'text_link') {
                if (!linkTypes.includes('Hidden Link')) linkTypes.push('Hidden Link');
            }
            if (entity.type === 'mention') {
                if (!linkTypes.includes('Mention')) linkTypes.push('Mention');
            }
        }
    }

    return {
        hasLink: linkTypes.length > 0,
        linkTypes
    };
}

/**
 * Handle link monitoring for incoming messages
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 */
async function handleLinkMonitor(bot, msg) {
    // Only process group/supergroup messages
    if (msg.chat.type !== 'group' && msg.chat.type !== 'supergroup') {
        return;
    }

    const chatId = msg.chat.id;
    const settings = await getSettings(chatId);

    // Check if link warning is enabled
    if (!settings.linkWarningEnabled) {
        return;
    }

    // Skip messages from bots (including this bot's own messages)
    if (msg.from && msg.from.is_bot) {
        return;
    }

    // Skip commands (messages starting with /)
    const text = msg.text || msg.caption || '';
    if (text.startsWith('/')) {
        return;
    }

    // Detect links in message
    const { hasLink, linkTypes } = detectLinks(msg);

    if (!hasLink) {
        return;
    }

    try {
        // Get user's full name for warning
        const fullName = msg.from.first_name + (msg.from.last_name ? ` ${msg.from.last_name}` : '');
        const warningText = settings.linkWarningMessage.replace('{fullname}', fullName);

        // Send text warning only (no photo for links)
        await bot.sendMessage(chatId, `⚠️ ${warningText}`, {
            parse_mode: 'HTML',
            reply_to_message_id: msg.message_id
        });

        console.log(`[LinkMonitor] Warning sent for ${linkTypes.join(', ')} from ${fullName} in chat ${chatId}`);
    } catch (error) {
        console.error('[LinkMonitor] Error:', error.message);
    }
}

module.exports = {
    handleLinkMonitor,
    detectLinks,
    LINK_PATTERNS
};
