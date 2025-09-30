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
     * Resolves the database path with smart detection:
     * 1. DATABASE_PATH environment variable (explicit override)
     * 2. Find database with most data (if multiple exist)
     * 3. Create new at ~/.durandal-mcp/durandal-mcp-memory.db
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

        const homeDir = process.env.HOME || process.env.USERPROFILE || '.';
        const durandalDir = path.join(homeDir, '.durandal-mcp');

        // Priority 2: Check for existing databases
        const possibleLocations = [
            // Legacy location in current directory (check FIRST for backwards compatibility)
            './durandal-mcp-memory.db',
            // New default location
            path.join(durandalDir, 'durandal-mcp-memory.db'),
            // Possible global npm location
            path.join(__dirname, 'durandal-mcp-memory.db'),
            // Alternative current directory names
            './durandal-memory.db',
            './memories.db'
        ];

        // Find all existing databases and their sizes
        const existingDatabases = [];
        for (const location of possibleLocations) {
            if (fs.existsSync(location)) {
                const stats = fs.statSync(location);
                if (stats.isFile() && stats.size > 0) {
                    existingDatabases.push({
                        path: location,
                        size: stats.size,
                        isPreferred: location === path.join(durandalDir, 'durandal-mcp-memory.db')
                    });
                }
            }
        }

        // If we found databases, use smart selection
        if (existingDatabases.length > 0) {
            let selectedDb;

            if (existingDatabases.length === 1) {
                // Only one database found, use it
                selectedDb = existingDatabases[0];
            } else {
                // Multiple databases found - warn user and select the best one
                console.log(`[DB] WARNING: Found ${existingDatabases.length} databases:`);
                existingDatabases.forEach(db => {
                    console.log(`[DB]   - ${db.path} (${(db.size / 1024).toFixed(1)} KB)`);
                });

                // Prefer the database with more data (larger size usually means more records)
                // But if sizes are similar (within 10%), prefer the new location
                existingDatabases.sort((a, b) => {
                    const sizeDiff = Math.abs(a.size - b.size) / Math.max(a.size, b.size);
                    if (sizeDiff < 0.1) {
                        // Sizes are similar, prefer new location
                        return b.isPreferred - a.isPreferred;
                    }
                    // Otherwise, prefer larger database
                    return b.size - a.size;
                });

                selectedDb = existingDatabases[0];
                console.log(`[DB] Selected database with most data: ${selectedDb.path}`);

                // Advise about consolidation
                if (existingDatabases.length > 1) {
                    console.log(`[DB] TIP: You have multiple databases. Consider consolidating to ${path.join(durandalDir, 'durandal-mcp-memory.db')}`);
                    console.log(`[DB] To merge databases, export from old and import to new, or set DATABASE_PATH to choose one.`);
                }
            }

            console.log(`[DB] Using database at: ${selectedDb.path}`);

            // If using legacy location, notify about migration
            if (!selectedDb.isPreferred) {
                console.log(`[DB] NOTE: Consider moving database to ${path.join(durandalDir, 'durandal-mcp-memory.db')} for consistency`);
            }

            return selectedDb.path;
        }

        // Priority 3: No existing database found, use new default location
        console.log(`[DB] No existing database found, creating new at: ${path.join(durandalDir, 'durandal-mcp-memory.db')}`);

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