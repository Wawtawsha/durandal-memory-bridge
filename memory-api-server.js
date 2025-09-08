const express = require('express');
const cors = require('cors');
const UniversalMemorySystem = require('./universal-memory-system');

class MemoryApiServer {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || process.env.MEMORY_API_PORT || 3005;
        this.memorySystem = null;
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        this.app.use(cors({
            origin: ['https://claude.ai', 'https://code.claude.ai'],
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            credentials: true
        }));
        
        this.app.use(express.json({ limit: '10mb' }));
        
        // Simple API key authentication
        this.app.use('/api', (req, res, next) => {
            const apiKey = req.headers['x-api-key'];
            const validKey = process.env.MEMORY_API_KEY || 'durandal-memory-api-key';
            
            if (!apiKey || apiKey !== validKey) {
                return res.status(401).json({ error: 'Invalid API key' });
            }
            next();
        });
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'healthy', 
                timestamp: new Date().toISOString(),
                memorySystemReady: !!this.memorySystem,
                environment: process.env.NODE_ENV || 'development'
            });
        });

        // Initialize memory system for a project
        this.app.post('/api/projects/:projectName/init', async (req, res) => {
            try {
                const projectName = req.params.projectName;
                
                if (!this.memorySystem) {
                    this.memorySystem = new UniversalMemorySystem();
                    await this.memorySystem.initialize();
                }
                
                await this.memorySystem.setProject(projectName);
                const session = await this.memorySystem.setSession('api-session');
                
                res.json({
                    success: true,
                    project: projectName,
                    sessionId: session.id || 'api-session',
                    message: 'Memory system initialized'
                });
            } catch (error) {
                res.status(500).json({ 
                    error: 'Failed to initialize memory system', 
                    details: error.message 
                });
            }
        });

        // Store a message and interact with AI
        this.app.post('/api/sessions/:sessionId/messages', async (req, res) => {
            try {
                const sessionId = req.params.sessionId;
                const { role, content, metadata = {} } = req.body;
                
                if (!role || !content) {
                    return res.status(400).json({ 
                        error: 'Missing required fields: role and content' 
                    });
                }

                // For user messages, send to AI and store the interaction
                if (role === 'user') {
                    const aiResponse = await this.memorySystem.sendMessage(content);
                    
                    res.json({
                        success: true,
                        userMessage: content,
                        aiResponse: aiResponse.response,
                        contextSize: aiResponse.contextSize || 0,
                        tokensUsed: aiResponse.tokensUsed || 0,
                        knowledgeExtracted: aiResponse.knowledgeExtracted || false
                    });
                } else {
                    // For other message types, just acknowledge
                    res.json({
                        success: true,
                        message: 'Message acknowledged',
                        type: role
                    });
                }
            } catch (error) {
                res.status(500).json({ 
                    error: 'Failed to process message', 
                    details: error.message 
                });
            }
        });

        // Get conversation context
        this.app.get('/api/sessions/:sessionId/context', async (req, res) => {
            try {
                const sessionId = req.params.sessionId;
                const limit = parseInt(req.query.limit) || 10;
                
                const recentMessages = await this.memorySystem.getRecentMessages();
                const status = this.memorySystem.getStatus();
                
                res.json({
                    success: true,
                    messages: recentMessages || [],
                    artifacts: status.artifactsCount || 0,
                    totalMessages: recentMessages?.length || 0,
                    project: status.currentProject,
                    session: status.currentSession
                });
            } catch (error) {
                res.status(500).json({ 
                    error: 'Failed to get context', 
                    details: error.message 
                });
            }
        });

        // Search knowledge artifacts
        this.app.get('/api/projects/:projectName/search', async (req, res) => {
            try {
                const projectName = req.params.projectName;
                const { query, limit = 10 } = req.query;
                
                if (!query) {
                    return res.status(400).json({ error: 'Missing search query' });
                }

                // Set project context for search
                await this.memorySystem.setProject(projectName);
                const results = await this.memorySystem.searchMemories(query);
                
                res.json({
                    success: true,
                    query,
                    results: results || [],
                    count: (results || []).length,
                    project: projectName
                });
            } catch (error) {
                res.status(500).json({ 
                    error: 'Failed to search knowledge', 
                    details: error.message 
                });
            }
        });

        // Get system status (acts as project summary)
        this.app.get('/api/projects/:projectName/summary', async (req, res) => {
            try {
                const projectName = req.params.projectName;
                
                await this.memorySystem.setProject(projectName);
                const status = this.memorySystem.getStatus();
                
                res.json({
                    success: true,
                    project: projectName,
                    summary: {
                        currentProject: status.currentProject,
                        currentSession: status.currentSession,
                        provider: status.currentProvider,
                        availableProviders: status.availableProviders,
                        artifactsCount: status.artifactsCount || 0,
                        cost: status.cost
                    }
                });
            } catch (error) {
                res.status(500).json({ 
                    error: 'Failed to get project summary', 
                    details: error.message 
                });
            }
        });

        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({ 
                error: 'Endpoint not found',
                availableEndpoints: [
                    'GET /health',
                    'POST /api/projects/:projectName/init',
                    'POST /api/sessions/:sessionId/messages',
                    'GET /api/sessions/:sessionId/context',
                    'GET /api/projects/:projectName/search',
                    'GET /api/projects/:projectName/summary'
                ]
            });
        });
    }

    async start() {
        try {
            // Start server first, initialize database lazily
            this.server = this.app.listen(this.port, () => {
                console.log(`🚀 Memory API Server running on port ${this.port}`);
                console.log(`📊 Health check: http://localhost:${this.port}/health`);
                console.log(`🔑 API Key required: ${process.env.MEMORY_API_KEY || 'durandal-memory-api-key'}`);
                console.log(`🌍 CORS enabled for Claude Code domains`);
                
                // Initialize database in background
                this.initializeMemorySystem();
            });
            
            return this.server;
        } catch (error) {
            console.error('❌ Failed to start Memory API Server:', error.message);
            throw error;
        }
    }

    async initializeMemorySystem() {
        try {
            console.log('🔄 Initializing memory system...');
            this.memorySystem = new UniversalMemorySystem();
            await this.memorySystem.initialize();
            console.log('✅ Memory system initialized successfully');
        } catch (error) {
            console.warn('⚠️ Memory system initialization failed:', error.message);
            console.log('📋 Server will run in limited mode - some endpoints may not work');
            this.memorySystem = null;
        }
    }

    async stop() {
        if (this.server) {
            this.server.close();
        }
        if (this.memorySystem) {
            await this.memorySystem.close();
        }
    }
}

// Start server if run directly
if (require.main === module) {
    const server = new MemoryApiServer();
    
    server.start().catch(error => {
        console.error('Failed to start server:', error);
        process.exit(1);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
        console.log('Shutting down Memory API Server...');
        await server.stop();
        process.exit(0);
    });
}

module.exports = MemoryApiServer;