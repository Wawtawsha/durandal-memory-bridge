/**
 * Comprehensive Test Suite for Terminal Graphics Features
 *
 * Tests:
 * - --status command with live data
 * - --configure command (simulated)
 * - Color-coded logging at all levels
 * - Fatal error display
 * - Processing messages
 * - Log level filtering
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class TerminalFeatureTests {
    constructor() {
        this.passed = 0;
        this.failed = 0;
        this.tests = [];
    }

    async runTest(name, testFn) {
        process.stdout.write(`  ${name}... `);
        const startTime = Date.now();

        try {
            await testFn();
            const duration = Date.now() - startTime;
            console.log(`✅ (${duration}ms)`);
            this.passed++;
            this.tests.push({ name, passed: true, duration });
        } catch (error) {
            const duration = Date.now() - startTime;
            console.log(`❌ (${duration}ms)`);
            console.log(`    Error: ${error.message}`);
            this.failed++;
            this.tests.push({ name, passed: false, duration, error: error.message });
        }
    }

    async runCommand(args, env = {}) {
        return new Promise((resolve, reject) => {
            const child = spawn('node', ['durandal-mcp-server-v3.js', ...args], {
                cwd: __dirname,
                env: { ...process.env, ...env },
                shell: false
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            const timeout = setTimeout(() => {
                child.kill();
                reject(new Error('Command timeout (5s)'));
            }, 5000);

            child.on('exit', (code) => {
                clearTimeout(timeout);
                resolve({ code, stdout, stderr });
            });

            child.on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    }

    async runAllTests() {
        console.log('\n🧪 Terminal Graphics Feature Tests\n');
        console.log('='.repeat(70));

        // Test 1: --status command
        await this.runTest('--status command shows system info', async () => {
            const result = await this.runCommand(['--status']);

            if (result.code !== 0) {
                throw new Error(`Exit code: ${result.code}`);
            }

            const required = [
                '🎯 Durandal MCP Server',
                'Status:',
                'Memory (RSS):',
                'Database:',
                'Node Version:',
                'Platform:'
            ];

            for (const text of required) {
                if (!result.stdout.includes(text)) {
                    throw new Error(`Missing: ${text}`);
                }
            }
        });

        // Test 2: --status includes real data
        await this.runTest('--status displays real system data', async () => {
            const result = await this.runCommand(['--status']);

            if (!result.stdout.match(/Memory \(RSS\):\s+\d+\.\d+\s+MB/)) {
                throw new Error('No memory info');
            }

            if (!result.stdout.match(/Node Version:\s+v\d+\.\d+\.\d+/)) {
                throw new Error('No Node version');
            }

            if (!result.stdout.match(/Platform:\s+\w+/)) {
                throw new Error('No platform info');
            }
        });

        // Test 3: --status shows database status
        await this.runTest('--status shows database connection', async () => {
            const result = await this.runCommand(['--status']);

            if (!result.stdout.includes('Database:')) {
                throw new Error('No database status');
            }

            if (!result.stdout.match(/Database Size:\s+\d+\.\d+\s+MB/)) {
                throw new Error('No database size');
            }
        });

        // Test 4: --help includes new commands
        await this.runTest('--help shows --status and --configure', async () => {
            const result = await this.runCommand(['--help']);

            if (!result.stdout.includes('--status')) {
                throw new Error('Missing --status in help');
            }

            if (!result.stdout.includes('--configure')) {
                throw new Error('Missing --configure in help');
            }

            if (!result.stdout.includes('Show system status and statistics')) {
                throw new Error('Missing status description');
            }

            if (!result.stdout.includes('Interactive log level configuration')) {
                throw new Error('Missing configure description');
            }
        });

        // Test 5: Logger has new methods
        await this.runTest('Logger has fatal, processing, success, substep', async () => {
            const Logger = require('./logger');
            const logger = new Logger({ level: 'debug' });

            const methods = ['fatal', 'processing', 'success', 'substep'];
            for (const method of methods) {
                if (typeof logger[method] !== 'function') {
                    throw new Error(`Missing method: ${method}`);
                }
            }
        });

        // Test 6: Logger color codes exist
        await this.runTest('Logger has all color codes', async () => {
            const Logger = require('./logger');
            const logger = new Logger({ level: 'debug' });

            const colors = ['debug', 'info', 'warn', 'error', 'fatal', 'bright', 'dim', 'reset'];
            for (const color of colors) {
                if (!logger.colors[color]) {
                    throw new Error(`Missing color: ${color}`);
                }
            }
        });

        // Test 7: Fatal error level exists
        await this.runTest('Fatal error level defined', async () => {
            const Logger = require('./logger');
            const logger = new Logger({ level: 'error' });

            if (logger.levels.fatal === undefined) {
                throw new Error('Fatal level not defined');
            }

            if (logger.levels.fatal !== 4) {
                throw new Error(`Fatal level should be 4, got ${logger.levels.fatal}`);
            }
        });

        // Test 8: Test suite runs successfully
        await this.runTest('Built-in test suite passes', async () => {
            const result = await this.runCommand(['--test']);

            if (result.code !== 0) {
                throw new Error(`Test suite failed with code ${result.code}`);
            }

            if (!result.stdout.includes('All tests passed')) {
                throw new Error('Tests did not pass');
            }

            if (!result.stdout.match(/Passed:\s+\d+/)) {
                throw new Error('No test count');
            }
        });

        // Test 9: Log level filtering (ERROR level)
        await this.runTest('Log level ERROR filters out info/debug', async () => {
            const Logger = require('./logger');
            const logger = new Logger({ level: 'error' });

            const originalLog = console.log;
            const originalError = console.error;
            let logCalled = false;
            let errorCalled = false;

            console.log = () => { logCalled = true; };
            console.error = () => { errorCalled = true; };

            logger.info('Test info');
            logger.debug('Test debug');
            logger.warn('Test warn');

            if (logCalled) {
                console.log = originalLog;
                console.error = originalError;
                throw new Error('Info/debug/warn should be filtered at ERROR level');
            }

            logger.error('Test error');

            if (!errorCalled) {
                console.log = originalLog;
                console.error = originalError;
                throw new Error('Error should be displayed at ERROR level');
            }

            console.log = originalLog;
            console.error = originalError;
        });

        // Test 10: Fatal errors always display
        await this.runTest('Fatal errors display at all log levels', async () => {
            const Logger = require('./logger');

            const levels = ['error', 'warn', 'info', 'debug'];

            for (const level of levels) {
                const logger = new Logger({ level });

                const originalError = console.error;
                let errorCalled = false;

                console.error = () => { errorCalled = true; };

                logger.fatal('Test fatal error');

                console.error = originalError;

                if (!errorCalled) {
                    throw new Error(`Fatal should display at ${level} level`);
                }
            }
        });

        // Test 11: Processing messages at INFO level
        await this.runTest('Processing messages display at INFO level', async () => {
            const Logger = require('./logger');
            const logger = new Logger({ level: 'info' });

            const originalLog = console.log;
            let logCalled = false;
            let hasProcessingEmoji = false;

            console.log = (msg) => {
                logCalled = true;
                if (msg && msg.toString().includes('🔄')) {
                    hasProcessingEmoji = true;
                }
            };

            logger.processing('Test processing');

            console.log = originalLog;

            if (!logCalled || !hasProcessingEmoji) {
                throw new Error('Processing message should display at INFO level');
            }
        });

        // Test 12: Processing messages hidden at WARN level
        await this.runTest('Processing messages hidden at WARN level', async () => {
            const Logger = require('./logger');
            const logger = new Logger({ level: 'warn' });

            const originalLog = console.log;
            let logCalled = false;

            console.log = () => { logCalled = true; };

            logger.processing('Test processing');

            console.log = originalLog;

            if (logCalled) {
                throw new Error('Processing message should be hidden at WARN level');
            }
        });

        // Test 13: Success messages display at INFO level
        await this.runTest('Success messages display at INFO level', async () => {
            const Logger = require('./logger');
            const logger = new Logger({ level: 'info' });

            const originalLog = console.log;
            let logCalled = false;

            console.log = (msg) => {
                if (msg.includes('✅')) {
                    logCalled = true;
                }
            };

            logger.success('Test success');

            console.log = originalLog;

            if (!logCalled) {
                throw new Error('Success message should display at INFO level');
            }
        });

        // Test 14: Substep messages at DEBUG level only
        await this.runTest('Substep messages display at DEBUG level', async () => {
            const Logger = require('./logger');
            const logger = new Logger({ level: 'debug' });

            const originalLog = console.log;
            let logCalled = false;

            console.log = (msg) => {
                if (msg.includes('└─')) {
                    logCalled = true;
                }
            };

            logger.substep('Test substep');

            console.log = originalLog;

            if (!logCalled) {
                throw new Error('Substep should display at DEBUG level');
            }
        });

        // Test 15: Substep messages hidden at INFO level
        await this.runTest('Substep messages hidden at INFO level', async () => {
            const Logger = require('./logger');
            const logger = new Logger({ level: 'info' });

            const originalLog = console.log;
            let logCalled = false;

            console.log = () => { logCalled = true; };

            logger.substep('Test substep');

            console.log = originalLog;

            if (logCalled) {
                throw new Error('Substep should be hidden at INFO level');
            }
        });

        // Test 16: Color codes are ANSI escape sequences
        await this.runTest('Color codes are valid ANSI sequences', async () => {
            const Logger = require('./logger');
            const logger = new Logger({ level: 'debug' });

            // Allow single ANSI codes or multiple codes (like fatal with bright+red)
            const ansiPattern = /^(\x1b\[\d+(;\d+)*m)+$/;

            for (const [name, code] of Object.entries(logger.colors)) {
                if (!ansiPattern.test(code)) {
                    throw new Error(`Invalid ANSI code for ${name}: ${code}`);
                }
            }
        });

        // Test 17: formatUptime function works
        await this.runTest('formatUptime formats time correctly', async () => {
            // Load the function from the file
            const content = fs.readFileSync(path.join(__dirname, 'durandal-mcp-server-v3.js'), 'utf8');

            if (!content.includes('function formatUptime')) {
                throw new Error('formatUptime function not found');
            }

            // Test by running --status and checking uptime format
            const result = await this.runCommand(['--status']);

            if (!result.stdout.match(/Uptime:\s+\d+[hms]/)) {
                throw new Error('Uptime not formatted correctly');
            }
        });

        // Test 18: displayStatusSummary function exists
        await this.runTest('displayStatusSummary function exists', async () => {
            const content = fs.readFileSync(path.join(__dirname, 'durandal-mcp-server-v3.js'), 'utf8');

            if (!content.includes('function displayStatusSummary')) {
                throw new Error('displayStatusSummary function not found');
            }

            if (!content.includes('┏━━━')) {
                throw new Error('Box drawing characters not found');
            }
        });

        // Test 19: configureLogLevel function exists
        await this.runTest('configureLogLevel function exists', async () => {
            const content = fs.readFileSync(path.join(__dirname, 'durandal-mcp-server-v3.js'), 'utf8');

            if (!content.includes('async function configureLogLevel')) {
                throw new Error('configureLogLevel function not found');
            }

            if (!content.includes('LOG LEVEL CONFIGURATION')) {
                throw new Error('Configuration menu not found');
            }
        });

        // Test 20: Version is 3.0.3
        await this.runTest('Version updated to 3.0.3', async () => {
            const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

            if (pkg.version !== '3.0.3') {
                throw new Error(`Version should be 3.0.3, got ${pkg.version}`);
            }
        });

        // Test 21: MCP tool handlers have processing messages
        await this.runTest('MCP handlers have processing messages', async () => {
            const content = fs.readFileSync(path.join(__dirname, 'durandal-mcp-server-v3.js'), 'utf8');

            // Check for processing calls in handlers
            if (!content.includes(`this.logger.processing('Processing store_memory`)) {
                throw new Error('No processing message in handleStoreMemory');
            }

            if (!content.includes(`this.logger.processing('Processing search_memories`)) {
                throw new Error('No processing message in handleSearchMemories');
            }

            if (!content.includes(`this.logger.processing('Processing get_context`)) {
                throw new Error('No processing message in handleGetContext');
            }

            if (!content.includes(`this.logger.processing('Processing optimize_memory`)) {
                throw new Error('No processing message in handleOptimizeMemory');
            }

            // Check for success messages
            if (!content.includes(`this.logger.success(`)) {
                throw new Error('No success messages found');
            }

            // Check for substep messages
            if (!content.includes(`this.logger.substep(`)) {
                throw new Error('No substep messages found');
            }
        });

        console.log('='.repeat(70));
        console.log('\n📊 Test Summary:');
        console.log('='.repeat(70));
        console.log(`  Total Tests: ${this.passed + this.failed}`);
        console.log(`  ✅ Passed: ${this.passed}`);
        console.log(`  ❌ Failed: ${this.failed}`);

        if (this.failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.tests.filter(t => !t.passed).forEach(t => {
                console.log(`  - ${t.name}`);
                console.log(`    ${t.error}`);
            });
        }

        console.log('\n' + (this.failed === 0 ? '🎉 All tests passed!' : '❌ Some tests failed!'));
        console.log('');

        return this.failed === 0;
    }
}

// Run tests
const tester = new TerminalFeatureTests();
tester.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
});