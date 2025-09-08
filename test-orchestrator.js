// Test Orchestrator - Comprehensive Testing Suite for Durandal Systems
// Runs all test suites in proper order with reporting and cleanup

const fs = require('fs').promises;
const path = require('path');

class TestOrchestrator {
    constructor() {
        this.testSuites = [
            {
                name: 'RAMR Comprehensive Tests',
                file: './test-ramr-comprehensive-updated.js',
                description: 'Deep testing of RAMR caching system',
                critical: true,
                estimatedTime: 30000 // 30 seconds
            },
            {
                name: 'Context Management Advanced Tests',
                file: './test-context-management-advanced.js',
                description: 'Advanced context building and optimization',
                critical: true,
                estimatedTime: 45000 // 45 seconds
            },
            {
                name: 'End-to-End Integration Tests',
                file: './test-integration-end-to-end.js',
                description: 'Complete system integration testing',
                critical: true,
                estimatedTime: 60000 // 60 seconds
            },
            {
                name: 'Knowledge Extraction Tests',
                file: './test-knowledge-extraction.js',
                description: 'Knowledge extraction pattern recognition',
                critical: false,
                estimatedTime: 20000 // 20 seconds
            },
            {
                name: 'Memory Chatbot Tests',
                file: './test-memory-chatbot.js',
                description: 'Basic memory system functionality',
                critical: false,
                estimatedTime: 15000 // 15 seconds
            },
            {
                name: 'Database Tests',
                file: './test-database.js',
                description: 'Database connectivity and operations',
                critical: false,
                estimatedTime: 10000 // 10 seconds
            },
            {
                name: 'Connection Tests',
                file: './test-connection.js',
                description: 'Claude API connectivity',
                critical: false,
                estimatedTime: 5000 // 5 seconds
            }
        ];

        this.results = {
            totalTestSuites: this.testSuites.length,
            passedSuites: 0,
            failedSuites: 0,
            totalTests: 0,
            totalPassed: 0,
            totalFailed: 0,
            executionTime: 0,
            suiteResults: [],
            systemHealth: null,
            recommendations: []
        };

        this.startTime = null;
        this.logFile = `test-results-${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
    }

    async initialize() {
        try {
            console.log('🎯 Initializing Durandal Comprehensive Test Orchestrator');
            console.log('========================================================');

            // Check for required files
            const missingFiles = [];
            for (const suite of this.testSuites) {
                try {
                    await fs.access(suite.file);
                } catch (error) {
                    if (suite.critical) {
                        missingFiles.push(suite.file);
                    } else {
                        console.log(`⚠️ Optional test file missing: ${suite.file}`);
                    }
                }
            }

            if (missingFiles.length > 0) {
                throw new Error(`Critical test files missing: ${missingFiles.join(', ')}`);
            }

            // Check environment
            if (!process.env.CLAUDE_API_KEY) {
                throw new Error('CLAUDE_API_KEY environment variable is required');
            }

            // Initialize log file
            await this.initializeLogging();

            console.log('✅ Test Orchestrator initialized successfully');
            console.log(`📝 Logging to: ${this.logFile}`);
            console.log(`⏱️ Estimated total time: ${this.estimateTotalTime()} seconds\n`);

            return true;
        } catch (error) {
            console.error('❌ Test Orchestrator initialization failed:', error.message);
            return false;
        }
    }

    async initializeLogging() {
        const logHeader = `Durandal Comprehensive Test Suite
========================================
Start Time: ${new Date().toISOString()}
Node.js Version: ${process.version}
Platform: ${process.platform}
Working Directory: ${process.cwd()}

`;
        await fs.writeFile(this.logFile, logHeader);
    }

    async log(message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message}\n`;
        await fs.appendFile(this.logFile, logEntry);
    }

    estimateTotalTime() {
        return Math.round(this.testSuites.reduce((total, suite) => total + suite.estimatedTime, 0) / 1000);
    }

    async runTestSuite(suite) {
        console.log(`\n🧪 Running ${suite.name}...`);
        console.log(`📋 ${suite.description}`);
        console.log(`⏱️ Estimated time: ${suite.estimatedTime / 1000} seconds`);
        
        await this.log(`Starting test suite: ${suite.name}`);

        const startTime = Date.now();
        let suiteResult = {
            name: suite.name,
            file: suite.file,
            description: suite.description,
            critical: suite.critical,
            passed: false,
            executionTime: 0,
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            successRate: 0,
            details: [],
            error: null
        };

        try {
            // Dynamic import of test suite
            const TestSuite = require(suite.file);
            
            // Handle different test suite formats
            let testInstance;
            if (typeof TestSuite === 'function') {
                testInstance = new TestSuite();
            } else if (TestSuite.default && typeof TestSuite.default === 'function') {
                testInstance = new TestSuite.default();
            } else {
                throw new Error(`Invalid test suite format: ${suite.file}`);
            }

            // Initialize test suite
            if (testInstance.initialize) {
                const initialized = await testInstance.initialize();
                if (!initialized) {
                    throw new Error('Test suite initialization failed');
                }
            }

            // Run tests
            const results = await testInstance.runAllTests();
            
            // Update suite result
            suiteResult.passed = results.successRate >= 90; // 90% pass rate required
            suiteResult.totalTests = results.totalTests;
            suiteResult.passedTests = results.passedTests;
            suiteResult.failedTests = results.failedTests;
            suiteResult.successRate = results.successRate;
            suiteResult.details = results.details || [];

            // Cleanup
            if (testInstance.cleanup) {
                await testInstance.cleanup();
            }

            console.log(`✅ ${suite.name} completed`);
            console.log(`📊 Results: ${results.passedTests}/${results.totalTests} tests passed (${results.successRate}%)`);

        } catch (error) {
            suiteResult.error = error.message;
            console.log(`❌ ${suite.name} failed: ${error.message}`);
            await this.log(`Test suite failed: ${suite.name} - ${error.message}`);
        }

        suiteResult.executionTime = Date.now() - startTime;
        
        await this.log(`Completed test suite: ${suite.name} - ${suiteResult.passed ? 'PASSED' : 'FAILED'} (${suiteResult.executionTime}ms)`);
        
        return suiteResult;
    }

    async runAllTests() {
        console.log('🚀 Starting Comprehensive Test Suite Execution');
        console.log('===============================================');

        this.startTime = Date.now();

        // Run each test suite
        for (const suite of this.testSuites) {
            const suiteResult = await this.runTestSuite(suite);
            this.results.suiteResults.push(suiteResult);

            // Update overall results
            if (suiteResult.passed) {
                this.results.passedSuites++;
            } else {
                this.results.failedSuites++;
            }

            this.results.totalTests += suiteResult.totalTests;
            this.results.totalPassed += suiteResult.passedTests;
            this.results.totalFailed += suiteResult.failedTests;

            // Stop on critical failure
            if (!suiteResult.passed && suite.critical) {
                console.log(`\n🛑 Critical test suite failed: ${suite.name}`);
                await this.log(`CRITICAL FAILURE: ${suite.name} - stopping execution`);
                break;
            }
        }

        this.results.executionTime = Date.now() - this.startTime;

        // Generate comprehensive report
        await this.generateReport();

        return this.results;
    }

    async generateReport() {
        console.log('\n📊 Generating Comprehensive Test Report');
        console.log('======================================');

        // Calculate overall success rate
        const overallSuccessRate = this.results.totalTests > 0 ? 
            ((this.results.totalPassed / this.results.totalTests) * 100).toFixed(1) : 0;

        // Display summary
        console.log(`\n📋 Test Execution Summary:`);
        console.log(`Total Test Suites: ${this.results.totalTestSuites}`);
        console.log(`✅ Passed Suites: ${this.results.passedSuites}`);
        console.log(`❌ Failed Suites: ${this.results.failedSuites}`);
        console.log(`Total Individual Tests: ${this.results.totalTests}`);
        console.log(`✅ Passed Tests: ${this.results.totalPassed}`);
        console.log(`❌ Failed Tests: ${this.results.totalFailed}`);
        console.log(`📈 Overall Success Rate: ${overallSuccessRate}%`);
        console.log(`⏱️ Total Execution Time: ${(this.results.executionTime / 1000).toFixed(1)} seconds`);

        // Detailed suite results
        console.log(`\n📊 Detailed Suite Results:`);
        for (const suite of this.results.suiteResults) {
            const status = suite.passed ? '✅' : '❌';
            const critical = suite.critical ? '🔴' : '🟡';
            console.log(`${status} ${critical} ${suite.name}: ${suite.passedTests}/${suite.totalTests} (${suite.successRate}%) - ${(suite.executionTime / 1000).toFixed(1)}s`);
            
            if (!suite.passed && suite.error) {
                console.log(`    Error: ${suite.error}`);
            }
        }

        // Failed test details
        const failedTests = this.results.suiteResults
            .filter(suite => !suite.passed)
            .flatMap(suite => suite.details?.filter(test => !test.passed) || []);

        if (failedTests.length > 0) {
            console.log(`\n🔍 Failed Test Details:`);
            for (const test of failedTests) {
                console.log(`❌ ${test.name}: ${test.details}`);
            }
        }

        // Generate recommendations
        this.generateRecommendations();

        if (this.results.recommendations.length > 0) {
            console.log(`\n💡 Recommendations:`);
            for (const recommendation of this.results.recommendations) {
                console.log(`${recommendation.priority} ${recommendation.message}`);
            }
        }

        // System health check
        await this.performSystemHealthCheck();

        // Write detailed report to file
        await this.writeDetailedReport();

        // Overall assessment
        this.displayOverallAssessment();
    }

    generateRecommendations() {
        const recommendations = [];

        // Check critical failures
        const criticalFailures = this.results.suiteResults.filter(suite => 
            !suite.passed && suite.critical
        );

        if (criticalFailures.length > 0) {
            recommendations.push({
                priority: '🔴',
                message: `Critical systems failing: ${criticalFailures.map(s => s.name).join(', ')}. Do not deploy to production.`
            });
        }

        // Check overall success rate
        const overallRate = (this.results.totalPassed / this.results.totalTests) * 100;
        if (overallRate < 95) {
            recommendations.push({
                priority: '🟠',
                message: `Overall success rate (${overallRate.toFixed(1)}%) is below 95%. Review failing tests before deployment.`
            });
        }

        // Check performance
        const slowSuites = this.results.suiteResults.filter(suite => 
            suite.executionTime > suite.estimatedTime * 1.5
        );

        if (slowSuites.length > 0) {
            recommendations.push({
                priority: '🟡',
                message: `Performance issue: ${slowSuites.map(s => s.name).join(', ')} took longer than expected.`
            });
        }

        // Check RAMR specific issues
        const ramrSuite = this.results.suiteResults.find(suite => 
            suite.name.includes('RAMR')
        );

        if (ramrSuite && !ramrSuite.passed) {
            recommendations.push({
                priority: '🔴',
                message: 'RAMR caching system has issues. This will severely impact conversation quality.'
            });
        }

        // Check Context Management issues
        const contextSuite = this.results.suiteResults.find(suite => 
            suite.name.includes('Context Management')
        );

        if (contextSuite && !contextSuite.passed) {
            recommendations.push({
                priority: '🔴',
                message: 'Context Management system has issues. This will cause conversation fatigue.'
            });
        }

        // Positive recommendations
        if (overallRate >= 95 && criticalFailures.length === 0) {
            recommendations.push({
                priority: '🟢',
                message: 'All critical systems passing. System is ready for production deployment.'
            });
        }

        if (overallRate === 100) {
            recommendations.push({
                priority: '🎉',
                message: 'Perfect test score! Durandal is performing exceptionally well.'
            });
        }

        this.results.recommendations = recommendations;
    }

    async performSystemHealthCheck() {
        console.log(`\n🏥 System Health Check:`);

        const health = {
            nodeVersion: process.version,
            platform: process.platform,
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage(),
            uptime: process.uptime(),
            workingDirectory: process.cwd(),
            environmentVariables: {
                hasClaudeKey: !!process.env.CLAUDE_API_KEY,
                hasDbConfig: !!(process.env.DB_USER && process.env.DB_PASSWORD)
            }
        };

        console.log(`Node.js Version: ${health.nodeVersion}`);
        console.log(`Platform: ${health.platform}`);
        console.log(`Memory Usage: ${Math.round(health.memoryUsage.heapUsed / 1024 / 1024)}MB heap, ${Math.round(health.memoryUsage.rss / 1024 / 1024)}MB RSS`);
        console.log(`CPU Usage: ${health.cpuUsage.user}μs user, ${health.cpuUsage.system}μs system`);
        console.log(`Process Uptime: ${Math.round(health.uptime)} seconds`);
        console.log(`Working Directory: ${health.workingDirectory}`);
        console.log(`Environment: Claude API ${health.environmentVariables.hasClaudeKey ? '✅' : '❌'}, DB Config ${health.environmentVariables.hasDbConfig ? '✅' : '❌'}`);

        // Check for potential issues
        if (health.memoryUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
            console.log(`⚠️ High memory usage detected: ${Math.round(health.memoryUsage.heapUsed / 1024 / 1024)}MB`);
        }

        this.results.systemHealth = health;
    }

    async writeDetailedReport() {
        const report = `
DURANDAL COMPREHENSIVE TEST REPORT
==================================

Execution Summary:
- Test Suites: ${this.results.passedSuites}/${this.results.totalTestSuites} passed
- Individual Tests: ${this.results.totalPassed}/${this.results.totalTests} passed
- Success Rate: ${((this.results.totalPassed / this.results.totalTests) * 100).toFixed(1)}%
- Execution Time: ${(this.results.executionTime / 1000).toFixed(1)} seconds

Suite Details:
${this.results.suiteResults.map(suite => `
${suite.name}: ${suite.passed ? 'PASSED' : 'FAILED'}
- Tests: ${suite.passedTests}/${suite.totalTests} (${suite.successRate}%)
- Time: ${(suite.executionTime / 1000).toFixed(1)}s
- Critical: ${suite.critical ? 'Yes' : 'No'}
${suite.error ? `- Error: ${suite.error}` : ''}
`).join('')}

System Health:
- Node.js: ${this.results.systemHealth?.nodeVersion}
- Platform: ${this.results.systemHealth?.platform}
- Memory: ${Math.round(this.results.systemHealth?.memoryUsage.heapUsed / 1024 / 1024)}MB
- CPU: ${this.results.systemHealth?.cpuUsage.user}μs user

Recommendations:
${this.results.recommendations.map(rec => `${rec.priority} ${rec.message}`).join('\n')}

Failed Tests:
${this.results.suiteResults
    .filter(suite => !suite.passed)
    .flatMap(suite => suite.details?.filter(test => !test.passed) || [])
    .map(test => `- ${test.name}: ${test.details}`)
    .join('\n')}

End of Report
Generated: ${new Date().toISOString()}
`;

        await fs.appendFile(this.logFile, report);
        console.log(`\n📝 Detailed report written to: ${this.logFile}`);
    }

    displayOverallAssessment() {
        console.log(`\n🎯 Overall Assessment:`);
        console.log('====================');

        const overallRate = (this.results.totalPassed / this.results.totalTests) * 100;
        const criticalFailures = this.results.suiteResults.filter(suite => 
            !suite.passed && suite.critical
        ).length;

        if (criticalFailures > 0) {
            console.log('🔴 CRITICAL FAILURE - DO NOT DEPLOY');
            console.log('Critical systems are failing. Fix issues before proceeding.');
        } else if (overallRate >= 95) {
            console.log('🟢 READY FOR PRODUCTION');
            console.log('All critical systems passing. Durandal is ready for deployment.');
        } else if (overallRate >= 90) {
            console.log('🟡 MINOR ISSUES DETECTED');
            console.log('Non-critical issues present. Consider fixing before deployment.');
        } else {
            console.log('🔴 MULTIPLE FAILURES');
            console.log('Multiple test failures detected. Review and fix before deployment.');
        }

        console.log(`\n📊 Quality Score: ${overallRate.toFixed(1)}%`);
        console.log(`⏱️ Performance: ${(this.results.executionTime / 1000).toFixed(1)}s execution time`);
        console.log(`🛡️ Reliability: ${this.results.passedSuites}/${this.results.totalTestSuites} test suites passing`);
    }

    async cleanup() {
        console.log(`\n🧹 Cleaning up test environment...`);
        
        // Clean up any remaining test files
        const cleanupFiles = [
            './test-ramr.db',
            './test-integration-ramr.db',
            './test-corruption-ramr.db',
            './test-persistence-ramr.db'
        ];

        for (const file of cleanupFiles) {
            try {
                await fs.unlink(file);
                console.log(`🗑️ Cleaned up: ${file}`);
            } catch (error) {
                // File might not exist
            }
        }

        console.log('✅ Cleanup completed');
    }
}

// Main execution
async function main() {
    const orchestrator = new TestOrchestrator();
    
    try {
        const initialized = await orchestrator.initialize();
        if (!initialized) {
            console.error('❌ Failed to initialize test orchestrator');
            process.exit(1);
        }

        const results = await orchestrator.runAllTests();
        
        // Determine exit code based on results
        const criticalFailures = results.suiteResults.filter(suite => 
            !suite.passed && suite.critical
        ).length;

        const overallRate = (results.totalPassed / results.totalTests) * 100;

        if (criticalFailures > 0) {
            console.log('\n🔴 CRITICAL TEST FAILURES - EXITING WITH ERROR');
            process.exit(1);
        } else if (overallRate < 90) {
            console.log('\n🟡 MULTIPLE TEST FAILURES - REVIEW REQUIRED');
            process.exit(1);
        } else {
            console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY');
            process.exit(0);
        }
        
    } catch (error) {
        console.error('❌ Test orchestrator failed:', error.message);
        process.exit(1);
    } finally {
        await orchestrator.cleanup();
    }
}

// Export for programmatic use
module.exports = TestOrchestrator;

// Run if executed directly
if (require.main === module) {
    main();
}
