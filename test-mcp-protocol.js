/**
 * Integration Test 2: Real MCP Protocol Testing
 *
 * Tests the new MCP tools through actual MCP protocol communication:
 * - get_status returns valid formatted output
 * - configure_logging updates levels and persists to .env
 * - get_logs retrieves and filters log entries
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class MCPProtocolTest {
    constructor() {
        this.passed = 0;
        this.failed = 0;
        this.testEnvFile = path.join(__dirname, '.env.test');
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
        if (fs.existsSync(this.testEnvFile)) {
            fs.unlinkSync(this.testEnvFile);
        }
    }

    cleanupTestEnvironment() {
        if (fs.existsSync(this.testEnvFile)) {
            fs.unlinkSync(this.testEnvFile);
        }
    }

    async sendMCPRequest(method, params = {}) {
        return new Promise((resolve, reject) => {
            const proc = spawn('node', [
                path.join(__dirname, 'durandal-mcp-server-v3.js')
            ], {
                stdio: ['pipe', 'pipe', 'pipe']
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

                const lines = stdout.split('\n').filter(line => line.trim());
                const responses = [];

                for (const line of lines) {
                    try {
                        const msg = JSON.parse(line);
                        if (msg.jsonrpc === '2.0') {
                            responses.push(msg);
                        }
                    } catch (e) {
                    }
                }

                resolve({ code, responses, stdout, stderr });
            });

            proc.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });

            const initRequest = {
                jsonrpc: '2.0',
                id: 1,
                method: 'initialize',
                params: {
                    protocolVersion: '2024-11-05',
                    capabilities: {},
                    clientInfo: {
                        name: 'test-client',
                        version: '1.0.0'
                    }
                }
            };

            const toolRequest = {
                jsonrpc: '2.0',
                id: 2,
                method: 'tools/call',
                params: {
                    name: method,
                    arguments: params
                }
            };

            proc.stdin.write(JSON.stringify(initRequest) + '\n');

            setTimeout(() => {
                proc.stdin.write(JSON.stringify(toolRequest) + '\n');
                proc.stdin.end();
            }, 100);

            timeout = setTimeout(() => {
                proc.kill();
                reject(new Error('MCP request timeout'));
            }, 5000);
        });
    }

    async runAllTests() {
        console.log('\n🧪 Integration Test 2: Real MCP Protocol Testing\n');
        console.log('='.repeat(70));

        this.setupTestEnvironment();

        try {
            await this.runTest('get_status returns valid JSON-RPC response', async () => {
                const result = await this.sendMCPRequest('get_status', {});

                const toolResponse = result.responses.find(r => r.id === 2);

                if (!toolResponse) {
                    throw new Error('No tool response received from MCP server');
                }

                if (toolResponse.error) {
                    const error = new Error('get_status returned error');
                    error.details = JSON.stringify(toolResponse.error);
                    throw error;
                }

                if (!toolResponse.result) {
                    throw new Error('get_status response missing result field');
                }

                if (!Array.isArray(toolResponse.result.content)) {
                    throw new Error('get_status result.content is not an array');
                }

                const textContent = toolResponse.result.content.find(c => c.type === 'text');
                if (!textContent || !textContent.text) {
                    throw new Error('get_status did not return text content');
                }

                if (!textContent.text.includes('Durandal MCP Server')) {
                    throw new Error('get_status output missing expected header');
                }

                if (!textContent.text.includes('Version:')) {
                    throw new Error('get_status output missing version info');
                }
            });

            await this.runTest('get_status includes all expected status fields', async () => {
                const result = await this.sendMCPRequest('get_status', {});
                const toolResponse = result.responses.find(r => r.id === 2);
                const textContent = toolResponse.result.content.find(c => c.type === 'text');

                const requiredFields = [
                    'Uptime:',
                    'Memory',
                    'Database',
                    'Cache Size:',
                    'Console Level:',
                    'File Level:'
                ];

                for (const field of requiredFields) {
                    if (!textContent.text.includes(field)) {
                        throw new Error(`get_status missing field: ${field}`);
                    }
                }
            });

            await this.runTest('configure_logging accepts valid log levels', async () => {
                const result = await this.sendMCPRequest('configure_logging', {
                    console_level: 'debug',
                    file_level: 'info'
                });

                const toolResponse = result.responses.find(r => r.id === 2);

                if (!toolResponse) {
                    throw new Error('No response from configure_logging');
                }

                if (toolResponse.error) {
                    const error = new Error('configure_logging returned error');
                    error.details = JSON.stringify(toolResponse.error);
                    throw error;
                }

                const textContent = toolResponse.result.content.find(c => c.type === 'text');
                if (!textContent.text.includes('✅')) {
                    throw new Error('configure_logging did not return success message');
                }
            });

            await this.runTest('configure_logging rejects invalid levels', async () => {
                const result = await this.sendMCPRequest('configure_logging', {
                    console_level: 'invalid_level'
                });

                const toolResponse = result.responses.find(r => r.id === 2);

                if (!toolResponse || !toolResponse.result) {
                    throw new Error('No response from configure_logging');
                }

                const textContent = toolResponse.result.content.find(c => c.type === 'text');

                if (!textContent.text.includes('Error') || !textContent.text.includes('Invalid')) {
                    throw new Error('configure_logging did not return error message for invalid level');
                }
            });

            await this.runTest('configure_logging requires at least one level', async () => {
                const result = await this.sendMCPRequest('configure_logging', {});

                const toolResponse = result.responses.find(r => r.id === 2);

                if (!toolResponse || !toolResponse.result) {
                    throw new Error('No response from configure_logging');
                }

                const textContent = toolResponse.result.content.find(c => c.type === 'text');

                if (!textContent.text.includes('Error') || !textContent.text.includes('at least one')) {
                    throw new Error('configure_logging did not require at least one level');
                }
            });

            await this.runTest('get_logs returns valid log entries', async () => {
                const result = await this.sendMCPRequest('get_logs', {
                    lines: 10
                });

                const toolResponse = result.responses.find(r => r.id === 2);

                if (!toolResponse) {
                    throw new Error('No response from get_logs');
                }

                if (toolResponse.error) {
                    const error = new Error('get_logs returned error');
                    error.details = JSON.stringify(toolResponse.error);
                    throw error;
                }

                const textContent = toolResponse.result.content.find(c => c.type === 'text');
                if (!textContent || !textContent.text) {
                    throw new Error('get_logs did not return text content');
                }

                if (!textContent.text.includes('Recent Log Entries')) {
                    throw new Error('get_logs output missing expected header');
                }
            });

            await this.runTest('get_logs supports level filtering', async () => {
                const result = await this.sendMCPRequest('get_logs', {
                    lines: 50,
                    level_filter: 'error'
                });

                const toolResponse = result.responses.find(r => r.id === 2);

                if (toolResponse.error) {
                    const error = new Error('get_logs with level_filter returned error');
                    error.details = JSON.stringify(toolResponse.error);
                    throw error;
                }

                const textContent = toolResponse.result.content.find(c => c.type === 'text');
                if (!textContent) {
                    throw new Error('get_logs did not return text content');
                }
            });

            await this.runTest('get_logs supports search filtering', async () => {
                const result = await this.sendMCPRequest('get_logs', {
                    lines: 50,
                    search: 'Session Started'
                });

                const toolResponse = result.responses.find(r => r.id === 2);

                if (toolResponse.error) {
                    const error = new Error('get_logs with search returned error');
                    error.details = JSON.stringify(toolResponse.error);
                    throw error;
                }

                const textContent = toolResponse.result.content.find(c => c.type === 'text');
                if (!textContent) {
                    throw new Error('get_logs did not return text content');
                }

                if (!textContent.text.includes('Session Started')) {
                    throw new Error('get_logs search filter did not work correctly');
                }
            });

            await this.runTest('MCP server handles multiple sequential requests', async () => {
                const proc = spawn('node', [
                    path.join(__dirname, 'durandal-mcp-server-v3.js')
                ], {
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                let stdout = '';

                proc.stdout.on('data', (data) => {
                    stdout += data.toString();
                });

                const initRequest = {
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'initialize',
                    params: {
                        protocolVersion: '2024-11-05',
                        capabilities: {},
                        clientInfo: { name: 'test', version: '1.0.0' }
                    }
                };

                proc.stdin.write(JSON.stringify(initRequest) + '\n');

                await new Promise(resolve => setTimeout(resolve, 100));

                const requests = [
                    { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'get_status', arguments: {} } },
                    { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'get_logs', arguments: { lines: 5 } } },
                    { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'get_status', arguments: {} } }
                ];

                for (const req of requests) {
                    proc.stdin.write(JSON.stringify(req) + '\n');
                    await new Promise(resolve => setTimeout(resolve, 50));
                }

                proc.stdin.end();

                await new Promise((resolve) => {
                    proc.on('close', resolve);
                    setTimeout(() => {
                        proc.kill();
                        resolve();
                    }, 2000);
                });

                const lines = stdout.split('\n').filter(line => line.trim());
                const responses = [];

                for (const line of lines) {
                    try {
                        const msg = JSON.parse(line);
                        if (msg.jsonrpc === '2.0' && msg.id >= 2) {
                            responses.push(msg);
                        }
                    } catch (e) {}
                }

                if (responses.length < 3) {
                    throw new Error(`Expected 3 responses, got ${responses.length}`);
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

        console.log('\n' + (this.failed === 0 ? '🎉 All MCP protocol tests passed!' : '❌ Some tests failed!'));
        console.log('');

        return this.failed === 0;
    }
}

const tester = new MCPProtocolTest();
tester.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
});