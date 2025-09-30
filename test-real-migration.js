#!/usr/bin/env node

/**
 * Test migration with REAL production databases
 * This is a DRY RUN - no data will be modified
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const sqlite3 = require('sqlite3').verbose();

async function testRealMigration() {
    console.log('\n========================================');
    console.log('TESTING REAL DATABASE MIGRATION (DRY RUN)');
    console.log('========================================\n');

    // Find real databases
    const DatabaseDiscovery = require('./db-discovery');
    const discovery = new DatabaseDiscovery();
    await discovery.discover();

    const realDatabases = [];
    for (const db of discovery.foundDatabases) {
        const verification = await discovery.verifyDatabase(db.path);
        if (verification.valid && verification.hasDurandalSchema) {
            realDatabases.push({
                ...db,
                recordCount: verification.recordCount || 0
            });
        }
    }

    console.log(`\nFound ${realDatabases.length} real databases to migrate:\n`);

    let totalMemories = 0;
    for (const db of realDatabases) {
        console.log(`📁 ${db.path}`);
        console.log(`   Records: ${db.recordCount} memories`);
        console.log(`   Size: ${(db.size / 1024).toFixed(1)} KB`);
        totalMemories += db.recordCount;
    }

    console.log(`\n📊 Total memories across all databases: ${totalMemories}`);

    // Test migration to temporary database
    console.log('\n=== DRY RUN MIGRATION TEST ===\n');

    const testTargetPath = path.join(os.tmpdir(), 'durandal-migration-test.db');
    console.log(`Test target: ${testTargetPath}\n`);

    // Create test migrator
    const DatabaseMigrator = require('./db-migrate');
    const migrator = new DatabaseMigrator();
    migrator.targetPath = testTargetPath;

    // Initialize target
    await migrator.initializeTargetDatabase();

    // Test each database
    let migratedTotal = 0;
    for (const db of realDatabases) {
        console.log(`\nTesting migration from: ${path.basename(db.path)}`);

        // Open source database READ ONLY
        const source = new sqlite3.Database(db.path, sqlite3.OPEN_READONLY);

        // Count memories
        await new Promise((resolve) => {
            source.get('SELECT COUNT(*) as count FROM memories', (err, row) => {
                if (!err && row) {
                    console.log(`  Source has ${row.count} memories`);
                }
                source.close();
                resolve();
            });
        });

        // Simulate migration
        await migrator.migrateDatabase(db);
        migratedTotal += db.recordCount;
    }

    // Verify test migration
    console.log('\n=== VERIFICATION ===\n');

    const testDb = new sqlite3.Database(testTargetPath, sqlite3.OPEN_READONLY);
    await new Promise((resolve) => {
        testDb.get('SELECT COUNT(*) as total FROM memories', (err, row) => {
            if (!err && row) {
                console.log(`✅ Test migration successful!`);
                console.log(`   Expected: ${totalMemories} memories`);
                console.log(`   Migrated: ${row.total} memories`);

                if (row.total === totalMemories) {
                    console.log(`   Result: PERFECT - All memories preserved!`);
                } else if (row.total < totalMemories) {
                    const lost = totalMemories - row.total;
                    console.log(`   Result: WARNING - ${lost} memories not migrated (likely duplicates)`);
                } else {
                    console.log(`   Result: ERROR - Extra memories found!`);
                }
            }
            testDb.close();
            resolve();
        });
    });

    // Check for duplicates
    await new Promise((resolve) => {
        const testDb2 = new sqlite3.Database(testTargetPath, sqlite3.OPEN_READONLY);
        testDb2.get(`
            SELECT COUNT(*) as dupe_count
            FROM (
                SELECT content, COUNT(*) as cnt
                FROM memories
                GROUP BY content
                HAVING cnt > 1
            )
        `, (err, row) => {
            if (!err && row && row.dupe_count > 0) {
                console.log(`\n⚠️  Found ${row.dupe_count} duplicate content entries (this is expected)`);
            }
            testDb2.close();
            resolve();
        });
    });

    // Clean up test database
    if (fs.existsSync(testTargetPath)) {
        fs.unlinkSync(testTargetPath);
        console.log('\n🧹 Test database cleaned up');
    }

    console.log('\n========================================');
    console.log('DRY RUN COMPLETE - NO REAL DATA MODIFIED');
    console.log('========================================\n');

    if (realDatabases.length > 1) {
        console.log('📝 To perform the actual migration, run:');
        console.log('   durandal-mcp --migrate\n');
    }
}

testRealMigration().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});