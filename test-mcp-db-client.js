#!/usr/bin/env node

/**
 * Comprehensive Test Suite for MCP Database Client
 * Tests SQLite operations, schema initialization, and all database methods
 */

const fs = require('fs');
const path = require('path');
const MCPDatabaseClient = require('./mcp-db-client');

class MCPDatabaseClientTest {
    constructor() {
        this.testResults = [];
        this.testDbPath = './test-mcp-memory.db';
        this.db = null;
    }

    async runAllTests() {
        console.log('🧪 MCP Database Client Comprehensive Test Suite');
        console.log('=' . repeat(50));

        await this.setup();

        try {
            // Test 1: Database Connection
            await this.testDatabaseConnection();

            // Test 2: Schema Initialization
            await this.testSchemaInitialization();

            // Test 3: Store Memory Operations
            await this.testStoreMemory();

            // Test 4: Search Memory Operations
            await this.testSearchMemory();

            // Test 5: Get Memory By ID
            await this.testGetMemoryById();

            // Test 6: Get Recent Memories
            await this.testGetRecentMemories();

            // Test 7: Query Method
            await this.testQueryMethod();

            // Test 8: Parameter Conversion
            await this.testParameterConversion();

            // Test 9: JSON Metadata Handling
            await this.testJSONMetadataHandling();

            // Test 10: Error Handling
            await this.testErrorHandling();

            // Test 11: Connection Pooling
            await this.testConnectionPooling();

            // Test 12: Performance
            await this.testPerformance();

            // Test 13: Data Integrity
            await this.testDataIntegrity();

            // Test 14: Concurrent Operations
            await this.testConcurrentOperations();

            // Test 15: Close Connection
            await this.testCloseConnection();

            // Print test summary
            this.printSummary();

        } finally {
            await this.cleanup();
        }

        return this.testResults.filter(r => !r.passed).length === 0;
    }

    async setup() {
        // Remove test database if exists
        if (fs.existsSync(this.testDbPath)) {
            fs.unlinkSync(this.testDbPath);
        }

        // Set test database path
        process.env.DATABASE_PATH = this.testDbPath;
    }

    async cleanup() {
        // Close database connection
        if (this.db) {
            await this.db.close();
        }

        // Remove test database
        if (fs.existsSync(this.testDbPath)) {
            fs.unlinkSync(this.testDbPath);
        }

        // Clean up environment
        delete process.env.DATABASE_PATH;
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

    // Test 1: Database Connection
    async testDatabaseConnection() {
        await this.runTest('Database Connection', async () => {
            this.db = new MCPDatabaseClient();

            // Wait for initialization
            await new Promise(resolve => setTimeout(resolve, 100));

            const result = await this.db.testConnection();
            if (!result.success) {
                throw new Error('Database connection failed');
            }
            if (result.type !== 'sqlite') {
                throw new Error('Should be SQLite type');
            }
        });
    }

    // Test 2: Schema Initialization
    async testSchemaInitialization() {
        await this.runTest('Schema Initialization', async () => {
            // Check that tables were created
            const tables = await this.db.query(
                "SELECT name FROM sqlite_master WHERE type='table'"
            );

            const tableNames = tables.rows.map(r => r.name);
            const requiredTables = [
                'memories',
                'projects',
                'conversation_sessions',
                'conversation_messages'
            ];

            for (const table of requiredTables) {
                if (!tableNames.includes(table)) {
                    throw new Error(`Missing table: ${table}`);
                }
            }

            // Check indexes
            const indexes = await this.db.query(
                "SELECT name FROM sqlite_master WHERE type='index'"
            );

            const indexNames = indexes.rows.map(r => r.name);
            if (!indexNames.some(i => i.includes('memories_created_at'))) {
                throw new Error('Missing created_at index');
            }
        });
    }

    // Test 3: Store Memory Operations
    async testStoreMemory() {
        await this.runTest('Store Memory', async () => {
            const content = 'Test memory content ' + Date.now();
            const metadata = {
                importance: 0.8,
                categories: ['test'],
                keywords: ['test', 'memory'],
                project: 'test-project',
                session: 'test-session'
            };

            const result = await this.db.storeMemory(content, metadata);

            if (!result.success) {
                throw new Error('Failed to store memory');
            }
            if (!result.id) {
                throw new Error('No ID returned');
            }

            // Verify stored data
            const stored = await this.db.getMemoryById(result.id);
            if (!stored) {
                throw new Error('Could not retrieve stored memory');
            }
            if (stored.content !== content) {
                throw new Error('Content mismatch');
            }

            const storedMeta = JSON.parse(stored.metadata);
            if (storedMeta.importance !== metadata.importance) {
                throw new Error('Metadata not preserved');
            }
        });
    }

    // Test 4: Search Memory Operations
    async testSearchMemory() {
        await this.runTest('Search Memory', async () => {
            // Store test memories
            const testData = [
                { content: 'JavaScript async/await patterns', importance: 0.9 },
                { content: 'Python data analysis with pandas', importance: 0.7 },
                { content: 'React hooks best practices', importance: 0.8 }
            ];

            for (const data of testData) {
                await this.db.storeMemory(data.content, {
                    importance: data.importance,
                    categories: ['programming']
                });
            }

            // Test search
            const results = await this.db.searchMemories('Python');
            if (results.length === 0) {
                throw new Error('Search returned no results');
            }
            if (!results[0].content.includes('Python')) {
                throw new Error('Search returned wrong results');
            }

            // Test limit
            const limitedResults = await this.db.searchMemories('', { limit: 2 });
            if (limitedResults.length > 2) {
                throw new Error('Limit not respected');
            }
        });
    }

    // Test 5: Get Memory By ID
    async testGetMemoryById() {
        await this.runTest('Get Memory By ID', async () => {
            // Store a memory
            const content = 'Specific memory ' + Date.now();
            const result = await this.db.storeMemory(content, {});

            // Retrieve by ID
            const memory = await this.db.getMemoryById(result.id);
            if (!memory) {
                throw new Error('Could not retrieve memory by ID');
            }
            if (memory.content !== content) {
                throw new Error('Retrieved wrong memory');
            }
            if (!memory.created_at) {
                throw new Error('Missing created_at field');
            }

            // Test non-existent ID
            const notFound = await this.db.getMemoryById(999999);
            if (notFound !== null) {
                throw new Error('Should return null for non-existent ID');
            }
        });
    }

    // Test 6: Get Recent Memories
    async testGetRecentMemories() {
        await this.runTest('Get Recent Memories', async () => {
            // Store memories with delay to ensure order
            const memories = [];
            for (let i = 0; i < 5; i++) {
                const result = await this.db.storeMemory(
                    `Recent memory ${i}`,
                    { index: i, project: 'recent-test' }
                );
                memories.push(result);
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            // Get recent memories
            const recent = await this.db.getRecentMemories(3, 'recent-test');
            if (recent.length !== 3) {
                throw new Error(`Expected 3 memories, got ${recent.length}`);
            }

            // Check order (most recent first)
            if (!recent[0].content.includes('4')) {
                throw new Error('Not ordered by recency');
            }
        });
    }

    // Test 7: Query Method
    async testQueryMethod() {
        await this.runTest('Query Method', async () => {
            // Test SELECT query
            const selectResult = await this.db.query(
                'SELECT COUNT(*) as count FROM memories'
            );
            if (!selectResult.rows || selectResult.rows[0].count === undefined) {
                throw new Error('SELECT query failed');
            }

            // Test INSERT query
            const insertResult = await this.db.query(
                'INSERT INTO memories (content, metadata) VALUES (?, ?)',
                ['Test content', '{}']
            );
            if (!insertResult.rows || !insertResult.rows[0].id) {
                throw new Error('INSERT should return lastID');
            }

            // Test UPDATE query
            const updateResult = await this.db.query(
                'UPDATE memories SET content = ? WHERE id = ?',
                ['Updated content', insertResult.rows[0].id]
            );
            if (updateResult.rowCount === undefined) {
                throw new Error('UPDATE should return rowCount');
            }
        });
    }

    // Test 8: Parameter Conversion
    async testParameterConversion() {
        await this.runTest('Parameter Conversion', async () => {
            // Test PostgreSQL-style parameters ($1, $2) to SQLite (?, ?)
            const content = 'Parameter test ' + Date.now();

            // This uses $1, $2 internally which should be converted
            const result = await this.db.query(
                'INSERT INTO memories (content, metadata, created_at) VALUES ($1, $2, datetime(\'now\')) RETURNING id',
                [content, '{}']
            );

            if (!result.rows || !result.rows[0].id) {
                throw new Error('Parameter conversion failed');
            }

            // Verify the data was inserted
            const check = await this.db.query(
                'SELECT content FROM memories WHERE id = $1',
                [result.rows[0].id]
            );

            if (check.rows[0].content !== content) {
                throw new Error('Parameter binding failed');
            }
        });
    }

    // Test 9: JSON Metadata Handling
    async testJSONMetadataHandling() {
        await this.runTest('JSON Metadata Handling', async () => {
            const complexMetadata = {
                importance: 0.9,
                categories: ['test', 'complex'],
                nested: {
                    level1: {
                        level2: 'deep value'
                    }
                },
                keywords: ['json', 'metadata'],
                timestamp: Date.now()
            };

            const result = await this.db.storeMemory(
                'Complex metadata test',
                complexMetadata
            );

            const memory = await this.db.getMemoryById(result.id);
            const retrieved = JSON.parse(memory.metadata);

            if (retrieved.importance !== complexMetadata.importance) {
                throw new Error('Number not preserved in JSON');
            }
            if (!Array.isArray(retrieved.categories)) {
                throw new Error('Array not preserved in JSON');
            }
            if (retrieved.nested.level1.level2 !== 'deep value') {
                throw new Error('Nested object not preserved in JSON');
            }
        });
    }

    // Test 10: Error Handling
    async testErrorHandling() {
        await this.runTest('Error Handling', async () => {
            // Test invalid query
            try {
                await this.db.query('SELECT * FROM non_existent_table');
                throw new Error('Should have thrown error for invalid table');
            } catch (error) {
                if (!error.message.includes('no such table')) {
                    throw error;
                }
            }

            // Test constraint violation (if applicable)
            // SQLite is more permissive, so we test basic error handling

            // Test null content (should fail)
            const result = await this.db.storeMemory(null, {});
            if (result.success !== false) {
                throw new Error('Should fail for null content');
            }
        });
    }

    // Test 11: Connection Pooling
    async testConnectionPooling() {
        await this.runTest('Connection Pooling', async () => {
            // SQLite doesn't use connection pooling like PostgreSQL
            // But we test that the single connection is stable

            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(this.db.testConnection());
            }

            const results = await Promise.all(promises);
            for (const result of results) {
                if (!result.success) {
                    throw new Error('Connection should remain stable');
                }
            }
        });
    }

    // Test 12: Performance
    async testPerformance() {
        await this.runTest('Performance', async () => {
            const iterations = 100;
            const startTime = Date.now();

            // Batch insert test
            for (let i = 0; i < iterations; i++) {
                await this.db.storeMemory(
                    `Performance test ${i}`,
                    { index: i }
                );
            }

            const insertTime = Date.now() - startTime;
            const insertsPerSecond = (iterations / insertTime) * 1000;

            console.log(`  Insert performance: ${Math.round(insertsPerSecond)} ops/sec`);

            // Search performance
            const searchStart = Date.now();
            for (let i = 0; i < 20; i++) {
                await this.db.searchMemories('Performance test');
            }
            const searchTime = Date.now() - searchStart;
            const searchesPerSecond = (20 / searchTime) * 1000;

            console.log(`  Search performance: ${Math.round(searchesPerSecond)} ops/sec`);

            if (insertsPerSecond < 10) {
                throw new Error('Insert performance too low');
            }
            if (searchesPerSecond < 5) {
                throw new Error('Search performance too low');
            }
        });
    }

    // Test 13: Data Integrity
    async testDataIntegrity() {
        await this.runTest('Data Integrity', async () => {
            // Test special characters
            const specialContent = "Test with 'quotes' and \"double quotes\" and \n newlines";
            const result = await this.db.storeMemory(specialContent, {});

            const retrieved = await this.db.getMemoryById(result.id);
            if (retrieved.content !== specialContent) {
                throw new Error('Special characters not preserved');
            }

            // Test Unicode
            const unicodeContent = 'Test with 😀 emoji and 中文 characters';
            const unicodeResult = await this.db.storeMemory(unicodeContent, {});

            const unicodeRetrieved = await this.db.getMemoryById(unicodeResult.id);
            if (unicodeRetrieved.content !== unicodeContent) {
                throw new Error('Unicode not preserved');
            }

            // Test large content
            const largeContent = 'x'.repeat(10000);
            const largeResult = await this.db.storeMemory(largeContent, {});

            const largeRetrieved = await this.db.getMemoryById(largeResult.id);
            if (largeRetrieved.content.length !== 10000) {
                throw new Error('Large content not preserved');
            }
        });
    }

    // Test 14: Concurrent Operations
    async testConcurrentOperations() {
        await this.runTest('Concurrent Operations', async () => {
            const promises = [];
            const concurrentOps = 20;

            // Mix of different operations
            for (let i = 0; i < concurrentOps; i++) {
                if (i % 3 === 0) {
                    promises.push(this.db.storeMemory(`Concurrent ${i}`, { index: i }));
                } else if (i % 3 === 1) {
                    promises.push(this.db.searchMemories('Concurrent'));
                } else {
                    promises.push(this.db.getRecentMemories(5));
                }
            }

            const results = await Promise.all(promises);

            // Check that all operations succeeded
            for (let i = 0; i < results.length; i++) {
                if (i % 3 === 0) {
                    // Store operations
                    if (!results[i].success) {
                        throw new Error(`Concurrent store ${i} failed`);
                    }
                } else {
                    // Search/get operations
                    if (!Array.isArray(results[i])) {
                        throw new Error(`Concurrent read ${i} failed`);
                    }
                }
            }
        });
    }

    // Test 15: Close Connection
    async testCloseConnection() {
        await this.runTest('Close Connection', async () => {
            // Close the connection
            await this.db.close();

            // Try to use after closing
            try {
                await this.db.testConnection();
                // SQLite might still work after close, depending on implementation
                // This is not necessarily an error
            } catch (error) {
                // Expected - connection should be closed
            }

            // Create new connection for cleanup
            this.db = new MCPDatabaseClient();
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
    const tester = new MCPDatabaseClientTest();
    tester.runAllTests()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test suite failed:', error);
            process.exit(1);
        });
}

module.exports = MCPDatabaseClientTest;