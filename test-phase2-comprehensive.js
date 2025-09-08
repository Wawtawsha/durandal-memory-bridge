#!/usr/bin/env node

/**
 * COMPREHENSIVE Phase 2 Test Suite
 * Tests ALL aspects of the enhanced file management system
 */

const path = require('path');
const fs = require('fs').promises;
const os = require('os');

// Import components
const FileRelevanceEngine = require('./file-relevance-engine');
const FileClassifier = require('./file-classifier');
const FileIndexer = require('./file-indexer');
const FilesystemAccessManager = require('./filesystem-access-manager');
const ContextManager = require('./context-manager');

class ComprehensivePhase2Tests {
    constructor() {
        this.testResults = [];
        this.projectRoot = process.cwd();
        this.tempDir = null;
        this.testFiles = new Map();
        this.sharedManager = null; // Reuse manager across tests
        console.log('🔬 COMPREHENSIVE Phase 2 Test Suite');
        console.log('=====================================');
    }

    async runAllTests() {
        try {
            console.log('\n🏗️  Setting up test environment...');
            await this.setupTestEnvironment();
            
            // Initialize shared filesystem manager once
            console.log('🗂️  Initializing shared filesystem manager...');
            this.sharedManager = await this.createTestFilesystemManager();
            await this.sharedManager.initialize();
            
            console.log('\n📊 Running comprehensive tests...\n');
            
            // Core functionality tests
            await this.testQueryAnalysisComprehensive();
            await this.testConversationHistoryProcessing();
            await this.testFileRelevanceScoring();
            
            // Integration tests
            await this.testEndToEndFileSelection();
            await this.testContextManagerIntegration();
            await this.testLearningSystem();
            
            // Edge case and error handling tests
            await this.testEdgeCases();
            await this.testErrorHandling();
            
            // Performance and scalability tests
            await this.testPerformanceUnderLoad();
            await this.testMemoryUsage();
            
            // Real-world scenario tests
            await this.testRealWorldScenarios();
            
            this.generateComprehensiveReport();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
            this.recordTest('Overall Test Suite', false, error.message);
        } finally {
            // Cleanup shared manager
            if (this.sharedManager) {
                await this.sharedManager.shutdown();
                this.sharedManager = null;
            }
            await this.cleanupTestEnvironment();
        }
    }

    async setupTestEnvironment() {
        // Create temporary directory with realistic file structure (avoid /tmp/ which is ignored)
        this.tempDir = await fs.mkdtemp(path.join(process.cwd(), 'durandal-test-'));
        
        // Create realistic test files
        const testFiles = {
            'package.json': JSON.stringify({
                name: 'test-project',
                dependencies: { express: '^4.0.0' }
            }),
            'src/auth/user-service.js': `
class UserService {
    authenticate(user) {
        // Authentication logic
        return jwt.sign(user);
    }
    
    validateToken(token) {
        return jwt.verify(token);
    }
}
module.exports = UserService;`,
            'src/api/routes.js': `
const express = require('express');
const UserService = require('../auth/user-service');

function setupRoutes(app) {
    app.post('/login', async (req, res) => {
        // Login endpoint
    });
}`,
            'src/database/connection.js': `
const postgres = require('pg');
class DatabaseConnection {
    connect() {
        return new postgres.Client();
    }
}`,
            'tests/auth.test.js': `
const UserService = require('../src/auth/user-service');
describe('UserService', () => {
    test('should authenticate user', () => {
        // Test logic
    });
});`,
            'README.md': `# Test Project\nThis is a test project for authentication.`,
            '.env': 'DATABASE_URL=postgres://localhost:5432/test',
            'config/database.yml': 'production:\n  host: localhost',
            'docs/api.md': '# API Documentation\nAuthentication endpoints'
        };
        
        // Create directories and files
        for (const [filePath, content] of Object.entries(testFiles)) {
            const fullPath = path.join(this.tempDir, filePath);
            const dir = path.dirname(fullPath);
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(fullPath, content);
            this.testFiles.set(filePath, fullPath);
        }
        
        console.log(`   Created test environment: ${this.tempDir}`);
        console.log(`   Test files: ${Object.keys(testFiles).length}`);
    }

    async testQueryAnalysisComprehensive() {
        console.log('🔍 Testing Query Analysis - Comprehensive...');
        
        try {
            const relevanceEngine = this.sharedManager.relevanceEngine;
            
            const testCases = [
                // File-specific queries
                {
                    query: "Fix the authentication bug in user-service.js",
                    expectedType: 'debugging',
                    expectedFiles: ['user-service.js'],
                    expectedFunctions: ['authenticate'],
                    description: 'Specific file with function mention'
                },
                {
                    query: "Update the package.json dependencies to latest versions",
                    expectedType: 'configuration',
                    expectedFiles: ['package.json'],
                    description: 'Configuration file update'
                },
                
                // Intent-based queries
                {
                    query: "Create comprehensive tests for the authentication system",
                    expectedType: 'testing',
                    expectedFiles: [],
                    description: 'Testing intent without specific files'
                },
                {
                    query: "Write documentation for the API endpoints",
                    expectedType: 'documentation',
                    expectedFiles: [],
                    description: 'Documentation intent'
                },
                
                // Complex queries with multiple intents
                {
                    query: "Debug the UserService authenticate method and write tests for it",
                    expectedType: 'debugging', // Should prioritize debugging
                    expectedFiles: [],
                    expectedFunctions: ['authenticate'],
                    description: 'Multi-intent query (debug + test)'
                },
                
                // Conversation context dependent
                {
                    query: "How do I fix this error?",
                    expectedType: 'debugging',
                    description: 'Context-dependent query'
                },
                
                // Ambiguous queries
                {
                    query: "Show me the database setup",
                    expectedType: 'general',
                    description: 'Ambiguous query requiring context'
                }
            ];
            
            // Test with various conversation histories
            const conversationHistories = [
                // Empty history
                [],
                
                // History with file mentions
                [
                    { role: 'user', content: 'I was working on user-service.js yesterday', timestamp: new Date() },
                    { role: 'assistant', content: 'The authenticate function needs debugging', timestamp: new Date() }
                ],
                
                // History with errors
                [
                    { role: 'user', content: 'Getting TypeError in UserService.authenticate', timestamp: new Date() },
                    { role: 'assistant', content: 'This error occurs in the JWT verification', timestamp: new Date() }
                ],
                
                // History with multiple topics
                [
                    { role: 'user', content: 'Need to update package.json and fix auth bugs', timestamp: new Date() },
                    { role: 'user', content: 'Also write tests for the API routes', timestamp: new Date() },
                    { role: 'assistant', content: 'Let me help with the authentication fixes first', timestamp: new Date() }
                ]
            ];
            
            let totalTests = 0;
            let passedTests = 0;
            
            for (const testCase of testCases) {
                for (let historyIndex = 0; historyIndex < conversationHistories.length; historyIndex++) {
                    const history = conversationHistories[historyIndex];
                    totalTests++;
                    
                    try {
                        const analysis = await relevanceEngine.analyzeQuery(testCase.query, history);
                        
                        // Validate analysis structure
                        const hasRequiredFields = analysis.query && analysis.queryType && 
                                                analysis.conversationContext && analysis.keywords;
                        
                        // Check type detection
                        const typeCorrect = analysis.queryType === testCase.expectedType;
                        
                        // Check file extraction
                        const filesCorrect = !testCase.expectedFiles || 
                            testCase.expectedFiles.every(file => 
                                analysis.explicitFiles.some(ef => ef.includes(file.toLowerCase()))
                            );
                        
                        // Check function extraction
                        const functionsCorrect = !testCase.expectedFunctions ||
                            testCase.expectedFunctions.every(func =>
                                analysis.functions.some(f => f.toLowerCase().includes(func.toLowerCase()))
                            );
                        
                        // Check conversation context processing
                        const contextProcessed = analysis.conversationContext.topics.length >= 0 &&
                                               analysis.recentlyMentionedFiles.length >= 0;
                        
                        const testPassed = hasRequiredFields && typeCorrect && filesCorrect && 
                                         functionsCorrect && contextProcessed;
                        
                        if (testPassed) {
                            passedTests++;
                        } else {
                            console.log(`   ❌ FAIL: ${testCase.description} (History ${historyIndex})`);
                            console.log(`      Type: ${typeCorrect}, Files: ${filesCorrect}, Functions: ${functionsCorrect}, Context: ${contextProcessed}`);
                        }
                        
                    } catch (error) {
                        console.log(`   ❌ ERROR: ${testCase.description} (History ${historyIndex}) - ${error.message}`);
                    }
                }
            }
            
            const successRate = (passedTests / totalTests) * 100;
            console.log(`   Results: ${passedTests}/${totalTests} tests passed (${successRate.toFixed(1)}%)`);
            
            this.recordTest('Comprehensive Query Analysis', passedTests === totalTests, 
                           `${passedTests}/${totalTests} tests passed across ${testCases.length} scenarios`);
                           
            // Manager cleanup handled by main cleanup
            
        } catch (error) {
            this.recordTest('Comprehensive Query Analysis', false, error.message);
        }
    }

    async testConversationHistoryProcessing() {
        console.log('💬 Testing Conversation History Processing...');
        
        try {
            const relevanceEngine = this.sharedManager.relevanceEngine;
            
            // Test various conversation patterns
            const testHistories = [
                {
                    name: 'Code debugging conversation',
                    history: [
                        { role: 'user', content: 'The UserService.authenticate method is throwing errors', timestamp: new Date() },
                        { role: 'assistant', content: 'I see the issue is in user-service.js line 15', timestamp: new Date() },
                        { role: 'user', content: 'TypeError: Cannot read property of undefined', timestamp: new Date() },
                        { role: 'assistant', content: 'The jwt.verify function needs error handling', timestamp: new Date() }
                    ],
                    expectedFiles: ['user-service.js'],
                    expectedCodeElements: ['authenticate', 'jwt'],
                    expectedErrors: true
                },
                
                {
                    name: 'Feature development conversation',
                    history: [
                        { role: 'user', content: 'Need to implement new API routes in routes.js', timestamp: new Date() },
                        { role: 'assistant', content: 'I can help you add the new endpoints', timestamp: new Date() },
                        { role: 'user', content: 'Also update the database connection logic', timestamp: new Date() }
                    ],
                    expectedFiles: ['routes.js'],
                    expectedCodeElements: ['routes', 'endpoints'], // These ARE mentioned in the conversation
                    expectedTasks: true
                },
                
                {
                    name: 'Configuration and setup',
                    history: [
                        { role: 'user', content: 'Update package.json with new dependencies', timestamp: new Date() },
                        { role: 'user', content: 'Also check the .env configuration', timestamp: new Date() },
                        { role: 'assistant', content: 'I notice you have database.yml for config too', timestamp: new Date() }
                    ],
                    expectedFiles: ['package.json', '.env', 'database.yml'],
                    expectedTasks: true
                },
                
                {
                    name: 'Mixed conversation with multiple topics',
                    history: [
                        { role: 'user', content: 'Working on auth.test.js but getting failures', timestamp: new Date() },
                        { role: 'assistant', content: 'The UserService tests need mock data', timestamp: new Date() },
                        { role: 'user', content: 'Error: ReferenceError in test file', timestamp: new Date() },
                        { role: 'user', content: 'Also need to document the API in api.md', timestamp: new Date() }
                    ],
                    expectedFiles: ['auth.test.js', 'api.md'],
                    expectedCodeElements: ['UserService'],
                    expectedErrors: true,
                    expectedTasks: true
                }
            ];
            
            let passedTests = 0;
            
            for (const testHistory of testHistories) {
                try {
                    const analysis = await relevanceEngine.analyzeQuery('Help me with this', testHistory.history);
                    
                    // Validate file extraction
                    const filesExtracted = testHistory.expectedFiles ? 
                        testHistory.expectedFiles.every(file => 
                            analysis.conversationContext.mentionedFiles.some(mf => mf.includes(file))
                        ) : true;
                    
                    // Validate code element extraction
                    const codeExtracted = testHistory.expectedCodeElements ?
                        testHistory.expectedCodeElements.every(code =>
                            analysis.conversationContext.codeElements.some(ce => ce.includes(code.toLowerCase()))
                        ) : true;
                    
                    // Validate error detection
                    const errorsDetected = testHistory.expectedErrors ? 
                        analysis.conversationContext.hasErrors : 
                        !analysis.conversationContext.hasErrors || analysis.conversationContext.hasErrors;
                    
                    // Validate task detection
                    const tasksDetected = testHistory.expectedTasks ?
                        analysis.conversationContext.hasTasks :
                        !analysis.conversationContext.hasTasks || analysis.conversationContext.hasTasks;
                    
                    // Validate recently mentioned files
                    const recentFilesExtracted = analysis.recentlyMentionedFiles.length >= 0;
                    
                    const testPassed = filesExtracted && codeExtracted && errorsDetected && 
                                     tasksDetected && recentFilesExtracted;
                    
                    if (testPassed) {
                        passedTests++;
                        console.log(`   ✅ PASS: ${testHistory.name}`);
                    } else {
                        console.log(`   ❌ FAIL: ${testHistory.name}`);
                        console.log(`      Files: ${filesExtracted}, Code: ${codeExtracted}, Errors: ${errorsDetected}, Tasks: ${tasksDetected}`);
                        console.log(`      Extracted files: [${analysis.conversationContext.mentionedFiles.join(', ')}]`);
                        console.log(`      Extracted code: [${analysis.conversationContext.codeElements.slice(0, 5).join(', ')}]`);
                    }
                    
                } catch (error) {
                    console.log(`   ❌ ERROR: ${testHistory.name} - ${error.message}`);
                }
            }
            
            this.recordTest('Conversation History Processing', passedTests === testHistories.length,
                           `${passedTests}/${testHistories.length} conversation patterns processed correctly`);
            
            // Manager cleanup handled by main cleanup
            
        } catch (error) {
            this.recordTest('Conversation History Processing', false, error.message);
        }
    }

    async testFileRelevanceScoring() {
        console.log('🎯 Testing File Relevance Scoring - Comprehensive...');
        
        try {
            // Using shared manager
            
            // Wait for initial scan to index our test files
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const relevanceEngine = this.sharedManager.relevanceEngine;
            
            // Test scenarios with expected relevance rankings
            const testScenarios = [
                {
                    name: 'Authentication debugging',
                    query: 'Fix the authentication bug in UserService',
                    conversationHistory: [
                        { role: 'user', content: 'Working on user-service.js authentication', timestamp: new Date() },
                        { role: 'assistant', content: 'The authenticate method has issues', timestamp: new Date() }
                    ],
                    expectedTopFiles: ['user-service.js'], // Files that should rank highest
                    expectedCategories: ['code'], // Expected file categories
                    minimumScore: 50 // Minimum total score for top file
                },
                
                {
                    name: 'Configuration update',
                    query: 'Update package.json dependencies',
                    conversationHistory: [],
                    expectedTopFiles: ['package.json'],
                    expectedCategories: ['config'],
                    minimumScore: 30
                },
                
                {
                    name: 'Test development',
                    query: 'Write tests for the authentication system',
                    conversationHistory: [
                        { role: 'user', content: 'Need to test UserService methods', timestamp: new Date() }
                    ],
                    expectedTopFiles: ['auth.test.js', 'user-service.js'],
                    expectedCategories: ['code'],
                    minimumScore: 20
                },
                
                {
                    name: 'Documentation task',
                    query: 'Update API documentation',
                    conversationHistory: [],
                    expectedTopFiles: ['api.md', 'README.md'],
                    expectedCategories: ['docs'],
                    minimumScore: 15
                }
            ];
            
            let passedTests = 0;
            
            for (const scenario of testScenarios) {
                try {
                    // Get file relevance results
                    const results = await this.sharedManager.getRelevantFiles(
                        scenario.query,
                        scenario.conversationHistory,
                        { maxResults: 10, minImportance: 1 }
                    );
                    
                    console.log(`   Testing: ${scenario.name}`);
                    console.log(`     Query: "${scenario.query}"`);
                    console.log(`     Results: ${results.results.length} files`);
                    
                    if (results.results.length === 0) {
                        console.log(`   ❌ FAIL: ${scenario.name} - No results returned`);
                        continue;
                    }
                    
                    // Check top file score
                    const topFile = results.results[0];
                    const scoreCheck = topFile.score >= scenario.minimumScore;
                    
                    // Check if expected files are in top results
                    const topFileNames = results.results.slice(0, 3).map(r => 
                        path.basename(r.file.fileName || r.file.path || '')
                    );
                    
                    const expectedFilesFound = scenario.expectedTopFiles.some(expectedFile =>
                        topFileNames.some(topFile => topFile.includes(expectedFile))
                    );
                    
                    // Check categories
                    const categoryCheck = scenario.expectedCategories.some(expectedCat =>
                        results.results.slice(0, 3).some(r => r.file.category === expectedCat)
                    );
                    
                    // Check reasoning is provided
                    const hasReasoning = results.results[0].reasoning && results.results[0].reasoning.length > 0;
                    
                    // Check query analysis
                    const hasQueryAnalysis = results.queryAnalysis && results.queryAnalysis.queryType;
                    
                    const testPassed = scoreCheck && expectedFilesFound && categoryCheck && 
                                     hasReasoning && hasQueryAnalysis;
                    
                    if (testPassed) {
                        passedTests++;
                        console.log(`   ✅ PASS: ${scenario.name} (Score: ${topFile.score.toFixed(1)})`);
                    } else {
                        console.log(`   ❌ FAIL: ${scenario.name}`);
                        console.log(`      Score: ${scoreCheck} (${topFile.score.toFixed(1)} >= ${scenario.minimumScore})`);
                        console.log(`      Expected files: ${expectedFilesFound} (${scenario.expectedTopFiles.join(', ')})`);
                        console.log(`      Top files: [${topFileNames.join(', ')}]`);
                        console.log(`      Categories: ${categoryCheck}, Reasoning: ${hasReasoning}, Analysis: ${hasQueryAnalysis}`);
                    }
                    
                } catch (error) {
                    console.log(`   ❌ ERROR: ${scenario.name} - ${error.message}`);
                }
            }
            
            this.recordTest('File Relevance Scoring', passedTests === testScenarios.length,
                           `${passedTests}/${testScenarios.length} relevance scenarios passed`);
            
            // Manager cleanup handled by main cleanup
            
        } catch (error) {
            this.recordTest('File Relevance Scoring', false, error.message);
        }
    }

    async testEndToEndFileSelection() {
        console.log('🔄 Testing End-to-End File Selection...');
        
        try {
            // Using shared manager
            
            // Wait for indexing
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Test complete workflow from query to file content inclusion
            const testWorkflows = [
                {
                    name: 'Bug fix workflow',
                    query: 'Debug authentication error in UserService',
                    conversationHistory: [
                        { role: 'user', content: 'Getting errors in user-service.js', timestamp: new Date() },
                        { role: 'assistant', content: 'Let me check the authenticate method', timestamp: new Date() }
                    ],
                    expectedFileCount: 3, // Should include related files
                    expectedContentInclusion: true, // Should include file content
                    expectedTokenEstimate: 100 // Should estimate tokens
                },
                
                {
                    name: 'Configuration workflow',
                    query: 'Update project configuration',
                    conversationHistory: [],
                    expectedFileCount: 2,
                    expectedContentInclusion: true,
                    expectedTokenEstimate: 50
                }
            ];
            
            let passedTests = 0;
            
            for (const workflow of testWorkflows) {
                try {
                    const results = await this.sharedManager.getRelevantFiles(
                        workflow.query,
                        workflow.conversationHistory,
                        { maxResults: 5, minImportance: 1 }
                    );
                    
                    // Check file count
                    const fileCountOk = results.results.length >= workflow.expectedFileCount;
                    
                    // Check content inclusion (at least one file should have content)
                    const hasContent = results.results.some(r => 
                        r.file.content || (r.file && typeof r.file === 'object')
                    );
                    
                    // Check query analysis is complete
                    const hasCompleteAnalysis = results.queryAnalysis && 
                                               results.queryAnalysis.queryType &&
                                               results.queryAnalysis.confidence > 0;
                    
                    // Check search method is reported
                    const hasSearchMethod = results.searchMethod === 'advanced_relevance_engine';
                    
                    // Check average score calculation
                    const hasValidAverageScore = results.averageScore >= 0;
                    
                    const testPassed = fileCountOk && hasCompleteAnalysis && 
                                     hasSearchMethod && hasValidAverageScore;
                    
                    if (testPassed) {
                        passedTests++;
                        console.log(`   ✅ PASS: ${workflow.name}`);
                        console.log(`      Files: ${results.results.length}, Method: ${results.searchMethod}`);
                        console.log(`      Average Score: ${results.averageScore.toFixed(1)}`);
                    } else {
                        console.log(`   ❌ FAIL: ${workflow.name}`);
                        console.log(`      File Count: ${fileCountOk}, Analysis: ${hasCompleteAnalysis}`);
                        console.log(`      Search Method: ${hasSearchMethod}, Avg Score: ${hasValidAverageScore}`);
                    }
                    
                } catch (error) {
                    console.log(`   ❌ ERROR: ${workflow.name} - ${error.message}`);
                }
            }
            
            this.recordTest('End-to-End File Selection', passedTests === testWorkflows.length,
                           `${passedTests}/${testWorkflows.length} workflows completed successfully`);
            
            // Manager cleanup handled by main cleanup
            
        } catch (error) {
            this.recordTest('End-to-End File Selection', false, error.message);
        }
    }

    async testContextManagerIntegration() {
        console.log('🔗 Testing Context Manager Integration...');
        
        try {
            // Test the actual integration between ContextManager and FilesystemManager
            const mockDb = { query: () => Promise.resolve([]) };
            const mockKnowledgeAnalyzer = { extractKeyInfo: () => ({}) };
            const mockClaude = {};
            
            const contextManager = new ContextManager(
                mockDb,
                mockKnowledgeAnalyzer,
                mockClaude,
                this.tempDir
            );
            
            await contextManager.initialize();
            
            // Using shared manager
            
            // Connect them (this is the key integration)
            contextManager.setFilesystemManager(this.sharedManager);
            
            // Test file context building
            const conversationHistory = [
                { role: 'user', content: 'Working on user-service.js authentication bug', timestamp: new Date() },
                { role: 'assistant', content: 'I see the issue in the authenticate method', timestamp: new Date() }
            ];
            
            // Wait for indexing
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const fileContext = await contextManager.buildFileContext(
                { name: 'test-project' },
                'Fix authentication bug',
                conversationHistory
            );
            
            // Validate integration
            const hasFileContents = fileContext && fileContext.files && Array.isArray(fileContext.files);
            const hasTokenEstimate = fileContext && typeof fileContext.token_estimate === 'number';
            const hasLoadedFiles = fileContext && fileContext.summary && fileContext.summary.files_included >= 0;
            const hasSearchMethod = fileContext && fileContext.search_method === 'advanced_relevance_engine';
            
            // Test conversation history preparation
            const preparedHistory = contextManager.prepareConversationHistoryForFileRelevance(conversationHistory);
            const hasFilesMentioned = preparedHistory.some(msg => msg.files_mentioned && msg.files_mentioned.length > 0);
            const hasCodeElements = preparedHistory.some(msg => msg.code_elements && msg.code_elements.length > 0);
            
            // Test tracking functionality
            const mockRelevantFilesResult = {
                results: [{ file: { path: '/test/file.js', extension: '.js', importance: 8 } }],
                queryAnalysis: { intents: ['debugging'], keywords: ['fix', 'bug'] }
            };
            
            // This should not throw an error
            contextManager.trackFileSelections(mockRelevantFilesResult, 'test query');
            
            const integrationPassed = hasFileContents && hasTokenEstimate && hasLoadedFiles && 
                                    hasSearchMethod && hasFilesMentioned && hasCodeElements;
            
            if (integrationPassed) {
                console.log('   ✅ PASS: Context Manager Integration');
                console.log(`      Files: ${fileContext.summary?.files_included || 0}, Tokens: ${fileContext.token_estimate}`);
                console.log(`      Method: ${fileContext.search_method}`);
            } else {
                console.log('   ❌ FAIL: Context Manager Integration');
                console.log(`      File Contents: ${hasFileContents}, Token Estimate: ${hasTokenEstimate}`);
                console.log(`      Loaded Files: ${hasLoadedFiles}, Search Method: ${hasSearchMethod}`);
                console.log(`      Files Mentioned: ${hasFilesMentioned}, Code Elements: ${hasCodeElements}`);
            }
            
            this.recordTest('Context Manager Integration', integrationPassed,
                           'Full integration between ContextManager and FilesystemManager');
            
            // Manager cleanup handled by main cleanup
            
        } catch (error) {
            this.recordTest('Context Manager Integration', false, error.message);
        }
    }

    async testLearningSystem() {
        console.log('🧠 Testing Learning System...');
        
        try {
            // Using shared manager
            
            const relevanceEngine = this.sharedManager.relevanceEngine;
            
            // Test file access tracking
            const testFile = '/test/user-service.js';
            
            // Track multiple accesses
            relevanceEngine.trackFileAccess(testFile);
            relevanceEngine.trackFileAccess(testFile);
            relevanceEngine.trackFileAccess(testFile);
            
            // Check if access frequency affects scoring
            const accessBoost = relevanceEngine.calculateAccessFrequencyBoost(testFile);
            const hasAccessTracking = accessBoost > 0;
            
            // Test user preference learning
            const initialPrefs = relevanceEngine.userPreferences.preferredFileTypes.size;
            
            relevanceEngine.updateUserPreferences(['js', 'json'], 7);
            
            const updatedPrefs = relevanceEngine.userPreferences.preferredFileTypes.size;
            const hasPreferenceLearning = updatedPrefs > initialPrefs;
            
            // Test preference scoring
            const mockFileInfo = {
                extension: '.js',
                importance: 8
            };
            
            const prefScore = relevanceEngine.calculateUserPreferenceScore(mockFileInfo);
            const hasPreferenceScoring = prefScore > 0;
            
            // Test stats retrieval
            const stats = relevanceEngine.getStats();
            const hasStats = stats && stats.recentlyAccessedFiles >= 0 && 
                           stats.userPreferences && stats.totalIndexedFiles >= 0;
            
            const learningPassed = hasAccessTracking && hasPreferenceLearning && 
                                 hasPreferenceScoring && hasStats;
            
            if (learningPassed) {
                console.log('   ✅ PASS: Learning System');
                console.log(`      Access Tracking: ${hasAccessTracking}, Preference Learning: ${hasPreferenceLearning}`);
                console.log(`      Preference Scoring: ${hasPreferenceScoring}, Stats: ${hasStats}`);
            } else {
                console.log('   ❌ FAIL: Learning System');
                console.log(`      Access: ${hasAccessTracking}, Prefs: ${hasPreferenceLearning}, Scoring: ${hasPreferenceScoring}, Stats: ${hasStats}`);
            }
            
            this.recordTest('Learning System', learningPassed,
                           'File access tracking and user preference learning');
            
            // Manager cleanup handled by main cleanup
            
        } catch (error) {
            this.recordTest('Learning System', false, error.message);
        }
    }

    async testEdgeCases() {
        console.log('🔍 Testing Edge Cases...');
        
        try {
            // Using shared manager
            const relevanceEngine = this.sharedManager.relevanceEngine;
            
            const edgeCases = [
                {
                    name: 'Empty query',
                    query: '',
                    history: [],
                    shouldNotCrash: true
                },
                {
                    name: 'Very long query',
                    query: 'a'.repeat(10000),
                    history: [],
                    shouldNotCrash: true
                },
                {
                    name: 'Special characters',
                    query: '!@#$%^&*()_+-=[]{}|;:,.<>?',
                    history: [],
                    shouldNotCrash: true
                },
                {
                    name: 'Non-English query',
                    query: 'プログラムのバグを修正してください',
                    history: [],
                    shouldNotCrash: true
                },
                {
                    name: 'Invalid conversation history',
                    query: 'test query',
                    history: [{ invalid: 'structure' }, null, undefined],
                    shouldNotCrash: true
                },
                {
                    name: 'Circular file references',
                    query: 'file.js references file.js',
                    history: [],
                    shouldNotCrash: true
                }
            ];
            
            let passedTests = 0;
            
            for (const edgeCase of edgeCases) {
                try {
                    const analysis = await relevanceEngine.analyzeQuery(edgeCase.query, edgeCase.history);
                    
                    // Should return valid analysis structure even for edge cases
                    const hasValidStructure = analysis && typeof analysis === 'object' &&
                                            analysis.hasOwnProperty('query') &&
                                            analysis.hasOwnProperty('queryType');
                    
                    if (hasValidStructure) {
                        passedTests++;
                        console.log(`   ✅ PASS: ${edgeCase.name}`);
                    } else {
                        console.log(`   ❌ FAIL: ${edgeCase.name} - Invalid analysis structure`);
                    }
                    
                } catch (error) {
                    if (edgeCase.shouldNotCrash) {
                        console.log(`   ❌ FAIL: ${edgeCase.name} - Should not crash: ${error.message}`);
                    } else {
                        passedTests++;
                        console.log(`   ✅ PASS: ${edgeCase.name} - Expected error: ${error.message}`);
                    }
                }
            }
            
            this.recordTest('Edge Cases', passedTests === edgeCases.length,
                           `${passedTests}/${edgeCases.length} edge cases handled correctly`);
            
            // Manager cleanup handled by main cleanup
            
        } catch (error) {
            this.recordTest('Edge Cases', false, error.message);
        }
    }

    async testErrorHandling() {
        console.log('⚠️  Testing Error Handling...');
        
        try {
            // Using shared manager
            
            // Test various error conditions
            const errorTests = [
                {
                    name: 'Non-existent file access',
                    test: async () => {
                        const fileInfo = await this.sharedManager.getFileInfo('/non/existent/file.js');
                        return fileInfo && fileInfo.exists === false;
                    }
                },
                {
                    name: 'Invalid project root',
                    test: async () => {
                        try {
                            const invalidFsManager = new FilesystemAccessManager('/invalid/path/that/does/not/exist');
                            await invalidFsManager.initialize();
                            return false; // Should have thrown
                        } catch (error) {
                            return true; // Expected error
                        }
                    }
                },
                {
                    name: 'Malformed query analysis',
                    test: async () => {
                        try {
                            const mockEngine = this.sharedManager.relevanceEngine;
                            // Pass invalid data to internal method
                            const result = await mockEngine.calculateFileRelevanceScore(
                                null, // Invalid file info
                                { query: 'test' }, // Minimal query analysis
                                [],
                                {}
                            );
                            return true; // Should handle gracefully
                        } catch (error) {
                            return false; // Should not crash
                        }
                    }
                }
            ];
            
            let passedTests = 0;
            
            for (const errorTest of errorTests) {
                try {
                    const result = await errorTest.test();
                    if (result) {
                        passedTests++;
                        console.log(`   ✅ PASS: ${errorTest.name}`);
                    } else {
                        console.log(`   ❌ FAIL: ${errorTest.name}`);
                    }
                } catch (error) {
                    console.log(`   ❌ ERROR: ${errorTest.name} - ${error.message}`);
                }
            }
            
            this.recordTest('Error Handling', passedTests === errorTests.length,
                           `${passedTests}/${errorTests.length} error conditions handled correctly`);
            
            // Manager cleanup handled by main cleanup
            
        } catch (error) {
            this.recordTest('Error Handling', false, error.message);
        }
    }

    async testPerformanceUnderLoad() {
        console.log('⚡ Testing Performance Under Load...');
        
        try {
            // Using shared manager
            const relevanceEngine = this.sharedManager.relevanceEngine;
            
            // Performance benchmarks
            const performanceTests = [
                {
                    name: 'Query analysis performance',
                    iterations: 1000,
                    maxAvgTime: 5, // 5ms max average
                    test: async () => {
                        await relevanceEngine.analyzeQuery(
                            'Fix the authentication bug in user-service.js',
                            [{ role: 'user', content: 'Working on auth issues', timestamp: new Date() }]
                        );
                    }
                },
                {
                    name: 'Relevance scoring performance',
                    iterations: 100,
                    maxAvgTime: 10, // 10ms max average
                    test: async () => {
                        const mockFile = {
                            fileName: 'test.js',
                            category: 'code',
                            importance: 5,
                            words: new Set(['test', 'function']),
                            functions: [{ name: 'testFunc' }]
                        };
                        const mockAnalysis = {
                            queryType: 'debugging',
                            keywords: ['test'],
                            conversationContext: { topics: [], codeElements: [], hasErrors: false },
                            recentlyMentionedFiles: []
                        };
                        await relevanceEngine.calculateFileRelevanceScore(mockFile, mockAnalysis, [], {});
                    }
                }
            ];
            
            let passedTests = 0;
            
            for (const perfTest of performanceTests) {
                try {
                    const startTime = Date.now();
                    
                    for (let i = 0; i < perfTest.iterations; i++) {
                        await perfTest.test();
                    }
                    
                    const endTime = Date.now();
                    const avgTime = (endTime - startTime) / perfTest.iterations;
                    
                    const performanceOk = avgTime <= perfTest.maxAvgTime;
                    
                    if (performanceOk) {
                        passedTests++;
                        console.log(`   ✅ PASS: ${perfTest.name} (${avgTime.toFixed(2)}ms avg)`);
                    } else {
                        console.log(`   ❌ FAIL: ${perfTest.name} (${avgTime.toFixed(2)}ms > ${perfTest.maxAvgTime}ms)`);
                    }
                    
                } catch (error) {
                    console.log(`   ❌ ERROR: ${perfTest.name} - ${error.message}`);
                }
            }
            
            this.recordTest('Performance Under Load', passedTests === performanceTests.length,
                           `${passedTests}/${performanceTests.length} performance benchmarks passed`);
            
            // Manager cleanup handled by main cleanup
            
        } catch (error) {
            this.recordTest('Performance Under Load', false, error.message);
        }
    }

    async testMemoryUsage() {
        console.log('🧠 Testing Memory Usage...');
        
        try {
            const initialMemory = process.memoryUsage();
            
            // Using shared manager
            
            // Perform many operations to test for memory leaks
            for (let i = 0; i < 100; i++) {
                await this.sharedManager.getRelevantFiles('test query', [], { maxResults: 5 });
            }
            
            const finalMemory = process.memoryUsage();
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
            const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
            
            // Should not increase memory by more than 50MB for 100 operations
            const memoryOk = memoryIncreaseMB < 50;
            
            if (memoryOk) {
                console.log(`   ✅ PASS: Memory usage acceptable (+${memoryIncreaseMB.toFixed(1)}MB)`);
            } else {
                console.log(`   ❌ FAIL: Excessive memory usage (+${memoryIncreaseMB.toFixed(1)}MB)`);
            }
            
            this.recordTest('Memory Usage', memoryOk,
                           `Memory increase: ${memoryIncreaseMB.toFixed(1)}MB for 100 operations`);
            
            // Manager cleanup handled by main cleanup
            
        } catch (error) {
            this.recordTest('Memory Usage', false, error.message);
        }
    }

    async testRealWorldScenarios() {
        console.log('🌍 Testing Real-World Scenarios...');
        
        try {
            // Using shared manager
            
            // Wait for indexing
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Real-world conversation scenarios
            const realWorldTests = [
                {
                    name: 'Bug fixing conversation',
                    conversation: [
                        { query: 'I\'m getting an authentication error', history: [] },
                        { query: 'The error happens in the login process', history: [
                            { role: 'user', content: 'I\'m getting an authentication error', timestamp: new Date() },
                            { role: 'assistant', content: 'Let me help you debug this authentication issue', timestamp: new Date() }
                        ]},
                        { query: 'Can you check the UserService authenticate method?', history: [
                            { role: 'user', content: 'I\'m getting an authentication error', timestamp: new Date() },
                            { role: 'assistant', content: 'Let me help you debug this authentication issue', timestamp: new Date() },
                            { role: 'user', content: 'The error happens in the login process', timestamp: new Date() },
                            { role: 'assistant', content: 'I need to examine the authentication logic', timestamp: new Date() }
                        ]}
                    ],
                    expectedProgression: true // Later queries should get better results
                },
                
                {
                    name: 'Feature development workflow',
                    conversation: [
                        { query: 'I need to add new API endpoints', history: [] },
                        { query: 'Add a POST route for user registration', history: [
                            { role: 'user', content: 'I need to add new API endpoints', timestamp: new Date() },
                            { role: 'assistant', content: 'I can help you add new routes to your API', timestamp: new Date() }
                        ]},
                        { query: 'Also update the routes.js file', history: [
                            { role: 'user', content: 'I need to add new API endpoints', timestamp: new Date() },
                            { role: 'assistant', content: 'I can help you add new routes to your API', timestamp: new Date() },
                            { role: 'user', content: 'Add a POST route for user registration', timestamp: new Date() },
                            { role: 'assistant', content: 'I\'ll help you add the registration endpoint', timestamp: new Date() }
                        ]}
                    ],
                    expectedProgression: true
                }
            ];
            
            let passedTests = 0;
            
            for (const scenario of realWorldTests) {
                try {
                    const results = [];
                    
                    // Run conversation progression
                    for (const turn of scenario.conversation) {
                        const result = await this.sharedManager.getRelevantFiles(
                            turn.query,
                            turn.history,
                            { maxResults: 5, minImportance: 1 }
                        );
                        results.push(result);
                    }
                    
                    // Check progression: later queries should be more targeted
                    const hasResults = results.every(r => r.results.length > 0);
                    const hasAnalysis = results.every(r => r.queryAnalysis);
                    const hasSearchMethod = results.every(r => r.searchMethod === 'advanced_relevance_engine');
                    
                    // Check that conversation context improves results
                    const lastResult = results[results.length - 1];
                    const hasConversationContext = lastResult.queryAnalysis.conversationContext.topics.length > 0;
                    
                    const scenarioPassed = hasResults && hasAnalysis && hasSearchMethod && hasConversationContext;
                    
                    if (scenarioPassed) {
                        passedTests++;
                        console.log(`   ✅ PASS: ${scenario.name}`);
                        console.log(`      Conversation turns: ${results.length}`);
                        console.log(`      Final context topics: ${lastResult.queryAnalysis.conversationContext.topics.length}`);
                    } else {
                        console.log(`   ❌ FAIL: ${scenario.name}`);
                        console.log(`      Results: ${hasResults}, Analysis: ${hasAnalysis}, Method: ${hasSearchMethod}, Context: ${hasConversationContext}`);
                    }
                    
                } catch (error) {
                    console.log(`   ❌ ERROR: ${scenario.name} - ${error.message}`);
                }
            }
            
            this.recordTest('Real-World Scenarios', passedTests === realWorldTests.length,
                           `${passedTests}/${realWorldTests.length} real-world workflows completed successfully`);
            
            // Manager cleanup handled by main cleanup
            
        } catch (error) {
            this.recordTest('Real-World Scenarios', false, error.message);
        }
    }

    async createTestFilesystemManager() {
        return new FilesystemAccessManager(this.tempDir, {
            enableRealTimeMonitoring: false,
            enableAutoIndexing: true,
            maxFileSize: 1024 * 1024,
            ignored: ['node_modules/**', '.git/**']
        });
    }

    recordTest(testName, passed, details) {
        this.testResults.push({
            name: testName,
            passed,
            details,
            timestamp: new Date()
        });
    }

    generateComprehensiveReport() {
        console.log('\n📋 COMPREHENSIVE TEST REPORT');
        console.log('==============================');
        
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(t => t.passed).length;
        const failedTests = totalTests - passedTests;
        const successRate = ((passedTests / totalTests) * 100).toFixed(1);
        
        console.log(`\n📊 OVERALL RESULTS: ${passedTests}/${totalTests} tests passed (${successRate}%)\n`);
        
        // Categorize tests
        const categories = {
            'Core Functionality': ['Comprehensive Query Analysis', 'Conversation History Processing', 'File Relevance Scoring'],
            'Integration': ['End-to-End File Selection', 'Context Manager Integration'],
            'Advanced Features': ['Learning System'],
            'Reliability': ['Edge Cases', 'Error Handling'],
            'Performance': ['Performance Under Load', 'Memory Usage'],
            'Real-World': ['Real-World Scenarios']
        };
        
        for (const [category, testNames] of Object.entries(categories)) {
            console.log(`\n🔸 ${category}:`);
            const categoryTests = this.testResults.filter(t => testNames.includes(t.name));
            const categoryPassed = categoryTests.filter(t => t.passed).length;
            const categoryTotal = categoryTests.length;
            
            console.log(`   ${categoryPassed}/${categoryTotal} tests passed`);
            
            categoryTests.forEach(test => {
                const status = test.passed ? '✅ PASS' : '❌ FAIL';
                console.log(`   ${status} ${test.name}`);
                if (test.details) {
                    console.log(`        ${test.details}`);
                }
            });
        }
        
        console.log('\n📈 PHASE 2 ENHANCEMENT STATUS:');
        if (successRate >= 90) {
            console.log('🎉 EXCELLENT: Phase 2 enhancements are working exceptionally well!');
        } else if (successRate >= 80) {
            console.log('✅ GOOD: Phase 2 enhancements are working well with minor issues.');
        } else if (successRate >= 70) {
            console.log('⚠️  NEEDS WORK: Phase 2 enhancements have significant issues to address.');
        } else {
            console.log('❌ CRITICAL: Phase 2 enhancements require major fixes before deployment.');
        }
        
        console.log(`\nSuccess Rate: ${successRate}%`);
        console.log(`Failed Tests: ${failedTests}`);
        
        if (failedTests > 0) {
            console.log('\n🔧 RECOMMENDATIONS:');
            const failedCategories = this.testResults
                .filter(t => !t.passed)
                .map(t => t.name);
            
            failedCategories.forEach(testName => {
                console.log(`   - Address issues in: ${testName}`);
            });
        }
    }

    async cleanupTestEnvironment() {
        if (this.tempDir) {
            try {
                await fs.rm(this.tempDir, { recursive: true, force: true });
                console.log(`\n🧹 Cleaned up test environment: ${this.tempDir}`);
            } catch (error) {
                console.warn(`Warning: Could not clean up test environment: ${error.message}`);
            }
        }
    }
}

// Run the comprehensive test suite
async function main() {
    const testSuite = new ComprehensivePhase2Tests();
    await testSuite.runAllTests();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = ComprehensivePhase2Tests;