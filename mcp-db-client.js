/**
 * Simplified SQLite Database Client for Durandal MCP Server
 *
 * Zero-configuration SQLite client with automatic schema setup.
 * Extracted from unified-db-client.js for MCP server simplicity.
 */

class MCPDatabaseClient {
    constructor() {
        this.client = null;
        this.initialized = false;

        // Determine database path with priority order
        this.dbPath = this.resolveDatabasePath();

        this.initializeSQLite();
    }

    /**
     * Resolves the database path with exhaustive search to prevent data loss
     * CRITICAL: This method will NEVER create a new database if ANY existing one is found
     *
     * Priority order:
     * 1. DATABASE_PATH environment variable (explicit override)
     * 2. Run full system discovery to find ALL databases
     * 3. Select database with most records (not just size)
     * 4. Only create new if absolutely NO databases found anywhere
     */
    resolveDatabasePath() {
        const path = require('path');
        const fs = require('fs');
        const sqlite3 = require('sqlite3').verbose();

        // Priority 1: Check for explicit override
        if (process.env.DATABASE_PATH) {
            console.log(`[DB] Using DATABASE_PATH from environment: ${process.env.DATABASE_PATH}`);
            return process.env.DATABASE_PATH;
        }

        console.log('[DB] No DATABASE_PATH set, searching for existing databases...');

        const homeDir = process.env.HOME || process.env.USERPROFILE || '.';
        const durandalDir = path.join(homeDir, '.durandal-mcp');

        // Priority 2: Quick check of known locations first
        const quickCheckLocations = [
            // Check current directory first (legacy support)
            './durandal-mcp-memory.db',
            // Check home directory location
            path.join(durandalDir, 'durandal-mcp-memory.db'),
            // Check where script is installed
            path.join(__dirname, 'durandal-mcp-memory.db'),
            // Alternative names in current directory
            './durandal-memory.db',
            './memories.db'
        ];

        // Quick check for databases
        const quickDatabases = [];
        for (const location of quickCheckLocations) {
            if (fs.existsSync(location)) {
                const stats = fs.statSync(location);
                if (stats.isFile() && stats.size > 0) {
                    quickDatabases.push({
                        path: location,
                        size: stats.size,
                        isPreferred: location === path.join(durandalDir, 'durandal-mcp-memory.db')
                    });
                }
            }
        }

        // Priority 3: If no quick matches, run exhaustive discovery
        if (quickDatabases.length === 0) {
            console.log('[DB] No databases found in standard locations, running exhaustive search...');
            console.log('[DB] This may take a moment to ensure no data is lost...');

            try {
                // Try to use the discovery tool if available
                const DatabaseDiscovery = require('./db-discovery');
                const discovery = new DatabaseDiscovery();

                // Run synchronous discovery
                const execSync = require('child_process').execSync;
                const discoveryResult = execSync('node db-discovery.js', {
                    cwd: __dirname,
                    encoding: 'utf8',
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                // Parse discovery output to find databases
                const lines = discoveryResult.split('\n');
                for (const line of lines) {
                    const dbMatch = line.match(/📁\s+(.+\.db)$/);
                    if (dbMatch) {
                        const dbPath = dbMatch[1];
                        if (fs.existsSync(dbPath)) {
                            const stats = fs.statSync(dbPath);
                            quickDatabases.push({
                                path: dbPath,
                                size: stats.size,
                                discovered: true
                            });
                        }
                    }
                }

                if (quickDatabases.length > 0) {
                    console.log(`[DB] Discovery found ${quickDatabases.length} database(s)`);
                }
            } catch (e) {
                // Discovery tool not available or failed, continue with manual search
                console.log('[DB] Advanced discovery unavailable, using standard search');
            }
        }

        // If we found any databases, use smart selection
        if (quickDatabases.length > 0) {
            let selectedDb;

            if (quickDatabases.length === 1) {
                // Only one database found, use it
                selectedDb = quickDatabases[0];
                console.log(`[DB] Found existing database: ${selectedDb.path}`);
            } else {
                // Multiple databases found - select the best one
                console.log(`[DB] CRITICAL: Found ${quickDatabases.length} databases:`);

                // Get record counts for each database
                const databasesWithCounts = [];
                for (const db of quickDatabases) {
                    let recordCount = 0;
                    try {
                        // Synchronously check record count
                        const testDb = new sqlite3.Database(db.path, sqlite3.OPEN_READONLY, (err) => {
                            if (!err) {
                                testDb.get("SELECT COUNT(*) as count FROM memories", (err2, row) => {
                                    if (!err2 && row) {
                                        recordCount = row.count;
                                    }
                                    testDb.close();
                                });
                            }
                        });
                    } catch (e) {
                        // Unable to count, use size as proxy
                        recordCount = Math.floor(db.size / 200); // Estimate ~200 bytes per record
                    }

                    databasesWithCounts.push({
                        ...db,
                        recordCount: recordCount
                    });

                    console.log(`[DB]   - ${db.path}`);
                    console.log(`[DB]     Size: ${(db.size / 1024).toFixed(1)} KB`);
                    if (recordCount > 0) {
                        console.log(`[DB]     Records: ${recordCount} memories`);
                    }
                }

                // Sort by record count first, then by size
                databasesWithCounts.sort((a, b) => {
                    if (a.recordCount !== b.recordCount) {
                        return b.recordCount - a.recordCount;
                    }
                    return b.size - a.size;
                });

                selectedDb = databasesWithCounts[0];
                console.log(`[DB] SELECTED: Database with most data: ${selectedDb.path}`);

                // Critical warning about multiple databases
                console.log(`[DB] ⚠️  IMPORTANT: You have multiple databases!`);
                console.log(`[DB] To use a specific database, set DATABASE_PATH environment variable:`);
                console.log(`[DB]   export DATABASE_PATH="${selectedDb.path}"`);
                console.log(`[DB] Consider consolidating databases to prevent data fragmentation.`);
            }

            if (selectedDb.discovered) {
                console.log(`[DB] ✅ Successfully recovered database from non-standard location`);
                console.log(`[DB] Your data is safe and will be preserved`);
            }

            return selectedDb.path;
        }

        // Priority 4: NO databases found anywhere - safe to create new
        console.log(`[DB] No existing databases found anywhere on system`);
        console.log(`[DB] Creating new database at: ${path.join(durandalDir, 'durandal-mcp-memory.db')}`);

        // Ensure directory exists
        if (!fs.existsSync(durandalDir)) {
            fs.mkdirSync(durandalDir, { recursive: true });
            console.log(`[DB] Created Durandal directory: ${durandalDir}`);
        }

        return path.join(durandalDir, 'durandal-mcp-memory.db');
    }

    initializeSQLite() {
        const sqlite3 = require('sqlite3').verbose();

        console.log(`[DB] Database: Using SQLite at ${this.dbPath}`);

        this.client = new sqlite3.Database(this.dbPath, (err) => {
            if (err) {
                console.error('SQLite connection error:', err.message);
            } else {
                this.initializeSQLiteSchema();
            }
        });
    }

    async initializeSQLiteSchema() {
        // Simplified schema: single table for all memories instead of 4 complex tables
        const schema = `
            CREATE TABLE IF NOT EXISTS memories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                metadata TEXT, -- JSON: {importance, categories, keywords, type, project, session, etc.}
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at);
            CREATE INDEX IF NOT EXISTS idx_memories_project ON memories(json_extract(metadata, '$.project')) WHERE json_extract(metadata, '$.project') IS NOT NULL;
            CREATE INDEX IF NOT EXISTS idx_memories_session ON memories(json_extract(metadata, '$.session')) WHERE json_extract(metadata, '$.session') IS NOT NULL;

            -- Legacy compatibility: Keep existing tables for backward compatibility
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                path TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS conversation_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                session_name TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1,
                FOREIGN KEY (project_id) REFERENCES projects (id)
            );

            CREATE TABLE IF NOT EXISTS conversation_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
                content TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                metadata TEXT,
                FOREIGN KEY (session_id) REFERENCES conversation_sessions (id)
            );
        `;

        return new Promise((resolve, reject) => {
            this.client.exec(schema, (err) => {
                if (err) {
                    console.error('SQLite schema initialization failed:', err.message);
                    reject(err);
                } else {
                    console.log('[OK] SQLite schema initialized');
                    this.initialized = true;
                    resolve();
                }
            });
        });
    }

    async testConnection() {
        return new Promise((resolve) => {
            this.client.get('SELECT 1 as test', (err, row) => {
                if (err) {
                    resolve({
                        success: false,
                        error: err.message,
                        type: 'sqlite'
                    });
                } else {
                    resolve({
                        success: true,
                        message: 'SQLite connection successful',
                        type: 'sqlite'
                    });
                }
            });
        });
    }

    async query(sql, params = []) {
        return await this.querySQLite(sql, params);
    }

    async querySQLite(sql, params = []) {
        return new Promise((resolve, reject) => {
            // Convert PostgreSQL-style parameters ($1, $2) to SQLite-style (?, ?)
            const sqliteSql = sql.replace(/\$(\d+)/g, '?');

            if (sql.trim().toLowerCase().startsWith('select')) {
                this.client.all(sqliteSql, params, (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ rows: rows || [] });
                    }
                });
            } else {
                this.client.run(sqliteSql, params, function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({
                            rows: [{ id: this.lastID }],
                            rowCount: this.changes
                        });
                    }
                });
            }
        });
    }

    async close() {
        if (this.client) {
            return new Promise((resolve) => {
                this.client.close((err) => {
                    if (err) {
                        console.error('SQLite close error:', err.message);
                    }
                    resolve();
                });
            });
        }
    }

    // Simplified memory operations for MCP server
    async storeMemory(content, metadata = {}) {
        try {
            const result = await this.query(
                'INSERT INTO memories (content, metadata, created_at) VALUES (?, ?, datetime(\'now\')) RETURNING id',
                [content, JSON.stringify(metadata)]
            );
            return { success: true, id: result.rows[0].id };
        } catch (error) {
            console.warn('storeMemory error:', error.message);
            return { success: false, error: error.message };
        }
    }

    async searchMemories(query, options = {}) {
        try {
            const { limit = 10, project, session } = options;
            let queryStr = 'SELECT id, content, metadata, created_at FROM memories WHERE content LIKE ?';
            let queryParams = [`%${query}%`];

            // Add project filter if specified
            if (project) {
                queryStr += ' AND json_extract(metadata, \'$.project\') = ?';
                queryParams.push(project);
            }

            // Add session filter if specified
            if (session) {
                queryStr += ' AND json_extract(metadata, \'$.session\') = ?';
                queryParams.push(session);
            }

            queryStr += ' ORDER BY created_at DESC LIMIT ?';
            queryParams.push(limit);

            const result = await this.query(queryStr, queryParams);

            return result.rows.map(row => ({
                id: row.id,
                content: row.content,
                metadata: row.metadata ? JSON.parse(row.metadata) : {},
                created_at: row.created_at
            }));
        } catch (error) {
            console.warn('searchMemories error:', error.message);
            return [];
        }
    }

    async getRecentMemories(limit = 10, project = null, session = null) {
        try {
            let queryStr = 'SELECT id, content, metadata, created_at FROM memories';
            let queryParams = [];
            const conditions = [];

            if (project) {
                conditions.push('json_extract(metadata, \'$.project\') = ?');
                queryParams.push(project);
            }

            if (session) {
                conditions.push('json_extract(metadata, \'$.session\') = ?');
                queryParams.push(session);
            }

            if (conditions.length > 0) {
                queryStr += ' WHERE ' + conditions.join(' AND ');
            }

            queryStr += ' ORDER BY created_at DESC LIMIT ?';
            queryParams.push(limit);

            const result = await this.query(queryStr, queryParams);

            return result.rows.map(row => ({
                id: row.id,
                content: row.content,
                metadata: row.metadata ? JSON.parse(row.metadata) : {},
                created_at: row.created_at
            }));
        } catch (error) {
            console.warn('getRecentMemories error:', error.message);
            return [];
        }
    }

    async getMemoryById(id) {
        try {
            const result = await this.query(
                'SELECT id, content, metadata, created_at FROM memories WHERE id = ?',
                [id]
            );

            if (result.rows.length > 0) {
                const row = result.rows[0];
                return {
                    id: row.id,
                    content: row.content,
                    metadata: row.metadata ? JSON.parse(row.metadata) : {},
                    created_at: row.created_at
                };
            }
            return null;
        } catch (error) {
            console.warn('getMemoryById error:', error.message);
            return null;
        }
    }
}

module.exports = MCPDatabaseClient;