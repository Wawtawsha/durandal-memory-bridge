/**
 * Simple Dev Assistant - Clean coordinator without over-engineering
 * Combines AI, code analysis, and file operations simply
 */

const path = require('path');
const AIClient = require('./ai-client');
const CodeAnalyzer = require('./code-analyzer');
const FileManager = require('./file-manager');
const SimpleDatabase = require('./simple-database');
const Phase3IntegrationLayer = require('./phase3-integration-layer');

// Phase 4: Semantic Search & AI-Powered Code Understanding
const SemanticCodeIndexing = require('./semantic-code-indexing');
const KnowledgeGraphSystem = require('./knowledge-graph-system');
const PredictiveFileSuggestions = require('./predictive-file-suggestions');
const AutomatedCodeDocumentation = require('./automated-code-documentation');
const AICodeRelationshipAnalysis = require('./ai-code-relationship-analysis');
const AdvancedSearchInterface = require('./advanced-search-interface');

class DevAssistant {
    constructor(options = {}) {
        this.aiClient = new AIClient(options.apiKey);
        this.codeAnalyzer = new CodeAnalyzer();
        this.fileManager = new FileManager(options.workspaceRoot);
        this.database = new SimpleDatabase();
        this.memory = new Map(); // Simple in-memory storage
        this.connections = new Map(); // Database connections
        
        // Initialize Phase 3 Integration Layer
        this.phase3 = new Phase3IntegrationLayer(
            this.fileManager, 
            this.database, 
            { analyzeContent: async (content) => ({ relevance_score: 7, artifact_type: 'analysis' }) },
            { learningEnabled: true }
        );
        
        // Initialize Phase 4: Semantic Search & AI-Powered Code Understanding
        const workspaceRoot = options.workspaceRoot || this.fileManager.workspaceRoot || process.cwd();
        this.semanticIndexing = new SemanticCodeIndexing({ workspaceRoot });
        this.knowledgeGraph = new KnowledgeGraphSystem({ workspaceRoot });
        this.predictiveFiles = new PredictiveFileSuggestions({ workspaceRoot });
        this.codeDocumentation = new AutomatedCodeDocumentation({ workspaceRoot });
        this.codeAnalysis = new AICodeRelationshipAnalysis({ workspaceRoot });
        this.advancedSearch = new AdvancedSearchInterface({
            workspaceRoot,
            semanticIndexing: this.semanticIndexing,
            knowledgeGraph: this.knowledgeGraph,
            predictiveFiles: this.predictiveFiles
        });
        
        // Store workspace root for reference
        this.workspaceRoot = workspaceRoot;
        
        // Initialize both Phase 3 and Phase 4 capabilities
        this.initializePhase3().catch(console.warn);
        this.initializePhase4().catch(console.warn);
    }

    // Phase 3 Initialization
    async initializePhase3() {
        try {
            await this.phase3.initialize();
            console.log('✅ Phase 3 Advanced Commands & Monitoring initialized');
        } catch (error) {
            console.warn('⚠️  Phase 3 initialization failed:', error.message);
        }
    }

    // Phase 4 Initialization
    async initializePhase4() {
        try {
            // Initialize semantic indexing for current workspace
            const workspaceRoot = this.fileManager.workspaceRoot || process.cwd();
            await this.semanticIndexing.indexWorkspace();
            
            // Build initial knowledge graph
            await this.knowledgeGraph.buildGraphFromDirectory(workspaceRoot);
            
            // Initialize predictive file suggestions with basic training data
            await this.predictiveFiles.trainModels(workspaceRoot);
            
            console.log('✅ Phase 4 Semantic Search & AI-Powered Code Understanding initialized');
        } catch (error) {
            console.warn('⚠️  Phase 4 initialization failed:', error.message);
        }
    }

    // Phase 3 Command Processing Interface
    async processAdvancedCommand(command, context = null, args = []) {
        try {
            return await this.phase3.processCommand(command, context, args);
        } catch (error) {
            return {
                handled: false,
                success: false,
                error: error.message,
                command: command
            };
        }
    }

    // Advanced Context Management (Phase 3)
    async setContextMode(mode) {
        const validModes = ['intelligent', 'aggressive', 'maximum', 'revolutionary'];
        if (!validModes.includes(mode)) {
            throw new Error(`Invalid context mode. Valid modes: ${validModes.join(', ')}`);
        }
        
        const command = {
            'intelligent': '/ic',
            'aggressive': '/ac', 
            'maximum': '/mc',
            'revolutionary': '/rm'
        }[mode];
        
        return await this.processAdvancedCommand(command);
    }

    // System Health & Monitoring (Phase 3)
    async getSystemHealth() {
        return await this.processAdvancedCommand('/health');
    }

    async getPerformanceMetrics() {
        return await this.processAdvancedCommand('/perf');
    }

    async runDiagnostics() {
        return await this.processAdvancedCommand('/diag');
    }

    // Knowledge Base Operations (Phase 3)
    async searchKnowledge(query) {
        return await this.processAdvancedCommand('/ks', null, [query]);
    }

    async getKnowledgeStats() {
        return await this.processAdvancedCommand('/kstats');
    }

    async extractKnowledge(conversationContext) {
        return await this.processAdvancedCommand('/kextract', conversationContext);
    }

    // Phase 4: Semantic Search & AI-Powered Code Understanding
    async semanticSearch(query, options = {}) {
        try {
            return await this.advancedSearch.search(query, options);
        } catch (error) {
            throw new Error(`Semantic search failed: ${error.message}`);
        }
    }

    async findSimilarCode(filePath, options = {}) {
        try {
            const results = await this.semanticIndexing.searchSimilar(filePath, options);
            return {
                file: filePath,
                similarFiles: results,
                searchType: 'semantic_similarity'
            };
        } catch (error) {
            throw new Error(`Similar code search failed: ${error.message}`);
        }
    }

    async predictFiles(context = {}, limit = 10) {
        try {
            const predictions = await this.predictiveFiles.generatePredictions(context);
            return {
                context,
                predictions: predictions.slice(0, limit),
                confidence: predictions.length > 0 ? predictions.reduce((sum, p) => sum + (p.confidence || 0.5), 0) / predictions.length : 0
            };
        } catch (error) {
            throw new Error(`File prediction failed: ${error.message}`);
        }
    }

    async generateDocumentation(filePath, options = {}) {
        try {
            return await this.codeDocumentation.generateDocumentation({
                paths: [filePath],
                formats: options.formats || ['markdown', 'jsdoc'],
                types: options.types || ['inline', 'api'],
                ...options
            });
        } catch (error) {
            throw new Error(`Documentation generation failed: ${error.message}`);
        }
    }

    async generateProjectDocumentation(directoryPath = '.', options = {}) {
        try {
            const fullPath = this.fileManager.getFullPath(directoryPath);
            return await this.codeDocumentation.generateProjectDocumentation(fullPath, options);
        } catch (error) {
            throw new Error(`Project documentation generation failed: ${error.message}`);
        }
    }

    async analyzeCodeQuality(filePath) {
        try {
            const analysis = await this.codeAnalysis.assessCodeQuality(filePath);
            return {
                file: filePath,
                qualityScore: analysis.overallScore || 0.7,
                metrics: analysis.metrics || {},
                issues: analysis.issues || [],
                recommendations: analysis.recommendations || []
            };
        } catch (error) {
            throw new Error(`Code quality analysis failed: ${error.message}`);
        }
    }

    async analyzeImpact(filePath) {
        try {
            return await this.codeAnalysis.analyzeImpact(filePath);
        } catch (error) {
            throw new Error(`Impact analysis failed: ${error.message}`);
        }
    }

    async suggestRefactoring(filePath, options = {}) {
        try {
            // If a file path is provided, use its directory
            const directoryPath = path.dirname(filePath);
            return await this.codeAnalysis.suggestRefactoring(directoryPath);
        } catch (error) {
            throw new Error(`Refactoring analysis failed: ${error.message}`);
        }
    }

    async buildKnowledgeGraph(directoryPath = '.') {
        try {
            const fullPath = this.fileManager.getFullPath(directoryPath);
            return await this.knowledgeGraph.buildGraphFromDirectory(fullPath);
        } catch (error) {
            throw new Error(`Knowledge graph building failed: ${error.message}`);
        }
    }

    async getCodeRelationships(filePath) {
        try {
            // First find the node for this file
            const nodes = await this.knowledgeGraph.findNodes(path.basename(filePath));
            if (nodes.length > 0) {
                const relationships = await this.knowledgeGraph.getNodeRelationships(nodes[0].id);
                return {
                    file: filePath,
                    relationships,
                    relatedFiles: relationships.map(r => r.target).slice(0, 10)
                };
            }
            return {
                file: filePath,
                relationships: [],
                relatedFiles: []
            };
        } catch (error) {
            throw new Error(`Code relationship analysis failed: ${error.message}`);
        }
    }

    async indexWorkspace(directoryPath = '.') {
        try {
            const fullPath = this.fileManager.getFullPath(directoryPath);
            
            // Index semantically
            const semanticResults = await this.semanticIndexing.indexDirectory(fullPath);
            
            // Build knowledge graph
            const graphResults = await this.buildKnowledgeGraph(directoryPath);
            
            // Train predictive models
            const predictionResults = await this.predictiveFiles.trainModels(fullPath);
            
            return {
                directory: directoryPath,
                semanticIndexing: semanticResults,
                knowledgeGraph: graphResults,
                predictions: predictionResults,
                summary: {
                    filesIndexed: semanticResults.filesProcessed || 0,
                    relationships: graphResults.relationships || 0,
                    trainingExamples: predictionResults.trainingExamples || 0
                }
            };
        } catch (error) {
            throw new Error(`Workspace indexing failed: ${error.message}`);
        }
    }

    // Core Operations
    async ask(question, files = []) {
        let context = '';
        
        // Add file context if provided
        if (files.length > 0) {
            const fileContents = await Promise.all(
                files.map(async (file) => {
                    try {
                        const { content } = await this.fileManager.readFile(file);
                        const analysis = this.codeAnalyzer.parseCode(content, null, file);
                        return `File: ${file}\nLanguage: ${analysis.language}\nFunctions: ${analysis.functions.join(', ')}\nContent:\n${content}\n\n`;
                    } catch (error) {
                        return `File: ${file}\nError: ${error.message}\n\n`;
                    }
                })
            );
            context = fileContents.join('');
        }

        const response = await this.aiClient.ask(question, context);
        this.rememberConversation(question, response, files);
        return response;
    }

    async analyzeCode(filePath) {
        const analysis = await this.codeAnalyzer.analyzeFile(filePath);
        const aiAnalysis = await this.aiClient.analyzeCode(analysis.content || '', analysis.language);
        
        return {
            ...analysis,
            aiSuggestions: aiAnalysis
        };
    }

    async generateCode(description, language = 'javascript') {
        return this.aiClient.generateCode(description, language);
    }

    async explainCode(filePath) {
        const { content } = await this.fileManager.readFile(filePath);
        const analysis = this.codeAnalyzer.parseCode(content, null, filePath);
        const explanation = await this.aiClient.explainCode(content, analysis.language);
        
        return {
            file: filePath,
            language: analysis.language,
            structure: {
                functions: analysis.functions,
                classes: analysis.classes,
                complexity: analysis.complexity
            },
            explanation
        };
    }

    // File Operations with AI
    async reviewFile(filePath) {
        const analysis = await this.analyzeCode(filePath);
        return {
            file: filePath,
            analysis: analysis.aiSuggestions,
            structure: {
                functions: analysis.functions,
                classes: analysis.classes,
                lines: analysis.lines,
                complexity: analysis.complexity
            }
        };
    }

    async improveCode(filePath, focusAreas = []) {
        const { content } = await this.fileManager.readFile(filePath);
        const analysis = this.codeAnalyzer.parseCode(content, null, filePath);
        
        const focusPrompt = focusAreas.length > 0 ? 
            `Focus especially on: ${focusAreas.join(', ')}` : '';
        
        const question = `Improve this ${analysis.language} code. ${focusPrompt}\n\n${content}`;
        const improvements = await this.aiClient.ask(question);
        
        return {
            file: filePath,
            originalAnalysis: analysis,
            improvements
        };
    }

    async createFile(filePath, description, language = 'javascript') {
        const code = await this.generateCode(description, language);
        await this.fileManager.writeFile(filePath, code);
        
        return {
            file: filePath,
            generated: true,
            description,
            language
        };
    }

    // Project Operations
    async analyzeProject(dirPath = '.') {
        const analyses = await this.codeAnalyzer.analyzeDirectory(this.fileManager.getFullPath(dirPath));
        const summary = this.codeAnalyzer.summarize(analyses);
        
        // Get AI overview
        const projectOverview = `Project has ${summary.totalFiles} files, ${summary.totalLines} lines of code, ${summary.totalFunctions} functions across languages: ${summary.languages.join(', ')}`;
        const aiSummary = await this.aiClient.ask(`Analyze this project structure and provide insights: ${projectOverview}`);
        
        return {
            summary,
            files: analyses,
            aiInsights: aiSummary
        };
    }

    async searchProject(query, dirPath = '.') {
        const searchResults = await this.fileManager.searchFiles(query, dirPath);
        
        if (searchResults.length === 0) {
            return { query, results: [], suggestion: 'No matches found' };
        }

        // Get AI context about search results
        const resultsContext = searchResults.map(r => 
            `${r.file}: ${r.matches.length} matches`
        ).join(', ');
        
        const aiContext = await this.aiClient.ask(`I searched for "${query}" and found matches in: ${resultsContext}. What might this tell us about the codebase?`);
        
        return {
            query,
            results: searchResults,
            aiContext
        };
    }

    // Execution and Testing
    async executeCode(code, language = 'javascript') {
        const result = await this.fileManager.executeCode(code, language);
        
        // If there's an error, ask AI for help
        if (result.exitCode !== 0 || result.stderr) {
            const aiHelp = await this.aiClient.ask(`This ${language} code failed to execute:\n\nCode:\n${code}\n\nError:\n${result.stderr}\n\nHow can I fix it?`);
            result.aiSuggestion = aiHelp;
        }
        
        return result;
    }

    async executeFile(filePath) {
        const { content } = await this.fileManager.readFile(filePath);
        const analysis = this.codeAnalyzer.parseCode(content, null, filePath);
        
        return this.executeCode(content, analysis.language);
    }

    // Memory and Context
    rememberConversation(question, response, files = []) {
        const timestamp = Date.now();
        const memory = {
            timestamp,
            question,
            response,
            files: files.slice(), // Copy array
            id: `conv_${timestamp}`
        };
        
        this.memory.set(memory.id, memory);
        
        // Keep only last 100 conversations
        if (this.memory.size > 100) {
            const oldest = Array.from(this.memory.keys())[0];
            this.memory.delete(oldest);
        }
    }

    getRecentContext(limit = 5) {
        const recent = Array.from(this.memory.values())
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
            
        return recent.map(item => ({
            question: item.question,
            files: item.files,
            timestamp: new Date(item.timestamp).toISOString()
        }));
    }

    clearMemory() {
        this.memory.clear();
    }

    // Utility Methods
    async getWorkspaceInfo() {
        const files = await this.fileManager.listFiles('.', { recursive: true });
        const codeFiles = files.filter(f => !f.isDirectory && this.codeAnalyzer.isCodeFile(f.name));
        
        return {
            workspace: this.fileManager.workspaceRoot,
            totalFiles: files.length,
            codeFiles: codeFiles.length,
            languages: [...new Set(codeFiles.map(f => this.codeAnalyzer.detectLanguage('', f.name)))],
            memoryItems: this.memory.size
        };
    }

    // Database Operations - Phase 1 Integration
    async connectToDatabase(config) {
        try {
            const connectionId = await this.database.connect(config);
            this.connections.set(config.name || connectionId, connectionId);
            this.rememberConversation(
                `Connected to database: ${config.name || config.database}`,
                `Successfully connected to ${config.type} database at ${config.host}`,
                []
            );
            return connectionId;
        } catch (error) {
            throw new Error(`Database connection failed: ${error.message}`);
        }
    }

    async queryDatabase(connectionName, query, params = []) {
        const connectionId = this.connections.get(connectionName);
        if (!connectionId) {
            throw new Error(`No connection found with name: ${connectionName}`);
        }
        
        return await this.database.query(connectionId, query, params);
    }

    async disconnectDatabase(connectionName) {
        const connectionId = this.connections.get(connectionName);
        if (!connectionId) {
            throw new Error(`No connection found with name: ${connectionName}`);
        }
        
        await this.database.disconnect(connectionId);
        this.connections.delete(connectionName);
        return { success: true, message: `Disconnected from database: ${connectionName}` };
    }

    async explainDatabaseSchema(connectionName) {
        const connectionId = this.connections.get(connectionName);
        if (!connectionId) {
            throw new Error(`No connection found with name: ${connectionName}`);
        }

        const documentation = await this.database.generateSchemaDocumentation(connectionId);
        const explanation = await this.aiClient.ask(
            `Explain this database schema in simple terms for a developer who needs to understand the data structure:`,
            JSON.stringify(documentation, null, 2)
        );

        return {
            schema: documentation,
            explanation
        };
    }

    // Demo Scenario #1: "The Legacy Code Mystery" - 4 hours → 5 minutes
    async solveLegacyCodeMystery(keywords = []) {
        const startTime = Date.now();
        
        try {
            const legacyFiles = await this.fileManager.findLegacyFiles(keywords);
            const results = [];

            for (const file of legacyFiles.slice(0, 3)) {
                try {
                    const analysis = await this.analyzeCode(file.relativePath);
                    const explanation = this.codeAnalyzer.explainLegacyCode(analysis);
                    
                    const aiInsight = await this.aiClient.ask(
                        `This appears to be legacy code. Help explain what this code does, identify potential issues, and suggest modernization approaches:`,
                        `File: ${file.name}\n${explanation}\n\nCode:\n${analysis.content?.slice(0, 2000) || 'Content too large'}`
                    );

                    results.push({
                        file: file.name,
                        path: file.relativePath,
                        legacyMarkers: file.legacyMarkers,
                        analysis: explanation,
                        aiInsight
                    });
                } catch (error) {
                    console.warn(`Skipped analysis of ${file.name}: ${error.message}`);
                }
            }

            const timeSaved = this.calculateTimeSavings(startTime, 4 * 60 * 60 * 1000);

            return {
                scenario: "Legacy Code Mystery",
                timeSaved,
                filesAnalyzed: results.length,
                results
            };
        } catch (error) {
            throw new Error(`Legacy code analysis failed: ${error.message}`);
        }
    }

    // Demo Scenario #2: "The Database Schema Detective" - 2 hours → 3 minutes  
    async solveSchemaDetectiveMystery(connectionName) {
        const startTime = Date.now();
        
        try {
            const connectionId = this.connections.get(connectionName);
            if (!connectionId) {
                throw new Error(`No database connection found: ${connectionName}`);
            }

            const demoTables = await this.database.findDemoTables(connectionId);
            const schemaAnalysis = await this.explainDatabaseSchema(connectionName);
            
            const sampleQueries = [];
            for (const table of demoTables.slice(0, 3)) {
                const tableDetails = await this.database.describeTable(connectionId, table.table_name, table.schema_name);
                const queryExample = await this.aiClient.ask(
                    `Generate useful SQL queries for this table that a developer would commonly need:`,
                    `Table: ${table.table_name}\nColumns: ${tableDetails.columns.map(c => `${c.column_name} (${c.data_type})`).join(', ')}`
                );
                
                sampleQueries.push({
                    table: table.table_name,
                    schema: table.schema_name,
                    columns: tableDetails.columns.length,
                    exampleQueries: queryExample
                });
            }

            const timeSaved = this.calculateTimeSavings(startTime, 2 * 60 * 60 * 1000);

            return {
                scenario: "Database Schema Detective",
                timeSaved,
                database: schemaAnalysis.schema.database,
                tablesAnalyzed: sampleQueries.length,
                schema: schemaAnalysis,
                sampleQueries
            };
        } catch (error) {
            throw new Error(`Database schema analysis failed: ${error.message}`);
        }
    }

    // Demo Scenario #3: "The Compliance Code Reviewer" - 30 minutes → 2 minutes
    async performComplianceReview(standards = []) {
        const startTime = Date.now();
        
        try {
            const codeFiles = await this.fileManager.listFiles('', ['.js', '.ts', '.py', '.cs']);
            const reviewResults = [];

            for (const file of codeFiles.slice(0, 5)) {
                try {
                    const analysis = await this.analyzeCode(file.relativePath);
                    const complianceCheck = await this.aiClient.ask(
                        `Review this code for compliance with these standards: ${standards.join(', ') || 'general best practices, security, maintainability'}. Identify violations and suggest fixes:`,
                        `File: ${file.name}\nLanguage: ${analysis.language}\nComplexity: ${analysis.complexity?.score || 'unknown'}\n\nCode:\n${analysis.content?.slice(0, 1500) || 'Content unavailable'}`
                    );

                    reviewResults.push({
                        file: file.name,
                        language: analysis.language,
                        complexity: analysis.complexity?.score || 0,
                        complianceCheck
                    });
                } catch (error) {
                    console.warn(`Skipped compliance review of ${file.name}: ${error.message}`);
                }
            }

            const timeSaved = this.calculateTimeSavings(startTime, 30 * 60 * 1000);

            return {
                scenario: "Compliance Code Review",
                timeSaved,
                filesReviewed: reviewResults.length,
                standards: standards.length > 0 ? standards : ['best practices', 'security', 'maintainability'],
                results: reviewResults
            };
        } catch (error) {
            throw new Error(`Compliance review failed: ${error.message}`);
        }
    }

    // Utility Methods
    calculateTimeSavings(startTime, typicalManualTime) {
        const actualTime = Date.now() - startTime;
        const timeSaved = typicalManualTime - actualTime;
        const improvementPercent = Math.round(((typicalManualTime - actualTime) / typicalManualTime) * 100);
        
        return {
            actualTime: `${Math.round(actualTime / 1000)}s`,
            typicalTime: `${Math.round(typicalManualTime / 60000)}min`,
            timeSaved: `${Math.round(timeSaved / 60000)}min`,
            improvement: `${improvementPercent}%`,
            factor: Math.round(typicalManualTime / actualTime)
        };
    }

    async getSystemStatus() {
        return {
            connections: this.database.listConnections(),
            memorySize: this.memory.size,
            workspaceFiles: (await this.fileManager.getWorkspaceOverview()).totalFiles,
            lastActivity: new Date().toISOString()
        };
    }

    // Phase 2: Enhanced File Processing Operations
    async analyzeFileAdvanced(filePath) {
        try {
            const fileData = await this.fileManager.readFileAdvanced(filePath);
            let aiAnalysis;

            switch (fileData.type) {
                case 'pdf':
                    aiAnalysis = await this.aiClient.ask(
                        `Analyze this PDF document and extract key insights:`,
                        `PDF Content (${fileData.metadata.pages} pages):\n${fileData.content.slice(0, 3000)}`
                    );
                    break;
                case 'excel':
                    const excelContext = `Excel file with ${fileData.summary.totalSheets} sheets:\n` +
                        fileData.summary.sheetNames.map(name => 
                            `${name}: ${fileData.sheets[name].rowCount} rows, ${fileData.sheets[name].colCount} columns`
                        ).join('\n');
                    aiAnalysis = await this.aiClient.ask(
                        `Analyze this Excel spreadsheet and identify data patterns, insights, and potential issues:`,
                        excelContext
                    );
                    break;
                case 'csv':
                    aiAnalysis = await this.aiClient.ask(
                        `Analyze this CSV data file:`,
                        `CSV with ${fileData.summary.totalRows} rows, ${fileData.summary.totalColumns} columns\n` +
                        `Headers: ${fileData.headers.join(', ')}\nPreview:\n${fileData.summary.preview}`
                    );
                    break;
                case 'log':
                    aiAnalysis = await this.aiClient.ask(
                        `Analyze this log file and identify issues, patterns, and recommendations:`,
                        `Log file analysis:\n` +
                        `Errors: ${fileData.analysis.errors.length}\n` +
                        `Warnings: ${fileData.analysis.warnings.length}\n` +
                        `Time span: ${fileData.analysis.timeSpan}\n` +
                        `Recent errors:\n${fileData.analysis.errors.slice(0, 5).map(e => e.content).join('\n')}`
                    );
                    break;
                case 'xml':
                    aiAnalysis = await this.aiClient.ask(
                        `Analyze this XML configuration file:`,
                        `XML Structure:\nRoot: ${fileData.summary.rootElement}\n` +
                        `Content preview:\n${fileData.content.slice(0, 2000)}`
                    );
                    break;
                default:
                    // Fall back to regular code analysis
                    return await this.analyzeCode(filePath);
            }

            this.rememberConversation(
                `Advanced analysis of ${fileData.type} file: ${fileData.name}`,
                aiAnalysis,
                [filePath]
            );

            return {
                file: fileData.name,
                type: fileData.type,
                fileData,
                aiAnalysis
            };
        } catch (error) {
            throw new Error(`Advanced file analysis failed: ${error.message}`);
        }
    }

    async processMultipleFiles(filePaths, analysisType = 'summary') {
        const results = [];
        
        for (const filePath of filePaths.slice(0, 5)) { // Limit for performance
            try {
                const fileData = await this.fileManager.readFileAdvanced(filePath);
                let analysis;

                if (analysisType === 'detailed') {
                    analysis = await this.analyzeFileAdvanced(filePath);
                } else {
                    // Quick summary analysis
                    analysis = {
                        file: fileData.name,
                        type: fileData.type,
                        summary: this.generateFileSummary(fileData)
                    };
                }

                results.push(analysis);
            } catch (error) {
                results.push({
                    file: filePath,
                    error: error.message,
                    type: 'error'
                });
            }
        }

        return {
            totalFiles: results.length,
            processedFiles: results.filter(r => r.type !== 'error').length,
            errorCount: results.filter(r => r.type === 'error').length,
            results
        };
    }

    generateFileSummary(fileData) {
        switch (fileData.type) {
            case 'pdf':
                return `PDF with ${fileData.metadata.pages} pages, ${fileData.metadata.textLength} characters of text`;
            case 'excel':
                return `Excel file: ${fileData.summary.totalSheets} sheets, ${fileData.summary.totalRows} total rows`;
            case 'csv':
                return `CSV: ${fileData.summary.totalRows} rows, ${fileData.summary.totalColumns} columns`;
            case 'log':
                return `Log file: ${fileData.summary.totalLines} lines, ${fileData.summary.errorCount} errors, ${fileData.summary.warningCount} warnings`;
            case 'xml':
                return `XML config: Root element ${fileData.summary.rootElement}, ${Math.round(fileData.summary.size / 1024)}KB`;
            default:
                return `${fileData.type} file: ${Math.round(fileData.size / 1024)}KB`;
        }
    }

    // Enhanced demo scenarios with Phase 2 capabilities
    async analyzeProjectDocuments(keywords = []) {
        const startTime = Date.now();
        
        try {
            // Find all document files (PDFs, Excel, etc.)
            const documentFiles = await this.fileManager.listFiles('', ['.pdf', '.xlsx', '.csv', '.xml', '.log']);
            const results = await this.processMultipleFiles(
                documentFiles.map(f => f.relativePath), 
                'detailed'
            );

            // AI summary of all documents
            const documentsContext = results.results
                .filter(r => r.type !== 'error')
                .map(r => `${r.file} (${r.type}): ${r.fileData ? this.generateFileSummary(r.fileData) : 'Analysis failed'}`)
                .join('\n');

            const overallInsight = await this.aiClient.ask(
                `Analyze these project documents and provide insights about the project's data, configuration, and potential issues:`,
                `Document Analysis:\n${documentsContext}`
            );

            const timeSaved = this.calculateTimeSavings(startTime, 3 * 60 * 60 * 1000); // 3 hours typical

            return {
                scenario: "Project Document Analysis",
                timeSaved,
                documentsAnalyzed: results.processedFiles,
                documentTypes: [...new Set(results.results.filter(r => r.type !== 'error').map(r => r.type))],
                results: results.results,
                overallInsight
            };
        } catch (error) {
            throw new Error(`Project document analysis failed: ${error.message}`);
        }
    }

    async help() {
        return `
AI Development Assistant - Available Commands:

CORE OPERATIONS:
• ask(question, files=[]) - Ask questions with optional file context
• analyzeCode(filePath) - Analyze a code file with AI insights  
• generateCode(description, language) - Generate code from description
• explainCode(filePath) - Get detailed code explanation
• reviewFile(filePath) - Get code review with suggestions
• improveCode(filePath, focusAreas=[]) - Get code improvements
• createFile(filePath, description, language) - Generate new file
• analyzeProject(dirPath) - Analyze entire project structure
• searchProject(query, dirPath) - Search and get AI context
• executeCode(code, language) - Execute code with error assistance
• executeFile(filePath) - Execute a file
• getWorkspaceInfo() - Get workspace overview
• getRecentContext() - See recent conversation history

DATABASE OPERATIONS (Phase 1):
• connectToDatabase(config) - Connect to SQL Server/PostgreSQL
• queryDatabase(connectionName, query, params) - Execute SQL queries
• disconnectDatabase(connectionName) - Disconnect from database
• explainDatabaseSchema(connectionName) - AI-powered schema explanation
• solveLegacyCodeMystery(keywords) - Demo scenario #1 (4hr→5min)
• solveSchemaDetectiveMystery(connectionName) - Demo scenario #2 (2hr→3min)  
• performComplianceReview(standards) - Demo scenario #3 (30min→2min)

ENHANCED FILE PROCESSING (Phase 2 - NEW):
• analyzeFileAdvanced(filePath) - Advanced analysis for PDF, Excel, CSV, XML, Logs
• processMultipleFiles(filePaths, analysisType) - Batch file processing
• analyzeProjectDocuments(keywords) - Comprehensive document analysis

ADVANCED COMMANDS & MONITORING (Phase 3):
• setContextMode(mode) - Set context mode: intelligent, aggressive, maximum, revolutionary
• getSystemHealth() - Get comprehensive system health status
• getPerformanceMetrics() - Get detailed performance metrics
• runDiagnostics() - Run deep system diagnostics
• searchKnowledge(query) - Search integrated knowledge base
• getKnowledgeStats() - Get knowledge base statistics
• extractKnowledge(context) - Extract knowledge from conversation
• processAdvancedCommand(command, context, args) - Process any Phase 3 command directly

SEMANTIC SEARCH & AI CODE UNDERSTANDING (Phase 4 - NEW):
• semanticSearch(query, options) - Advanced semantic code search with natural language
• findSimilarCode(filePath, options) - Find semantically similar code files
• predictFiles(context, limit) - ML-powered file prediction based on context
• generateDocumentation(filePath, options) - Auto-generate code documentation
• generateProjectDocumentation(dirPath, options) - Generate comprehensive project docs
• analyzeCodeQuality(filePath) - AI-powered code quality assessment
• analyzeImpact(filePath) - Analyze potential impact of code changes
• suggestRefactoring(filePath, options) - Get intelligent refactoring suggestions
• buildKnowledgeGraph(dirPath) - Build cross-project code relationship graph
• getCodeRelationships(filePath) - Get file relationships and dependencies
• indexWorkspace(dirPath) - Full semantic indexing of workspace with ML training

PHASE 3 COMMANDS (Direct Access):
Context: /rm, /mc, /ac, /ic, /cs, /ch, /sc, /oc
Knowledge: /ks, /kstats, /kr, /kextract, /koptimize, /kgraph, /kclean, /kbackup
Monitoring: /health, /perf, /diag, /sysmon, /alerts, /trace, /benchmark
• fileManager.readFileAdvanced(filePath) - Direct advanced file reading
• fileManager.getFileType(filePath) - Enhanced file type detection

SUPPORTED FILE TYPES (Phase 2):
• PDF Documents - Text extraction and content analysis
• Excel Spreadsheets (.xlsx, .xls) - Data analysis and sheet processing
• CSV Files - Data structure analysis and insights
• XML Configuration - Structure analysis and validation
• Log Files - Error/warning detection and pattern analysis
• JSON/YAML - Configuration analysis and validation

Example Phase 2 Usage:
const assistant = new DevAssistant();

// Analyze a PDF document
const pdfAnalysis = await assistant.analyzeFileAdvanced('./docs/manual.pdf');

// Process multiple documents
const docResults = await assistant.processMultipleFiles([
    './data/sales.xlsx', './logs/error.log', './config/settings.xml'
]);

// Comprehensive project document analysis
const projectDocs = await assistant.analyzeProjectDocuments(['error', 'config']);

Example Phase 4 Usage:
const assistant = new DevAssistant();

// Semantic search for code
const searchResults = await assistant.semanticSearch('authentication middleware');

// Find similar code patterns
const similarCode = await assistant.findSimilarCode('./auth.js');

// Predict next files to work on
const predictions = await assistant.predictFiles({ taskType: 'debugging', project: 'api' });

// Generate documentation
const docs = await assistant.generateDocumentation('./api/user-service.js');

// Analyze code quality and get suggestions
const quality = await assistant.analyzeCodeQuality('./components/UserForm.js');

// Get refactoring suggestions
const refactoring = await assistant.suggestRefactoring('./legacy-parser.js');

// Index entire workspace for semantic search
const indexResults = await assistant.indexWorkspace('./src');
        `.trim();
    }
}

module.exports = DevAssistant;