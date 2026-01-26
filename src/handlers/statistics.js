/**
 * Statistics Handler
 * Tracks member invitation statistics using PostgreSQL
 */

const { pool } = require('../db');

/**
 * Get username or display name from a user object
 * @param {Object} user - Telegram user object
 * @returns {string}
 */
function getUserDisplayName(user) {
    if (user.username) {
        return `@${user.username}`;
    }
    return user.first_name + (user.last_name ? ` ${user.last_name}` : '');
}

/**
 * Track a new member invitation
 * @param {number} chatId - Telegram chat ID
 * @param {Object} inviter - User who invited (from message.from)
 * @param {number} count - Number of new members added
 */
/**
 * Track new member invitations with unique referral check
 * @param {number} chatId - Telegram chat ID
 * @param {Object} inviter - User who invited
 * @param {Array<Object>} newMembers - Array of new member objects
 */
async function trackInvitation(chatId, inviter, newMembers) {
    if (!inviter || !inviter.id || !newMembers || newMembers.length === 0) return;

    const username = getUserDisplayName(inviter);
    const firstName = inviter.first_name || '';
    const lastName = inviter.last_name || '';
    let validCount = 0;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        for (const member of newMembers) {
            // Skip self or bot
            if (member.is_bot || member.id === inviter.id) continue;

            // Try to record the referral (unique constraint ensures no duplicates)
            const res = await client.query(
                `INSERT INTO referrals (chat_id, sponsor_id, member_id)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (chat_id, member_id) DO NOTHING`,
                [chatId, inviter.id, member.id]
            );

            // If a row was inserted, it's a new unique invite
            if (res.rowCount > 0) {
                validCount++;
            }
        }

        if (validCount > 0) {
            await client.query(
                `INSERT INTO invitations (chat_id, user_id, username, first_name, last_name, count, last_updated)
                 VALUES ($1, $2, $3, $4, $5, $6, NOW())
                 ON CONFLICT (chat_id, user_id) 
                 DO UPDATE SET 
                 count = invitations.count + $6,
                 username = $3,
                 first_name = $4,
                 last_name = $5,
                 last_updated = NOW()`,
                [chatId, inviter.id, username, firstName, lastName, validCount]
            );
            console.log(`[Statistics] ${username} (+${validCount}) unique referrals`);
        }

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[Statistics] Error:', err);
    } finally {
        client.release();
    }
}

/**
 * Get top inviters for a chat
 * @param {number} chatId - Telegram chat ID
 * @param {number} limit - Number of top users to return
 * @returns {Array} Sorted array of { userId, username, count }
 */
async function getTopInviters(chatId, limit = 10) {
    try {
        const res = await pool.query(
            `SELECT user_id, username, first_name, last_name, count 
             FROM invitations 
             WHERE chat_id = $1 
             ORDER BY count DESC 
             LIMIT $2`,
            [chatId, limit]
        );
        return res.rows.map(row => ({
            userId: row.user_id,
            username: row.username,
            firstName: row.first_name,
            lastName: row.last_name,
            count: row.count
        }));
    } catch (err) {
        console.error('[Statistics] Failed to get top inviters:', err);
        return [];
    }
}

/**
 * Reset statistics for a chat
 * @param {number} chatId - Telegram chat ID
 */
async function resetStats(chatId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM invitations WHERE chat_id = $1', [chatId]);
        await client.query('DELETE FROM referrals WHERE chat_id = $1', [chatId]);
        await client.query('COMMIT');
        console.log(`[Statistics] Stats reset for chat ${chatId}`);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[Statistics] Failed to reset stats:', err);
    } finally {
        client.release();
    }
}

/**
 * Get total stats for a chat
 * @param {number} chatId - Telegram chat ID
 * @returns {Object} { totalInviters, totalInvited }
 */
async function getChatStats(chatId) {
    try {
        const res = await pool.query(
            `SELECT COUNT(user_id) as inviters, SUM(count) as total 
             FROM invitations 
             WHERE chat_id = $1`,
            [chatId]
        );

        return {
            totalInviters: parseInt(res.rows[0].inviters || 0),
            totalInvited: parseInt(res.rows[0].total || 0)
        };
    } catch (err) {
        console.error('[Statistics] Failed to get chat stats:', err);
        return { totalInviters: 0, totalInvited: 0 };
    }
}

/**
 * Handle new chat members event for statistics
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 */
async function handleStatistics(bot, msg) {
    // Only process group/supergroup messages with new members
    if (msg.chat.type !== 'group' && msg.chat.type !== 'supergroup') return;
    if (!msg.new_chat_members || msg.new_chat_members.length === 0) return;

    const chatId = msg.chat.id;
    const inviter = msg.from;

    // Don't count if user added themselves (joined via link)
    // Invites via link show user as inviter AND member
    if (msg.new_chat_members.some(member => member.id === inviter.id)) return;

    // Filter out bots logic if needed, but trackInvitation handles it
    await trackInvitation(chatId, inviter, msg.new_chat_members);
}

/**
 * Format top inviters list as a message with premium UI
 * @param {number} chatId - Telegram chat ID
 * @returns {string} Formatted message
 */
async function formatTopInvitersMessage(chatId) {
    const topInviters = await getTopInviters(chatId, 10);
    const chatStats = await getChatStats(chatId);

    if (topInviters.length === 0) {
        return '📉 <b>Reyting</b>\n\nHozircha ma\'lumot yo\'q. Do\'stlaringizni taklif qiling!';
    }

    let message = '🏆 <b>FAOL A\'ZOLAR REYTINGI</b>\n\n';

    const medals = ['🥇', '🥈', '🥉'];

    topInviters.forEach((user, index) => {
        let rank = medals[index] || `<b>${index + 1}.</b>`;
        let name = user.username ? `@${user.username}` : user.firstName;
        // Escape HTML in name
        name = name.replace(/</g, '&lt;').replace(/>/g, '&gt;');

        message += `${rank} ${name} — <b>${user.count}</b>\n`;
    });

    message += `\n──────────────\n`;
    message += `👥 Jami takliflar: <b>${chatStats.totalInvited}</b>`;

    return message;
}

module.exports = {
    handleStatistics,
    trackInvitation,
    getTopInviters,
    resetStats,
    getChatStats,
    formatTopInvitersMessage
};
