/**
 * Bot Configuration Manager
 * Handles per-group settings and custom messages
 */

// In-memory storage for group settings
const groupSettings = new Map();

// Default settings for new groups
const DEFAULT_SETTINGS = {
    fileFilterEnabled: true,
    linkWarningEnabled: true,
    systemMessageDeleteEnabled: true,
    apkWarningMessage: '<b>{fullname}</b> ushbu foydalanuvchi gruhga.apk fayl yubordi — bu virus bo\'lishi mumkin! Agar tanisangiz, darhol ogohlantiring: ularning telefoniga virus tushgan bo\'lishi ehtimoli bor. Telegram va qurilmasini tekshirsin!',
    linkWarningMessage: '<b>{fullname}</b> havolani yubordi. Ochishdan oldin ogoh bo\'ling! Ehtimol virus bo\'lishi mumkin.'
};

/**
 * Get settings for a specific group
 * @param {number} chatId - Telegram chat ID
 * @returns {Object} Group settings
 */
function getSettings(chatId) {
    if (!groupSettings.has(chatId)) {
        groupSettings.set(chatId, { ...DEFAULT_SETTINGS });
    }
    return groupSettings.get(chatId);
}

/**
 * Update a specific setting for a group
 * @param {number} chatId - Telegram chat ID
 * @param {string} key - Setting key
 * @param {any} value - New value
 * @returns {Object} Updated settings
 */
function updateSetting(chatId, key, value) {
    const settings = getSettings(chatId);
    if (key in settings) {
        settings[key] = value;
        groupSettings.set(chatId, settings);
    }
    return settings;
}

/**
 * Toggle a boolean setting
 * @param {number} chatId - Telegram chat ID
 * @param {string} key - Setting key
 * @returns {boolean} New value
 */
function toggleSetting(chatId, key) {
    const settings = getSettings(chatId);
    if (key in settings && typeof settings[key] === 'boolean') {
        settings[key] = !settings[key];
        groupSettings.set(chatId, settings);
        return settings[key];
    }
    return null;
}

/**
 * Check if user is the bot owner
 * @param {number} userId - Telegram user ID
 * @returns {boolean}
 */
function isOwner(userId) {
    const ownerId = parseInt(process.env.OWNER_ID, 10);
    return userId === ownerId;
}

/**
 * Reset settings to default for a group
 * @param {number} chatId - Telegram chat ID
 * @returns {Object} Default settings
 */
function resetSettings(chatId) {
    groupSettings.set(chatId, { ...DEFAULT_SETTINGS });
    return groupSettings.get(chatId);
}

module.exports = {
    getSettings,
    updateSetting,
    toggleSetting,
    isOwner,
    resetSettings,
    DEFAULT_SETTINGS
};
