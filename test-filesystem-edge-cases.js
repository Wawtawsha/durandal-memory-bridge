/**
 * Integration Test 3: File System Edge Cases
 *
 * Tests error handling and edge cases:
 * - Invalid log levels
 * - Corrupted log files
 * - Disk space issues (simulated)
 * - Concurrent access
 * - Log rotation
 */

const fs = require('fs');
const path = require('path');
const Logger = require('./logger');

class EdgeCaseTest {
    constructor() {
        this.passed = 0;
        this.failed = 0;
        this.testLogDir = path.join(__dirname, '.test-edge-cases');
    }

    async runTest(name, testFn) {
        process.stdout.write(`  ${name}... `);
        const startTime = Date.now();

        try {
            await testFn();
            const duration = Date.now() - startTime;
            console.log(`✅ (${duration}ms)`);
            this.passed++;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.log(`❌ (${duration}ms)`);
            console.log(`    Error: ${error.message}`);
            if (error.details) {
                console.log(`    Details: ${error.details}`);
            }
            this.failed++;
        }
    }

    setupTestEnvironment() {
        if (fs.existsSync(this.testLogDir)) {
            fs.rmSync(this.testLogDir, { recursive: true });
        }
        fs.mkdirSync(this.testLogDir, { recursive: true });
    }

    cleanupTestEnvironment() {
        if (fs.existsSync(this.testLogDir)) {
            fs.rmSync(this.testLogDir, { recursive: true });
        }
    }

    async runAllTests() {
        console.log('\n🧪 Integration Test 3: File System Edge Cases\n');
        console.log('='.repeat(70));

        this.setupTestEnvironment();

        try {
            await this.runTest('Invalid console log level defaults to warn', async () => {
                const testLogFile = path.join(this.testLogDir, 'invalid-console.log');
                const logger = new Logger({
                    consoleLevel: 'invalid_level',
                    logFile: testLogFile
                });

                if (logger.getConsoleLevel() !== 'warn') {
                    throw new Error(`Expected warn, got ${logger.getConsoleLevel()}`);
                }
            });

            await this.runTest('Invalid file log level defaults to info', async () => {
                const testLogFile = path.join(this.testLogDir, 'invalid-file.log');
                const logger = new Logger({
                    fileLevel: 'not_a_level',
                    logFile: testLogFile
                });

                if (logger.getFileLevel() !== 'info') {
                    throw new Error(`Expected info, got ${logger.getFileLevel()}`);
                }
            });

            await this.runTest('setConsoleLevel rejects invalid levels', async () => {
                const testLogFile = path.join(this.testLogDir, 'set-invalid-console.log');
                const logger = new Logger({ logFile: testLogFile });

                const result = logger.setConsoleLevel('not_valid');

                if (result !== false) {
                    throw new Error('setConsoleLevel should return false for invalid level');
                }

                if (logger.getConsoleLevel() !== 'warn') {
                    throw new Error('Console level should remain unchanged after invalid set');
                }
            });

            await this.runTest('setFileLevel rejects invalid levels', async () => {
                const testLogFile = path.join(this.testLogDir, 'set-invalid-file.log');
                const logger = new Logger({ logFile: testLogFile });

                const result = logger.setFileLevel('invalid');

                if (result !== false) {
                    throw new Error('setFileLevel should return false for invalid level');
                }

                if (logger.getFileLevel() !== 'info') {
                    throw new Error('File level should remain unchanged after invalid set');
                }
            });

            await this.runTest('Logger handles non-existent log directory', async () => {
                const deepPath = path.join(this.testLogDir, 'a', 'b', 'c', 'test.log');
                const logger = new Logger({ logFile: deepPath });

                logger.info('Test message');

                await new Promise(resolve => setTimeout(resolve, 50));
                logger.close();

                if (!fs.existsSync(deepPath)) {
                    throw new Error('Logger did not create nested directories');
                }

                const content = fs.readFileSync(deepPath, 'utf8');
                if (!content.includes('Test message')) {
                    throw new Error('Log message not written to file');
                }
            });

            await this.runTest('Logger handles corrupted log file gracefully', async () => {
                const testLogFile = path.join(this.testLogDir, 'corrupted.log');

                fs.writeFileSync(testLogFile, 'NOT_JSON_AT_ALL\n{broken json\n', 'utf8');

                const logger = new Logger({ logFile: testLogFile });
                logger.info('New message after corruption');

                await new Promise(resolve => setTimeout(resolve, 50));
                logger.close();

                const content = fs.readFileSync(testLogFile, 'utf8');
                const lines = content.split('\n').filter(line => line.trim());

                let foundMessage = false;
                for (const line of lines) {
                    try {
                        const parsed = JSON.parse(line);
                        if (parsed.message === 'New message after corruption') {
                            foundMessage = true;
                            break;
                        }
                    } catch (e) {
                    }
                }

                if (!foundMessage) {
                    throw new Error('Logger did not append new message after corruption');
                }
            });

            await this.runTest('Log rotation triggers at 10MB threshold', async () => {
                const testLogFile = path.join(this.testLogDir, 'rotation-test.log');

                const largeData = 'x'.repeat(1024);
                let content = '';
                for (let i = 0; i < 11000; i++) {
                    content += JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', message: largeData }) + '\n';
                }

                fs.writeFileSync(testLogFile, content, 'utf8');

                const logger = new Logger({ logFile: testLogFile });
                logger.info('After rotation');

                await new Promise(resolve => setTimeout(resolve, 50));
                logger.close();

                const files = fs.readdirSync(this.testLogDir);
                const rotatedFiles = files.filter(f => f.startsWith('rotation-test-') && f.endsWith('.log'));

                if (rotatedFiles.length === 0) {
                    throw new Error('Log file was not rotated despite exceeding 10MB');
                }
            });

            await this.runTest('Multiple logger instances can write to same file', async () => {
                const testLogFile = path.join(this.testLogDir, 'concurrent.log');

                const logger1 = new Logger({ logFile: testLogFile });
                const logger2 = new Logger({ logFile: testLogFile });

                logger1.info('Message from logger 1');
                logger2.info('Message from logger 2');

                await new Promise(resolve => setTimeout(resolve, 50));

                logger1.close();
                logger2.close();

                const content = fs.readFileSync(testLogFile, 'utf8');

                if (!content.includes('Message from logger 1')) {
                    throw new Error('Logger 1 message not found');
                }

                if (!content.includes('Message from logger 2')) {
                    throw new Error('Logger 2 message not found');
                }
            });

            await this.runTest('Logger handles write stream errors gracefully', async () => {
                const testLogFile = path.join(this.testLogDir, 'readonly.log');

                fs.writeFileSync(testLogFile, '', 'utf8');

                if (process.platform !== 'win32') {
                    fs.chmodSync(testLogFile, 0o444);

                    let errorThrown = false;
                    let logger;
                    try {
                        logger = new Logger({ logFile: testLogFile });
                        logger.info('Should not crash');

                        await new Promise(resolve => setTimeout(resolve, 100));
                    } catch (error) {
                        errorThrown = true;
                    } finally {
                        if (logger) logger.close();
                        fs.chmodSync(testLogFile, 0o644);
                    }

                    if (errorThrown) {
                        throw new Error('Logger should handle write errors gracefully, not throw');
                    }
                } else {
                    if (!fs.existsSync(testLogFile)) {
                        throw new Error('Test file was not created');
                    }
                }
            });

            await this.runTest('Old log files are cleaned up after 7 days', async () => {
                const oldLogFile = path.join(this.testLogDir, 'cleanup-test-2020-01-01T00-00-00.log');
                fs.writeFileSync(oldLogFile, 'old log data', 'utf8');

                const stats = fs.statSync(oldLogFile);
                const oldTime = new Date('2020-01-01').getTime();
                fs.utimesSync(oldLogFile, new Date(oldTime), new Date(oldTime));

                const largeData = 'x'.repeat(1024);
                let content = '';
                for (let i = 0; i < 11000; i++) {
                    content += JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', message: largeData }) + '\n';
                }

                const testLogFile = path.join(this.testLogDir, 'cleanup-test.log');
                fs.writeFileSync(testLogFile, content, 'utf8');

                const logger = new Logger({ logFile: testLogFile });
                logger.info('Trigger cleanup');

                await new Promise(resolve => setTimeout(resolve, 100));

                if (fs.existsSync(oldLogFile)) {
                    throw new Error('Old log file was not cleaned up');
                }
            });

            await this.runTest('Logger.close() flushes and closes streams', async () => {
                const testLogFile = path.join(this.testLogDir, 'close-test.log');

                const logger = new Logger({ logFile: testLogFile });
                logger.info('Before close');
                logger.close();

                await new Promise(resolve => setTimeout(resolve, 50));

                const content = fs.readFileSync(testLogFile, 'utf8');

                if (!content.includes('Before close')) {
                    throw new Error('Logger did not flush before closing');
                }

                if (logger.logStream && !logger.logStream.destroyed) {
                    throw new Error('Log stream was not closed');
                }
            });

            await this.runTest('Environment variables override constructor options', async () => {
                process.env.CONSOLE_LOG_LEVEL = 'debug';
                process.env.FILE_LOG_LEVEL = 'error';

                const testLogFile = path.join(this.testLogDir, 'env-override.log');
                const logger = new Logger({
                    consoleLevel: 'warn',
                    fileLevel: 'info',
                    logFile: testLogFile
                });

                if (logger.getConsoleLevel() !== 'debug') {
                    throw new Error('Environment variable did not override constructor for console level');
                }

                if (logger.getFileLevel() !== 'error') {
                    throw new Error('Environment variable did not override constructor for file level');
                }

                delete process.env.CONSOLE_LOG_LEVEL;
                delete process.env.FILE_LOG_LEVEL;
            });

            await this.runTest('Fatal errors always display on console regardless of level', async () => {
                const testLogFile = path.join(this.testLogDir, 'fatal-test.log');
                const logger = new Logger({
                    consoleLevel: 'error',
                    fileLevel: 'info',
                    logFile: testLogFile
                });

                const originalConsoleError = console.error;
                let consoleOutput = '';
                console.error = (...args) => {
                    consoleOutput += args.join(' ');
                };

                logger.fatal('Critical system failure');

                console.error = originalConsoleError;

                if (!consoleOutput.includes('Critical system failure')) {
                    throw new Error('Fatal error was not displayed on console');
                }
            });

            await this.runTest('JSON Lines format is valid in log files', async () => {
                const testLogFile = path.join(this.testLogDir, 'jsonlines.log');
                const logger = new Logger({ logFile: testLogFile });

                logger.debug('Debug message', { foo: 'bar' });
                logger.info('Info message', { num: 42 });
                logger.warn('Warning message');
                logger.error('Error message', { error: true });

                await new Promise(resolve => setTimeout(resolve, 50));
                logger.close();

                const content = fs.readFileSync(testLogFile, 'utf8');
                const lines = content.split('\n').filter(line => line.trim());

                for (const line of lines) {
                    let parsed;
                    try {
                        parsed = JSON.parse(line);
                    } catch (e) {
                        throw new Error(`Invalid JSON in log file: ${line}`);
                    }

                    if (!parsed.timestamp || !parsed.level || !parsed.message) {
                        throw new Error('Log entry missing required fields');
                    }
                }
            });

        } finally {
            this.cleanupTestEnvironment();
        }

        console.log('='.repeat(70));
        console.log('\n📊 Test Summary:');
        console.log('='.repeat(70));
        console.log(`  Total Tests: ${this.passed + this.failed}`);
        console.log(`  ✅ Passed: ${this.passed}`);
        console.log(`  ❌ Failed: ${this.failed}`);

        console.log('\n' + (this.failed === 0 ? '🎉 All edge case tests passed!' : '❌ Some tests failed!'));
        console.log('');

        return this.failed === 0;
    }
}

const tester = new EdgeCaseTest();
tester.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
});