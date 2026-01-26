const { Pool } = require('pg');

// Database configuration from environment variables
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'telegram_bot_db',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432'),
});

// Test connection
pool.on('error', (err, client) => {
    console.error('[Database] Unexpected error on idle client', err);
    process.exit(-1);
});

/**
 * Initialize database tables
 */
async function initDatabase() {
    const client = await pool.connect();
    try {
        console.log('[Database] Initializing tables...');

        // Groups table (stores settings)
        await client.query(`
            CREATE TABLE IF NOT EXISTS groups (
                chat_id BIGINT PRIMARY KEY,
                title TEXT,
                added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                file_filter_enabled BOOLEAN DEFAULT true,
                link_warning_enabled BOOLEAN DEFAULT true,
                system_message_delete_enabled BOOLEAN DEFAULT true,
                apk_warning_message TEXT DEFAULT '<b>{fullname}</b> ushbu foydalanuvchi guruhga xavfli fayl (.apk, .exe) yubordi! Agar tanisangiz, darhol ogohlantiring: ularning telefoniga virus tushgan bo''lishi ehtimoli bor. Telegram va qurilmasini tekshirsin!',
                link_warning_message TEXT DEFAULT '<b>{fullname}</b> havolani yubordi. Ochishdan oldin ogoh bo''ling! Ehtimol virus bo''lishi mumkin.'
            );
        `);

        // Invitations table (stores sum of counts for efficiency)
        await client.query(`
            CREATE TABLE IF NOT EXISTS invitations (
                chat_id BIGINT,
                user_id BIGINT,
                username TEXT,
                first_name TEXT,
                last_name TEXT,
                count INTEGER DEFAULT 0,
                last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (chat_id, user_id)
            );
        `);

        // Referrals table (stores unique relationships to prevent duplicate counting)
        await client.query(`
            CREATE TABLE IF NOT EXISTS referrals (
                chat_id BIGINT,
                sponsor_id BIGINT,
                member_id BIGINT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (chat_id, member_id)
            );
        `);

        console.log('[Database] Tables initialized successfully');
    } catch (err) {
        console.error('[Database] Failed to initialize tables:', err);
        throw err;
    } finally {
        client.release();
    }
}

module.exports = {
    pool,
    initDatabase
};
