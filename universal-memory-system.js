const UniversalApiGateway = require('./universal-api-gateway');
const RAMR = require('./ramr');
const DatabaseAdapter = require('./db-adapter');
const KnowledgeAnalyzer = require('./knowledge-analyzer');

class UniversalMemorySystem {
    constructor(projectRoot = process.cwd()) {
        this.gateway = new UniversalApiGateway();
        this.db = new DatabaseAdapter();
        this.knowledgeAnalyzer = new KnowledgeAnalyzer();
        this.ramr = new RAMR('./universal-ramr.db', this.knowledgeAnalyzer);
        this.projectRoot = projectRoot;
        
        this.currentProvider = 'claude';
        this.currentProject = null;
        this.currentSession = null;
        
        this.config = {
            maxContextTokens: 4096,
            recentMessageCount: 6,
            maxArtifacts: 5,
            memoryEnabled: true
        };
    }

    async initialize() {
        console.log('🧠 Initializing Universal Memory System...');
        
        try {
            // Test database connection
            const dbTest = await this.db.testConnection();
            if (!dbTest.success) {
                console.warn('⚠️  Database connection failed:', dbTest.error);
            }

            // Initialize RAMR cache system
            await this.ramr.initialize();
            console.log('✅ RAMR cache system initialized');

            // Test API connections
            const connectionTests = await this.gateway.testAllConnections();
            console.log('✅ API gateway initialized');
            
            console.log('✅ Memory system initialized successfully');
            console.log(`📡 Available providers: ${this.gateway.getAvailableProviders().join(', ')}`);
            
            return {
                database: dbTest,
                ramr: { success: true },
                connections: connectionTests
            };
        } catch (error) {
            console.error('❌ Memory system initialization failed:', error.message);
            return {
                database: { success: false, error: error.message },
                ramr: { success: false, error: error.message },
                connections: {}
            };
        }
    }

    async setProvider(provider) {
        const available = this.gateway.getAvailableProviders();
        if (!available.includes(provider.toLowerCase())) {
            throw new Error(`Provider '${provider}' not available. Available: ${available.join(', ')}`);
        }
        
        this.currentProvider = provider.toLowerCase();
        console.log(`🔄 Switched to provider: ${provider}`);
    }

    async setProject(projectName) {
        try {
            let project = await this.db.getProjectByName(projectName);
            
            if (!project) {
                project = await this.db.createProject(projectName, this.projectRoot);
                console.log(`📁 Created new project: ${projectName}`);
            }
            
            this.currentProject = project;
            return project;
        } catch (error) {
            console.log(`⚠️  Project handling error: ${error.message}`);
            this.currentProject = { id: 'default', name: projectName };
            return this.currentProject;
        }
    }

    async setSession(sessionName = 'default') {
        if (!this.currentProject) {
            throw new Error('Project must be set before creating session');
        }

        try {
            let session = await this.db.getSessionByName(this.currentProject.id, sessionName);
            
            if (!session) {
                session = await this.db.createSession(this.currentProject.id, sessionName);
                console.log(`💬 Created new session: ${sessionName}`);
            }
            
            this.currentSession = session;
            return session;
        } catch (error) {
            console.log(`⚠️  Session handling error: ${error.message}`);
            this.currentSession = { id: 'default', name: sessionName };
            return this.currentSession;
        }
    }

    async sendMessage(message, options = {}) {
        if (!this.currentProject || !this.currentSession) {
            throw new Error('Project and session must be set before sending messages');
        }

        const context = await this.buildContext(message);
        const enhancedMessage = this.enhanceMessageWithContext(message, context);
        
        const response = await this.gateway.sendMessage(
            this.currentProvider, 
            enhancedMessage, 
            options
        );

        await this.storeInteraction(message, response, context);
        
        return {
            response,
            context: context.metadata,
            provider: this.currentProvider,
            cost: this.gateway.getCostSummary()
        };
    }

    async buildContext(userMessage) {
        if (!this.config.memoryEnabled) {
            return { context: '', metadata: { memoryEnabled: false } };
        }

        try {
            const recentMessages = await this.getRecentMessages();
            const relevantArtifacts = await this.getRelevantMemories(userMessage);
            
            return {
                recentMessages,
                relevantArtifacts,
                metadata: {
                    messageCount: recentMessages.length,
                    artifactCount: relevantArtifacts.length,
                    provider: this.currentProvider,
                    memoryEnabled: true
                }
            };
        } catch (error) {
            console.warn('Context building warning:', error.message);
            return { context: '', metadata: { error: error.message } };
        }
    }

    enhanceMessageWithContext(message, context) {
        if (!context.recentMessages?.length && !context.relevantArtifacts?.length) {
            return message;
        }

        let enhanced = '';

        if (context.recentMessages?.length > 0) {
            enhanced += 'Recent conversation:\n';
            context.recentMessages.forEach(msg => {
                enhanced += `${msg.role}: ${msg.content}\n`;
            });
            enhanced += '\n';
        }

        if (context.relevantArtifacts?.length > 0) {
            enhanced += 'Relevant memories:\n';
            context.relevantArtifacts.forEach(artifact => {
                enhanced += `- ${artifact.summary || artifact.content}\n`;
            });
            enhanced += '\n';
        }

        enhanced += `Current message: ${message}`;
        return enhanced;
    }

    async getRecentMessages() {
        if (!this.currentSession?.id || !this.db) return [];
        
        try {
            // Ensure session ID is valid integer
            const sessionId = parseInt(this.currentSession.id);
            if (isNaN(sessionId)) {
                console.warn('Invalid session ID:', this.currentSession.id);
                return [];
            }
            
            const messages = await this.db.getConversationHistory(
                sessionId, 
                this.config.recentMessageCount
            );
            return messages || [];
        } catch (error) {
            console.warn('Recent messages error:', error.message);
            return [];
        }
    }

    async getRelevantMemories(userMessage) {
        try {
            const cacheKey = `memory:${Buffer.from(userMessage).toString('base64').slice(0, 32)}`;
            let memories = await this.ramr.get(cacheKey);
            
            if (!memories) {
                memories = await this.searchMemories(userMessage);
                if (memories && memories.length > 0) {
                    await this.ramr.set(cacheKey, memories, { ttl: 30 * 60 * 1000 }); // 30 min cache
                }
            }
            
            return memories || [];
        } catch (error) {
            console.warn('Memory retrieval error:', error.message);
            return [];
        }
    }

    async searchMemories(userMessage) {
        if (!this.db) return [];
        
        try {
            return await this.db.searchArtifacts(userMessage, this.config.maxArtifacts);
        } catch (error) {
            return [];
        }
    }

    async storeInteraction(userMessage, aiResponse, context) {
        try {
            if (this.db && this.currentSession?.id) {
                // Ensure session ID is valid integer
                const sessionId = parseInt(this.currentSession.id);
                if (!isNaN(sessionId)) {
                    await this.db.saveMessage(sessionId, 'user', userMessage);
                    await this.db.saveMessage(sessionId, 'assistant', aiResponse);
                } else {
                    console.warn('Cannot save messages: invalid session ID:', this.currentSession.id);
                }
            }

            if (this.knowledgeAnalyzer && this.config.memoryEnabled) {
                await this.extractAndStoreKnowledge(userMessage, aiResponse);
            }
        } catch (error) {
            console.warn('Storage warning:', error.message);
        }
    }

    async extractAndStoreKnowledge(userMessage, aiResponse) {
        try {
            const knowledge = await this.knowledgeAnalyzer.analyze(
                `User: ${userMessage}\nAssistant: ${aiResponse}`, 
                this.currentProject?.id
            );
            
            if (knowledge && knowledge.artifacts?.length > 0) {
                console.log(`💡 Extracted ${knowledge.artifacts.length} insights`);
            }
        } catch (error) {
            console.warn('Knowledge extraction warning:', error.message);
        }
    }

    getStatus() {
        return {
            provider: this.currentProvider,
            availableProviders: this.gateway.getAvailableProviders(),
            project: this.currentProject?.name || 'none',
            session: this.currentSession?.name || 'none',
            memoryEnabled: this.config.memoryEnabled,
            cost: this.gateway.getCostSummary()
        };
    }

    async cleanup() {
        if (this.ramr) await this.ramr.close();
        if (this.db) await this.db.close();
    }
}

module.exports = UniversalMemorySystem;