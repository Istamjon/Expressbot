/**
 * Bot Configuration Manager
 * Handles per-group settings and custom messages using PostgreSQL
 */

const { pool } = require('../db');

const DEFAULT_SETTINGS = {
    fileFilterEnabled: true,
    linkWarningEnabled: true,
    systemMessageDeleteEnabled: true,
    apkWarningMessage: '<b>{fullname}</b> ushbu foydalanuvchi gruhga.apk fayl yubordi — bu virus bo\'lishi mumkin! Agar tanisangiz, darhol ogohlantiring: ularning telefoniga virus tushgan bo\'lishi ehtimoli bor. Telegram va qurilmasini tekshirsin!',
    linkWarningMessage: '<b>{fullname}</b> havolani yubordi. Ochishdan oldin ogoh bo\'ling! Ehtimol virus bo\'lishi mumkin.'
};

/**
 * Register a group where bot is active
 * @param {number} chatId - Telegram chat ID
 * @param {string} title - Group title
 */
async function registerGroup(chatId, title) {
    try {
        await pool.query(
            `INSERT INTO groups (chat_id, title, added_at) 
             VALUES ($1, $2, NOW()) 
             ON CONFLICT (chat_id) DO UPDATE SET title = $2`,
            [chatId, title]
        );
        console.log(`[Config] Group registered/updated: ${title} (${chatId})`);
    } catch (err) {
        console.error('[Config] Failed to register group:', err);
    }
}

/**
 * Unregister a group (when bot is removed)
 * @param {number} chatId - Telegram chat ID
 */
async function unregisterGroup(chatId) {
    try {
        await pool.query('DELETE FROM groups WHERE chat_id = $1', [chatId]);
        console.log(`[Config] Group unregistered: (${chatId})`);
    } catch (err) {
        console.error('[Config] Failed to unregister group:', err);
    }
}

/**
 * Get all registered groups
 * @returns {Map} Registered groups map (simulated for compatibility)
 */
async function getRegisteredGroups() {
    try {
        const res = await pool.query('SELECT chat_id, title, added_at FROM groups');
        const map = new Map();
        res.rows.forEach(row => {
            map.set(parseInt(row.chat_id), {
                title: row.title,
                addedAt: row.added_at
            });
        });
        return map;
    } catch (err) {
        console.error('[Config] Failed to get registered groups:', err);
        return new Map();
    }
}

/**
 * Get settings for a specific group
 * @param {number} chatId - Telegram chat ID
 * @returns {Object} Group settings
 */
async function getSettings(chatId) {
    try {
        const res = await pool.query('SELECT * FROM groups WHERE chat_id = $1', [chatId]);

        if (res.rows.length === 0) {
            // If group doesn't exist but we need settings, return defaults (or insert if you prefer)
            return { ...DEFAULT_SETTINGS };
        }

        const row = res.rows[0];
        return {
            fileFilterEnabled: row.file_filter_enabled,
            linkWarningEnabled: row.link_warning_enabled,
            systemMessageDeleteEnabled: row.system_message_delete_enabled,
            apkWarningMessage: row.apk_warning_message,
            linkWarningMessage: row.link_warning_message
        };
    } catch (err) {
        console.error('[Config] Failed to get settings:', err);
        return { ...DEFAULT_SETTINGS };
    }
}

/**
 * Update a specific setting for a group
 * @param {number} chatId - Telegram chat ID
 * @param {string} key - Setting key (camelCase)
 * @param {any} value - New value
 * @returns {Object} Updated settings
 */
async function updateSetting(chatId, key, value) {
    // Map camelCase keys to snake_case columns
    const keyMap = {
        'fileFilterEnabled': 'file_filter_enabled',
        'linkWarningEnabled': 'link_warning_enabled',
        'systemMessageDeleteEnabled': 'system_message_delete_enabled',
        'apkWarningMessage': 'apk_warning_message',
        'linkWarningMessage': 'link_warning_message'
    };

    const dbKey = keyMap[key];
    if (!dbKey) return await getSettings(chatId);

    try {
        await pool.query(
            `UPDATE groups SET ${dbKey} = $1 WHERE chat_id = $2`,
            [value, chatId]
        );
        return await getSettings(chatId);
    } catch (err) {
        console.error('[Config] Failed to update setting:', err);
        return await getSettings(chatId);
    }
}

/**
 * Toggle a boolean setting
 * @param {number} chatId - Telegram chat ID
 * @param {string} key - Setting key
 * @returns {boolean} New value
 */
async function toggleSetting(chatId, key) {
    const settings = await getSettings(chatId);

    // Check if key is valid boolean in defaults
    if (!(key in DEFAULT_SETTINGS) || typeof DEFAULT_SETTINGS[key] !== 'boolean') {
        return null;
    }

    const newValue = !settings[key];
    await updateSetting(chatId, key, newValue);
    return newValue;
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
async function resetSettings(chatId) {
    try {
        await pool.query(
            `UPDATE groups SET 
             file_filter_enabled = $1,
             link_warning_enabled = $2,
             system_message_delete_enabled = $3,
             apk_warning_message = $4,
             link_warning_message = $5
             WHERE chat_id = $6`,
            [
                DEFAULT_SETTINGS.fileFilterEnabled,
                DEFAULT_SETTINGS.linkWarningEnabled,
                DEFAULT_SETTINGS.systemMessageDeleteEnabled,
                DEFAULT_SETTINGS.apkWarningMessage,
                DEFAULT_SETTINGS.linkWarningMessage,
                chatId
            ]
        );
        return { ...DEFAULT_SETTINGS };
    } catch (err) {
        console.error('[Config] Failed to reset settings:', err);
        return { ...DEFAULT_SETTINGS };
    }
}

module.exports = {
    getSettings,
    updateSetting,
    toggleSetting,
    isOwner,
    resetSettings,
    registerGroup,
    unregisterGroup,
    getRegisteredGroups,
    DEFAULT_SETTINGS
};
