#!/usr/bin/env node

// Comprehensive Test Runner for Durandal System
// Execute all test suites with proper setup and teardown

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class DurandalTestRunner {
    constructor() {
        // Load environment variables from .env file FIRST
        try {
            require('dotenv').config();
        } catch (error) {
            console.log('⚠️ Could not load .env file, using system environment variables');
        }
        
        this.testEnvironment = {
            nodeVersion: process.version,
            platform: process.platform,
            workingDirectory: process.cwd(),
            startTime: new Date(),
            testMode: process.argv.includes('--quick') ? 'quick' : 'comprehensive'
        };
        
        this.requiredFiles = [
            'durandal.js',
            'ramr.js',
            'context-manager.js',
            'knowledge-analyzer.js',
            'db-client.js',
            'claude-client.js',
            'test-orchestrator.js'
        ];
        
        this.quickTests = [
            'test-connection.js',
            'test-database.js',
            'test-memory-chatbot.js'
        ];
        
        this.comprehensiveTests = [
            'test-ramr-comprehensive.js',
            'test-context-management-advanced.js',
            'test-integration-end-to-end.js'
        ];
    }

    async initialize() {
        console.log('🚀 Durandal Comprehensive Test Runner');
        console.log('=====================================');
        console.log(`Mode: ${this.testEnvironment.testMode.toUpperCase()}`);
        console.log(`Node.js: ${this.testEnvironment.nodeVersion}`);
        console.log(`Platform: ${this.testEnvironment.platform}`);
        console.log(`Directory: ${this.testEnvironment.workingDirectory}`);
        console.log(`Start Time: ${this.testEnvironment.startTime.toISOString()}\n`);

        // Check environment
        return await this.checkEnvironment();
    }

    async checkEnvironment() {
        console.log('🔍 Checking Test Environment...');
        
        try {
            // Check Node.js version
            const nodeVersion = process.version;
            const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
            if (majorVersion < 18) {
                throw new Error(`Node.js version ${nodeVersion} is too old. Requires Node.js 18+`);
            }
            console.log(`✅ Node.js version: ${nodeVersion}`);

            // Check required files
            const missingFiles = [];
            for (const file of this.requiredFiles) {
                try {
                    await fs.access(file);
                    console.log(`✅ Found: ${file}`);
                } catch (error) {
                    missingFiles.push(file);
                    console.log(`❌ Missing: ${file}`);
                }
            }

            if (missingFiles.length > 0) {
                throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
            }

            // Check environment variables
            const requiredEnvVars = ['CLAUDE_API_KEY'];
            const missingEnvVars = [];
            
            for (const envVar of requiredEnvVars) {
                if (!process.env[envVar]) {
                    missingEnvVars.push(envVar);
                    console.log(`❌ Missing environment variable: ${envVar}`);
                } else {
                    const keyPreview = process.env[envVar].substring(0, 15) + '...';
                    console.log(`✅ Environment variable: ${envVar} (${keyPreview})`);
                }
            }

            // Check for .env file specifically
            try {
                await fs.access('.env');
                console.log('✅ Found .env file');
            } catch (error) {
                console.log('⚠️ .env file not found - using system environment variables');
            }

            if (missingEnvVars.length > 0) {
                console.log('\n🔧 Environment Variable Setup:');
                console.log('Option 1: Set in .env file (recommended):');
                console.log('  echo "CLAUDE_API_KEY=your_key_here" >> .env');
                console.log('Option 2: Set as system environment variable:');
                console.log('  export CLAUDE_API_KEY="your_key_here"');
                throw new Error(`Missing environment variables: ${missingEnvVars.join(', ')}`);
            }

            // Check npm dependencies
            try {
                const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
                const dependencies = {...packageJson.dependencies, ...packageJson.devDependencies};
                
                console.log('📦 Checking dependencies...');
                for (const dep of ['axios', 'dotenv', 'pg', 'sqlite3', 'sqlite']) {
                    if (dependencies[dep]) {
                        console.log(`✅ Dependency: ${dep}@${dependencies[dep]}`);
                    } else {
                        console.log(`⚠️ Optional dependency missing: ${dep}`);
                    }
                }
            } catch (error) {
                console.log('⚠️ Could not check package.json dependencies');
            }

            // Check database connectivity
            console.log('🔍 Testing database connectivity...');
            try {
                const ClaudeMemoryDB = require('./db-client');
                const db = new ClaudeMemoryDB();
                const dbTest = await db.testConnection();
                await db.close();
                
                if (dbTest.success) {
                    console.log('✅ Database connection: OK');
                } else {
                    console.log(`❌ Database connection failed: ${dbTest.error}`);
                    throw new Error(`Database connectivity issue: ${dbTest.error}`);
                }
            } catch (error) {
                console.log(`❌ Database test failed: ${error.message}`);
                throw new Error(`Database test failed: ${error.message}`);
            }

            // Check Claude API connectivity
            console.log('🔍 Testing Claude API connectivity...');
            try {
                const ClaudeClient = require('./claude-client');
                const claude = new ClaudeClient();
                const claudeTest = await claude.testConnection();
                
                if (claudeTest.success) {
                    console.log('✅ Claude API connection: OK');
                } else {
                    console.log(`❌ Claude API connection failed: ${claudeTest.error}`);
                    throw new Error(`Claude API connectivity issue: ${claudeTest.error}`);
                }
            } catch (error) {
                console.log(`❌ Claude API test failed: ${error.message}`);
                throw new Error(`Claude API test failed: ${error.message}`);
            }

            console.log('\n✅ Environment check completed successfully\n');
            return true;

        } catch (error) {
            console.error('\n❌ Environment check failed:', error.message);
            console.log('\n🔧 Setup Instructions:');
            console.log('1. Ensure Node.js 18+ is installed ✅');
            console.log('2. Install dependencies: npm install');
            console.log('3. Create/update .env file with: CLAUDE_API_KEY=your_key_here');
            console.log('4. Ensure PostgreSQL is running: sudo systemctl status postgresql');
            console.log('5. Test basic connectivity: npm run test');
            console.log('\n📝 Your .env file should contain:');
            console.log('CLAUDE_API_KEY=sk-ant-api03-your-actual-key-here');
            console.log('DB_USER=claude_user');
            console.log('DB_PASSWORD=your_db_password');
            console.log('DB_HOST=localhost');
            console.log('DB_NAME=claude_memory');
            console.log('DB_PORT=5432');
            return false;
        }
    }

    async runQuickTests() {
        console.log('⚡ Running Quick Test Suite...');
        console.log('This will run basic connectivity and functionality tests.\n');

        let allPassed = true;
        const results = [];

        for (const testFile of this.quickTests) {
            console.log(`🧪 Running ${testFile}...`);
            
            try {
                if (testFile === 'test-connection.js') {
                    // This is a simple connection test
                    const ClaudeClient = require('./claude-client');
                    const claude = new ClaudeClient();
                    const result = await claude.testConnection();
                    
                    if (result.success) {
                        console.log('✅ Claude API connection test passed');
                        results.push({ name: 'Claude API Connection', passed: true });
                    } else {
                        console.log(`❌ Claude API connection test failed: ${result.error}`);
                        results.push({ name: 'Claude API Connection', passed: false, error: result.error });
                        allPassed = false;
                    }
                } else if (testFile === 'test-database.js') {
                    // Database connectivity test
                    const ClaudeMemoryDB = require('./db-client');
                    const db = new ClaudeMemoryDB();
                    const result = await db.testConnection();
                    await db.close();
                    
                    if (result.success) {
                        console.log('✅ Database connection test passed');
                        results.push({ name: 'Database Connection', passed: true });
                    } else {
                        console.log(`❌ Database connection test failed: ${result.error}`);
                        results.push({ name: 'Database Connection', passed: false, error: result.error });
                        allPassed = false;
                    }
                } else {
                    // Try to run the test file as a script
                    console.log(`  Running ${testFile} as script...`);
                    
                    const testProcess = await new Promise((resolve, reject) => {
                        const child = spawn('node', [testFile], {
                            stdio: 'pipe',
                            cwd: process.cwd()
                        });
                        
                        let output = '';
                        let errorOutput = '';
                        
                        child.stdout.on('data', (data) => {
                            output += data.toString();
                        });
                        
                        child.stderr.on('data', (data) => {
                            errorOutput += data.toString();
                        });
                        
                        child.on('close', (code) => {
                            resolve({ code, output, errorOutput });
                        });
                        
                        child.on('error', (error) => {
                            reject(error);
                        });
                    });
                    
                    if (testProcess.code === 0) {
                        console.log(`✅ ${testFile} passed`);
                        results.push({ name: testFile, passed: true });
                    } else {
                        console.log(`❌ ${testFile} failed (exit code: ${testProcess.code})`);
                        results.push({ 
                            name: testFile, 
                            passed: false, 
                            error: testProcess.errorOutput || 'Test script failed'
                        });
                        allPassed = false;
                    }
                }
            } catch (error) {
                console.log(`❌ ${testFile} failed: ${error.message}`);
                results.push({ name: testFile, passed: false, error: error.message });
                allPassed = false;
            }
        }

        console.log(`\n📊 Quick Test Results:`);
        console.log(`${results.filter(r => r.passed).length}/${results.length} tests passed`);
        
        return { passed: allPassed, results };
    }

    async runComprehensiveTests() {
        console.log('🔬 Running Comprehensive Test Suite...');
        console.log('This will run all advanced tests including RAMR, Context Management, and Integration tests.\n');

        try {
            const TestOrchestrator = require('./test-orchestrator');
            const orchestrator = new TestOrchestrator();
            
            const initialized = await orchestrator.initialize();
            if (!initialized) {
                throw new Error('Failed to initialize test orchestrator');
            }

            const results = await orchestrator.runAllTests();
            await orchestrator.cleanup();

            return results;

        } catch (error) {
            console.error('❌ Comprehensive test execution failed:', error.message);
            return { passed: false, error: error.message };
        }
    }

    async generateFinalReport(quickResults, comprehensiveResults) {
        console.log('\n📋 Final Test Report');
        console.log('===================');

        const reportData = {
            environment: this.testEnvironment,
            quickTests: quickResults,
            comprehensiveTests: comprehensiveResults,
            summary: {
                allTestsPassed: false,
                readyForProduction: false,
                criticalIssues: [],
                recommendations: []
            }
        };

        // Analyze results
        const quickPassed = quickResults ? quickResults.passed : false;
        const comprehensivePassed = comprehensiveResults ? 
            (comprehensiveResults.failedSuites === 0 && comprehensiveResults.totalPassed / comprehensiveResults.totalTests >= 0.9) : false;

        reportData.summary.allTestsPassed = quickPassed && comprehensivePassed;

        // Generate recommendations
        if (!quickPassed) {
            reportData.summary.criticalIssues.push('Basic connectivity tests failed');
            reportData.summary.recommendations.push('Fix basic connectivity issues before proceeding');
        }

        if (comprehensiveResults && comprehensiveResults.failedSuites > 0) {
            reportData.summary.criticalIssues.push(`${comprehensiveResults.failedSuites} test suites failed`);
            reportData.summary.recommendations.push('Review and fix failing test suites');
        }

        if (reportData.summary.allTestsPassed) {
            reportData.summary.readyForProduction = true;
            reportData.summary.recommendations.push('System is ready for production deployment');
        }

        // Display report
        console.log(`Environment: ${reportData.environment.nodeVersion} on ${reportData.environment.platform}`);
        console.log(`Test Mode: ${reportData.environment.testMode}`);
        
        if (quickResults) {
            console.log(`Quick Tests: ${quickResults.results.filter(r => r.passed).length}/${quickResults.results.length} passed`);
        }
        
        if (comprehensiveResults) {
            console.log(`Comprehensive Tests: ${comprehensiveResults.passedSuites}/${comprehensiveResults.totalTestSuites} suites passed`);
            console.log(`Individual Tests: ${comprehensiveResults.totalPassed}/${comprehensiveResults.totalTests} passed`);
        }

        if (reportData.summary.criticalIssues.length > 0) {
            console.log('\n🔴 Critical Issues:');
            reportData.summary.criticalIssues.forEach(issue => console.log(`- ${issue}`));
        }

        if (reportData.summary.recommendations.length > 0) {
            console.log('\n💡 Recommendations:');
            reportData.summary.recommendations.forEach(rec => console.log(`- ${rec}`));
        }

        // Overall assessment
        if (reportData.summary.readyForProduction) {
            console.log('\n🎉 READY FOR PRODUCTION');
            console.log('All tests passed. Durandal system is ready for deployment.');
        } else {
            console.log('\n⚠️ NOT READY FOR PRODUCTION');
            console.log('Issues detected. Review and fix before deployment.');
        }

        // Save report to file
        const reportFile = `test-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        await fs.writeFile(reportFile, JSON.stringify(reportData, null, 2));
        console.log(`\n📄 Detailed report saved to: ${reportFile}`);

        return reportData;
    }

    async run() {
        try {
            const initialized = await this.initialize();
            if (!initialized) {
                process.exit(1);
            }

            let quickResults = null;
            let comprehensiveResults = null;

            // Always run quick tests first
            console.log('🚀 Starting test execution...\n');
            quickResults = await this.runQuickTests();

            if (!quickResults.passed) {
                console.log('\n❌ Quick tests failed. Skipping comprehensive tests.');
                console.log('Fix basic connectivity issues before running comprehensive tests.');
            } else if (this.testEnvironment.testMode === 'comprehensive') {
                console.log('\n✅ Quick tests passed. Proceeding with comprehensive tests...');
                comprehensiveResults = await this.runComprehensiveTests();
            } else {
                console.log('\n✅ Quick tests passed. Use --comprehensive flag for full test suite.');
            }

            // Generate final report
            const report = await this.generateFinalReport(quickResults, comprehensiveResults);

            // Exit with appropriate code
            if (report.summary.readyForProduction) {
                process.exit(0);
            } else {
                process.exit(1);
            }

        } catch (error) {
            console.error('❌ Test runner failed:', error.message);
            process.exit(1);
        }
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const isQuick = args.includes('--quick');
const isComprehensive = args.includes('--comprehensive') || (!isQuick && args.length === 0);

// Update test mode based on arguments
if (isComprehensive) {
    process.argv.push('--comprehensive');
} else if (isQuick) {
    process.argv.push('--quick');
}

// Show help if requested
if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Durandal Comprehensive Test Runner
=================================

Usage: node run-comprehensive-tests.js [options]

Options:
  --quick          Run only quick connectivity tests
  --comprehensive  Run full test suite (default)
  --help, -h       Show this help message

Examples:
  node run-comprehensive-tests.js                    # Run comprehensive tests
  node run-comprehensive-tests.js --quick           # Run quick tests only
  node run-comprehensive-tests.js --comprehensive   # Run comprehensive tests

The test runner will:
1. Check environment and dependencies
2. Run connectivity tests (Claude API, Database)
3. Run comprehensive system tests (if enabled)
4. Generate detailed report
5. Provide production readiness assessment
`);
    process.exit(0);
}

// Run the test runner
const runner = new DurandalTestRunner();
runner.run();
