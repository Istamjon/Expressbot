/**
 * Express Server Entry Point
 * Telegram Group Management Bot
 */

// Load environment variables first
require('dotenv').config();

const express = require('express');
const { initializeBot, stopBot } = require('./src/bot');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'running',
        name: 'Telegram Group Bot',
        version: '1.0.0',
        uptime: process.uptime()
    });
});

// Health check endpoint for monitoring
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// Bot status endpoint
app.get('/status', (req, res) => {
    res.json({
        bot: 'active',
        mode: 'polling',
        owner_configured: !!process.env.OWNER_ID
    });
});

// Initialize bot
let bot = null;

try {
    bot = initializeBot();
    console.log('[Server] Bot initialized successfully');
} catch (error) {
    console.error('[Server] Failed to initialize bot:', error.message);
    process.exit(1);
}

// Start Express server
const server = app.listen(PORT, () => {
    console.log(`[Server] ✅ Express server running on port ${PORT}`);
    console.log(`[Server] 🌐 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown handlers
process.on('SIGINT', () => {
    console.log('\n[Server] Received SIGINT, shutting down gracefully...');
    shutdown();
});

process.on('SIGTERM', () => {
    console.log('\n[Server] Received SIGTERM, shutting down gracefully...');
    shutdown();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('[Server] Uncaught exception:', error);
    shutdown();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('[Server] Unhandled rejection at:', promise, 'reason:', reason);
});

/**
 * Graceful shutdown function
 */
function shutdown() {
    console.log('[Server] Starting graceful shutdown...');

    // Stop bot
    stopBot(bot);

    // Close server
    server.close(() => {
        console.log('[Server] HTTP server closed');
        process.exit(0);
    });

    // Force exit after timeout
    setTimeout(() => {
        console.error('[Server] Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
}

module.exports = app;
