// Environment already loaded by claude-client.js or other entry point

class ClaudeMemoryDB {
    constructor() {
        // PostgreSQL configuration
        const { Pool } = require('pg');
        this.pool = new Pool({
            user: process.env.DB_USER || 'claude_user',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'claude_memory',
            password: process.env.DB_PASSWORD || 'pog',
            port: process.env.DB_PORT || 5432,
            max: 20, // Maximum number of connections
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        console.log('📊 Database: Using PostgreSQL mode');
        
        // Initialize extraction tracking
        this.extractionStats = {
            sessionsAnalyzed: 0,
            knowledgeExtracted: 0,
            lastExtraction: null
        };
    }

    async testConnection() {
        if (this.isMemoryMode) {
            return { 
                success: true, 
                timestamp: new Date().toISOString(),
                mode: 'memory-only'
            };
        }
        
        try {
            const client = await this.pool.connect();
            const result = await client.query('SELECT NOW()');
            client.release();
            return { success: true, timestamp: result.rows[0].now };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Helper method to check if we should skip database operations
    isMemoryOnlyMode() {
        return this.isMemoryMode;
    }

    // Generic query method that handles both PostgreSQL and memory-only mode
    async query(queryText, params = []) {
        if (this.isMemoryMode) {
            // Memory-only mode - return empty results
            console.log('🗂️ Database query skipped (memory-only mode)');
            return { rows: [], rowCount: 0 };
        }
        
        return await this.pool.query(queryText, params);
    }

    // ===========================================
    // ENHANCED KNOWLEDGE EXTRACTION METHODS
    // ===========================================

    /**
     * Save automatically extracted knowledge artifact
     */
    async saveExtractedKnowledge(projectId, extractionResult, sourceContent, userInput = '', messageId = null) {
        if (this.isMemoryOnlyMode()) {
            return { id: 'memory_' + Date.now(), success: true, mode: 'memory-only' };
        }
        const query = `
            INSERT INTO knowledge_artifacts 
            (project_id, artifact_type, name, content, metadata, tags, relevance_score, 
             extraction_method, extraction_confidence, content_patterns, auto_generated, 
             source_message_id, extraction_timestamp)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id, uuid, created_at
        `;
        
        const content = {
            original_content: sourceContent,
            user_input: userInput,
            extraction_analysis: {
                score: extractionResult.score,
                patterns: extractionResult.patterns,
                categories: extractionResult.categories,
                extraction_type: extractionResult.extractionType
            },
            knowledge_summary: this.generateKnowledgeSummary(sourceContent, extractionResult)
        };

        const metadata = {
            auto_extracted: true,
            extraction_confidence: extractionResult.confidence,
            extraction_type: extractionResult.extractionType,
            pattern_matches: extractionResult.patterns.length,
            content_score: extractionResult.score,
            durandal_extracted: true
        };

        const tags = [...extractionResult.tags, 'auto_extracted', 'durandal'];

        const result = await this.pool.query(query, [
            projectId,
            extractionResult.extractionType,
            extractionResult.suggestedTitle,
            content,
            metadata,
            tags,
            Math.min(Math.max(extractionResult.score, 1), 10), // Clamp between 1-10
            'automatic',
            extractionResult.confidence,
            extractionResult.patterns.map(p => p.type),
            true,
            messageId,
            new Date()
        ]);

        // Update extraction stats
        this.extractionStats.knowledgeExtracted++;
        this.extractionStats.lastExtraction = new Date();

        return result.rows[0];
    }

    /**
     * Generate a concise summary of extracted knowledge
     */
    generateKnowledgeSummary(content, extractionResult) {
        // Create a brief summary focusing on key points
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
        
        // Take first few sentences up to reasonable length
        let summary = '';
        for (const sentence of sentences) {
            if (summary.length + sentence.length < 200) {
                summary += sentence.trim() + '. ';
            } else {
                break;
            }
        }

        return {
            brief_summary: summary.trim(),
            extraction_type: extractionResult.extractionType,
            key_categories: extractionResult.categories,
            confidence: extractionResult.confidence
        };
    }

    /**
     * Check for duplicate knowledge before saving
     */
    async checkForDuplicateKnowledge(projectId, content, title) {
        const query = `
            SELECT id, name, similarity(name, $1) as title_similarity,
                   content->'original_content' as stored_content
            FROM knowledge_artifacts 
            WHERE project_id = $2 
              AND auto_generated = true
              AND created_at > NOW() - INTERVAL '7 days'
              AND (similarity(name, $1) > 0.3 OR content->>'original_content' LIKE $3)
            ORDER BY title_similarity DESC
            LIMIT 3
        `;

        const contentPattern = `%${content.substring(0, 100)}%`;
        const result = await this.pool.query(query, [title, projectId, contentPattern]);
        
        return result.rows.map(row => ({
            id: row.id,
            name: row.name,
            similarity: row.title_similarity,
            isDuplicate: row.title_similarity > 0.7 || 
                        (row.stored_content && row.stored_content.includes(content.substring(0, 100)))
        }));
    }

    /**
     * Get recently extracted knowledge for review
     */
    async getRecentExtractions(projectId, limit = 10, sinceDays = 7) {
        const query = `
            SELECT id, name, artifact_type, tags, relevance_score, 
                   extraction_confidence, created_at, metadata
            FROM knowledge_artifacts 
            WHERE project_id = $1 
              AND auto_generated = true 
              AND created_at > NOW() - INTERVAL '${sinceDays} days'
            ORDER BY created_at DESC 
            LIMIT $2
        `;
        
        const result = await this.pool.query(query, [projectId, limit]);
        return result.rows;
    }

    /**
     * Search extracted knowledge by content or tags
     */
    async searchExtractedKnowledge(projectId, searchTerm, limit = 20) {
        const query = `
            SELECT id, name, artifact_type, tags, relevance_score, 
                   extraction_confidence, created_at,
                   ts_rank_cd(to_tsvector('english', name || ' ' || 
                              coalesce(content->>'knowledge_summary', '')), 
                              plainto_tsquery('english', $1)) as rank
            FROM knowledge_artifacts 
            WHERE project_id = $2 
              AND auto_generated = true
              AND (
                to_tsvector('english', name || ' ' || coalesce(content->>'knowledge_summary', '')) 
                @@ plainto_tsquery('english', $1)
                OR tags && ARRAY[$1]
                OR name ILIKE $3
              )
            ORDER BY rank DESC, relevance_score DESC, created_at DESC
            LIMIT $4
        `;
        
        const likePattern = `%${searchTerm}%`;
        const result = await this.pool.query(query, [searchTerm, projectId, likePattern, limit]);
        return result.rows;
    }

    /**
     * Get extraction statistics for project
     */
    async getExtractionStats(projectId) {
        const queries = [
            'SELECT COUNT(*) as total_extractions FROM knowledge_artifacts WHERE project_id = $1 AND auto_generated = true',
            'SELECT COUNT(*) as recent_extractions FROM knowledge_artifacts WHERE project_id = $1 AND auto_generated = true AND created_at > NOW() - INTERVAL \'7 days\'',
            'SELECT AVG(extraction_confidence) as avg_confidence FROM knowledge_artifacts WHERE project_id = $1 AND auto_generated = true',
            'SELECT artifact_type, COUNT(*) as count FROM knowledge_artifacts WHERE project_id = $1 AND auto_generated = true GROUP BY artifact_type',
            'SELECT COUNT(DISTINCT tags) as unique_tags FROM (SELECT unnest(tags) as tags FROM knowledge_artifacts WHERE project_id = $1 AND auto_generated = true) t'
        ];

        const results = await Promise.all(
            queries.map(query => this.pool.query(query, [projectId]))
        );

        return {
            total_extractions: parseInt(results[0].rows[0].total_extractions),
            recent_extractions: parseInt(results[1].rows[0].recent_extractions), 
            avg_confidence: parseFloat(results[2].rows[0].avg_confidence || 0).toFixed(2),
            extraction_types: results[3].rows,
            unique_tags: parseInt(results[4].rows[0].unique_tags),
            session_stats: this.extractionStats
        };
    }

    /**
     * Update extraction settings and preferences
     */
    async saveExtractionSettings(projectId, settings) {
        const query = `
            INSERT INTO knowledge_artifacts 
            (project_id, artifact_type, name, content, metadata, tags, relevance_score)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (project_id, name) 
            DO UPDATE SET content = $4, metadata = $5, updated_at = CURRENT_TIMESTAMP
            RETURNING id
        `;

        const result = await this.pool.query(query, [
            projectId,
            'system_config',
            'Durandal Extraction Settings',
            settings,
            { config_type: 'extraction_settings', auto_generated: false },
            ['config', 'extraction', 'durandal'],
            10
        ]);

        return result.rows[0];
    }

    /**
     * Get project extraction settings
     */
    async getExtractionSettings(projectId) {
        const query = `
            SELECT content 
            FROM knowledge_artifacts 
            WHERE project_id = $1 
              AND artifact_type = 'system_config' 
              AND name = 'Durandal Extraction Settings'
        `;

        const result = await this.pool.query(query, [projectId]);
        
        if (result.rows.length > 0) {
            return result.rows[0].content;
        }

        // Return default settings
        return {
            enabled: true,
            minScore: 5,
            notifications: 'silent',
            categories: ['all']
        };
    }

    // ===========================================
    // EXISTING METHODS (unchanged from original)
    // ===========================================

    async createProject(name, description = '', metadata = {}) {
        if (this.isMemoryOnlyMode()) {
            return { 
                id: 1, 
                uuid: 'memory-project', 
                name, 
                created_at: new Date().toISOString(),
                mode: 'memory-only'
            };
        }
        
        const query = `
            INSERT INTO projects (name, description, metadata)
            VALUES ($1, $2, $3)
            RETURNING id, uuid, name, created_at
        `;
        const result = await this.pool.query(query, [name, description, metadata]);
        return result.rows[0];
    }

    async getProject(name) {
        if (this.isMemoryOnlyMode()) {
            return { 
                id: 1, 
                uuid: 'memory-project', 
                name, 
                created_at: new Date().toISOString(),
                mode: 'memory-only'
            };
        }
        
        const query = 'SELECT * FROM projects WHERE name = $1';
        const result = await this.pool.query(query, [name]);
        return result.rows[0];
    }

    async startConversationSession(projectId, sessionName = null) {
        const query = `
            INSERT INTO conversation_sessions (project_id, session_name, started_at)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            RETURNING id, uuid, started_at
        `;
        const result = await this.pool.query(query, [projectId, sessionName]);
        
        // Update session tracking
        this.extractionStats.sessionsAnalyzed++;
        
        return result.rows[0];
    }

    async endConversationSession(sessionId, contextDump, summary = '', tokensUsed = 0) {
        const query = `
            UPDATE conversation_sessions 
            SET ended_at = CURRENT_TIMESTAMP, 
                context_dump = $2, 
                summary = $3, 
                tokens_used = $4
            WHERE id = $1
            RETURNING id, ended_at
        `;
        const result = await this.pool.query(query, [sessionId, contextDump, summary, tokensUsed]);
        return result.rows[0];
    }

    async saveKnowledgeArtifact(projectId, type, name, content, metadata = {}, tags = [], relevanceScore = 5) {
        const query = `
            INSERT INTO knowledge_artifacts 
            (project_id, artifact_type, name, content, metadata, tags, relevance_score)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, uuid, created_at
        `;
        const result = await this.pool.query(query, [
            projectId, type, name, content, metadata, tags, relevanceScore
        ]);
        return result.rows[0];
    }

    async getKnowledgeArtifacts(projectId, type = null, limit = 100) {
        let query = `
            SELECT * FROM knowledge_artifacts 
            WHERE project_id = $1
        `;
        const params = [projectId];
        
        if (type) {
            query += ' AND artifact_type = $2';
            params.push(type);
        }
        
        query += ' ORDER BY relevance_score DESC, updated_at DESC LIMIT $' + (params.length + 1);
        params.push(limit);
        
        const result = await this.pool.query(query, params);
        return result.rows;
    }

    async saveProjectState(projectId, stateName, fullState, fileStructure = null, systemInfo = null, isCurrent = false) {
        if (isCurrent) {
            await this.pool.query(
                'UPDATE project_states SET is_current = FALSE WHERE project_id = $1',
                [projectId]
            );
        }

        const query = `
            INSERT INTO project_states 
            (project_id, state_name, full_state, file_structure, system_info, is_current)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, uuid, created_at
        `;
        const result = await this.pool.query(query, [
            projectId, stateName, fullState, fileStructure, systemInfo, isCurrent
        ]);
        return result.rows[0];
    }

    async getCurrentProjectState(projectId) {
        const query = `
            SELECT * FROM project_states 
            WHERE project_id = $1 AND is_current = TRUE
            ORDER BY created_at DESC LIMIT 1
        `;
        const result = await this.pool.query(query, [projectId]);
        return result.rows[0];
    }

    async searchKnowledgeByTags(projectId, tags) {
        const query = `
            SELECT * FROM knowledge_artifacts 
            WHERE project_id = $1 AND tags && $2
            ORDER BY relevance_score DESC, updated_at DESC
        `;
        const result = await this.pool.query(query, [projectId, tags]);
        return result.rows;
    }

    async getConversationHistory(projectId, limit = 10) {
        const query = `
            SELECT * FROM conversation_sessions 
            WHERE project_id = $1 
            ORDER BY started_at DESC 
            LIMIT $2
        `;
        const result = await this.pool.query(query, [projectId, limit]);
        return result.rows;
    }

    async getProjectSummary(projectId) {
        const queries = [
            'SELECT COUNT(*) as conversation_count FROM conversation_sessions WHERE project_id = $1',
            'SELECT COUNT(*) as artifact_count FROM knowledge_artifacts WHERE project_id = $1',
            'SELECT COUNT(*) as state_count FROM project_states WHERE project_id = $1',
            'SELECT COUNT(*) as auto_extracted_count FROM knowledge_artifacts WHERE project_id = $1 AND auto_generated = true'
        ];

        const results = await Promise.all(
            queries.map(query => this.pool.query(query, [projectId]))
        );

        return {
            conversations: parseInt(results[0].rows[0].conversation_count),
            artifacts: parseInt(results[1].rows[0].artifact_count),
            states: parseInt(results[2].rows[0].state_count),
            auto_extracted: parseInt(results[3].rows[0].auto_extracted_count)
        };
    }

    async close() {
        if (!this.isMemoryOnlyMode() && this.pool) {
            await this.pool.end();
        }
    }
}

module.exports = ClaudeMemoryDB;
