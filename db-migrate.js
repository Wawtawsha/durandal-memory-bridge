#!/usr/bin/env node

/**
 * Database Migration Tool for Durandal MCP Server
 *
 * Finds all databases and merges them into a single universal database
 * Preserves all data with deduplication and metadata preservation
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const sqlite3 = require('sqlite3').verbose();
const DatabaseDiscovery = require('./db-discovery');

class DatabaseMigrator {
    constructor() {
        this.discovery = new DatabaseDiscovery();
        this.targetDb = null;
        this.targetPath = path.join(os.homedir(), '.durandal-mcp', 'durandal-mcp-memory.db');
        this.sourceDatabases = [];
        this.stats = {
            totalMemories: 0,
            duplicates: 0,
            migrated: 0,
            errors: 0
        };
    }

    /**
     * Initialize target database with proper schema
     */
    async initializeTargetDatabase() {
        const dir = path.dirname(this.targetPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        return new Promise((resolve, reject) => {
            this.targetDb = new sqlite3.Database(this.targetPath, (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                // Create schema - handle existing table by adding columns if needed
                const createTable = `
                    CREATE TABLE IF NOT EXISTS memories (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        content TEXT NOT NULL,
                        metadata TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );

                    CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at);
                `;

                this.targetDb.exec(createTable, (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    // Try to add migration columns if they don't exist
                    this.targetDb.run('ALTER TABLE memories ADD COLUMN source_db TEXT', (err) => {
                        // Ignore error if column already exists
                        this.targetDb.run('ALTER TABLE memories ADD COLUMN original_id INTEGER', (err2) => {
                            // Create indices
                            const indices = `
                                CREATE INDEX IF NOT EXISTS idx_memories_source ON memories(source_db, original_id);
                                CREATE INDEX IF NOT EXISTS idx_memories_content_hash ON memories(
                                    substr(content, 1, 100)
                                );
                            `;
                            this.targetDb.exec(indices, (err3) => {
                                resolve();
                            });
                        });
                    });
                });
            });
        });
    }

    /**
     * Find all databases on the system
     */
    async findAllDatabases() {
        console.log('Searching for all Durandal databases...\n');

        // Run discovery
        await this.discovery.discover();

        // Get all valid databases
        for (const db of this.discovery.foundDatabases) {
            const verification = await this.discovery.verifyDatabase(db.path);
            if (verification.valid && verification.hasDurandalSchema) {
                this.sourceDatabases.push({
                    ...db,
                    recordCount: verification.recordCount || 0
                });
            }
        }

        // Filter out target database if it exists
        this.sourceDatabases = this.sourceDatabases.filter(
            db => path.resolve(db.path) !== path.resolve(this.targetPath)
        );

        return this.sourceDatabases;
    }

    /**
     * Check for duplicate memory based on content
     */
    async isDuplicate(content, metadata) {
        return new Promise((resolve) => {
            // Check for exact content match
            this.targetDb.get(
                'SELECT id FROM memories WHERE content = ? LIMIT 1',
                [content],
                (err, row) => {
                    if (err) {
                        resolve(false);
                    } else {
                        resolve(!!row);
                    }
                }
            );
        });
    }

    /**
     * Migrate memories from a source database
     */
    async migrateDatabase(sourceDb) {
        console.log(`\nMigrating from: ${sourceDb.path}`);
        console.log(`Records to migrate: ${sourceDb.recordCount}`);

        return new Promise((resolve) => {
            const source = new sqlite3.Database(sourceDb.path, sqlite3.OPEN_READONLY, async (err) => {
                if (err) {
                    console.error(`  Error opening source: ${err.message}`);
                    this.stats.errors++;
                    resolve();
                    return;
                }

                // Get all memories from source
                source.all(
                    'SELECT * FROM memories ORDER BY created_at',
                    async (err, rows) => {
                        if (err) {
                            console.error(`  Error reading memories: ${err.message}`);
                            this.stats.errors++;
                            source.close();
                            resolve();
                            return;
                        }

                        let migrated = 0;
                        let duplicates = 0;

                        for (const row of rows) {
                            this.stats.totalMemories++;

                            // Check for duplicate
                            const isDupe = await this.isDuplicate(row.content, row.metadata);

                            if (isDupe) {
                                duplicates++;
                                this.stats.duplicates++;
                                continue;
                            }

                            // Migrate the memory
                            await new Promise((migrateResolve) => {
                                this.targetDb.run(
                                    `INSERT INTO memories (content, metadata, created_at, source_db, original_id)
                                     VALUES (?, ?, ?, ?, ?)`,
                                    [
                                        row.content,
                                        row.metadata,
                                        row.created_at || new Date().toISOString(),
                                        sourceDb.path,
                                        row.id
                                    ],
                                    (err) => {
                                        if (err) {
                                            if (!err.message.includes('UNIQUE constraint')) {
                                                console.error(`  Migration error: ${err.message}`);
                                                this.stats.errors++;
                                            } else {
                                                duplicates++;
                                                this.stats.duplicates++;
                                            }
                                        } else {
                                            migrated++;
                                            this.stats.migrated++;
                                        }
                                        migrateResolve();
                                    }
                                );
                            });
                        }

                        console.log(`  ✓ Migrated: ${migrated} memories`);
                        if (duplicates > 0) {
                            console.log(`  ⚠ Skipped: ${duplicates} duplicates`);
                        }

                        source.close();
                        resolve();
                    }
                );
            });
        });
    }

    /**
     * Run the complete migration process
     */
    async migrate() {
        console.log('========================================');
        console.log('Durandal Database Migration Tool v1.0');
        console.log('========================================\n');

        try {
            // Initialize target database
            await this.initializeTargetDatabase();
            console.log(`Target database: ${this.targetPath}\n`);

            // Find all databases
            const databases = await this.findAllDatabases();

            if (databases.length === 0) {
                console.log('No source databases found to migrate.');
                console.log('\nYour universal database is ready at:');
                console.log(`  ${this.targetPath}`);
                return;
            }

            console.log(`\nFound ${databases.length} database(s) to migrate:`);
            for (const db of databases) {
                console.log(`  - ${db.path} (${db.recordCount} memories)`);
            }

            // Ask for confirmation
            console.log('\n⚠️  WARNING: This will merge all databases into one.');
            console.log('Original databases will NOT be deleted.');
            console.log('Duplicate memories will be skipped.\n');

            const readline = require('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            const answer = await new Promise((resolve) => {
                rl.question('Continue with migration? (yes/no): ', resolve);
            });
            rl.close();

            if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
                console.log('\nMigration cancelled.');
                return;
            }

            // Perform migration
            console.log('\nStarting migration...');
            for (const db of databases) {
                await this.migrateDatabase(db);
            }

            // Show final statistics
            console.log('\n========================================');
            console.log('Migration Complete!');
            console.log('========================================\n');
            console.log(`Total memories processed: ${this.stats.totalMemories}`);
            console.log(`Successfully migrated: ${this.stats.migrated}`);
            console.log(`Duplicates skipped: ${this.stats.duplicates}`);
            if (this.stats.errors > 0) {
                console.log(`Errors encountered: ${this.stats.errors}`);
            }

            // Get final count
            await new Promise((resolve) => {
                this.targetDb.get('SELECT COUNT(*) as count FROM memories', (err, row) => {
                    if (!err && row) {
                        console.log(`\n✅ Universal database now contains: ${row.count} memories`);
                    }
                    resolve();
                });
            });

            console.log(`\nUniversal database location:`);
            console.log(`  ${this.targetPath}`);
            console.log('\nTo use this database, set:');
            console.log(`  export DATABASE_PATH="${this.targetPath}"`);
            console.log('\nOr it will be used automatically as the default.');

            // Cleanup recommendation
            if (databases.length > 0) {
                console.log('\n📝 Note: Original databases were preserved.');
                console.log('After verifying the migration, you may delete them to save space.');
                console.log('\nOriginal databases:');
                for (const db of databases) {
                    console.log(`  - ${db.path}`);
                }
            }

        } catch (error) {
            console.error('\n❌ Migration failed:', error.message);
            console.error(error.stack);
        } finally {
            if (this.targetDb) {
                this.targetDb.close();
            }
        }
    }

    /**
     * Verify migration by checking both databases
     */
    async verify() {
        console.log('\nVerifying migration integrity...');

        // Count memories in target
        return new Promise((resolve) => {
            this.targetDb.get(
                'SELECT COUNT(*) as count, COUNT(DISTINCT source_db) as sources FROM memories',
                (err, row) => {
                    if (!err && row) {
                        console.log(`  Memories in universal DB: ${row.count}`);
                        console.log(`  Migrated from ${row.sources} source(s)`);
                    }
                    resolve();
                }
            );
        });
    }
}

// Run if called directly
if (require.main === module) {
    const migrator = new DatabaseMigrator();
    migrator.migrate().catch(err => {
        console.error('Migration failed:', err);
        process.exit(1);
    });
}

module.exports = DatabaseMigrator;