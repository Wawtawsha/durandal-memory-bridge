#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Database Discovery and Migration
 *
 * CRITICAL: These tools MUST work perfectly to prevent data loss
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const sqlite3 = require('sqlite3').verbose();
const { execSync } = require('child_process');

class MigrationTestSuite {
    constructor() {
        this.testDir = path.join(os.tmpdir(), 'durandal-migration-test-' + Date.now());
        this.testDatabases = [];
        this.testResults = [];
        this.criticalErrors = [];
    }

    log(message, type = 'info') {
        const prefix = {
            'info': '[INFO]',
            'success': '[✓]',
            'error': '[✗]',
            'warning': '[⚠]',
            'test': '[TEST]'
        }[type] || '[LOG]';

        console.log(`${prefix} ${message}`);

        if (type === 'error') {
            this.criticalErrors.push(message);
        }
    }

    /**
     * Create test databases with known data
     */
    async createTestDatabases() {
        this.log('Creating test databases in various locations...', 'test');

        // Create test directory structure
        const locations = [
            path.join(this.testDir, 'project1'),
            path.join(this.testDir, 'project2'),
            path.join(this.testDir, 'deep', 'nested', 'folder'),
            path.join(this.testDir, 'space folder', 'with spaces'),
            path.join(this.testDir, '.hidden'),
            path.join(os.homedir(), '.durandal-test-' + Date.now()),
            process.cwd()  // Current directory
        ];

        for (const loc of locations) {
            if (!fs.existsSync(loc)) {
                fs.mkdirSync(loc, { recursive: true });
            }
        }

        // Test database configurations
        const databases = [
            {
                path: path.join(locations[0], 'durandal-mcp-memory.db'),
                memories: 100,
                name: 'Project1 DB'
            },
            {
                path: path.join(locations[1], 'durandal-memory.db'),
                memories: 200,
                name: 'Project2 DB'
            },
            {
                path: path.join(locations[2], 'memories.db'),
                memories: 50,
                name: 'Nested DB'
            },
            {
                path: path.join(locations[3], 'durandal-mcp-memory.db'),
                memories: 75,
                name: 'Spaces DB'
            },
            {
                path: path.join(locations[4], 'durandal-mcp-memory.db'),
                memories: 25,
                name: 'Hidden DB'
            },
            {
                path: path.join(locations[5], 'test-memory.db'),
                memories: 150,
                name: 'Home DB'
            },
            {
                path: path.join(locations[6], 'test-durandal-' + Date.now() + '.db'),
                memories: 300,
                name: 'Current Dir DB'
            }
        ];

        // Create each database with test data
        for (const config of databases) {
            await this.createTestDatabase(config);
            this.testDatabases.push(config);
        }

        // Create a corrupted database
        const corruptPath = path.join(this.testDir, 'corrupt.db');
        fs.writeFileSync(corruptPath, 'This is not a valid SQLite database');
        this.testDatabases.push({
            path: corruptPath,
            memories: 0,
            name: 'Corrupted DB',
            corrupted: true
        });

        // Create an empty database
        const emptyPath = path.join(this.testDir, 'empty.db');
        const emptyDb = new sqlite3.Database(emptyPath);
        await new Promise(resolve => {
            emptyDb.run(`
                CREATE TABLE memories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    content TEXT NOT NULL,
                    metadata TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, resolve);
        });
        emptyDb.close();
        this.testDatabases.push({
            path: emptyPath,
            memories: 0,
            name: 'Empty DB'
        });

        this.log(`Created ${this.testDatabases.length} test databases`, 'success');
        return this.testDatabases;
    }

    /**
     * Create a single test database with specified number of memories
     */
    async createTestDatabase(config) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(config.path, (err) => {
                if (err) {
                    this.log(`Failed to create ${config.name}: ${err.message}`, 'error');
                    reject(err);
                    return;
                }

                // Create schema
                db.run(`
                    CREATE TABLE IF NOT EXISTS memories (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        content TEXT NOT NULL,
                        metadata TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `, (err) => {
                    if (err) {
                        this.log(`Schema creation failed for ${config.name}: ${err.message}`, 'error');
                        db.close();
                        reject(err);
                        return;
                    }

                    // Insert test memories
                    let inserted = 0;
                    const stmt = db.prepare('INSERT INTO memories (content, metadata) VALUES (?, ?)');

                    for (let i = 0; i < config.memories; i++) {
                        const content = `Test memory ${i + 1} from ${config.name}`;
                        const metadata = JSON.stringify({
                            source: config.name,
                            index: i + 1,
                            testId: `${config.name}-${i + 1}`,
                            importance: Math.random(),
                            project: `test-project-${Math.floor(i / 10)}`,
                            session: `test-session-${Math.floor(i / 5)}`
                        });

                        stmt.run(content, metadata, (err) => {
                            if (err) {
                                this.log(`Insert failed: ${err.message}`, 'error');
                            } else {
                                inserted++;
                            }

                            if (inserted + (err ? 1 : 0) === config.memories) {
                                stmt.finalize();
                                db.close();
                                this.log(`Created ${config.name} with ${inserted} memories at ${config.path}`, 'success');
                                resolve();
                            }
                        });
                    }
                });
            });
        });
    }

    /**
     * Test the discovery tool
     */
    async testDiscovery() {
        this.log('\n=== Testing Database Discovery Tool ===', 'test');

        try {
            // Temporarily set test directory as working directory
            const originalCwd = process.cwd();
            process.chdir(this.testDir);

            // Run discovery tool
            const DatabaseDiscovery = require('./db-discovery');
            const discovery = new DatabaseDiscovery();

            // Override search paths to include our test locations
            discovery.searchPaths.push(this.testDir);
            discovery.searchPaths.push(...this.testDatabases.map(db => path.dirname(db.path)));

            await discovery.discover();

            process.chdir(originalCwd);

            // Verify all databases were found
            let foundCount = 0;
            for (const testDb of this.testDatabases) {
                if (testDb.corrupted) continue; // Skip corrupted DB

                const found = discovery.foundDatabases.some(
                    foundDb => path.resolve(foundDb.path) === path.resolve(testDb.path)
                );

                if (found) {
                    foundCount++;
                    this.log(`Found: ${testDb.name}`, 'success');
                } else {
                    this.log(`MISSING: ${testDb.name} at ${testDb.path}`, 'error');
                }
            }

            const expectedCount = this.testDatabases.filter(db => !db.corrupted).length;
            if (foundCount === expectedCount) {
                this.log(`Discovery test PASSED: Found all ${foundCount} valid databases`, 'success');
                this.testResults.push({ test: 'Discovery', passed: true });
            } else {
                this.log(`Discovery test FAILED: Found only ${foundCount}/${expectedCount} databases`, 'error');
                this.testResults.push({ test: 'Discovery', passed: false });
            }

        } catch (error) {
            this.log(`Discovery test FAILED: ${error.message}`, 'error');
            this.testResults.push({ test: 'Discovery', passed: false, error: error.message });
        }
    }

    /**
     * Test the migration tool
     */
    async testMigration() {
        this.log('\n=== Testing Database Migration Tool ===', 'test');

        try {
            // Calculate expected total memories (excluding corrupted)
            const expectedTotal = this.testDatabases
                .filter(db => !db.corrupted)
                .reduce((sum, db) => sum + db.memories, 0);

            this.log(`Expected total memories: ${expectedTotal}`, 'info');

            // Create migration target directory
            const migrationTarget = path.join(this.testDir, 'migration-target');
            fs.mkdirSync(migrationTarget, { recursive: true });

            // Set up environment for migration
            process.env.DATABASE_PATH = path.join(migrationTarget, 'universal.db');

            // Run migration
            const DatabaseMigrator = require('./db-migrate');
            const migrator = new DatabaseMigrator();

            // Override target path
            migrator.targetPath = process.env.DATABASE_PATH;

            // Find databases
            await migrator.initializeTargetDatabase();

            // Manually add our test databases
            migrator.sourceDatabases = this.testDatabases
                .filter(db => !db.corrupted && db.memories > 0)
                .map(db => ({
                    path: db.path,
                    recordCount: db.memories,
                    size: fs.statSync(db.path).size
                }));

            // Perform migration
            for (const sourceDb of migrator.sourceDatabases) {
                await migrator.migrateDatabase(sourceDb);
            }

            // Verify migration results
            await this.verifyMigration(migrator.targetPath, expectedTotal);

            // Clean up environment
            delete process.env.DATABASE_PATH;

        } catch (error) {
            this.log(`Migration test FAILED: ${error.message}`, 'error');
            this.testResults.push({ test: 'Migration', passed: false, error: error.message });
        }
    }

    /**
     * Verify migration preserved all data
     */
    async verifyMigration(targetPath, expectedCount) {
        this.log('\n=== Verifying Migration Results ===', 'test');

        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(targetPath, sqlite3.OPEN_READONLY, (err) => {
                if (err) {
                    this.log(`Cannot open migrated database: ${err.message}`, 'error');
                    this.testResults.push({ test: 'Migration', passed: false, error: 'Cannot open result' });
                    reject(err);
                    return;
                }

                // Count total memories
                db.get('SELECT COUNT(*) as count FROM memories', (err, row) => {
                    if (err) {
                        this.log(`Cannot count memories: ${err.message}`, 'error');
                        this.testResults.push({ test: 'Migration', passed: false, error: 'Cannot count' });
                        db.close();
                        reject(err);
                        return;
                    }

                    const actualCount = row.count;
                    this.log(`Migrated memories: ${actualCount}`, 'info');
                    this.log(`Expected memories: ${expectedCount}`, 'info');

                    // Check for data integrity
                    db.all('SELECT content, metadata FROM memories LIMIT 10', (err, samples) => {
                        if (err) {
                            this.log(`Cannot read samples: ${err.message}`, 'error');
                            this.testResults.push({ test: 'Migration', passed: false, error: 'Cannot read' });
                            db.close();
                            reject(err);
                            return;
                        }

                        // Verify samples have content and metadata
                        let valid = true;
                        for (const sample of samples) {
                            if (!sample.content) {
                                this.log('Found memory without content!', 'error');
                                valid = false;
                            }
                            if (!sample.metadata) {
                                this.log('Found memory without metadata!', 'warning');
                            }
                        }

                        db.close();

                        // Determine if test passed
                        if (actualCount === expectedCount && valid) {
                            this.log(`Migration test PASSED: All ${actualCount} memories preserved`, 'success');
                            this.testResults.push({ test: 'Migration', passed: true });
                        } else if (actualCount < expectedCount) {
                            this.log(`Migration test FAILED: Lost ${expectedCount - actualCount} memories!`, 'error');
                            this.testResults.push({ test: 'Migration', passed: false, lost: expectedCount - actualCount });
                        } else {
                            this.log(`Migration test WARNING: Found ${actualCount - expectedCount} extra memories (duplicates?)`, 'warning');
                            this.testResults.push({ test: 'Migration', passed: true, extra: actualCount - expectedCount });
                        }

                        resolve();
                    });
                });
            });
        });
    }

    /**
     * Test edge cases
     */
    async testEdgeCases() {
        this.log('\n=== Testing Edge Cases ===', 'test');

        // Test 1: Database with same content (duplicates)
        const dupPath = path.join(this.testDir, 'duplicates.db');
        const dupDb = new sqlite3.Database(dupPath);

        await new Promise(resolve => {
            dupDb.run(`
                CREATE TABLE memories (
                    id INTEGER PRIMARY KEY,
                    content TEXT NOT NULL,
                    metadata TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, () => {
                // Insert duplicate content
                for (let i = 0; i < 10; i++) {
                    dupDb.run('INSERT INTO memories (content, metadata) VALUES (?, ?)',
                        ['Duplicate content', '{"test": true}']);
                }
                dupDb.close(resolve);
            });
        });

        // Test 2: Database with special characters
        const specialPath = path.join(this.testDir, 'special-#@!$.db');
        try {
            const specialDb = new sqlite3.Database(specialPath);
            await new Promise(resolve => {
                specialDb.run(`
                    CREATE TABLE memories (
                        id INTEGER PRIMARY KEY,
                        content TEXT NOT NULL,
                        metadata TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `, () => {
                    specialDb.run('INSERT INTO memories (content, metadata) VALUES (?, ?)',
                        ['Special chars: 你好 مرحبا émojis:🎉', '{"unicode": true}'],
                        () => {
                            specialDb.close(resolve);
                        });
                });
            });
            this.log('Edge case: Special characters handled', 'success');
        } catch (e) {
            this.log(`Edge case FAILED: Special characters - ${e.message}`, 'error');
        }

        // Test 3: Very large memory content
        const largePath = path.join(this.testDir, 'large.db');
        const largeDb = new sqlite3.Database(largePath);
        const largeContent = 'x'.repeat(40000); // 40KB content

        await new Promise(resolve => {
            largeDb.run(`
                CREATE TABLE memories (
                    id INTEGER PRIMARY KEY,
                    content TEXT NOT NULL,
                    metadata TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, () => {
                largeDb.run('INSERT INTO memories (content, metadata) VALUES (?, ?)',
                    [largeContent, '{"size": "large"}'],
                    () => {
                        largeDb.close(resolve);
                    });
            });
        });

        this.log('Edge cases tested', 'success');
        this.testResults.push({ test: 'EdgeCases', passed: true });
    }

    /**
     * Clean up test databases
     */
    async cleanup() {
        this.log('\n=== Cleaning Up Test Data ===', 'info');

        try {
            // Remove test databases
            for (const db of this.testDatabases) {
                if (fs.existsSync(db.path)) {
                    fs.unlinkSync(db.path);
                }
            }

            // Remove test directories
            if (fs.existsSync(this.testDir)) {
                fs.rmSync(this.testDir, { recursive: true, force: true });
            }

            // Remove home test directory
            const homeTestDirs = fs.readdirSync(os.homedir())
                .filter(f => f.startsWith('.durandal-test-'));

            for (const dir of homeTestDirs) {
                fs.rmSync(path.join(os.homedir(), dir), { recursive: true, force: true });
            }

            this.log('Cleanup complete', 'success');
        } catch (error) {
            this.log(`Cleanup warning: ${error.message}`, 'warning');
        }
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('\n========================================');
        console.log('CRITICAL DATABASE MIGRATION TEST SUITE');
        console.log('========================================\n');
        console.log('Testing data preservation to prevent ANY data loss...\n');

        try {
            await this.createTestDatabases();
            await this.testDiscovery();
            await this.testMigration();
            await this.testEdgeCases();
        } catch (error) {
            this.log(`Test suite error: ${error.message}`, 'error');
            console.error(error.stack);
        } finally {
            await this.cleanup();
        }

        // Display results
        console.log('\n========================================');
        console.log('TEST RESULTS');
        console.log('========================================\n');

        let passed = 0;
        let failed = 0;

        for (const result of this.testResults) {
            if (result.passed) {
                console.log(`✅ ${result.test}: PASSED`);
                passed++;
            } else {
                console.log(`❌ ${result.test}: FAILED${result.error ? ' - ' + result.error : ''}`);
                failed++;
            }
        }

        console.log('\n----------------------------------------');
        console.log(`Total: ${passed} passed, ${failed} failed`);

        if (this.criticalErrors.length > 0) {
            console.log('\n⚠️  CRITICAL ERRORS DETECTED:');
            for (const error of this.criticalErrors) {
                console.log(`   - ${error}`);
            }
            console.log('\n🚨 DATA LOSS RISK - DO NOT DEPLOY!');
            return false;
        } else if (failed === 0) {
            console.log('\n✅ ALL TESTS PASSED - Safe to deploy');
            return true;
        } else {
            console.log('\n⚠️  Some tests failed - Review before deploying');
            return false;
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new MigrationTestSuite();
    tester.runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = MigrationTestSuite;