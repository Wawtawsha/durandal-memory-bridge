#!/usr/bin/env node

/**
 * Database Discovery Tool for Durandal MCP Server
 *
 * Searches the entire system for Durandal databases to prevent data loss
 * Run with: node db-discovery.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

class DatabaseDiscovery {
    constructor() {
        this.foundDatabases = [];
        this.searchPaths = this.getSearchPaths();
        this.dbPatterns = [
            'durandal-mcp-memory.db',
            'durandal-memory.db',
            'memories.db',
            'durandal*.db',
            '*memory*.db',
            '*durandal*.db'
        ];
    }

    getSearchPaths() {
        const paths = [];
        const homeDir = os.homedir();
        const platform = os.platform();

        // Home directory locations
        paths.push(homeDir);
        paths.push(path.join(homeDir, '.durandal-mcp'));
        paths.push(path.join(homeDir, 'durandal'));
        paths.push(path.join(homeDir, '.durandal'));

        // Current directory and parent directories
        let currentDir = process.cwd();
        paths.push(currentDir);
        for (let i = 0; i < 5; i++) {
            currentDir = path.dirname(currentDir);
            if (currentDir === path.dirname(currentDir)) break;
            paths.push(currentDir);
        }

        // Platform-specific locations
        if (platform === 'win32') {
            // Windows specific paths
            const appData = process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming');
            const localAppData = process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local');
            paths.push(appData);
            paths.push(localAppData);
            paths.push(path.join(appData, 'durandal'));
            paths.push(path.join(appData, 'npm'));
            paths.push(path.join(localAppData, 'durandal'));

            // Common project directories
            paths.push('C:\\Projects');
            paths.push('C:\\Dev');
            paths.push('C:\\Development');
            paths.push('C:\\Code');
            paths.push(path.join(homeDir, 'Desktop'));
            paths.push(path.join(homeDir, 'Documents'));
            paths.push(path.join(homeDir, 'Projects'));

            // Temp directories
            paths.push(process.env.TEMP || 'C:\\Temp');
            paths.push('C:\\tmp');
        } else {
            // Unix/Mac specific paths
            paths.push('/usr/local');
            paths.push('/usr/local/lib');
            paths.push('/opt');
            paths.push('/var/lib');
            paths.push(path.join(homeDir, 'Documents'));
            paths.push(path.join(homeDir, 'Projects'));
            paths.push(path.join(homeDir, 'Development'));
            paths.push('/tmp');
        }

        // NPM global installation paths
        try {
            const npmRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
            paths.push(npmRoot);
            paths.push(path.dirname(npmRoot));
            paths.push(path.join(npmRoot, 'durandal-memory-mcp'));
        } catch (e) {
            // npm might not be in PATH
        }

        // Node.js module paths
        if (require.main && require.main.paths) {
            paths.push(...require.main.paths);
        }

        // Remove duplicates and non-existent paths
        const uniquePaths = [...new Set(paths)];
        return uniquePaths.filter(p => {
            try {
                return fs.existsSync(p);
            } catch {
                return false;
            }
        });
    }

    searchDirectory(dir, depth = 0, maxDepth = 3) {
        if (depth > maxDepth) return;

        try {
            const items = fs.readdirSync(dir);

            for (const item of items) {
                const fullPath = path.join(dir, item);

                try {
                    const stat = fs.statSync(fullPath);

                    // Check if it's a database file
                    if (stat.isFile() && this.isDatabase(item)) {
                        this.foundDatabases.push({
                            path: fullPath,
                            name: item,
                            size: stat.size,
                            modified: stat.mtime,
                            created: stat.birthtime || stat.ctime
                        });
                    }
                    // Recursively search subdirectories
                    else if (stat.isDirectory() && !this.shouldSkipDirectory(item)) {
                        this.searchDirectory(fullPath, depth + 1, maxDepth);
                    }
                } catch (e) {
                    // Permission denied or other errors - skip
                }
            }
        } catch (e) {
            // Permission denied for directory - skip
        }
    }

    isDatabase(filename) {
        const lower = filename.toLowerCase();

        // Direct matches
        if (this.dbPatterns.some(pattern => {
            if (pattern.includes('*')) {
                const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
                return regex.test(lower);
            }
            return lower === pattern;
        })) {
            return true;
        }

        // Check for .db extension with durandal or memory in name
        if (lower.endsWith('.db') &&
            (lower.includes('durandal') || lower.includes('memory'))) {
            return true;
        }

        return false;
    }

    shouldSkipDirectory(name) {
        const skip = [
            'node_modules', '.git', '.svn', '.hg',
            'bin', 'obj', 'dist', 'build', 'out',
            '.cache', '.npm', '.yarn', '.pnpm',
            'Windows', 'System32', 'SysWOW64',
            '$Recycle.Bin', 'ProgramData'
        ];
        return skip.includes(name) || name.startsWith('.');
    }

    async verifyDatabase(dbPath) {
        try {
            const sqlite3 = require('sqlite3').verbose();

            return new Promise((resolve) => {
                const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
                    if (err) {
                        resolve({ valid: false, error: err.message });
                        return;
                    }

                    // Check if it has the memories table
                    db.get(
                        "SELECT name FROM sqlite_master WHERE type='table' AND name='memories'",
                        (err, row) => {
                            if (err) {
                                db.close();
                                resolve({ valid: false, error: err.message });
                            } else if (row) {
                                // Count records
                                db.get("SELECT COUNT(*) as count FROM memories", (err2, countRow) => {
                                    db.close();
                                    if (!err2 && countRow) {
                                        resolve({
                                            valid: true,
                                            hasDurandalSchema: true,
                                            recordCount: countRow.count
                                        });
                                    } else {
                                        resolve({
                                            valid: true,
                                            hasDurandalSchema: true,
                                            recordCount: 0
                                        });
                                    }
                                });
                            } else {
                                // Check for legacy tables
                                db.get(
                                    "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('projects', 'conversation_sessions', 'conversation_messages')",
                                    (err3, legacyRow) => {
                                        db.close();
                                        resolve({
                                            valid: true,
                                            hasDurandalSchema: !!legacyRow,
                                            isLegacy: !!legacyRow
                                        });
                                    }
                                );
                            }
                        }
                    );
                });
            });
        } catch (e) {
            return { valid: false, error: 'SQLite not available' };
        }
    }

    async discover() {
        console.log('========================================');
        console.log('Durandal Database Discovery Tool v1.0');
        console.log('========================================\n');

        console.log('Searching for databases in:');
        this.searchPaths.forEach(p => console.log(`  - ${p}`));
        console.log('\nThis may take a few moments...\n');

        // Search each path
        for (const searchPath of this.searchPaths) {
            process.stdout.write(`Searching ${searchPath}...\\r`);
            this.searchDirectory(searchPath);
        }

        // Clear the line
        process.stdout.write('                                                  \\r');

        // Remove duplicates
        const seen = new Set();
        this.foundDatabases = this.foundDatabases.filter(db => {
            const key = db.path.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        // Sort by size (largest first)
        this.foundDatabases.sort((a, b) => b.size - a.size);

        // Display results
        if (this.foundDatabases.length === 0) {
            console.log('❌ No Durandal databases found on this system.');
            console.log('\\nA new database will be created at:');
            console.log(`  ${path.join(os.homedir(), '.durandal-mcp', 'durandal-mcp-memory.db')}`);
        } else {
            console.log(`✅ Found ${this.foundDatabases.length} potential database(s):\\n`);

            // Verify each database
            for (const db of this.foundDatabases) {
                const verification = await this.verifyDatabase(db.path);

                console.log(`📁 ${db.path}`);
                console.log(`   Size: ${(db.size / 1024).toFixed(1)} KB`);
                console.log(`   Modified: ${db.modified.toLocaleString()}`);

                if (verification.valid && verification.hasDurandalSchema) {
                    console.log(`   Status: ✅ Valid Durandal database`);
                    if (verification.recordCount !== undefined) {
                        console.log(`   Records: ${verification.recordCount} memories`);
                    }
                    if (verification.isLegacy) {
                        console.log(`   Type: Legacy schema (will be migrated)`);
                    }
                } else if (verification.valid) {
                    console.log(`   Status: ⚠️  SQLite database but not Durandal schema`);
                } else {
                    console.log(`   Status: ❌ Not a valid SQLite database`);
                }
                console.log();
            }

            // Recommend the best database
            const validDbs = [];
            for (const db of this.foundDatabases) {
                const verification = await this.verifyDatabase(db.path);
                if (verification.valid && verification.hasDurandalSchema) {
                    validDbs.push({
                        ...db,
                        recordCount: verification.recordCount || 0
                    });
                }
            }

            if (validDbs.length > 0) {
                // Sort by record count, then by size
                validDbs.sort((a, b) => {
                    if (b.recordCount !== a.recordCount) {
                        return b.recordCount - a.recordCount;
                    }
                    return b.size - a.size;
                });

                console.log('========================================');
                console.log('RECOMMENDED ACTION:');
                console.log('========================================');
                console.log(`\\nSet DATABASE_PATH environment variable to use your existing database:`);
                console.log(`\\n  export DATABASE_PATH="${validDbs[0].path}"`);
                console.log(`\\nThis database has ${validDbs[0].recordCount} existing memories.`);

                if (validDbs.length > 1) {
                    console.log(`\\n⚠️  You have ${validDbs.length} valid databases. Consider consolidating them.`);
                }
            }
        }

        return this.foundDatabases;
    }
}

// Run if called directly
if (require.main === module) {
    const discovery = new DatabaseDiscovery();
    discovery.discover().then(() => {
        console.log('\\nDiscovery complete.');
    }).catch(err => {
        console.error('Discovery failed:', err);
    });
}

module.exports = DatabaseDiscovery;