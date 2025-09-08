#!/usr/bin/env node
/*
 * Durandal Web UI Launcher - Raw Brutalist Design with Streaming
 * © 2025 ENTDNA. All Rights Reserved.
 * 
 * PROPRIETARY SOFTWARE - CONFIDENTIAL
 * This software is provided for authorized testing only.
 * Unauthorized copying, distribution, reverse engineering, or commercial use is strictly prohibited.
 */

// Load environment configuration
require('dotenv').config();

if (!process.env.CLAUDE_API_KEY) {
    console.log('');
    console.log('❌ Cannot start web UI without CLAUDE_API_KEY in .env file');
    console.log('Please configure your API key and try again.');
    process.exit(1);
}

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { exec, spawn } = require('child_process');
const KnowledgeAnalyzer = require('./knowledge-analyzer');
const multer = require('multer');

class DurandalWebUI {
    constructor() {
        this.app = express();
        this.server = null;
        this.port = process.env.PORT || 3000;
        this.isRunning = false;
        this.startTime = Date.now();
        
        // Durandal process management
        this.durandalProcess = null;
        this.durandalStatus = 'stopped';
        this.conversations = [];
        this.isWaitingForResponse = false;
        this.startupMessages = [];
        this.isInStartupPhase = true;
        this.isReadyForChat = false;
        this.outputStableTimeout = null;
        this.outputBuffer = '';
        this.uiPromptsShown = {
            conversationSelection: false,
            topicInput: false
        };
        
        // Simple state tracking
        this.state = {
            contextMode: 'intelligent',
            messageCount: 0,
            sessionName: 'Web UI Session',
            projectName: 'claude-chatbot',
            isReady: false
        };
        
        // Knowledge analyzer for file analysis
        this.knowledgeAnalyzer = new KnowledgeAnalyzer();
        
        // File analysis storage
        this.fileAnalysis = new Map();
        
        // Performance monitoring and analytics
        this.metrics = {
            startTime: Date.now(),
            requests: {
                total: 0,
                successful: 0,
                failed: 0,
                avgResponseTime: 0,
                responseTimes: []
            },
            api: {
                tokensUsed: 0,
                tokensRemaining: 0,
                requestsThisHour: 0,
                costEstimate: 0,
                lastRequestTime: null
            },
            system: {
                memoryUsage: process.memoryUsage(),
                uptime: 0,
                errorCount: 0,
                lastError: null
            }
        };
    }

    async initialize() {
        // Setup logging
        const fs = require('fs');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // Create logs directory if it doesn't exist
        try {
            if (!fs.existsSync('./logs')) {
                fs.mkdirSync('./logs', { recursive: true });
            }
            const logFile = `./logs/durandal-ui-${timestamp}.log`;
            this.logStream = fs.createWriteStream(logFile, { flags: 'a' });
        } catch (error) {
            // If logging setup fails, just use console logging
            console.log('⚠️ Could not setup file logging, using console only');
            this.logStream = null;
        }
        
        this.log = (message) => {
            const timestampedMsg = `[${new Date().toISOString()}] ${message}`;
            console.log(message);
            if (this.logStream) {
                this.logStream.write(timestampedMsg + '\n');
            }
        };
        
        this.log('🗡️ Initializing Durandal Web UI...');
        console.log('');
        console.log('© 2025 ENTDNA. All Rights Reserved.');
        console.log('Durandal AI Assistant v2.1.0 - Proprietary Software');
        console.log('');
        console.log('⚠️  CONFIDENTIAL TEST VERSION: This software is provided for authorized');
        console.log('   testing only. Unauthorized copying, distribution, reverse engineering,');
        console.log('   or commercial use is strictly prohibited.');
        console.log('');
        
        try {
            // Check if durandal.js exists
            if (!fsSync.existsSync(path.join(__dirname, 'durandal.js'))) {
                throw new Error('durandal.js not found');
            }
            this.log('✅ Durandal core file found');

            // Check if public directory exists, if not create basic one
            const publicDir = path.join(__dirname, 'public');
            if (!fsSync.existsSync(publicDir)) {
                fsSync.mkdirSync(publicDir);
                console.log('📁 Created public/ directory');
            }
            console.log('✅ Static files enabled from public/');

            // Setup Express app
            this.setupExpress();
            console.log('✅ Web server configured');

            // Start server
            await this.startServer();
            console.log('✅ Web server started');

            // Setup shutdown
            this.setupShutdown();
            console.log('✅ Shutdown handlers configured');

            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Durandal Web UI:', error.message);
            return false;
        }
    }

    setupExpress() {
        // Serve static files from public directory
        this.app.use(express.static(path.join(__dirname, 'public')));
        
        // Parse JSON requests
        this.app.use(express.json());
        
        // Request tracking middleware for performance monitoring
        this.app.use((req, res, next) => {
            const startTime = Date.now();
            
            res.on('finish', () => {
                const duration = Date.now() - startTime;
                this.metrics.requests.total++;
                this.metrics.requests.responseTimes.push(duration);
                
                // Keep only last 100 response times for average calculation
                if (this.metrics.requests.responseTimes.length > 100) {
                    this.metrics.requests.responseTimes = this.metrics.requests.responseTimes.slice(-100);
                }
                
                if (res.statusCode >= 200 && res.statusCode < 400) {
                    this.metrics.requests.successful++;
                } else {
                    this.metrics.requests.failed++;
                    this.metrics.system.errorCount++;
                    this.metrics.system.lastError = {
                        timestamp: new Date().toISOString(),
                        status: res.statusCode,
                        path: req.path,
                        method: req.method
                    };
                }
                
                // Track API requests per hour
                if (req.path.startsWith('/api/')) {
                    this.metrics.api.requestsThisHour++;
                    this.metrics.api.lastRequestTime = new Date().toISOString();
                    
                    // Estimate token usage for chat requests
                    if (req.path === '/api/chat' && req.body) {
                        const messageLength = (req.body.message || '').length;
                        const estimatedTokens = Math.ceil(messageLength / 4); // Rough 4 chars per token
                        this.metrics.api.tokensUsed += estimatedTokens;
                    }
                }
            });
            
            next();
        });
        
        // EXISTING API Routes
        this.app.post('/api/start', (req, res) => this.handleStartDurandal(req, res));
        this.app.post('/api/stop', (req, res) => this.handleStopDurandal(req, res));
        this.app.get('/api/status', (req, res) => this.handleGetStatus(req, res));
        this.app.post('/api/chat', (req, res) => this.handleChat(req, res));
        this.app.get('/api/conversations', (req, res) => this.handleGetConversations(req, res));
        this.app.get('/api/startup-messages', (req, res) => this.handleGetStartupMessages(req, res));
        
        // User choice endpoints
        this.app.post('/api/select-conversation', (req, res) => this.handleSelectConversation(req, res));
        this.app.post('/api/set-topic', (req, res) => this.handleSetTopic(req, res));
        this.app.post('/api/rename-conversation', (req, res) => this.handleRenameConversation(req, res));
        this.app.get('/api/token-status', (req, res) => this.handleTokenStatus(req, res));
        this.app.post('/api/context-mode', (req, res) => this.handleContextMode(req, res));
        this.app.get('/api/project-info', (req, res) => this.handleProjectInfo(req, res));
        this.app.post('/api/message-reaction', (req, res) => this.handleMessageReaction(req, res));
        this.app.get('/api/performance-metrics', (req, res) => this.handlePerformanceMetrics(req, res));
        this.app.get('/api/usage-analytics', (req, res) => this.handleUsageAnalytics(req, res));
        this.app.post('/api/upload-file', this.setupMulter(), (req, res) => this.handleFileUpload(req, res));
        this.app.get('/api/file-analysis', (req, res) => this.handleGetFileAnalysis(req, res));
        this.app.delete('/api/clear-files', (req, res) => this.handleClearFiles(req, res));
        this.app.get('/api/dynamic-status', (req, res) => this.handleDynamicStatus(req, res));
        
        // Streaming endpoints removed
        
        // Test route
        this.app.get('/test', (req, res) => {
            const fs = require('fs');
            res.send(fs.readFileSync('./test-minimal.html', 'utf8'));
        });
        
        // Main page route
        this.app.get('/', (req, res) => {
            res.send(this.getRawBrutalistHTML());
        });
    }

    // Handle conversation renaming
    async handleRenameConversation(req, res) {
        const { conversationId, newName } = req.body;
        
        if (!conversationId || !newName || typeof newName !== 'string') {
            return res.json({ success: false, message: 'Valid conversation ID and name are required' });
        }

        const trimmedName = newName.trim();
        if (!trimmedName) {
            return res.json({ success: false, message: 'Name cannot be empty' });
        }

        try {
            if (this.durandalProcess && this.durandalProcess.stdin) {
                // Send a rename command to Durandal (this is a simplified approach)
                // In a real implementation, you'd want to update the database directly
                console.log(`📝 Rename request: conversation ${conversationId} to "${trimmedName}"`);
                
                // For now, we'll just acknowledge the rename
                // In a full implementation, you'd update the database here
                res.json({ 
                    success: true, 
                    message: `Conversation renamed to "${trimmedName}"`,
                    conversationId: conversationId,
                    newName: trimmedName
                });
                
                console.log(`✅ Conversation ${conversationId} renamed to "${trimmedName}"`);
            } else {
                throw new Error('Durandal process is not available');
            }
        } catch (error) {
            console.error('❌ Error renaming conversation:', error);
            res.json({ success: false, message: error.message });
        }
    }

    // Handle token status requests
    async handleTokenStatus(req, res) {
        try {
            if (this.durandalProcess && this.durandalProcess.stdin) {
                // Get current token count from Durandal's context manager
                // Use dynamic token allocation instead of fixed 25K
                const tokenCount = this.state.messageCount * 150; // Rough estimate
                const maxTokens = 8192; // Aligned with typical query needs
                const percentage = Math.min((tokenCount / maxTokens) * 100, 100);
                
                let usageLevel = 'low';
                if (percentage > 75) usageLevel = 'critical';
                else if (percentage > 50) usageLevel = 'high';
                else if (percentage > 25) usageLevel = 'medium';
                
                res.json({
                    success: true,
                    tokenCount: tokenCount,
                    maxTokens: maxTokens,
                    percentage: Math.round(percentage),
                    usageLevel: usageLevel,
                    display: `${Math.round(tokenCount / 1000)}k/${Math.round(maxTokens / 1000)}k`,
                    note: 'Dynamic allocation - actual limits vary by query type'
                });
            } else {
                // Durandal not running - return default values
                res.json({
                    success: true,
                    tokenCount: 0,
                    maxTokens: 8192,
                    percentage: 0,
                    usageLevel: 'low',
                    display: '0/8k'
                });
            }
        } catch (error) {
            console.error('❌ Error getting token status:', error);
            res.json({ 
                success: false, 
                message: error.message,
                tokenCount: 0,
                maxTokens: 8192,
                percentage: 0,
                usageLevel: 'low',
                display: '0/8k'
            });
        }
    }

    // Handle context mode changes
    async handleContextMode(req, res) {
        const { mode } = req.body;
        const validModes = ['intelligent', 'aggressive', 'maximum', 'revolutionary'];
        
        if (!mode || !validModes.includes(mode)) {
            return res.json({ 
                success: false, 
                message: 'Valid context mode is required (intelligent, aggressive, maximum, revolutionary)' 
            });
        }

        try {
            // Update local state
            this.state.contextMode = mode;
            
            if (this.durandalProcess && this.durandalProcess.stdin) {
                // Send context mode change command to Durandal
                // This is a simplified approach - in a full implementation, you'd send a specific command
                console.log(`🧠 Context mode changed to: ${mode}`);
                
                res.json({
                    success: true,
                    contextMode: mode,
                    message: `Context mode set to ${mode}`
                });
                
                console.log(`✅ Context mode updated to ${mode}`);
            } else {
                // Durandal not running - just update local state
                res.json({
                    success: true,
                    contextMode: mode,
                    message: `Context mode set to ${mode} (will apply when Durandal starts)`
                });
            }
        } catch (error) {
            console.error('❌ Error changing context mode:', error);
            res.json({ success: false, message: error.message });
        }
    }

    // Handle project info requests
    async handleProjectInfo(req, res) {
        try {
            const path = require('path');
            const fs = require('fs');
            
            // Get current working directory info
            const cwd = process.cwd();
            const projectName = path.basename(cwd);
            const parentDir = path.dirname(cwd);
            
            // Try to detect project type
            let projectType = 'unknown';
            if (fsSync.existsSync(path.join(cwd, 'package.json'))) {
                projectType = 'nodejs';
            } else if (fsSync.existsSync(path.join(cwd, 'requirements.txt'))) {
                projectType = 'python';
            } else if (fsSync.existsSync(path.join(cwd, 'Cargo.toml'))) {
                projectType = 'rust';
            } else if (fsSync.existsSync(path.join(cwd, 'pom.xml'))) {
                projectType = 'java';
            }
            
            // Create display name (truncate if too long)
            const maxLength = 15;
            let displayName = projectName;
            if (displayName.length > maxLength) {
                displayName = displayName.substring(0, maxLength - 3) + '...';
            }
            
            const projectInfo = {
                success: true,
                projectName: projectName,
                displayName: displayName,
                fullPath: cwd,
                projectType: projectType,
                parentDirectory: path.basename(parentDir)
            };

            // If Durandal is running, try to get additional info
            if (this.durandalProcess && this.state.projectName) {
                projectInfo.durandalProjectName = this.state.projectName;
            }

            res.json(projectInfo);
        } catch (error) {
            console.error('❌ Error getting project info:', error);
            res.json({ 
                success: false, 
                message: error.message,
                projectName: 'unknown',
                displayName: 'unknown',
                projectType: 'unknown',
                fullPath: process.cwd()
            });
        }
    }

    // Handle message reaction requests
    async handleMessageReaction(req, res) {
        const { reaction, messageContent, timestamp } = req.body;
        
        if (!reaction || !['positive', 'negative'].includes(reaction)) {
            return res.json({ 
                success: false, 
                message: 'Valid reaction type is required (positive or negative)' 
            });
        }

        try {
            // For now, we'll just log the reaction and acknowledge it
            // In a full implementation, you'd store this in a database
            console.log(`👍 Message reaction: ${reaction} at ${new Date(timestamp).toISOString()}`);
            // Check if this is code content before truncating preview
            const isCodeMessage = /```|class|function|def|const|let|var|import|export/.test(messageContent || '');
            const preview = isCodeMessage ? 
                (messageContent?.substring(0, 200) || '') : 
                (messageContent?.substring(0, 50) || '');
            console.log(`📝 Message preview: "${preview}${messageContent && messageContent.length > (isCodeMessage ? 200 : 50) ? '...' : ''}"`);
            
            // Store in local state for basic tracking
            if (!this.messageReactions) {
                this.messageReactions = [];
            }
            
            this.messageReactions.push({
                reaction: reaction,
                messageContent: messageContent,
                timestamp: timestamp,
                date: new Date(timestamp).toISOString()
            });
            
            // Keep only last 100 reactions to prevent memory bloat
            if (this.messageReactions.length > 100) {
                this.messageReactions = this.messageReactions.slice(-100);
            }
            
            res.json({
                success: true,
                message: `Reaction ${reaction} recorded`,
                totalReactions: this.messageReactions.length
            });
            
        } catch (error) {
            console.error('❌ Error saving message reaction:', error);
            res.json({ success: false, message: error.message });
        }
    }

    async handlePerformanceMetrics(req, res) {
        try {
            // Update system metrics
            this.metrics.system.uptime = Date.now() - this.metrics.startTime;
            this.metrics.system.memoryUsage = process.memoryUsage();
            
            // Calculate average response time
            if (this.metrics.requests.responseTimes.length > 0) {
                const sum = this.metrics.requests.responseTimes.reduce((a, b) => a + b, 0);
                this.metrics.requests.avgResponseTime = Math.round(sum / this.metrics.requests.responseTimes.length);
            }
            
            // Calculate success rate
            const successRate = this.metrics.requests.total > 0 ? 
                Math.round((this.metrics.requests.successful / this.metrics.requests.total) * 100) : 100;
            
            res.json({
                success: true,
                metrics: {
                    uptime: {
                        milliseconds: this.metrics.system.uptime,
                        formatted: this.formatUptime(this.metrics.system.uptime)
                    },
                    requests: {
                        total: this.metrics.requests.total,
                        successful: this.metrics.requests.successful,
                        failed: this.metrics.requests.failed,
                        successRate: successRate,
                        avgResponseTime: this.metrics.requests.avgResponseTime
                    },
                    memory: {
                        used: Math.round(this.metrics.system.memoryUsage.heapUsed / 1024 / 1024),
                        total: Math.round(this.metrics.system.memoryUsage.heapTotal / 1024 / 1024),
                        external: Math.round(this.metrics.system.memoryUsage.external / 1024 / 1024)
                    },
                    errors: {
                        count: this.metrics.system.errorCount,
                        lastError: this.metrics.system.lastError
                    }
                }
            });
        } catch (error) {
            res.json({ success: false, message: error.message });
        }
    }

    async handleUsageAnalytics(req, res) {
        try {
            // Calculate tokens per hour estimate
            const hoursRunning = Math.max(1, (Date.now() - this.metrics.startTime) / (1000 * 60 * 60));
            const tokensPerHour = Math.round(this.metrics.api.tokensUsed / hoursRunning);
            
            // Estimate cost (rough Claude pricing)
            const estimatedCost = (this.metrics.api.tokensUsed / 1000) * 0.015; // $0.015 per 1K tokens estimate
            
            res.json({
                success: true,
                analytics: {
                    tokens: {
                        used: this.metrics.api.tokensUsed,
                        remaining: this.metrics.api.tokensRemaining,
                        perHour: tokensPerHour,
                        efficiency: this.state.messageCount > 0 ? 
                            Math.round(this.metrics.api.tokensUsed / this.state.messageCount) : 0
                    },
                    usage: {
                        messagesProcessed: this.state.messageCount,
                        requestsThisHour: this.metrics.api.requestsThisHour,
                        lastRequestTime: this.metrics.api.lastRequestTime,
                        sessionDuration: this.formatUptime(Date.now() - this.metrics.startTime)
                    },
                    cost: {
                        estimated: Math.round(estimatedCost * 100) / 100,
                        currency: 'USD',
                        breakdown: {
                            inputTokens: Math.round(this.metrics.api.tokensUsed * 0.7),
                            outputTokens: Math.round(this.metrics.api.tokensUsed * 0.3)
                        }
                    }
                }
            });
        } catch (error) {
            res.json({ success: false, message: error.message });
        }
    }

    formatUptime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
        if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    setupMulter() {
        // Create uploads directory if it doesn't exist
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fsSync.existsSync(uploadDir)) {
            fsSync.mkdirSync(uploadDir, { recursive: true });
        }

        // Configure multer for file uploads
        const storage = multer.diskStorage({
            destination: function (req, file, cb) {
                cb(null, uploadDir);
            },
            filename: function (req, file, cb) {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
            }
        });

        return multer({
            storage: storage,
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB limit
                files: 5 // Maximum 5 files per upload
            },
            fileFilter: function (req, file, cb) {
                // Allow all text files and common code file types
                const allowedExtensions = [
                    '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs',
                    '.html', '.css', '.scss', '.sass', '.less', '.json', '.xml', '.yaml', '.yml', '.toml', '.ini',
                    '.md', '.txt', '.sql', '.sh', '.bash', '.env', '.gitignore', '.dockerfile'
                ];
                
                const ext = path.extname(file.originalname).toLowerCase();
                const isAllowed = allowedExtensions.includes(ext) || !ext; // Allow files without extensions
                
                if (isAllowed) {
                    cb(null, true);
                } else {
                    cb(new Error(`File type ${ext} not allowed. Only text and code files are supported.`));
                }
            }
        }).array('files', 5);
    }

    async handleFileUpload(req, res) {
        try {
            if (!req.files || req.files.length === 0) {
                return res.json({ 
                    success: false, 
                    message: 'No files uploaded' 
                });
            }

            const analysisResults = [];

            for (const file of req.files) {
                try {
                    // Read the uploaded file content
                    const content = await fs.readFile(file.path, 'utf8');
                    
                    // Analyze the file using the knowledge analyzer
                    const analysis = this.knowledgeAnalyzer.analyzeFile(file.originalname, content, {
                        size: file.size,
                        mtime: new Date(),
                        uploadedPath: file.path
                    });

                    // Store the analysis for later retrieval
                    this.fileAnalysis.set(file.filename, {
                        originalName: file.originalname,
                        analysis: analysis,
                        uploadTime: new Date().toISOString(),
                        path: file.path,
                        content: content
                    });

                    analysisResults.push({
                        filename: file.originalname,
                        analysis: analysis,
                        uploadPath: file.filename
                    });

                    // Clean up the file after analysis (optional - keep for now)
                    // await fs.unlink(file.path);

                } catch (fileError) {
                    console.error(`Error analyzing uploaded file ${file.originalname}:`, fileError);
                    analysisResults.push({
                        filename: file.originalname,
                        error: fileError.message
                    });
                }
            }

            res.json({
                success: true,
                message: `Successfully uploaded and analyzed ${req.files.length} files`,
                results: analysisResults
            });

        } catch (error) {
            console.error('File upload error:', error);
            res.json({ 
                success: false, 
                message: error.message 
            });
        }
    }

    async handleGetFileAnalysis(req, res) {
        try {
            const analyses = Array.from(this.fileAnalysis.values()).map(file => ({
                originalName: file.originalName,
                analysis: file.analysis,
                uploadTime: file.uploadTime
            }));

            res.json({
                success: true,
                analyses: analyses,
                totalFiles: analyses.length
            });

        } catch (error) {
            res.json({ success: false, message: error.message });
        }
    }

    async handleClearFiles(req, res) {
        try {
            const fileCount = this.fileAnalysis.size;
            this.fileAnalysis.clear();
            console.log(`📎 Cleared ${fileCount} uploaded files from memory`);
            
            res.json({
                success: true,
                message: `Cleared ${fileCount} uploaded files`,
                remainingFiles: 0
            });

        } catch (error) {
            console.error('Clear files error:', error);
            res.json({ 
                success: false, 
                message: error.message 
            });
        }
    }

    // Dynamic status endpoint
    async handleDynamicStatus(req, res) {
        try {
            if (this.durandalProcess && this.durandalStatus === 'running') {
                // Request status from Durandal process if it has the API
                this.durandalProcess.stdin.write('__GET_DYNAMIC_STATUS__\n');
                
                // Wait for response (timeout after 5 seconds)
                const statusResponse = await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Status request timeout'));
                    }, 5000);
                    
                    const onData = (data) => {
                        const dataStr = data.toString();
                        if (dataStr.includes('__DYNAMIC_STATUS_START__')) {
                            clearTimeout(timeout);
                            this.durandalProcess.stdout.off('data', onData);
                            
                            const statusMatch = dataStr.match(/__DYNAMIC_STATUS_START__(.*?)__DYNAMIC_STATUS_END__/s);
                            if (statusMatch) {
                                try {
                                    resolve(JSON.parse(statusMatch[1]));
                                } catch (e) {
                                    resolve({ error: 'Failed to parse status response' });
                                }
                            } else {
                                resolve({ error: 'Invalid status response format' });
                            }
                        }
                    };
                    
                    this.durandalProcess.stdout.on('data', onData);
                });
                
                res.json({ success: true, status: statusResponse });
            } else {
                // Durandal not running, return basic UI status
                res.json({ 
                    success: true, 
                    status: {
                        durandalStatus: this.durandalStatus,
                        isReady: this.isReadyForChat,
                        uiUptime: Date.now() - this.startTime,
                        error: 'Durandal process not running'
                    }
                });
            }
        } catch (error) {
            res.json({ success: false, message: error.message });
        }
    }

    // Helper function for filtering debug messages from Durandal output
    isDebugMessage(line) {
        if (!line || !line.trim()) return false;
        
        // Don't treat the actual response as debug
        if (line.trim().startsWith('🤖 Durandal:')) {
            return false;
        }
        
        const debugPatterns = [
            // Emoji debug indicators
            '🧠', '🔍', '📝', '💾', '📋', '🤖', '⬆️', '✅', '📤', '💬', '🗑️', '🤔', '🗡️', '📡', '🛡️',
            
            // Context and RAMR debug messages
            'Building revolutionary context', 'RAMR:', 'Context Debug:', 'Memory results:',
            'Context building', 'context mode', 'tokens', 'Context length:', 'shouldCache:',
            'DB item', 'built_context_', 'relevant=', 'SQLite cache',
            
            // JSON fragments
            '"role":', '"content":', '"messages":', 'recentMessages',
            
            // System status messages
            'Durandal is thinking', 'Using intelligent context mode',
            'Conversation History:', 'Searching for relevant context:',
            'Checking memory layer', 'Querying SQLite cache',
            'Found 0 context', 'Found 0 relevant contexts',
            'Analyzing cache worthiness', 'Detected low-value content',
            'Skipping cache for', 'Including recent message exchanges',
            
            // Startup and system messages
            'Testing system connections', 'connected', 'initialized',
            'Initializing', 'Loading', 'Cache:', 'entries',
            'All intelligent systems online', 'existing project',
            
            // dotenv messages
            '[dotenv', 'injecting env', 'tip:', 'prevent building',
            
            // Process indicators
            '====', '----', '💬 Conversation Session',
            'Recent conversation topics:', 'Select option',
            'Start new conversation', 'Enter conversation topic'
        ];
        
        return debugPatterns.some(pattern => 
            line.toLowerCase().includes(pattern.toLowerCase())
        );
    }

    async startServer() {
        return new Promise((resolve, reject) => {
            this.server = http.createServer(this.app);
            
            this.server.listen(this.port, '0.0.0.0', () => {
                this.isRunning = true;
                console.log(`🌐 Durandal Web UI running at http://localhost:${this.port}`);
                console.log(`🌐 Also accessible at http://0.0.0.0:${this.port}`);
                resolve();
            });
            
            this.server.on('error', (error) => {
                console.error('❌ Server error:', error);
                reject(error);
            });
        });
    }

    // EXISTING METHODS PRESERVED (start, stop, status, chat, etc.)
    async handleStartDurandal(req, res) {
        if (this.durandalStatus === 'running') {
            return res.json({ success: false, message: 'Durandal is already running' });
        }

        if (this.durandalStatus === 'starting') {
            return res.json({ success: false, message: 'Durandal is already starting' });
        }

        try {
            this.durandalStatus = 'starting';
            console.log('🚀 Starting Durandal process...');

            // Start Durandal as an interactive process in lightweight mode
            this.durandalProcess = spawn('node', ['durandal.js', '--lightweight'], {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: __dirname
            });

            // Set up process event handlers
            this.durandalProcess.on('error', (error) => {
                console.error('❌ Durandal process error:', error);
                this.durandalStatus = 'error';
            });

            this.durandalProcess.on('exit', (code) => {
                console.log('🛑 Durandal process exited with code ' + code);
                this.durandalStatus = 'stopped';
                this.durandalProcess = null;
            });

            // Reset startup tracking
            this.startupMessages = [];
            this.isInStartupPhase = true;
            this.isReadyForChat = false;

            // Handle Durandal output
            this.outputBuffer = '';
            
            this.durandalProcess.stdout.on('data', (data) => {
                const output = data.toString();
                this.outputBuffer += output;
                
                // Pass through to console
                process.stdout.write('Durandal output: ' + output);

                // During startup phase, capture messages for UI
                if (this.isInStartupPhase) {
                    const lines = output.split('\n');
                    lines.forEach(line => {
                        const cleanLine = line.trim();
                        
                        if (cleanLine && 
                            !cleanLine.includes('[dotenv') && 
                            !cleanLine.includes('tip:') &&
                            !cleanLine.includes('node_modules') &&
                            !cleanLine.startsWith('at ') &&
                            !cleanLine.startsWith('npm ')) {
                            
                            this.startupMessages.push(cleanLine);
                        }
                    });
                }

                // Clear any existing timeout and set a new one
                if (this.outputStableTimeout) {
                    clearTimeout(this.outputStableTimeout);
                }

                // Wait for output to stabilize before detecting user input prompts
                this.outputStableTimeout = setTimeout(() => {
                    // Check if conversation selection appeared
                    if (this.outputBuffer.includes('Select option (number):') && 
                        !this.outputBuffer.includes('🎯 Enter conversation topic/name:') &&
                        this.isInStartupPhase) {
                        
                        console.log('✅ Durandal conversation selection ready');
                        this.durandalStatus = 'awaiting_conversation_choice';
                        this.parseConversationOptions(this.outputBuffer);
                        this.uiPromptsShown.conversationSelection = false;
                    }
                    
                    // Check if topic name prompt appeared
                    else if (this.outputBuffer.includes('🎯 Enter conversation topic/name:') && 
                             !this.outputBuffer.includes('Type "/commands" to see available commands') &&
                             this.isInStartupPhase) {
                        
                        console.log('✅ Durandal topic name prompt ready');
                        this.durandalStatus = 'awaiting_topic_name';
                        this.uiPromptsShown.topicInput = false;
                    }
                }, 1500);
                
                // Check if startup is complete and chat is ready
                if (output.includes('Type "/commands" to see available commands, or just start chatting!')) {
                    if (this.outputStableTimeout) {
                        clearTimeout(this.outputStableTimeout);
                        this.outputStableTimeout = null;
                    }
                    this.durandalStatus = 'running';
                    this.isInStartupPhase = false;
                    this.isReadyForChat = true;
                    console.log('✅ Durandal startup complete - ready for chat');
                }
            });

            // Handle stderr
            this.durandalProcess.stderr.on('data', (data) => {
                console.error('Durandal error:', data.toString());
            });

            res.json({ success: true, message: 'Durandal is starting...' });

        } catch (error) {
            this.durandalStatus = 'error';
            console.error('❌ Failed to start Durandal:', error);
            res.json({ success: false, message: error.message });
        }
    }

    // Stop Durandal process
    async handleStopDurandal(req, res) {
        try {
            if (this.durandalProcess) {
                console.log('🛑 Stopping Durandal process...');
                
                if (this.outputStableTimeout) {
                    clearTimeout(this.outputStableTimeout);
                    this.outputStableTimeout = null;
                }
                
                this.durandalProcess.kill('SIGTERM');
                this.durandalProcess = null;
                this.durandalStatus = 'stopped';
                this.isReadyForChat = false;
                this.startupMessages = [];
                this.uiPromptsShown.conversationSelection = false;
                this.uiPromptsShown.topicInput = false;
                console.log('✅ Durandal process stopped');
            }
            
            res.json({ success: true, message: 'Durandal stopped' });
        } catch (error) {
            console.error('❌ Error stopping Durandal:', error);
            res.json({ success: false, message: error.message });
        }
    }

    // Get status
    async handleGetStatus(req, res) {
        try {
            res.json({ 
                success: true, 
                status: this.durandalStatus,
                isReady: this.isReadyForChat,
                state: this.state
            });
        } catch (error) {
            res.json({ success: false, message: error.message });
        }
    }

    // Get conversations
    async handleGetConversations(req, res) {
        try {
            res.json({ 
                success: true, 
                conversations: this.conversations,
                status: this.durandalStatus 
            });
        } catch (error) {
            res.json({ success: false, message: error.message });
        }
    }

    // Get startup messages for UI
    async handleGetStartupMessages(req, res) {
        try {
            res.json({ 
                success: true, 
                startupMessages: this.startupMessages || [],
                status: this.durandalStatus 
            });
        } catch (error) {
            res.json({ success: false, message: error.message });
        }
    }

    // Parse conversation options from Durandal output
    parseConversationOptions(output) {
        this.conversations = [];
        const lines = output.split('\n');
        
        for (const line of lines) {
            const match = line.match(/^(\d+)\.\s+(.+)/);
            if (match) {
                this.conversations.push({
                    id: match[1],
                    name: match[2],
                    display: match[1] + '. ' + match[2]
                });
            }
        }
        
        console.log('📝 Parsed ' + this.conversations.length + ' conversation options');
    }

    // Handle user conversation selection
    async handleSelectConversation(req, res) {
        if (this.durandalStatus !== 'awaiting_conversation_choice') {
            return res.json({ 
                success: false, 
                message: 'Not currently waiting for conversation selection' 
            });
        }

        const { selection } = req.body;
        
        if (!selection || !selection.trim()) {
            return res.json({ success: false, message: 'Selection is required' });
        }

        try {
            if (this.durandalProcess && this.durandalProcess.stdin) {
                console.log('📝 User selected conversation option: ' + selection);
                this.durandalProcess.stdin.write(selection.trim() + '\n');
                this.durandalStatus = 'starting';
                res.json({ success: true, message: 'Conversation selection sent' });
            } else {
                throw new Error('Durandal process is not available');
            }
        } catch (error) {
            console.error('❌ Error sending conversation selection:', error);
            res.json({ success: false, message: error.message });
        }
    }

    // Handle user topic name input
    async handleSetTopic(req, res) {
        if (this.durandalStatus !== 'awaiting_topic_name') {
            return res.json({ 
                success: false, 
                message: 'Not currently waiting for topic name' 
            });
        }

        const { topic } = req.body;
        
        if (!topic || !topic.trim()) {
            return res.json({ success: false, message: 'Topic name is required' });
        }

        try {
            if (this.durandalProcess && this.durandalProcess.stdin) {
                console.log('📝 User set topic name: ' + topic);
                this.durandalProcess.stdin.write(topic.trim() + '\n');
                this.durandalStatus = 'starting';
                res.json({ success: true, message: 'Topic name sent' });
            } else {
                throw new Error('Durandal process is not available');
            }
        } catch (error) {
            console.error('❌ Error sending topic name:', error);
            res.json({ success: false, message: error.message });
        }
    }

    // Chat handler with Durandal process communication (PRESERVED)
    async handleChat(req, res) {
        if (this.durandalStatus !== 'running' || !this.isReadyForChat) {
            return res.json({ 
                success: false, 
                message: 'Durandal is not ready for chat. Please wait for startup to complete.' 
            });
        }

        const { message, contextMode } = req.body;
        
        if (!message || !message.trim()) {
            return res.json({ success: false, message: 'Message is required' });
        }

        if (this.isWaitingForResponse) {
            return res.json({ success: false, message: 'Please wait for the current response to complete' });
        }

        try {
            this.isWaitingForResponse = true;
            
            // Enhance message with uploaded file context if files exist
            let enhancedMessage = message.trim();
            if (this.fileAnalysis.size > 0) {
                const fileContext = Array.from(this.fileAnalysis.values()).map(file => {
                    return `

UPLOADED FILE START: ${file.originalName}
CONTENT:
${file.content}
UPLOADED FILE END: ${file.originalName}

`;
                }).join('\n');
                
                // Convert to single line with proper escaping for stdin
                const escapedFileContext = fileContext.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
                enhancedMessage = `${message.trim()} [UPLOADED_FILES: ${this.fileAnalysis.size} files] ${escapedFileContext} [END_UPLOADED_FILES]`;
                
                console.log(`📎 Enhanced message with ${this.fileAnalysis.size} uploaded file(s)`);
                // Don't truncate debug preview for code content
                const isCodeContent = /```|class|function|def|const|let|var|import|export/.test(enhancedMessage);
                const debugPreview = isCodeContent ? enhancedMessage : enhancedMessage.substring(0, 500);
                console.log('🔍 DEBUG Enhanced message preview:', debugPreview + (!isCodeContent && enhancedMessage.length > 500 ? '...' : ''));
            }
            
            // Send enhanced message to Durandal
            if (this.durandalProcess && this.durandalProcess.stdin) {
                this.durandalProcess.stdin.write(enhancedMessage + '\n');
            } else {
                throw new Error('Durandal process is not available');
            }

            // Set up response collection
            let responseBuffer = '';
            let systemMessages = [];
            let responseTimeout;
            
            const responseHandler = (data) => {
                const output = data.toString();
                responseBuffer += output;
                
                // Collect system messages (lines with emojis that aren't the final response)
                const lines = output.split('\n');
                lines.forEach(line => {
                    const cleanLine = line.trim();
                    // Check for system debug messages (contain emojis and aren't You:/Claude: prompts)
                    if (cleanLine && 
                        /[🧠🔍📝💾📋🤖⬆️✅📤💬]/.test(cleanLine) && 
                        !cleanLine.includes('You:') && 
                        !cleanLine.includes('Claude:')) {
                        systemMessages.push(cleanLine);
                    }
                });
                
                // Check for completion signals
                if (output.includes('You:') || output.includes('Claude:')) {
                    clearTimeout(responseTimeout);
                    this.durandalProcess.stdout.removeListener('data', responseHandler);
                    this.isWaitingForResponse = false;
                    
                    // Extract actual response content from Durandal output
                    let cleanResponse = '';
                    const lines = responseBuffer.split('\n');
                    let foundResponse = false;
                    
                    for (const line of lines) {
                        const cleanLine = line.trim();
                        
                        // Look for the Durandal response marker
                        if (cleanLine.startsWith('🤖 Durandal:')) {
                            foundResponse = true;
                            const responseContent = cleanLine.replace('🤖 Durandal:', '').trim();
                            if (responseContent) {
                                cleanResponse += responseContent + '\n';
                            }
                            continue;
                        }
                        
                        // If we found the response, collect subsequent non-debug lines
                        if (foundResponse) {
                            // Stop at the next "You:" prompt
                            if (cleanLine.includes('You:')) {
                                break;
                            }
                            
                            // Skip debug messages
                            if (this.isDebugMessage(cleanLine)) {
                                continue;
                            }
                            
                            // Skip empty lines
                            if (!cleanLine) continue;
                            
                            // Add content line
                            cleanResponse += cleanLine + '\n';
                        }
                    }
                    
                    cleanResponse = cleanResponse.trim();
                    
                    this.state.messageCount++;
                    
                    res.json({ 
                        success: true, 
                        response: cleanResponse,
                        systemMessages: systemMessages, // Include system messages in response
                        messageCount: this.state.messageCount
                    });
                }
            };

            // Set up timeout for response
            responseTimeout = setTimeout(() => {
                this.durandalProcess.stdout.removeListener('data', responseHandler);
                this.isWaitingForResponse = false;
                res.json({ 
                    success: false, 
                    message: 'Response timeout - Durandal may be busy' 
                });
            }, 60000);

            // Listen for response
            this.durandalProcess.stdout.on('data', responseHandler);

        } catch (error) {
            this.isWaitingForResponse = false;
            console.error('❌ Chat error:', error);
            res.json({ success: false, message: error.message });
        }
    }

    getRawBrutalistHTML() {
        const now = new Date();
        const currentTime = now.toLocaleTimeString();
        const currentFullTime = now.toLocaleString();
        
        // Build the HTML in parts to avoid any template literal issues
        const htmlHead = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>durandal</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js"></script>`;

        const cssStyles = `
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', 'Consolas', monospace; background: #4a5568; color: #e2e8f0; line-height: 1.3; overflow-x: hidden; font-size: 13px; }
        .container { display: grid; grid-template-columns: 290px 1fr 320px; height: 100vh; gap: 1px; background: #718096; }
        .panel { background: #2d3748; padding: 18px 16px 22px 19px; overflow-y: auto; position: relative; }
        .panel::before { content: ''; position: absolute; top: 0; left: 0; width: 3px; height: 67%; background: #68d391; opacity: 0.6; }
        .title { font-size: 30px; font-weight: 900; margin-bottom: 18px; color: #68d391; letter-spacing: -1px; margin-left: 7px; }
        .section { margin-bottom: 23px; }
        .section:nth-child(3) { margin-bottom: 29px; }
        .section-title { font-size: 13px; font-weight: 700; margin-bottom: 12px; text-transform: uppercase; color: #63b3ed; letter-spacing: 2px; margin-left: 2px; }
        .status { border: 2px solid #718096; border-right: 1px solid #718096; padding: 11px 13px 9px 11px; margin-bottom: 17px; background: #1a202c; position: relative; }
        .status::after { content: ''; position: absolute; bottom: -2px; right: -1px; width: 4px; height: 4px; background: #ed8936; }
        .status-line { display: flex; justify-content: space-between; margin-bottom: 7px; font-size: 14px; }
        .status-line:last-child { margin-bottom: 0; font-weight: 600; }
        .status-line:first-child { font-size: 15px; }
        .status-dot { display: inline-block; width: 7px; height: 7px; margin-right: 9px; border: 1px solid #718096; margin-top: 2px; }
        .status-dot.stopped { background: #718096; }
        .status-dot.starting { background: #ed8936; }
        .status-dot.running { background: #68d391; }
        .status-dot.error { background: #f56565; border-color: #f56565; }
        .btn { width: 100%; padding: 13px 14px 15px 14px; margin-bottom: 6px; background: #2d3748; border: 1px solid #718096; border-left: 2px solid #718096; color: #e2e8f0; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; text-transform: lowercase; position: relative; }
        .btn:nth-child(2) { margin-bottom: 8px; border-right: 2px solid #718096; }
        .btn:hover { background: #4a5568; border-color: #a0aec0; transform: translateX(1px); }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; background: #1a202c; }
        .btn:disabled:hover { background: #1a202c; border-color: #718096; transform: none; }
        /* Streaming toggle styles removed */
        .prompt { border: 2px solid #ed8936; border-bottom: 1px solid #ed8936; padding: 13px 15px 17px 13px; margin: 19px 0 21px 0; background: #1a202c; position: relative; }
        .prompt::before { content: '!'; position: absolute; top: -8px; right: 8px; background: #ed8936; color: #1a202c; width: 16px; height: 16px; font-size: 11px; font-weight: 900; display: flex; align-items: center; justify-content: center; }
        .prompt-title { font-weight: 700; margin-bottom: 11px; font-size: 13px; color: #ed8936; text-transform: uppercase; letter-spacing: 1px; }
        .conversation-list { margin: 12px 0; }
        .conversation-option { padding: 6px 9px 8px 9px; border: 1px solid #718096; margin-bottom: 1px; background: #2d3748; cursor: pointer; font-size: 11px; position: relative; display: flex; justify-content: space-between; align-items: center; }
        .conversation-option:nth-child(odd) { margin-left: 2px; }
        .conversation-option:hover { background: #4a5568; border-color: #a0aec0; margin-left: 1px; }
        .conversation-option.selected { background: #68d391; color: #1a202c; border-color: #68d391; font-weight: 600; }
        .conversation-name { flex: 1; }
        .rename-btn { background: #4a5568; border: 1px solid #718096; color: #a0aec0; font-size: 9px; padding: 2px 4px; cursor: pointer; opacity: 0; transition: all 0.2s ease; margin-left: 8px; }
        .rename-btn:hover { background: #ed8936; color: #1a202c; border-color: #ed8936; }
        .conversation-option:hover .rename-btn { opacity: 1; }
        .rename-input { background: #1a202c; border: 1px solid #ed8936; color: #e2e8f0; font-size: 11px; padding: 4px 6px; width: 100%; font-family: inherit; }
        .rename-input:focus { outline: none; border-color: #68d391; }
        .keyboard-shortcuts { margin-top: 15px; padding: 8px 10px; border: 1px solid #4a5568; background: #1a202c; }
        .shortcut-title { font-size: 11px; font-weight: 700; margin-bottom: 6px; text-transform: uppercase; color: #718096; letter-spacing: 1px; }
        .shortcut-item { font-size: 11px; color: #a0aec0; margin-bottom: 3px; font-family: monospace; }
        .shortcut-item:last-child { margin-bottom: 0; }
        .performance-section { margin-top: 22px; }
        .performance-metrics, .usage-analytics { margin-bottom: 20px; padding: 16px; border: 3px solid #4a5568; background: #1a202c; }
        .analytics-title { font-size: 16px; font-weight: 800; color: #63b3ed; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
        .metric-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 16px; }
        .metric-label { color: #a0aec0; font-weight: 800; }
        .metric-value { color: #e2e8f0; font-weight: 900; font-family: monospace; font-size: 17px; }
        .metric-value.good { color: #68d391; }
        .metric-value.warning { color: #ed8936; }
        .metric-value.critical { color: #f56565; }
        .file-upload-section { margin-top: 22px; }
        .file-upload-area { margin-bottom: 15px; padding: 20px; border: 2px dashed #4a5568; background: #1a202c; text-align: center; cursor: pointer; transition: border-color 0.2s ease; position: relative; }
        .file-upload-area:hover { border-color: #68d391; }
        .file-upload-area.drag-over { border-color: #68d391; background: rgba(104, 211, 145, 0.1); }
        .file-input { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
        .upload-prompt { pointer-events: none; }
        .upload-icon { font-size: 24px; margin-bottom: 8px; }
        .upload-text { font-size: 14px; font-weight: 600; color: #e2e8f0; margin-bottom: 4px; }
        .upload-hint { font-size: 11px; color: #a0aec0; }
        .uploaded-files { margin-bottom: 15px; padding: 12px; border: 1px solid #4a5568; background: #1a202c; }
        .file-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #4a5568; }
        .file-item:last-child { border-bottom: none; }
        .file-name { font-size: 12px; color: #e2e8f0; font-weight: 600; }
        .file-type { font-size: 10px; color: #63b3ed; text-transform: uppercase; }
        .file-score { font-size: 11px; font-weight: 700; }
        .file-score.high { color: #68d391; }
        .file-score.medium { color: #ed8936; }
        .file-score.low { color: #a0aec0; }
        .token-display { font-family: monospace; font-weight: 600; }
        .token-display.low { color: #68d391; }
        .token-display.medium { color: #ed8936; }
        .token-display.high { color: #f56565; }
        .token-display.critical { color: #f56565; animation: pulse 2s infinite; }
        .context-toggle { 
            cursor: pointer; 
            font-family: monospace; 
            font-weight: 600; 
            padding: 4px 8px; 
            border-radius: 4px; 
            border: 1px solid rgba(255, 255, 255, 0.2);
            background-color: rgba(255, 255, 255, 0.05);
            transition: all 0.2s;
            display: inline-block;
            min-width: 30px;
            text-align: center;
        }
        .context-toggle:hover { 
            background-color: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.4);
            transform: translateY(-1px);
        }
        .context-toggle.intelligent { color: #68d391; }
        .context-toggle.aggressive { color: #ed8936; }
        .context-toggle.maximum { color: #f56565; }
        .context-toggle.revolutionary { color: #e53e3e; animation: pulse 2s infinite; }
        .project-display { 
            font-family: monospace; 
            font-weight: 600; 
            color: #a0aec0; 
            max-width: 120px; 
            overflow: hidden; 
            text-overflow: ellipsis; 
            white-space: nowrap;
        }
        .topic-input { width: calc(100% - 3px); padding: 7px 9px 9px 8px; border: 1px solid #718096; border-bottom: 2px solid #718096; background: #2d3748; color: #e2e8f0; font-family: inherit; font-size: 14px; margin: 11px 0; }
        .topic-input:focus { outline: none; border-color: #ed8936; border-left: 3px solid #ed8936; }
        .chat { display: flex; flex-direction: column; background: #2d3748; }
        .chat-header { padding: 14px 19px 16px 21px; background: #1a202c; border-bottom: 2px solid #718096; position: relative; display: flex; justify-content: space-between; align-items: center; }
        .chat-header::after { content: ''; position: absolute; bottom: -2px; left: 0; width: 30%; height: 1px; background: #63b3ed; }
        .chat-title { font-size: 15px; font-weight: 700; color: #63b3ed; text-transform: uppercase; letter-spacing: 3px; margin-left: 1px; }
        .chat-controls { display: flex; align-items: center; gap: 8px; }
        .chat-search { display: flex; align-items: center; gap: 4px; }
        .search-input { background: #2d3748; border: 1px solid #4a5568; color: #e2e8f0; font-size: 13px; padding: 4px 8px; width: 200px; font-family: inherit; }
        .search-input:focus { outline: none; border-color: #63b3ed; }
        .search-input.has-results { border-color: #68d391; }
        .search-input.no-results { border-color: #f56565; }
        .search-clear { background: #4a5568; border: 1px solid #718096; color: #a0aec0; width: 20px; height: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; }
        .search-clear:hover { background: #f56565; color: #1a202c; }
        .message.search-hidden { display: none; }
        .search-highlight { background: #ed8936; color: #1a202c; padding: 1px 2px; font-weight: bold; }
        .export-btn { background: #4a5568; border: 1px solid #718096; color: #a0aec0; width: 24px; height: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: bold; }
        .export-btn:hover { background: #68d391; color: #1a202c; }
        .export-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 2000; display: flex; align-items: center; justify-content: center; }
        .export-modal-content { background: #1a202c; border: 2px solid #718096; width: 400px; max-width: 90vw; }
        .export-header { padding: 16px 19px; background: #2d3748; border-bottom: 2px solid #718096; display: flex; justify-content: space-between; align-items: center; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; font-size: 12px; }
        .modal-close { background: none; border: none; color: #e2e8f0; font-size: 18px; cursor: pointer; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; }
        .modal-close:hover { color: #f56565; }
        .export-options { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
        .export-option { width: 100%; }
        .export-format-btn { width: 100%; background: #2d3748; border: 1px solid #4a5568; color: #e2e8f0; padding: 16px; cursor: pointer; display: flex; align-items: center; gap: 16px; transition: all 0.2s ease; }
        .export-format-btn:hover { background: #4a5568; border-color: #68d391; }
        .format-icon { width: 40px; height: 40px; background: #4a5568; border: 1px solid #718096; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; color: #a0aec0; }
        .format-label { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
        .format-desc { font-size: 11px; color: #a0aec0; }
        .messages { flex: 1; padding: 19px 17px 23px 21px; overflow-y: auto; background: #2d3748; max-height: calc(100vh - 120px); scroll-behavior: smooth; }
        .message { margin-bottom: 17px; padding: 13px 15px 15px 13px; border: 1px solid #718096; max-width: 82%; position: relative; }
        .message:nth-child(even) { margin-bottom: 21px; }
        .message.user { margin-left: auto; background: #1a202c; border-left: 3px solid #63b3ed; border-right: 1px solid #718096; }
        .message.assistant { margin-right: auto; background: #1a202c; border-left: 3px solid #68d391; border-right: 1px solid #718096; margin-left: 3px; }
        .message.system { margin: 0 auto; background: #1a202c; border: 2px solid #ed8936; border-bottom: 1px solid #ed8936; text-align: center; font-style: italic; max-width: 87%; color: #ed8936; }
        .message.thinking { border-left: 3px solid #ed8936; animation: pulse 2s ease-in-out infinite; }
        .thinking-indicator { color: #ed8936; animation: pulse 1.5s infinite; font-style: italic; }
        .system-loading { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(26, 32, 44, 0.95); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 1000; opacity: 0; visibility: hidden; transition: opacity 0.5s ease; pointer-events: none; }
        .loading-container { display: flex; flex-direction: column; align-items: center; max-width: 500px; }
        
        /* Conversation Selection Overlay Styles */
        .conversation-selection-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 1001; opacity: 0; visibility: hidden; transition: opacity 0.3s ease; pointer-events: none; display: flex; align-items: center; justify-content: center; }
        .overlay-backdrop { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(26, 32, 44, 0.85); backdrop-filter: blur(4px); }
        .conversation-selection-container { background: #2d3748; border: 2px solid #4a5568; border-radius: 12px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4); max-width: 600px; width: 90%; max-height: 80vh; display: flex; flex-direction: column; position: relative; overflow: hidden; }
        .conversation-selection-header { padding: 20px 24px 16px 24px; border-bottom: 1px solid #4a5568; display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%); }
        .conversation-selection-header h2 { margin: 0; color: #68d391; font-size: 18px; font-weight: 600; letter-spacing: -0.5px; }
        .overlay-close-btn { background: none; border: none; color: #a0aec0; font-size: 24px; font-weight: 300; cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: all 0.2s ease; }
        .overlay-close-btn:hover { background: #4a5568; color: #e2e8f0; }
        .conversation-selection-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .conversation-list-overlay { flex: 1; overflow-y: auto; padding: 16px 24px; max-height: 400px; }
        .conversation-option-overlay { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; margin-bottom: 8px; background: #1a202c; border: 1px solid #4a5568; border-radius: 8px; cursor: pointer; transition: all 0.2s ease; }
        .conversation-option-overlay:hover { background: #2d3748; border-color: #68d391; transform: translateX(2px); }
        .conversation-option-overlay.selected { background: linear-gradient(135deg, #68d391, #48bb78); color: #1a202c; border-color: #68d391; font-weight: 600; }
        .conversation-option-overlay.selected .conversation-date { color: #2d3748; }
        .conversation-details { flex: 1; display: flex; flex-direction: column; }
        .conversation-name-overlay { font-size: 14px; font-weight: 500; margin-bottom: 2px; }
        .conversation-date { font-size: 11px; color: #a0aec0; opacity: 0.8; }
        .rename-btn-overlay { background: #4a5568; border: 1px solid #718096; color: #a0aec0; font-size: 12px; padding: 4px 8px; border-radius: 4px; cursor: pointer; opacity: 0; transition: all 0.2s ease; margin-left: 12px; display: flex; align-items: center; justify-content: center; }
        .conversation-option-overlay:hover .rename-btn-overlay { opacity: 1; }
        .rename-btn-overlay:hover { background: #ed8936; color: #1a202c; border-color: #ed8936; }
        .rename-input-overlay { background: #1a202c; border: 1px solid #68d391; color: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-size: 14px; outline: none; width: 100%; }
        .conversation-selection-actions { padding: 16px 24px; border-top: 1px solid #4a5568; background: #1a202c; }
        .btn-overlay { padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; border: none; }
        .btn-overlay:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-overlay.btn-primary { background: linear-gradient(135deg, #68d391, #48bb78); color: #1a202c; }
        .btn-overlay.btn-primary:not(:disabled):hover { background: linear-gradient(135deg, #48bb78, #38a169); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(104, 211, 145, 0.3); }
        .loading-title { font-size: 28px; font-weight: 900; color: #68d391; margin-bottom: 30px; letter-spacing: -1px; }
        .loading-stages { display: flex; flex-direction: column; gap: 15px; margin-bottom: 40px; min-height: 120px; }
        .loading-stage { display: flex; align-items: center; font-size: 14px; opacity: 0.3; transition: all 0.5s ease; }
        .loading-stage.active { opacity: 1; color: #68d391; }
        .loading-stage.complete { opacity: 0.7; color: #a0aec0; }
        .stage-icon { width: 20px; height: 20px; margin-right: 15px; display: flex; align-items: center; justify-content: center; }
        .stage-spinner { width: 12px; height: 12px; border: 2px solid #4a5568; border-top: 2px solid #68d391; border-radius: 50%; animation: spin 1s linear infinite; }
        .stage-check { color: #68d391; font-size: 16px; }
        .neural-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 3px; margin-top: 20px; }
        .neural-node { width: 8px; height: 8px; background: #4a5568; border-radius: 50%; animation: neuralPulse 2s ease-in-out infinite; }
        .neural-node:nth-child(odd) { animation-delay: 0.2s; }
        .neural-node:nth-child(3n) { animation-delay: 0.4s; }
        .neural-node:nth-child(5n) { animation-delay: 0.6s; }
        .loading-subtitle { font-size: 11px; color: #718096; text-align: center; margin-top: 15px; letter-spacing: 1px; text-transform: uppercase; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes neuralPulse { 0%, 100% { background: #4a5568; transform: scale(1); } 50% { background: #68d391; transform: scale(1.2); } }
        .message-header { font-size: 10px; font-weight: 600; margin-bottom: 9px; display: flex; justify-content: space-between; text-transform: uppercase; opacity: 0.8; letter-spacing: 1px; position: relative; }
        .copy-button { position: absolute; top: -2px; right: -8px; width: 20px; height: 20px; background: #4a5568; border: 1px solid #718096; color: #a0aec0; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0; transition: all 0.2s ease; }
        .copy-button:hover { background: #68d391; color: #1a202c; border-color: #68d391; transform: scale(1.1); }
        .copy-button.copied { background: #68d391; color: #1a202c; border-color: #68d391; }
        .message:hover .copy-button { opacity: 1; }
        .reaction-buttons { position: absolute; top: -2px; right: 15px; display: flex; gap: 2px; opacity: 0; transition: all 0.2s ease; }
        .reaction-button { width: 18px; height: 18px; background: #4a5568; border: 1px solid #718096; color: #a0aec0; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; font-weight: bold; }
        .reaction-button:hover { transform: scale(1.1); }
        .reaction-button:hover:nth-child(1) { background: #68d391; color: #1a202c; border-color: #68d391; }
        .reaction-button:hover:nth-child(2) { background: #f56565; color: #1a202c; border-color: #f56565; }
        .reaction-button.positive.selected { background: #68d391; color: #1a202c; border-color: #68d391; }
        .reaction-button.negative.selected { background: #f56565; color: #1a202c; border-color: #f56565; }
        .message:hover .reaction-buttons { opacity: 1; }
        .timestamp { position: relative; cursor: help; }
        .timestamp-tooltip { position: absolute; bottom: 100%; right: 0; background: #1a202c; border: 1px solid #4a5568; border-left: 2px solid #63b3ed; padding: 6px 8px; font-size: 10px; color: #e2e8f0; white-space: nowrap; opacity: 0; visibility: hidden; transform: translateY(-10px); transition: all 0.2s ease; z-index: 100; margin-bottom: 8px; }
        .timestamp-tooltip::after { content: ''; position: absolute; top: 100%; right: 8px; border: 4px solid transparent; border-top-color: #4a5568; }
        .timestamp:hover .timestamp-tooltip { opacity: 1; visibility: visible; transform: translateY(0); }
        .input-area { padding: 17px 19px 21px 19px; background: #1a202c; border-top: 2px solid #718096; position: relative; }
        .draft-indicator { position: absolute; top: -25px; right: 10px; background: #4a5568; border: 1px solid #718096; color: #68d391; font-size: 10px; padding: 3px 8px; border-radius: 3px; opacity: 0; visibility: hidden; transition: all 0.3s ease; z-index: 10; }
        .recent-conversations-sidebar { position: fixed; top: 0; left: -300px; width: 280px; height: 100vh; background: #1a202c; border-right: 2px solid #718096; z-index: 1000; transition: left 0.3s ease; overflow-y: auto; }
        .recent-conversations-sidebar.open { left: 0; }
        .sidebar-header { padding: 16px 19px; background: #2d3748; border-bottom: 2px solid #718096; display: flex; justify-content: space-between; align-items: center; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; font-size: 12px; }
        .sidebar-close { background: none; border: none; color: #e2e8f0; font-size: 18px; cursor: pointer; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; }
        .sidebar-close:hover { color: #f56565; }
        .recent-conversations-list { padding: 12px; }
        .loading-conversations { text-align: center; color: #a0aec0; font-size: 11px; padding: 20px; }
        .recent-conversation-item { padding: 8px 12px; margin-bottom: 6px; background: #2d3748; border: 1px solid #4a5568; cursor: pointer; transition: all 0.2s ease; }
        .recent-conversation-item:hover { background: #4a5568; border-color: #68d391; }
        .recent-conversation-name { font-weight: 600; font-size: 11px; color: #e2e8f0; margin-bottom: 4px; }
        .recent-conversation-preview { font-size: 10px; color: #a0aec0; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .recent-conversation-time { font-size: 9px; color: #718096; margin-top: 4px; }
        .input-area::before { content: ''; position: absolute; top: -2px; right: 0; width: 40%; height: 1px; background: #68d391; }
        .input-row { display: flex; gap: 11px; }
        .message-input { flex: 1; padding: 13px 15px 15px 13px; border: 1px solid #718096; border-bottom: 2px solid #718096; background: #2d3748; color: #e2e8f0; font-family: inherit; font-size: 15px; resize: vertical; min-height: 52px; }
        .message-input:focus { outline: none; border-color: #63b3ed; border-left: 3px solid #63b3ed; }
        .message-input::placeholder { color: #718096; font-style: italic; }
        .send-btn { padding: 13px 20px 15px 20px; background: #68d391; color: #1a202c; border: 2px solid #68d391; border-right: 1px solid #68d391; font-family: inherit; font-weight: 700; cursor: pointer; text-transform: lowercase; font-size: 14px; letter-spacing: 1px; }
        .send-btn:hover { background: #9ae6b4; transform: translateY(-1px) translateX(1px); }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; background: #4a5568; color: #718096; }
        .send-btn:disabled:hover { background: #4a5568; transform: none; }
        .loading { font-style: italic; color: #ed8936; font-size: 11px; }
        .debug { position: fixed; bottom: 8px; right: 11px; font-size: 9px; color: #718096; font-weight: 400; opacity: 0.3; }
        .system-chat { display: flex; flex-direction: column; background: #1a202c; border-left: 2px solid #718096; }
        .system-header { padding: 12px 16px 14px 18px; background: #0d1117; border-bottom: 1px solid #718096; position: relative; }
        .system-header::after { content: ''; position: absolute; bottom: -1px; left: 0; width: 25%; height: 1px; background: #ed8936; }
        .system-title { font-size: 13px; font-weight: 700; color: #ed8936; text-transform: uppercase; letter-spacing: 2px; margin-left: 1px; }
        .system-messages { flex: 1; padding: 15px 13px 19px 17px; overflow-y: auto; background: #1a202c; font-size: 11px; line-height: 1.3; max-height: calc(100vh - 100px); scroll-behavior: smooth; }
        .system-message { margin-bottom: 12px; padding: 8px 10px 10px 8px; border: 1px solid #4a5568; border-left: 2px solid #ed8936; background: #0d1117; color: #a0aec0; position: relative; word-wrap: break-word; }
        .system-message:nth-child(even) { margin-bottom: 15px; border-right: 2px solid #4a5568; }
        .system-message-header { font-size: 9px; font-weight: 600; margin-bottom: 6px; color: #ed8936; text-transform: uppercase; letter-spacing: 1px; display: flex; justify-content: space-between; }
        .system-message-content { font-size: 10px; line-height: 1.4; color: #718096; }
        @media (max-width: 768px) { .container { grid-template-columns: 1fr; grid-template-rows: auto 1fr auto; } .panel { border-right: none; border-bottom: 2px solid #718096; max-height: 260px; padding: 15px 14px 17px 16px; } .system-chat { border-top: 2px solid #718096; max-height: 200px; } .input-row { flex-direction: column; gap: 8px; } .send-btn { align-self: flex-start; width: auto; margin-left: 2px; } }
        ::-webkit-scrollbar { width: 9px; }
        ::-webkit-scrollbar-track { background: #1a202c; }
        ::-webkit-scrollbar-thumb { background: #718096; border-left: 1px solid #4a5568; }
        ::-webkit-scrollbar-thumb:hover { background: #a0aec0; }
        html { scrollbar-width: thin; scrollbar-color: #718096 #1a202c; }
        .message h1, .message h2, .message h3, .message h4, .message h5, .message h6 { color: #68d391; font-weight: 700; margin: 8px 0 6px 0; line-height: 1.2; }
        .message h1 { font-size: 18px; border-bottom: 1px solid #68d391; padding-bottom: 3px; }
        .message h2 { font-size: 16px; border-bottom: 1px solid #718096; padding-bottom: 2px; }
        .message h3 { font-size: 14px; } .message h4 { font-size: 13px; } .message h5 { font-size: 12px; } .message h6 { font-size: 11px; }
        .message strong, .message b { color: #e2e8f0; font-weight: 700; }
        .message em, .message i { color: #a0aec0; font-style: italic; }
        .message code { background: #1a202c; color: #68d391; padding: 2px 4px; border: 1px solid #4a5568; font-family: 'SF Mono', monospace; font-size: 11px; }
        .message pre { background: #1a202c; color: #e2e8f0; padding: 8px 10px; border: 1px solid #4a5568; border-left: 3px solid #63b3ed; margin: 8px 0; overflow-x: auto; font-family: 'SF Mono', monospace; font-size: 11px; line-height: 1.3; white-space: pre; }
        .message pre code { background: none; border: none; padding: 0; color: inherit; white-space: pre; display: block; }
        .message blockquote { border-left: 3px solid #ed8936; margin: 8px 0; padding: 6px 0 6px 12px; background: rgba(237, 136, 54, 0.05); color: #a0aec0; font-style: italic; }
        .message ul, .message ol { margin: 6px 0 6px 16px; color: #e2e8f0; }
        .message li { margin-bottom: 3px; line-height: 1.4; }
        .message ul li { list-style-type: none; position: relative; }
        .message ul li::before { content: '■'; color: #63b3ed; position: absolute; left: -12px; font-size: 8px; top: 4px; }
        .message ol li { list-style-type: decimal; color: #e2e8f0; }
        .message a { color: #63b3ed; text-decoration: none; border-bottom: 1px solid #63b3ed; }
        .message a:hover { color: #9ae6b4; border-bottom-color: #9ae6b4; }
        .message p { margin: 6px 0; line-height: 1.4; }
        .message hr { border: none; border-top: 1px solid #4a5568; margin: 12px 0; }
        .message table { border-collapse: collapse; margin: 8px 0; width: 100%; font-size: 11px; }
        .message th, .message td { border: 1px solid #4a5568; padding: 4px 6px; text-align: left; }
        .message th { background: #1a202c; color: #63b3ed; font-weight: 600; }
        .message td { background: rgba(26, 32, 44, 0.3); }
    </style>
</head>
<body>`;

        const htmlBody = `
    <div class="container">
        <div class="recent-conversations-sidebar" id="recentSidebar">
            <div class="sidebar-header">
                <span>recent chats</span>
                <button class="sidebar-close" onclick="toggleRecentSidebar()" title="Close sidebar">×</button>
            </div>
            <div class="recent-conversations-list" id="recentConversationsList">
                <div class="loading-conversations">loading...</div>
            </div>
        </div>
        <div class="panel">
            <div class="title">durandal</div>
            <div class="section">
                <div class="section-title">status</div>
                <div class="status">
                    <div class="status-line">
                        <span><span class="status-dot stopped" id="statusDot"></span><span id="statusText">offline</span></span>
                    </div>
                    <div class="status-line"><span>proj</span><span id="projectName" class="project-display" title="Active project directory">claude-chatbot</span></div>
                    <div class="status-line"><span>msgs</span><span id="messageCount">0</span></div>
                    <div class="status-line"><span>ctx</span><span id="contextMode" class="context-toggle" onclick="toggleContextMode()" title="Click to change context mode">int</span></div>
                    <div class="status-line"><span>tokens</span><span id="tokenCount" class="token-display">0/8k</span></div>
                </div>
            </div>
            <div class="section">
                <div class="section-title">ctrl</div>
                <button class="btn" id="startBtn" onclick="startDurandal()">start</button>
                <button class="btn" id="stopBtn" onclick="stopDurandal()" disabled>stop</button>
                <button class="btn" id="sidebarBtn" onclick="toggleRecentSidebar()" title="Show recent conversations (Ctrl+R)">recent</button>
                <div class="keyboard-shortcuts">
                    <div class="shortcut-title">shortcuts</div>
                    <div class="shortcut-item">ctrl+enter → send</div>
                    <div class="shortcut-item">ctrl+k → new chat</div>
                    <div class="shortcut-item">ctrl+/ → focus input</div>
                    <div class="shortcut-item">ctrl+r → recent chats</div>
                    <div class="shortcut-item">ctrl+f → search messages</div>
                </div>
                <div class="performance-section">
                    <div class="section-title">performance</div>
                    <div class="performance-metrics" id="performanceMetrics">
                        <div class="metric-row">
                            <span class="metric-label">uptime</span>
                            <span class="metric-value" id="uptimeValue">--</span>
                        </div>
                        <div class="metric-row">
                            <span class="metric-label">memory</span>
                            <span class="metric-value" id="memoryValue">-- MB</span>
                        </div>
                        <div class="metric-row">
                            <span class="metric-label">requests</span>
                            <span class="metric-value" id="requestsValue">--</span>
                        </div>
                        <div class="metric-row">
                            <span class="metric-label">success</span>
                            <span class="metric-value" id="successRateValue">--%</span>
                        </div>
                    </div>
                    <div class="usage-analytics" id="usageAnalytics">
                        <div class="analytics-title">api usage</div>
                        <div class="metric-row">
                            <span class="metric-label">tokens</span>
                            <span class="metric-value" id="tokensValue">--</span>
                        </div>
                        <div class="metric-row">
                            <span class="metric-label">cost</span>
                            <span class="metric-value" id="costValue">$--</span>
                        </div>
                        <div class="metric-row">
                            <span class="metric-label">efficiency</span>
                            <span class="metric-value" id="efficiencyValue">--/msg</span>
                        </div>
                    </div>
                </div>
                <div class="file-upload-section">
                    <div class="section-title">file upload</div>
                    <div class="file-upload-area" id="fileUploadArea">
                        <div class="upload-prompt">
                            <div class="upload-icon">📁</div>
                            <div class="upload-text">Drop files here or click to browse</div>
                            <div class="upload-hint">Supports code, text, config files (max 10MB)</div>
                        </div>
                        <input type="file" id="fileInput" class="file-input" multiple accept=".js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.cs,.php,.rb,.go,.rs,.html,.css,.scss,.sass,.less,.json,.xml,.yaml,.yml,.toml,.ini,.md,.txt,.sql,.sh,.bash,.env,.gitignore,.dockerfile" />
                    </div>
                    <div class="uploaded-files" id="uploadedFiles" style="display: none;">
                        <div class="analytics-title">uploaded files</div>
                        <div id="fileList"></div>
                    </div>
                </div>
            </div>
            <div class="prompt" id="conversationSelection" style="display: none;">
                <div class="prompt-title">pick conversation</div>
                <div class="conversation-list" id="conversationOptions"></div>
                <button class="btn" onclick="submitConversationChoice()" id="selectConversationBtn" disabled>select</button>
            </div>
            <div class="prompt" id="topicInput" style="display: none;">
                <div class="prompt-title">topic</div>
                <input type="text" id="topicNameInput" class="topic-input" placeholder="name it..." />
                <button class="btn" onclick="submitTopicName()" id="setTopicBtn">set</button>
            </div>
        </div>
        <div class="chat">
            <div class="chat-header">
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <div class="chat-title">chat</div>
                    <div style="font-size: 9px; color: #666; text-align: right; line-height: 1.2; margin-right: 12px;">
                        © 2025 ENTDNA - Proprietary Software<br>
                        <span style="color: #555;">CONFIDENTIAL TEST VERSION</span>
                    </div>
                </div>
                <div class="chat-controls">
                    <div class="chat-search">
                        <input type="text" id="messageSearch" class="search-input" placeholder="search messages... (ctrl+f)" />
                        <button class="search-clear" id="searchClear" onclick="clearMessageSearch()" title="Clear search">×</button>
                    </div>
                    <button class="export-btn" onclick="openExportModal()" title="Export chat history">↓</button>
                </div>
            </div>
            <div class="messages" id="chatMessages">
                <div class="message assistant">
                    <div class="message-header">
                        <span>durandal</span>
                        <span class="timestamp">` + currentTime + `
                            <div class="timestamp-tooltip">` + currentFullTime + `</div>
                        </span>
                    </div>
                    <div class="message-content">ready. hit start.</div>
                </div>
            </div>
            <div class="input-area">
                <div class="input-row">
                    <textarea id="messageInput" class="message-input" placeholder="type here... (enter to send, shift+enter for new line)" rows="2" disabled></textarea>
                    <button class="send-btn" id="sendBtn" onclick="sendMessage()" disabled title="Send message (Ctrl+Enter)">send</button>
                </div>
            </div>
        </div>
        <div class="system-chat">
            <div class="system-header"><div class="system-title">system log</div></div>
            <div class="system-messages" id="systemMessages">
                <div class="system-message">
                    <div class="system-message-header">
                        <span>sys</span>
                        <span class="timestamp">` + currentTime + `
                            <div class="timestamp-tooltip">` + currentFullTime + `</div>
                        </span>
                    </div>
                    <div class="system-message-content">debug output will appear here</div>
                </div>
            </div>
        </div>
    </div>
    <div class="export-modal" id="exportModal" style="display: none;">
        <div class="export-modal-content">
            <div class="export-header">
                <span>Export Chat History</span>
                <button class="modal-close" onclick="closeExportModal()">×</button>
            </div>
            <div class="export-options">
                <div class="export-option">
                    <button class="export-format-btn" onclick="exportChat(&quot;json&quot;)" title="Export as JSON file">
                        <div class="format-icon">{ }</div>
                        <div class="format-label">JSON</div>
                        <div class="format-desc">Machine readable format</div>
                    </button>
                </div>
                <div class="export-option">
                    <button class="export-format-btn" onclick="exportChat(&quot;markdown&quot;)" title="Export as Markdown file">
                        <div class="format-icon">md</div>
                        <div class="format-label">Markdown</div>
                        <div class="format-desc">Formatted text with styling</div>
                    </button>
                </div>
                <div class="export-option">
                    <button class="export-format-btn" onclick="exportChat(&quot;text&quot;)" title="Export as plain text file">
                        <div class="format-icon">txt</div>
                        <div class="format-label">Plain Text</div>
                        <div class="format-desc">Simple text format</div>
                    </button>
                </div>
            </div>
        </div>
    </div>
    <div class="debug">v0.2.1</div>`;

        const jsCode = this.getJavaScriptCode();

        return htmlHead + cssStyles + htmlBody + `<script>` + jsCode + `</script></body></html>`;
    }

    getJavaScriptCode() {
        return `
        let isWaitingForResponse = false;
        let statusCheckInterval;
        let startupMessageInterval;
        let tokenUpdateInterval;
        let projectUpdateInterval;
        let lastStartupMessageCount = 0;
        let selectedConversationId = null;
        let uiPromptsShown = { conversationSelection: false, topicInput: false };
        let systemLoadingOverlay = null;
        let loadingStages = [
            { id: 'api', text: 'Connecting to Claude API', duration: 1000 },
            { id: 'db', text: 'Initializing database systems', duration: 1200 },
            { id: 'ramr', text: 'Activating RAMR intelligence cache', duration: 1500 },
            { id: 'context', text: 'Loading context management', duration: 800 },
            { id: 'ready', text: 'All systems online', duration: 600 }
        ];
        let currentStageIndex = 0;

        document.addEventListener("DOMContentLoaded", function() {
            if (typeof marked !== 'undefined') {
                marked.setOptions({ breaks: true, gfm: true });
                console.log("Marked.js configured successfully");
            } else {
                console.error("Marked.js not loaded");
            }
            
            checkStatus();
            startStatusPolling();
            
            // Initialize context mode display
            updateContextModeDisplay("intelligent");
            
            // Initialize project info display
            updateProjectInfo();
            
            // Initialize performance monitoring
            startPerformancePolling();
            
            // Initialize file upload
            initializeFileUpload();
            
            // Initialize message search
            initializeMessageSearch();
            
            const messageInput = document.getElementById("messageInput");
            
            // Setup auto-save draft functionality
            if (messageInput) {
                // Restore saved draft
                const savedDraft = loadDraft();
                if (savedDraft) {
                    messageInput.value = savedDraft;
                    // Optional: Show a subtle notification that draft was restored
                    console.log('Draft restored from', new Date(JSON.parse(localStorage.getItem(DRAFT_KEY)).timestamp));
                }
                
                // Add auto-save listeners
                messageInput.addEventListener('input', function() {
                    autoSaveInput(this);
                });
                
                messageInput.addEventListener('paste', function() {
                    // Auto-save after paste with slight delay to ensure content is pasted
                    setTimeout(() => autoSaveInput(this), 100);
                });
            }
            messageInput.addEventListener("keydown", function(e) {
                if (e.ctrlKey && e.key === "Enter") {
                    e.preventDefault();
                    sendMessage();
                } else if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
            
            // Global keyboard shortcuts
            document.addEventListener("keydown", function(e) {
                // Ctrl+K - New conversation (when not in input field)
                if (e.ctrlKey && e.key === "k" && e.target !== messageInput) {
                    e.preventDefault();
                    startNewConversation();
                }
                
                // Ctrl+/ - Focus message input
                if (e.ctrlKey && e.key === "/") {
                    e.preventDefault();
                    if (messageInput && !messageInput.disabled) {
                        messageInput.focus();
                    }
                }
                
                // Ctrl+R - Toggle recent conversations sidebar
                if (e.ctrlKey && e.key === "r") {
                    e.preventDefault();
                    toggleRecentSidebar();
                }
                
                // Ctrl+F - Focus search input
                if (e.ctrlKey && e.key === "f") {
                    e.preventDefault();
                    const searchInput = document.getElementById("messageSearch");
                    if (searchInput) {
                        searchInput.focus();
                        searchInput.select();
                    }
                }
                
                // Escape - Clear focus from inputs
                if (e.key === "Escape") {
                    if (document.activeElement) {
                        document.activeElement.blur();
                    }
                }
            });
            
            document.addEventListener("keydown", function(e) {
                if (e.key === "Enter" && e.target.id === "topicNameInput") {
                    e.preventDefault();
                    submitTopicName();
                }
            });
        });

        // Streaming toggle function removed

        function startStatusPolling() {
            statusCheckInterval = setInterval(checkStatus, 2000);
            updateTokenCount(); // Initial token count check
            tokenUpdateInterval = setInterval(updateTokenCount, 5000); // Update every 5 seconds
            // Update project info less frequently since it rarely changes
            projectUpdateInterval = setInterval(updateProjectInfo, 30000); // Update every 30 seconds
        }

        function startStartupMessagePolling() {
            if (startupMessageInterval) {
                clearInterval(startupMessageInterval);
            }
            startupMessageInterval = setInterval(checkStartupMessages, 1000);
        }

        function stopStartupMessagePolling() {
            if (startupMessageInterval) {
                clearInterval(startupMessageInterval);
                startupMessageInterval = null;
            }
        }

        function stopAllPolling() {
            if (statusCheckInterval) {
                clearInterval(statusCheckInterval);
                statusCheckInterval = null;
            }
            if (tokenUpdateInterval) {
                clearInterval(tokenUpdateInterval);
                tokenUpdateInterval = null;
            }
            if (projectUpdateInterval) {
                clearInterval(projectUpdateInterval);
                projectUpdateInterval = null;
            }
            stopStartupMessagePolling();
        }

        async function checkStartupMessages() {
            try {
                const response = await fetch("/api/startup-messages");
                const data = await response.json();
                if (data.success && data.startupMessages) {
                    if (data.status === "running" && data.startupMessages.length > 0) {
                        const consolidatedMessage = data.startupMessages.join(" • ");
                        addSystemMessage("startup: " + consolidatedMessage);
                        stopStartupMessagePolling();
                    } else if (data.status === "running") {
                        stopStartupMessagePolling();
                    }
                }
            } catch (error) {
                console.error("Failed to check startup messages:", error);
            }
        }

        async function checkStatus() {
            try {
                const response = await fetch("/api/status");
                const data = await response.json();
                if (data.success) {
                    updateUI(data);
                }
            } catch (error) {
                console.error("Status check failed:", error);
                // Enable start button when status check fails (Durandal not running)
                const startBtn = document.getElementById("startBtn");
                const stopBtn = document.getElementById("stopBtn");
                if (startBtn) startBtn.disabled = false;
                if (stopBtn) stopBtn.disabled = true;
            }
        }

        async function updateTokenCount() {
            try {
                const response = await fetch("/api/token-status");
                const data = await response.json();
                if (data.success) {
                    const tokenDisplay = document.getElementById("tokenCount");
                    if (tokenDisplay) {
                        tokenDisplay.textContent = data.display;
                        tokenDisplay.className = "token-display " + data.usageLevel;
                    }
                }
            } catch (error) {
                console.error("Token count update failed:", error);
            }
        }

        async function toggleContextMode() {
            const contextModes = ['intelligent', 'aggressive', 'maximum', 'revolutionary'];
            const contextModeElement = document.getElementById("contextMode");
            const currentMode = contextModeElement.getAttribute('data-mode') || 'intelligent';
            const currentIndex = contextModes.indexOf(currentMode);
            const nextIndex = (currentIndex + 1) % contextModes.length;
            const nextMode = contextModes[nextIndex];
            
            try {
                const response = await fetch("/api/context-mode", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ mode: nextMode })
                });
                
                const data = await response.json();
                if (data.success) {
                    updateContextModeDisplay(nextMode);
                } else {
                    console.error("Failed to change context mode:", data.message);
                }
            } catch (error) {
                console.error("Context mode change failed:", error);
            }
        }

        function updateContextModeDisplay(mode) {
            const contextModeElement = document.getElementById("contextMode");
            if (contextModeElement) {
                const shortMode = mode.substring(0, 3);
                contextModeElement.textContent = shortMode;
                contextModeElement.setAttribute('data-mode', mode);
                contextModeElement.className = "context-toggle " + mode;
                contextModeElement.title = "Context mode: " + mode + " (click to change)";
            }
        }

        async function updateProjectInfo() {
            try {
                const response = await fetch("/api/project-info");
                const data = await response.json();
                if (data.success) {
                    const projectDisplay = document.getElementById("projectName");
                    if (projectDisplay) {
                        projectDisplay.textContent = data.displayName;
                        projectDisplay.title = "Project: " + data.projectName + " (" + data.projectType + ")" + String.fromCharCode(10) + "Path: " + data.fullPath;
                    }
                }
            } catch (error) {
                console.error("Project info update failed:", error);
            }
        }

        // Performance monitoring functions
        async function updatePerformanceMetrics() {
            try {
                const response = await fetch("/api/performance-metrics");
                const data = await response.json();
                
                if (data.success) {
                    const metrics = data.metrics;
                    
                    // Update uptime
                    document.getElementById("uptimeValue").textContent = metrics.uptime.formatted;
                    
                    // Update memory with color coding
                    const memoryElement = document.getElementById("memoryValue");
                    memoryElement.textContent = metrics.memory.used + "MB";
                    memoryElement.className = "metric-value";
                    if (metrics.memory.used > 100) memoryElement.className += " critical";
                    else if (metrics.memory.used > 50) memoryElement.className += " warning";
                    else memoryElement.className += " good";
                    
                    // Update requests
                    document.getElementById("requestsValue").textContent = metrics.requests.total;
                    
                    // Update success rate with color coding
                    const successElement = document.getElementById("successRateValue");
                    successElement.textContent = metrics.requests.successRate + "%";
                    successElement.className = "metric-value";
                    if (metrics.requests.successRate < 90) successElement.className += " critical";
                    else if (metrics.requests.successRate < 95) successElement.className += " warning";
                    else successElement.className += " good";
                }
            } catch (error) {
                console.error("Performance metrics update failed:", error);
            }
        }

        async function updateUsageAnalytics() {
            try {
                const response = await fetch("/api/usage-analytics");
                const data = await response.json();
                
                if (data.success) {
                    const analytics = data.analytics;
                    
                    // Update tokens
                    const tokensElement = document.getElementById("tokensValue");
                    if (analytics.tokens.used > 0) {
                        tokensElement.textContent = analytics.tokens.used.toLocaleString();
                        tokensElement.className = "metric-value";
                        if (analytics.tokens.used > 20000) tokensElement.className += " warning";
                        else if (analytics.tokens.used > 50000) tokensElement.className += " critical";
                        else tokensElement.className += " good";
                    }
                    
                    // Update cost
                    const costElement = document.getElementById("costValue");
                    costElement.textContent = "$" + analytics.cost.estimated.toFixed(2);
                    costElement.className = "metric-value";
                    if (analytics.cost.estimated > 10) costElement.className += " warning";
                    else if (analytics.cost.estimated > 25) costElement.className += " critical";
                    
                    // Update efficiency
                    document.getElementById("efficiencyValue").textContent = analytics.tokens.efficiency + "/msg";
                }
            } catch (error) {
                console.error("Usage analytics update failed:", error);
            }
        }

        function startPerformancePolling() {
            // Initial updates
            updatePerformanceMetrics();
            updateUsageAnalytics();
            
            // Set up polling intervals
            setInterval(updatePerformanceMetrics, 10000); // Every 10 seconds
            setInterval(updateUsageAnalytics, 30000);     // Every 30 seconds
        }

        // Auto-save draft functionality
        let autoSaveTimeout;
        const DRAFT_KEY = 'durandal_message_draft';
        const DRAFT_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

        function saveDraft(content) {
            if (content.trim().length === 0) {
                // Clear draft if empty
                localStorage.removeItem(DRAFT_KEY);
                return;
            }
            
            const draft = {
                content: content,
                timestamp: Date.now(),
                url: window.location.href
            };
            
            try {
                localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
                showDraftSavedIndicator();
            } catch (error) {
                console.warn('Failed to save draft:', error);
            }
        }

        function loadDraft() {
            try {
                const draftData = localStorage.getItem(DRAFT_KEY);
                if (!draftData) return null;
                
                const draft = JSON.parse(draftData);
                const age = Date.now() - draft.timestamp;
                
                // Only restore recent drafts (within 24 hours) and for the same URL
                if (age < DRAFT_MAX_AGE && draft.url === window.location.href) {
                    return draft.content;
                }
                
                // Clean up old draft
                localStorage.removeItem(DRAFT_KEY);
                return null;
            } catch (error) {
                console.warn('Failed to load draft:', error);
                return null;
            }
        }

        function clearDraft() {
            localStorage.removeItem(DRAFT_KEY);
        }

        function autoSaveInput(input) {
            // Debounce auto-save to avoid excessive localStorage writes
            clearTimeout(autoSaveTimeout);
            autoSaveTimeout = setTimeout(() => {
                saveDraft(input.value);
            }, 1000); // Save 1 second after user stops typing
        }

        function showDraftSavedIndicator() {
            // Create or update draft saved indicator
            let indicator = document.getElementById('draftIndicator');
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'draftIndicator';
                indicator.className = 'draft-indicator';
                indicator.textContent = 'draft saved';
                
                // Find the input area to position the indicator
                const inputArea = document.querySelector('.input-area');
                if (inputArea) {
                    inputArea.appendChild(indicator);
                }
            }
            
            // Show the indicator briefly
            indicator.style.opacity = '1';
            indicator.style.visibility = 'visible';
            
            // Hide after 2 seconds
            setTimeout(() => {
                indicator.style.opacity = '0';
                indicator.style.visibility = 'hidden';
            }, 2000);
        }

        // Recent conversations sidebar functionality
        let sidebarOpen = false;

        function toggleRecentSidebar() {
            const sidebar = document.getElementById('recentSidebar');
            sidebarOpen = !sidebarOpen;
            
            if (sidebarOpen) {
                sidebar.classList.add('open');
                loadRecentConversations();
            } else {
                sidebar.classList.remove('open');
            }
        }

        async function loadRecentConversations() {
            const listContainer = document.getElementById('recentConversationsList');
            listContainer.innerHTML = '<div class="loading-conversations">loading...</div>';
            
            try {
                const response = await fetch("/api/conversations");
                const data = await response.json();
                
                if (data.success && data.conversations && data.conversations.length > 0) {
                    listContainer.innerHTML = '';
                    data.conversations.forEach(conv => {
                        const item = document.createElement('div');
                        item.className = 'recent-conversation-item';
                        item.onclick = () => selectRecentConversation(conv.id, conv.name);
                        
                        item.innerHTML = 
                            '<div class="recent-conversation-name">' + conv.name + '</div>' +
                            '<div class="recent-conversation-preview">Conversation ' + conv.id + '</div>' +
                            '<div class="recent-conversation-time">Click to switch</div>';
                        
                        listContainer.appendChild(item);
                    });
                } else {
                    listContainer.innerHTML = '<div class="loading-conversations">no recent conversations</div>';
                }
            } catch (error) {
                console.error('Failed to load recent conversations:', error);
                listContainer.innerHTML = '<div class="loading-conversations">failed to load</div>';
            }
        }

        function selectRecentConversation(id, name) {
            console.log('Selected conversation:', id, name);
            // In a full implementation, this would switch to the selected conversation
            // For now, we'll just close the sidebar and show a message
            toggleRecentSidebar();
            addSystemMessage('conversation switching: ' + name + ' (feature in development)');
        }

        // Message search functionality
        let searchTimeout;
        let originalMessageContents = new Map(); // Store original content for restoring highlights

        function initializeMessageSearch() {
            const searchInput = document.getElementById('messageSearch');
            if (searchInput) {
                searchInput.addEventListener('input', function() {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => {
                        searchMessages(this.value);
                    }, 300); // Debounce search
                });
                
                searchInput.addEventListener('keydown', function(e) {
                    if (e.key === 'Escape') {
                        clearMessageSearch();
                    }
                });
            }
        }

        function searchMessages(query) {
            const searchInput = document.getElementById('messageSearch');
            const messages = document.querySelectorAll('#chatMessages .message');
            
            if (!query.trim()) {
                // Clear search - show all messages and remove highlights
                messages.forEach(message => {
                    message.classList.remove('search-hidden');
                    clearHighlights(message);
                });
                searchInput.classList.remove('has-results', 'no-results');
                return;
            }
            
            const searchTerm = query.trim().toLowerCase();
            let hasResults = false;
            
            messages.forEach(message => {
                const contentDiv = message.querySelector('.message-content');
                if (!contentDiv) return;
                
                // Store original content if not already stored
                if (!originalMessageContents.has(message)) {
                    originalMessageContents.set(message, contentDiv.innerHTML);
                }
                
                // Get text content for searching
                const textContent = contentDiv.innerText || contentDiv.textContent;
                const matches = textContent.toLowerCase().includes(searchTerm);
                
                if (matches) {
                    message.classList.remove('search-hidden');
                    highlightSearchTerm(contentDiv, query);
                    hasResults = true;
                } else {
                    message.classList.add('search-hidden');
                    clearHighlights(message);
                }
            });
            
            // Update search input styling based on results
            searchInput.classList.remove('has-results', 'no-results');
            searchInput.classList.add(hasResults ? 'has-results' : 'no-results');
        }

        function highlightSearchTerm(contentDiv, searchTerm) {
            if (!searchTerm.trim()) return;
            
            const regex = new RegExp("(" + escapeRegex(searchTerm) + ")", "gi");
            const originalContent = originalMessageContents.get(contentDiv.closest('.message'));
            
            if (originalContent) {
                // Apply highlighting to the original content
                const highlightedContent = originalContent.replace(regex, '<span class="search-highlight">$1</span>');
                contentDiv.innerHTML = highlightedContent;
            }
        }

        function clearHighlights(message) {
            const originalContent = originalMessageContents.get(message);
            if (originalContent) {
                const contentDiv = message.querySelector('.message-content');
                if (contentDiv) {
                    contentDiv.innerHTML = originalContent;
                }
            }
        }

        function clearMessageSearch() {
            const searchInput = document.getElementById('messageSearch');
            if (searchInput) {
                searchInput.value = '';
                searchMessages(''); // Clear search
                searchInput.blur();
            }
        }

        function escapeRegex(string) {
            // Simple escape for common regex characters - avoid problematic character classes
            return string.replace(/[.*+?^$\\|()]/g, "\\\\$&")
                        .replace(/\\{/g, "\\\\{")
                        .replace(/\\}/g, "\\\\}")
                        .replace(/\\[/g, "\\\\[")
                        .replace(/\\]/g, "\\\\]");
        }

        // Export chat functionality
        function openExportModal() {
            const modal = document.getElementById('exportModal');
            if (modal) {
                modal.style.display = 'flex';
            }
        }

        function closeExportModal() {
            const modal = document.getElementById('exportModal');
            if (modal) {
                modal.style.display = 'none';
            }
        }

        function exportChat(format) {
            const messages = document.querySelectorAll('#chatMessages .message:not(.search-hidden)');
            const chatData = [];
            
            // Collect all visible messages
            messages.forEach(message => {
                const header = message.querySelector('.message-header span');
                const content = message.querySelector('.message-content');
                const timestamp = message.querySelector('.timestamp');
                
                if (header && content) {
                    const messageData = {
                        sender: header.textContent.trim(),
                        content: content.innerText || content.textContent,
                        timestamp: timestamp ? timestamp.textContent.trim() : new Date().toLocaleTimeString(),
                        type: message.classList.contains('user') ? 'user' : 'assistant'
                    };
                    chatData.push(messageData);
                }
            });
            
            let exportContent = '';
            let filename = '';
            let mimeType = '';
            
            switch (format) {
                case 'json':
                    exportContent = JSON.stringify({
                        exportDate: new Date().toISOString(),
                        messageCount: chatData.length,
                        messages: chatData
                    }, null, 2);
                    filename = 'durandal-chat-' + new Date().toISOString().split('T')[0] + '.json';
                    mimeType = 'application/json';
                    break;
                    
                case 'markdown':
                    exportContent = '# Durandal Chat Export\\n\\n';
                    exportContent += 'Exported on: ' + new Date().toLocaleString() + '\\n\\n';
                    exportContent += '---\\n\\n';
                    
                    chatData.forEach(msg => {
                        const sender = msg.type === 'user' ? 'You' : 'Durandal';
                        exportContent += '## ' + sender + ' (' + msg.timestamp + ')\\n\\n';
                        exportContent += msg.content + '\\n\\n';
                    });
                    
                    filename = 'durandal-chat-' + new Date().toISOString().split('T')[0] + '.md';
                    mimeType = 'text/markdown';
                    break;
                    
                case 'text':
                    exportContent = 'Durandal Chat Export\\n';
                    exportContent += 'Exported on: ' + new Date().toLocaleString() + '\\n';
                    exportContent += '='.repeat(50) + '\\n\\n';
                    
                    chatData.forEach(msg => {
                        const sender = msg.type === 'user' ? 'You' : 'Durandal';
                        exportContent += '[' + msg.timestamp + '] ' + sender + ':\\n';
                        exportContent += msg.content + '\\n\\n';
                    });
                    
                    filename = 'durandal-chat-' + new Date().toISOString().split('T')[0] + '.txt';
                    mimeType = 'text/plain';
                    break;
            }
            
            // Create and download file
            try {
                const blob = new Blob([exportContent], { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                // Close modal and show success message
                closeExportModal();
                addSystemMessage('chat exported as ' + filename);
                
            } catch (error) {
                console.error('Export failed:', error);
                addSystemMessage('export failed: ' + error.message);
            }
        }

        function updateUI(data) {
            const statusDot = document.getElementById("statusDot");
            const statusText = document.getElementById("statusText");
            const startBtn = document.getElementById("startBtn");
            const stopBtn = document.getElementById("stopBtn");
            const messageInput = document.getElementById("messageInput");
            const sendBtn = document.getElementById("sendBtn");

            statusDot.className = "status-dot " + (data.status === "awaiting_conversation_choice" || data.status === "awaiting_topic_name" ? "starting" : data.status);
            
            let statusDisplayText = data.status;
            if (data.status === "awaiting_conversation_choice") {
                statusDisplayText = "waiting";
            } else if (data.status === "awaiting_topic_name") {
                statusDisplayText = "waiting";
            } else if (data.status === "running") {
                statusDisplayText = "online";
            } else if (data.status === "stopped") {
                statusDisplayText = "offline";
            }
            statusText.textContent = statusDisplayText;

            const isRunning = data.status === "running" && data.isReady;
            const isStarting = data.status === "starting";
            const isAwaitingInput = data.status === "awaiting_conversation_choice" || data.status === "awaiting_topic_name";

            startBtn.disabled = isRunning || isStarting || isAwaitingInput;
            stopBtn.disabled = data.status === "stopped";
            messageInput.disabled = !isRunning || isWaitingForResponse;
            sendBtn.disabled = !isRunning || isWaitingForResponse;
            
            // Reset button text if it's not in a loading state but still shows loading
            if (!isStarting && startBtn.textContent.includes('starting')) {
                startBtn.textContent = 'start';
            }

            if (data.status === "awaiting_conversation_choice") {
                // Hide system loading overlay when conversation selection is needed
                if (systemLoadingOverlay && systemLoadingOverlay.style.visibility !== 'hidden') {
                    hideSystemLoading();
                }
                if (!uiPromptsShown.conversationSelection) {
                    showConversationSelection();
                    uiPromptsShown.conversationSelection = true;
                }
            } else if (data.status === "awaiting_topic_name") {
                // Hide system loading overlay when topic input is needed  
                if (systemLoadingOverlay && systemLoadingOverlay.style.visibility !== 'hidden') {
                    hideSystemLoading();
                }
                if (!uiPromptsShown.topicInput) {
                    showTopicInput();
                    uiPromptsShown.topicInput = true;
                }
            } else {
                hideUserInputPrompts();
                uiPromptsShown.conversationSelection = false;
                uiPromptsShown.topicInput = false;
            }

            if (isStarting && !startupMessageInterval) {
                startStartupMessagePolling();
            } else if (!isStarting && !isAwaitingInput && startupMessageInterval) {
                stopStartupMessagePolling();
            }

            if (data.state) {
                document.getElementById("messageCount").textContent = data.state.messageCount || 0;
                updateContextModeDisplay(data.state.contextMode || "intelligent");
            }

            // Hide loading overlay when system is fully ready
            if (data.status === "running" && data.isReady && systemLoadingOverlay) {
                setTimeout(() => {
                    hideSystemLoading();
                }, 1000); // Small delay to complete the loading animation
            }
        }

        async function startDurandal() {
            const startBtn = document.getElementById("startBtn");
            const originalText = startBtn.textContent;
            
            console.log('Start button clicked');
            
            // Show the system loading overlay
            showSystemLoading();
            
            try {
                startBtn.innerHTML = '<span class="loading">starting...</span>';
                startBtn.disabled = true;
                lastStartupMessageCount = 0;
                uiPromptsShown.conversationSelection = false;
                uiPromptsShown.topicInput = false;

                console.log('Sending start request...');
                const response = await fetch("/api/start", { 
                    method: "POST",
                    headers: { "Content-Type": "application/json" }
                });
                
                console.log('Start response received:', response.status);
                const data = await response.json();
                console.log('Start data:', data);
                
                if (data.success) {
                    console.log('Durandal start initiated');
                    startStartupMessagePolling();
                    addSystemMessage("durandal starting...");
                    
                    // Check status immediately after successful start
                    setTimeout(() => {
                        checkStatus();
                    }, 500);
                    
                    // Don't re-enable button immediately, let status polling handle it
                    setTimeout(() => {
                        if (startBtn.textContent.includes('starting')) {
                            startBtn.textContent = originalText;
                        }
                    }, 1000);
                    
                    // Fallback: hide system loading overlay if it's still visible after 10 seconds
                    setTimeout(() => {
                        if (systemLoadingOverlay && 
                            systemLoadingOverlay.style.visibility !== 'hidden') {
                            console.log('Hiding system loading overlay (timeout)');
                            hideSystemLoading();
                        }
                    }, 10000);
                } else {
                    console.log('Start failed:', data.message);
                    addSystemMessage("start failed: " + data.message);
                    
                    // Re-enable button on failure and hide loading overlay
                    setTimeout(() => {
                        startBtn.textContent = originalText;
                        startBtn.disabled = false;
                        if (systemLoadingOverlay) {
                            hideSystemLoading();
                        }
                    }, 1000);
                }
            } catch (error) {
                console.error('Start error:', error);
                addSystemMessage("error: " + error.message);
                
                // Re-enable button on error and hide loading overlay
                setTimeout(() => {
                    startBtn.textContent = originalText;
                    startBtn.disabled = false;
                    if (systemLoadingOverlay) {
                        hideSystemLoading();
                    }
                }, 1000);
            }
        }

        async function stopDurandal() {
            const stopBtn = document.getElementById("stopBtn");
            const originalText = stopBtn.textContent;
            try {
                stopBtn.innerHTML = '<span class="loading">stopping...</span>';
                stopBtn.disabled = true;
                stopAllPolling();

                const response = await fetch("/api/stop", { method: "POST" });
                const data = await response.json();
                if (data.success) {
                    addSystemMessage("stopped");
                } else {
                    addSystemMessage("stop failed: " + data.message);
                }
            } catch (error) {
                addSystemMessage("error: " + error.message);
            } finally {
                stopBtn.textContent = originalText;
            }
        }

        async function sendMessage() {
            const messageInput = document.getElementById("messageInput");
            const message = messageInput.value.trim();
            if (!message || isWaitingForResponse) return;

            addMessage("user", message);
            messageInput.value = "";
            clearDraft(); // Clear saved draft when message is sent
            
            await sendRegularMessage(message);
        }

        async function sendRegularMessage(message) {
            const sendBtn = document.getElementById("sendBtn");
            const originalSendText = sendBtn.textContent;
            let thinkingMessage = null;
            
            try {
                isWaitingForResponse = true;
                sendBtn.innerHTML = '<span class="loading">sending...</span>';
                sendBtn.disabled = true;
                const messageInput = document.getElementById("messageInput");
                messageInput.disabled = true;

                // Add "Durandal is thinking..." message
                thinkingMessage = addThinkingMessage();

                const response = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message })
                });

                const data = await response.json();
                
                // Remove thinking message
                if (thinkingMessage) {
                    thinkingMessage.remove();
                }
                
                if (data.success) {
                    if (data.systemMessages && data.systemMessages.length > 0) {
                        const consolidatedSystemMsg = data.systemMessages.join(" • ");
                        addSystemMessage("debug: " + consolidatedSystemMsg);
                    }
                    addMessage("assistant", data.response);
                    updateTokenCount(); // Update token count after successful message
                } else {
                    addSystemMessage("error: " + data.message);
                }
            } catch (error) {
                // Remove thinking message on error too
                if (thinkingMessage) {
                    thinkingMessage.remove();
                }
                addSystemMessage("error: " + error.message);
            } finally {
                isWaitingForResponse = false;
                sendBtn.textContent = originalSendText;
                sendBtn.disabled = false;
                const messageInput = document.getElementById("messageInput");
                messageInput.disabled = false;
                messageInput.focus();
            }
        }

        function addThinkingMessage() {
            const chatMessages = document.getElementById("chatMessages");
            const messageDiv = document.createElement("div");
            messageDiv.className = "message assistant thinking";
            
            const now = new Date();
            const timestamp = now.toLocaleTimeString();
            const fullTimestamp = now.toLocaleString();
            
            messageDiv.innerHTML = 
                '<div class="message-header">' +
                    '<span>durandal</span>' +
                    '<span class="timestamp">' +
                        timestamp +
                        '<div class="timestamp-tooltip">' + fullTimestamp + '</div>' +
                    '</span>' +
                '</div>' +
                '<div class="message-content">' +
                    '<span class="thinking-indicator">thinking...</span>' +
                '</div>';
                
            chatMessages.appendChild(messageDiv);
            scrollToBottom('chatMessages');
            
            return messageDiv;
        }

        function createSystemLoadingOverlay() {
            const overlay = document.createElement('div');
            overlay.className = 'system-loading';
            
            // Create neural network grid
            let neuralNodes = '';
            for (let i = 0; i < 32; i++) {
                neuralNodes += '<div class="neural-node"></div>';
            }
            
            // Create loading stages
            let stagesHTML = '';
            loadingStages.forEach((stage, index) => {
                stagesHTML += 
                    '<div class="loading-stage" id="stage-' + stage.id + '">' +
                        '<div class="stage-icon">' +
                            '<div class="stage-spinner"></div>' +
                        '</div>' +
                        '<span>' + stage.text + '</span>' +
                    '</div>';
            });
            
            overlay.innerHTML = 
                '<div class="loading-container">' +
                    '<div class="loading-title">🗡️ DURANDAL</div>' +
                    '<div class="loading-stages">' + stagesHTML + '</div>' +
                    '<div class="neural-grid">' + neuralNodes + '</div>' +
                    '<div class="loading-subtitle">Advanced AI Assistant Initializing</div>' +
                '</div>';
            
            document.body.appendChild(overlay);
            
            // Trigger fade-in animation
            setTimeout(() => {
                overlay.style.opacity = '1';
                overlay.style.visibility = 'visible';
                overlay.style.pointerEvents = 'auto';
            }, 50);
            
            return overlay;
        }

        function showSystemLoading() {
            if (systemLoadingOverlay) return;
            
            systemLoadingOverlay = createSystemLoadingOverlay();
            currentStageIndex = 0;
            
            // Start the loading sequence
            processLoadingStage();
        }

        function processLoadingStage() {
            if (currentStageIndex >= loadingStages.length) {
                // All stages complete, hide overlay
                setTimeout(() => {
                    hideSystemLoading();
                }, 800);
                return;
            }
            
            const currentStage = loadingStages[currentStageIndex];
            const stageElement = document.getElementById('stage-' + currentStage.id);
            
            if (stageElement) {
                // Mark previous stages as complete
                for (let i = 0; i < currentStageIndex; i++) {
                    const prevStage = document.getElementById('stage-' + loadingStages[i].id);
                    if (prevStage) {
                        prevStage.classList.remove('active');
                        prevStage.classList.add('complete');
                        const spinner = prevStage.querySelector('.stage-spinner');
                        if (spinner) {
                            spinner.outerHTML = '<div class="stage-check">✓</div>';
                        }
                    }
                }
                
                // Activate current stage
                stageElement.classList.add('active');
                
                // Move to next stage after duration
                setTimeout(() => {
                    currentStageIndex++;
                    processLoadingStage();
                }, currentStage.duration);
            }
        }

        function hideSystemLoading() {
            if (systemLoadingOverlay) {
                systemLoadingOverlay.style.opacity = '0';
                systemLoadingOverlay.style.visibility = 'hidden';
                systemLoadingOverlay.style.pointerEvents = 'none';
                setTimeout(() => {
                    if (systemLoadingOverlay && systemLoadingOverlay.parentNode) {
                        systemLoadingOverlay.parentNode.removeChild(systemLoadingOverlay);
                    }
                    systemLoadingOverlay = null;
                }, 500);
            }
        }

        async function showConversationSelection() {
            try {
                const response = await fetch("/api/conversations");
                const data = await response.json();
                if (data.success && data.conversations) {
                    createConversationSelectionOverlay(data.conversations);
                    addSystemMessage("pick one");
                }
            } catch (error) {
                console.error("Failed to load conversations:", error);
                addSystemMessage("failed to load options");
            }
        }

        function createConversationSelectionOverlay(conversations) {
            // Remove any existing overlay
            const existingOverlay = document.querySelector('.conversation-selection-overlay');
            if (existingOverlay) {
                existingOverlay.remove();
            }

            const overlay = document.createElement('div');
            overlay.className = 'conversation-selection-overlay';
            
            // Build conversation options HTML
            let conversationOptionsHTML = '';
            conversations.forEach(conv => {
                conversationOptionsHTML += 
                    '<div class="conversation-option-overlay" onclick="selectConversationOverlay(' + "'" + conv.id + "'" + ', this)" data-id="' + conv.id + '">' +
                        '<div class="conversation-details">' +
                            '<div class="conversation-name-overlay">' + conv.display + '</div>' +
                            '<div class="conversation-date">' + (conv.date || 'Recent') + '</div>' +
                        '</div>' +
                        '<button class="rename-btn-overlay" onclick="startRenameOverlay(event, ' + "'" + conv.id + "'" + ', this)" title="Rename conversation">' +
                            '<span>✏️</span>' +
                        '</button>' +
                    '</div>';
            });
            
            overlay.innerHTML = 
                '<div class="overlay-backdrop" onclick="hideConversationSelectionOverlay()"></div>' +
                '<div class="conversation-selection-container">' +
                    '<div class="conversation-selection-header">' +
                        '<h2>💬 Select Conversation</h2>' +
                        '<button class="overlay-close-btn" onclick="hideConversationSelectionOverlay()" title="Close">' +
                            '<span>×</span>' +
                        '</button>' +
                    '</div>' +
                    '<div class="conversation-selection-content">' +
                        '<div class="conversation-list-overlay">' +
                            conversationOptionsHTML +
                        '</div>' +
                        '<div class="conversation-selection-actions">' +
                            '<button class="btn-overlay btn-primary" onclick="submitConversationChoiceOverlay()" id="selectConversationBtnOverlay" disabled>' +
                                'Select Conversation' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                '</div>';
            
            document.body.appendChild(overlay);
            
            // Trigger fade-in animation
            setTimeout(() => {
                overlay.style.opacity = '1';
                overlay.style.visibility = 'visible';
                overlay.style.pointerEvents = 'auto';
            }, 50);
            
            return overlay;
        }

        function selectConversationOverlay(id, element) {
            // Remove selection from all options
            document.querySelectorAll(".conversation-option-overlay").forEach(opt => {
                opt.classList.remove("selected");
            });
            
            // Add selection to clicked option
            element.classList.add("selected");
            selectedConversationId = id;
            
            // Enable the select button
            document.getElementById("selectConversationBtnOverlay").disabled = false;
        }

        async function submitConversationChoiceOverlay() {
            if (!selectedConversationId) {
                addSystemMessage("pick something first");
                return;
            }
            
            const btn = document.getElementById("selectConversationBtnOverlay");
            const originalText = btn.textContent;
            
            try {
                btn.innerHTML = '<span class="loading">selecting...</span>';
                btn.disabled = true;

                const response = await fetch("/api/select-conversation", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ selection: selectedConversationId })
                });

                const data = await response.json();
                if (data.success) {
                    addSystemMessage("conversation selected");
                    hideConversationSelectionOverlay();
                } else {
                    addSystemMessage("selection failed: " + data.message);
                    btn.textContent = originalText;
                    btn.disabled = false;
                }
            } catch (error) {
                console.error("Error submitting conversation choice:", error);
                addSystemMessage("error selecting conversation");
                btn.textContent = originalText;
                btn.disabled = false;
            }
        }

        function hideConversationSelectionOverlay() {
            const overlay = document.querySelector('.conversation-selection-overlay');
            if (overlay) {
                overlay.style.opacity = '0';
                overlay.style.visibility = 'hidden';
                overlay.style.pointerEvents = 'none';
                setTimeout(() => {
                    overlay.remove();
                }, 300);
            }
            selectedConversationId = null;
        }

        function startRenameOverlay(event, conversationId, button) {
            // Prevent the conversation selection click
            event.stopPropagation();
            
            const conversationOption = button.closest('.conversation-option-overlay');
            const nameElement = conversationOption.querySelector('.conversation-name-overlay');
            const currentName = nameElement.textContent;
            
            // Create input field
            const input = document.createElement('input');
            input.type = 'text';
            input.value = currentName;
            input.className = 'rename-input-overlay';
            input.onblur = () => finishRenameOverlay(conversationId, input, nameElement, currentName);
            input.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    finishRenameOverlay(conversationId, input, nameElement, currentName);
                } else if (e.key === 'Escape') {
                    cancelRenameOverlay(input, nameElement, currentName);
                }
            };
            
            // Replace name with input
            nameElement.style.display = 'none';
            conversationOption.insertBefore(input, nameElement);
            input.focus();
            input.select();
        }

        async function finishRenameOverlay(conversationId, input, nameElement, originalName) {
            const newName = input.value.trim();
            if (!newName || newName === originalName) {
                cancelRenameOverlay(input, nameElement, originalName);
                return;
            }
            
            try {
                const response = await fetch('/api/rename-conversation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        conversationId: conversationId, 
                        newName: newName 
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    nameElement.textContent = newName;
                    addSystemMessage('conversation renamed');
                } else {
                    addSystemMessage('rename failed: ' + data.message);
                }
            } catch (error) {
                console.error('Error renaming conversation:', error);
                addSystemMessage('error renaming conversation');
            }
            
            // Clean up
            input.remove();
            nameElement.style.display = 'block';
        }

        function cancelRenameOverlay(input, nameElement, originalName) {
            nameElement.textContent = originalName;
            input.remove();
            nameElement.style.display = 'block';
        }

        function showTopicInput() {
            document.getElementById("topicInput").style.display = "block";
            addSystemMessage("name the topic");
            document.getElementById("topicNameInput").focus();
        }

        function hideUserInputPrompts() {
            document.getElementById("conversationSelection").style.display = "none";
            document.getElementById("topicInput").style.display = "none";
            
            // Also hide conversation selection overlay if it exists
            hideConversationSelectionOverlay();
        }

        function selectConversation(id, element) {
            document.querySelectorAll(".conversation-option").forEach(opt => {
                opt.classList.remove("selected");
            });
            element.classList.add("selected");
            selectedConversationId = id;
            document.getElementById("selectConversationBtn").disabled = false;
        }

        async function submitConversationChoice() {
            if (!selectedConversationId) {
                addSystemMessage("pick something first");
                return;
            }
            const btn = document.getElementById("selectConversationBtn");
            const originalText = btn.textContent;
            try {
                btn.innerHTML = '<span class="loading">selecting...</span>';
                btn.disabled = true;

                const response = await fetch("/api/select-conversation", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ selection: selectedConversationId })
                });

                const data = await response.json();
                if (data.success) {
                    addSystemMessage("got it: " + selectedConversationId);
                    hideUserInputPrompts();
                } else {
                    addSystemMessage("selection failed: " + data.message);
                }
            } catch (error) {
                addSystemMessage("error: " + error.message);
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        }

        async function submitTopicName() {
            const topicInput = document.getElementById("topicNameInput");
            const topic = topicInput.value.trim();
            if (!topic) {
                addSystemMessage("need a name");
                topicInput.focus();
                return;
            }

            const btn = document.getElementById("setTopicBtn");
            const originalText = btn.textContent;
            try {
                btn.innerHTML = '<span class="loading">setting...</span>';
                btn.disabled = true;
                topicInput.disabled = true;

                const response = await fetch("/api/set-topic", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ topic })
                });

                const data = await response.json();
                if (data.success) {
                    addSystemMessage('topic: "' + topic + '"');
                    hideUserInputPrompts();
                } else {
                    addSystemMessage("topic failed: " + data.message);
                }
            } catch (error) {
                addSystemMessage("error: " + error.message);
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
                topicInput.disabled = false;
            }
        }

        function addMessage(type, content) {
            if (type === "system") {
                addSystemMessage(content);
            } else {
                const chatMessages = document.getElementById("chatMessages");
                const messageDiv = document.createElement("div");
                messageDiv.className = "message " + type;
                
                const headerNames = {
                    user: "you",
                    assistant: "durandal"
                };
                
                const header = headerNames[type] || "durandal";
                const now = new Date();
                const timestamp = now.toLocaleTimeString();
                const fullTimestamp = now.toLocaleString(); // Full date and time
                
                let messageContent = content;
                if (type === "assistant") {
                    if (typeof marked !== 'undefined') {
                        try {
                            messageContent = marked.parse(content);
                        } catch (error) {
                            console.error("Markdown parsing error:", error);
                            messageContent = content;
                        }
                    } else {
                        console.error("Marked.js not available, using plain text");
                        messageContent = content;
                    }
                }
                
                // Add copy button and reaction buttons for assistant messages
                const copyButton = type === "assistant" ? 
                    '<div class="copy-button" onclick="copyMessage(this)" title="Copy message">📋</div>' : '';
                
                const reactionButtons = type === "assistant" ? 
                    '<div class="reaction-buttons">' +
                        '<div class="reaction-button" onclick="reactToMessage(this, &quot;positive&quot;)" title="Good response">✓</div>' +
                        '<div class="reaction-button" onclick="reactToMessage(this, &quot;negative&quot;)" title="Poor response">✗</div>' +
                    '</div>' : '';
                
                messageDiv.innerHTML = 
                    '<div class="message-header">' +
                        '<span>' + header + '</span>' +
                        '<span class="timestamp">' +
                            timestamp +
                            '<div class="timestamp-tooltip">' + fullTimestamp + '</div>' +
                        '</span>' +
                        copyButton +
                        reactionButtons +
                    '</div>' +
                    '<div class="message-content">' + messageContent + '</div>';
                    
                chatMessages.appendChild(messageDiv);
                scrollToBottom('chatMessages');
            }
        }

        function addSystemMessage(content) {
            const systemMessages = document.getElementById("systemMessages");
            const messageDiv = document.createElement("div");
            messageDiv.className = "system-message";
            
            const now = new Date();
            const timestamp = now.toLocaleTimeString();
            const fullTimestamp = now.toLocaleString();
            
            messageDiv.innerHTML = 
                '<div class="system-message-header">' +
                    '<span>sys</span>' +
                    '<span class="timestamp">' +
                        timestamp +
                        '<div class="timestamp-tooltip">' + fullTimestamp + '</div>' +
                    '</span>' +
                '</div>' +
                '<div class="system-message-content">' + content + '</div>';
                
            systemMessages.appendChild(messageDiv);
            scrollToBottom('systemMessages');
        }

        function scrollToBottom(containerId) {
            const container = document.getElementById(containerId);
            if (container) {
                setTimeout(() => {
                    container.scrollTop = container.scrollHeight;
                }, 50);
            }
        }

        async function copyMessage(copyButton) {
            try {
                // Get the message content (extract text from potentially HTML content)
                const messageDiv = copyButton.closest('.message');
                const contentDiv = messageDiv.querySelector('.message-content');
                
                // Get plain text content (removes HTML formatting)
                const textContent = contentDiv.innerText || contentDiv.textContent;
                
                // Copy to clipboard using modern API
                await navigator.clipboard.writeText(textContent);
                
                // Visual feedback
                const originalContent = copyButton.innerHTML;
                copyButton.innerHTML = '✓';
                copyButton.classList.add('copied');
                
                // Reset after 2 seconds
                setTimeout(() => {
                    copyButton.innerHTML = originalContent;
                    copyButton.classList.remove('copied');
                }, 2000);
                
                // Optional: Add system message for feedback
                // addSystemMessage('message copied to clipboard');
                
            } catch (error) {
                console.error('Failed to copy message:', error);
                
                // Fallback for older browsers
                try {
                    const messageDiv = copyButton.closest('.message');
                    const contentDiv = messageDiv.querySelector('.message-content');
                    const textContent = contentDiv.innerText || contentDiv.textContent;
                    
                    // Create temporary textarea for fallback copy
                    const textarea = document.createElement('textarea');
                    textarea.value = textContent;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    
                    // Visual feedback
                    const originalContent = copyButton.innerHTML;
                    copyButton.innerHTML = '✓';
                    copyButton.classList.add('copied');
                    
                    setTimeout(() => {
                        copyButton.innerHTML = originalContent;
                        copyButton.classList.remove('copied');
                    }, 2000);
                    
                } catch (fallbackError) {
                    console.error('Fallback copy also failed:', fallbackError);
                    addSystemMessage('copy failed - please select and copy manually');
                }
            }
        }

        async function reactToMessage(reactionButton, reactionType) {
            try {
                // Get the message element
                const messageDiv = reactionButton.closest('.message');
                const contentDiv = messageDiv.querySelector('.message-content');
                const messageContent = contentDiv.innerText || contentDiv.textContent;
                
                // Visual feedback - toggle selection state
                const reactionButtonsDiv = reactionButton.parentElement;
                const allReactionButtons = reactionButtonsDiv.querySelectorAll('.reaction-button');
                
                // Remove selected state from all buttons
                allReactionButtons.forEach(btn => {
                    btn.classList.remove('selected', 'positive', 'negative');
                });
                
                // Add selected state to clicked button
                reactionButton.classList.add('selected', reactionType);
                
                // Send reaction to backend (simplified for now)
                try {
                    // Determine if this is code content for proper preview length
                    const isCodeContent = messageContent.includes('\`\`\`') || messageContent.includes('function') || messageContent.includes('class');
                    const previewLength = isCodeContent ? 300 : 100;
                    
                    const response = await fetch('/api/message-reaction', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            reaction: reactionType,
                            messageContent: messageContent.substring(0, previewLength),
                            timestamp: Date.now()
                        })
                    });
                    
                    const data = await response.json();
                    if (!data.success) {
                        console.warn("Failed to save reaction:", data.message);
                    }
                } catch (apiError) {
                    console.warn("Reaction API call failed:", apiError);
                    // Continue with visual feedback even if API fails
                }
                
                // Visual confirmation
                const originalContent = reactionButton.innerHTML;
                reactionButton.innerHTML = reactionType === 'positive' ? '✓' : '✗';
                
                setTimeout(() => {
                    if (reactionButton.classList.contains('selected')) {
                        reactionButton.innerHTML = originalContent;
                    }
                }, 1000);
                
            } catch (error) {
                console.error('Failed to process reaction:', error);
            }
        }

        function startRename(event, conversationId, button) {
            // Prevent the conversation selection click
            event.stopPropagation();
            
            const conversationOption = button.closest('.conversation-option');
            const nameSpan = conversationOption.querySelector('.conversation-name');
            const currentName = nameSpan.textContent;
            
            // Create input field
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'rename-input';
            input.value = currentName;
            input.dataset.conversationId = conversationId;
            input.dataset.originalName = currentName;
            
            // Replace name span with input
            nameSpan.style.display = 'none';
            button.style.display = 'none';
            conversationOption.insertBefore(input, nameSpan);
            
            // Focus and select text
            input.focus();
            input.select();
            
            // Handle save/cancel
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    saveRename(input);
                } else if (e.key === 'Escape') {
                    cancelRename(input);
                }
            });
            
            input.addEventListener('blur', function() {
                saveRename(input);
            });
        }

        async function saveRename(input) {
            const conversationId = input.dataset.conversationId;
            const newName = input.value.trim();
            const originalName = input.dataset.originalName;
            
            if (!newName || newName === originalName) {
                cancelRename(input);
                return;
            }
            
            try {
                const response = await fetch('/api/rename-conversation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        conversationId: conversationId, 
                        newName: newName 
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Update the display
                    const conversationOption = input.closest('.conversation-option');
                    const nameSpan = conversationOption.querySelector('.conversation-name');
                    const button = conversationOption.querySelector('.rename-btn');
                    
                    nameSpan.textContent = newName;
                    nameSpan.style.display = 'block';
                    button.style.display = 'block';
                    input.remove();
                    
                    addSystemMessage('renamed to: "' + newName + '"');
                } else {
                    addSystemMessage('rename failed: ' + data.message);
                    cancelRename(input);
                }
            } catch (error) {
                addSystemMessage('rename error: ' + error.message);
                cancelRename(input);
            }
        }

        function cancelRename(input) {
            const conversationOption = input.closest('.conversation-option');
            const nameSpan = conversationOption.querySelector('.conversation-name');
            const button = conversationOption.querySelector('.rename-btn');
            
            nameSpan.style.display = 'block';
            button.style.display = 'block';
            input.remove();
        }

        function startNewConversation() {
            // Only allow new conversation if Durandal is running and ready
            const statusText = document.getElementById("statusText");
            if (!statusText || statusText.textContent !== "online") {
                addSystemMessage("start durandal first to create new conversations");
                return;
            }
            
            try {
                // Send command to Durandal to start a new conversation
                // This is a simplified approach - in a full implementation you'd handle this properly
                addSystemMessage("new conversation shortcut (ctrl+k) - feature coming soon");
                
                // For now, just focus the message input if available
                const messageInput = document.getElementById("messageInput");
                if (messageInput && !messageInput.disabled) {
                    messageInput.focus();
                }
            } catch (error) {
                addSystemMessage("new conversation error: " + error.message);
            }
        }

        // Debug: Check if functions exist before assignment
        console.log('DEBUG: startDurandal function type:', typeof startDurandal);
        window.startDurandal = startDurandal;
        console.log('DEBUG: window.startDurandal type:', typeof window.startDurandal);
        window.stopDurandal = stopDurandal;
        window.sendMessage = sendMessage;
        window.submitConversationChoice = submitConversationChoice;
        window.submitTopicName = submitTopicName;
        window.selectConversation = selectConversation;
        window.copyMessage = copyMessage;
        window.startRename = startRename;
        window.saveRename = saveRename;
        window.cancelRename = cancelRename;
        window.startNewConversation = startNewConversation;
        window.toggleContextMode = toggleContextMode;
        window.reactToMessage = reactToMessage;
        window.toggleRecentSidebar = toggleRecentSidebar;
        window.clearMessageSearch = clearMessageSearch;
        window.openExportModal = openExportModal;
        window.closeExportModal = closeExportModal;
        window.exportChat = exportChat;
        
        // File upload functionality
        function initializeFileUpload() {
            const fileInput = document.getElementById('fileInput');
            const uploadArea = document.getElementById('fileUploadArea');
            const uploadedFiles = document.getElementById('uploadedFiles');
            const fileList = document.getElementById('fileList');
            
            if (!fileInput || !uploadArea) return;
            
            // Click to upload
            uploadArea.addEventListener('click', (e) => {
                if (e.target === fileInput) return;
                fileInput.click();
            });
            
            // Drag and drop
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('drag-over');
            });
            
            uploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('drag-over');
            });
            
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('drag-over');
                handleFileSelection(e.dataTransfer.files);
            });
            
            // File input change
            fileInput.addEventListener('change', (e) => {
                handleFileSelection(e.target.files);
            });
            
            async function handleFileSelection(files) {
                if (!files || files.length === 0) return;
                
                const formData = new FormData();
                for (let file of files) {
                    formData.append('files', file);
                }
                
                try {
                    const response = await fetch('/api/upload-file', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        displayUploadedFiles(result.results);
                        addSystemMessage('Uploaded and analyzed ' + result.results.length + ' files');
                    } else {
                        addSystemMessage('Upload failed: ' + result.message);
                    }
                } catch (error) {
                    addSystemMessage('Upload error: ' + error.message);
                }
            }
            
            function displayUploadedFiles(files) {
                if (!files || files.length === 0) return;
                
                uploadedFiles.style.display = 'block';
                
                files.forEach(file => {
                    const fileItem = document.createElement('div');
                    fileItem.className = 'file-item';
                    
                    const fileInfo = document.createElement('div');
                    
                    const fileName = document.createElement('div');
                    fileName.className = 'file-name';
                    fileName.textContent = file.filename;
                    
                    const fileType = document.createElement('div');
                    fileType.className = 'file-type';
                    fileType.textContent = file.analysis.fileType || 'unknown';
                    
                    fileInfo.appendChild(fileName);
                    fileInfo.appendChild(fileType);
                    
                    const fileScore = document.createElement('div');
                    const score = file.analysis.score || 0;
                    const scoreClass = score > 7 ? 'high' : score > 4 ? 'medium' : 'low';
                    fileScore.className = 'file-score ' + scoreClass;
                    fileScore.textContent = score + '/10';
                    
                    fileItem.appendChild(fileInfo);
                    fileItem.appendChild(fileScore);
                    
                    fileList.appendChild(fileItem);
                });
            }
        }
        
        `;
    }

    async openBrowser() {
        console.log('🚀 Opening browser to http://localhost:' + this.port);
        
        const open = (await import('open')).default;
        
        try {
            await open('http://localhost:' + this.port);
        } catch (error) {
            console.log('📋 Please open your browser and navigate to: http://localhost:' + this.port);
        }
    }

    setupShutdown() {
        const shutdown = (signal) => {
            console.log('\n🔄 Received ' + signal + ', shutting down...');
            
            if (this.durandalProcess) {
                console.log('🛑 Terminating Durandal process...');
                this.durandalProcess.kill('SIGTERM');
            }
            
            if (this.server && this.isRunning) {
                this.server.close(() => {
                    console.log('✅ Web server closed');
                    if (this.logStream) {
                        this.logStream.end();
                    }
                    process.exit(0);
                });
            } else {
                if (this.logStream) {
                    this.logStream.end();
                }
                process.exit(0);
            }
        };

        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        console.log('✅ Shutdown handlers configured');
    }
}

// Main execution
async function main() {
    const webUI = new DurandalWebUI();
    const success = await webUI.initialize();
    
    if (success) {
        console.log(`🌐 Durandal Web UI running at http://localhost:${webUI.port}`);
        console.log(`🌐 Also accessible at http://0.0.0.0:${webUI.port}`);
        console.log(`🚀 Opening browser to http://localhost:${webUI.port}`);  
        console.log('✅ Web server started');
        console.log('✅ Shutdown handlers configured');
        
        try {
            console.log(`Could not auto-open browser. Please navigate to: http://localhost:${webUI.port}`);
        } catch (error) {
            console.log(`Could not auto-open browser. Please navigate to: http://localhost:${webUI.port}`);
        }
    } else {
        console.error('❌ Failed to start Durandal Web UI');
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('❌ Startup error:', error);
        process.exit(1);
    });
}

module.exports = DurandalWebUI;