#!/usr/bin/env node

/**
 * Tool to retroactively assign projects to orphaned memories
 *
 * This helps users organize memories that were created before
 * the project/session feature was introduced.
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const readline = require('readline');

class ProjectAssigner {
    constructor() {
        this.db = null;
        this.dbPath = this.resolveDatabasePath();
        this.orphanedMemories = [];
        this.projects = [];
    }

    resolveDatabasePath() {
        if (process.env.DATABASE_PATH) {
            return process.env.DATABASE_PATH;
        }

        const homeDir = process.env.HOME || process.env.USERPROFILE || '.';
        const defaultPath = path.join(homeDir, '.durandal-mcp', 'durandal-mcp-memory.db');

        if (fs.existsSync(defaultPath)) {
            return defaultPath;
        }

        // Check current directory
        if (fs.existsSync('./durandal-mcp-memory.db')) {
            return './durandal-mcp-memory.db';
        }

        return defaultPath;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(`Connected to database: ${this.dbPath}`);
                    resolve();
                }
            });
        });
    }

    async analyzeOrphans() {
        return new Promise((resolve, reject) => {
            // Count orphaned memories
            this.db.get(
                `SELECT COUNT(*) as count FROM memories
                 WHERE json_extract(metadata, '$.project') IS NULL
                 OR json_extract(metadata, '$.project') = ''`,
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        this.orphanedCount = row.count;

                        // Get existing projects
                        this.db.all(
                            `SELECT DISTINCT json_extract(metadata, '$.project') as project, COUNT(*) as count
                             FROM memories
                             WHERE json_extract(metadata, '$.project') IS NOT NULL
                             AND json_extract(metadata, '$.project') != ''
                             GROUP BY json_extract(metadata, '$.project')`,
                            (err2, rows) => {
                                if (err2) {
                                    reject(err2);
                                } else {
                                    this.projects = rows;
                                    resolve();
                                }
                            }
                        );
                    }
                }
            );
        });
    }

    async assignProject(project, filter = {}) {
        return new Promise((resolve, reject) => {
            let whereClause = `WHERE (json_extract(metadata, '$.project') IS NULL OR json_extract(metadata, '$.project') = '')`;
            let params = [];

            // Add filters
            if (filter.dateFrom) {
                whereClause += ` AND created_at >= ?`;
                params.push(filter.dateFrom);
            }
            if (filter.dateTo) {
                whereClause += ` AND created_at <= ?`;
                params.push(filter.dateTo);
            }
            if (filter.contentContains) {
                whereClause += ` AND content LIKE ?`;
                params.push(`%${filter.contentContains}%`);
            }
            if (filter.limit) {
                whereClause += ` LIMIT ?`;
                params.push(filter.limit);
            }

            // First, get the memories to update
            this.db.all(
                `SELECT id, metadata FROM memories ${whereClause}`,
                params,
                (err, rows) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    if (rows.length === 0) {
                        resolve(0);
                        return;
                    }

                    let updated = 0;
                    const stmt = this.db.prepare(`UPDATE memories SET metadata = ? WHERE id = ?`);

                    rows.forEach(row => {
                        let metadata = {};
                        try {
                            metadata = row.metadata ? JSON.parse(row.metadata) : {};
                        } catch (e) {
                            metadata = {};
                        }

                        metadata.project = project;

                        // Add session if not present
                        if (!metadata.session) {
                            metadata.session = new Date().toISOString().split('T')[0];
                        }

                        stmt.run(JSON.stringify(metadata), row.id, (err) => {
                            if (!err) updated++;

                            if (updated + (err ? 1 : 0) === rows.length) {
                                stmt.finalize();
                                resolve(updated);
                            }
                        });
                    });
                }
            );
        });
    }

    async assignByDateRanges() {
        // Group orphans by date
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT
                    DATE(created_at) as date,
                    COUNT(*) as count,
                    MIN(content) as sample
                 FROM memories
                 WHERE json_extract(metadata, '$.project') IS NULL
                 OR json_extract(metadata, '$.project') = ''
                 GROUP BY DATE(created_at)
                 ORDER BY date DESC`,
                async (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log('\nOrphaned memories by date:');
                        rows.forEach(row => {
                            console.log(`  ${row.date}: ${row.count} memories`);
                            console.log(`    Sample: "${row.sample.substring(0, 50)}..."`);
                        });
                        resolve(rows);
                    }
                }
            );
        });
    }

    async interactiveMode() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const question = (query) => new Promise((resolve) => rl.question(query, resolve));

        console.log('\n========================================');
        console.log('Durandal Project Assignment Tool');
        console.log('========================================\n');

        await this.analyzeOrphans();

        console.log(`Found ${this.orphanedCount} memories without projects\n`);

        if (this.projects.length > 0) {
            console.log('Existing projects:');
            this.projects.forEach(p => {
                console.log(`  - ${p.project}: ${p.count} memories`);
            });
        }

        console.log('\nOptions:');
        console.log('1. Assign ALL orphans to a project');
        console.log('2. Assign by date range');
        console.log('3. Assign by content search');
        console.log('4. View orphans by date');
        console.log('5. Exit');

        const choice = await question('\nSelect option (1-5): ');

        switch (choice) {
            case '1':
                const project1 = await question('Enter project name (or "default"): ');
                const count1 = await this.assignProject(project1 || 'default');
                console.log(`\n✅ Assigned ${count1} memories to project "${project1 || 'default'}"`);
                break;

            case '2':
                const project2 = await question('Enter project name: ');
                const dateFrom = await question('From date (YYYY-MM-DD) or press Enter for all: ');
                const dateTo = await question('To date (YYYY-MM-DD) or press Enter for all: ');
                const filter = {};
                if (dateFrom) filter.dateFrom = dateFrom;
                if (dateTo) filter.dateTo = dateTo;
                const count2 = await this.assignProject(project2, filter);
                console.log(`\n✅ Assigned ${count2} memories to project "${project2}"`);
                break;

            case '3':
                const project3 = await question('Enter project name: ');
                const search = await question('Content contains: ');
                const count3 = await this.assignProject(project3, { contentContains: search });
                console.log(`\n✅ Assigned ${count3} memories to project "${project3}"`);
                break;

            case '4':
                await this.assignByDateRanges();
                const again = await question('\nContinue with assignment? (y/n): ');
                if (again.toLowerCase() === 'y') {
                    await this.interactiveMode();
                }
                break;

            case '5':
                console.log('Exiting...');
                break;

            default:
                console.log('Invalid option');
        }

        rl.close();
    }

    async batchMode(project, options = {}) {
        await this.analyzeOrphans();

        console.log('\n========================================');
        console.log('Batch Assignment Mode');
        console.log('========================================\n');

        console.log(`Assigning orphaned memories to project: "${project}"`);
        console.log(`Orphaned memories: ${this.orphanedCount}`);

        if (options.dryRun) {
            console.log('\n🔍 DRY RUN - No changes will be made');
            return;
        }

        const count = await this.assignProject(project, options);
        console.log(`\n✅ Successfully assigned ${count} memories to project "${project}"`);

        // Show updated statistics
        await this.analyzeOrphans();
        console.log(`\nRemaining orphaned memories: ${this.orphanedCount}`);
    }

    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

// CLI handling
if (require.main === module) {
    const args = process.argv.slice(2);
    const assigner = new ProjectAssigner();

    const run = async () => {
        try {
            await assigner.connect();

            if (args.length === 0 || args[0] === '--interactive') {
                await assigner.interactiveMode();
            } else if (args[0] === '--batch' && args[1]) {
                const project = args[1];
                const options = {};

                // Parse additional options
                if (args.includes('--dry-run')) {
                    options.dryRun = true;
                }
                if (args.includes('--from')) {
                    const idx = args.indexOf('--from');
                    options.dateFrom = args[idx + 1];
                }
                if (args.includes('--to')) {
                    const idx = args.indexOf('--to');
                    options.dateTo = args[idx + 1];
                }
                if (args.includes('--contains')) {
                    const idx = args.indexOf('--contains');
                    options.contentContains = args[idx + 1];
                }

                await assigner.batchMode(project, options);
            } else if (args[0] === '--help') {
                console.log(`
Durandal Project Assignment Tool

Usage:
  node assign-projects.js                    Interactive mode
  node assign-projects.js --batch <project>  Batch assign all to project
  node assign-projects.js --batch <project> --dry-run  Preview without changes
  node assign-projects.js --batch <project> --from YYYY-MM-DD --to YYYY-MM-DD
  node assign-projects.js --batch <project> --contains "search text"

Examples:
  node assign-projects.js --batch "default"
  node assign-projects.js --batch "my-project" --from 2025-01-01 --to 2025-01-31
  node assign-projects.js --batch "bug-fixes" --contains "error"
                `);
            } else {
                console.error('Invalid arguments. Use --help for usage.');
            }
        } catch (error) {
            console.error('Error:', error.message);
        } finally {
            assigner.close();
        }
    };

    run();
}

module.exports = ProjectAssigner;