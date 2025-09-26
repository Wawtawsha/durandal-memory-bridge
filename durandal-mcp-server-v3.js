#!/usr/bin/env node

/**
 * Durandal MCP Server v3 - Enhanced with Logging, Testing, and Debug Features
 *
 * Zero-configuration AI memory system with comprehensive logging and debugging
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { ListToolsRequestSchema, CallToolRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const DatabaseAdapter = require('./db-adapter');
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

// New modules
const Logger = require('./logger');
const {
    MCPError,
    ValidationError,
    DatabaseError,
    CacheError,
    ErrorHandler
} = require('./errors');
const TestRunner = require('./test-runner');

class DurandalMCPServer extends EventEmitter {
    constructor(options = {}) {
        super();

        // Initialize logger first
        this.logger = new Logger({
            level: options.logLevel || process.env.LOG_LEVEL || 'warn',
            verbose: options.verbose || process.env.VERBOSE === 'true',
            debug: options.debug || process.env.DEBUG === 'true',
            logMCPTools: options.logMCPTools || process.env.LOG_MCP_TOOLS === 'true',
            logFile: options.logFile || process.env.LOG_FILE,
            errorLogFile: options.errorLogFile || process.env.ERROR_LOG_FILE
        });

        // Initialize error handler
        this.errorHandler = new ErrorHandler(this.logger);

        // Get package info for version
        this.packageInfo = this.loadPackageInfo();

        // Log startup
        this.logger.info('🚀 Durandal MCP Server starting', {
            version: this.packageInfo.version,
            node: process.version,
            pid: process.pid
        });

        // Initialize MCP server
        this.server = new Server({
            name: 'durandal-memory-server',
            version: this.packageInfo.version,
            description: this.packageInfo.description
        }, {
            capabilities: {
                tools: {}
            }
        });

        // Initialize components
        this.db = new DatabaseAdapter();
        this.cache = new Map();
        this.accessPatterns = new Map();
        this.initialized = false;

        // Configuration
        this.config = {
            cache: {
                maxSize: parseInt(process.env.CACHE_MAX_SIZE) || 1000,
                defaultTTL: parseInt(process.env.CACHE_TTL) || 3600000,
                importanceThreshold: parseFloat(process.env.CACHE_IMPORTANCE_THRESHOLD) || 0.5
            },
            ramr: {
                enabled: process.env.RAMR_ENABLED !== 'false',
                prefetchRelated: process.env.RAMR_PREFETCH !== 'false',
                cacheScoreThreshold: parseFloat(process.env.RAMR_CACHE_THRESHOLD) || 0.7
            },
            selectiveAttention: {
                enabled: process.env.SELECTIVE_ATTENTION_ENABLED !== 'false',
                retentionThreshold: parseFloat(process.env.RETENTION_THRESHOLD) || 0.3,
                archiveAfterDays: parseInt(process.env.ARCHIVE_AFTER_DAYS) || 30
            }
        };

        // Log configuration
        this.logger.logConfiguration({
            cache: this.config.cache,
            ramr: this.config.ramr,
            selectiveAttention: this.config.selectiveAttention
        });

        this.setupHandlers();
    }

    loadPackageInfo() {
        try {
            const packagePath = path.join(__dirname, 'package.json');
            return JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        } catch (error) {
            this.logger?.warn('Could not load package.json', { error: error.message });
            return { version: '3.0.0', description: 'Durandal MCP Server' };
        }
    }

    setupHandlers() {
        // List tools handler
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            this.logger.debug('Listing MCP tools');

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
                                        project: { type: 'string' },
                                        session: { type: 'string' },
                                        type: { type: 'string' },
                                        importance: { type: 'number', minimum: 0, maximum: 1 },
                                        categories: { type: 'array', items: { type: 'string' } },
                                        keywords: { type: 'array', items: { type: 'string' } }
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
                                query: { type: 'string', description: 'Search query' },
                                filters: {
                                    type: 'object',
                                    properties: {
                                        categories: { type: 'array', items: { type: 'string' } },
                                        project: { type: 'string' },
                                        session: { type: 'string' },
                                        importance_min: { type: 'number' },
                                        importance_max: { type: 'number' }
                                    }
                                },
                                limit: { type: 'number', default: 10 }
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
                        description: 'Trigger automatic memory optimization',
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

        // Call tool handler with enhanced logging
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const toolName = request.params.name;
            const args = request.params.arguments || {};

            // Start MCP tool logging
            const requestId = this.logger.startMCPTool(toolName, args);

            try {
                this.logger.debug(`Processing tool: ${toolName}`, { requestId, args });

                let result;
                switch (toolName) {
                    case 'store_memory':
                        result = await this.handleStoreMemory(args, requestId);
                        break;
                    case 'search_memories':
                        result = await this.handleSearchMemories(args, requestId);
                        break;
                    case 'get_context':
                        result = await this.handleGetContext(args, requestId);
                        break;
                    case 'optimize_memory':
                        result = await this.handleOptimizeMemory(args, requestId);
                        break;
                    default:
                        throw new ValidationError(`Unknown tool: ${toolName}`, 'toolName', toolName);
                }

                // End MCP tool logging - success
                this.logger.endMCPTool(requestId, true, result);
                return result;

            } catch (error) {
                // End MCP tool logging - failure
                this.logger.endMCPTool(requestId, false, null, error);

                // Handle error with structured error response
                const errorResponse = this.errorHandler.handle(error, requestId);
                return {
                    content: [{
                        type: 'text',
                        text: `❌ Error: ${errorResponse.error.message}\n\nRecovery: ${errorResponse.error.recovery || 'Check logs for details'}`
                    }]
                };
            }
        });
    }

    async handleStoreMemory(args, requestId) {
        // Validate input
        if (!args.content || typeof args.content !== 'string') {
            throw new ValidationError('Content must be a non-empty string', 'content', args.content);
        }

        if (args.content.length > 50000) {
            throw new ValidationError('Content exceeds maximum length (50000 characters)', 'content', args.content.length);
        }

        const metadata = args.metadata || {};

        // Validate metadata
        if (metadata.importance !== undefined) {
            if (typeof metadata.importance !== 'number' || metadata.importance < 0 || metadata.importance > 1) {
                throw new ValidationError('Importance must be a number between 0 and 1', 'metadata.importance', metadata.importance);
            }
        }

        // Generate memory ID
        const memoryId = this.generateMemoryId();

        // Enrich metadata
        const enrichedMetadata = this.enrichMetadata(metadata);

        // Store in cache first
        this.storeInCache(memoryId, args.content, enrichedMetadata);

        // Store in database (async, don't wait)
        this.storeInDatabase(memoryId, args.content, enrichedMetadata).catch(error => {
            this.logger.error('Failed to store in database', {
                requestId,
                memoryId,
                error: error.message
            });
        });

        // Update access patterns for RAMR
        this.updateAccessPatterns(memoryId, 'store');

        this.logger.info('Memory stored successfully', {
            requestId,
            memoryId,
            contentLength: args.content.length,
            importance: enrichedMetadata.importance
        });

        return {
            content: [{
                type: 'text',
                text: `✅ Memory stored successfully\n\n` +
                      `**ID:** ${memoryId}\n` +
                      `**Importance:** ${enrichedMetadata.importance || 'Not set'}\n` +
                      `**Categories:** ${enrichedMetadata.categories?.join(', ') || 'None'}\n` +
                      `**Cache Priority:** ${enrichedMetadata.ramr?.cache_priority || 'Normal'}`
            }]
        };
    }

    async handleSearchMemories(args, requestId) {
        if (!args.query || typeof args.query !== 'string') {
            throw new ValidationError('Query must be a non-empty string', 'query', args.query);
        }

        const filters = args.filters || {};
        const limit = Math.min(args.limit || 10, 100); // Cap at 100

        this.logger.debug('Searching memories', {
            requestId,
            query: args.query,
            filters,
            limit
        });

        // Search in cache first
        const cacheResults = this.searchCache(args.query, filters);

        // Search in database
        const dbResults = await this.searchDatabase(args.query, filters, limit).catch(error => {
            this.logger.warn('Database search failed, using cache only', {
                requestId,
                error: error.message
            });
            return [];
        });

        // Merge and deduplicate results
        const allResults = this.mergeSearchResults(cacheResults, dbResults, limit);

        // Update access patterns for found memories
        allResults.forEach(result => {
            this.updateAccessPatterns(result.id, 'search');
        });

        this.logger.info('Search completed', {
            requestId,
            query: args.query,
            resultsCount: allResults.length
        });

        if (allResults.length === 0) {
            return {
                content: [{
                    type: 'text',
                    text: '🔍 No memories found matching your query.'
                }]
            };
        }

        // Format results
        const formattedResults = allResults.map((result, index) => {
            return `**${index + 1}. Memory ${result.id}**\n` +
                   `   Content: ${result.content.substring(0, 100)}${result.content.length > 100 ? '...' : ''}\n` +
                   `   Importance: ${result.importance || 'N/A'}\n` +
                   `   Categories: ${result.categories?.join(', ') || 'None'}\n` +
                   `   Created: ${result.created_at || 'Unknown'}`;
        }).join('\n\n');

        return {
            content: [{
                type: 'text',
                text: `🔍 **Search Results** (${allResults.length} found)\n\n${formattedResults}`
            }]
        };
    }

    async handleGetContext(args, requestId) {
        const project = args.project || 'default';
        const session = args.session || 'default';
        const limit = Math.min(args.limit || 10, 50);
        const includeStats = args.include_stats !== false;

        this.logger.debug('Getting context', {
            requestId,
            project,
            session,
            limit,
            includeStats
        });

        // Get recent memories from database
        const recentMemories = await this.db.getRecentMessages(project, session, limit).catch(error => {
            this.logger.warn('Failed to get recent memories from database', {
                requestId,
                error: error.message
            });
            return [];
        });

        // Get cached memories for this project/session
        const cachedMemories = this.getCachedMemories(project, session);

        // Compile statistics if requested
        let stats = {};
        if (includeStats) {
            stats = {
                totalMemories: recentMemories.length + cachedMemories.length,
                cacheSize: this.cache.size,
                cacheHitRate: this.getCacheStats().hitRate,
                ramrEnabled: this.config.ramr.enabled,
                selectiveAttentionEnabled: this.config.selectiveAttention.enabled
            };
        }

        this.logger.info('Context retrieved', {
            requestId,
            memoriesCount: recentMemories.length,
            cachedCount: cachedMemories.length
        });

        // Format response
        let response = `📚 **Context for Project: ${project}, Session: ${session}**\n\n`;

        if (recentMemories.length > 0) {
            response += '**Recent Memories:**\n';
            recentMemories.slice(0, 5).forEach((memory, index) => {
                response += `${index + 1}. ${memory.content.substring(0, 80)}...\n`;
            });
        } else {
            response += 'No recent memories found.\n';
        }

        if (includeStats) {
            response += `\n**Statistics:**\n`;
            response += `- Total Memories: ${stats.totalMemories}\n`;
            response += `- Cache Size: ${stats.cacheSize}/${this.config.cache.maxSize}\n`;
            response += `- Cache Hit Rate: ${stats.cacheHitRate.toFixed(1)}%\n`;
            response += `- RAMR: ${stats.ramrEnabled ? 'Enabled' : 'Disabled'}\n`;
            response += `- Selective Attention: ${stats.selectiveAttentionEnabled ? 'Enabled' : 'Disabled'}`;
        }

        return {
            content: [{
                type: 'text',
                text: response
            }]
        };
    }

    async handleOptimizeMemory(args, requestId) {
        const operations = args.operations || ['cache_optimization'];

        this.logger.info('Running memory optimization', {
            requestId,
            operations
        });

        const results = [];

        for (const operation of operations) {
            try {
                switch (operation) {
                    case 'cache_optimization':
                        const cacheResult = this.optimizeCache();
                        results.push(`✅ Cache optimization: Evicted ${cacheResult.evicted} items`);
                        break;

                    case 'retention_review':
                        const retentionResult = await this.reviewRetention();
                        results.push(`✅ Retention review: Archived ${retentionResult.archived} old memories`);
                        break;

                    case 'pattern_analysis':
                        const patternResult = this.analyzePatterns();
                        results.push(`✅ Pattern analysis: Found ${patternResult.patterns} access patterns`);
                        break;

                    case 'relationship_update':
                        results.push(`✅ Relationship update: Feature in development`);
                        break;

                    default:
                        results.push(`❓ Unknown operation: ${operation}`);
                }
            } catch (error) {
                this.logger.error(`Optimization operation failed: ${operation}`, {
                    requestId,
                    error: error.message
                });
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

    // Helper methods
    generateMemoryId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
    }

    enrichMetadata(metadata) {
        return {
            ...metadata,
            created_at: new Date().toISOString(),
            ramr: {
                cache_priority: this.calculateCachePriority(metadata),
                prefetch_related: true,
                access_pattern: {
                    frequency: 0,
                    last_access: null,
                    access_times: []
                }
            },
            selectiveAttention: {
                retention_score: metadata.importance || 0.5,
                review_date: this.calculateReviewDate(metadata)
            }
        };
    }

    calculateCachePriority(metadata) {
        const importance = metadata.importance || 0.5;
        const hasCategories = (metadata.categories?.length || 0) > 0;
        const hasKeywords = (metadata.keywords?.length || 0) > 0;

        let priority = importance * 0.6;
        if (hasCategories) priority += 0.2;
        if (hasKeywords) priority += 0.2;

        return Math.min(priority, 1.0);
    }

    calculateReviewDate(metadata) {
        const importance = metadata.importance || 0.5;
        const daysUntilReview = Math.floor(30 * (1 + importance));
        const reviewDate = new Date();
        reviewDate.setDate(reviewDate.getDate() + daysUntilReview);
        return reviewDate.toISOString();
    }

    storeInCache(id, content, metadata) {
        if (this.cache.size >= this.config.cache.maxSize) {
            this.evictFromCache();
        }

        this.cache.set(id, {
            content,
            metadata,
            timestamp: Date.now()
        });
    }

    evictFromCache() {
        // Simple LRU eviction
        let oldestKey = null;
        let oldestTime = Infinity;

        for (const [key, value] of this.cache) {
            if (value.timestamp < oldestTime) {
                oldestTime = value.timestamp;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
            this.logger.debug('Evicted from cache', { id: oldestKey });
        }
    }

    async storeInDatabase(memoryId, content, metadata) {
        try {
            const project = await this.getOrCreateProject(metadata.project || 'default');
            const session = await this.getOrCreateSession(project.id, metadata.session || 'default');

            await this.db.storeMessage(session.id, 'user', content, metadata);

            this.logger.debug('Stored in database', { memoryId, project: project.name, session: session.session_name });
        } catch (error) {
            throw new DatabaseError('Failed to store memory in database', 'store', error);
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

    searchCache(query, filters) {
        const results = [];
        const queryLower = query.toLowerCase();

        for (const [id, memory] of this.cache) {
            if (memory.content.toLowerCase().includes(queryLower)) {
                // Apply filters
                if (filters.project && memory.metadata.project !== filters.project) continue;
                if (filters.session && memory.metadata.session !== filters.session) continue;
                if (filters.importance_min && memory.metadata.importance < filters.importance_min) continue;
                if (filters.importance_max && memory.metadata.importance > filters.importance_max) continue;

                results.push({
                    id,
                    content: memory.content,
                    ...memory.metadata
                });
            }
        }

        return results;
    }

    async searchDatabase(query, filters, limit) {
        try {
            return await this.db.searchMessages(query, {
                project: filters.project,
                limit
            });
        } catch (error) {
            throw new DatabaseError('Failed to search database', 'search', error);
        }
    }

    mergeSearchResults(cacheResults, dbResults, limit) {
        const seen = new Set();
        const merged = [];

        // Add cache results first (more recent)
        for (const result of cacheResults) {
            if (merged.length >= limit) break;
            seen.add(result.id);
            merged.push(result);
        }

        // Add database results
        for (const result of dbResults) {
            if (merged.length >= limit) break;
            if (!seen.has(result.id)) {
                merged.push(result);
            }
        }

        return merged;
    }

    getCachedMemories(project, session) {
        const memories = [];

        for (const [id, memory] of this.cache) {
            if (memory.metadata.project === project && memory.metadata.session === session) {
                memories.push({
                    id,
                    content: memory.content,
                    ...memory.metadata
                });
            }
        }

        return memories;
    }

    optimizeCache() {
        let evicted = 0;
        const now = Date.now();

        for (const [id, memory] of this.cache) {
            // Evict based on importance and age
            const age = now - memory.timestamp;
            const importance = memory.metadata.importance || 0.5;

            if (age > this.config.cache.defaultTTL && importance < this.config.cache.importanceThreshold) {
                this.cache.delete(id);
                evicted++;
            }
        }

        return { evicted };
    }

    async reviewRetention() {
        // This would implement selective attention logic
        // For now, just a placeholder
        return { archived: 0 };
    }

    analyzePatterns() {
        // Analyze access patterns for RAMR
        let patterns = 0;

        for (const [id, accesses] of this.accessPatterns) {
            if (accesses.length > 3) {
                patterns++;
            }
        }

        return { patterns };
    }

    updateAccessPatterns(memoryId, action) {
        if (!this.accessPatterns.has(memoryId)) {
            this.accessPatterns.set(memoryId, []);
        }

        this.accessPatterns.get(memoryId).push({
            action,
            timestamp: Date.now()
        });

        // Limit pattern history
        const patterns = this.accessPatterns.get(memoryId);
        if (patterns.length > 100) {
            patterns.shift();
        }
    }

    getCacheStats() {
        const hits = Array.from(this.accessPatterns.values())
            .reduce((sum, patterns) => sum + patterns.filter(p => p.action === 'search').length, 0);

        const total = Array.from(this.accessPatterns.values())
            .reduce((sum, patterns) => sum + patterns.length, 0);

        return {
            size: this.cache.size,
            hitRate: total > 0 ? (hits / total) * 100 : 0,
            maxSize: this.config.cache.maxSize
        };
    }

    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);

        this.logger.info('🚀 Durandal MCP Server running', {
            transport: 'stdio',
            features: ['logging', 'testing', 'debug', 'error-handling']
        });

        // Log system info
        this.logger.logSystemInfo();
    }

    async shutdown() {
        this.logger.info('🛑 Shutting down Durandal MCP Server');

        // Close database connections
        if (this.db?.close) {
            await this.db.close();
        }

        // Close logger
        this.logger.close();

        process.exit(0);
    }

    // Command line interface
    static async cli() {
        const args = process.argv.slice(2);

        if (args.includes('--help') || args.includes('-h')) {
            console.log(`
Durandal MCP Server v3 - Zero-config AI memory system for Claude Code

Usage: durandal-mcp [options]

Options:
  --help, -h        Show this help message
  --version, -v     Show version information
  --test            Run built-in test suite
  --debug           Enable debug logging
  --verbose         Enable verbose output
  --log-file FILE   Write logs to file
  --log-level LEVEL Set log level (debug, info, warn, error)

Environment Variables:
  LOG_LEVEL         Set logging level (debug, info, warn, error)
  VERBOSE           Enable verbose logging (true/false)
  DEBUG             Enable debug mode (true/false)
  LOG_MCP_TOOLS     Log all MCP tool calls (true/false)
  LOG_FILE          Path to log file
  ERROR_LOG_FILE    Path to error log file
  DATABASE_PATH     SQLite database path (default: ./durandal-mcp-memory.db)

Examples:
  durandal-mcp                    # Start normally
  durandal-mcp --test             # Run tests
  durandal-mcp --debug            # Start with debug logging
  DEBUG=true durandal-mcp         # Enable debug via environment
  LOG_FILE=./logs/mcp.log durandal-mcp  # Log to file
`);
            process.exit(0);
        }

        if (args.includes('--version') || args.includes('-v')) {
            const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
            console.log(`
Durandal MCP Server
Version: ${pkg.version}
Node.js: ${process.version}
Platform: ${process.platform} ${process.arch}
MCP SDK: ${pkg.dependencies['@modelcontextprotocol/sdk']}
SQLite3: ${pkg.dependencies.sqlite3}
`);
            process.exit(0);
        }

        if (args.includes('--test')) {
            console.log('🧪 Running Durandal MCP Server Tests\n');
            const logger = new Logger({ level: 'info' });
            const runner = new TestRunner(logger);
            const success = await runner.runAllTests();
            process.exit(success ? 0 : 1);
        }

        // Parse command line options
        const options = {};
        if (args.includes('--debug')) {
            options.debug = true;
            options.logLevel = 'debug';
        }
        if (args.includes('--verbose')) {
            options.verbose = true;
        }

        const logFileIndex = args.indexOf('--log-file');
        if (logFileIndex > -1 && args[logFileIndex + 1]) {
            options.logFile = args[logFileIndex + 1];
        }

        const logLevelIndex = args.indexOf('--log-level');
        if (logLevelIndex > -1 && args[logLevelIndex + 1]) {
            options.logLevel = args[logLevelIndex + 1];
        }

        // Start server
        const server = new DurandalMCPServer(options);

        // Handle shutdown signals
        process.on('SIGTERM', () => server.shutdown());
        process.on('SIGINT', () => server.shutdown());

        // Handle uncaught errors
        process.on('uncaughtException', (error) => {
            server.logger.error('Uncaught exception', {
                error: error.message,
                stack: error.stack
            });
            server.shutdown();
        });

        process.on('unhandledRejection', (reason, promise) => {
            server.logger.error('Unhandled rejection', {
                reason: reason,
                promise: promise
            });
        });

        await server.start();
    }
}

// Run CLI if executed directly
if (require.main === module) {
    DurandalMCPServer.cli().catch(error => {
        console.error('Failed to start MCP server:', error);
        process.exit(1);
    });
}

module.exports = DurandalMCPServer;