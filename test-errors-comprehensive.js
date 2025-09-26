#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Error Classes
 * Tests all error types, error hierarchy, recovery hints, and error handling
 */

const {
    MCPError,
    ValidationError,
    DatabaseError,
    CacheError,
    ProtocolError,
    ConfigurationError,
    FileSystemError,
    ResourceError,
    ErrorHandler
} = require('./errors');
const Logger = require('./logger');

class ErrorsComprehensiveTest {
    constructor() {
        this.testResults = [];
        this.mockLogger = {
            error: () => {} // Silent logger for testing
        };
    }

    async runAllTests() {
        console.log('🧪 Errors Comprehensive Test Suite');
        console.log('=' . repeat(50));

        // Test 1: Base MCPError Class
        await this.testMCPErrorClass();

        // Test 2: ValidationError
        await this.testValidationError();

        // Test 3: DatabaseError
        await this.testDatabaseError();

        // Test 4: CacheError
        await this.testCacheError();

        // Test 5: ProtocolError
        await this.testProtocolError();

        // Test 6: ConfigurationError
        await this.testConfigurationError();

        // Test 7: FileSystemError
        await this.testFileSystemError();

        // Test 8: ResourceError
        await this.testResourceError();

        // Test 9: ErrorHandler Wrapper
        await this.testErrorHandler();

        // Test 10: Error Serialization
        await this.testErrorSerialization();

        // Test 11: Error Recovery Hints
        await this.testErrorRecoveryHints();

        // Test 12: Error Context Preservation
        await this.testErrorContextPreservation();

        // Print test summary
        this.printSummary();

        return this.testResults.filter(r => !r.passed).length === 0;
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

    // Test 1: Base MCPError Class
    async testMCPErrorClass() {
        await this.runTest('Base MCPError Class', () => {
            const error = new MCPError(
                'Test error',
                'TEST_ERROR',
                { key: 'value' },
                'Try restarting'
            );

            // Check properties
            if (error.message !== 'Test error') {
                throw new Error('Message not set correctly');
            }
            if (error.code !== 'TEST_ERROR') {
                throw new Error('Code not set correctly');
            }
            if (error.context.key !== 'value') {
                throw new Error('Context not set correctly');
            }
            if (error.recovery !== 'Try restarting') {
                throw new Error('Recovery not set correctly');
            }
            if (!error.timestamp) {
                throw new Error('Timestamp not set');
            }
            if (!error.stack) {
                throw new Error('Stack trace not captured');
            }

            // Test toJSON
            const json = error.toJSON();
            if (!json.name || !json.message || !json.code) {
                throw new Error('toJSON missing required fields');
            }

            // Test toString
            const str = error.toString();
            if (!str.includes('TEST_ERROR')) {
                throw new Error('toString should include code');
            }
            if (!str.includes('Try restarting')) {
                throw new Error('toString should include recovery');
            }
        });
    }

    // Test 2: ValidationError
    async testValidationError() {
        await this.runTest('ValidationError', () => {
            // Test with field and value
            let error = new ValidationError(
                'Invalid input',
                'username',
                123
            );

            if (error.code !== 'VALIDATION_ERROR') {
                throw new Error('Should have VALIDATION_ERROR code');
            }
            if (error.context.field !== 'username') {
                throw new Error('Field not in context');
            }
            if (error.context.value !== 123) {
                throw new Error('Value not in context');
            }
            if (!error.recovery.includes('Check input')) {
                throw new Error('Should have validation recovery hint');
            }

            // Test without field/value
            error = new ValidationError('General validation error');
            if (error.context.field !== undefined) {
                throw new Error('Should not have field when not provided');
            }
        });
    }

    // Test 3: DatabaseError
    async testDatabaseError() {
        await this.runTest('DatabaseError', () => {
            // Test with SQLite error codes
            const sqliteErrors = [
                { code: 'SQLITE_CANTOPEN', recovery: 'valid and writable' },
                { code: 'SQLITE_BUSY', recovery: 'locked' },
                { code: 'SQLITE_CORRUPT', recovery: 'corrupted' }
            ];

            for (const testCase of sqliteErrors) {
                const originalError = new Error('DB Error');
                originalError.code = testCase.code;

                const error = new DatabaseError(
                    'Operation failed',
                    'SELECT',
                    originalError
                );

                if (!error.recovery.includes(testCase.recovery)) {
                    throw new Error(`Wrong recovery for ${testCase.code}`);
                }
                if (error.context.sqliteCode !== testCase.code) {
                    throw new Error('SQLite code not preserved');
                }
            }

            // Test generic database error
            const error = new DatabaseError('Connection lost');
            if (error.code !== 'DATABASE_ERROR') {
                throw new Error('Should have DATABASE_ERROR code');
            }
        });
    }

    // Test 4: CacheError
    async testCacheError() {
        await this.runTest('CacheError', () => {
            const error = new CacheError(
                'Cache miss',
                'get'
            );

            if (error.code !== 'CACHE_ERROR') {
                throw new Error('Should have CACHE_ERROR code');
            }
            if (error.context.operation !== 'get') {
                throw new Error('Operation not in context');
            }
            if (!error.recovery.includes('falling back')) {
                throw new Error('Should mention fallback');
            }
        });
    }

    // Test 5: ProtocolError
    async testProtocolError() {
        await this.runTest('ProtocolError', () => {
            // Test with verbose mode
            process.env.VERBOSE = 'true';
            let error = new ProtocolError(
                'Invalid request',
                'store_memory',
                { content: 'test', metadata: {} }
            );

            if (error.context.tool !== 'store_memory') {
                throw new Error('Tool name not in context');
            }
            if (!error.context.request) {
                throw new Error('Request should be included in verbose mode');
            }

            // Test without verbose mode
            delete process.env.VERBOSE;
            error = new ProtocolError(
                'Invalid request',
                'store_memory',
                { content: 'x'.repeat(1000) }
            );

            if (error.context.request) {
                throw new Error('Request should not be included in non-verbose');
            }
            if (!error.context.requestSize) {
                throw new Error('Should include request size instead');
            }
        });
    }

    // Test 6: ConfigurationError
    async testConfigurationError() {
        await this.runTest('ConfigurationError', () => {
            const error = new ConfigurationError(
                'Invalid config',
                'API_KEY',
                'invalid-key'
            );

            if (error.code !== 'CONFIGURATION_ERROR') {
                throw new Error('Should have CONFIGURATION_ERROR code');
            }
            if (error.context.key !== 'API_KEY') {
                throw new Error('Config key not in context');
            }
            if (error.context.value !== 'invalid-key') {
                throw new Error('Config value not in context');
            }
            if (!error.recovery.includes('environment variables')) {
                throw new Error('Should mention environment variables');
            }
        });
    }

    // Test 7: FileSystemError
    async testFileSystemError() {
        await this.runTest('FileSystemError', () => {
            // Test with different fs error codes
            const fsErrors = [
                { code: 'ENOENT', recovery: 'does not exist' },
                { code: 'EACCES', recovery: 'Permission denied' },
                { code: 'ENOSPC', recovery: 'No space left' }
            ];

            for (const testCase of fsErrors) {
                const originalError = new Error('FS Error');
                originalError.code = testCase.code;

                const error = new FileSystemError(
                    'File operation failed',
                    '/test/path',
                    'write',
                    originalError
                );

                if (!error.recovery.includes(testCase.recovery)) {
                    throw new Error(`Wrong recovery for ${testCase.code}`);
                }
                if (error.context.fsCode !== testCase.code) {
                    throw new Error('FS code not preserved');
                }
                if (error.context.path !== '/test/path') {
                    throw new Error('Path not in context');
                }
            }
        });
    }

    // Test 8: ResourceError
    async testResourceError() {
        await this.runTest('ResourceError', () => {
            const error = new ResourceError(
                'Memory limit exceeded',
                'heap',
                512,
                600
            );

            if (error.code !== 'RESOURCE_ERROR') {
                throw new Error('Should have RESOURCE_ERROR code');
            }
            if (error.context.resource !== 'heap') {
                throw new Error('Resource not in context');
            }
            if (error.context.limit !== 512) {
                throw new Error('Limit not in context');
            }
            if (error.context.current !== 600) {
                throw new Error('Current value not in context');
            }
            if (!error.recovery.includes('resource limits')) {
                throw new Error('Should mention resource limits');
            }
        });
    }

    // Test 9: ErrorHandler Wrapper
    async testErrorHandler() {
        await this.runTest('ErrorHandler Wrapper', () => {
            const handler = new ErrorHandler(this.mockLogger);

            // Test wrapping regular error
            const regularError = new Error('Regular error');
            const wrapped = handler.wrap(regularError, 'Default message');

            if (!(wrapped instanceof MCPError)) {
                throw new Error('Should wrap as MCPError');
            }
            if (wrapped.code !== 'UNKNOWN_ERROR') {
                throw new Error('Should have UNKNOWN_ERROR code');
            }

            // Test wrapping SQLite error
            const sqliteError = new Error('SQLite error');
            sqliteError.code = 'SQLITE_BUSY';
            const dbWrapped = handler.wrap(sqliteError);

            if (!(dbWrapped instanceof DatabaseError)) {
                throw new Error('Should wrap SQLite error as DatabaseError');
            }

            // Test wrapping filesystem error
            const fsError = new Error('FS error');
            fsError.code = 'ENOENT';
            const fsWrapped = handler.wrap(fsError);

            if (!(fsWrapped instanceof FileSystemError)) {
                throw new Error('Should wrap fs error as FileSystemError');
            }

            // Test handling with response formatting
            const response = handler.handle(new ValidationError('Bad input'), 'req-123');
            if (!response.error) {
                throw new Error('Should return error object');
            }
            if (!response.error.message) {
                throw new Error('Error response should have message');
            }
        });
    }

    // Test 10: Error Serialization
    async testErrorSerialization() {
        await this.runTest('Error Serialization', () => {
            const error = new DatabaseError(
                'Query failed',
                'SELECT',
                new Error('Timeout')
            );

            // Test JSON serialization
            const json = JSON.stringify(error.toJSON());
            const parsed = JSON.parse(json);

            if (parsed.name !== 'DatabaseError') {
                throw new Error('Name not preserved in JSON');
            }
            if (parsed.code !== 'DATABASE_ERROR') {
                throw new Error('Code not preserved in JSON');
            }
            if (!parsed.context.originalError) {
                throw new Error('Original error not in JSON');
            }
            if (!parsed.timestamp) {
                throw new Error('Timestamp not in JSON');
            }

            // Test that circular references don't break serialization
            const circular = { ref: null };
            circular.ref = circular;
            const circularError = new MCPError('Test', 'TEST', circular);

            try {
                JSON.stringify(circularError.toJSON());
                // Should not throw
            } catch (e) {
                throw new Error('Should handle circular references');
            }
        });
    }

    // Test 11: Error Recovery Hints
    async testErrorRecoveryHints() {
        await this.runTest('Error Recovery Hints', () => {
            const errors = [
                {
                    error: new ValidationError('Bad input'),
                    expectedRecovery: 'Check input parameters'
                },
                {
                    error: new DatabaseError('Connection failed'),
                    expectedRecovery: 'connectivity'
                },
                {
                    error: new CacheError('Cache full'),
                    expectedRecovery: 'falling back'
                },
                {
                    error: new ConfigurationError('Missing key'),
                    expectedRecovery: 'environment'
                },
                {
                    error: new ResourceError('Out of memory'),
                    expectedRecovery: 'resource limits'
                }
            ];

            for (const testCase of errors) {
                if (!testCase.error.recovery.includes(testCase.expectedRecovery)) {
                    throw new Error(
                        `${testCase.error.constructor.name} missing expected recovery hint`
                    );
                }
            }
        });
    }

    // Test 12: Error Context Preservation
    async testErrorContextPreservation() {
        await this.runTest('Error Context Preservation', () => {
            // Create nested error scenario
            const originalError = new Error('Original cause');
            originalError.customProp = 'preserved';

            const dbError = new DatabaseError(
                'Query failed',
                'INSERT',
                originalError
            );

            if (!dbError.context.originalError.includes('Original cause')) {
                throw new Error('Original error message not preserved');
            }
            if (dbError.context.operation !== 'INSERT') {
                throw new Error('Operation not preserved');
            }

            // Test error handler context preservation
            const handler = new ErrorHandler(this.mockLogger);
            const wrapped = handler.wrap(originalError, 'Wrapper message', {
                additionalContext: 'test',
                requestId: '123'
            });

            if (wrapped.context.additionalContext !== 'test') {
                throw new Error('Additional context not preserved');
            }
            if (wrapped.context.requestId !== '123') {
                throw new Error('Request ID not preserved');
            }
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
    const tester = new ErrorsComprehensiveTest();
    tester.runAllTests()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test suite failed:', error);
            process.exit(1);
        });
}

module.exports = ErrorsComprehensiveTest;