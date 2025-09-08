/*
 * Durandal AI Assistant - Main Application
 * © 2025 ENTDNA. All Rights Reserved.
 * 
 * PROPRIETARY SOFTWARE - CONFIDENTIAL
 * This software is provided for authorized testing only.
 * Unauthorized copying, distribution, reverse engineering, or commercial use is strictly prohibited.
 */

const ClaudeClient = require('./claude-client');
const ClaudeMemoryDB = require('./db-client');
const ContextManager = require('./context-manager');
const KnowledgeAnalyzer = require('./knowledge-analyzer');
const readline = require('readline');
const fs = require('fs').promises;
const path = require('path');

class DurandalAI {
    constructor() {
        this.claude = new ClaudeClient();
        this.db = new ClaudeMemoryDB();
        this.knowledgeAnalyzer = new KnowledgeAnalyzer();
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        // Session state
        this.currentProject = null;
        this.currentSession = null;
        this.conversationHistory = [];
        this.projectRoot = process.cwd();
        
        // Context Manager integration (NEW - solves context fatigue)
        this.contextManager = null;
        
        // Conversation tracking
        this.messageCount = 0;
        this.sessionStartTime = null;
        this.extractionStats = {
            totalExtractions: 0,
            sessionExtractions: 0,
            lastExtractionTime: null
        };
        
        // Configuration
        this.config = {
            enableKnowledgeExtraction: true,
            extractionNotificationLevel: 'brief', // 'silent', 'brief', 'verbose'
            maxConversationHistory: 100 // Prevent memory bloat
        };
    }

    async start() {
        console.log('🗡️  Durandal AI Assistant - Enhanced with Intelligent Context Management');
        console.log('==================================================================');
        console.log('🛡️  Your persistent AI companion with perfect memory and context awareness');
        console.log('');
        
        try {
            // Test connections and initialize systems
            await this.testConnections();
            await this.initializeIntelligentSystems();
            
            // Initialize project and session
            await this.initializeProject();
            await this.selectOrCreateSession();
            
            // Start the enhanced chat experience
            this.chat();
            
        } catch (error) {
            console.error('❌ Durandal startup failed:', error.message);
            process.exit(1);
        }
    }

    async testConnections() {
        console.log('📡 Testing system connections...');
        
        // Test Claude API
        const claudeTest = await this.claude.testConnection();
        if (!claudeTest.success) {
            throw new Error(`Claude API failed: ${claudeTest.error}`);
        }
        console.log('✅ Claude API connected');
        
        // Test Database
        const dbTest = await this.db.testConnection();
        if (!dbTest.success) {
            throw new Error(`Database failed: ${dbTest.error}`);
        }
        console.log('✅ PostgreSQL database connected');
        
        console.log('');
    }

    async initializeIntelligentSystems() {
        console.log('🧠 Initializing intelligent systems...');
        
        try {
            // Initialize knowledge analyzer
            console.log('🔍 Loading knowledge extraction engine...');
            // Knowledge analyzer is already instantiated, no async init needed
            
            // Initialize context manager with RAMR
            console.log('⚡ Initializing RAMR and Context Manager...');
            this.contextManager = new ContextManager(
                this.db, 
                this.knowledgeAnalyzer, 
                this.claude, 
                this.projectRoot
            );
            await this.contextManager.initialize();
            
            console.log('✅ All intelligent systems online');
            console.log('');
        } catch (error) {
            console.error('❌ Intelligent systems initialization failed:', error.message);
            throw error;
        }
    }

    async initializeProject() {
        const projectName = path.basename(this.projectRoot);
        console.log(`📁 Initializing project: ${projectName}`);
        
        // Get or create project
        let project = await this.db.getProject(projectName);
        if (!project) {
            project = await this.db.createProject(
                projectName,
                `Durandal AI Assistant project in ${this.projectRoot}`,
                {
                    location: this.projectRoot,
                    type: 'durandal_ai_project',
                    version: '2.0_with_context_management',
                    created_by: 'durandal_ai_assistant'
                }
            );
            console.log(`✅ Created new project: ${project.name}`);
        } else {
            console.log(`✅ Loaded existing project: ${project.name}`);
        }
        
        this.currentProject = project;
        
        // Save initial project state with file structure
        await this.captureProjectState();
    }

    async selectOrCreateSession() {
        console.log('\n💬 Conversation Session Selection:');
        
        // Get recent sessions
        const recentSessions = await this.db.getConversationHistory(this.currentProject.id, 10);
        
        if (recentSessions.length > 0) {
            console.log('\nRecent conversation topics:');
            recentSessions.forEach((session, index) => {
                const date = new Date(session.started_at).toLocaleDateString();
                const name = session.session_name || `Session ${session.id}`;
                console.log(`${index + 1}. ${name} (${date})`);
            });
            
            console.log(`${recentSessions.length + 1}. 🆕 Start new conversation topic`);
            
            const choice = await this.askQuestion('\nSelect option (number): ');
            const choiceNum = parseInt(choice.trim());
            
            if (choiceNum >= 1 && choiceNum <= recentSessions.length) {
                // Load existing session
                const selectedSession = recentSessions[choiceNum - 1];
                await this.loadExistingSession(selectedSession);
                return;
            }
        }
        
        // Create new session
        await this.createNewSession();
    }

    async loadExistingSession(session) {
        console.log(`\n📂 Loading conversation: ${session.session_name || `Session ${session.id}`}`);
        
        this.currentSession = session;
        
        // Load conversation context if available
        if (session.context_dump) {
            this.conversationHistory = session.context_dump.messages || [];
            console.log(`✅ Loaded ${this.conversationHistory.length} previous messages`);
            
            if (this.conversationHistory.length > 0) {
                console.log('\n📜 Recent conversation context:');
                const recentMessages = this.conversationHistory.slice(-3);
                recentMessages.forEach(msg => {
                    const preview = msg.content.length > 100 ? 
                        msg.content.substring(0, 100) + '...' : msg.content;
                    console.log(`${msg.role === 'user' ? '👤' : '🤖'} ${preview}`);
                });
            }
        }
        
        console.log(`\n🎯 Continuing conversation: ${session.session_name}`);
        console.log('🧠 Intelligent context management active - no context fatigue!');
        console.log('Type "/commands" to see available commands, or just start chatting!\n');
    }

    async createNewSession() {
        const topicName = await this.askQuestion('\n🎯 Enter conversation topic/name: ');
        
        const session = await this.db.startConversationSession(
            this.currentProject.id, 
            topicName.trim() || `Session ${Date.now()}`
        );
        
        this.currentSession = session;
        this.sessionStartTime = new Date();
        
        console.log(`✅ Started new conversation: ${session.session_name || session.id}`);
        console.log('🧠 Intelligent context management active - perfect memory enabled!');
        console.log('Type "/commands" to see available commands, or just start chatting!\n');
    }

    async captureProjectState() {
        try {
            const fileStructure = await this.getFileStructure(this.projectRoot);
            const systemInfo = await this.getSystemInfo();
            
            const fullState = {
                timestamp: new Date().toISOString(),
                project_root: this.projectRoot,
                file_structure: fileStructure,
                system_info: systemInfo,
                durandal_version: '2.0_with_context_management',
                features: [
                    'intelligent_context_management',
                    'ramr_caching',
                    'knowledge_extraction',
                    'conversation_persistence',
                    'file_tracking'
                ]
            };
            
            await this.db.saveProjectState(
                this.currentProject.id,
                'Auto-captured state',
                fullState,
                fileStructure,
                systemInfo,
                true
            );
            
        } catch (error) {
            console.log('⚠️  Could not capture complete project state:', error.message);
        }
    }

    async getFileStructure(dir, maxDepth = 3, currentDepth = 0) {
        if (currentDepth >= maxDepth) return null;
        
        try {
            const items = await fs.readdir(dir);
            const structure = {};
            
            for (const item of items) {
                // Skip node_modules and hidden files for now
                if (item.startsWith('.') || item === 'node_modules') continue;
                
                const fullPath = path.join(dir, item);
                const stats = await fs.stat(fullPath);
                
                if (stats.isDirectory()) {
                    structure[item] = {
                        type: 'directory',
                        children: await this.getFileStructure(fullPath, maxDepth, currentDepth + 1)
                    };
                } else {
                    structure[item] = {
                        type: 'file',
                        size: stats.size,
                        modified: stats.mtime.toISOString()
                    };
                }
            }
            
            return structure;
        } catch (error) {
            return { error: error.message };
        }
    }

    async getSystemInfo() {
        return {
            nodejs_version: process.version,
            platform: process.platform,
            working_directory: process.cwd(),
            uptime: process.uptime(),
            memory_usage: process.memoryUsage(),
            durandal_features: {
                context_management: true,
                ramr_caching: true,
                knowledge_extraction: true,
                conversation_persistence: true
            }
        };
    }

    async chat() {
        this.rl.question('You: ', async (input) => {
            if (input.toLowerCase() === 'exit') {
                await this.handleExit();
                return;
            }

            // Handle commands
            if (input.startsWith('/')) {
                await this.handleCommand(input);
                this.chat();
                return;
            }

            try {
                console.log('🧠 Building intelligent context...');
                
                // CRITICAL FIX: Add user message to history BEFORE building context
                const userMessage = { role: 'user', content: input, timestamp: new Date().toISOString() };
                this.conversationHistory.push(userMessage);
                
                // NEW: Use intelligent context management with CURRENT conversation history
                const contextResult = await this.contextManager.buildIntelligentContext(
                    input,
                    this.conversationHistory, // This now includes the current user message
                    this.currentProject,
                    this.currentSession
                );
                
                console.log('🤖 Durandal is thinking...');
                
                // Send the intelligently constructed context to Claude with dynamic token allocation
                const contextSize = contextResult.contextPrompt.length;
                const response = await this.claude.sendMessage(contextResult.contextPrompt, {
                    contextSize: contextSize
                });
                console.log(`🤖 Durandal: ${response}\n`);
                
                // Add assistant response to conversation history
                const assistantMessage = { role: 'assistant', content: response, timestamp: new Date().toISOString() };
                this.conversationHistory.push(assistantMessage);
                
                this.messageCount += 2;
                
                // Limit conversation history to prevent memory bloat
                if (this.conversationHistory.length > this.config.maxConversationHistory) {
                    const overflow = this.conversationHistory.length - this.config.maxConversationHistory;
                    this.conversationHistory = this.conversationHistory.slice(overflow);
                }
                
                // Enhanced knowledge extraction (if enabled)
                if (this.config.enableKnowledgeExtraction) {
                    await this.performKnowledgeExtraction(userMessage, assistantMessage);
                }
                
            } catch (error) {
                console.error('❌ Error:', error.message);
                
                // If context management fails completely, inform user
                if (error.message.includes('Context Management Complete Failure')) {
                    console.log('⚠️  Context management system failure detected.');
                    console.log('Durandal cannot continue without proper context awareness.');
                    console.log('Please restart Durandal or contact support if the issue persists.');
                    return;
                }
            }

            this.chat();
        });
    }

    // Enhanced knowledge extraction with better error handling
    async performKnowledgeExtraction(userMessage, assistantMessage) {
        try {
            // Extract from assistant's response (most valuable)
            const extractionResult = await this.knowledgeAnalyzer.analyzeContent(assistantMessage.content);
            
            if (extractionResult.should_extract) {
                const extractedKnowledge = await this.db.saveExtractedKnowledge(
                    this.currentProject.id,
                    extractionResult,
                    assistantMessage.content,
                    {
                        user_query: userMessage.content,
                        session_id: this.currentSession.id,
                        conversation_context: this.currentSession.session_name,
                        extraction_source: 'automatic_assistant_response'
                    }
                );
                
                this.extractionStats.totalExtractions++;
                this.extractionStats.sessionExtractions++;
                this.extractionStats.lastExtractionTime = new Date();
                
                // Show extraction notification based on configuration
                this.showExtractionNotification(extractionResult, extractedKnowledge);
            }
            
        } catch (error) {
            if (this.config.extractionNotificationLevel !== 'silent') {
                console.log('⚠️  Knowledge extraction encountered an issue:', error.message);
            }
        }
    }

    showExtractionNotification(extractionResult, extractedKnowledge) {
        if (this.config.extractionNotificationLevel === 'silent') return;
        
        if (this.config.extractionNotificationLevel === 'brief') {
            console.log(`💡 Extracted: ${extractionResult.category} knowledge (relevance: ${extractionResult.relevance_score})`);
        } else if (this.config.extractionNotificationLevel === 'verbose') {
            console.log(`💡 Knowledge Extracted:`);
            console.log(`   Type: ${extractionResult.category}`);
            console.log(`   Relevance: ${extractionResult.relevance_score}/10`);
            console.log(`   Tags: ${extractionResult.tags.join(', ')}`);
            console.log(`   ID: ${extractedKnowledge.id}`);
        }
    }

    async handleCommand(input) {
        const [command, ...args] = input.slice(1).split(' ');
        
        switch (command.toLowerCase()) {
            case 'commands':
                this.showCommands();
                break;
                
            case 'status':
                await this.showStatus();
                break;
                
            case 'save':
                await this.saveConversation(args.join(' '));
                break;
                
            case 'knowledge':
                await this.saveKnowledge(args.join(' '));
                break;
                
            case 'files':
                await this.showFiles();
                break;
                
            // New context management commands
            case 'context-stats':
            case 'cstats':
                await this.showContextStats();
                break;
                
            case 'context-config':
            case 'cconfig':
                await this.showContextConfig();
                break;
                
            case 'ramr-info':
            case 'ramr':
                await this.showRAMRInfo();
                break;
                
            case 'extraction-settings':
            case 'es':
                await this.configureExtraction(args);
                break;
                
            case 'knowledge-review':
            case 'kr':
                await this.reviewRecentKnowledge();
                break;
                
            case 'knowledge-search':
            case 'ks':
                await this.searchKnowledge(args.join(' '));
                break;
                
            case 'knowledge-stats':
            case 'kstats':
                await this.showKnowledgeStats();
                break;
                
            // Debug commands
            case 'debug-conversation':
            case 'debug':
                await this.showConversationDebug();
                break;
                
            default:
                console.log(`❓ Unknown command: ${command}`);
                console.log('Type "/commands" to see available commands.');
        }
    }

    showCommands() {
        console.log('\n🗡️  Durandal AI Assistant Commands:');
        console.log('\n📋 Basic Commands:');
        console.log('  /commands      - Show this help');
        console.log('  /status        - Show project summary');
        console.log('  /save <name>   - Save current conversation');
        console.log('  /knowledge <text> - Store project knowledge');
        console.log('  /files         - Show tracked project files');
        
        console.log('\n🧠 Context Management Commands:');
        console.log('  /context-stats (/cstats)  - Show context system statistics');
        console.log('  /context-config (/cconfig) - Show context configuration');
        console.log('  /ramr-info (/ramr)        - Show RAMR cache information');
        
        console.log('\n💡 Knowledge Management Commands:');
        console.log('  /extraction-settings (/es) [level] - Configure extraction (silent/brief/verbose)');
        console.log('  /knowledge-review (/kr)    - Review recently extracted knowledge');
        console.log('  /knowledge-search (/ks) <term> - Search knowledge base');
        console.log('  /knowledge-stats (/kstats) - Show extraction statistics');
        
        console.log('\n🔧 Debug Commands:');
        console.log('  /debug-conversation (/debug) - Show conversation state debug info');
        
        console.log('\n🚪 Exit:');
        console.log('  exit - Save and exit Durandal\n');
    }

    async showStatus() {
        console.log('\n🗡️  Durandal AI Status:');
        console.log(`Project: ${this.currentProject.name}`);
        console.log(`Session: ${this.currentSession.session_name}`);
        console.log(`Messages in session: ${this.messageCount}`);
        console.log(`Context management: Active (RAMR enabled)`);
        
        const summary = await this.db.getProjectSummary(this.currentProject.id);
        console.log(`Total conversations: ${summary.conversations}`);
        console.log(`Knowledge artifacts: ${summary.artifacts}`);
        console.log(`Saved states: ${summary.states}`);
        
        console.log(`\nKnowledge Extraction:`);
        console.log(`  Session extractions: ${this.extractionStats.sessionExtractions}`);
        console.log(`  Total extractions: ${this.extractionStats.totalExtractions}`);
        console.log(`  Notification level: ${this.config.extractionNotificationLevel}\n`);
    }

    async showContextStats() {
        try {
            const ramrInfo = await this.contextManager.ramr.getDebugInfo();
            
            console.log('\n🧠 Context Management Statistics:');
            console.log(`Cache entries: ${ramrInfo.cache_stats.total_entries || 0}`);
            console.log(`Memory layer size: ${ramrInfo.memory_layer_size}`);
            console.log(`Cache utilization: ${(ramrInfo.cache_stats.utilization * 100).toFixed(1)}%`);
            console.log(`Valid entries: ${ramrInfo.cache_stats.valid_entries || 0}`);
            console.log(`Average priority: ${(ramrInfo.cache_stats.avg_priority || 0).toFixed(1)}`);
            console.log(`Context token limit: ${this.contextManager.config.maxTokens}`);
            console.log(`Recent messages kept: ${this.contextManager.config.recentMessageCount}\n`);
        } catch (error) {
            console.log('⚠️  Could not retrieve context statistics:', error.message);
        }
    }

    async showContextConfig() {
        console.log('\n🧠 Context Manager Configuration:');
        console.log(`Max tokens per context: ${this.contextManager.config.maxTokens}`);
        console.log(`Recent message count: ${this.contextManager.config.recentMessageCount}`);
        console.log(`Max artifacts per context: ${this.contextManager.config.maxArtifacts}`);
        console.log(`Summary threshold: ${this.contextManager.config.summaryThreshold} tokens`);
        console.log(`Prompt caching: ${this.contextManager.config.cachePrompts ? 'enabled' : 'disabled'}`);
        console.log(`Max retrieval concurrency: ${this.contextManager.config.maxRetrievalConcurrency}\n`);
    }

    async showRAMRInfo() {
        try {
            const ramrInfo = await this.contextManager.ramr.getDebugInfo();
            
            console.log('\n⚡ RAMR (Rapid Access Memory Register) Status:');
            console.log(`Database: ${this.contextManager.ramr.dbPath}`);
            console.log(`Memory layer capacity: ${this.contextManager.ramr.config.memoryLayerMaxSize}`);
            console.log(`Current memory usage: ${ramrInfo.memory_layer_size}`);
            console.log(`SQLite entries: ${ramrInfo.cache_stats.total_entries || 0}`);
            console.log(`Default TTL: ${Math.round(this.contextManager.ramr.config.defaultTTL / 1000 / 60)} minutes`);
            
            if (ramrInfo.cache_stats.most_recent_access) {
                const lastAccess = new Date(ramrInfo.cache_stats.most_recent_access);
                console.log(`Last access: ${lastAccess.toLocaleString()}`);
            }
            console.log('');
        } catch (error) {
            console.log('⚠️  Could not retrieve RAMR information:', error.message);
        }
    }

    async configureExtraction(args) {
        if (args.length === 0) {
            console.log(`\n💡 Current extraction setting: ${this.config.extractionNotificationLevel}`);
            console.log('Available levels: silent, brief, verbose');
            console.log('Usage: /extraction-settings <level>\n');
            return;
        }
        
        const level = args[0].toLowerCase();
        if (['silent', 'brief', 'verbose'].includes(level)) {
            this.config.extractionNotificationLevel = level;
            console.log(`✅ Extraction notification level set to: ${level}\n`);
        } else {
            console.log('❌ Invalid level. Use: silent, brief, or verbose\n');
        }
    }

    async reviewRecentKnowledge() {
        try {
            const recentKnowledge = await this.db.getKnowledgeArtifacts(
                this.currentProject.id, 
                null, 
                5
            );
            
            console.log('\n💡 Recently Extracted Knowledge:');
            if (recentKnowledge.length === 0) {
                console.log('No knowledge artifacts found.');
            } else {
                recentKnowledge.forEach((artifact, index) => {
                    const date = new Date(artifact.updated_at).toLocaleDateString();
                    console.log(`${index + 1}. ${artifact.name} (${artifact.artifact_type}) - ${date}`);
                    console.log(`   Relevance: ${artifact.relevance_score}/10`);
                    if (artifact.tags && artifact.tags.length > 0) {
                        console.log(`   Tags: ${artifact.tags.join(', ')}`);
                    }
                });
            }
            console.log('');
        } catch (error) {
            console.log('⚠️  Could not retrieve recent knowledge:', error.message);
        }
    }

    async searchKnowledge(searchTerm) {
        if (!searchTerm) {
            console.log('Usage: /knowledge-search <search term>\n');
            return;
        }
        
        try {
            const searchResults = await this.db.searchKnowledgeArtifacts(
                this.currentProject.id,
                searchTerm
            );
            
            console.log(`\n🔍 Knowledge Search Results for "${searchTerm}":`);
            if (searchResults.length === 0) {
                console.log('No matching knowledge found.');
            } else {
                searchResults.forEach((artifact, index) => {
                    console.log(`${index + 1}. ${artifact.name} (${artifact.artifact_type})`);
                    console.log(`   Relevance: ${artifact.relevance_score}/10`);
                    if (artifact.tags && artifact.tags.length > 0) {
                        console.log(`   Tags: ${artifact.tags.join(', ')}`);
                    }
                    // Show a brief content preview
                    const preview = JSON.stringify(artifact.content).substring(0, 150);
                    console.log(`   Preview: ${preview}${preview.length === 150 ? '...' : ''}`);
                });
            }
            console.log('');
        } catch (error) {
            console.log('⚠️  Knowledge search failed:', error.message);
        }
    }

    async showKnowledgeStats() {
        try {
            const summary = await this.db.getProjectSummary(this.currentProject.id);
            const recentKnowledge = await this.db.getKnowledgeArtifacts(this.currentProject.id, null, 100);
            
            // Calculate statistics
            const typeStats = {};
            let totalRelevance = 0;
            
            recentKnowledge.forEach(artifact => {
                typeStats[artifact.artifact_type] = (typeStats[artifact.artifact_type] || 0) + 1;
                totalRelevance += artifact.relevance_score || 5;
            });
            
            console.log('\n📊 Knowledge Base Statistics:');
            console.log(`Total artifacts: ${summary.artifacts}`);
            console.log(`Session extractions: ${this.extractionStats.sessionExtractions}`);
            console.log(`Average relevance: ${recentKnowledge.length > 0 ? (totalRelevance / recentKnowledge.length).toFixed(1) : 0}/10`);
            
            console.log('\nBy type:');
            Object.entries(typeStats).forEach(([type, count]) => {
                console.log(`  ${type}: ${count}`);
            });
            
            console.log(`\nExtraction settings: ${this.config.extractionNotificationLevel}`);
            console.log(`Knowledge extraction: ${this.config.enableKnowledgeExtraction ? 'enabled' : 'disabled'}\n`);
        } catch (error) {
            console.log('⚠️  Could not retrieve knowledge statistics:', error.message);
        }
    }

    async showConversationDebug() {
        console.log('\n🔧 Conversation Debug Information:');
        console.log(`Current conversation length: ${this.conversationHistory.length} messages`);
        console.log(`Message count this session: ${this.messageCount}`);
        console.log(`Max conversation history: ${this.config.maxConversationHistory}`);
        
        if (this.conversationHistory.length > 0) {
            console.log('\nLast 4 messages:');
            const recent = this.conversationHistory.slice(-4);
            recent.forEach((msg, index) => {
                const preview = msg.content.length > 80 ? msg.content.substring(0, 80) + '...' : msg.content;
                console.log(`  ${index + 1}. ${msg.role}: ${preview}`);
            });
        } else {
            console.log('No conversation history yet.');
        }
        
        console.log(`\nSession: ${this.currentSession.session_name}`);
        console.log(`Project: ${this.currentProject.name}`);
        console.log(`Context manager active: ${this.contextManager ? 'Yes' : 'No'}`);
        console.log('');
    }

    async saveConversation(name) {
        if (this.conversationHistory.length === 0) {
            console.log('⚠️  No conversation to save yet.\n');
            return;
        }
        
        const saveName = name || `Manual save ${new Date().toLocaleString()}`;
        
        try {
            await this.db.saveKnowledgeArtifact(
                this.currentProject.id,
                'conversation',
                saveName,
                {
                    messages: this.conversationHistory,
                    session_info: {
                        session_id: this.currentSession.id,
                        message_count: this.messageCount,
                        saved_at: new Date().toISOString(),
                        context_management: 'enabled'
                    }
                },
                { manually_saved: true, durandal_version: '2.0' },
                ['conversation', 'manual_save', 'durandal'],
                8
            );
            
            console.log(`✅ Conversation saved as: ${saveName}\n`);
        } catch (error) {
            console.log(`❌ Failed to save conversation: ${error.message}\n`);
        }
    }

    async saveKnowledge(text) {
        if (!text) {
            console.log('⚠️  Please provide knowledge to save. Example: /knowledge "Important discovery about API setup"\n');
            return;
        }
        
        try {
            await this.db.saveKnowledgeArtifact(
                this.currentProject.id,
                'learning',
                `Knowledge: ${text.substring(0, 50)}...`,
                {
                    knowledge: text,
                    source: 'manual_entry',
                    context: this.currentSession.session_name,
                    timestamp: new Date().toISOString(),
                    durandal_version: '2.0'
                },
                { manually_added: true, durandal_enhanced: true },
                ['knowledge', 'manual', 'learning', 'durandal'],
                7
            );
            
            console.log(`✅ Knowledge saved: ${text.substring(0, 100)}...\n`);
        } catch (error) {
            console.log(`❌ Failed to save knowledge: ${error.message}\n`);
        }
    }

    async showFiles() {
        console.log('\n📁 Tracked Project Files:');
        try {
            const structure = await this.getFileStructure(this.projectRoot, 2);
            this.displayFileStructure(structure, '');
        } catch (error) {
            console.log(`❌ Could not read files: ${error.message}`);
        }
        console.log('');
    }

    displayFileStructure(structure, indent = '') {
        for (const [name, info] of Object.entries(structure)) {
            if (info.type === 'directory') {
                console.log(`${indent}📁 ${name}/`);
                if (info.children) {
                    this.displayFileStructure(info.children, indent + '  ');
                }
            } else {
                const size = info.size ? ` (${(info.size / 1024).toFixed(1)}KB)` : '';
                console.log(`${indent}📄 ${name}${size}`);
            }
        }
    }

    async handleExit() {
        console.log('\n💾 Saving conversation and shutting down systems...');
        
        try {
            // Save conversation to database
            const contextDump = {
                messages: this.conversationHistory,
                session_info: {
                    message_count: this.messageCount,
                    session_duration_minutes: this.sessionStartTime ? 
                        Math.round((Date.now() - this.sessionStartTime.getTime()) / 60000) : 0,
                    extraction_stats: this.extractionStats,
                    context_management: 'enabled',
                    durandal_version: '2.0'
                },
                project_context: {
                    project_id: this.currentProject.id,
                    project_name: this.currentProject.name
                }
            };
            
            const summary = `Durandal conversation with ${this.messageCount} messages about ${this.currentSession.session_name}`;
            
            await this.db.endConversationSession(
                this.currentSession.id,
                contextDump,
                summary,
                this.messageCount
            );
            
            console.log('✅ Conversation saved successfully!');
            
            // Capture final project state
            await this.captureProjectState();
            console.log('✅ Project state captured!');
            
            // Close intelligent systems
            if (this.contextManager) {
                await this.contextManager.close();
                console.log('✅ Context management systems closed!');
            }
            
        } catch (error) {
            console.log('⚠️  Error during shutdown:', error.message);
        }
        
        console.log('\n🗡️  Durandal stands ready for your return. Farewell!');
        
        await this.db.close();
        this.rl.close();
    }

    askQuestion(question) {
        return new Promise((resolve) => {
            this.rl.question(question, resolve);
        });
    }
}

// Start Durandal AI Assistant
const durandal = new DurandalAI();
durandal.start();
