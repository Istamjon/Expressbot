/**
 * Statistics Handler
 * Tracks member invitation statistics in memory
 */

// In-memory storage: Map<chatId, Map<userId, { count, username }>>
const inviteStats = new Map();

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
function trackInvitation(chatId, inviter, count = 1) {
    if (!inviter || !inviter.id) return;

    // Initialize chat stats if not exists
    if (!inviteStats.has(chatId)) {
        inviteStats.set(chatId, new Map());
    }

    const chatStats = inviteStats.get(chatId);
    const userId = inviter.id;

    // Get or create user stats
    const userStats = chatStats.get(userId) || {
        count: 0,
        username: getUserDisplayName(inviter),
        firstName: inviter.first_name,
        lastName: inviter.last_name || ''
    };

    // Update count
    userStats.count += count;
    userStats.username = getUserDisplayName(inviter); // Update username in case it changed

    chatStats.set(userId, userStats);

    console.log(`[Statistics] ${userStats.username} invited ${count} member(s) to chat ${chatId}. Total: ${userStats.count}`);
}

/**
 * Get top inviters for a chat
 * @param {number} chatId - Telegram chat ID
 * @param {number} limit - Number of top users to return
 * @returns {Array} Sorted array of { userId, username, count }
 */
function getTopInviters(chatId, limit = 10) {
    if (!inviteStats.has(chatId)) {
        return [];
    }

    const chatStats = inviteStats.get(chatId);
    const users = [];

    for (const [userId, stats] of chatStats) {
        users.push({
            userId,
            username: stats.username,
            firstName: stats.firstName,
            lastName: stats.lastName,
            count: stats.count
        });
    }

    // Sort by count descending
    users.sort((a, b) => b.count - a.count);

    return users.slice(0, limit);
}

/**
 * Reset statistics for a chat
 * @param {number} chatId - Telegram chat ID
 */
function resetStats(chatId) {
    inviteStats.delete(chatId);
    console.log(`[Statistics] Stats reset for chat ${chatId}`);
}

/**
 * Get total stats for a chat
 * @param {number} chatId - Telegram chat ID
 * @returns {Object} { totalInviters, totalInvited }
 */
function getChatStats(chatId) {
    if (!inviteStats.has(chatId)) {
        return { totalInviters: 0, totalInvited: 0 };
    }

    const chatStats = inviteStats.get(chatId);
    let totalInvited = 0;

    for (const [, stats] of chatStats) {
        totalInvited += stats.count;
    }

    return {
        totalInviters: chatStats.size,
        totalInvited
    };
}

/**
 * Handle new chat members event for statistics
 * @param {Object} bot - Telegram bot instance
 * @param {Object} msg - Telegram message object
 */
async function handleStatistics(bot, msg) {
    // Only process group/supergroup messages with new members
    if (msg.chat.type !== 'group' && msg.chat.type !== 'supergroup') {
        return;
    }

    if (!msg.new_chat_members || msg.new_chat_members.length === 0) {
        return;
    }

    const chatId = msg.chat.id;
    const inviter = msg.from;

    // Don't count if user added themselves (joined via link)
    const selfJoin = msg.new_chat_members.some(member => member.id === inviter.id);

    if (selfJoin && msg.new_chat_members.length === 1) {
        // User joined themselves, don't track
        return;
    }

    // Count only members added by someone else
    const addedByOther = msg.new_chat_members.filter(member => member.id !== inviter.id);

    if (addedByOther.length > 0) {
        trackInvitation(chatId, inviter, addedByOther.length);
    }
}

/**
 * Format top inviters list as a message
 * @param {number} chatId - Telegram chat ID
 * @returns {string} Formatted message
 */
function formatTopInvitersMessage(chatId) {
    const topInviters = getTopInviters(chatId, 10);
    const chatStats = getChatStats(chatId);

    if (topInviters.length === 0) {
        return '📊 <b>Statistika</b>\n\nHozircha hech kim a\'zo qo\'shmadi.';
    }

    let message = '📊 <b>Eng ko\'p a\'zo qo\'shganlar</b>\n\n';

    topInviters.forEach((user, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        message += `${medal} ${user.username} — <b>${user.count}</b> ta a\'zo\n`;
    });

    message += `\n📈 Jami: ${chatStats.totalInvited} ta a\'zo, ${chatStats.totalInviters} ta taklif qiluvchi`;

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
