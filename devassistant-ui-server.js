/**
 * DevAssistant UI Server - Modern API Backend
 * Showcases all Phase 1-4 capabilities with a clean REST API
 */

const express = require('express');
const http = require('http');
const path = require('path');
const DevAssistant = require('./dev-assistant');

class DevAssistantUIServer {
    constructor(options = {}) {
        this.app = express();
        this.server = http.createServer(this.app);
        this.port = options.port || process.env.PORT || 3002;
        this.assistant = null;
        
        this.setupMiddleware();
        this.setupRoutes();
        this.initializeAssistant();
    }
    
    setupMiddleware() {
        // Basic middleware
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));
        
        // CORS for development
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            next();
        });
        
        // Serve static files
        this.app.use('/static', express.static(path.join(__dirname, '.')));
        
        // Serve workspace selector UI script
        this.app.get('/workspace-selector-ui.js', (req, res) => {
            res.sendFile(path.join(__dirname, 'workspace-selector-ui.js'));
        });
        
        // Request logging
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
            next();
        });
    }
    
    async initializeAssistant() {
        try {
            console.log('🚀 Initializing DevAssistant...');
            this.assistant = new DevAssistant({
                workspaceRoot: process.cwd()
            });
            
            // Wait for initialization to complete
            setTimeout(() => {
                console.log('✅ DevAssistant ready for UI requests!');
            }, 3000);
            
        } catch (error) {
            console.error('❌ Failed to initialize DevAssistant:', error.message);
        }
    }
    
    setupRoutes() {
        // Serve the main UI
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'devassistant-ui.html'));
        });
        
        // Health check
        this.app.get('/api/health', async (req, res) => {
            try {
                const health = this.assistant ? await this.assistant.getSystemHealth() : { status: 'initializing' };
                res.json({
                    status: 'ok',
                    timestamp: new Date().toISOString(),
                    assistant: this.assistant ? 'ready' : 'initializing',
                    health: health.handled ? health.result : health
                });
            } catch (error) {
                res.json({
                    status: 'error',
                    error: error.message,
                    assistant: 'error'
                });
            }
        });
        
        // === PHASE A: DEEP DEBUGGING & INTROSPECTION ===
        
        // Debug endpoint for data structure inspection
        this.app.get('/api/debug/data-structures', async (req, res) => {
            try {
                if (!this.assistant) {
                    return res.json({
                        status: 'no_assistant',
                        error: 'DevAssistant instance not created',
                        debug: {
                            assistantInstance: false,
                            serverUptime: process.uptime(),
                            memoryUsage: process.memoryUsage()
                        }
                    });
                }

                // Deep introspection of data structures
                const debug = {
                    // Instance status
                    assistantInstance: !!this.assistant,
                    assistantConstructed: !!this.assistant.semanticIndexing,
                    
                    // Semantic indexing data
                    semanticIndexing: {
                        instanceExists: !!this.assistant.semanticIndexing,
                        codeEmbeddingsSize: this.assistant.semanticIndexing?.codeEmbeddings?.size || 0,
                        fileIndexSize: this.assistant.semanticIndexing?.fileIndex?.size || 0,
                        workspaceRoot: this.assistant.semanticIndexing?.workspaceRoot || 'not set',
                        embeddingDimension: this.assistant.semanticIndexing?.embeddingDimension || 0
                    },
                    
                    // Knowledge graph data
                    knowledgeGraph: {
                        instanceExists: !!this.assistant.knowledgeGraph,
                        nodesSize: this.assistant.knowledgeGraph?.nodes?.size || 0,
                        relationshipsSize: this.assistant.knowledgeGraph?.edges?.size || 0,
                        graphData: (this.assistant.knowledgeGraph?.nodes?.size > 0) ? 'populated' : 'empty'
                    },
                    
                    // Predictive file suggestions
                    predictiveFiles: {
                        instanceExists: !!this.assistant.predictiveFiles,
                        trainingDataSize: this.assistant.predictiveFiles?.fileAccessHistory?.length || 0,
                        modelsInitialized: !!(this.assistant.predictiveFiles?.sequentialPatternMiner && this.assistant.predictiveFiles?.contextVectorModel),
                        cacheSize: this.assistant.predictiveFiles?.predictionCache?.size || 0
                    },
                    
                    // Advanced search interface
                    advancedSearch: {
                        instanceExists: !!this.assistant.advancedSearch,
                        searchHistorySize: this.assistant.advancedSearch?.searchHistory?.length || 0,
                        contextualMemorySize: this.assistant.advancedSearch?.contextualMemory?.size || 0
                    },
                    
                    // System status
                    system: {
                        serverUptime: process.uptime(),
                        memoryUsage: process.memoryUsage(),
                        initializationTime: new Date().toISOString(),
                        nodeVersion: process.version
                    }
                };

                res.json({
                    status: 'success',
                    timestamp: new Date().toISOString(),
                    debug
                });

            } catch (error) {
                res.status(500).json({
                    status: 'error',
                    error: error.message,
                    stack: error.stack
                });
            }
        });

        // Initialization readiness check
        this.app.get('/api/debug/initialization-status', async (req, res) => {
            try {
                const status = {
                    assistant: {
                        created: !!this.assistant,
                        phase3Ready: false,
                        phase4Ready: false
                    },
                    components: {},
                    readiness: {
                        canAcceptSearches: false,
                        canBuildGraphs: false,
                        canPredict: false,
                        overallReady: false
                    }
                };

                if (this.assistant) {
                    // Check Phase 3 readiness
                    status.assistant.phase3Ready = !!this.assistant.phase3;
                    
                    // Check Phase 4 component readiness
                    status.components.semanticIndexing = {
                        exists: !!this.assistant.semanticIndexing,
                        hasData: (this.assistant.semanticIndexing?.codeEmbeddings?.size || 0) > 0
                    };
                    
                    status.components.knowledgeGraph = {
                        exists: !!this.assistant.knowledgeGraph,
                        hasData: (this.assistant.knowledgeGraph?.nodes?.length || 0) > 0
                    };
                    
                    status.components.predictiveFiles = {
                        exists: !!this.assistant.predictiveFiles,
                        hasData: (this.assistant.predictiveFiles?.trainingData?.length || 0) > 0
                    };
                    
                    status.components.advancedSearch = {
                        exists: !!this.assistant.advancedSearch,
                        hasData: true // This one should always work
                    };

                    // Overall readiness assessment
                    status.readiness.canAcceptSearches = status.components.semanticIndexing.hasData;
                    status.readiness.canBuildGraphs = status.components.knowledgeGraph.exists;
                    status.readiness.canPredict = status.components.predictiveFiles.exists;
                    status.readiness.overallReady = status.assistant.phase3Ready && 
                                                   status.components.semanticIndexing.exists &&
                                                   status.components.knowledgeGraph.exists;
                }

                res.json({
                    status: 'success',
                    timestamp: new Date().toISOString(),
                    initialization: status
                });

            } catch (error) {
                res.status(500).json({
                    status: 'error',
                    error: error.message
                });
            }
        });

        // Sample data inspection endpoint
        this.app.get('/api/debug/sample-data', async (req, res) => {
            try {
                if (!this.assistant) {
                    return res.status(503).json({ error: 'Assistant not initialized' });
                }

                const samples = {
                    codeEmbeddings: [],
                    fileIndex: [],
                    knowledgeNodes: [],
                    searchHistory: []
                };

                // Sample code embeddings
                if (this.assistant.semanticIndexing?.codeEmbeddings) {
                    const keys = Array.from(this.assistant.semanticIndexing.codeEmbeddings.keys()).slice(0, 3);
                    samples.codeEmbeddings = keys.map(key => ({
                        fileId: key,
                        embeddingLength: this.assistant.semanticIndexing.codeEmbeddings.get(key)?.length || 0
                    }));
                }

                // Sample file index
                if (this.assistant.semanticIndexing?.fileIndex) {
                    const entries = Array.from(this.assistant.semanticIndexing.fileIndex.entries()).slice(0, 3);
                    samples.fileIndex = entries.map(([key, value]) => ({
                        fileId: key,
                        path: value?.path,
                        language: value?.language
                    }));
                }

                // Sample knowledge nodes
                if (this.assistant.knowledgeGraph?.nodes && Array.isArray(this.assistant.knowledgeGraph.nodes)) {
                    samples.knowledgeNodes = this.assistant.knowledgeGraph.nodes.slice(0, 3).map(node => ({
                        id: node.id,
                        type: node.type,
                        label: node.label
                    }));
                } else {
                    samples.knowledgeNodes = [];
                }

                // Sample search history
                if (this.assistant.advancedSearch?.searchHistory) {
                    samples.searchHistory = this.assistant.advancedSearch.searchHistory.slice(-3);
                }

                res.json({
                    status: 'success',
                    timestamp: new Date().toISOString(),
                    samples
                });

            } catch (error) {
                res.status(500).json({
                    status: 'error',
                    error: error.message
                });
            }
        });

        // Readiness gate middleware for AI endpoints
        const requireReadiness = (req, res, next) => {
            if (!this.assistant) {
                return res.status(503).json({
                    success: false,
                    error: 'DevAssistant not initialized. Server is starting up.',
                    retryAfter: 5
                });
            }

            // Check if semantic indexing has data for search endpoints
            if (req.path.includes('semantic-search') || req.path.includes('find-similar')) {
                const hasEmbeddings = (this.assistant.semanticIndexing?.codeEmbeddings?.size || 0) > 0;
                if (!hasEmbeddings) {
                    return res.status(503).json({
                        success: false,
                        error: 'Semantic search not ready. Indexing may still be in progress.',
                        hint: 'Try /api/debug/data-structures to check status',
                        retryAfter: 10
                    });
                }
            }

            // Check knowledge graph for graph endpoints
            if (req.path.includes('knowledge-graph')) {
                const hasNodes = (this.assistant.knowledgeGraph?.nodes?.length || 0) > 0;
                if (!hasNodes) {
                    return res.status(503).json({
                        success: false,
                        error: 'Knowledge graph not ready. Building may still be in progress.',
                        hint: 'Try /api/debug/initialization-status to check status',
                        retryAfter: 10
                    });
                }
            }

            next();
        };
        
        // === PHASE 4: SEMANTIC SEARCH & AI FEATURES ===
        
        // Semantic search (with readiness gate)
        this.app.post('/api/semantic-search', requireReadiness, async (req, res) => {
            try {
                const { query, options = {} } = req.body;
                if (!this.assistant) throw new Error('Assistant not ready');
                
                const results = await this.assistant.semanticSearch(query, options);
                res.json({
                    success: true,
                    query,
                    results: results.results || [],
                    searchType: 'semantic'
                });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        
        // Find similar code
        this.app.post('/api/find-similar', requireReadiness, async (req, res) => {
            try {
                const { filePath, options = {} } = req.body;
                if (!this.assistant) throw new Error('Assistant not ready');
                
                const results = await this.assistant.findSimilarCode(filePath, options);
                res.json({
                    success: true,
                    results
                });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        
        // AI code quality analysis
        this.app.post('/api/analyze-quality', async (req, res) => {
            try {
                const { filePath } = req.body;
                if (!this.assistant) throw new Error('Assistant not ready');
                
                const analysis = await this.assistant.analyzeCodeQuality(filePath);
                res.json({
                    success: true,
                    analysis
                });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        
        // Predictive file suggestions
        this.app.post('/api/predict-files', async (req, res) => {
            try {
                const { context = {}, limit = 10 } = req.body;
                if (!this.assistant) throw new Error('Assistant not ready');
                
                const predictions = await this.assistant.predictFiles(context, limit);
                res.json({
                    success: true,
                    predictions
                });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        
        // Generate documentation
        this.app.post('/api/generate-docs', async (req, res) => {
            try {
                const { filePath, options = {} } = req.body;
                if (!this.assistant) throw new Error('Assistant not ready');
                
                const docs = await this.assistant.generateDocumentation(filePath, options);
                res.json({
                    success: true,
                    documentation: docs
                });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        
        // Refactoring suggestions
        this.app.post('/api/suggest-refactoring', async (req, res) => {
            try {
                const { filePath, options = {} } = req.body;
                if (!this.assistant) throw new Error('Assistant not ready');
                
                const suggestions = await this.assistant.suggestRefactoring(filePath, options);
                res.json({
                    success: true,
                    suggestions
                });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        
        // Build knowledge graph
        this.app.post('/api/knowledge-graph', requireReadiness, async (req, res) => {
            try {
                const { directoryPath = '.' } = req.body;
                if (!this.assistant) throw new Error('Assistant not ready');
                
                const graph = await this.assistant.buildKnowledgeGraph(directoryPath);
                res.json({
                    success: true,
                    graph
                });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        
        // === PHASE 3: ADVANCED COMMANDS ===
        
        // Context mode management
        this.app.post('/api/context-mode', async (req, res) => {
            try {
                const { mode } = req.body;
                if (!this.assistant) throw new Error('Assistant not ready');
                
                await this.assistant.setContextMode(mode);
                res.json({
                    success: true,
                    mode,
                    message: `Context mode set to ${mode}`
                });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        
        // Search knowledge base
        this.app.post('/api/search-knowledge', async (req, res) => {
            try {
                const { query } = req.body;
                if (!this.assistant) throw new Error('Assistant not ready');
                
                const results = await this.assistant.searchKnowledge(query);
                res.json({
                    success: true,
                    results
                });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        
        // === CORE FEATURES ===
        
        // Project analysis
        this.app.get('/api/workspace-info', async (req, res) => {
            try {
                if (!this.assistant) throw new Error('Assistant not ready');
                
                const info = await this.assistant.getWorkspaceInfo();
                res.json({
                    success: true,
                    workspace: info
                });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        
        // Analyze code file
        this.app.post('/api/analyze-code', async (req, res) => {
            try {
                const { filePath } = req.body;
                if (!this.assistant) throw new Error('Assistant not ready');
                
                const analysis = await this.assistant.analyzeCode(filePath);
                res.json({
                    success: true,
                    analysis
                });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        
        // Get help
        this.app.get('/api/help', async (req, res) => {
            try {
                if (!this.assistant) throw new Error('Assistant not ready');
                
                const help = await this.assistant.help();
                res.json({
                    success: true,
                    help
                });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        
        // Index workspace
        this.app.post('/api/index-workspace', async (req, res) => {
            try {
                const { directoryPath = '.' } = req.body;
                if (!this.assistant) throw new Error('Assistant not ready');
                
                const results = await this.assistant.indexWorkspace(directoryPath);
                res.json({
                    success: true,
                    results
                });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        
        // === WORKSPACE MANAGEMENT ENDPOINTS ===
        
        // Initialize workspace manager
        const WorkspaceManager = require('./workspace-manager');
        this.workspaceManager = new WorkspaceManager();
        
        // Get recent workspaces
        this.app.get('/api/workspace/recent', async (req, res) => {
            try {
                const recent = this.workspaceManager.getRecentWorkspaces();
                res.json(recent);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        // Validate workspace path
        this.app.post('/api/workspace/validate', async (req, res) => {
            try {
                const { path } = req.body;
                if (!path) {
                    return res.status(400).json({ valid: false, error: 'Path is required' });
                }
                
                const result = await this.workspaceManager.validateWorkspace(path);
                res.json(result);
            } catch (error) {
                res.status(500).json({ valid: false, error: error.message });
            }
        });
        
        // Set workspace
        this.app.post('/api/workspace/set', async (req, res) => {
            try {
                const { path } = req.body;
                if (!path) {
                    return res.status(400).json({ success: false, error: 'Path is required' });
                }
                
                const result = await this.workspaceManager.setWorkspace(path);
                
                if (result.success) {
                    // Re-initialize DevAssistant with new workspace
                    console.log('🔄 Re-initializing DevAssistant with new workspace...');
                    await this.initializeAssistant(path);
                }
                
                res.json(result);
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        
        // Reset to default workspace
        this.app.post('/api/workspace/reset', async (req, res) => {
            try {
                const defaultPath = this.workspaceManager.resetToDefault();
                await this.initializeAssistant(defaultPath);
                
                res.json({ 
                    success: true, 
                    path: defaultPath,
                    message: 'Workspace reset to default'
                });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        
        // Get current workspace info
        this.app.get('/api/workspace/current', (req, res) => {
            try {
                const current = this.workspaceManager.getCurrentWorkspace();
                res.json(current);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }
    
    async initializeAssistant(workspacePath = null) {
        // Re-initialize DevAssistant with new workspace
        const DevAssistant = require('./dev-assistant');
        const assistantOptions = workspacePath ? { workspaceRoot: workspacePath } : {};
        
        this.assistant = new DevAssistant(assistantOptions);
        await this.assistant.initializePhase4();
        
        console.log(`✅ DevAssistant re-initialized with workspace: ${workspacePath || 'default'}`);
    }
    
    start() {
        this.server.listen(this.port, () => {
            console.log('🎨 DevAssistant UI Server');
            console.log('='.repeat(40));
            console.log(`🌐 Server: http://localhost:${this.port}`);
            console.log(`📊 API: http://localhost:${this.port}/api/health`);
            console.log(`🚀 Ready to showcase all 4 phases!`);
            console.log('='.repeat(40));
        });
    }
    
    stop() {
        this.server.close();
    }
}

// Start server if called directly
if (require.main === module) {
    const server = new DevAssistantUIServer();
    server.start();
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down DevAssistant UI server...');
        server.stop();
        process.exit(0);
    });
}

module.exports = DevAssistantUIServer;