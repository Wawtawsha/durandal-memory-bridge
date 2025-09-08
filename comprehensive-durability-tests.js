/**
 * Comprehensive Durability & Accuracy Test Suite for DevAssistant
 * Tests system reliability, performance, and accuracy across all capabilities
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3002';

class DevAssistantTestSuite {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            errors: [],
            performance: {},
            accuracy: {}
        };
        this.testStartTime = Date.now();
    }

    // Utility functions
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async makeRequest(endpoint, data = null, method = 'GET') {
        const start = Date.now();
        try {
            const response = method === 'GET' 
                ? await axios.get(`${BASE_URL}${endpoint}`)
                : await axios.post(`${BASE_URL}${endpoint}`, data);
            
            const duration = Date.now() - start;
            return { success: true, data: response.data, duration, status: response.status };
        } catch (error) {
            const duration = Date.now() - start;
            return { success: false, error: error.message, duration, status: error.response?.status };
        }
    }

    logTest(testName, passed, details = '') {
        const status = passed ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} ${testName} ${details}`);
        
        if (passed) {
            this.results.passed++;
        } else {
            this.results.failed++;
            this.results.errors.push({ test: testName, details });
        }
    }

    // TEST 1: API Endpoint Stress Testing
    async testAPIStress() {
        console.log('\n🔥 TEST 1: API Endpoint Stress Testing');
        
        const endpoints = [
            { path: '/api/health', method: 'GET' },
            { path: '/api/workspace-info', method: 'GET' },
            { path: '/api/semantic-search', method: 'POST', data: { query: 'test function' } },
            { path: '/api/analyze-quality', method: 'POST', data: { filePath: './dev-assistant.js' } },
            { path: '/api/predict-files', method: 'POST', data: { context: { taskType: 'development' } } }
        ];

        // Concurrent requests test
        const concurrentRequests = 20;
        const promises = [];
        
        for (let i = 0; i < concurrentRequests; i++) {
            const endpoint = endpoints[i % endpoints.length];
            promises.push(this.makeRequest(endpoint.path, endpoint.data, endpoint.method));
        }

        const results = await Promise.all(promises);
        const successCount = results.filter(r => r.success).length;
        const avgResponseTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

        this.results.performance.concurrentRequests = {
            total: concurrentRequests,
            successful: successCount,
            avgResponseTime: Math.round(avgResponseTime)
        };

        this.logTest('API Stress Test', successCount >= concurrentRequests * 0.9, 
            `${successCount}/${concurrentRequests} successful, avg ${Math.round(avgResponseTime)}ms`);
    }

    // TEST 2: Memory Leak Detection
    async testMemoryUsage() {
        console.log('\n🧠 TEST 2: Memory Leak Detection');
        
        const initialMemory = process.memoryUsage().heapUsed;
        const iterations = 50;
        
        for (let i = 0; i < iterations; i++) {
            await this.makeRequest('/api/semantic-search', { query: `test query ${i}` }, 'POST');
            await this.makeRequest('/api/workspace-info');
            
            if (i % 10 === 0) {
                global.gc && global.gc(); // Force garbage collection if available
            }
        }

        await this.delay(2000); // Allow cleanup
        const finalMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = ((finalMemory - initialMemory) / 1024 / 1024).toFixed(2);

        this.results.performance.memoryIncrease = memoryIncrease;
        this.logTest('Memory Leak Test', parseFloat(memoryIncrease) < 50, `${memoryIncrease}MB increase`);
    }

    // TEST 3: Semantic Search Accuracy
    async testSemanticSearchAccuracy() {
        console.log('\n🔍 TEST 3: Semantic Search Accuracy');
        
        const testQueries = [
            { query: 'database connection', expectedKeywords: ['database', 'connection', 'db'] },
            { query: 'error handling', expectedKeywords: ['error', 'catch', 'try'] },
            { query: 'file operations', expectedKeywords: ['file', 'fs', 'read', 'write'] },
            { query: 'api endpoints', expectedKeywords: ['api', 'endpoint', 'route'] },
            { query: 'testing functions', expectedKeywords: ['test', 'expect', 'assert'] }
        ];

        let accuracyScore = 0;
        const searchResults = [];

        for (const testCase of testQueries) {
            const result = await this.makeRequest('/api/semantic-search', { query: testCase.query }, 'POST');
            
            if (result.success && result.data.results) {
                const hasRelevantResults = result.data.results.length > 0;
                const relevantMatches = result.data.results.filter(item => 
                    testCase.expectedKeywords.some(keyword => 
                        item.content?.toLowerCase().includes(keyword.toLowerCase()) ||
                        item.filePath?.toLowerCase().includes(keyword.toLowerCase())
                    )
                );
                
                const relevanceRatio = result.data.results.length > 0 ? 
                    relevantMatches.length / result.data.results.length : 0;
                
                accuracyScore += relevanceRatio;
                searchResults.push({
                    query: testCase.query,
                    results: result.data.results.length,
                    relevantMatches: relevantMatches.length,
                    relevanceRatio: relevanceRatio.toFixed(2)
                });
            }
        }

        const avgAccuracy = (accuracyScore / testQueries.length * 100).toFixed(1);
        this.results.accuracy.semanticSearch = avgAccuracy;
        
        this.logTest('Semantic Search Accuracy', parseFloat(avgAccuracy) >= 60, 
            `${avgAccuracy}% relevance accuracy`);

        console.log('   Search Results Summary:', searchResults);
    }

    // TEST 4: Code Quality Analysis Consistency
    async testCodeQualityConsistency() {
        console.log('\n📊 TEST 4: Code Quality Analysis Consistency');
        
        const testFiles = [
            './dev-assistant.js',
            './package.json',
            './devassistant-ui-server.js',
            './durandal.js'
        ];

        const qualityResults = [];
        let consistencyScore = 0;

        for (const filePath of testFiles) {
            // Run analysis twice to check consistency
            const result1 = await this.makeRequest('/api/analyze-quality', { filePath }, 'POST');
            await this.delay(100);
            const result2 = await this.makeRequest('/api/analyze-quality', { filePath }, 'POST');

            if (result1.success && result2.success) {
                const score1 = result1.data.analysis?.qualityScore || 0;
                const score2 = result2.data.analysis?.qualityScore || 0;
                const scoreDifference = Math.abs(score1 - score2);
                
                qualityResults.push({
                    file: filePath,
                    score1: score1.toFixed(3),
                    score2: score2.toFixed(3),
                    difference: scoreDifference.toFixed(3),
                    consistent: scoreDifference < 0.05
                });

                if (scoreDifference < 0.05) consistencyScore++;
            }
        }

        const consistencyRate = (consistencyScore / testFiles.length * 100).toFixed(1);
        this.results.accuracy.codeQuality = consistencyRate;
        
        this.logTest('Code Quality Consistency', parseFloat(consistencyRate) >= 80, 
            `${consistencyRate}% consistency rate`);
            
        console.log('   Quality Analysis Results:', qualityResults);
    }

    // TEST 5: Error Handling & Recovery
    async testErrorHandling() {
        console.log('\n🛡️ TEST 5: Error Handling & Recovery');
        
        const errorTests = [
            { path: '/api/analyze-quality', data: { filePath: './nonexistent-file.js' } },
            { path: '/api/semantic-search', data: { query: '' } },
            { path: '/api/predict-files', data: { context: null } },
            { path: '/api/nonexistent-endpoint', data: {} }
        ];

        let errorHandlingScore = 0;
        const errorResults = [];

        for (const test of errorTests) {
            const result = await this.makeRequest(test.path, test.data, 'POST');
            const gracefulError = !result.success && result.status >= 400 && result.status < 500;
            
            if (gracefulError) errorHandlingScore++;
            
            errorResults.push({
                endpoint: test.path,
                gracefulError,
                status: result.status || 'no response'
            });
        }

        const errorRate = (errorHandlingScore / errorTests.length * 100).toFixed(1);
        this.logTest('Error Handling', parseFloat(errorRate) >= 75, 
            `${errorRate}% graceful error handling`);
            
        console.log('   Error Handling Results:', errorResults);
    }

    // TEST 6: Database Integrity
    async testDatabaseIntegrity() {
        console.log('\n💾 TEST 6: Database Integrity Under Load');
        
        const dbOperations = [];
        const operationCount = 30;
        
        // Simulate concurrent database operations
        for (let i = 0; i < operationCount; i++) {
            dbOperations.push(
                this.makeRequest('/api/semantic-search', { query: `integrity test ${i}` }, 'POST')
            );
            dbOperations.push(
                this.makeRequest('/api/workspace-info')
            );
        }

        const results = await Promise.all(dbOperations);
        const successfulOps = results.filter(r => r.success).length;
        const integrityScore = (successfulOps / (operationCount * 2) * 100).toFixed(1);

        this.logTest('Database Integrity', parseFloat(integrityScore) >= 95, 
            `${successfulOps}/${operationCount * 2} operations successful`);
    }

    // TEST 7: Knowledge Graph Validation
    async testKnowledgeGraphAccuracy() {
        console.log('\n🕸️ TEST 7: Knowledge Graph Accuracy');
        
        const graphResult = await this.makeRequest('/api/knowledge-graph', { directoryPath: '.' }, 'POST');
        
        if (graphResult.success && graphResult.data.graph) {
            const graph = graphResult.data.graph;
            const nodes = graph.nodes?.length || 0;
            const relationships = graph.relationships?.length || 0;
            
            // Validate graph structure
            const hasValidStructure = nodes > 100 && relationships > nodes;
            const relationshipRatio = relationships / nodes;
            
            this.results.accuracy.knowledgeGraph = {
                nodes,
                relationships,
                relationshipRatio: relationshipRatio.toFixed(2)
            };
            
            this.logTest('Knowledge Graph Structure', hasValidStructure, 
                `${nodes} nodes, ${relationships} relationships, ratio: ${relationshipRatio.toFixed(2)}`);
        } else {
            this.logTest('Knowledge Graph Structure', false, 'Failed to build graph');
        }
    }

    // TEST 8: Prediction Accuracy Over Context
    async testPredictionAccuracy() {
        console.log('\n🔮 TEST 8: Predictive File Suggestions Accuracy');
        
        const contexts = [
            { taskType: 'development', expected: ['js', 'json'] },
            { taskType: 'testing', expected: ['test', 'spec'] },
            { taskType: 'debugging', expected: ['log', 'error'] },
            { taskType: 'refactoring', expected: ['js', 'json'] }
        ];

        let predictionScore = 0;
        const predictionResults = [];

        for (const context of contexts) {
            const result = await this.makeRequest('/api/predict-files', { context, limit: 10 }, 'POST');
            
            if (result.success && result.data.predictions) {
                const predictions = result.data.predictions.predictions || [];
                const confidence = result.data.predictions.confidence || 0;
                
                const relevantPredictions = predictions.filter(file => 
                    context.expected.some(keyword => 
                        file.toLowerCase().includes(keyword)
                    )
                );
                
                const relevanceRatio = predictions.length > 0 ? 
                    relevantPredictions.length / predictions.length : 0;
                
                predictionScore += relevanceRatio * confidence;
                predictionResults.push({
                    context: context.taskType,
                    predictions: predictions.length,
                    relevant: relevantPredictions.length,
                    confidence: (confidence * 100).toFixed(1)
                });
            }
        }

        const avgPredictionAccuracy = (predictionScore / contexts.length * 100).toFixed(1);
        this.results.accuracy.predictions = avgPredictionAccuracy;
        
        this.logTest('Prediction Accuracy', parseFloat(avgPredictionAccuracy) >= 40, 
            `${avgPredictionAccuracy}% weighted accuracy`);
            
        console.log('   Prediction Results:', predictionResults);
    }

    // TEST 9: Resource Utilization Monitoring
    async testResourceUtilization() {
        console.log('\n📊 TEST 9: System Resource Utilization');
        
        const initialMemory = process.memoryUsage();
        const startTime = Date.now();
        
        // Perform intensive operations
        const intensiveOps = [];
        for (let i = 0; i < 20; i++) {
            intensiveOps.push(this.makeRequest('/api/semantic-search', 
                { query: `resource test ${i} with longer query string to test processing` }, 'POST'));
            intensiveOps.push(this.makeRequest('/api/analyze-quality', 
                { filePath: './dev-assistant.js' }, 'POST'));
        }

        await Promise.all(intensiveOps);
        
        const finalMemory = process.memoryUsage();
        const endTime = Date.now();
        
        const memoryDelta = {
            heapUsed: ((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024).toFixed(2),
            heapTotal: ((finalMemory.heapTotal - initialMemory.heapTotal) / 1024 / 1024).toFixed(2),
            external: ((finalMemory.external - initialMemory.external) / 1024 / 1024).toFixed(2)
        };
        
        const totalTime = endTime - startTime;
        
        this.results.performance.resourceUtilization = {
            memoryDelta,
            processingTime: totalTime,
            operationsPerSecond: (intensiveOps.length / (totalTime / 1000)).toFixed(2)
        };
        
        const efficientResource = parseFloat(memoryDelta.heapUsed) < 100 && totalTime < 30000;
        
        this.logTest('Resource Utilization', efficientResource, 
            `${memoryDelta.heapUsed}MB heap, ${totalTime}ms processing`);
    }

    // TEST 10: Full Integration Workflow
    async testFullIntegration() {
        console.log('\n🔄 TEST 10: Full System Integration Workflow');
        
        const workflowSteps = [
            { name: 'Health Check', endpoint: '/api/health' },
            { name: 'Workspace Analysis', endpoint: '/api/workspace-info' },
            { name: 'Index Workspace', endpoint: '/api/index-workspace', data: { directoryPath: '.' }, method: 'POST' },
            { name: 'Semantic Search', endpoint: '/api/semantic-search', data: { query: 'assistant functions' }, method: 'POST' },
            { name: 'Code Analysis', endpoint: '/api/analyze-quality', data: { filePath: './dev-assistant.js' }, method: 'POST' },
            { name: 'File Predictions', endpoint: '/api/predict-files', data: { context: { taskType: 'development' } }, method: 'POST' },
            { name: 'Knowledge Graph', endpoint: '/api/knowledge-graph', data: { directoryPath: '.' }, method: 'POST' }
        ];

        let workflowScore = 0;
        const workflowResults = [];

        for (const step of workflowSteps) {
            const result = await this.makeRequest(step.endpoint, step.data, step.method || 'GET');
            const success = result.success && result.data && result.data.success !== false;
            
            if (success) workflowScore++;
            
            workflowResults.push({
                step: step.name,
                success,
                duration: result.duration,
                status: result.status
            });
            
            await this.delay(500); // Realistic workflow timing
        }

        const workflowSuccess = (workflowScore / workflowSteps.length * 100).toFixed(1);
        this.results.accuracy.fullWorkflow = workflowSuccess;
        
        this.logTest('Full Integration Workflow', parseFloat(workflowSuccess) >= 85, 
            `${workflowScore}/${workflowSteps.length} steps successful`);
            
        console.log('   Workflow Results:', workflowResults);
    }

    // Run all tests
    async runAllTests() {
        console.log('🚀 DevAssistant Comprehensive Durability & Accuracy Test Suite');
        console.log('='.repeat(70));
        
        await this.testAPIStress();
        await this.testMemoryUsage();
        await this.testSemanticSearchAccuracy();
        await this.testCodeQualityConsistency();
        await this.testErrorHandling();
        await this.testDatabaseIntegrity();
        await this.testKnowledgeGraphAccuracy();
        await this.testPredictionAccuracy();
        await this.testResourceUtilization();
        await this.testFullIntegration();

        // Generate final report
        this.generateFinalReport();
    }

    generateFinalReport() {
        const totalTime = Date.now() - this.testStartTime;
        const totalTests = this.results.passed + this.results.failed;
        const successRate = (this.results.passed / totalTests * 100).toFixed(1);

        console.log('\n' + '='.repeat(70));
        console.log('📊 FINAL TEST REPORT');
        console.log('='.repeat(70));
        console.log(`🎯 Overall Success Rate: ${successRate}% (${this.results.passed}/${totalTests})`);
        console.log(`⏱️  Total Test Duration: ${(totalTime / 1000).toFixed(2)}s`);
        
        console.log('\n📈 PERFORMANCE METRICS:');
        if (this.results.performance.concurrentRequests) {
            console.log(`   • Concurrent Requests: ${this.results.performance.concurrentRequests.successful}/${this.results.performance.concurrentRequests.total} successful`);
            console.log(`   • Average Response Time: ${this.results.performance.concurrentRequests.avgResponseTime}ms`);
        }
        if (this.results.performance.memoryIncrease) {
            console.log(`   • Memory Increase: ${this.results.performance.memoryIncrease}MB`);
        }
        if (this.results.performance.resourceUtilization) {
            console.log(`   • Operations/Second: ${this.results.performance.resourceUtilization.operationsPerSecond}`);
        }

        console.log('\n🎯 ACCURACY METRICS:');
        if (this.results.accuracy.semanticSearch) {
            console.log(`   • Semantic Search: ${this.results.accuracy.semanticSearch}% relevance`);
        }
        if (this.results.accuracy.codeQuality) {
            console.log(`   • Code Quality Consistency: ${this.results.accuracy.codeQuality}%`);
        }
        if (this.results.accuracy.predictions) {
            console.log(`   • Prediction Accuracy: ${this.results.accuracy.predictions}%`);
        }
        if (this.results.accuracy.fullWorkflow) {
            console.log(`   • Full Workflow Success: ${this.results.accuracy.fullWorkflow}%`);
        }

        if (this.results.errors.length > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.results.errors.forEach(error => {
                console.log(`   • ${error.test}: ${error.details}`);
            });
        }

        console.log('\n🏆 DURABILITY ASSESSMENT:');
        if (parseFloat(successRate) >= 90) {
            console.log('   EXCELLENT - System demonstrates high durability and accuracy');
        } else if (parseFloat(successRate) >= 80) {
            console.log('   GOOD - System shows solid performance with minor areas for improvement');
        } else if (parseFloat(successRate) >= 70) {
            console.log('   FAIR - System functional but needs optimization');
        } else {
            console.log('   NEEDS IMPROVEMENT - Several critical issues detected');
        }

        console.log('\n' + '='.repeat(70));
    }
}

// Execute tests
if (require.main === module) {
    const testSuite = new DevAssistantTestSuite();
    testSuite.runAllTests().catch(console.error);
}

module.exports = DevAssistantTestSuite;