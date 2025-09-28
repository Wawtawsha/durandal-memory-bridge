/**
 * Test Suite for Logging Changes in v3.1.0
 *
 * Tests:
 * - Dual log levels (console vs file)
 * - File logging always-on
 * - New MCP tools (get_status, configure_logging, get_logs)
 * - Backward compatibility with LOG_LEVEL
 */

const fs = require('fs');
const path = require('path');
const Logger = require('./logger');
const DurandalMCPServer = require('./durandal-mcp-server-v3');

class LoggingTests {
    constructor() {
        this.passed = 0;
        this.failed = 0;
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
            this.failed++;
        }
    }

    async runAllTests() {
        console.log('\n🧪 Logging v3.1.0 Feature Tests\n');
        console.log('='.repeat(70));

        // Test 1: Logger has separate console and file levels
        await this.runTest('Logger has consoleLevel and fileLevel properties', async () => {
            const logger = new Logger({ consoleLevel: 'warn', fileLevel: 'info' });

            if (logger.consoleLevel === undefined) {
                throw new Error('consoleLevel not found');
            }

            if (logger.fileLevel === undefined) {
                throw new Error('fileLevel not found');
            }
        });

        // Test 2: Default log levels are correct
        await this.runTest('Default console=warn, file=info', async () => {
            const logger = new Logger({});

            const consoleLevelName = logger.getConsoleLevel();
            const fileLevelName = logger.getFileLevel();

            if (consoleLevelName !== 'warn') {
                throw new Error(`Console level should be warn, got ${consoleLevelName}`);
            }

            if (fileLevelName !== 'info') {
                throw new Error(`File level should be info, got ${fileLevelName}`);
            }
        });

        // Test 3: File logging creates default location
        await this.runTest('File logging creates ~/.durandal-mcp/logs/', async () => {
            const logger = new Logger({});

            if (!logger.logFile) {
                throw new Error('No log file configured');
            }

            if (!logger.logFile.includes('.durandal-mcp')) {
                throw new Error(`Log file not in .durandal-mcp: ${logger.logFile}`);
            }

            if (!logger.logFile.includes('logs')) {
                throw new Error(`Log file not in logs subdir: ${logger.logFile}`);
            }
        });

        // Test 4: Getter methods work
        await this.runTest('getConsoleLevel() and getFileLevel() work', async () => {
            const logger = new Logger({ consoleLevel: 'debug', fileLevel: 'error' });

            if (logger.getConsoleLevel() !== 'debug') {
                throw new Error('getConsoleLevel() failed');
            }

            if (logger.getFileLevel() !== 'error') {
                throw new Error('getFileLevel() failed');
            }
        });

        // Test 5: Setter methods work
        await this.runTest('setConsoleLevel() and setFileLevel() work', async () => {
            const logger = new Logger({});

            const result1 = logger.setConsoleLevel('error');
            const result2 = logger.setFileLevel('debug');

            if (!result1 || !result2) {
                throw new Error('Setter returned false');
            }

            if (logger.getConsoleLevel() !== 'error') {
                throw new Error('setConsoleLevel() did not update level');
            }

            if (logger.getFileLevel() !== 'debug') {
                throw new Error('setFileLevel() did not update level');
            }
        });

        // Test 6: Environment variables work
        await this.runTest('CONSOLE_LOG_LEVEL and FILE_LOG_LEVEL env vars work', async () => {
            process.env.CONSOLE_LOG_LEVEL = 'error';
            process.env.FILE_LOG_LEVEL = 'debug';

            const logger = new Logger({});

            if (logger.getConsoleLevel() !== 'error') {
                throw new Error(`Console level should be error, got ${logger.getConsoleLevel()}`);
            }

            if (logger.getFileLevel() !== 'debug') {
                throw new Error(`File level should be debug, got ${logger.getFileLevel()}`);
            }

            delete process.env.CONSOLE_LOG_LEVEL;
            delete process.env.FILE_LOG_LEVEL;
        });

        // Test 7: Backward compatibility with LOG_LEVEL
        await this.runTest('LOG_LEVEL sets both console and file (backward compat)', async () => {
            process.env.LOG_LEVEL = 'debug';

            const logger = new Logger({});

            if (logger.getConsoleLevel() !== 'debug') {
                throw new Error(`Console should fallback to LOG_LEVEL`);
            }

            if (logger.getFileLevel() !== 'debug') {
                throw new Error(`File should fallback to LOG_LEVEL`);
            }

            delete process.env.LOG_LEVEL;
        });

        // Test 8: MCP Server has new tools
        await this.runTest('MCP Server registers get_status tool', async () => {
            const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
            const server = new DurandalMCPServer({ logLevel: 'error' });

            // Check that the tool handlers exist
            if (typeof server.handleGetStatus !== 'function') {
                throw new Error('handleGetStatus method not found');
            }
        });

        await this.runTest('MCP Server registers configure_logging tool', async () => {
            const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
            const server = new DurandalMCPServer({ logLevel: 'error' });

            if (typeof server.handleConfigureLogging !== 'function') {
                throw new Error('handleConfigureLogging method not found');
            }
        });

        await this.runTest('MCP Server registers get_logs tool', async () => {
            const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
            const server = new DurandalMCPServer({ logLevel: 'error' });

            if (typeof server.handleGetLogs !== 'function') {
                throw new Error('handleGetLogs method not found');
            }
        });

        // Test 9: Version is 3.1.0
        await this.runTest('Version updated to 3.1.0', async () => {
            const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

            if (pkg.version !== '3.1.0') {
                throw new Error(`Version should be 3.1.0, got ${pkg.version}`);
            }
        });

        console.log('='.repeat(70));
        console.log('\n📊 Test Summary:');
        console.log('='.repeat(70));
        console.log(`  Total Tests: ${this.passed + this.failed}`);
        console.log(`  ✅ Passed: ${this.passed}`);
        console.log(`  ❌ Failed: ${this.failed}`);

        console.log('\n' + (this.failed === 0 ? '🎉 All tests passed!' : '❌ Some tests failed!'));
        console.log('');

        return this.failed === 0;
    }
}

// Run tests
const tester = new LoggingTests();
tester.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
});