#!/usr/bin/env node

/**
 * Universal Memory System Database Migration Runner
 * Applies the required schema changes for universal memory integration
 */

const fs = require('fs');
const path = require('path');
const ClaudeMemoryDB = require('./db-client');

async function runMigration() {
    const db = new ClaudeMemoryDB();
    
    try {
        console.log('🔄 Starting Universal Memory System migration...');
        
        // Test connection first
        const connectionTest = await db.testConnection();
        if (!connectionTest.success) {
            throw new Error(`Database connection failed: ${connectionTest.error}`);
        }
        console.log('✅ Database connection established');

        // Read and execute migration SQL
        const migrationPath = path.join(__dirname, 'universal-memory-migration.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📋 Executing migration script...');
        await db.pool.query(migrationSQL);
        
        console.log('✅ Universal Memory System migration completed successfully!');
        
        // Test the new structure
        console.log('🔍 Verifying migration...');
        
        // Check if conversation_messages table exists
        const tableCheck = await db.pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'conversation_messages'
            );
        `);
        
        if (tableCheck.rows[0].exists) {
            console.log('✅ conversation_messages table created successfully');
        } else {
            console.warn('⚠️  conversation_messages table not found');
        }
        
        // Check if projects table has path column
        const columnCheck = await db.pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_name = 'projects' AND column_name = 'path'
            );
        `);
        
        if (columnCheck.rows[0].exists) {
            console.log('✅ projects.path column added successfully');
        } else {
            console.warn('⚠️  projects.path column not found');
        }
        
        console.log('🎉 Migration verification complete!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        await db.close();
    }
}

// Run if called directly
if (require.main === module) {
    runMigration().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { runMigration };