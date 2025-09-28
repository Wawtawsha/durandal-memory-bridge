#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Logger Component
 * Tests all logger features including levels, file rotation, MCP tool tracking
 */

const fs = require('fs');
const path = require('path');
const Logger = require('./logger');

class LoggerComprehensiveTest {
    constructor() {
        this.testResults = [];
        this.testDir = path.join(__dirname, 'test-logs');
        this.logFile = path.join(this.testDir, 'test.log');
        this.errorFile = path.join(this.testDir, 'error.log');
    }

    async runAllTests() {
        console.log('🧪 Logger Comprehensive Test Suite');
        console.log('=' . repeat(50));

        await this.setup();

        try {
            // Test 1: Log Level Configuration
            await this.testLogLevelConfiguration();

            // Test 2: Console Output Formatting
            await this.testConsoleOutputFormatting();

            // Test 3: File Logging
            await this.testFileLogging();

            // Test 4: Error Logging
            await this.testErrorLogging();

            // Test 5: MCP Tool Tracking
            await this.testMCPToolTracking();

            // Test 6: Verbose Mode
            await this.testVerboseMode();

            // Test 7: Debug Mode
            await this.testDebugMode();

            // Test 8: Log File Rotation
            await this.testLogFileRotation();

            // Test 9: System Information Logging
            await this.testSystemInfoLogging();

            // Test 10: Configuration Logging
            await this.testConfigurationLogging();

            // Test 11: Performance Under Load
            await this.testPerformanceUnderLoad();

            // Test 12: Concurrent Logging
            await this.testConcurrentLogging();

            // Print test summary
            this.printSummary();

        } finally {
            await this.cleanup();
        }

        return this.testResults.filter(r => !r.passed).length === 0;
    }

    async setup() {
        // Create test directory
        if (!fs.existsSync(this.testDir)) {
            fs.mkdirSync(this.testDir, { recursive: true });
        }

        // Clean up any existing test files
        const files = fs.readdirSync(this.testDir);
        for (const file of files) {
            fs.unlinkSync(path.join(this.testDir, file));
        }
    }

    async cleanup() {
        // Remove test directory
        if (fs.existsSync(this.testDir)) {
            const files = fs.readdirSync(this.testDir);
            for (const file of files) {
                fs.unlinkSync(path.join(this.testDir, file));
            }
            fs.rmdirSync(this.testDir);
        }
    }

    async runTest(name, testFn) {
        const startTime = Date.now();
        let passed = false;
        let error = null;

        try {
            await testFn();
            passed = true;
            console.log(`✅ ${name}`);
        } catch (err) {
            error = err.message;
            console.log(`❌ ${name}: ${error}`);
        }

        this.testResults.push({
            name,
            passed,
            error,
            duration: Date.now() - startTime
        });
    }

    // Test 1: Log Level Configuration
    async testLogLevelConfiguration() {
        await this.runTest('Log Level Configuration', async () => {
            // Test default levels (console=warn, file=info)
            let logger = new Logger();
            if (logger.getConsoleLevel() !== 'warn') {
                throw new Error('Default console level should be warn');
            }
            if (logger.getFileLevel() !== 'info') {
                throw new Error('Default file level should be info');
            }

            // Test environment variable
            process.env.CONSOLE_LOG_LEVEL = 'debug';
            process.env.FILE_LOG_LEVEL = 'error';
            logger = new Logger();
            if (logger.getConsoleLevel() !== 'debug') {
                throw new Error('Should respect CONSOLE_LOG_LEVEL env var');
            }
            if (logger.getFileLevel() !== 'error') {
                throw new Error('Should respect FILE_LOG_LEVEL env var');
            }
            delete process.env.CONSOLE_LOG_LEVEL;
            delete process.env.FILE_LOG_LEVEL;

            // Test options override
            logger = new Logger({ consoleLevel: 'error', fileLevel: 'warn' });
            if (logger.getConsoleLevel() !== 'error') {
                throw new Error('Should respect options.consoleLevel');
            }
            if (logger.getFileLevel() !== 'warn') {
                throw new Error('Should respect options.fileLevel');
            }

            // Test invalid level defaults to warn/info
            logger = new Logger({ consoleLevel: 'invalid', fileLevel: 'invalid' });
            if (logger.getConsoleLevel() !== 'warn') {
                throw new Error('Invalid console level should default to warn');
            }
            if (logger.getFileLevel() !== 'info') {
                throw new Error('Invalid file level should default to info');
            }
        });
    }

    // Test 2: Console Output Formatting
    async testConsoleOutputFormatting() {
        await this.runTest('Console Output Formatting', async () => {
            const logger = new Logger({ consoleLevel: 'debug', fileLevel: 'debug' });

            // Capture console output
            const originalLog = console.log;
            const originalError = console.error;
            let capturedOutput = [];

            console.log = (...args) => capturedOutput.push(args.join(' '));
            console.error = (...args) => capturedOutput.push(args.join(' '));

            try {
                logger.debug('Debug message');
                logger.info('Info message');
                logger.warn('Warning message');
                logger.error('Error message');

                if (capturedOutput.length !== 4) {
                    throw new Error('Should log all 4 messages');
                }

                // Check that output is formatted (contains emojis or level indicators)
                const allOutput = capturedOutput.join(' ');
                if (!allOutput.includes('Debug message') || !allOutput.includes('Error message')) {
                    throw new Error('Output should include log messages');
                }
            } finally {
                console.log = originalLog;
                console.error = originalError;
            }
        });
    }

    // Test 3: File Logging
    async testFileLogging() {
        await this.runTest('File Logging', async () => {
            const logger = new Logger({
                consoleLevel: 'error',
                fileLevel: 'info',
                logFile: this.logFile
            });

            logger.info('Test message 1');
            logger.warn('Test message 2');
            logger.error('Test message 3');

            // Wait for writes to complete
            await new Promise(resolve => setTimeout(resolve, 100));
            logger.close();

            // Check file exists and has content
            if (!fs.existsSync(this.logFile)) {
                throw new Error('Log file should be created');
            }

            const content = fs.readFileSync(this.logFile, 'utf8');
            const lines = content.trim().split('\n').filter(line => line.trim());

            // Should have at least 4 lines (session start + 3 messages)
            if (lines.length < 4) {
                throw new Error(`Expected at least 4 log lines, got ${lines.length}`);
            }

            // Verify JSON Lines format
            for (const line of lines) {
                const entry = JSON.parse(line);
                if (!entry.timestamp || !entry.level || !entry.message) {
                    throw new Error('Log entry missing required fields');
                }
            }
        });
    }

    // Test 4: Error Logging
    async testErrorLogging() {
        await this.runTest('Error Logging', async () => {
            const logger = new Logger({
                level: 'debug',
                errorLogFile: this.errorFile
            });

            logger.info('Info message');
            logger.error('Error message 1');
            logger.error('Error message 2');

            // Wait for writes
            await new Promise(resolve => setTimeout(resolve, 100));

            if (!fs.existsSync(this.errorFile)) {
                throw new Error('Error log file should be created');
            }

            const content = fs.readFileSync(this.errorFile, 'utf8');
            const lines = content.trim().split('\n');

            // Should only have error messages
            if (lines.length !== 2) {
                throw new Error(`Expected 2 error lines, got ${lines.length}`);
            }

            for (const line of lines) {
                const entry = JSON.parse(line);
                if (entry.level !== 'error') {
                    throw new Error('Error file should only contain errors');
                }
            }

            logger.close();
        });
    }

    // Test 5: MCP Tool Tracking
    async testMCPToolTracking() {
        await this.runTest('MCP Tool Tracking', async () => {
            const logger = new Logger({ logMCPTools: true });

            // Test start and end tracking
            const requestId = logger.startMCPTool('store_memory', {
                content: 'Test content',
                metadata: { importance: 0.8 }
            });

            if (!requestId) {
                throw new Error('Should return request ID');
            }

            if (logger.activeRequests.size !== 1) {
                throw new Error('Should track active request');
            }

            // Simulate successful completion
            logger.endMCPTool(requestId, true, { id: 123 });

            if (logger.activeRequests.size !== 0) {
                throw new Error('Should clear completed request');
            }

            // Test failure tracking
            const failId = logger.startMCPTool('search_memories', { query: 'test' });
            logger.endMCPTool(failId, false, null, new Error('Search failed'));
        });
    }

    // Test 6: Verbose Mode
    async testVerboseMode() {
        await this.runTest('Verbose Mode', async () => {
            const logger = new Logger({ verbose: true, logMCPTools: true, consoleLevel: 'info' });

            // Capture output
            const originalLog = console.log;
            let capturedOutput = [];
            console.log = (...args) => capturedOutput.push(args.join(' '));

            try {
                const metadata = { key1: 'value1', key2: { nested: true } };
                logger.info('Test message', metadata);

                // In verbose mode, should show full metadata
                const output = capturedOutput.join(' ');
                if (!output.includes('nested')) {
                    throw new Error('Verbose mode should show nested metadata');
                }

                // Test MCP tool verbose output
                capturedOutput = [];
                const id = logger.startMCPTool('test_tool', {
                    content: 'long content here',
                    metadata: { test: true }
                });

                const toolOutput = capturedOutput.join(' ');
                if (!toolOutput.includes('content') && !toolOutput.includes('test_tool')) {
                    throw new Error('Verbose mode should show tool info');
                }

                logger.endMCPTool(id, true, { result: 'success' });
            } finally {
                console.log = originalLog;
            }
        });
    }

    // Test 7: Debug Mode
    async testDebugMode() {
        await this.runTest('Debug Mode', async () => {
            // Test debug disabled (both console and file levels high)
            let logger = new Logger({ debug: false, consoleLevel: 'error', fileLevel: 'error' });

            const originalLog = console.log;
            let capturedOutput = [];
            console.log = (...args) => capturedOutput.push(args.join(' '));

            try {
                logger.debug('Debug message');
                if (capturedOutput.length !== 0) {
                    throw new Error('Should not log debug when disabled');
                }

                // Test debug enabled
                capturedOutput = [];
                logger = new Logger({ debug: true, consoleLevel: 'debug' });
                logger.debug('Debug message', { detail: 'test' });

                if (capturedOutput.length === 0) {
                    throw new Error('Should log debug when enabled');
                }
            } finally {
                console.log = originalLog;
            }
        });
    }

    // Test 8: Log File Rotation
    async testLogFileRotation() {
        await this.runTest('Log File Rotation', async () => {
            const rotateFile = path.join(this.testDir, 'rotate.log');

            // Create a large file to trigger rotation
            const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
            fs.writeFileSync(rotateFile, largeContent);

            const logger = new Logger({ logFile: rotateFile });

            // This should trigger rotation
            logger.info('New message after rotation');

            // Wait for rotation
            await new Promise(resolve => setTimeout(resolve, 100));

            // Check that rotation occurred
            const files = fs.readdirSync(this.testDir);
            const rotatedFiles = files.filter(f => f.includes('rotate') && f.includes('.log'));

            if (rotatedFiles.length < 2) {
                throw new Error('Should have rotated the log file');
            }

            logger.close();
        });
    }

    // Test 9: System Information Logging
    async testSystemInfoLogging() {
        await this.runTest('System Information Logging', async () => {
            const logger = new Logger({ level: 'info' });

            const originalLog = console.log;
            let capturedOutput = [];
            console.log = (...args) => capturedOutput.push(args.join(' '));

            try {
                logger.logSystemInfo();

                const output = capturedOutput[0];
                if (!output.includes('nodeVersion')) {
                    throw new Error('Should log Node.js version');
                }
                if (!output.includes('platform')) {
                    throw new Error('Should log platform');
                }
                if (!output.includes('memory')) {
                    throw new Error('Should log memory usage');
                }
            } finally {
                console.log = originalLog;
            }
        });
    }

    // Test 10: Configuration Logging
    async testConfigurationLogging() {
        await this.runTest('Configuration Logging', async () => {
            const logger = new Logger({ consoleLevel: 'info', fileLevel: 'info', verbose: true, debug: true });

            const originalLog = console.log;
            let capturedOutput = [];
            console.log = (...args) => capturedOutput.push(args.join(' '));

            try {
                logger.logConfiguration({
                    customOption: 'test',
                    port: 3000
                });

                const output = capturedOutput.join(' ');
                if (!output.includes('consoleLogLevel') && !output.includes('Log')) {
                    throw new Error('Should log current log levels');
                }
                if (!output.includes('verbose')) {
                    throw new Error('Should log verbose setting');
                }
                if (!output.includes('customOption')) {
                    throw new Error('Should include custom config');
                }
            } finally {
                console.log = originalLog;
            }
        });
    }

    // Test 11: Performance Under Load
    async testPerformanceUnderLoad() {
        await this.runTest('Performance Under Load', async () => {
            const logger = new Logger({
                level: 'debug',
                logFile: this.logFile
            });

            const startTime = Date.now();
            const iterations = 1000;

            // Log many messages rapidly
            for (let i = 0; i < iterations; i++) {
                logger.info(`Performance test message ${i}`, {
                    index: i,
                    timestamp: Date.now()
                });
            }

            const duration = Date.now() - startTime;
            const messagesPerSecond = (iterations / duration) * 1000;

            console.log(`  Performance: ${Math.round(messagesPerSecond)} messages/second`);

            if (messagesPerSecond < 100) {
                throw new Error(`Performance too low: ${messagesPerSecond} msg/s`);
            }

            logger.close();
        });
    }

    // Test 12: Concurrent Logging
    async testConcurrentLogging() {
        await this.runTest('Concurrent Logging', async () => {
            const logger = new Logger({
                level: 'debug',
                logFile: this.logFile,
                logMCPTools: true
            });

            // Start multiple concurrent operations
            const promises = [];
            const toolCount = 10;

            for (let i = 0; i < toolCount; i++) {
                promises.push((async () => {
                    const id = logger.startMCPTool(`tool_${i}`, { index: i });
                    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
                    logger.endMCPTool(id, true, { result: `success_${i}` });
                })());
            }

            await Promise.all(promises);

            // Verify all operations completed
            if (logger.activeRequests.size !== 0) {
                throw new Error('All concurrent requests should be completed');
            }

            logger.close();
        });
    }

    printSummary() {
        console.log('\n' + '=' . repeat(50));
        console.log('📊 Test Summary');
        console.log('=' . repeat(50));

        const total = this.testResults.length;
        const passed = this.testResults.filter(r => r.passed).length;
        const failed = total - passed;
        const totalTime = this.testResults.reduce((sum, r) => sum + r.duration, 0);

        console.log(`Total Tests: ${total}`);
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`⏱️  Total Time: ${totalTime}ms`);

        if (failed > 0) {
            console.log('\nFailed Tests:');
            this.testResults
                .filter(r => !r.passed)
                .forEach(r => {
                    console.log(`  - ${r.name}: ${r.error}`);
                });
        }

        const successRate = (passed / total) * 100;
        console.log(`\nSuccess Rate: ${successRate.toFixed(1)}%`);

        if (successRate === 100) {
            console.log('🎉 All tests passed!');
        } else if (successRate >= 80) {
            console.log('✅ Good test coverage');
        } else {
            console.log('⚠️  Needs improvement');
        }
    }
}

// Run tests if executed directly
if (require.main === module) {
    const tester = new LoggerComprehensiveTest();
    tester.runAllTests()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test suite failed:', error);
            process.exit(1);
        });
}

module.exports = LoggerComprehensiveTest;