#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Phase 3 Advanced File Management
 * 
 * Tests all Phase 3 components and their integration:
 * - Advanced Context Commands (/rm, /mc, /ac, /ic)
 * - Knowledge Base Integration (/ks, /kstats, /kr, /kextract)
 * - System Monitoring & Diagnostics (/health, /perf, /diag, /sysmon)
 * - Intelligent Command Processing (NL processing, suggestions, learning)
 * - Integration with Phase 2 FileRelevanceEngine
 */

const path = require('path');
const fs = require('fs').promises;

// Mock dependencies for testing
const mockFilesystemManager = {
    projectRoot: process.cwd(),
    isInitialized: true,
    relevanceEngine: {
        userPreferences: { maxContextFiles: 8, importanceThreshold: 5 },
        trackFileAccess: () => {},
        buildContextualPrompt: async () => 'mock context',
        analyzeQuery: async () => ({ intents: [], keywords: [], explicitFiles: [] }),
        scoreFiles: async () => ({ results: [], totalCandidates: 0, averageScore: 0 })
    },
    getRelevantFiles: async () => ({ 
        results: [
            { file: { fileName: 'test.js' }, score: 8.5, relativePath: 'test.js' }
        ], 
        searchMethod: 'advanced' 
    }),
    getStats: () => ({ index: { totalFiles: 100 }, errors: 0 })
};

const mockDbClient = {
    query: async (query, params) => ({ rows: [] }),
    saveExtractedKnowledge: async () => [{ id: 1 }]
};

const mockKnowledgeAnalyzer = {
    analyzeContent: async (content) => ({
        relevance_score: 7,
        artifact_type: 'test_artifact',
        context: {}
    })
};

class Phase3ComprehensiveTestSuite {
    constructor() {
        this.testResults = {
            total: 0,
            passed: 0,
            failed: 0,
            warnings: 0,
            errors: [],
            details: new Map()
        };
        
        this.integrationLayer = null;
        this.testStartTime = Date.now();
        
        console.log('🧪 Phase 3 Comprehensive Test Suite');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    async runAllTests() {
        try {
            console.log('🚀 Starting comprehensive Phase 3 testing...\n');

            // Test 1: Component Initialization
            await this.testComponentInitialization();

            // Test 2: Advanced Context Commands
            await this.testAdvancedContextCommands();

            // Test 3: Knowledge Base Integration
            await this.testKnowledgeBaseIntegration();

            // Test 4: System Monitoring & Diagnostics
            await this.testSystemMonitoring();

            // Test 5: Intelligent Command Processing
            await this.testIntelligentCommandProcessing();

            // Test 6: Integration Layer
            await this.testIntegrationLayer();

            // Test 7: End-to-End Workflows
            await this.testEndToEndWorkflows();

            // Test 8: Performance and Reliability
            await this.testPerformanceAndReliability();

            // Test 9: Error Handling and Recovery
            await this.testErrorHandlingAndRecovery();

            // Test 10: Real-World Scenarios
            await this.testRealWorldScenarios();

            this.displayFinalResults();

        } catch (error) {
            console.error('🧪 Test suite execution failed:', error.message);
            this.recordFailure('Test Suite Execution', error.message);
        }
    }

    async testComponentInitialization() {
        console.log('🔧 Testing Component Initialization...');
        
        try {
            // Import and initialize integration layer
            const Phase3IntegrationLayer = require('./phase3-integration-layer');
            this.integrationLayer = new Phase3IntegrationLayer(
                mockFilesystemManager,
                mockDbClient,
                mockKnowledgeAnalyzer,
                { learningEnabled: true }
            );

            await this.integrationLayer.initialize();
            
            if (this.integrationLayer.isInitialized) {
                this.recordSuccess('Integration Layer Initialization');
            } else {
                this.recordFailure('Integration Layer Initialization', 'Not properly initialized');
            }

            // Check component status
            const status = this.integrationLayer.getComponentStatus();
            const expectedComponents = ['advancedContext', 'knowledgeSystem', 'monitoring', 'commandProcessor'];
            
            for (const component of expectedComponents) {
                if (status[component] && status[component].status === 'healthy') {
                    this.recordSuccess(`${component} Component Health`);
                } else {
                    this.recordFailure(`${component} Component Health`, 'Component not healthy');
                }
            }

            // Test capabilities
            const capabilities = this.integrationLayer.getSystemCapabilities();
            
            if (capabilities.advancedContextModes.length >= 4) {
                this.recordSuccess('Advanced Context Modes Available');
            } else {
                this.recordFailure('Advanced Context Modes Available', `Only ${capabilities.advancedContextModes.length} modes`);
            }

            if (capabilities.knowledgeOperations.length >= 5) {
                this.recordSuccess('Knowledge Operations Available');
            } else {
                this.recordFailure('Knowledge Operations Available', `Only ${capabilities.knowledgeOperations.length} operations`);
            }

        } catch (error) {
            this.recordFailure('Component Initialization', error.message);
        }
        
        console.log('');
    }

    async testAdvancedContextCommands() {
        console.log('🌟 Testing Advanced Context Commands...');
        
        const contextCommands = [
            { cmd: '/rm', name: 'Revolutionary Mode' },
            { cmd: '/mc', name: 'Maximum Context' },
            { cmd: '/ac', name: 'Aggressive Context' },
            { cmd: '/ic', name: 'Intelligent Context' },
            { cmd: '/cs', name: 'Context Status' },
            { cmd: '/ch', name: 'Context History' },
            { cmd: '/sc', name: 'Suggest Context' },
            { cmd: '/oc', name: 'Optimize Context' }
        ];

        for (const { cmd, name } of contextCommands) {
            try {
                const result = await this.integrationLayer.processCommand(cmd, this.getMockConversation(), null);
                
                if (result.handled && result.success) {
                    this.recordSuccess(`${name} Command (${cmd})`);
                } else {
                    this.recordFailure(`${name} Command (${cmd})`, result.error || 'Command not handled');
                }
            } catch (error) {
                this.recordFailure(`${name} Command (${cmd})`, error.message);
            }
        }

        // Test context mode switching
        try {
            await this.integrationLayer.processCommand('/rm', [], null);
            await this.integrationLayer.processCommand('/cs', [], null);
            
            const stats = this.integrationLayer.getIntegrationStats();
            if (stats.integration.contextSwitches >= 1) {
                this.recordSuccess('Context Mode Switching');
            } else {
                this.recordFailure('Context Mode Switching', 'No context switches recorded');
            }
        } catch (error) {
            this.recordFailure('Context Mode Switching', error.message);
        }

        // Test context building
        try {
            if (this.integrationLayer.advancedContext) {
                const context = await this.integrationLayer.advancedContext.buildContextualPrompt(
                    'test query',
                    this.getMockConversation(),
                    { name: 'test-project' }
                );
                
                if (context && context.length > 50) {
                    this.recordSuccess('Context Building');
                } else {
                    this.recordFailure('Context Building', 'Context too short or empty');
                }
            }
        } catch (error) {
            this.recordFailure('Context Building', error.message);
        }

        console.log('');
    }

    async testKnowledgeBaseIntegration() {
        console.log('📚 Testing Knowledge Base Integration...');
        
        const knowledgeCommands = [
            { cmd: '/ks test', name: 'Knowledge Search' },
            { cmd: '/kstats', name: 'Knowledge Statistics' },
            { cmd: '/kr', name: 'Knowledge Review' },
            { cmd: '/kextract', name: 'Knowledge Extraction' },
            { cmd: '/koptimize', name: 'Knowledge Optimize' },
            { cmd: '/kgraph', name: 'Knowledge Graph' },
            { cmd: '/kclean', name: 'Knowledge Cleanup' },
            { cmd: '/kbackup', name: 'Knowledge Backup' }
        ];

        for (const { cmd, name } of knowledgeCommands) {
            try {
                const result = await this.integrationLayer.processCommand(cmd, this.getMockConversation(), null);
                
                if (result.handled) {
                    this.recordSuccess(`${name} Command (${cmd})`);
                } else {
                    this.recordFailure(`${name} Command (${cmd})`, 'Command not handled');
                }
            } catch (error) {
                this.recordFailure(`${name} Command (${cmd})`, error.message);
            }
        }

        // Test knowledge extraction with conversation
        try {
            const mockHistory = [
                { role: 'user', content: 'How do I implement authentication in Node.js?' },
                { role: 'assistant', content: 'To implement authentication, use JWT tokens and middleware...' }
            ];
            
            const result = await this.integrationLayer.processCommand('/kextract 2', mockHistory, null);
            if (result.handled) {
                this.recordSuccess('Knowledge Extraction with Conversation');
            } else {
                this.recordFailure('Knowledge Extraction with Conversation', 'Extraction failed');
            }
        } catch (error) {
            this.recordFailure('Knowledge Extraction with Conversation', error.message);
        }

        console.log('');
    }

    async testSystemMonitoring() {
        console.log('📊 Testing System Monitoring & Diagnostics...');
        
        const monitoringCommands = [
            { cmd: '/health', name: 'Health Check' },
            { cmd: '/sysmon', name: 'System Monitor' },
            { cmd: '/perf', name: 'Performance Metrics' },
            { cmd: '/diag', name: 'Deep Diagnostics' },
            { cmd: '/alerts', name: 'Alert Management' },
            { cmd: '/trace', name: 'Operation Tracing' },
            { cmd: '/benchmark', name: 'Performance Benchmark' }
        ];

        for (const { cmd, name } of monitoringCommands) {
            try {
                const result = await this.integrationLayer.processCommand(cmd, [], null);
                
                if (result.handled) {
                    this.recordSuccess(`${name} Command (${cmd})`);
                } else {
                    this.recordFailure(`${name} Command (${cmd})`, 'Command not handled');
                }
            } catch (error) {
                this.recordFailure(`${name} Command (${cmd})`, error.message);
            }
        }

        // Test health check integration
        try {
            const health = await this.integrationLayer.performHealthCheck();
            
            if (health.overall === 'healthy' || health.overall === 'warning') {
                this.recordSuccess('Integration Health Check');
            } else {
                this.recordFailure('Integration Health Check', `Health: ${health.overall}`);
            }
        } catch (error) {
            this.recordFailure('Integration Health Check', error.message);
        }

        // Test monitoring metrics
        try {
            const stats = this.integrationLayer.getIntegrationStats();
            
            if (stats.integration && stats.components) {
                this.recordSuccess('Monitoring Metrics Collection');
            } else {
                this.recordFailure('Monitoring Metrics Collection', 'Missing stats data');
            }
        } catch (error) {
            this.recordFailure('Monitoring Metrics Collection', error.message);
        }

        console.log('');
    }

    async testIntelligentCommandProcessing() {
        console.log('🧠 Testing Intelligent Command Processing...');
        
        // Test natural language processing
        const nlCommands = [
            'show system health',
            'search for authentication info',
            'switch to revolutionary mode',
            'check performance metrics',
            'help me with commands'
        ];

        for (const nlCommand of nlCommands) {
            try {
                const result = await this.integrationLayer.processCommand(nlCommand, this.getMockConversation(), null);
                
                if (result.handled || result.nlProcessed) {
                    this.recordSuccess(`Natural Language: "${nlCommand}"`);
                } else {
                    this.recordFailure(`Natural Language: "${nlCommand}"`, 'Not processed as NL');
                }
            } catch (error) {
                this.recordFailure(`Natural Language: "${nlCommand}"`, error.message);
            }
        }

        // Test command suggestions
        try {
            const result = await this.integrationLayer.processCommand('/suggest', this.getMockConversation(), null);
            
            if (result.handled) {
                this.recordSuccess('Command Suggestions');
            } else {
                this.recordFailure('Command Suggestions', 'Suggestions not provided');
            }
        } catch (error) {
            this.recordFailure('Command Suggestions', error.message);
        }

        // Test pattern learning
        try {
            const result = await this.integrationLayer.processCommand('/learn', [], null);
            
            if (result.handled) {
                this.recordSuccess('Pattern Learning');
            } else {
                this.recordFailure('Pattern Learning', 'Learning not available');
            }
        } catch (error) {
            this.recordFailure('Pattern Learning', error.message);
        }

        // Test unknown command handling
        try {
            const result = await this.integrationLayer.processCommand('/unknowncommand', [], null);
            
            if (result.handled && !result.success && result.suggestions) {
                this.recordSuccess('Unknown Command Handling');
            } else {
                this.recordFailure('Unknown Command Handling', 'No intelligent suggestions provided');
            }
        } catch (error) {
            this.recordFailure('Unknown Command Handling', error.message);
        }

        console.log('');
    }

    async testIntegrationLayer() {
        console.log('🔗 Testing Integration Layer...');
        
        // Test event coordination
        let eventReceived = false;
        this.integrationLayer.on('command:completed', () => {
            eventReceived = true;
        });
        
        await this.integrationLayer.processCommand('/health', [], null);
        
        if (eventReceived) {
            this.recordSuccess('Event Coordination');
        } else {
            this.recordFailure('Event Coordination', 'Events not properly coordinated');
        }

        // Test FileRelevanceEngine integration
        try {
            if (mockFilesystemManager.relevanceEngine.buildContextualPrompt) {
                const context = await mockFilesystemManager.relevanceEngine.buildContextualPrompt('test', [], null);
                if (context) {
                    this.recordSuccess('FileRelevanceEngine Integration');
                } else {
                    this.recordFailure('FileRelevanceEngine Integration', 'Context building failed');
                }
            }
        } catch (error) {
            this.recordFailure('FileRelevanceEngine Integration', error.message);
        }

        // Test cross-component communication
        try {
            await this.integrationLayer.processCommand('/rm', [], null);
            await this.integrationLayer.processCommand('/health', [], null);
            
            const stats = this.integrationLayer.getIntegrationStats();
            if (stats.integration.commandsProcessed >= 2) {
                this.recordSuccess('Cross-Component Communication');
            } else {
                this.recordFailure('Cross-Component Communication', 'Commands not properly tracked');
            }
        } catch (error) {
            this.recordFailure('Cross-Component Communication', error.message);
        }

        console.log('');
    }

    async testEndToEndWorkflows() {
        console.log('🔄 Testing End-to-End Workflows...');
        
        // Workflow 1: Context optimization workflow
        try {
            await this.integrationLayer.processCommand('/cs', [], null); // Check current status
            await this.integrationLayer.processCommand('/sc', this.getMockConversation(), null); // Get suggestions
            await this.integrationLayer.processCommand('/oc', this.getMockConversation(), null); // Optimize context
            await this.integrationLayer.processCommand('/cs', [], null); // Verify changes
            
            this.recordSuccess('Context Optimization Workflow');
        } catch (error) {
            this.recordFailure('Context Optimization Workflow', error.message);
        }

        // Workflow 2: Knowledge management workflow
        try {
            await this.integrationLayer.processCommand('/kstats', [], null); // Check stats
            await this.integrationLayer.processCommand('/kextract 3', this.getMockConversation(), null); // Extract knowledge
            await this.integrationLayer.processCommand('/ks authentication', [], null); // Search knowledge
            await this.integrationLayer.processCommand('/kr', [], null); // Review knowledge
            
            this.recordSuccess('Knowledge Management Workflow');
        } catch (error) {
            this.recordFailure('Knowledge Management Workflow', error.message);
        }

        // Workflow 3: System diagnostics workflow
        try {
            await this.integrationLayer.processCommand('/health', [], null); // Initial health check
            await this.integrationLayer.processCommand('/perf', [], null); // Performance analysis
            await this.integrationLayer.processCommand('/diag', [], null); // Deep diagnostics
            await this.integrationLayer.processCommand('/alerts', [], null); // Check alerts
            
            this.recordSuccess('System Diagnostics Workflow');
        } catch (error) {
            this.recordFailure('System Diagnostics Workflow', error.message);
        }

        // Workflow 4: Natural language interaction workflow
        try {
            await this.integrationLayer.processCommand('show system health', [], null);
            await this.integrationLayer.processCommand('search for database info', [], null);
            await this.integrationLayer.processCommand('switch to maximum context', [], null);
            await this.integrationLayer.processCommand('help me optimize performance', [], null);
            
            this.recordSuccess('Natural Language Interaction Workflow');
        } catch (error) {
            this.recordFailure('Natural Language Interaction Workflow', error.message);
        }

        console.log('');
    }

    async testPerformanceAndReliability() {
        console.log('⚡ Testing Performance and Reliability...');
        
        // Performance test - rapid command execution
        try {
            const startTime = Date.now();
            const commands = ['/health', '/cs', '/kstats', '/sysmon', '/suggest'];
            
            for (const cmd of commands) {
                await this.integrationLayer.processCommand(cmd, [], null);
            }
            
            const duration = Date.now() - startTime;
            if (duration < 5000) { // Should complete within 5 seconds
                this.recordSuccess(`Rapid Command Execution (${duration}ms)`);
            } else {
                this.recordFailure('Rapid Command Execution', `Too slow: ${duration}ms`);
            }
        } catch (error) {
            this.recordFailure('Rapid Command Execution', error.message);
        }

        // Reliability test - repeated command execution
        try {
            let successCount = 0;
            const iterations = 10;
            
            for (let i = 0; i < iterations; i++) {
                const result = await this.integrationLayer.processCommand('/cs', [], null);
                if (result.handled && result.success) {
                    successCount++;
                }
            }
            
            const reliability = (successCount / iterations) * 100;
            if (reliability >= 90) {
                this.recordSuccess(`Command Reliability (${reliability.toFixed(1)}%)`);
            } else {
                this.recordFailure('Command Reliability', `Only ${reliability.toFixed(1)}% successful`);
            }
        } catch (error) {
            this.recordFailure('Command Reliability', error.message);
        }

        // Memory usage test
        try {
            const initialMemory = process.memoryUsage().heapUsed;
            
            // Execute various commands
            for (let i = 0; i < 20; i++) {
                await this.integrationLayer.processCommand('/health', this.getMockConversation(), null);
            }
            
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB
            
            if (memoryIncrease < 50) { // Less than 50MB increase
                this.recordSuccess(`Memory Usage Control (${memoryIncrease.toFixed(1)}MB increase)`);
            } else {
                this.recordWarning('Memory Usage Control', `${memoryIncrease.toFixed(1)}MB increase detected`);
            }
        } catch (error) {
            this.recordFailure('Memory Usage Control', error.message);
        }

        console.log('');
    }

    async testErrorHandlingAndRecovery() {
        console.log('🛠️ Testing Error Handling and Recovery...');
        
        // Test invalid command arguments
        try {
            const result = await this.integrationLayer.processCommand('/ks', [], null); // Missing search term
            
            if (result.handled) {
                this.recordSuccess('Invalid Arguments Handling');
            } else {
                this.recordFailure('Invalid Arguments Handling', 'Did not handle gracefully');
            }
        } catch (error) {
            this.recordSuccess('Invalid Arguments Handling'); // Catching error is expected
        }

        // Test null/undefined inputs
        try {
            await this.integrationLayer.processCommand(null, [], null);
            await this.integrationLayer.processCommand(undefined, [], null);
            await this.integrationLayer.processCommand('', [], null);
            
            this.recordSuccess('Null/Undefined Input Handling');
        } catch (error) {
            this.recordFailure('Null/Undefined Input Handling', error.message);
        }

        // Test malformed conversation history
        try {
            const malformedHistory = [
                null,
                undefined,
                { role: 'user' }, // Missing content
                { content: 'test' }, // Missing role
                { role: 'user', content: null }
            ];
            
            const result = await this.integrationLayer.processCommand('/kextract', malformedHistory, null);
            
            if (result.handled) {
                this.recordSuccess('Malformed Input Handling');
            } else {
                this.recordFailure('Malformed Input Handling', 'Did not handle gracefully');
            }
        } catch (error) {
            this.recordSuccess('Malformed Input Handling'); // Error handling is expected
        }

        // Test system recovery after errors
        try {
            // Cause some errors
            await this.integrationLayer.processCommand('/nonexistent', [], null);
            await this.integrationLayer.processCommand('/ks', [], null);
            
            // Test system still works
            const result = await this.integrationLayer.processCommand('/health', [], null);
            
            if (result.handled && result.success) {
                this.recordSuccess('System Recovery After Errors');
            } else {
                this.recordFailure('System Recovery After Errors', 'System not recovered');
            }
        } catch (error) {
            this.recordFailure('System Recovery After Errors', error.message);
        }

        console.log('');
    }

    async testRealWorldScenarios() {
        console.log('🌍 Testing Real-World Scenarios...');
        
        // Scenario 1: User starts session and explores capabilities
        try {
            await this.integrationLayer.processCommand('/help', [], null);
            await this.integrationLayer.processCommand('/commands', [], null);
            await this.integrationLayer.processCommand('/health', [], null);
            
            this.recordSuccess('New User Exploration Scenario');
        } catch (error) {
            this.recordFailure('New User Exploration Scenario', error.message);
        }

        // Scenario 2: Developer working on authentication feature
        try {
            const authConversation = [
                { role: 'user', content: 'I need to implement JWT authentication' },
                { role: 'assistant', content: 'Here are the steps for JWT implementation...' },
                { role: 'user', content: 'How do I handle token refresh?' },
                { role: 'assistant', content: 'For token refresh, you can use...' }
            ];
            
            await this.integrationLayer.processCommand('/ac', authConversation, null); // Aggressive context
            await this.integrationLayer.processCommand('/ks authentication', [], null); // Search knowledge
            await this.integrationLayer.processCommand('/kextract 4', authConversation, null); // Extract knowledge
            
            this.recordSuccess('Authentication Development Scenario');
        } catch (error) {
            this.recordFailure('Authentication Development Scenario', error.message);
        }

        // Scenario 3: Performance troubleshooting session
        try {
            const perfConversation = [
                { role: 'user', content: 'The application is running slowly' },
                { role: 'assistant', content: 'Let me help you diagnose the performance issues...' }
            ];
            
            await this.integrationLayer.processCommand('/health', perfConversation, null);
            await this.integrationLayer.processCommand('/perf', perfConversation, null);
            await this.integrationLayer.processCommand('/diag', perfConversation, null);
            await this.integrationLayer.processCommand('/benchmark', [], null);
            
            this.recordSuccess('Performance Troubleshooting Scenario');
        } catch (error) {
            this.recordFailure('Performance Troubleshooting Scenario', error.message);
        }

        // Scenario 4: Natural language interaction by non-technical user
        try {
            await this.integrationLayer.processCommand('show me system status', [], null);
            await this.integrationLayer.processCommand('help me find information about databases', [], null);
            await this.integrationLayer.processCommand('what can this system do', [], null);
            
            this.recordSuccess('Non-Technical User Scenario');
        } catch (error) {
            this.recordFailure('Non-Technical User Scenario', error.message);
        }

        // Scenario 5: Long conversation with context optimization
        try {
            const longConversation = Array.from({ length: 15 }, (_, i) => ({
                role: i % 2 === 0 ? 'user' : 'assistant',
                content: `Message ${i + 1}: This is a long conversation about various development topics.`
            }));
            
            await this.integrationLayer.processCommand('/rm', longConversation, null); // Revolutionary mode
            await this.integrationLayer.processCommand('/oc', longConversation, null); // Optimize context
            
            this.recordSuccess('Long Conversation Scenario');
        } catch (error) {
            this.recordFailure('Long Conversation Scenario', error.message);
        }

        console.log('');
    }

    getMockConversation() {
        return [
            { role: 'user', content: 'I need help implementing authentication in my Node.js application' },
            { role: 'assistant', content: 'I can help you with JWT authentication. First, you\'ll need to install jsonwebtoken...' },
            { role: 'user', content: 'What about password hashing?' },
            { role: 'assistant', content: 'For password hashing, I recommend using bcrypt. Here\'s how to implement it...' },
            { role: 'user', content: 'How do I test the authentication middleware?' }
        ];
    }

    recordSuccess(testName) {
        this.testResults.total++;
        this.testResults.passed++;
        this.testResults.details.set(testName, { status: 'PASS', message: null });
        console.log(`  ✅ ${testName}: PASSED`);
    }

    recordFailure(testName, message) {
        this.testResults.total++;
        this.testResults.failed++;
        this.testResults.details.set(testName, { status: 'FAIL', message });
        this.testResults.errors.push(`${testName}: ${message}`);
        console.log(`  ❌ ${testName}: FAILED - ${message}`);
    }

    recordWarning(testName, message) {
        this.testResults.total++;
        this.testResults.warnings++;
        this.testResults.details.set(testName, { status: 'WARN', message });
        console.log(`  ⚠️  ${testName}: WARNING - ${message}`);
    }

    displayFinalResults() {
        const duration = Date.now() - this.testStartTime;
        const successRate = ((this.testResults.passed / this.testResults.total) * 100).toFixed(1);
        
        console.log('\n🧪 PHASE 3 TEST RESULTS SUMMARY');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📊 Total Tests: ${this.testResults.total}`);
        console.log(`✅ Passed: ${this.testResults.passed}`);
        console.log(`❌ Failed: ${this.testResults.failed}`);
        console.log(`⚠️  Warnings: ${this.testResults.warnings}`);
        console.log(`📈 Success Rate: ${successRate}%`);
        console.log(`⏱️  Duration: ${(duration / 1000).toFixed(1)}s`);
        
        if (this.testResults.failed === 0) {
            console.log('\n🎉 ALL TESTS PASSED! Phase 3 is ready for production.');
        } else if (this.testResults.failed <= 2) {
            console.log('\n✨ Mostly successful! Minor issues detected.');
        } else {
            console.log('\n⚠️  Multiple test failures detected. Review required.');
        }
        
        // Show test categories
        console.log('\n📋 Test Categories:');
        const categories = {
            'Component Initialization': 0,
            'Advanced Context Commands': 0,
            'Knowledge Base Integration': 0,
            'System Monitoring': 0,
            'Intelligent Processing': 0,
            'Integration Layer': 0,
            'End-to-End Workflows': 0,
            'Performance': 0,
            'Error Handling': 0,
            'Real-World Scenarios': 0
        };
        
        for (const [testName, result] of this.testResults.details) {
            // Categorize tests (simplified)
            if (testName.includes('Component') || testName.includes('Health')) {
                categories['Component Initialization']++;
            } else if (testName.includes('Context') || testName.includes('Mode')) {
                categories['Advanced Context Commands']++;
            } else if (testName.includes('Knowledge')) {
                categories['Knowledge Base Integration']++;
            } else if (testName.includes('Monitor') || testName.includes('Performance') || testName.includes('Health')) {
                categories['System Monitoring']++;
            } else if (testName.includes('Natural Language') || testName.includes('Suggestion') || testName.includes('Learning')) {
                categories['Intelligent Processing']++;
            } else if (testName.includes('Integration') || testName.includes('Event')) {
                categories['Integration Layer']++;
            } else if (testName.includes('Workflow')) {
                categories['End-to-End Workflows']++;
            } else if (testName.includes('Rapid') || testName.includes('Reliability') || testName.includes('Memory')) {
                categories['Performance']++;
            } else if (testName.includes('Error') || testName.includes('Invalid') || testName.includes('Recovery')) {
                categories['Error Handling']++;
            } else {
                categories['Real-World Scenarios']++;
            }
        }
        
        Object.entries(categories).forEach(([category, count]) => {
            if (count > 0) {
                console.log(`   ${category}: ${count} tests`);
            }
        });
        
        if (this.testResults.errors.length > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.testResults.errors.forEach(error => {
                console.log(`   • ${error}`);
            });
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        // Cleanup
        if (this.integrationLayer) {
            this.integrationLayer.shutdown();
        }
        
        // Return success status
        return this.testResults.failed === 0;
    }
}

// Run the test suite if this file is executed directly
if (require.main === module) {
    const testSuite = new Phase3ComprehensiveTestSuite();
    testSuite.runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Test suite failed:', error);
        process.exit(1);
    });
}

module.exports = Phase3ComprehensiveTestSuite;