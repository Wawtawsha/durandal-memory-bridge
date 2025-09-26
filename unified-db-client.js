class UnifiedDatabaseClient {
    constructor() {
        this.dbType = process.env.DATABASE_TYPE || 'sqlite';
        this.client = null;
        this.initialized = false;

        this.extractionStats = {
            sessionsAnalyzed: 0,
            knowledgeExtracted: 0,
            lastExtraction: null
        };

        this.initializeClient();
    }

    initializeClient() {
        if (this.dbType === 'sqlite') {
            console.log('📊 Database: Using SQLite mode');
            this.initializeSQLite();
        } else if (this.dbType === 'postgresql') {
            console.log('📊 Database: Using PostgreSQL mode');
            this.initializePostgreSQL();
        } else {
            throw new Error(`Unsupported database type: ${this.dbType}`);
        }
    }

    initializeSQLite() {
        const sqlite3 = require('sqlite3').verbose();
        const path = require('path');

        const dbPath = process.env.DATABASE_PATH || './durandal-memory.db';
        this.client = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('SQLite connection error:', err.message);
            } else {
                this.initializeSQLiteSchema();
            }
        });
    }

    initializePostgreSQL() {
        const { Pool } = require('pg');
        this.client = new Pool({
            user: process.env.DB_USER || 'claude_user',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'claude_memory',
            password: process.env.DB_PASSWORD || 'durandal_default_pass',
            port: process.env.DB_PORT || 5432,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
    }

    async initializeSQLiteSchema() {
        const schema = `
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

            CREATE TABLE IF NOT EXISTS extracted_artifacts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                artifact_type TEXT NOT NULL,
                title TEXT,
                content TEXT NOT NULL,
                metadata TEXT,
                importance_score REAL DEFAULT 0.0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES conversation_sessions (id)
            );

            CREATE INDEX IF NOT EXISTS idx_conversation_messages_session_id ON conversation_messages(session_id);
            CREATE INDEX IF NOT EXISTS idx_conversation_messages_timestamp ON conversation_messages(timestamp);
            CREATE INDEX IF NOT EXISTS idx_extracted_artifacts_session_id ON extracted_artifacts(session_id);
            CREATE INDEX IF NOT EXISTS idx_extracted_artifacts_importance ON extracted_artifacts(importance_score);
        `;

        return new Promise((resolve, reject) => {
            this.client.exec(schema, (err) => {
                if (err) {
                    console.error('SQLite schema initialization failed:', err.message);
                    reject(err);
                } else {
                    console.log('✅ SQLite schema initialized');
                    this.initialized = true;
                    resolve();
                }
            });
        });
    }

    async testConnection() {
        try {
            if (this.dbType === 'sqlite') {
                return await this.testSQLiteConnection();
            } else if (this.dbType === 'postgresql') {
                return await this.testPostgreSQLConnection();
            }
        } catch (error) {
            return {
                success: false,
                error: error.message,
                type: this.dbType
            };
        }
    }

    async testSQLiteConnection() {
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

    async testPostgreSQLConnection() {
        try {
            const result = await this.client.query('SELECT 1 as test');
            return {
                success: true,
                message: 'PostgreSQL connection successful',
                type: 'postgresql'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                type: 'postgresql'
            };
        }
    }

    async query(sql, params = []) {
        if (this.dbType === 'sqlite') {
            return await this.querySQLite(sql, params);
        } else if (this.dbType === 'postgresql') {
            return await this.queryPostgreSQL(sql, params);
        }
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

    async queryPostgreSQL(sql, params = []) {
        return await this.client.query(sql, params);
    }

    // Legacy method compatibility
    async ensureConnection() {
        return await this.testConnection();
    }

    async close() {
        if (this.dbType === 'sqlite' && this.client) {
            return new Promise((resolve) => {
                this.client.close((err) => {
                    if (err) {
                        console.error('SQLite close error:', err.message);
                    }
                    resolve();
                });
            });
        } else if (this.dbType === 'postgresql' && this.client) {
            await this.client.end();
        }
    }

    // Enhanced method for project management
    async getProjectByName(projectName) {
        try {
            const result = await this.query(
                'SELECT * FROM projects WHERE name = $1 LIMIT 1',
                [projectName]
            );
            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            console.warn('getProjectByName error:', error.message);
            return null;
        }
    }

    async createProject(projectName, projectPath = process.cwd()) {
        try {
            const result = await this.query(
                'INSERT INTO projects (name, path, created_at) VALUES ($1, $2, datetime(\'now\')) RETURNING *',
                [projectName, projectPath]
            );
            return result.rows[0];
        } catch (error) {
            console.warn('createProject error:', error.message);
            // Return a fallback project
            return {
                id: Math.floor(Date.now() / 1000),
                name: projectName,
                path: projectPath
            };
        }
    }

    async createSession(projectId, sessionName = null) {
        try {
            const result = await this.query(
                'INSERT INTO conversation_sessions (project_id, session_name, created_at, last_message_at) VALUES ($1, $2, datetime(\'now\'), datetime(\'now\')) RETURNING *',
                [projectId, sessionName]
            );
            return result.rows[0];
        } catch (error) {
            console.warn('createSession error:', error.message);
            return {
                id: Math.floor(Date.now() / 1000),
                project_id: projectId,
                session_name: sessionName
            };
        }
    }

    async saveMessage(sessionId, role, content, metadata = {}) {
        try {
            const result = await this.query(
                'INSERT INTO conversation_messages (session_id, role, content, metadata, timestamp) VALUES ($1, $2, $3, $4, datetime(\'now\')) RETURNING *',
                [sessionId, role, content, JSON.stringify(metadata)]
            );
            return result.rows[0];
        } catch (error) {
            console.warn('saveMessage error:', error.message);
            return null;
        }
    }
}

module.exports = UnifiedDatabaseClient;