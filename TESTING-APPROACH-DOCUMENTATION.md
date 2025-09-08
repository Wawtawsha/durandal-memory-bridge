# Testing Approach Documentation

## Overview

This document specifies a comprehensive testing strategy for the Durandal AI Development Assistant system that ensures reliability, performance, and maintainability across all components while supporting rapid development and deployment cycles.

## Design Principles

- **Test-Driven Confidence** - High test coverage enables rapid iteration
- **Realistic Scenarios** - Tests mirror actual usage patterns
- **Performance Validation** - Every component tested for performance characteristics
- **Integration Focus** - Component interactions thoroughly validated
- **Continuous Quality** - Automated testing in development workflow

## Testing Architecture

### 1. Testing Pyramid Structure

#### Unit Tests (Foundation - 70% of tests)
```javascript
// Component-level testing with isolated dependencies
describe('AIClient Unit Tests', () => {
    let aiClient;
    let mockAPIResponse;

    beforeEach(() => {
        aiClient = new AIClient('test-api-key');
        mockAPIResponse = {
            content: [{ text: 'Test response' }],
            usage: { input_tokens: 10, output_tokens: 5 }
        };
    });

    test('should format question properly', () => {
        const question = 'Test question';
        const context = 'Test context';
        const formatted = aiClient.formatRequest(question, context);
        
        expect(formatted.messages).toBeDefined();
        expect(formatted.messages[0].content).toContain(question);
        expect(formatted.messages[0].content).toContain(context);
    });

    test('should handle API rate limiting', async () => {
        // Mock rate limit response
        const rateLimitError = new Error('Rate limited');
        rateLimitError.status = 429;
        
        jest.spyOn(aiClient, 'makeAPICall').mockRejectedValue(rateLimitError);
        
        const result = await aiClient.ask('test question');
        
        expect(result.success).toBe(false);
        expect(result.errorType).toBe('rate_limit');
    });
});
```

#### Integration Tests (Middle - 20% of tests)
```javascript
// Cross-component interaction testing
describe('DevAssistant Integration Tests', () => {
    let devAssistant;
    
    beforeEach(async () => {
        devAssistant = new DevAssistant({
            apiKey: 'test-key',
            testMode: true
        });
        await devAssistant.initialize();
    });

    test('should analyze code file end-to-end', async () => {
        const testFile = path.join(__dirname, 'fixtures/sample-code.js');
        
        const result = await devAssistant.ask(
            'Explain what this code does',
            [testFile]
        );
        
        expect(result.success).toBe(true);
        expect(result.answer).toBeDefined();
        expect(result.filesAnalyzed).toContain(testFile);
        expect(result.tokensUsed).toBeGreaterThan(0);
    });

    test('should handle file processing with AI analysis', async () => {
        const pdfFile = path.join(__dirname, 'fixtures/sample-document.pdf');
        
        const result = await devAssistant.ask(
            'Summarize this document',
            [pdfFile]
        );
        
        expect(result.success).toBe(true);
        expect(result.fileTypes).toContain('pdf');
        expect(result.processingTime).toBeLessThan(30000); // Under 30 seconds
    });
});
```

#### End-to-End Tests (Top - 10% of tests)
```javascript
// Full system workflow testing
describe('Complete Workflow E2E Tests', () => {
    test('should complete developer productivity scenario', async () => {
        const devAssistant = new DevAssistant();
        
        // Simulate real developer workflow
        const workflow = [
            { action: 'analyze_legacy_code', files: ['legacy-system.js'] },
            { action: 'connect_database', config: testDbConfig },
            { action: 'generate_docs', target: 'api-endpoints' },
            { action: 'review_changes', context: 'performance' }
        ];
        
        const results = [];
        
        for (const step of workflow) {
            const result = await devAssistant.executeStep(step);
            results.push(result);
            expect(result.success).toBe(true);
        }
        
        // Validate workflow completion
        expect(results).toHaveLength(4);
        expect(results.every(r => r.success)).toBe(true);
    });
});
```

## Component-Specific Testing Strategies

### 1. AI Client Testing

#### Mock Strategy for External APIs
```javascript
class MockAIClient {
    constructor() {
        this.responses = new Map();
        this.callHistory = [];
        this.latencySimulation = 1000; // 1 second default
    }

    setMockResponse(questionPattern, response) {
        this.responses.set(questionPattern, response);
    }

    async ask(question, context = '') {
        this.callHistory.push({ question, context, timestamp: Date.now() });
        
        // Simulate API latency
        await this.sleep(this.latencySimulation);
        
        // Find matching mock response
        for (const [pattern, response] of this.responses) {
            if (question.includes(pattern) || new RegExp(pattern, 'i').test(question)) {
                return {
                    success: true,
                    answer: response,
                    tokensUsed: question.length + response.length
                };
            }
        }
        
        return {
            success: true,
            answer: 'Mock response for: ' + question.substring(0, 50),
            tokensUsed: 100
        };
    }

    getCallHistory() {
        return [...this.callHistory];
    }

    reset() {
        this.responses.clear();
        this.callHistory = [];
    }
}

describe('AI Client with Mocks', () => {
    let mockAIClient;
    
    beforeEach(() => {
        mockAIClient = new MockAIClient();
    });

    test('should handle different question types', async () => {
        mockAIClient.setMockResponse('explain', 'This code implements...');
        mockAIClient.setMockResponse('analyze', 'Analysis shows...');
        
        const explainResult = await mockAIClient.ask('explain this function');
        const analyzeResult = await mockAIClient.ask('analyze the performance');
        
        expect(explainResult.answer).toContain('This code implements');
        expect(analyzeResult.answer).toContain('Analysis shows');
    });

    test('should track token usage patterns', async () => {
        await mockAIClient.ask('short question');
        await mockAIClient.ask('this is a much longer question with more context');
        
        const history = mockAIClient.getCallHistory();
        
        expect(history).toHaveLength(2);
        expect(history[1].question.length).toBeGreaterThan(history[0].question.length);
    });
});
```

### 2. Database Testing

#### Test Database Strategy
```javascript
describe('Database Operations', () => {
    let testDb;
    let originalDb;
    
    beforeAll(async () => {
        // Set up isolated test database
        testDb = new sqlite3.Database(':memory:');
        await initializeTestSchema(testDb);
        
        // Replace production database with test database
        originalDb = global.db;
        global.db = testDb;
    });
    
    afterAll(async () => {
        await testDb.close();
        global.db = originalDb;
    });
    
    beforeEach(async () => {
        // Clean slate for each test
        await clearTestData(testDb);
        await seedTestData(testDb);
    });

    test('should store and retrieve conversation history', async () => {
        const sessionId = 'test-session-123';
        const conversation = {
            question: 'Test question',
            response: 'Test response',
            context: ['file1.js', 'file2.js']
        };
        
        await storeConversation(sessionId, conversation);
        const retrieved = await getConversationHistory(sessionId);
        
        expect(retrieved).toHaveLength(1);
        expect(retrieved[0].question).toBe(conversation.question);
        expect(retrieved[0].context).toEqual(conversation.context);
    });

    test('should handle concurrent database operations', async () => {
        const operations = Array.from({ length: 10 }, (_, i) => 
            storeConversation(`session-${i}`, {
                question: `Question ${i}`,
                response: `Response ${i}`,
                context: []
            })
        );
        
        await Promise.all(operations);
        
        const allSessions = await getAllSessions();
        expect(allSessions).toHaveLength(10);
    });
});
```

### 3. File Processing Testing

#### File Format Test Suite
```javascript
describe('File Processing Tests', () => {
    const testFilesDir = path.join(__dirname, 'fixtures');
    
    beforeAll(async () => {
        await createTestFiles();
    });
    
    afterAll(async () => {
        await cleanupTestFiles();
    });

    describe('PDF Processing', () => {
        test('should extract text from PDF', async () => {
            const pdfPath = path.join(testFilesDir, 'sample.pdf');
            const result = await fileManager.parsePDF(pdfPath);
            
            expect(result.text).toBeDefined();
            expect(result.pageCount).toBeGreaterThan(0);
            expect(result.metadata.title).toBeDefined();
        });

        test('should handle corrupted PDF gracefully', async () => {
            const corruptedPdfPath = path.join(testFilesDir, 'corrupted.pdf');
            
            const result = await fileManager.parsePDF(corruptedPdfPath);
            
            expect(result.success).toBe(false);
            expect(result.errorType).toBe('corrupted_file');
            expect(result.fallbackUsed).toBe(true);
        });
    });

    describe('Spreadsheet Processing', () => {
        test('should parse Excel file with multiple sheets', async () => {
            const xlsxPath = path.join(testFilesDir, 'sample.xlsx');
            const result = await fileManager.parseSpreadsheet(xlsxPath);
            
            expect(result.sheets).toBeDefined();
            expect(result.sheets.length).toBeGreaterThan(0);
            expect(result.sheets[0].data).toBeDefined();
        });

        test('should handle large spreadsheets efficiently', async () => {
            const largePath = path.join(testFilesDir, 'large-data.xlsx');
            
            const startTime = Date.now();
            const result = await fileManager.parseSpreadsheet(largePath);
            const processingTime = Date.now() - startTime;
            
            expect(processingTime).toBeLessThan(10000); // Under 10 seconds
            expect(result.sheets[0].data.length).toBeGreaterThan(1000);
        });
    });
});
```

## Performance Testing Framework

### 1. Load Testing Strategy
```javascript
describe('Performance Tests', () => {
    test('should handle concurrent AI requests', async () => {
        const devAssistant = new DevAssistant();
        const concurrentRequests = 10;
        
        const requests = Array.from({ length: concurrentRequests }, (_, i) => 
            devAssistant.ask(`Question ${i}`, [])
        );
        
        const startTime = Date.now();
        const results = await Promise.all(requests);
        const totalTime = Date.now() - startTime;
        
        expect(results.every(r => r.success)).toBe(true);
        expect(totalTime).toBeLessThan(30000); // Under 30 seconds for 10 requests
        
        // Check resource usage
        const memoryUsage = process.memoryUsage();
        expect(memoryUsage.heapUsed / 1024 / 1024).toBeLessThan(500); // Under 500MB
    });

    test('should maintain performance under sustained load', async () => {
        const devAssistant = new DevAssistant();
        const responseTimes = [];
        
        for (let i = 0; i < 50; i++) {
            const startTime = Date.now();
            
            await devAssistant.ask(`Load test question ${i}`, []);
            
            responseTimes.push(Date.now() - startTime);
            
            // Small delay between requests
            await sleep(100);
        }
        
        // Analyze performance degradation
        const firstTen = responseTimes.slice(0, 10);
        const lastTen = responseTimes.slice(-10);
        
        const avgFirst = firstTen.reduce((a, b) => a + b) / firstTen.length;
        const avgLast = lastTen.reduce((a, b) => a + b) / lastTen.length;
        
        // Performance should not degrade by more than 50%
        expect(avgLast).toBeLessThan(avgFirst * 1.5);
    });
});
```

### 2. Memory and Resource Testing
```javascript
describe('Resource Management Tests', () => {
    test('should not leak memory during file processing', async () => {
        const fileManager = new FileManager();
        const initialMemory = process.memoryUsage().heapUsed;
        
        // Process many files
        for (let i = 0; i < 100; i++) {
            await fileManager.readFile(`test-file-${i}.txt`);
            
            // Force garbage collection periodically
            if (i % 10 === 0) {
                global.gc && global.gc();
            }
        }
        
        global.gc && global.gc();
        const finalMemory = process.memoryUsage().heapUsed;
        
        // Memory should not increase by more than 50MB
        const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;
        expect(memoryIncrease).toBeLessThan(50);
    });

    test('should handle large context without memory overflow', async () => {
        const devAssistant = new DevAssistant();
        const largeContext = 'x'.repeat(100000); // 100KB string
        
        const result = await devAssistant.ask('Summarize this', [], largeContext);
        
        expect(result.success).toBe(true);
        
        const memoryUsage = process.memoryUsage();
        expect(memoryUsage.heapUsed / 1024 / 1024).toBeLessThan(1000); // Under 1GB
    });
});
```

## Error Scenario Testing

### 1. Comprehensive Error Testing
```javascript
describe('Error Handling Tests', () => {
    describe('Network Failures', () => {
        test('should handle API timeouts gracefully', async () => {
            const aiClient = new AIClient();
            
            // Mock timeout error
            jest.spyOn(aiClient, 'makeAPICall').mockImplementation(() => {
                return new Promise((_, reject) => {
                    setTimeout(() => {
                        const error = new Error('Request timeout');
                        error.code = 'ETIMEDOUT';
                        reject(error);
                    }, 100);
                });
            });
            
            const result = await aiClient.ask('test question');
            
            expect(result.success).toBe(false);
            expect(result.errorType).toBe('network_timeout');
            expect(result.canRetry).toBe(true);
        });

        test('should implement exponential backoff on retries', async () => {
            const aiClient = new AIClient();
            let attemptCount = 0;
            const attemptTimes = [];
            
            jest.spyOn(aiClient, 'makeAPICall').mockImplementation(() => {
                attemptTimes.push(Date.now());
                attemptCount++;
                
                if (attemptCount <= 3) {
                    const error = new Error('Server error');
                    error.status = 500;
                    throw error;
                }
                
                return Promise.resolve({ content: [{ text: 'Success' }] });
            });
            
            const result = await aiClient.ask('test question');
            
            expect(result.success).toBe(true);
            expect(attemptCount).toBe(4); // Initial + 3 retries
            
            // Verify exponential backoff
            expect(attemptTimes[1] - attemptTimes[0]).toBeGreaterThanOrEqual(1000);
            expect(attemptTimes[2] - attemptTimes[1]).toBeGreaterThanOrEqual(2000);
            expect(attemptTimes[3] - attemptTimes[2]).toBeGreaterThanOrEqual(4000);
        });
    });

    describe('File System Errors', () => {
        test('should handle permission denied errors', async () => {
            const fileManager = new FileManager();
            
            jest.spyOn(fs, 'readFile').mockRejectedValue({
                code: 'EACCES',
                path: '/restricted/file.txt'
            });
            
            const result = await fileManager.readFile('/restricted/file.txt');
            
            expect(result.success).toBe(false);
            expect(result.errorType).toBe('permission_denied');
            expect(result.suggestion).toContain('Check file permissions');
        });

        test('should provide fallback for corrupted files', async () => {
            const fileManager = new FileManager();
            const corruptedFile = 'corrupted-data.json';
            
            // First call fails with JSON parse error
            jest.spyOn(JSON, 'parse').mockImplementationOnce(() => {
                throw new SyntaxError('Unexpected token');
            });
            
            // Second call (fallback) succeeds with plain text
            jest.spyOn(fs, 'readFile').mockResolvedValue('raw file content');
            
            const result = await fileManager.parseFile(corruptedFile);
            
            expect(result.success).toBe(true);
            expect(result.fallbackUsed).toBe(true);
            expect(result.content).toBe('raw file content');
        });
    });
});
```

## Test Data Management

### 1. Fixture Management System
```javascript
class TestDataManager {
    constructor() {
        this.fixturesDir = path.join(__dirname, 'fixtures');
        this.tempDir = path.join(__dirname, 'temp');
    }

    async createTestFiles() {
        await fs.ensureDir(this.fixturesDir);
        await fs.ensureDir(this.tempDir);
        
        // Create sample code files
        await this.createSampleCode();
        await this.createSampleDocuments();
        await this.createSampleData();
    }

    async createSampleCode() {
        const sampleJS = `
            function calculateTotal(items) {
                return items.reduce((sum, item) => sum + item.price, 0);
            }
            
            class ShoppingCart {
                constructor() {
                    this.items = [];
                }
                
                addItem(item) {
                    this.items.push(item);
                }
                
                getTotal() {
                    return calculateTotal(this.items);
                }
            }
            
            module.exports = { calculateTotal, ShoppingCart };
        `;
        
        await fs.writeFile(
            path.join(this.fixturesDir, 'sample-code.js'), 
            sampleJS
        );
        
        const samplePython = `
            def fibonacci(n):
                if n <= 1:
                    return n
                return fibonacci(n-1) + fibonacci(n-2)
            
            class DataProcessor:
                def __init__(self):
                    self.data = []
                
                def add_data(self, item):
                    self.data.append(item)
                
                def process(self):
                    return [fibonacci(x) for x in self.data]
        `;
        
        await fs.writeFile(
            path.join(this.fixturesDir, 'sample-code.py'), 
            samplePython
        );
    }

    async createSampleDocuments() {
        // Create a sample PDF (mock)
        await fs.writeFile(
            path.join(this.fixturesDir, 'sample.pdf'),
            'Mock PDF content for testing'
        );
        
        // Create sample Excel data
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Test Data');
        
        worksheet.columns = [
            { header: 'Name', key: 'name', width: 15 },
            { header: 'Age', key: 'age', width: 10 },
            { header: 'Department', key: 'department', width: 20 }
        ];
        
        for (let i = 1; i <= 1000; i++) {
            worksheet.addRow({
                name: `User ${i}`,
                age: Math.floor(Math.random() * 50) + 20,
                department: ['IT', 'HR', 'Finance', 'Marketing'][Math.floor(Math.random() * 4)]
            });
        }
        
        await workbook.xlsx.writeFile(
            path.join(this.fixturesDir, 'sample.xlsx')
        );
    }

    async cleanup() {
        await fs.remove(this.tempDir);
    }
}
```

## Continuous Integration Testing

### 1. GitHub Actions Workflow
```yaml
name: Comprehensive Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run unit tests
      run: npm run test:unit
    
    - name: Generate coverage report
      run: npm run test:coverage
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: durandal_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run database migrations
      run: npm run db:migrate
      env:
        DATABASE_URL: postgres://postgres:postgres@localhost:5432/durandal_test
    
    - name: Run integration tests
      run: npm run test:integration
      env:
        DATABASE_URL: postgres://postgres:postgres@localhost:5432/durandal_test
        ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY_TEST }}

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run E2E tests
      run: npm run test:e2e
      env:
        ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY_TEST }}

  performance-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run performance tests
      run: npm run test:performance
    
    - name: Generate performance report
      run: npm run performance:report
```

### 2. Test Scripts Configuration
```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "jest --testPathPattern=e2e",
    "test:performance": "jest --testPathPattern=performance",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "test:quick": "jest --testPathPattern=unit --bail",
    "performance:report": "node scripts/generate-performance-report.js"
  },
  "jest": {
    "testEnvironment": "node",
    "coverageDirectory": "coverage",
    "collectCoverageFrom": [
      "*.js",
      "!node_modules/**",
      "!coverage/**",
      "!jest.config.js"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 85,
        "lines": 90,
        "statements": 90
      }
    }
  }
}
```

## Test Documentation and Reporting

### 1. Automated Test Documentation
```javascript
class TestDocumentationGenerator {
    constructor() {
        this.testResults = [];
        this.performanceMetrics = new Map();
    }

    generateTestReport(results) {
        const report = {
            summary: this.generateSummary(results),
            coverage: this.getCoverageReport(),
            performance: this.getPerformanceReport(),
            failures: this.getFailureAnalysis(results),
            recommendations: this.generateRecommendations(results)
        };

        return report;
    }

    generateSummary(results) {
        return {
            totalTests: results.numTotalTests,
            passedTests: results.numPassedTests,
            failedTests: results.numFailedTests,
            successRate: (results.numPassedTests / results.numTotalTests * 100).toFixed(2) + '%',
            executionTime: results.testExecTime + 'ms'
        };
    }

    getFailureAnalysis(results) {
        return results.testResults
            .filter(test => test.status === 'failed')
            .map(test => ({
                name: test.fullName,
                error: test.failureMessage,
                category: this.categorizeFailure(test.failureMessage),
                suggestion: this.suggestFix(test.failureMessage)
            }));
    }

    generateRecommendations(results) {
        const recommendations = [];
        
        if (results.numFailedTests > 0) {
            recommendations.push('Address failing tests before deployment');
        }
        
        const successRate = results.numPassedTests / results.numTotalTests;
        if (successRate < 0.95) {
            recommendations.push('Improve test reliability - success rate below 95%');
        }
        
        return recommendations;
    }
}
```

This comprehensive testing approach ensures robust system validation across all components while supporting rapid development and maintaining high quality standards.