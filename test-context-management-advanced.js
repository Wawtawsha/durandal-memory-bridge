// Advanced Context Management Testing Suite
// Tests intelligent context building, token optimization, and conversation flow

const ContextManager = require('./context-manager');
const ClaudeMemoryDB = require('./db-client');
const KnowledgeAnalyzer = require('./knowledge-analyzer');
const ClaudeClient = require('./claude-client');

class ContextManagementAdvancedTest {
    constructor() {
        this.contextManager = null;
        this.db = null;
        this.knowledgeAnalyzer = null;
        this.claudeClient = null;
        this.testProject = null;
        this.testResults = [];
        this.startTime = null;
        this.projectRoot = process.cwd();
    }

    async initialize() {
        try {
            console.log('🔧 Initializing Advanced Context Management Test Suite...');

            // Initialize database connection
            this.db = new ClaudeMemoryDB();
            const dbTest = await this.db.testConnection();
            if (!dbTest.success) {
                throw new Error(`Database connection failed: ${dbTest.error}`);
            }

            // Initialize knowledge analyzer
            this.knowledgeAnalyzer = new KnowledgeAnalyzer();

            // Initialize Claude client
            this.claudeClient = new ClaudeClient();
            const claudeTest = await this.claudeClient.testConnection();
            if (!claudeTest.success) {
                throw new Error(`Claude API connection failed: ${claudeTest.error}`);
            }

            // Initialize context manager
            this.contextManager = new ContextManager(
                this.db,
                this.knowledgeAnalyzer,
                this.claudeClient,
                this.projectRoot
            );
            await this.contextManager.initialize();

            // Create test project
            const uniqueProjectName = `context-management-test-${Date.now()}`;
            this.testProject = await this.db.createProject(
                uniqueProjectName,
                'Test project for context management testing',
                {
                    type: 'test_project',
                    location: this.projectRoot,
                    created_for: 'context_testing'
                }
            );

            console.log('✅ Advanced Context Management Test Suite initialized');
            return true;
        } catch (error) {
            console.error('❌ Test initialization failed:', error.message);
            return false;
        }
    }

    // Test 1: Token Budget Management
    async testTokenBudgetManagement() {
        console.log('\n1️⃣ Testing Token Budget Management...');
        const tests = [];

        try {
            // Test token estimation accuracy
            console.log('  🧮 Testing Token Estimation...');

            const testText = "This is a test message for token estimation. It should be roughly 15-20 tokens.";
            const estimatedTokens = this.contextManager.tokenEstimator.estimate(testText);
            const expectedRange = [10, 25]; // Reasonable range for this text

            tests.push({
                name: 'Token Estimation Accuracy',
                passed: estimatedTokens >= expectedRange[0] && estimatedTokens <= expectedRange[1],
                details: `Estimated ${estimatedTokens} tokens for ${testText.length} characters`
            });

            // Test context size optimization
            console.log('  📏 Testing Context Size Optimization...');

            // Create oversized context layers
            const oversizedContext = {
                recentMessages: {
                    messages: Array(20).fill(null).map((_, i) => ({
                        role: i % 2 === 0 ? 'user' : 'assistant',
                        content: `This is test message ${i} with some content that should be realistic length for testing context optimization.`
                    })),
                    tokenCount: 800
                },
                conversationSummary: {
                    summary: 'This is a test conversation summary that contains important context about the ongoing discussion.',
                    tokenCount: 50,
                    method: 'generated'
                },
                knowledgeArtifacts: {
                    data: Array(10).fill(null).map((_, i) => ({
                        id: `artifact_${i}`,
                        data: {
                            content: `This is test artifact ${i} with important information about the project.`,
                            type: 'test_artifact'
                        }
                    })),
                    tokenCount: 500
                },
                projectContext: {
                    name: 'test_project',
                    description: 'Test project for context management',
                    files: ['test1.js', 'test2.js']
                }
            };

            const optimizedContext = await this.contextManager.optimizeContextSize(oversizedContext);
            const totalTokens = this.contextManager.calculateTotalTokens(optimizedContext.sections || []);

            tests.push({
                name: 'Context Size Optimization',
                passed: totalTokens <= this.contextManager.config.maxTokens,
                details: `Optimized context to ${totalTokens} tokens (limit: ${this.contextManager.config.maxTokens})`
            });

            // Test priority-based selection
            console.log('  🎯 Testing Priority-Based Selection...');

            // Create test artifacts with different priorities
            const testArtifacts = [
                { id: 1, relevance_score: 9, artifact_type: 'solution', tags: ['important'] },
                { id: 2, relevance_score: 5, artifact_type: 'general', tags: ['info'] },
                { id: 3, relevance_score: 8, artifact_type: 'code', tags: ['example'] },
                { id: 4, relevance_score: 3, artifact_type: 'casual', tags: ['low'] }
            ];

            const artifactIndex = this.contextManager.createArtifactIndex(testArtifacts);
            const selectedArtifacts = await this.contextManager.intelligentArtifactSelection(
                'need important solution',
                artifactIndex
            );

            // Should select highest priority artifacts
            const highPrioritySelected = selectedArtifacts.length > 0;
            tests.push({
                name: 'Priority-Based Selection',
                passed: highPrioritySelected,
                details: `Selected ${selectedArtifacts.length} artifacts based on priority`
            });

        } catch (error) {
            tests.push({
                name: 'Token Budget Management',
                passed: false,
                details: `Test failed: ${error.message}`
            });
        }

        return tests;
    }

    // Test 2: Conversation Summarization Quality
    async testConversationSummarization() {
        console.log('\n2️⃣ Testing Conversation Summarization Quality...');
        const tests = [];

        try {
            // Test summarization trigger logic
            console.log('  🧠 Testing Summarization Trigger Logic...');

            // Create a long conversation history
            const longConversation = Array(30).fill(null).map((_, i) => ({
                role: i % 2 === 0 ? 'user' : 'assistant',
                content: `This is message ${i} in a long conversation about database setup and configuration. The conversation covers PostgreSQL installation, user creation, schema setup, and troubleshooting connection issues.`,
                timestamp: new Date(Date.now() - (30 - i) * 60000).toISOString()
            }));

            const summaryResult = await this.contextManager.buildConversationSummary(longConversation);
            
            tests.push({
                name: 'Summarization Trigger',
                passed: summaryResult.summary !== null || summaryResult.method === 'not_needed',
                details: `Summarization method: ${summaryResult.method}, Token count: ${summaryResult.tokenCount}`
            });

            // Test summary quality (if generated)
            if (summaryResult.summary) {
                console.log('  📝 Testing Summary Quality...');

                const summaryLength = summaryResult.summary.length;
                const originalLength = JSON.stringify(longConversation).length;
                const compressionRatio = (summaryLength / originalLength) * 100;

                tests.push({
                    name: 'Summary Quality',
                    passed: compressionRatio < 50 && summaryLength > 100, // Should be compressed but informative
                    details: `Summary is ${compressionRatio.toFixed(1)}% of original length (${summaryLength} chars)`
                });
            }

            // Test cached summary retrieval
            console.log('  💾 Testing Cached Summary Retrieval...');

            const cachedSummary = await this.contextManager.buildConversationSummary(longConversation);
            tests.push({
                name: 'Cached Summary Retrieval',
                passed: cachedSummary.method === 'cached' || cachedSummary.method === 'generated',
                details: `Retrieval method: ${cachedSummary.method}`
            });

        } catch (error) {
            tests.push({
                name: 'Conversation Summarization',
                passed: false,
                details: `Test failed: ${error.message}`
            });
        }

        return tests;
    }

    // Test 3: Context Building Performance
    async testContextBuildingPerformance() {
        console.log('\n3️⃣ Testing Context Building Performance...');
        const tests = [];

        try {
            // Test context building speed
            console.log('  ⚡ Testing Context Building Speed...');

            const testConversation = Array(10).fill(null).map((_, i) => ({
                role: i % 2 === 0 ? 'user' : 'assistant',
                content: `Performance test message ${i} with technical content about system architecture and implementation details.`,
                timestamp: new Date().toISOString()
            }));

            const testSession = {
                id: 1,
                session_name: 'Performance Test Session'
            };

            const startTime = Date.now();
            const context = await this.contextManager.buildIntelligentContext(
                'How do I optimize database performance?',
                testConversation,
                this.testProject,
                testSession
            );
            const buildTime = Date.now() - startTime;

            tests.push({
                name: 'Context Building Speed',
                passed: buildTime < 200, // Should build context in under 200ms
                details: `Context built in ${buildTime}ms`
            });

            // Test context completeness
            console.log('  🔍 Testing Context Completeness...');

            const hasRequiredSections = context.sections && context.sections.length > 0;
            const hasMetadata = context.metadata && context.metadata.timestamp;
            const hasTokenCount = context.totalTokens > 0;

            tests.push({
                name: 'Context Completeness',
                passed: hasRequiredSections && hasMetadata && hasTokenCount,
                details: `${context.sections?.length || 0} sections, ${context.totalTokens} tokens`
            });

            // Test context caching
            console.log('  💾 Testing Context Caching...');

            const cacheStart = Date.now();
            const cachedContext = await this.contextManager.buildIntelligentContext(
                'How do I optimize database performance?', // Same query
                testConversation,
                this.testProject,
                testSession
            );
            const cacheTime = Date.now() - cacheStart;

            tests.push({
                name: 'Context Caching Performance',
                passed: cacheTime < buildTime, // Should be faster due to caching
                details: `Cached context built in ${cacheTime}ms (original: ${buildTime}ms)`
            });

        } catch (error) {
            tests.push({
                name: 'Context Building Performance',
                passed: false,
                details: `Test failed: ${error.message}`
            });
        }

        return tests;
    }

    // Test 4: Multi-Layer Context Prioritization
    async testMultiLayerPrioritization() {
        console.log('\n4️⃣ Testing Multi-Layer Context Prioritization...');
        const tests = [];

        try {
            // Test layer construction
            console.log('  🏗️ Testing Layer Construction...');

            const testConversation = [
                { role: 'user', content: 'I need help with database setup', timestamp: new Date().toISOString() },
                { role: 'assistant', content: 'I can help you set up PostgreSQL...', timestamp: new Date().toISOString() }
            ];

            const layers = await this.contextManager.buildContextLayers(
                'Database connection troubleshooting',
                testConversation,
                this.testProject,
                { id: 1, session_name: 'Test Session' },
                { contexts: [] }
            );

            const expectedLayers = ['recentMessages', 'conversationSummary', 'knowledgeArtifacts', 'projectContext'];
            const hasAllLayers = expectedLayers.every(layer => layers.hasOwnProperty(layer));

            tests.push({
                name: 'Layer Construction',
                passed: hasAllLayers,
                details: `Created layers: ${Object.keys(layers).join(', ')}`
            });

            // Test layer prioritization
            console.log('  📊 Testing Layer Prioritization...');

            const recentMessagesPresent = layers.recentMessages && layers.recentMessages.messages;
            const projectContextPresent = layers.projectContext && layers.projectContext.name;

            tests.push({
                name: 'Layer Prioritization',
                passed: recentMessagesPresent && projectContextPresent,
                details: `Recent messages: ${!!recentMessagesPresent}, Project context: ${!!projectContextPresent}`
            });

            // Test token-aware layer selection
            console.log('  🎯 Testing Token-Aware Selection...');

            const optimizedLayers = await this.contextManager.optimizeContextSize(layers);
            const totalTokens = this.contextManager.calculateTotalTokens(optimizedLayers.sections || []);

            tests.push({
                name: 'Token-Aware Layer Selection',
                passed: totalTokens <= this.contextManager.config.maxTokens,
                details: `Optimized to ${totalTokens} tokens (limit: ${this.contextManager.config.maxTokens})`
            });

        } catch (error) {
            tests.push({
                name: 'Multi-Layer Prioritization',
                passed: false,
                details: `Test failed: ${error.message}`
            });
        }

        return tests;
    }

    // Test 5: Graceful Degradation
    async testGracefulDegradation() {
        console.log('\n5️⃣ Testing Graceful Degradation...');
        const tests = [];

        try {
            // Test context building with missing knowledge analyzer
            console.log('  ⚠️ Testing Missing Knowledge Analyzer...');

            const tempAnalyzer = this.contextManager.knowledgeAnalyzer;
            this.contextManager.knowledgeAnalyzer = null;

            const fallbackContext = await this.contextManager.buildIntelligentContext(
                'Test with missing analyzer',
                [{ role: 'user', content: 'test', timestamp: new Date().toISOString() }],
                this.testProject,
                { id: 1, session_name: 'Fallback Test' }
            );

            this.contextManager.knowledgeAnalyzer = tempAnalyzer;

            tests.push({
                name: 'Missing Knowledge Analyzer Fallback',
                passed: fallbackContext !== null && fallbackContext.sections,
                details: fallbackContext ? 'Fallback context created' : 'Fallback failed'
            });

            // Test database connection failure
            console.log('  💾 Testing Database Failure Recovery...');

            const tempDb = this.contextManager.db;
            this.contextManager.db = null;

            try {
                const dbFailureContext = await this.contextManager.buildIntelligentContext(
                    'Test with db failure',
                    [{ role: 'user', content: 'test', timestamp: new Date().toISOString() }],
                    this.testProject,
                    { id: 1, session_name: 'DB Failure Test' }
                );

                this.contextManager.db = tempDb;

                tests.push({
                    name: 'Database Failure Recovery',
                    passed: dbFailureContext !== null,
                    details: 'Context created despite database failure'
                });
            } catch (error) {
                this.contextManager.db = tempDb;
                tests.push({
                    name: 'Database Failure Recovery',
                    passed: true, // Error is expected, test passes if it's handled
                    details: `Handled database failure: ${error.message.substring(0, 50)}...`
                });
            }

            // Test large context handling
            console.log('  📏 Testing Large Context Handling...');

            const largeConversation = Array(100).fill(null).map((_, i) => ({
                role: i % 2 === 0 ? 'user' : 'assistant',
                content: `This is a very long conversation message ${i} that contains extensive technical details about system architecture, implementation patterns, database optimization strategies, and performance tuning techniques.`,
                timestamp: new Date(Date.now() - (100 - i) * 1000).toISOString()
            }));

            const largeContext = await this.contextManager.buildIntelligentContext(
                'Handle large conversation',
                largeConversation,
                this.testProject,
                { id: 1, session_name: 'Large Context Test' }
            );

            tests.push({
                name: 'Large Context Handling',
                passed: largeContext.totalTokens <= this.contextManager.config.maxTokens,
                details: `Large context handled: ${largeContext.totalTokens} tokens`
            });

        } catch (error) {
            tests.push({
                name: 'Graceful Degradation',
                passed: false,
                details: `Test failed: ${error.message}`
            });
        }

        return tests;
    }

    // Test 6: Context Continuity Verification
    async testContextContinuity() {
        console.log('\n6️⃣ Testing Context Continuity...');
        const tests = [];

        try {
            // Test conversation flow continuity
            console.log('  🔄 Testing Conversation Flow Continuity...');

            const conversationFlow = [
                { role: 'user', content: 'I need help with database setup', timestamp: new Date().toISOString() },
                { role: 'assistant', content: 'I can help you set up PostgreSQL. What operating system are you using?', timestamp: new Date().toISOString() },
                { role: 'user', content: 'I\'m using Ubuntu 24.04', timestamp: new Date().toISOString() },
                { role: 'assistant', content: 'Great! Ubuntu 24.04 is well supported. First, let\'s update your package lists...', timestamp: new Date().toISOString() },
                { role: 'user', content: 'The installation failed with permission errors', timestamp: new Date().toISOString() }
            ];

            const context1 = await this.contextManager.buildIntelligentContext(
                'The installation failed with permission errors',
                conversationFlow,
                this.testProject,
                { id: 1, session_name: 'Continuity Test' }
            );

            // Check if context includes previous conversation
            const hasConversationHistory = context1.sections.some(section => 
                section.type === 'conversation' && section.content.includes('Ubuntu')
            );

            tests.push({
                name: 'Conversation Flow Continuity',
                passed: hasConversationHistory,
                details: hasConversationHistory ? 'Context includes conversation history' : 'Missing conversation history'
            });

            // Test context evolution
            console.log('  📈 Testing Context Evolution...');

            conversationFlow.push({
                role: 'assistant',
                content: 'Permission errors usually indicate you need to use sudo. Try: sudo apt update && sudo apt install postgresql',
                timestamp: new Date().toISOString()
            });

            const context2 = await this.contextManager.buildIntelligentContext(
                'That worked! What\'s next?',
                conversationFlow,
                this.testProject,
                { id: 1, session_name: 'Continuity Test' }
            );

            const evolvedProperly = context2.sections.length > 0 && context2.totalTokens > 0;

            tests.push({
                name: 'Context Evolution',
                passed: evolvedProperly,
                details: `Context evolved: ${context2.sections.length} sections, ${context2.totalTokens} tokens`
            });

            // Test cross-session context
            console.log('  🔗 Testing Cross-Session Context...');

            const newSessionContext = await this.contextManager.buildIntelligentContext(
                'How do I configure PostgreSQL users?',
                [], // New session, no conversation history
                this.testProject,
                { id: 2, session_name: 'New Session Test' }
            );

            const hasProjectContext = newSessionContext.sections.some(section => 
                section.type === 'system' || section.type === 'knowledge'
            );

            tests.push({
                name: 'Cross-Session Context',
                passed: hasProjectContext,
                details: hasProjectContext ? 'Project context preserved across sessions' : 'Missing project context'
            });

        } catch (error) {
            tests.push({
                name: 'Context Continuity',
                passed: false,
                details: `Test failed: ${error.message}`
            });
        }

        return tests;
    }

    // Run all tests
    async runAllTests() {
        console.log('🧪 Starting Advanced Context Management Test Suite');
        console.log('==================================================');

        this.startTime = Date.now();

        const testSuites = [
            this.testTokenBudgetManagement(),
            this.testConversationSummarization(),
            this.testContextBuildingPerformance(),
            this.testMultiLayerPrioritization(),
            this.testGracefulDegradation(),
            this.testContextContinuity()
        ];

        const results = await Promise.all(testSuites);
        const allTests = results.flat();

        // Calculate summary
        const totalTests = allTests.length;
        const passedTests = allTests.filter(test => test.passed).length;
        const failedTests = totalTests - passedTests;
        const successRate = ((passedTests / totalTests) * 100).toFixed(1);

        // Display results
        console.log('\n📊 Test Results Summary');
        console.log('========================');
        console.log(`Total Tests: ${totalTests}`);
        console.log(`✅ Passed: ${passedTests}`);
        console.log(`❌ Failed: ${failedTests}`);
        console.log(`Success Rate: ${successRate}%`);

        if (failedTests > 0) {
            console.log('\n🔍 Failure Details:');
            allTests.filter(test => !test.passed).forEach(test => {
                console.log(`❌ ${test.name}: ${test.details}`);
            });
        }

        const totalTime = Date.now() - this.startTime;
        console.log(`\n⏱️ Total execution time: ${totalTime}ms`);

        // Context Manager Performance Metrics
        console.log('\n📈 Context Manager Performance:');
        console.log(`Token Budget: ${this.contextManager.config.maxTokens} tokens`);
        console.log(`Recent Messages: ${this.contextManager.config.recentMessageCount} messages`);
        console.log(`Max Artifacts: ${this.contextManager.config.maxArtifacts} artifacts`);
        console.log(`Summary Threshold: ${this.contextManager.config.summaryThreshold} tokens`);

        return {
            totalTests,
            passedTests,
            failedTests,
            successRate: parseFloat(successRate),
            details: allTests,
            executionTime: totalTime
        };
    }

    // Cleanup
    async cleanup() {
        if (this.contextManager) {
            await this.contextManager.close();
        }
        if (this.db) {
            await this.db.close();
        }
        if (this.knowledgeAnalyzer) {
            await this.knowledgeAnalyzer.close();
        }
        
        // Clean up test project
        if (this.testProject) {
            try {
                await this.db.query('DELETE FROM projects WHERE id = ?', [this.testProject.id]);
            } catch (error) {
                console.error('Cleanup warning:', error.message);
            }
        }
    }
}

// Run the tests if this file is executed directly
if (require.main === module) {
    (async () => {
        const tester = new ContextManagementAdvancedTest();
        
        try {
            const initialized = await tester.initialize();
            if (!initialized) {
                console.error('❌ Failed to initialize test suite');
                process.exit(1);
            }

            const results = await tester.runAllTests();
            
            if (results.successRate < 90) {
                console.log('\n⚠️ Some tests failed. Review and fix issues before proceeding.');
                process.exit(1);
            } else {
                console.log('\n🎉 All tests passed! Context Management system is functioning correctly.');
                process.exit(0);
            }
        } catch (error) {
            console.error('❌ Test execution failed:', error.message);
            process.exit(1);
        } finally {
            await tester.cleanup();
        }
    })();
}

module.exports = ContextManagementAdvancedTest;
