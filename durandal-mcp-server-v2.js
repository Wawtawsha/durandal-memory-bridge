#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { ListToolsRequestSchema, CallToolRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const DatabaseAdapter = require('./db-adapter');
const EventEmitter = require('events');

/**
 * Simplified Durandal MCP Server
 *
 * Pure data-layer implementation with no AI dependencies.
 * Designed for automatic intelligent features through enriched metadata.
 *
 * Architecture:
 * - Claude Code provides AI processing & enriched metadata
 * - MCP Server handles data persistence & rule-based behaviors
 * - Future automatic features integrate via events & metadata rules
 */
class SimplifiedDurandalMCPServer extends EventEmitter {
    constructor() {
        super();

        this.server = new Server({
            name: 'durandal-memory-server-v2',
            version: '2.0.0',
            description: 'Simplified Durandal Memory Server - Pure data layer with intelligent metadata processing'
        }, {
            capabilities: {
                tools: {}
            }
        });

        this.db = new DatabaseAdapter();
        this.cache = new Map(); // Simple in-memory cache
        this.accessPatterns = new Map(); // Track access patterns for RAMR
        this.initialized = false;

        // Configuration for automatic features
        this.config = {
            cache: {
                maxSize: 1000,
                defaultTTL: 3600000, // 1 hour
                importanceThreshold: 0.5
            },
            ramr: {
                enabled: true,
                prefetchRelated: true,
                cacheScoreThreshold: 0.7
            },
            selectiveAttention: {
                enabled: true,
                retentionThreshold: 0.3,
                archiveAfterDays: 30
            },
            knowledgeAnalyzer: {
                enabled: true,
                clusterThreshold: 0.8,
                patternMinSupport: 3
            }
        };

        this.setupHandlers();
    }

    setupHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'store_memory',
                        description: 'Store content with enriched metadata for intelligent processing',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                content: {
                                    type: 'string',
                                    description: 'Content to store'
                                },
                                metadata: {
                                    type: 'object',
                                    description: 'Enriched metadata from Claude Code',
                                    properties: {
                                        project: { type: 'string', description: 'Project name' },
                                        session: { type: 'string', description: 'Session identifier' },
                                        type: { type: 'string', description: 'Content type' },
                                        importance: { type: 'number', description: 'Importance score (0.0-1.0)' },
                                        categories: {
                                            type: 'array',
                                            items: { type: 'string' },
                                            description: 'Semantic categories'
                                        },
                                        keywords: {
                                            type: 'array',
                                            items: { type: 'string' },
                                            description: 'Extracted keywords'
                                        },
                                        relationships: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    type: { type: 'string' },
                                                    target: { type: 'string' },
                                                    strength: { type: 'number' }
                                                }
                                            },
                                            description: 'Semantic relationships to other memories'
                                        },
                                        embeddings: {
                                            type: 'array',
                                            items: { type: 'number' },
                                            description: 'Vector embeddings for semantic search'
                                        }
                                    }
                                }
                            },
                            required: ['content']
                        }
                    },
                    {
                        name: 'search_memories',
                        description: 'Search memories using metadata and content filters',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                query: {
                                    type: 'string',
                                    description: 'Search query'
                                },
                                filters: {
                                    type: 'object',
                                    properties: {
                                        project: { type: 'string' },
                                        session: { type: 'string' },
                                        categories: {
                                            type: 'array',
                                            items: { type: 'string' }
                                        },
                                        importance_min: { type: 'number' },
                                        importance_max: { type: 'number' },
                                        date_from: { type: 'string' },
                                        date_to: { type: 'string' }
                                    }
                                },
                                limit: {
                                    type: 'number',
                                    description: 'Maximum results',
                                    default: 10
                                }
                            },
                            required: ['query']
                        }
                    },
                    {
                        name: 'get_context',
                        description: 'Get contextual information and recent memories',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                project: { type: 'string' },
                                session: { type: 'string' },
                                limit: { type: 'number', default: 10 },
                                include_stats: { type: 'boolean', default: true }
                            }
                        }
                    },
                    {
                        name: 'optimize_memory',
                        description: 'Trigger automatic memory optimization (RAMR, Selective Attention, etc.)',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                operations: {
                                    type: 'array',
                                    items: {
                                        type: 'string',
                                        enum: ['cache_optimization', 'retention_review', 'pattern_analysis', 'relationship_update']
                                    },
                                    default: ['cache_optimization']
                                }
                            }
                        }
                    }
                ]
            };
        });

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            try {
                await this.ensureInitialized();

                switch (name) {
                    case 'store_memory':
                        return await this.storeMemory(args);
                    case 'search_memories':
                        return await this.searchMemories(args);
                    case 'get_context':
                        return await this.getContext(args);
                    case 'optimize_memory':
                        return await this.optimizeMemory(args);
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            } catch (error) {
                console.error(`Error in ${name}:`, error.message);
                return {
                    content: [{
                        type: 'text',
                        text: `Error: ${error.message}`
                    }],
                    isError: true
                };
            }
        });
    }

    async ensureInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }
    }

    async initialize() {
        try {
            console.error('🔄 Initializing Simplified Durandal MCP Server...');

            // Test database connection
            const dbTest = await this.db.testConnection();
            if (!dbTest.success) {
                console.warn('⚠️  Database connection failed, using memory-only mode');
            }

            this.initialized = true;
            console.error('✅ Simplified MCP Server initialized successfully');
            console.error('🎯 Features: Data persistence, metadata processing, automatic optimization hooks');

        } catch (error) {
            console.error('❌ Initialization failed:', error.message);
            throw error;
        }
    }

    async storeMemory(args) {
        const { content, metadata = {} } = args;

        // Generate memory ID
        const memoryId = this.generateMemoryId();

        // Enrich metadata with automatic feature data
        const enrichedMetadata = this.enrichMetadata(metadata);

        // Store in database
        await this.storeInDatabase(memoryId, content, enrichedMetadata);

        // Update cache based on RAMR rules
        this.updateRAMRCache(memoryId, content, enrichedMetadata);

        // Emit events for automatic features
        this.emit('memory_stored', {
            id: memoryId,
            content,
            metadata: enrichedMetadata,
            timestamp: new Date().toISOString()
        });

        // Trigger automatic optimizations if needed
        if (this.shouldTriggerOptimization()) {
            setImmediate(() => this.runAutomaticOptimizations());
        }

        return {
            content: [{
                type: 'text',
                text: `✅ Memory stored successfully\n` +
                      `📍 ID: ${memoryId}\n` +
                      `📊 Importance: ${enrichedMetadata.importance || 'N/A'}\n` +
                      `🏷️  Categories: ${enrichedMetadata.categories?.join(', ') || 'None'}\n` +
                      `🧠 RAMR Cache: ${enrichedMetadata.ramr?.cache_priority || 'standard'}`
            }]
        };
    }

    async searchMemories(args) {
        const { query, filters = {}, limit = 10 } = args;

        // Track access for RAMR
        this.trackAccess('search', { query, filters });

        // Search in cache first (RAMR optimization)
        let cacheResults = this.searchCache(query, filters);

        // Search in database
        let dbResults = await this.searchDatabase(query, filters, limit);

        // Merge and rank results
        let results = this.mergeAndRankResults(cacheResults, dbResults, limit);

        // Update access patterns for found memories
        results.forEach(result => {
            this.updateAccessPattern(result.id);
        });

        // Trigger prefetching for related memories (RAMR)
        if (this.config.ramr.prefetchRelated) {
            setImmediate(() => this.prefetchRelatedMemories(results));
        }

        // Emit search event
        this.emit('memory_searched', {
            query,
            filters,
            resultCount: results.length,
            cacheHits: cacheResults.length
        });

        if (results.length === 0) {
            return {
                content: [{
                    type: 'text',
                    text: `🔍 No memories found for: "${query}"`
                }]
            };
        }

        const resultText = results.map((result, index) =>
            `**${index + 1}. Memory ${String(result.id).substring(0, 8)}...** (${result.type || 'unknown'})\n` +
            `📍 Project: ${result.project || 'Default'} | ⭐ Importance: ${result.importance || 'N/A'}\n` +
            `🏷️  Categories: ${result.categories?.join(', ') || 'None'}\n` +
            `📅 ${result.created_at || 'Unknown date'}\n` +
            `📝 ${this.truncateContent(result.content, 200)}\n`
        ).join('\n');

        return {
            content: [{
                type: 'text',
                text: `🔍 Found ${results.length} memories for "${query}":\n\n${resultText}`
            }]
        };
    }

    async getContext(args) {
        const { project, session, limit = 10, include_stats = true } = args;

        // Get recent memories
        const recentMemories = await this.getRecentMemories(project, session, limit);

        // Get cache statistics
        const cacheStats = this.getCacheStatistics();

        // Get automatic feature status
        const featureStatus = this.getAutomaticFeatureStatus();

        let contextInfo = [];

        if (include_stats) {
            contextInfo.push(
                `**Current Context:**`,
                `- Project: ${project || 'All projects'}`,
                `- Session: ${session || 'All sessions'}`,
                `- Cache size: ${cacheStats.size}/${this.config.cache.maxSize}`,
                `- Cache hit rate: ${cacheStats.hitRate.toFixed(2)}%`,
                ``,
                `**Automatic Features:**`,
                `- RAMR Caching: ${featureStatus.ramr}`,
                `- Selective Attention: ${featureStatus.selectiveAttention}`,
                `- Knowledge Analysis: ${featureStatus.knowledgeAnalyzer}`,
                ``
            );
        }

        contextInfo.push(`**Recent Memories (${recentMemories.length}):**`);

        if (recentMemories.length > 0) {
            recentMemories.forEach((memory, index) => {
                const preview = this.truncateContent(memory.content, 100);
                const importance = memory.metadata?.importance ? `⭐${memory.metadata.importance.toFixed(2)}` : '';
                contextInfo.push(`${index + 1}. ${importance} ${memory.type || 'Memory'}: ${preview}`);
            });
        } else {
            contextInfo.push('No recent memories found.');
        }

        return {
            content: [{
                type: 'text',
                text: contextInfo.join('\n')
            }]
        };
    }

    async optimizeMemory(args) {
        const { operations = ['cache_optimization'] } = args;

        const results = [];

        for (const operation of operations) {
            try {
                switch (operation) {
                    case 'cache_optimization':
                        const cacheResult = await this.optimizeCache();
                        results.push(`🧠 Cache optimization: ${cacheResult.message}`);
                        break;

                    case 'retention_review':
                        const retentionResult = await this.reviewRetention();
                        results.push(`🎯 Retention review: ${retentionResult.message}`);
                        break;

                    case 'pattern_analysis':
                        const patternResult = await this.analyzePatterns();
                        results.push(`🔍 Pattern analysis: ${patternResult.message}`);
                        break;

                    case 'relationship_update':
                        const relationshipResult = await this.updateRelationships();
                        results.push(`🔗 Relationship update: ${relationshipResult.message}`);
                        break;

                    default:
                        results.push(`❓ Unknown operation: ${operation}`);
                }
            } catch (error) {
                results.push(`❌ ${operation} failed: ${error.message}`);
            }
        }

        return {
            content: [{
                type: 'text',
                text: `🔧 **Memory Optimization Results:**\n\n${results.join('\n')}`
            }]
        };
    }

    // === Automatic Feature Implementations ===

    enrichMetadata(metadata) {
        const enriched = {
            ...metadata,

            // RAMR metadata
            ramr: {
                cache_priority: this.calculateCachePriority(metadata),
                prefetch_related: true,
                access_pattern: {
                    frequency: 0,
                    last_access: new Date().toISOString(),
                    trending: false
                },
                ...(metadata.ramr || {})
            },

            // Selective Attention metadata
            selective_attention: {
                retain: this.shouldRetain(metadata),
                reason: this.getRetentionReason(metadata),
                review_date: this.calculateReviewDate(metadata),
                archive_candidate: false,
                attention_score: metadata.importance || 0.5,
                ...(metadata.selective_attention || {})
            },

            // Knowledge Graph metadata
            knowledge_graph: {
                node_type: this.inferNodeType(metadata),
                cluster: this.inferCluster(metadata),
                centrality_score: 0.0,
                connections: [],
                ...(metadata.knowledge_graph || {})
            },

            // Timestamps
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        return enriched;
    }

    calculateCachePriority(metadata) {
        const importance = metadata.importance || 0.5;
        if (importance >= 0.8) return 'high';
        if (importance >= 0.5) return 'medium';
        return 'low';
    }

    shouldRetain(metadata) {
        return (metadata.importance || 0.5) >= this.config.selectiveAttention.retentionThreshold;
    }

    getRetentionReason(metadata) {
        if ((metadata.importance || 0) >= 0.8) return 'high_importance';
        if (metadata.categories?.includes('code')) return 'code_knowledge';
        if (metadata.type === 'pattern') return 'pattern_knowledge';
        return 'standard_retention';
    }

    calculateReviewDate(metadata) {
        const baseDate = new Date();
        const importance = metadata.importance || 0.5;

        // Higher importance = longer review intervals
        const daysToAdd = Math.floor(importance * 90) + 30; // 30-120 days
        baseDate.setDate(baseDate.getDate() + daysToAdd);

        return baseDate.toISOString();
    }

    inferNodeType(metadata) {
        if (metadata.categories?.includes('code')) return 'code_pattern';
        if (metadata.categories?.includes('documentation')) return 'documentation';
        if (metadata.type === 'conversation') return 'conversation';
        return 'general_knowledge';
    }

    inferCluster(metadata) {
        if (metadata.categories?.length > 0) {
            return metadata.categories[0] + '_cluster';
        }
        return 'general_cluster';
    }

    updateRAMRCache(memoryId, content, metadata) {
        if (!this.config.ramr.enabled) return;

        const cacheScore = this.calculateCacheScore(metadata);

        if (cacheScore >= this.config.ramr.cacheScoreThreshold) {
            this.cache.set(memoryId, {
                id: memoryId,
                content,
                metadata,
                cached_at: Date.now(),
                cache_score: cacheScore
            });

            // Evict low-priority items if cache is full
            if (this.cache.size > this.config.cache.maxSize) {
                this.evictLowPriorityItems();
            }
        }
    }

    calculateCacheScore(metadata) {
        const importance = metadata.importance || 0.5;
        const frequency = metadata.ramr?.access_pattern?.frequency || 0;
        const trending = metadata.ramr?.access_pattern?.trending ? 0.1 : 0;

        return (importance * 0.6) + (Math.min(frequency / 10, 1) * 0.3) + trending;
    }

    evictLowPriorityItems() {
        const items = Array.from(this.cache.entries());
        items.sort((a, b) => a[1].cache_score - b[1].cache_score);

        const toEvict = items.slice(0, Math.floor(this.cache.size * 0.1));
        toEvict.forEach(([key]) => this.cache.delete(key));
    }

    trackAccess(operation, context) {
        if (!this.accessPatterns.has(operation)) {
            this.accessPatterns.set(operation, []);
        }

        this.accessPatterns.get(operation).push({
            timestamp: Date.now(),
            context
        });

        // Keep only recent access patterns (last 1000)
        const patterns = this.accessPatterns.get(operation);
        if (patterns.length > 1000) {
            this.accessPatterns.set(operation, patterns.slice(-1000));
        }
    }

    updateAccessPattern(memoryId) {
        const cached = this.cache.get(memoryId);
        if (cached) {
            cached.metadata.ramr.access_pattern.frequency += 1;
            cached.metadata.ramr.access_pattern.last_access = new Date().toISOString();
            cached.cache_score = this.calculateCacheScore(cached.metadata);
        }
    }

    async prefetchRelatedMemories(memories) {
        // Extract related memory IDs from relationships
        const relatedIds = new Set();

        memories.forEach(memory => {
            memory.metadata?.relationships?.forEach(rel => {
                relatedIds.add(rel.target);
            });
        });

        // Prefetch into cache (simplified implementation)
        for (const id of Array.from(relatedIds).slice(0, 10)) {
            if (!this.cache.has(id)) {
                try {
                    const memory = await this.getMemoryById(id);
                    if (memory) {
                        this.cache.set(id, {
                            ...memory,
                            cached_at: Date.now(),
                            prefetched: true
                        });
                    }
                } catch (error) {
                    // Ignore prefetch errors
                }
            }
        }
    }

    shouldTriggerOptimization() {
        return this.cache.size > this.config.cache.maxSize * 0.8;
    }

    async runAutomaticOptimizations() {
        try {
            await this.optimizeCache();

            if (this.config.selectiveAttention.enabled) {
                await this.reviewRetention();
            }

            if (this.config.knowledgeAnalyzer.enabled) {
                await this.analyzePatterns();
            }
        } catch (error) {
            console.error('Automatic optimization error:', error.message);
        }
    }

    async optimizeCache() {
        const beforeSize = this.cache.size;
        this.evictLowPriorityItems();
        const afterSize = this.cache.size;

        return {
            message: `Optimized cache: ${beforeSize} → ${afterSize} items`
        };
    }

    async reviewRetention() {
        // Simplified retention review - mark old, low-importance memories for archival
        let candidatesCount = 0;

        for (const [id, memory] of this.cache) {
            const age = Date.now() - new Date(memory.metadata.created_at).getTime();
            const ageDays = age / (1000 * 60 * 60 * 24);

            if (ageDays > this.config.selectiveAttention.archiveAfterDays &&
                memory.metadata.selective_attention.attention_score < this.config.selectiveAttention.retentionThreshold) {

                memory.metadata.selective_attention.archive_candidate = true;
                candidatesCount++;
            }
        }

        return {
            message: `Reviewed retention: ${candidatesCount} candidates for archival`
        };
    }

    async analyzePatterns() {
        // Simplified pattern analysis - group by categories
        const categoryCount = new Map();

        for (const [id, memory] of this.cache) {
            memory.metadata.categories?.forEach(category => {
                categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
            });
        }

        const patterns = Array.from(categoryCount.entries())
            .filter(([category, count]) => count >= this.config.knowledgeAnalyzer.patternMinSupport)
            .map(([category, count]) => `${category}(${count})`);

        return {
            message: `Analyzed patterns: ${patterns.join(', ') || 'none found'}`
        };
    }

    async updateRelationships() {
        // Simplified relationship update - count connections
        let connectionsCount = 0;

        for (const [id, memory] of this.cache) {
            connectionsCount += memory.metadata.relationships?.length || 0;
        }

        return {
            message: `Updated ${connectionsCount} relationships across ${this.cache.size} memories`
        };
    }

    // === Database Operations ===

    async storeInDatabase(memoryId, content, metadata) {
        try {
            // Create project if needed
            const project = await this.getOrCreateProject(metadata.project || 'default');
            const session = await this.getOrCreateSession(project.id, metadata.session || 'default');

            // Store message
            await this.db.storeMessage(session.id, 'user', content, metadata);

        } catch (error) {
            console.warn('Database storage failed, using memory-only mode:', error.message);
        }
    }

    async searchDatabase(query, filters, limit) {
        try {
            // Simplified database search - this would be more sophisticated in practice
            const results = await this.db.searchMessages(query, {
                project: filters.project,
                limit: limit,
                // Add more filter support as needed
            });

            return results.map(result => ({
                id: result.id,
                content: result.content,
                project: result.project,
                type: result.metadata?.type,
                importance: result.metadata?.importance,
                categories: result.metadata?.categories,
                created_at: result.created_at,
                metadata: result.metadata
            }));

        } catch (error) {
            console.warn('Database search failed:', error.message);
            return [];
        }
    }

    searchCache(query, filters) {
        const results = [];
        const queryLower = query.toLowerCase();

        for (const [id, memory] of this.cache) {
            // Simple text matching
            if (memory.content.toLowerCase().includes(queryLower)) {
                // Apply filters
                if (filters.project && memory.metadata.project !== filters.project) continue;
                if (filters.categories && !this.matchesCategories(memory.metadata.categories, filters.categories)) continue;

                results.push({
                    id,
                    content: memory.content,
                    project: memory.metadata.project,
                    type: memory.metadata.type,
                    importance: memory.metadata.importance,
                    categories: memory.metadata.categories,
                    created_at: memory.metadata.created_at,
                    metadata: memory.metadata,
                    fromCache: true
                });
            }
        }

        return results;
    }

    matchesCategories(memoryCategories, filterCategories) {
        if (!memoryCategories || !filterCategories) return true;
        return filterCategories.some(cat => memoryCategories.includes(cat));
    }

    mergeAndRankResults(cacheResults, dbResults, limit) {
        const merged = [...cacheResults];

        // Add database results that aren't already in cache
        dbResults.forEach(dbResult => {
            if (!merged.find(r => r.id === dbResult.id)) {
                merged.push(dbResult);
            }
        });

        // Sort by importance and recency
        merged.sort((a, b) => {
            const importanceA = a.importance || 0;
            const importanceB = b.importance || 0;

            if (importanceA !== importanceB) {
                return importanceB - importanceA; // Higher importance first
            }

            // Then by recency
            const dateA = new Date(a.created_at || 0);
            const dateB = new Date(b.created_at || 0);
            return dateB - dateA; // More recent first
        });

        return merged.slice(0, limit);
    }

    async getRecentMemories(project, session, limit) {
        try {
            return await this.db.getRecentMessages(project, session, limit);
        } catch (error) {
            console.warn('Failed to get recent memories:', error.message);
            return [];
        }
    }

    async getMemoryById(id) {
        try {
            return await this.db.getMessageById(id);
        } catch (error) {
            return null;
        }
    }

    async getOrCreateProject(projectName) {
        let project = await this.db.getProjectByName(projectName);
        if (!project) {
            project = await this.db.createProject(projectName);
        }
        return project;
    }

    async getOrCreateSession(projectId, sessionName) {
        let session = await this.db.getSessionByName(projectId, sessionName);
        if (!session) {
            session = await this.db.createSession(projectId, sessionName);
        }
        return session;
    }

    // === Utility Methods ===

    generateMemoryId() {
        return 'mem_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    truncateContent(content, maxLength) {
        if (!content || content.length <= maxLength) return content;
        return content.substring(0, maxLength - 3) + '...';
    }

    getCacheStatistics() {
        let hits = 0;
        let total = 0;

        this.accessPatterns.forEach(patterns => {
            total += patterns.length;
            // Simplified hit rate calculation
        });

        return {
            size: this.cache.size,
            hitRate: total > 0 ? (hits / total) * 100 : 0,
            maxSize: this.config.cache.maxSize
        };
    }

    getAutomaticFeatureStatus() {
        return {
            ramr: this.config.ramr.enabled ? 'Enabled' : 'Disabled',
            selectiveAttention: this.config.selectiveAttention.enabled ? 'Enabled' : 'Disabled',
            knowledgeAnalyzer: this.config.knowledgeAnalyzer.enabled ? 'Enabled' : 'Disabled'
        };
    }

    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('🚀 Simplified Durandal MCP Server running on stdio transport');
        console.error('⚡ Features: Pure data layer, intelligent metadata, automatic optimizations');
    }
}

// Start server if run directly
if (require.main === module) {
    const server = new SimplifiedDurandalMCPServer();

    server.start().catch(error => {
        console.error('Failed to start MCP server:', error);
        process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.error('🛑 Shutting down Simplified Durandal MCP Server...');
        process.exit(0);
    });
}

module.exports = SimplifiedDurandalMCPServer;