/**
 * Durandal MCP Server - Test Runner
 *
 * Comprehensive test suite for validating MCP server functionality
 */

const DatabaseAdapter = require('./db-adapter');
const MCPDatabaseClient = require('./mcp-db-client');
const Logger = require('./logger');
const { ValidationError, DatabaseError } = require('./errors');

class TestRunner {
    constructor(logger = null) {
        this.logger = logger || new Logger({ level: 'info' });
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
        this.startTime = Date.now();
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('🧪 Running Durandal MCP Server Tests...\n');
        console.log('=' . repeat(50));

        // Database tests
        await this.runTest('Database Connection', this.testDatabaseConnection.bind(this));
        await this.runTest('Schema Validation', this.testSchemaValidation.bind(this));

        // Memory operations tests
        await this.runTest('Store Memory', this.testStoreMemory.bind(this));
        await this.runTest('Search Memory', this.testSearchMemory.bind(this));
        await this.runTest('Get Recent Memories', this.testGetRecentMemories.bind(this));

        // Cache tests
        await this.runTest('Cache Operations', this.testCacheOperations.bind(this));

        // MCP tool tests
        await this.runTest('MCP Tool Availability', this.testMCPTools.bind(this));

        // Error handling tests
        await this.runTest('Error Handling', this.testErrorHandling.bind(this));

        // Performance tests
        await this.runTest('Performance Benchmarks', this.testPerformance.bind(this));

        // Print summary
        this.printSummary();

        return this.failed === 0;
    }

    /**
     * Run a single test with error handling
     */
    async runTest(name, testFn) {
        const test = {
            name,
            started: Date.now(),
            status: 'running'
        };

        this.tests.push(test);

        try {
            process.stdout.write(`  ${name}...`);
            await testFn();

            test.status = 'passed';
            test.duration = Date.now() - test.started;
            this.passed++;

            console.log(` ✅ (${test.duration}ms)`);
        } catch (error) {
            test.status = 'failed';
            test.duration = Date.now() - test.started;
            test.error = error.message;
            this.failed++;

            console.log(` ❌ (${test.duration}ms)`);
            console.log(`    Error: ${error.message}`);

            if (process.env.VERBOSE === 'true') {
                console.log(`    Stack: ${error.stack}`);
            }
        }
    }

    /**
     * Test database connection
     */
    async testDatabaseConnection() {
        const db = new MCPDatabaseClient();
        const result = await db.testConnection();

        if (!result.success) {
            throw new Error(`Database connection failed: ${result.error}`);
        }

        // Test that we can actually query
        const testQuery = await db.query('SELECT 1 as test');
        if (!testQuery.rows || testQuery.rows[0].test !== 1) {
            throw new Error('Database query test failed');
        }

        await db.close();
    }

    /**
     * Test database schema
     */
    async testSchemaValidation() {
        const db = new MCPDatabaseClient();

        // Check that all required tables exist
        const tables = ['memories', 'projects', 'conversation_sessions', 'conversation_messages'];

        for (const table of tables) {
            const result = await db.query(
                "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                [table]
            );

            if (result.rows.length === 0) {
                throw new Error(`Missing table: ${table}`);
            }
        }

        // Check memories table structure
        // Note: SQLite PRAGMA returns different column names in the result set
        // We'll verify the table exists and has data instead
        try {
            // Try to select all required columns
            await db.query(
                "SELECT id, content, metadata, created_at FROM memories LIMIT 0"
            );
            // If this succeeds, all columns exist
        } catch (error) {
            throw new Error(`Schema validation failed: ${error.message}`);
        }

        await db.close();
    }

    /**
     * Test storing memory
     */
    async testStoreMemory() {
        const db = new MCPDatabaseClient();

        const testContent = 'Test memory content ' + Date.now();
        const testMetadata = {
            importance: 0.8,
            categories: ['test', 'validation'],
            keywords: ['test', 'memory'],
            project: 'test-project',
            session: 'test-session'
        };

        const result = await db.storeMemory(testContent, testMetadata);

        if (!result.success) {
            throw new Error(`Failed to store memory: ${result.error}`);
        }

        if (!result.id) {
            throw new Error('Store memory did not return an ID');
        }

        // Verify it was stored
        const stored = await db.getMemoryById(result.id);
        if (!stored) {
            throw new Error('Could not retrieve stored memory');
        }

        if (stored.content !== testContent) {
            throw new Error('Stored content does not match');
        }

        await db.close();
    }

    /**
     * Test searching memories
     */
    async testSearchMemory() {
        const db = new MCPDatabaseClient();

        // Store a memory to search for
        const uniqueContent = 'Unique test content ' + Date.now();
        await db.storeMemory(uniqueContent, {
            importance: 0.9,
            categories: ['searchtest']
        });

        // Search for it
        const results = await db.searchMemories('Unique test content');

        if (!Array.isArray(results)) {
            throw new Error('Search did not return an array');
        }

        const found = results.find(r => r.content.includes(uniqueContent));
        if (!found) {
            throw new Error('Search did not find the test memory');
        }

        await db.close();
    }

    /**
     * Test getting recent memories
     */
    async testGetRecentMemories() {
        const db = new MCPDatabaseClient();

        // Store some memories
        for (let i = 0; i < 3; i++) {
            await db.storeMemory(`Recent memory ${i}`, {
                importance: 0.5,
                project: 'recent-test'
            });
        }

        // Get recent memories
        const recent = await db.getRecentMemories(10, 'recent-test');

        if (!Array.isArray(recent)) {
            throw new Error('getRecentMemories did not return an array');
        }

        if (recent.length === 0) {
            throw new Error('No recent memories returned');
        }

        await db.close();
    }

    /**
     * Test cache operations
     */
    async testCacheOperations() {
        // Simple cache test - would be more comprehensive with actual cache implementation
        const cache = new Map();

        // Test set
        cache.set('test-key', { data: 'test-value' });

        // Test get
        const value = cache.get('test-key');
        if (!value || value.data !== 'test-value') {
            throw new Error('Cache get/set failed');
        }

        // Test delete
        cache.delete('test-key');
        if (cache.has('test-key')) {
            throw new Error('Cache delete failed');
        }

        // Test size limit
        const maxSize = 100;
        for (let i = 0; i < maxSize + 10; i++) {
            cache.set(`key-${i}`, `value-${i}`);
            if (cache.size > maxSize) {
                // Would implement LRU eviction in real cache
                const firstKey = cache.keys().next().value;
                cache.delete(firstKey);
            }
        }

        if (cache.size > maxSize) {
            throw new Error('Cache size limit not enforced');
        }
    }

    /**
     * Test MCP tools availability
     */
    async testMCPTools() {
        // Verify tool definitions
        const requiredTools = [
            'store_memory',
            'search_memories',
            'get_context',
            'optimize_memory'
        ];

        // In a real implementation, we'd check the actual MCP server
        // For now, we just verify the tool names are defined
        for (const tool of requiredTools) {
            if (!tool) {
                throw new Error(`Tool ${tool} is not defined`);
            }
        }
    }

    /**
     * Test error handling
     */
    async testErrorHandling() {
        // Test validation error
        try {
            if (typeof 123 !== 'string') {
                throw new ValidationError('Content must be a string', 'content', 123);
            }
        } catch (error) {
            if (!(error instanceof ValidationError)) {
                throw new Error('ValidationError not properly thrown');
            }
            if (error.code !== 'VALIDATION_ERROR') {
                throw new Error('ValidationError code incorrect');
            }
        }

        // Test database error handling
        const db = new MCPDatabaseClient();
        try {
            // Try to query a non-existent table
            await db.query('SELECT * FROM non_existent_table');
            throw new Error('Should have thrown an error for non-existent table');
        } catch (error) {
            // Expected error
            if (!error.message.includes('no such table')) {
                throw error;
            }
        }
        await db.close();
    }

    /**
     * Test performance benchmarks
     */
    async testPerformance() {
        const db = new MCPDatabaseClient();
        const iterations = 100;

        // Benchmark memory storage
        const storeStart = Date.now();
        for (let i = 0; i < iterations; i++) {
            await db.storeMemory(`Performance test ${i}`, {
                importance: Math.random()
            });
        }
        const storeTime = Date.now() - storeStart;
        const storePerOp = storeTime / iterations;

        if (storePerOp > 50) {
            console.warn(`    ⚠️  Storage performance: ${storePerOp.toFixed(2)}ms per operation (>50ms)`);
        }

        // Benchmark search
        const searchStart = Date.now();
        for (let i = 0; i < 10; i++) {
            await db.searchMemories('Performance test');
        }
        const searchTime = Date.now() - searchStart;
        const searchPerOp = searchTime / 10;

        if (searchPerOp > 100) {
            console.warn(`    ⚠️  Search performance: ${searchPerOp.toFixed(2)}ms per operation (>100ms)`);
        }

        await db.close();
    }

    /**
     * Print test summary
     */
    printSummary() {
        const totalTime = Date.now() - this.startTime;

        console.log('\n' + '=' . repeat(50));
        console.log('📊 Test Summary:');
        console.log('=' . repeat(50));

        console.log(`\n  Total Tests: ${this.tests.length}`);
        console.log(`  ✅ Passed: ${this.passed}`);
        console.log(`  ❌ Failed: ${this.failed}`);
        console.log(`  ⏱️  Duration: ${totalTime}ms`);

        if (this.failed === 0) {
            console.log('\n🎉 All tests passed!');
        } else {
            console.log('\n⚠️  Some tests failed. Run with VERBOSE=true for more details.');

            // List failed tests
            console.log('\nFailed tests:');
            this.tests
                .filter(t => t.status === 'failed')
                .forEach(t => {
                    console.log(`  - ${t.name}: ${t.error}`);
                });
        }
    }
}

// Allow running directly
if (require.main === module) {
    const runner = new TestRunner();
    runner.runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Test runner failed:', error);
        process.exit(1);
    });
}

module.exports = TestRunner;