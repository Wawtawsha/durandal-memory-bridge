// RAMR (Rapid Access Memory Register) - Intelligent Context Caching System
// Integrates with Durandal's existing knowledge extraction and database systems

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

class RAMR {
    constructor(dbPath = './ramr.db', knowledgeAnalyzer = null) {
        this.dbPath = dbPath;
        this.db = null;
        this.memoryLayer = new Map(); // Tier 1: Hot cache in RAM
        this.knowledgeAnalyzer = knowledgeAnalyzer; // Integration with existing system
        this.usageStats = new Map(); // Track access patterns
        this.lastMaintenance = Date.now();
        this.maintenanceInterval = 30 * 60 * 1000; // 30 minutes
        
        // Configuration
        this.config = {
            memoryLayerMaxSize: 1000,
            sqliteMaxEntries: 100000,
            defaultTTL: 2 * 60 * 60 * 1000, // 2 hours
            maintenanceThreshold: 0.8 // Run maintenance when 80% full
        };
    }

    async initialize() {
        try {
            // Initialize SQLite database for persistent caching
            this.db = await open({
                filename: this.dbPath,
                driver: sqlite3.Database
            });

            // Create RAMR schema optimized for context caching
            await this.db.exec(`
                CREATE TABLE IF NOT EXISTS ramr_cache (
                    key TEXT PRIMARY KEY,
                    data TEXT NOT NULL,
                    metadata TEXT,
                    created_at INTEGER NOT NULL,
                    last_accessed INTEGER NOT NULL,
                    access_count INTEGER DEFAULT 1,
                    priority_score REAL DEFAULT 5.0,
                    tags TEXT, -- JSON array of tags
                    content_hash TEXT,
                    expires_at INTEGER,
                    cache_type TEXT DEFAULT 'general'
                );

                CREATE INDEX IF NOT EXISTS idx_ramr_last_accessed ON ramr_cache(last_accessed);
                CREATE INDEX IF NOT EXISTS idx_ramr_priority ON ramr_cache(priority_score);
                CREATE INDEX IF NOT EXISTS idx_ramr_expires ON ramr_cache(expires_at);
                CREATE INDEX IF NOT EXISTS idx_ramr_tags ON ramr_cache(tags);
                CREATE INDEX IF NOT EXISTS idx_ramr_type ON ramr_cache(cache_type);

                -- Skip FTS for now to avoid syntax issues
                -- CREATE VIRTUAL TABLE IF NOT EXISTS ramr_search USING fts5(
                --     key, 
                --     content, 
                --     tags,
                --     content='ramr_cache'
                -- );

                -- Statistics table for intelligent management
                CREATE TABLE IF NOT EXISTS ramr_stats (
                    stat_key TEXT PRIMARY KEY,
                    stat_value TEXT,
                    updated_at INTEGER
                );
            `);

            console.log('✅ RAMR initialized successfully');
            
            // Schedule periodic maintenance
            this.scheduleIntelligentMaintenance();
            
        } catch (error) {
            throw new Error(`RAMR initialization failed: ${error.message}`);
        }
    }

    // Tier 1: Memory layer access (microsecond speed)
    getFromMemory(key) {
        const item = this.memoryLayer.get(key);
        if (item && Date.now() < item.expires_at) {
            this.updateAccessStats(key, 'memory_hit');
            return item.data;
        } else if (item) {
            this.memoryLayer.delete(key); // Remove expired
        }
        return null;
    }

    // Tier 2: SQLite persistent cache (millisecond speed)
    async getFromRAMR(key) {
        try {
            const row = await this.db.get(`
                SELECT data, metadata, expires_at, access_count, priority_score
                FROM ramr_cache 
                WHERE key = ? AND (expires_at IS NULL OR expires_at > ?)
            `, [key, Date.now()]);

            if (row) {
                // Update access statistics
                await this.db.run(`
                    UPDATE ramr_cache 
                    SET last_accessed = ?, access_count = access_count + 1
                    WHERE key = ?
                `, [Date.now(), key]);

                // Promote to memory layer if high value
                if (row.priority_score > 7.0) {
                    this.promoteToMemory(key, JSON.parse(row.data), row.expires_at);
                }

                this.updateAccessStats(key, 'ramr_hit');
                return JSON.parse(row.data);
            }
        } catch (error) {
            console.error(`RAMR get error for key ${key}:`, error.message);
        }
        
        this.updateAccessStats(key, 'miss');
        return null;
    }

    // Main get method with tier fallthrough
    async get(key) {
        // Try memory first
        const memoryResult = this.getFromMemory(key);
        if (memoryResult !== null) {
            return memoryResult;
        }

        // Try RAMR SQLite
        const ramrResult = await this.getFromRAMR(key);
        if (ramrResult !== null) {
            return ramrResult;
        }

        return null; // Cache miss - will need to fetch from main database
    }

    // Simple set method for compatibility with universal memory system
    async set(key, data, options = {}) {
        const contextMetadata = {
            type: options.type || 'general',
            ttl: options.ttl,
            force_cache: true,
            ...options
        };

        return await this.intelligentStore(key, data, contextMetadata);
    }

    // Intelligent storage with AI-driven decisions
    async intelligentStore(key, data, contextMetadata = {}) {
        try {
            // Use knowledge analyzer to determine cache worthiness
            const cacheAnalysis = await this.analyzeCacheWorthiness(data, contextMetadata);
            
            if (!cacheAnalysis.shouldCache) {
                console.log(`🤔 RAMR: Skipping cache for ${key} - not valuable enough`);
                return false;
            }

            const cacheEntry = {
                key,
                data: JSON.stringify(data),
                metadata: JSON.stringify({
                    ...contextMetadata,
                    analysis: cacheAnalysis
                }),
                created_at: Date.now(),
                last_accessed: Date.now(),
                priority_score: cacheAnalysis.priority,
                tags: JSON.stringify(cacheAnalysis.tags || []),
                content_hash: this.generateContentHash(data),
                expires_at: cacheAnalysis.expiration || (Date.now() + this.config.defaultTTL),
                cache_type: cacheAnalysis.type || 'general'
            };

            // Store in SQLite
            await this.db.run(`
                INSERT OR REPLACE INTO ramr_cache 
                (key, data, metadata, created_at, last_accessed, priority_score, tags, content_hash, expires_at, cache_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                cacheEntry.key, cacheEntry.data, cacheEntry.metadata,
                cacheEntry.created_at, cacheEntry.last_accessed, cacheEntry.priority_score,
                cacheEntry.tags, cacheEntry.content_hash, cacheEntry.expires_at, cacheEntry.cache_type
            ]);

            // Skip FTS for now to avoid syntax errors - we'll implement simple search
            // await this.db.run(`
            //     INSERT OR REPLACE INTO ramr_search (key, content, tags)
            //     VALUES (?, ?, ?)
            // `, [key, JSON.stringify(data), cacheEntry.tags]);

            // Store in memory if high priority
            if (cacheAnalysis.priority > 7.0) {
                this.promoteToMemory(key, data, cacheEntry.expires_at);
            }

            console.log(`✅ RAMR: Cached ${key} with priority ${cacheAnalysis.priority}`);
            return true;

        } catch (error) {
            console.error(`RAMR store error for key ${key}:`, error.message);
            return false;
        }
    }

    // AI-driven cache worthiness analysis
    async analyzeCacheWorthiness(data, contextMetadata) {
        // Always cache during testing or if explicitly requested
        if (contextMetadata.type === 'test' || contextMetadata.force_cache) {
            return {
                shouldCache: true,
                priority: 7.0,
                tags: ['test'],
                expiration: Date.now() + this.config.defaultTTL,
                type: 'test'
            };
        }

        if (!this.knowledgeAnalyzer) {
            // Enhanced fallback analysis
            const dataStr = JSON.stringify(data);
            const hasCode = /```|function|class|const|let|var/.test(dataStr);
            const hasConfig = /config|setting|setup|install/.test(dataStr);
            const hasError = /error|fail|problem|fix/.test(dataStr);
            const isLong = dataStr.length > 100;
            
            let priority = 5.0;
            if (hasCode) priority += 1.5;
            if (hasConfig) priority += 1.0;
            if (hasError) priority += 0.5;
            if (isLong) priority += 0.5;
            
            return {
                shouldCache: priority > 4.0 || contextMetadata.type === 'context',
                priority: Math.min(priority, 10),
                tags: [hasCode ? 'code' : '', hasConfig ? 'config' : '', hasError ? 'error' : ''].filter(Boolean),
                expiration: Date.now() + this.config.defaultTTL,
                type: contextMetadata.type || 'general'
            };
        }

        try {
            // Use existing knowledge extraction patterns
            const analysis = await this.knowledgeAnalyzer.analyzeContent(JSON.stringify(data));
            
            const priority = analysis.relevance_score || 5.0;
            
            return {
                shouldCache: priority > 3.0 || analysis.patterns?.length > 0,
                priority: Math.min(priority, 10),
                tags: analysis.tags || [],
                expiration: this.calculateExpiration(analysis.category, priority),
                type: analysis.category || contextMetadata.type || 'general',
                confidence: analysis.confidence || 0.5
            };
        } catch (error) {
            console.error('RAMR: Analysis error, using enhanced fallback:', error.message);
            return {
                shouldCache: true,
                priority: 6.0,
                tags: ['fallback'],
                expiration: Date.now() + this.config.defaultTTL,
                type: contextMetadata.type || 'general'
            };
        }
    }

    // Context-aware retrieval for intelligent context building
    async getRelevantContext(userInput, limit = 5) {
        try {
            // Simple search without full-text search for now
            const tagResults = await this.db.all(`
                SELECT key, data, metadata, priority_score, tags
                FROM ramr_cache 
                WHERE cache_type IN ('context', 'knowledge', 'conversation_summary', 'test')
                AND (expires_at IS NULL OR expires_at > ?)
                ORDER BY priority_score DESC, last_accessed DESC
                LIMIT ?
            `, [Date.now(), limit]);

            // Try keyword matching if we have input
            let keywordResults = [];
            if (userInput && userInput.trim().length > 0) {
                const keywords = userInput.toLowerCase().split(/\s+/).slice(0, 3); // First 3 words
                if (keywords.length > 0) {
                    const keywordPattern = keywords.join('|');
                    keywordResults = await this.db.all(`
                        SELECT key, data, metadata, priority_score, tags
                        FROM ramr_cache 
                        WHERE (LOWER(data) LIKE ? OR LOWER(tags) LIKE ?)
                        AND (expires_at IS NULL OR expires_at > ?)
                        ORDER BY priority_score DESC, last_accessed DESC
                        LIMIT ?
                    `, [`%${keywords[0]}%`, `%${keywords[0]}%`, Date.now(), limit]);
                }
            }

            // Combine and deduplicate results
            const combinedResults = this.mergeSearchResults(keywordResults, tagResults);
            
            return {
                contexts: combinedResults.map(row => ({
                    key: row.key,
                    data: JSON.parse(row.data),
                    metadata: JSON.parse(row.metadata || '{}'),
                    relevance: row.priority_score,
                    tags: JSON.parse(row.tags || '[]')
                })),
                completeness: Math.min(combinedResults.length / limit, 1.0)
            };
        } catch (error) {
            console.error('RAMR: Context retrieval error:', error.message);
            return { contexts: [], completeness: 0 };
        }
    }

    // Merge search results and deduplicate
    mergeSearchResults(searchResults, tagResults) {
        const seen = new Set();
        const combined = [];
        
        // Add search results first (higher priority)
        for (const result of searchResults) {
            if (!seen.has(result.key)) {
                seen.add(result.key);
                combined.push(result);
            }
        }
        
        // Add tag results if not already included
        for (const result of tagResults) {
            if (!seen.has(result.key)) {
                seen.add(result.key);
                combined.push(result);
            }
        }
        
        return combined;
    }

    // Intelligent maintenance based on AI analysis
    async performIntelligentMaintenance() {
        try {
            console.log('🔧 RAMR: Starting intelligent maintenance...');

            // Get cache statistics
            const stats = await this.getCacheStatistics();
            
            // Basic maintenance operations
            await this.performBasicMaintenance(stats);

            // Update maintenance timestamp
            this.lastMaintenance = Date.now();
            await this.updateStats('last_maintenance', Date.now());

            console.log('✅ RAMR: Maintenance completed');
        } catch (error) {
            console.error('RAMR: Maintenance error:', error.message);
        }
    }

    // Basic maintenance operations
    async performBasicMaintenance(stats) {
        // Remove expired entries
        await this.db.run(`
            DELETE FROM ramr_cache 
            WHERE expires_at IS NOT NULL AND expires_at <= ?
        `, [Date.now()]);

        // Clean up memory layer
        for (const [key, item] of this.memoryLayer.entries()) {
            if (Date.now() >= item.expires_at) {
                this.memoryLayer.delete(key);
            }
        }

        // If we're over capacity, remove low-priority items
        if (stats.utilization > this.config.maintenanceThreshold) {
            await this.db.run(`
                DELETE FROM ramr_cache 
                WHERE key IN (
                    SELECT key FROM ramr_cache 
                    ORDER BY priority_score ASC, last_accessed ASC 
                    LIMIT ?
                )
            `, [Math.floor(stats.total_entries * 0.1)]); // Remove 10% of lowest priority
        }
    }

    // Get comprehensive cache statistics
    async getCacheStatistics() {
        const stats = await this.db.get(`
            SELECT 
                COUNT(*) as total_entries,
                AVG(priority_score) as avg_priority,
                AVG(access_count) as avg_access_count,
                COUNT(CASE WHEN expires_at > ? THEN 1 END) as valid_entries,
                COUNT(CASE WHEN expires_at <= ? THEN 1 END) as expired_entries,
                MAX(last_accessed) as most_recent_access,
                MIN(last_accessed) as oldest_access
            FROM ramr_cache
        `, [Date.now(), Date.now()]);

        return {
            ...stats,
            memory_usage: this.memoryLayer.size,
            utilization: stats.total_entries / this.config.sqliteMaxEntries,
            access_patterns: this.getAccessPatterns()
        };
    }

    // Helper methods
    promoteToMemory(key, data, expiresAt) {
        if (this.memoryLayer.size >= this.config.memoryLayerMaxSize) {
            this.evictLeastUsedFromMemory();
        }
        
        this.memoryLayer.set(key, {
            data,
            expires_at: expiresAt,
            promoted_at: Date.now()
        });
    }

    evictLeastUsedFromMemory() {
        let oldestKey = null;
        let oldestTime = Date.now();
        
        for (const [key, item] of this.memoryLayer.entries()) {
            if (item.promoted_at < oldestTime) {
                oldestTime = item.promoted_at;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.memoryLayer.delete(oldestKey);
        }
    }

    updateAccessStats(key, type) {
        const current = this.usageStats.get(key) || { hits: 0, misses: 0, memory_hits: 0, ramr_hits: 0 };
        current[type] = (current[type] || 0) + 1;
        this.usageStats.set(key, current);
    }

    getAccessPatterns() {
        const patterns = {};
        for (const [key, stats] of this.usageStats.entries()) {
            patterns[key] = {
                total_accesses: stats.memory_hits + stats.ramr_hits,
                hit_rate: (stats.memory_hits + stats.ramr_hits) / (stats.memory_hits + stats.ramr_hits + stats.misses + 1),
                memory_preference: stats.memory_hits / (stats.memory_hits + stats.ramr_hits + 1)
            };
        }
        return patterns;
    }

    generateContentHash(data) {
        // Simple hash for content deduplication
        return require('crypto')
            .createHash('md5')
            .update(JSON.stringify(data))
            .digest('hex');
    }

    calculateExpiration(category, priority) {
        const baseTTL = this.config.defaultTTL;
        const multiplier = Math.max(priority / 5.0, 0.5); // Higher priority = longer TTL
        
        const categoryMultipliers = {
            'solution': 2.0,
            'configuration': 1.5,
            'knowledge': 2.5,
            'conversation_summary': 1.0,
            'temporary': 0.25
        };
        
        const categoryMultiplier = categoryMultipliers[category] || 1.0;
        return Date.now() + (baseTTL * multiplier * categoryMultiplier);
    }

    async updateStats(key, value) {
        await this.db.run(`
            INSERT OR REPLACE INTO ramr_stats (stat_key, stat_value, updated_at)
            VALUES (?, ?, ?)
        `, [key, JSON.stringify(value), Date.now()]);
    }

    scheduleIntelligentMaintenance() {
        setInterval(async () => {
            const timeSinceLast = Date.now() - this.lastMaintenance;
            if (timeSinceLast > this.maintenanceInterval) {
                await this.performIntelligentMaintenance();
            }
        }, this.maintenanceInterval / 4); // Check every 7.5 minutes
    }

    // Cleanup and shutdown
    async close() {
        if (this.db) {
            await this.db.close();
        }
        this.memoryLayer.clear();
        this.usageStats.clear();
    }

    // Debug and monitoring methods
    async getDebugInfo() {
        const stats = await this.getCacheStatistics();
        return {
            cache_stats: stats,
            memory_layer_size: this.memoryLayer.size,
            usage_patterns: Object.fromEntries(this.usageStats),
            config: this.config
        };
    }

    // File-specific wrapper methods for compatibility with other systems
    async getFileContent(filePath, returnFullObject = false) {
        try {
            const result = await this.get(filePath);
            if (!result) return null;
            
            if (returnFullObject) {
                return result;
            }
            
            // Return just the content for compatibility
            return result.content || result.data || result;
        } catch (error) {
            console.error(`RAMR getFileContent error for ${filePath}:`, error.message);
            return null;
        }
    }

    async storeFileContent(filePath, content, metadata = {}) {
        try {
            // Create comprehensive metadata for file storage
            const fileMetadata = {
                type: 'file_content',
                filePath,
                size: content ? content.length : 0,
                cached_at: Date.now(),
                ...metadata
            };
            
            // Store using intelligent storage with file-specific context
            return await this.intelligentStore(filePath, content, fileMetadata);
        } catch (error) {
            console.error(`RAMR storeFileContent error for ${filePath}:`, error.message);
            return null;
        }
    }
}

module.exports = RAMR;
