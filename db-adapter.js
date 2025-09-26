const MCPDatabaseClient = require('./mcp-db-client');

/**
 * Database Adapter - Clean implementation without duplication
 *
 * Provides a unified interface for database operations with caching
 * for the Durandal MCP server and memory system.
 */
class DatabaseAdapter {
    constructor() {
        this.db = new MCPDatabaseClient();
        this.projectCache = new Map();
        this.sessionCache = new Map();
    }

    /**
     * Test database connection
     */
    async testConnection() {
        return await this.db.testConnection();
    }

    /**
     * Get project by name with caching
     */
    async getProjectByName(projectName) {
        if (this.projectCache.has(projectName)) {
            return this.projectCache.get(projectName);
        }

        try {
            const result = await this.db.query(
                'SELECT * FROM projects WHERE name = $1 LIMIT 1',
                [projectName]
            );

            if (result.rows.length > 0) {
                const project = result.rows[0];
                this.projectCache.set(projectName, project);
                return project;
            }

            return null;
        } catch (error) {
            console.warn('getProjectByName error:', error.message);
            return null;
        }
    }

    /**
     * Create a new project
     */
    async createProject(projectName, projectRoot = process.cwd()) {
        try {
            const result = await this.db.query(
                'INSERT INTO projects (name, path, created_at) VALUES ($1, $2, NOW()) RETURNING *',
                [projectName, projectRoot]
            );

            const project = result.rows[0];
            this.projectCache.set(projectName, project);
            return project;
        } catch (error) {
            console.warn('createProject error:', error.message);
            // Return fallback object for resilience
            return { id: Math.floor(Date.now() / 1000), name: projectName, path: projectRoot };
        }
    }

    /**
     * Get session by name with caching
     */
    async getSessionByName(projectId, sessionName) {
        const cacheKey = `${projectId}:${sessionName}`;
        if (this.sessionCache.has(cacheKey)) {
            return this.sessionCache.get(cacheKey);
        }

        try {
            const result = await this.db.query(
                'SELECT * FROM conversation_sessions WHERE project_id = $1 AND session_name = $2 LIMIT 1',
                [projectId, sessionName]
            );

            if (result.rows.length > 0) {
                const session = result.rows[0];
                this.sessionCache.set(cacheKey, session);
                return session;
            }

            return null;
        } catch (error) {
            console.warn('getSessionByName error:', error.message);
            return null;
        }
    }

    /**
     * Create a new session
     */
    async createSession(projectId, sessionName) {
        try {
            const result = await this.db.query(
                'INSERT INTO conversation_sessions (project_id, session_name, created_at) VALUES ($1, $2, NOW()) RETURNING *',
                [projectId, sessionName]
            );

            const session = result.rows[0];
            const cacheKey = `${projectId}:${sessionName}`;
            this.sessionCache.set(cacheKey, session);
            return session;
        } catch (error) {
            console.warn('createSession error:', error.message);
            // Return fallback object for resilience
            return { id: Math.floor(Date.now() / 1000), project_id: projectId, session_name: sessionName };
        }
    }

    /**
     * Save a message (legacy method for backward compatibility)
     */
    async saveMessage(sessionId, role, content) {
        try {
            await this.db.query(
                'INSERT INTO conversation_messages (session_id, role, content, timestamp) VALUES ($1, $2, $3, NOW())',
                [sessionId, role, content]
            );
            return true;
        } catch (error) {
            console.warn('saveMessage error:', error.message);
            return false;
        }
    }

    /**
     * Store message with metadata (MCP server method)
     */
    async storeMessage(sessionId, role, content, metadata = {}) {
        try {
            const result = await this.db.query(
                'INSERT INTO conversation_messages (session_id, role, content, metadata, timestamp) VALUES ($1, $2, $3, $4, NOW()) RETURNING id',
                [sessionId, role, content, JSON.stringify(metadata)]
            );
            return { success: true, id: result.rows[0]?.id };
        } catch (error) {
            console.warn('storeMessage error:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get conversation history
     */
    async getConversationHistory(sessionId, limit = 6) {
        try {
            const result = await this.db.query(
                'SELECT role, content FROM conversation_messages WHERE session_id = $1 ORDER BY timestamp DESC LIMIT $2',
                [sessionId, limit]
            );

            return result.rows.reverse();
        } catch (error) {
            console.warn('getConversationHistory error:', error.message);
            return [];
        }
    }

    /**
     * Search knowledge artifacts
     */
    async searchArtifacts(query, limit = 5) {
        try {
            const result = await this.db.query(
                'SELECT name, content, metadata FROM knowledge_artifacts WHERE content ILIKE $1 OR name ILIKE $1 ORDER BY created_at DESC LIMIT $2',
                [`%${query}%`, limit]
            );

            return result.rows.map(row => ({
                summary: row.name,
                content: row.content,
                metadata: row.metadata
            }));
        } catch (error) {
            console.warn('searchArtifacts error:', error.message);
            return [];
        }
    }

    /**
     * Search messages with options
     */
    async searchMessages(query, options = {}) {
        try {
            const { project, limit = 10 } = options;
            let queryStr = 'SELECT id, content, metadata, timestamp FROM conversation_messages WHERE content ILIKE $1';
            let queryParams = [`%${query}%`];

            // TODO: Implement proper project filtering with joins
            // This would require joining conversation_messages -> conversation_sessions -> projects
            if (project) {
                console.debug('Project filtering not yet implemented in searchMessages');
            }

            queryStr += ' ORDER BY timestamp DESC LIMIT $2';
            queryParams.push(limit);

            const result = await this.db.query(queryStr, queryParams);

            return result.rows.map(row => ({
                id: row.id,
                content: row.content,
                metadata: row.metadata,
                created_at: row.timestamp
            }));
        } catch (error) {
            console.warn('searchMessages error:', error.message);
            return [];
        }
    }

    /**
     * Get recent messages
     */
    async getRecentMessages(project, session, limit = 10) {
        try {
            // TODO: Implement proper project/session filtering
            // For now, returns recent messages across all sessions
            const result = await this.db.query(
                'SELECT id, content, metadata, timestamp FROM conversation_messages ORDER BY timestamp DESC LIMIT $1',
                [limit]
            );

            return result.rows.map(row => ({
                id: row.id,
                content: row.content,
                metadata: row.metadata,
                created_at: row.timestamp
            }));
        } catch (error) {
            console.warn('getRecentMessages error:', error.message);
            return [];
        }
    }

    /**
     * Get message by ID
     */
    async getMessageById(id) {
        try {
            const result = await this.db.query(
                'SELECT id, content, metadata, timestamp FROM conversation_messages WHERE id = $1',
                [id]
            );

            if (result.rows.length > 0) {
                const row = result.rows[0];
                return {
                    id: row.id,
                    content: row.content,
                    metadata: row.metadata,
                    created_at: row.timestamp
                };
            }
            return null;
        } catch (error) {
            console.warn('getMessageById error:', error.message);
            return null;
        }
    }

    /**
     * Close database connection
     */
    async close() {
        if (this.db) {
            if (this.db.pool) {
                await this.db.pool.end();
            } else if (this.db.close) {
                await this.db.close();
            }
        }

        // Clear caches
        this.projectCache.clear();
        this.sessionCache.clear();
    }
}

module.exports = DatabaseAdapter;