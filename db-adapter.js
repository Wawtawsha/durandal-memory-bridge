const ClaudeMemoryDB = require('./db-client');

class DatabaseAdapter {
    constructor() {
        this.db = new ClaudeMemoryDB();
        this.projectCache = new Map();
        this.sessionCache = new Map();
    }

    async testConnection() {
        return await this.db.testConnection();
    }

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
            return { id: Math.floor(Date.now() / 1000), name: projectName, path: projectRoot };
        }
    }

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
            return { id: Math.floor(Date.now() / 1000), project_id: projectId, session_name: sessionName };
        }
    }

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

    async close() {
        if (this.db && this.db.pool) {
            await this.db.pool.end();
        }
    }

    // Additional methods required by universal memory system
    async testConnection() {
        return await this.db.testConnection();
    }

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
            return { id: Math.floor(Date.now() / 1000), name: projectName, path: projectRoot };
        }
    }

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
            return { id: Math.floor(Date.now() / 1000), project_id: projectId, session_name: sessionName };
        }
    }

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
}

module.exports = DatabaseAdapter;