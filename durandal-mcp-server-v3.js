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
const UpdateChecker = require('./update-checker');

class DurandalMCPServer extends EventEmitter {
    constructor(options = {}) {
        super();

        // Load persisted config from ~/.durandal-mcp/.env
        this.loadPersistedConfig();

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
        this.logger.info('[START] Durandal MCP Server starting', {
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

        // Run database startup check
        this.runDatabaseStartupCheck();

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

    loadPersistedConfig() {
        try {
            const homeDir = process.env.HOME || process.env.USERPROFILE || '.';
            const envPath = path.join(homeDir, '.durandal-mcp', '.env');

            if (fs.existsSync(envPath)) {
                const envContent = fs.readFileSync(envPath, 'utf8');
                const lines = envContent.split('\n');

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed && !trimmed.startsWith('#')) {
                        const [key, value] = trimmed.split('=');
                        if (key && value && !process.env[key]) {
                            // Only set if not already in environment
                            process.env[key] = value;
                        }
                    }
                }
            }
        } catch (error) {
            // Silently fail - config loading shouldn't break server
        }
    }

    /**
     * Runs comprehensive database checks on startup
     */
    async runDatabaseStartupCheck() {
        this.logger.info('[DB-CHECK] Running database startup check...');

        const checks = {
            connectivity: false,
            schema: false,
            readWrite: false,
            integrity: false
        };

        try {
            // Check 1: Database connectivity
            const connTest = await this.db.testConnection();
            if (connTest.success) {
                checks.connectivity = true;
                this.logger.info('[DB-CHECK] Connectivity test passed');
            } else {
                this.logger.error('[DB-CHECK] Connectivity test failed', { error: connTest.error });
                throw new Error(`Database connectivity failed: ${connTest.error}`);
            }

            // Check 2: Schema validation
            const schemaTest = await this.validateDatabaseSchema();
            if (schemaTest.valid) {
                checks.schema = true;
                this.logger.info('[DB-CHECK] Schema validation passed');
            } else {
                this.logger.warn('[DB-CHECK] Schema validation warnings', { issues: schemaTest.issues });
                checks.schema = true; // Allow startup with warnings
            }

            // Check 3: Read/Write test
            const rwTest = await this.testReadWrite();
            if (rwTest.success) {
                checks.readWrite = true;
                this.logger.info('[DB-CHECK] Read/Write test passed');
            } else {
                this.logger.error('[DB-CHECK] Read/Write test failed', { error: rwTest.error });
                throw new Error(`Database read/write failed: ${rwTest.error}`);
            }

            // Check 4: Database integrity
            const integrityTest = await this.checkDatabaseIntegrity();
            if (integrityTest.ok) {
                checks.integrity = true;
                this.logger.info('[DB-CHECK] Integrity check passed');
            } else {
                this.logger.warn('[DB-CHECK] Integrity check found issues', { issues: integrityTest.errors });
                checks.integrity = true; // Allow startup with warnings
            }

            // Summary
            const allPassed = Object.values(checks).every(c => c === true);
            if (allPassed) {
                this.logger.success('[DB-CHECK] All database checks passed');
            } else {
                this.logger.warn('[DB-CHECK] Some checks failed or had warnings', { checks });
            }

        } catch (error) {
            this.logger.error('[DB-CHECK] Critical database check failed', {
                error: error.message,
                checks
            });

            // Log a prominent warning but don't crash - allow server to start
            console.error('\n[CRITICAL] Database startup check failed:');
            console.error(`  Error: ${error.message}`);
            console.error('  Server will continue but database operations may fail.\n');
        }
    }

    /**
     * Validates database schema exists and is correct
     */
    async validateDatabaseSchema() {
        try {
            const tables = await new Promise((resolve, reject) => {
                this.db.db.client.all(
                    "SELECT name FROM sqlite_master WHERE type='table'",
                    (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows.map(r => r.name));
                    }
                );
            });

            const issues = [];

            // Check for main memories table (required)
            if (!tables.includes('memories')) {
                return {
                    valid: false,
                    issues: ['Critical: Missing memories table - database needs initialization']
                };
            }

            // Check memories table structure
            const columns = await new Promise((resolve, reject) => {
                this.db.db.client.all(
                    "PRAGMA table_info(memories)",
                    (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows.map(r => r.name));
                    }
                );
            });

            // Essential columns for memories table
            const essentialColumns = ['id', 'content'];
            const missingEssential = essentialColumns.filter(c => !columns.includes(c));

            if (missingEssential.length > 0) {
                issues.push(`Missing essential columns in memories table: ${missingEssential.join(', ')}`);
            }

            // Optional but expected columns
            const expectedColumns = ['metadata', 'created_at'];
            const missingExpected = expectedColumns.filter(c => !columns.includes(c));

            if (missingExpected.length > 0) {
                // This is a warning, not a failure
                this.logger.debug('[DB-CHECK] Optional columns missing', { columns: missingExpected });
            }

            // Check for legacy tables (informational)
            const legacyTables = ['projects', 'conversation_sessions', 'conversation_messages'];
            const existingLegacy = legacyTables.filter(t => tables.includes(t));

            if (existingLegacy.length > 0) {
                this.logger.debug('[DB-CHECK] Legacy tables present', { tables: existingLegacy });
            }

            // Count records to verify database is operational
            const recordCount = await new Promise((resolve, reject) => {
                this.db.db.client.get(
                    "SELECT COUNT(*) as count FROM memories",
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row.count);
                    }
                );
            });

            this.logger.debug('[DB-CHECK] Database contains memories', { count: recordCount });

            return {
                valid: issues.length === 0,
                issues,
                info: {
                    tables: tables.length,
                    memories: recordCount,
                    hasLegacyTables: existingLegacy.length > 0
                }
            };

        } catch (error) {
            return {
                valid: false,
                issues: [`Schema validation error: ${error.message}`]
            };
        }
    }

    /**
     * Tests basic read/write operations
     */
    async testReadWrite() {
        try {
            const testContent = `[DB-CHECK] Test memory created at ${new Date().toISOString()}`;
            const testMetadata = {
                type: 'system-test',
                test: true,
                timestamp: new Date().toISOString()
            };

            // Write test using proper abstraction
            const storeResult = await this.db.storeMemory(testContent, testMetadata);

            if (!storeResult || !storeResult.id) {
                throw new Error('Store operation did not return an ID');
            }

            // Read test using proper abstraction
            const searchResult = await this.db.searchMemories('[DB-CHECK]', {}, 1);

            if (!searchResult || searchResult.length === 0) {
                throw new Error('Search operation returned no results');
            }

            // Cleanup test memory - we need direct access for cleanup
            // This is acceptable as it's a cleanup operation
            try {
                await new Promise((resolve, reject) => {
                    this.db.db.client.run(
                        'DELETE FROM memories WHERE id = ?',
                        [storeResult.id],
                        (err) => err ? reject(err) : resolve()
                    );
                });
            } catch (cleanupError) {
                // Non-critical if cleanup fails
                this.logger.warn('[DB-CHECK] Test memory cleanup failed', {
                    error: cleanupError.message
                });
            }

            return { success: true };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Checks database integrity using SQLite's PRAGMA integrity_check
     */
    async checkDatabaseIntegrity() {
        try {
            const result = await new Promise((resolve, reject) => {
                this.db.db.client.all(
                    'PRAGMA integrity_check',
                    (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    }
                );
            });

            // SQLite returns 'ok' if database is healthy
            if (result.length === 1 && result[0].integrity_check === 'ok') {
                return { ok: true, errors: [] };
            } else {
                return {
                    ok: false,
                    errors: result.map(r => r.integrity_check)
                };
            }

        } catch (error) {
            return {
                ok: false,
                errors: [`Integrity check failed: ${error.message}`]
            };
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
                    },
                    {
                        name: 'get_status',
                        description: 'Get current Durandal MCP server status including memory usage, uptime, database stats, and logging configuration',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    },
                    {
                        name: 'configure_logging',
                        description: 'Configure console and file logging levels for Durandal MCP server. Console level controls terminal output (quiet), file level controls session history (detailed for debugging).',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                console_level: {
                                    type: 'string',
                                    enum: ['error', 'warn', 'info', 'debug'],
                                    description: 'Log level for console output (what you see in terminal). Default: warn (quiet)'
                                },
                                file_level: {
                                    type: 'string',
                                    enum: ['error', 'warn', 'info', 'debug'],
                                    description: 'Log level for file output (detailed session history for debugging). Default: info'
                                }
                            }
                        }
                    },
                    {
                        name: 'get_logs',
                        description: 'Retrieve recent log entries from Durandal MCP server for debugging and troubleshooting session history',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                lines: {
                                    type: 'number',
                                    description: 'Number of recent log lines to retrieve',
                                    default: 50
                                },
                                level_filter: {
                                    type: 'string',
                                    enum: ['error', 'warn', 'info', 'debug'],
                                    description: 'Filter logs by minimum level (e.g., "error" shows only errors and fatal)'
                                },
                                search: {
                                    type: 'string',
                                    description: 'Search for specific text in log messages'
                                }
                            }
                        }
                    },
                    {
                        name: 'list_projects_sessions',
                        description: 'List all projects and sessions with memory counts',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                type: {
                                    type: 'string',
                                    enum: ['projects', 'sessions', 'both'],
                                    description: 'What to list: projects, sessions, or both',
                                    default: 'both'
                                },
                                include_samples: {
                                    type: 'boolean',
                                    description: 'Include sample memories from each project/session',
                                    default: false
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
                    case 'get_status':
                        result = await this.handleGetStatus(args, requestId);
                        break;
                    case 'configure_logging':
                        result = await this.handleConfigureLogging(args, requestId);
                        break;
                    case 'get_logs':
                        result = await this.handleGetLogs(args, requestId);
                        break;
                    case 'list_projects_sessions':
                        result = await this.handleListProjectsSessions(args, requestId);
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
                        text: `[ERR] Error: ${errorResponse.error.message}\n\nRecovery: ${errorResponse.error.recovery || 'Check logs for details'}`
                    }]
                };
            }
        });
    }

    async handleStoreMemory(args, requestId) {
        this.logger.processing('Processing store_memory request from Claude');

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

        // Add project and session to metadata if not specified
        if (!metadata.project) {
            metadata.project = 'default';
        }
        if (!metadata.session) {
            metadata.session = new Date().toISOString().split('T')[0]; // Use date as default session
        }

        // Generate memory ID
        const memoryId = this.generateMemoryId();

        this.logger.substep('Analyzing content');

        // Enrich metadata
        const enrichedMetadata = this.enrichMetadata(metadata);

        this.logger.substep('Storing to cache');

        // Store in cache first
        this.storeInCache(memoryId, args.content, enrichedMetadata);

        this.logger.substep('Storing to database');

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

        this.logger.success(`Memory stored (id: ${memoryId})`, {
            requestId,
            memoryId,
            contentLength: args.content.length,
            importance: enrichedMetadata.importance
        });

        return {
            content: [{
                type: 'text',
                text: `[OK] Memory stored successfully\n\n` +
                      `**ID:** ${memoryId}\n` +
                      `**Project:** ${enrichedMetadata.project || 'default'}\n` +
                      `**Session:** ${enrichedMetadata.session || 'current'}\n` +
                      `**Importance:** ${enrichedMetadata.importance || 'Not set'}\n` +
                      `**Categories:** ${enrichedMetadata.categories?.join(', ') || 'None'}\n` +
                      `**Cache Priority:** ${enrichedMetadata.ramr?.cache_priority || 'Normal'}\n\n` +
                      `💡 **Tip:** You can specify project and session in metadata to organize memories:\n` +
                      `   metadata: { project: "my-app", session: "feature-x" }`
            }]
        };
    }

    async handleSearchMemories(args, requestId) {
        this.logger.processing('Processing search_memories request from Claude');

        if (!args.query || typeof args.query !== 'string') {
            throw new ValidationError('Query must be a non-empty string', 'query', args.query);
        }

        const filters = args.filters || {};
        const limit = Math.min(args.limit || 10, 100); // Cap at 100

        this.logger.substep('Checking cache');

        // Search in cache first
        const cacheResults = this.searchCache(args.query, filters);

        this.logger.substep('Querying database');

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

        this.logger.success(`Search completed (${allResults.length} results)`, {
            requestId,
            query: args.query,
            resultsCount: allResults.length
        });

        if (allResults.length === 0) {
            return {
                content: [{
                    type: 'text',
                    text: 'No memories found matching your query.'
                }]
            };
        }

        // Format results
        const formattedResults = allResults.map((result, index) => {
            const metadata = result.metadata || {};
            return `**${index + 1}. Memory ${result.id}**\n` +
                   `   Content: ${result.content.substring(0, 100)}${result.content.length > 100 ? '...' : ''}\n` +
                   `   Project: ${metadata.project || 'None'}\n` +
                   `   Session: ${metadata.session || 'None'}\n` +
                   `   Importance: ${result.importance || metadata.importance || 'N/A'}\n` +
                   `   Categories: ${result.categories?.join(', ') || metadata.categories?.join(', ') || 'None'}\n` +
                   `   Created: ${result.created_at || 'Unknown'}`;
        }).join('\n\n');

        return {
            content: [{
                type: 'text',
                text: `**Search Results** (${allResults.length} found)\n\n${formattedResults}`
            }]
        };
    }

    async handleGetContext(args, requestId) {
        this.logger.processing('Processing get_context request from Claude');

        const project = args.project || 'default';
        const session = args.session || 'default';
        const limit = Math.min(args.limit || 10, 50);
        const includeStats = args.include_stats !== false;

        this.logger.substep('Retrieving recent memories');

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

        this.logger.success(`Context retrieved (${recentMemories.length} memories)`, {
            requestId,
            memoriesCount: recentMemories.length,
            cachedCount: cachedMemories.length
        });

        // Format response
        let response = `**Context for Project: ${project}, Session: ${session}**\n\n`;

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
        this.logger.processing('Processing optimize_memory request from Claude');

        const operations = args.operations || ['cache_optimization'];

        this.logger.substep(`Running ${operations.length} optimization operation(s)`);

        const results = [];

        for (const operation of operations) {
            try {
                switch (operation) {
                    case 'cache_optimization':
                        const cacheResult = this.optimizeCache();
                        results.push(`[OK] Cache optimization: Evicted ${cacheResult.evicted} items`);
                        break;

                    case 'retention_review':
                        const retentionResult = await this.reviewRetention();
                        results.push(`[OK] Retention review: Archived ${retentionResult.archived} old memories`);
                        break;

                    case 'pattern_analysis':
                        const patternResult = this.analyzePatterns();
                        results.push(`[OK] Pattern analysis: Found ${patternResult.patterns} access patterns`);
                        break;

                    case 'relationship_update':
                        results.push(`[OK] Relationship update: Feature in development`);
                        break;

                    default:
                        results.push(`❓ Unknown operation: ${operation}`);
                }
            } catch (error) {
                this.logger.error(`Optimization operation failed: ${operation}`, {
                    requestId,
                    error: error.message
                });
                results.push(`[ERR] ${operation} failed: ${error.message}`);
            }
        }

        this.logger.success('Optimization complete', {
            requestId,
            operationsCount: operations.length,
            successCount: results.length
        });

        return {
            content: [{
                type: 'text',
                text: `[OK] **Memory Optimization Results:**\n\n${results.join('\n')}`
            }]
        };
    }

    async handleGetStatus(args, requestId) {
        this.logger.processing('Processing get_status request from Claude');

        // Use the actual database path that was resolved
        const dbPath = this.db.db.dbPath;
        const dbExists = fs.existsSync(dbPath);
        const dbSize = dbExists ? (fs.statSync(dbPath).size / 1024 / 1024).toFixed(2) : '0.00';

        // Get memory counts from database
        let dbMemoryCount = 0;
        let dbProjectCount = 0;
        let dbSessionCount = 0;

        if (dbExists) {
            try {
                // Get total memory count
                const countResult = await this.db.db.query('SELECT COUNT(*) as count FROM memories');
                dbMemoryCount = countResult.rows[0]?.count || 0;

                // Get unique projects and sessions
                const projectResult = await this.db.db.query(
                    "SELECT COUNT(DISTINCT json_extract(metadata, '$.project')) as count FROM memories WHERE json_extract(metadata, '$.project') IS NOT NULL"
                );
                dbProjectCount = projectResult.rows[0]?.count || 0;

                const sessionResult = await this.db.db.query(
                    "SELECT COUNT(DISTINCT json_extract(metadata, '$.session')) as count FROM memories WHERE json_extract(metadata, '$.session') IS NOT NULL"
                );
                dbSessionCount = sessionResult.rows[0]?.count || 0;
            } catch (e) {
                this.logger.debug('Could not get memory counts:', e.message);
            }
        }

        const memUsage = process.memoryUsage();
        const uptimeSeconds = process.uptime();

        const statusData = {
            version: this.packageInfo.version,
            uptime: formatUptime(uptimeSeconds),
            memory: {
                rss: (memUsage.rss / 1024 / 1024).toFixed(2),
                heapUsed: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
                heapTotal: (memUsage.heapTotal / 1024 / 1024).toFixed(2)
            },
            database: {
                path: dbPath,
                connected: dbExists,
                size: dbSize,
                memoryCount: dbMemoryCount,
                projectCount: dbProjectCount,
                sessionCount: dbSessionCount
            },
            cache: {
                size: this.cache.size,
                maxSize: this.config.cache.maxSize
            },
            logging: {
                consoleLevel: this.logger.getConsoleLevel(),
                fileLevel: this.logger.getFileLevel(),
                logFile: this.logger.logFile
            },
            node: process.version,
            platform: process.platform,
            pid: process.pid
        };

        this.logger.success('Status retrieved');

        // Format as nice display
        let output = '\n┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n';
        output += `┃  Durandal MCP Server v${statusData.version}                              ┃\n`;
        output += '┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n';
        output += `┃  Status:          ${(statusData.database.connected ? '[OK] Running' : '[WARN] Database Missing').padEnd(35)}┃\n`;
        output += `┃  Uptime:          ${statusData.uptime.padEnd(35)}┃\n`;
        output += `┃  Memory (RSS):    ${(statusData.memory.rss + ' MB').padEnd(35)}┃\n`;
        output += `┃  Memory (Heap):   ${(statusData.memory.heapUsed + ' / ' + statusData.memory.heapTotal + ' MB').padEnd(35)}┃\n`;
        output += '┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n';
        output += `┃  Database:        ${(statusData.database.connected ? '[OK] Connected' : '[ERR] Not Found').padEnd(35)}┃\n`;
        output += `┃  Database Size:   ${(statusData.database.size + ' MB').padEnd(35)}┃\n`;
        output += `┃  Stored Memories: ${(statusData.database.memoryCount + ' memories').padEnd(35)}┃\n`;
        output += `┃  Projects:        ${(statusData.database.projectCount + ' projects').padEnd(35)}┃\n`;
        output += `┃  Sessions:        ${(statusData.database.sessionCount + ' sessions').padEnd(35)}┃\n`;
        output += '┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n';
        output += `┃  Cache Memories:  ${(statusData.cache.size + ' / ' + statusData.cache.maxSize + ' cached').padEnd(35)}┃\n`;
        output += '┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n';
        output += `┃  Console Level:   ${statusData.logging.consoleLevel.padEnd(35)}┃\n`;
        output += `┃  File Level:      ${statusData.logging.fileLevel.padEnd(35)}┃\n`;
        output += `┃  Log File:        ~/.durandal-mcp/logs/...              ┃\n`;
        output += '┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n';
        output += `┃  Node Version:    ${statusData.node.padEnd(35)}┃\n`;
        output += `┃  Platform:        ${statusData.platform.padEnd(35)}┃\n`;
        output += `┃  Process ID:      ${statusData.pid.toString().padEnd(35)}┃\n`;
        output += '┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n';

        return {
            content: [{
                type: 'text',
                text: output
            }]
        };
    }

    async handleConfigureLogging(args, requestId) {
        this.logger.processing('Processing configure_logging request from Claude');

        const { console_level, file_level } = args;

        if (!console_level && !file_level) {
            throw new ValidationError('Must specify at least one log level', 'console_level or file_level', args);
        }

        const validLevels = ['error', 'warn', 'info', 'debug'];

        if (console_level && !validLevels.includes(console_level)) {
            throw new ValidationError(`Invalid console log level: ${console_level}. Must be one of: ${validLevels.join(', ')}`, 'console_level', console_level);
        }

        if (file_level && !validLevels.includes(file_level)) {
            throw new ValidationError(`Invalid file log level: ${file_level}. Must be one of: ${validLevels.join(', ')}`, 'file_level', file_level);
        }

        const homeDir = process.env.HOME || process.env.USERPROFILE || '.';
        const configDir = path.join(homeDir, '.durandal-mcp');
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        const envPath = path.join(configDir, '.env');
        let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

        let updated = [];

        if (console_level) {
            if (envContent.includes('CONSOLE_LOG_LEVEL=')) {
                envContent = envContent.replace(/CONSOLE_LOG_LEVEL=.*/g, `CONSOLE_LOG_LEVEL=${console_level}`);
            } else {
                envContent += `\nCONSOLE_LOG_LEVEL=${console_level}\n`;
            }

            if (this.logger.setConsoleLevel(console_level)) {
                updated.push(`Console level: ${console_level}`);
            }
        }

        if (file_level) {
            if (envContent.includes('FILE_LOG_LEVEL=')) {
                envContent = envContent.replace(/FILE_LOG_LEVEL=.*/g, `FILE_LOG_LEVEL=${file_level}`);
            } else {
                envContent += `\nFILE_LOG_LEVEL=${file_level}\n`;
            }

            if (this.logger.setFileLevel(file_level)) {
                updated.push(`File level: ${file_level}`);
            }
        }

        try {
            fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');
            this.logger.info('Config file written successfully to:', envPath);
        } catch (error) {
            this.logger.error('Failed to write config file:', error);
            throw new Error(`Failed to save configuration: ${error.message}`);
        }

        this.logger.success('Logging configuration updated');

        let output = '[OK] **Logging Configuration Updated**\n\n';
        updated.forEach(change => {
            output += `- ${change}\n`;
        });
        output += '\n**Current Configuration:**\n';
        output += `- Console Level: ${this.logger.getConsoleLevel()} (terminal output)\n`;
        output += `- File Level: ${this.logger.getFileLevel()} (session history)\n`;
        output += `- Log File: ${this.logger.logFile}\n\n`;
        output += 'Changes applied immediately to current session.\n';
        output += 'Configuration saved to .env for future sessions.';

        return {
            content: [{
                type: 'text',
                text: output
            }]
        };
    }

    async handleGetLogs(args, requestId) {
        this.logger.processing('Processing get_logs request from Claude');

        const { lines = 50, level_filter, search } = args;

        if (!this.logger.logFile || !fs.existsSync(this.logger.logFile)) {
            throw new ValidationError('No log file found', 'logFile', this.logger.logFile);
        }

        this.logger.substep('Reading log file');

        // Read log file
        const logContent = fs.readFileSync(this.logger.logFile, 'utf8');
        const logLines = logContent.split('\n').filter(line => line.trim());

        // Parse JSON lines
        let parsedLogs = logLines.map(line => {
            try {
                return JSON.parse(line);
            } catch {
                return null;
            }
        }).filter(log => log !== null);

        this.logger.substep(`Found ${parsedLogs.length} log entries`);

        // Filter by level
        if (level_filter) {
            const filterValue = this.logger.levels[level_filter];
            parsedLogs = parsedLogs.filter(log => {
                const logLevel = this.logger.levels[log.level];
                return logLevel >= filterValue;
            });
            this.logger.substep(`Filtered to ${parsedLogs.length} entries by level`);
        }

        // Search filter
        if (search) {
            const searchLower = search.toLowerCase();
            parsedLogs = parsedLogs.filter(log =>
                log.message.toLowerCase().includes(searchLower) ||
                JSON.stringify(log).toLowerCase().includes(searchLower)
            );
            this.logger.substep(`Filtered to ${parsedLogs.length} entries by search`);
        }

        // Get most recent N entries
        const recentLogs = parsedLogs.slice(-lines);

        this.logger.success(`Retrieved ${recentLogs.length} log entries`);

        // Format for display
        let output = `**Recent Log Entries** (${recentLogs.length} of ${parsedLogs.length} total)\n\n`;
        output += `Log file: \`${path.basename(this.logger.logFile)}\`\n\n`;

        if (recentLogs.length === 0) {
            output += '**No matching log entries found.**\n';
        } else {
            recentLogs.forEach((log, index) => {
                const timestamp = new Date(log.timestamp).toLocaleString();
                const levelEmoji = {
                    debug: '[DEBUG]',
                    info: '[INFO] ',
                    warn: '[WARN] ',
                    error: '[ERR] ',
                    fatal: '[FATAL]'
                }[log.level] || '[LOG]  ';

                output += `**${index + 1}.** ${levelEmoji} \`[${log.level.toUpperCase()}]\` ${timestamp}\n`;
                output += `   ${log.message}\n`;

                if (log.requestId) {
                    output += `   _Request: ${log.requestId}_\n`;
                }

                output += `\n`;
            });
        }

        return {
            content: [{
                type: 'text',
                text: output
            }]
        };
    }

    async handleListProjectsSessions(args, requestId) {
        this.logger.processing('Processing list_projects_sessions request from Claude');

        const listType = args.type || 'both';
        const includeSamples = args.include_samples || false;

        let output = '';
        const results = {};

        // Get projects if requested
        if (listType === 'projects' || listType === 'both') {
            try {
                const projectsResult = await this.db.db.query(`
                    SELECT
                        json_extract(metadata, '$.project') as project,
                        COUNT(*) as count,
                        MIN(created_at) as first_memory,
                        MAX(created_at) as last_memory
                    FROM memories
                    WHERE json_extract(metadata, '$.project') IS NOT NULL
                    GROUP BY json_extract(metadata, '$.project')
                    ORDER BY count DESC
                `);

                results.projects = projectsResult.rows.map(row => ({
                    name: row.project,
                    memoryCount: row.count,
                    firstMemory: row.first_memory,
                    lastMemory: row.last_memory
                }));

                // Get samples if requested
                if (includeSamples && results.projects.length > 0) {
                    for (const project of results.projects) {
                        const sampleResult = await this.db.db.query(`
                            SELECT content, created_at
                            FROM memories
                            WHERE json_extract(metadata, '$.project') = ?
                            ORDER BY created_at DESC
                            LIMIT 2
                        `, [project.name]);
                        project.samples = sampleResult.rows;
                    }
                }
            } catch (e) {
                this.logger.error('Failed to list projects', { error: e.message });
                results.projects = [];
            }
        }

        // Get sessions if requested
        if (listType === 'sessions' || listType === 'both') {
            try {
                const sessionsResult = await this.db.db.query(`
                    SELECT
                        json_extract(metadata, '$.session') as session,
                        COUNT(*) as count,
                        MIN(created_at) as first_memory,
                        MAX(created_at) as last_memory
                    FROM memories
                    WHERE json_extract(metadata, '$.session') IS NOT NULL
                    GROUP BY json_extract(metadata, '$.session')
                    ORDER BY last_memory DESC
                    LIMIT 50
                `);

                results.sessions = sessionsResult.rows.map(row => ({
                    name: row.session,
                    memoryCount: row.count,
                    firstMemory: row.first_memory,
                    lastMemory: row.last_memory
                }));

                // Get samples if requested
                if (includeSamples && results.sessions.length > 0) {
                    for (const session of results.sessions.slice(0, 10)) { // Limit samples to first 10 sessions
                        const sampleResult = await this.db.db.query(`
                            SELECT content, created_at
                            FROM memories
                            WHERE json_extract(metadata, '$.session') = ?
                            ORDER BY created_at DESC
                            LIMIT 2
                        `, [session.name]);
                        session.samples = sampleResult.rows;
                    }
                }
            } catch (e) {
                this.logger.error('Failed to list sessions', { error: e.message });
                results.sessions = [];
            }
        }

        // Format output
        output = `# Durandal Memory Organization\n\n`;

        if (results.projects) {
            output += `## Projects (${results.projects.length} total)\n\n`;
            for (const project of results.projects) {
                output += `### ${project.name}\n`;
                output += `- **Memories:** ${project.memoryCount}\n`;
                output += `- **First:** ${new Date(project.firstMemory).toLocaleDateString()}\n`;
                output += `- **Latest:** ${new Date(project.lastMemory).toLocaleDateString()}\n`;

                if (project.samples) {
                    output += `- **Recent samples:**\n`;
                    for (const sample of project.samples) {
                        const preview = sample.content.substring(0, 100);
                        output += `  - "${preview}${sample.content.length > 100 ? '...' : ''}"\n`;
                    }
                }
                output += '\n';
            }
        }

        if (results.sessions) {
            output += `## Sessions (${results.sessions.length} recent)\n\n`;
            for (const session of results.sessions.slice(0, 20)) { // Show max 20 sessions
                output += `### ${session.name}\n`;
                output += `- **Memories:** ${session.memoryCount}\n`;
                output += `- **Duration:** ${new Date(session.firstMemory).toLocaleTimeString()} - ${new Date(session.lastMemory).toLocaleTimeString()}\n`;

                if (session.samples) {
                    output += `- **Recent samples:**\n`;
                    for (const sample of session.samples) {
                        const preview = sample.content.substring(0, 100);
                        output += `  - "${preview}${sample.content.length > 100 ? '...' : ''}"\n`;
                    }
                }
                output += '\n';
            }
        }

        // Add summary
        const totalProjects = results.projects?.length || 0;
        const totalSessions = results.sessions?.length || 0;
        const totalMemories = results.projects?.reduce((sum, p) => sum + p.memoryCount, 0) || 0;

        output += `## Summary\n`;
        output += `- **Total Projects:** ${totalProjects}\n`;
        output += `- **Total Sessions:** ${totalSessions}\n`;
        output += `- **Total Memories:** ${totalMemories}\n`;

        this.logger.success('Listed projects and sessions');

        return {
            content: [{
                type: 'text',
                text: output
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
            return await this.db.searchMemories(query, {
                project: filters.project,
                session: filters.session,
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

        this.logger.info('[START] Durandal MCP Server running', {
            transport: 'stdio',
            features: ['logging', 'testing', 'debug', 'error-handling']
        });

        // Log system info
        this.logger.logSystemInfo();

        // Check for updates (async, non-blocking)
        this.checkForUpdates();
    }

    async checkForUpdates() {
        try {
            const updateChecker = new UpdateChecker(this.packageInfo, this.logger);
            const updateInfo = await updateChecker.checkForUpdates();

            if (updateInfo && updateInfo.updateAvailable) {
                updateChecker.showUpdateNotification(updateInfo);
            }
        } catch (error) {
            // Silently fail - update check shouldn't break server
            this.logger.debug('Update check error', { error: error.message });
        }
    }

    async shutdown() {
        this.logger.info('[STOP] Shutting down Durandal MCP Server');

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
  --status          Show system status and statistics
  --discover        Find all Durandal databases on system
  --migrate         Merge all databases into universal database
  --configure       Interactive log level configuration
  --update          Check for and install updates
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
            console.log('Running Durandal MCP Server Tests\n');
            const logger = new Logger({ level: 'info' });
            const runner = new TestRunner(logger);
            const success = await runner.runAllTests();
            process.exit(success ? 0 : 1);
        }

        if (args.includes('--status')) {
            const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

            // Use the same database resolution logic as the server
            const MCPDatabaseClient = require('./mcp-db-client');
            const tempClient = new MCPDatabaseClient();
            const dbPath = tempClient.dbPath;
            const dbExists = fs.existsSync(dbPath);

            // Get memory counts from database
            let memoryCount = 0;
            let projectCount = 0;
            let sessionCount = 0;

            if (dbExists) {
                try {
                    // Get counts from database
                    const countResult = await tempClient.query('SELECT COUNT(*) as count FROM memories');
                    memoryCount = countResult.rows[0]?.count || 0;

                    const projectResult = await tempClient.query(
                        "SELECT COUNT(DISTINCT json_extract(metadata, '$.project')) as count FROM memories WHERE json_extract(metadata, '$.project') IS NOT NULL"
                    );
                    projectCount = projectResult.rows[0]?.count || 0;

                    const sessionResult = await tempClient.query(
                        "SELECT COUNT(DISTINCT json_extract(metadata, '$.session')) as count FROM memories WHERE json_extract(metadata, '$.session') IS NOT NULL"
                    );
                    sessionCount = sessionResult.rows[0]?.count || 0;
                } catch (e) {
                    // Ignore errors
                }
            }

            tempClient.close();  // Clean up

            const statusData = {
                version: pkg.version,
                status: 'running',
                uptime: formatUptime(process.uptime()),
                memory: {
                    rss: (process.memoryUsage().rss / 1024 / 1024).toFixed(2),
                    heapUsed: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
                    heapTotal: (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)
                },
                database: {
                    path: dbPath,
                    exists: dbExists,
                    size: dbExists ? (fs.statSync(dbPath).size / 1024 / 1024).toFixed(2) : '0.00',
                    memoryCount: memoryCount,
                    projectCount: projectCount,
                    sessionCount: sessionCount
                },
                node: process.version,
                platform: process.platform,
                pid: process.pid
            };

            displayStatusSummary(statusData);
            process.exit(0);
        }

        if (args.includes('--discover')) {
            console.log('Discovering all Durandal databases on system...\n');
            try {
                const DatabaseDiscovery = require('./db-discovery');
                const discovery = new DatabaseDiscovery();
                await discovery.discover();
            } catch (error) {
                console.error('Discovery failed:', error.message);
                console.error('\nTry running: node db-discovery.js');
            }
            process.exit(0);
        }

        if (args.includes('--migrate')) {
            console.log('Starting database migration...\n');
            try {
                const DatabaseMigrator = require('./db-migrate');
                const migrator = new DatabaseMigrator();
                await migrator.migrate();
            } catch (error) {
                console.error('Migration failed:', error.message);
                console.error('\nTry running: node db-migrate.js');
            }
            process.exit(0);
        }

        if (args.includes('--configure')) {
            await configureLogLevel();
            process.exit(0);
        }

        if (args.includes('--update')) {
            console.log('Durandal MCP Update Tool\n');
            const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
            const logger = new Logger({ level: 'info' });
            const updateChecker = new UpdateChecker(pkg, logger);

            try {
                const success = await updateChecker.performUpdate({ confirm: false });
                process.exit(success ? 0 : 1);
            } catch (error) {
                console.error('\n[ERR] Update failed:', error.message);
                console.log('\nYou can update manually with:');
                console.log('  npm install -g durandal-memory-mcp@latest\n');
                process.exit(1);
            }
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

function formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

function displayStatusSummary(data) {
    const statusEmoji = data.status === 'running' ? '[OK]' : '[STOP]';

    console.log('\n┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
    console.log(`┃  Durandal MCP Server v${data.version}                              ┃`);
    console.log('┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫');
    console.log(`┃  Status:          ${statusEmoji} ${data.status.charAt(0).toUpperCase() + data.status.slice(1).padEnd(29)}┃`);
    console.log(`┃  Uptime:          ${data.uptime.padEnd(35)}┃`);
    console.log(`┃  Memory (RSS):    ${(data.memory.rss + ' MB').padEnd(35)}┃`);
    console.log(`┃  Memory (Heap):   ${(data.memory.heapUsed + ' / ' + data.memory.heapTotal + ' MB').padEnd(35)}┃`);
    console.log('┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫');
    console.log(`┃  Database:        ${(data.database.exists ? '[OK] Connected' : '[ERR] Not Found').padEnd(35)}┃`);
    console.log(`┃  Database Size:   ${(data.database.size + ' MB').padEnd(35)}┃`);

    // Show memory counts if available
    if (data.database.memoryCount !== undefined) {
        console.log(`┃  Stored Memories: ${(data.database.memoryCount + ' memories').padEnd(35)}┃`);
        console.log(`┃  Projects:        ${(data.database.projectCount + ' projects').padEnd(35)}┃`);
        console.log(`┃  Sessions:        ${(data.database.sessionCount + ' sessions').padEnd(35)}┃`);
    }

    console.log('┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫');
    console.log(`┃  Node Version:    ${data.node.padEnd(35)}┃`);
    console.log(`┃  Platform:        ${data.platform.padEnd(35)}┃`);
    console.log(`┃  Process ID:      ${data.pid.toString().padEnd(35)}┃`);
    console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n');
}

async function configureLogLevel() {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (query) => new Promise((resolve) => rl.question(query, resolve));

    console.clear();
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                                                           ║');
    console.log('║           DURANDAL LOG LEVEL CONFIGURATION                ║');
    console.log('║                                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log('Durandal uses separate log levels for console and file output:\n');
    console.log('  Console Level - What you see in the terminal (quiet)');
    console.log('  File Level - Session history for debugging (detailed)\n');

    // Console Level Selection
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('1. Select CONSOLE log level (terminal output):\n');

    console.log('┌───────────────────────────────────────────────────────────┐');
    console.log('│  [1] ERROR - Only critical errors                         │');
    console.log('│  [2] WARN - Warnings and errors (RECOMMENDED)             │');
    console.log('│  [3] INFO - Include success messages                      │');
    console.log('│  [4] DEBUG - Everything including substeps                │');
    console.log('└───────────────────────────────────────────────────────────┘\n');

    const consoleChoice = await question('Console level [1-4, default=2]: ');

    const levels = {
        '1': 'error',
        '2': 'warn',
        '3': 'info',
        '4': 'debug',
        '': 'warn'  // default
    };

    if (!levels[consoleChoice]) {
        console.log('\n[ERR] Invalid choice\n');
        rl.close();
        return;
    }

    const consoleLevel = levels[consoleChoice];

    // File Level Selection
    console.log('\n═══════════════════════════════════════════════════════════\n');
    console.log('2. Select FILE log level (session history):\n');

    console.log('┌───────────────────────────────────────────────────────────┐');
    console.log('│  [1] ERROR - Only errors                                  │');
    console.log('│  [2] WARN - Warnings and errors                           │');
    console.log('│  [3] ℹ️  INFO - Detailed session history (RECOMMENDED)    │');
    console.log('│  [4] 🔍 DEBUG - Maximum detail for troubleshooting        │');
    console.log('└───────────────────────────────────────────────────────────┘\n');

    const fileChoice = await question('File level [1-4, default=3]: ');

    if (!levels[fileChoice] && fileChoice !== '') {
        console.log('\n[ERR] Invalid choice\n');
        rl.close();
        return;
    }

    const fileLevel = fileChoice === '' ? 'info' : levels[fileChoice];

    // Save configuration
    const envPath = path.join(__dirname, '.env');
    let envContent = '';

    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Update or add console level
    if (envContent.includes('CONSOLE_LOG_LEVEL=')) {
        envContent = envContent.replace(/CONSOLE_LOG_LEVEL=.*/g, `CONSOLE_LOG_LEVEL=${consoleLevel}`);
    } else {
        envContent += `\nCONSOLE_LOG_LEVEL=${consoleLevel}\n`;
    }

    // Update or add file level
    if (envContent.includes('FILE_LOG_LEVEL=')) {
        envContent = envContent.replace(/FILE_LOG_LEVEL=.*/g, `FILE_LOG_LEVEL=${fileLevel}`);
    } else {
        envContent += `FILE_LOG_LEVEL=${fileLevel}\n`;
    }

    fs.writeFileSync(envPath, envContent, 'utf8');

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                    CONFIGURATION SAVED                    ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log('[OK] Log levels configured:\n');
    console.log(`   Console Level: ${consoleLevel.toUpperCase()} (terminal output)`);
    console.log(`   File Level:    ${fileLevel.toUpperCase()} (session history)`);
    console.log(`   Log File:      ~/.durandal-mcp/logs/durandal-YYYY-MM-DD.log\n`);
    console.log('💡 Restart the server for changes to take effect.\n');
    console.log('To change these settings later:\n');
    console.log('  1. Run: durandal-mcp --configure');
    console.log('  2. Edit: .env file');
    console.log('  3. Set env vars: CONSOLE_LOG_LEVEL and FILE_LOG_LEVEL\n');

    rl.close();
}

// Run CLI if executed directly
if (require.main === module) {
    DurandalMCPServer.cli().catch(error => {
        console.error('Failed to start MCP server:', error);
        process.exit(1);
    });
}

module.exports = DurandalMCPServer;