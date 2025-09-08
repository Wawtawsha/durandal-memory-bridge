#!/usr/bin/env node

/**
 * Fix conversation_sessions table schema
 */

const fs = require('fs');
const path = require('path');
const ClaudeMemoryDB = require('./db-client');

async function fixSessionsTable() {
    const db = new ClaudeMemoryDB();
    
    try {
        console.log('🔧 Fixing conversation_sessions table...');
        
        // Test connection first
        const connectionTest = await db.testConnection();
        if (!connectionTest.success) {
            throw new Error(`Database connection failed: ${connectionTest.error}`);
        }
        console.log('✅ Database connection established');

        // Read and execute fix SQL
        const fixPath = path.join(__dirname, 'fix-conversation-sessions.sql');
        const fixSQL = fs.readFileSync(fixPath, 'utf8');
        
        console.log('📋 Applying database fix...');
        await db.pool.query(fixSQL);
        
        console.log('✅ conversation_sessions table fixed successfully!');
        
    } catch (error) {
        console.error('❌ Fix failed:', error.message);
        process.exit(1);
    } finally {
        await db.close();
    }
}

// Run if called directly
if (require.main === module) {
    fixSessionsTable().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { fixSessionsTable };