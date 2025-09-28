/**
 * Integration Test 1: Dual Log Level Filtering
 *
 * Verifies that console and file log levels work independently in practice:
 * - Console level filters terminal output
 * - File level filters file output
 * - Both can be configured differently
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class IntegrationTest {
    constructor() {
        this.passed = 0;
        this.failed = 0;
        this.testLogDir = path.join(__dirname, '.test-logs');
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

    spawnServer(env) {
        return new Promise((resolve, reject) => {
            const proc = spawn('node', [
                path.join(__dirname, 'test-helper-generate-logs.js')
            ], {
                env: { ...process.env, ...env },
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';
            let timeout;

            proc.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            proc.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            proc.on('close', (code) => {
                clearTimeout(timeout);
                resolve({ code, stdout, stderr });
            });

            proc.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });

            timeout = setTimeout(() => {
                proc.kill();
                reject(new Error('Server spawn timeout'));
            }, 5000);
        });
    }

    async runAllTests() {
        console.log('\n🧪 Integration Test 1: Dual Log Level Filtering\n');
        console.log('='.repeat(70));

        this.setupTestEnvironment();

        try {
            await this.runTest('Console=WARN shows only warnings and errors', async () => {
                const testLogFile = path.join(this.testLogDir, 'test-console-warn.log');

                const result = await this.spawnServer({
                    CONSOLE_LOG_LEVEL: 'warn',
                    FILE_LOG_LEVEL: 'debug',
                    LOG_FILE: testLogFile
                });

                const consoleOutput = result.stdout + result.stderr;

                if (consoleOutput.toLowerCase().includes('debug message')) {
                    throw new Error('Console showed debug messages when level=warn');
                }

                if (consoleOutput.toLowerCase().includes('info message')) {
                    throw new Error('Console showed info messages when level=warn');
                }

                if (!consoleOutput.toLowerCase().includes('warning message') && !consoleOutput.toLowerCase().includes('error message')) {
                    throw new Error('Console did not show warnings when level=warn');
                }
            });

            await this.runTest('Console=DEBUG shows all messages', async () => {
                const testLogFile = path.join(this.testLogDir, 'test-console-debug.log');

                const result = await this.spawnServer({
                    CONSOLE_LOG_LEVEL: 'debug',
                    FILE_LOG_LEVEL: 'debug',
                    LOG_FILE: testLogFile
                });

                const consoleOutput = result.stdout + result.stderr;

                if (!consoleOutput.toLowerCase().includes('debug message')) {
                    throw new Error('Console did not show debug messages at debug level');
                }

                if (!consoleOutput.toLowerCase().includes('info message')) {
                    throw new Error('Console did not show info messages at debug level');
                }
            });

            await this.runTest('File=INFO logs info, warn, and error', async () => {
                const testLogFile = path.join(this.testLogDir, 'test-file-info.log');

                await this.spawnServer({
                    CONSOLE_LOG_LEVEL: 'error',
                    FILE_LOG_LEVEL: 'info',
                    LOG_FILE: testLogFile
                });

                if (!fs.existsSync(testLogFile)) {
                    throw new Error('Log file was not created');
                }

                const fileContent = fs.readFileSync(testLogFile, 'utf8');
                const logLines = fileContent.split('\n').filter(line => line.trim());

                const hasInfo = logLines.some(line => {
                    try {
                        const log = JSON.parse(line);
                        return log.level === 'info';
                    } catch {
                        return false;
                    }
                });

                if (!hasInfo) {
                    throw new Error('File did not contain info level logs');
                }

                const hasDebug = logLines.some(line => {
                    try {
                        const log = JSON.parse(line);
                        return log.level === 'debug';
                    } catch {
                        return false;
                    }
                });

                if (hasDebug) {
                    throw new Error('File contained debug logs when level=info');
                }
            });

            await this.runTest('File=DEBUG logs all levels', async () => {
                const testLogFile = path.join(this.testLogDir, 'test-file-debug.log');

                await this.spawnServer({
                    CONSOLE_LOG_LEVEL: 'error',
                    FILE_LOG_LEVEL: 'debug',
                    LOG_FILE: testLogFile
                });

                if (!fs.existsSync(testLogFile)) {
                    throw new Error('Log file was not created');
                }

                const fileContent = fs.readFileSync(testLogFile, 'utf8');
                const logLines = fileContent.split('\n').filter(line => line.trim());

                const levels = new Set();
                logLines.forEach(line => {
                    try {
                        const log = JSON.parse(line);
                        levels.add(log.level);
                    } catch {}
                });

                if (!levels.has('debug')) {
                    throw new Error('File did not contain debug logs at debug level');
                }

                if (!levels.has('info')) {
                    throw new Error('File did not contain info logs at debug level');
                }
            });

            await this.runTest('Console=WARN + File=DEBUG works independently', async () => {
                const testLogFile = path.join(this.testLogDir, 'test-independent.log');

                const result = await this.spawnServer({
                    CONSOLE_LOG_LEVEL: 'warn',
                    FILE_LOG_LEVEL: 'debug',
                    LOG_FILE: testLogFile
                });

                const consoleOutput = result.stdout + result.stderr;

                if (consoleOutput.includes('🔍')) {
                    throw new Error('Console showed debug when level=warn');
                }

                const fileContent = fs.readFileSync(testLogFile, 'utf8');
                const hasDebugInFile = fileContent.split('\n').some(line => {
                    try {
                        const log = JSON.parse(line);
                        return log.level === 'debug';
                    } catch {
                        return false;
                    }
                });

                if (!hasDebugInFile) {
                    const error = new Error('File did not contain debug logs when file level=debug');
                    error.details = `Console output had ${consoleOutput.length} chars, file had ${fileContent.length} chars`;
                    throw error;
                }
            });

            await this.runTest('File location defaults to ~/.durandal-mcp/logs/', async () => {
                const homeDir = process.env.HOME || process.env.USERPROFILE;
                const expectedDir = path.join(homeDir, '.durandal-mcp', 'logs');

                await this.spawnServer({
                    CONSOLE_LOG_LEVEL: 'error',
                    FILE_LOG_LEVEL: 'info'
                });

                if (!fs.existsSync(expectedDir)) {
                    throw new Error('Default log directory was not created');
                }

                const files = fs.readdirSync(expectedDir);
                const todayPattern = /durandal-\d{4}-\d{2}-\d{2}\.log/;

                if (!files.some(f => todayPattern.test(f))) {
                    throw new Error('Default log file not found in expected location');
                }
            });

            await this.runTest('LOG_LEVEL (legacy) sets both console and file', async () => {
                const testLogFile = path.join(this.testLogDir, 'test-legacy.log');

                const result = await this.spawnServer({
                    LOG_LEVEL: 'debug',
                    LOG_FILE: testLogFile
                });

                const consoleOutput = result.stdout + result.stderr;
                const fileContent = fs.readFileSync(testLogFile, 'utf8');

                const consoleHasDebug = consoleOutput.length > 0;
                const fileHasDebug = fileContent.split('\n').some(line => {
                    try {
                        const log = JSON.parse(line);
                        return log.level === 'debug';
                    } catch {
                        return false;
                    }
                });

                if (!fileHasDebug) {
                    throw new Error('Legacy LOG_LEVEL did not set file level to debug');
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

        console.log('\n' + (this.failed === 0 ? '🎉 All integration tests passed!' : '❌ Some tests failed!'));
        console.log('');

        return this.failed === 0;
    }
}

const tester = new IntegrationTest();
tester.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
});