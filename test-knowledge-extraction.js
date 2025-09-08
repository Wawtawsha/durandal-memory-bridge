const KnowledgeAnalyzer = require('./knowledge-analyzer');
const ClaudeMemoryDB = require('./db-client');

/**
 * Comprehensive test suite for Enhanced Knowledge Extraction
 * Phase 2, Feature 1 Testing
 */

class KnowledgeExtractionTester {
    constructor() {
        this.analyzer = new KnowledgeAnalyzer();
        this.db = new ClaudeMemoryDB();
        this.testResults = {
            passed: 0,
            failed: 0,
            total: 0,
            failures: []
        };
        this.testProject = null;
    }

    async runAllTests() {
        console.log('🧪 Starting Enhanced Knowledge Extraction Test Suite');
        console.log('=======================================================\n');

        try {
            // Setup test environment
            await this.setupTestEnvironment();

            // Run test categories
            await this.testPatternRecognition();
            await this.testContentScoring();
            await this.testCategoryIdentification();
            await this.testTagGeneration();
            await this.testTitleGeneration();
            await this.testDatabaseIntegration();
            await this.testDuplicateDetection();
            await this.testSearchFunctionality();
            await this.testPerformance();

            // Show results
            this.showResults();

        } catch (error) {
            console.error('❌ Test suite setup failed:', error.message);
        } finally {
            await this.cleanup();
        }
    }

    async setupTestEnvironment() {
        console.log('🔧 Setting up test environment...');
        
        // Test database connection
        const dbTest = await this.db.testConnection();
        if (!dbTest.success) {
            throw new Error(`Database connection failed: ${dbTest.error}`);
        }

        // Create test project
        try {
            this.testProject = await this.db.getProject('test-knowledge-extraction');
            if (!this.testProject) {
                this.testProject = await this.db.createProject(
                    'test-knowledge-extraction',
                    'Test project for knowledge extraction testing',
                    { test: true, created_by: 'test_suite' }
                );
            }
        } catch (error) {
            // Project might already exist
            this.testProject = await this.db.getProject('test-knowledge-extraction');
            if (!this.testProject) {
                throw error;
            }
        }

        console.log('✅ Test environment ready\n');
    }

    // ===========================================
    // PATTERN RECOGNITION TESTS
    // ===========================================

    async testPatternRecognition() {
        console.log('1️⃣ Testing Pattern Recognition...');

        const testCases = [
            {
                name: 'Solution Pattern Detection',
                content: "Here's how to fix the database connection issue: First, check your .env file...",
                expectedPatterns: ['solutions'],
                shouldExtract: true
            },
            {
                name: 'Code Example Pattern',
                content: "You can implement this using:\n```javascript\nconst client = new DatabaseClient();\n```",
                expectedPatterns: ['code_examples'],
                shouldExtract: true
            },
            {
                name: 'Configuration Pattern',
                content: "Set the DATABASE_URL to postgresql://localhost:5432/mydb in your .env file",
                expectedPatterns: ['configurations'],
                shouldExtract: true
            },
            {
                name: 'Explanation Pattern',
                content: "Let me explain why this works: The connection pool manages multiple database connections...",
                expectedPatterns: ['explanations'],
                shouldExtract: true
            },
            {
                name: 'Recommendation Pattern',
                content: "I recommend using PostgreSQL for this project because it offers better performance...",
                expectedPatterns: ['recommendations'],
                shouldExtract: true
            },
            {
                name: 'Procedure Pattern',
                content: "Follow these steps: 1. Install the package 2. Configure the settings 3. Test the connection",
                expectedPatterns: ['procedures'],
                shouldExtract: true
            },
            {
                name: 'Short Content (Should Not Extract)',
                content: "Yes, that's correct.",
                expectedPatterns: [],
                shouldExtract: false
            },
            {
                name: 'Casual Conversation (Should Not Extract)',
                content: "That sounds good! Let me know if you need help.",
                expectedPatterns: [],
                shouldExtract: false
            }
        ];

        for (const testCase of testCases) {
            try {
                const result = this.analyzer.analyzeContent(testCase.content);
                
                // Safely handle potentially undefined values
                const shouldExtract = result ? result.shouldExtract : false;
                const patterns = result && result.patterns ? result.patterns : [];
                
                // Check if extraction decision is correct
                const extractionCorrect = shouldExtract === testCase.shouldExtract;
                
                // Check if expected patterns were detected
                const detectedPatternTypes = patterns.map(p => p && p.type ? p.type : 'unknown');
                const patternsCorrect = testCase.expectedPatterns.every(expected => 
                    detectedPatternTypes.includes(expected)
                );

                if (extractionCorrect && (patternsCorrect || testCase.expectedPatterns.length === 0)) {
                    this.recordSuccess(testCase.name);
                } else {
                    this.recordFailure(testCase.name, {
                        expected: { extract: testCase.shouldExtract, patterns: testCase.expectedPatterns },
                        actual: { extract: shouldExtract, patterns: detectedPatternTypes },
                        score: result ? result.score : 'N/A',
                        fullResult: result
                    });
                }
            } catch (error) {
                this.recordFailure(testCase.name, {
                    error: error.message,
                    content: testCase.content.substring(0, 100)
                });
            }
        }

        console.log('');
    }

    // ===========================================
    // CONTENT SCORING TESTS
    // ===========================================

    async testContentScoring() {
        console.log('2️⃣ Testing Content Scoring...');

        const testCases = [
            {
                name: 'High Value Technical Solution',
                content: `Here's how to fix the PostgreSQL connection issue:

\`\`\`javascript
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});
\`\`\`

This approach uses connection pooling which is the best practice for production applications.`,
                expectedMinScore: 8,
                description: 'Should score high: solution + code + best practice'
            },
            {
                name: 'Medium Value Explanation',
                content: "The reason this happens is because JavaScript is asynchronous. When you make a database query, you need to wait for the response using async/await or promises.",
                expectedMinScore: 4,
                expectedMaxScore: 7,
                description: 'Should score medium: explanation with technical terms'
            },
            {
                name: 'Low Value Simple Response',
                content: "That looks good to me!",
                expectedMaxScore: 2,
                description: 'Should score low: simple acknowledgment'
            },
            {
                name: 'Configuration Instructions',
                content: "Add these lines to your package.json dependencies: pg, dotenv. Then create a .env file with DATABASE_URL=your_connection_string",
                expectedMinScore: 6,
                description: 'Should score well: configuration + specific instructions'
            }
        ];

        for (const testCase of testCases) {
            const result = this.analyzer.analyzeContent(testCase.content);
            const score = result.score;

            let passed = true;
            let errorMsg = '';

            if (testCase.expectedMinScore && score < testCase.expectedMinScore) {
                passed = false;
                errorMsg = `Score ${score} below minimum ${testCase.expectedMinScore}`;
            }

            if (testCase.expectedMaxScore && score > testCase.expectedMaxScore) {
                passed = false;
                errorMsg = `Score ${score} above maximum ${testCase.expectedMaxScore}`;
            }

            if (passed) {
                this.recordSuccess(testCase.name);
            } else {
                this.recordFailure(testCase.name, {
                    score: score,
                    expected: `${testCase.expectedMinScore || 0}-${testCase.expectedMaxScore || 'inf'}`,
                    error: errorMsg,
                    description: testCase.description
                });
            }
        }

        console.log('');
    }

    // ===========================================
    // CATEGORY IDENTIFICATION TESTS
    // ===========================================

    async testCategoryIdentification() {
        console.log('3️⃣ Testing Category Identification...');

        const testCases = [
            {
                name: 'Code Solution Category',
                content: "Here's the JavaScript function you need: ```function connectDB() { return new Pool(); }```",
                expectedCategories: ['solution', 'code'],
                description: 'Should identify both solution and code categories'
            },
            {
                name: 'Debugging Category',
                content: "This error occurs when the database connection fails. To debug this issue, check your connection string...",
                expectedCategories: ['debugging'],
                description: 'Should identify debugging category'
            },
            {
                name: 'Setup Category',
                content: "To install PostgreSQL on Ubuntu: sudo apt install postgresql postgresql-contrib",
                expectedCategories: ['setup'],
                description: 'Should identify setup category'
            }
        ];

        for (const testCase of testCases) {
            const result = this.analyzer.analyzeContent(testCase.content);
            const categories = result.categories;

            const hasExpectedCategories = testCase.expectedCategories.every(expected =>
                categories.includes(expected)
            );

            if (hasExpectedCategories) {
                this.recordSuccess(testCase.name);
            } else {
                this.recordFailure(testCase.name, {
                    expected: testCase.expectedCategories,
                    actual: categories,
                    description: testCase.description
                });
            }
        }

        console.log('');
    }

    // ===========================================
    // TAG GENERATION TESTS
    // ===========================================

    async testTagGeneration() {
        console.log('4️⃣ Testing Tag Generation...');

        const testCases = [
            {
                name: 'Database Tags',
                content: "Configure your PostgreSQL connection using the pg library in Node.js",
                expectedTags: ['postgresql', 'nodejs', 'configuration'],
                description: 'Should generate relevant technical tags'
            },
            {
                name: 'API Tags',
                content: "Here's how to make HTTP requests using axios: const response = await axios.get(url)",
                expectedTags: ['http', 'api', 'javascript'],
                description: 'Should identify API and JavaScript tags'
            }
        ];

        for (const testCase of testCases) {
            const result = this.analyzer.analyzeContent(testCase.content, testCase.userInput);
            const tags = result.tags.map(tag => tag.toLowerCase());

            const hasExpectedTags = testCase.expectedTags.some(expected =>
                tags.some(tag => tag.includes(expected.toLowerCase()) || expected.toLowerCase().includes(tag))
            );

            if (hasExpectedTags) {
                this.recordSuccess(testCase.name);
            } else {
                this.recordFailure(testCase.name, {
                    expected: testCase.expectedTags,
                    actual: tags,
                    description: testCase.description
                });
            }
        }

        console.log('');
    }

    // ===========================================
    // TITLE GENERATION TESTS
    // ===========================================

    async testTitleGeneration() {
        console.log('5️⃣ Testing Title Generation...');

        const testCases = [
            {
                name: 'Solution Title Generation',
                content: "The solution is to use connection pooling for better performance...",
                userInput: "How do I optimize database connections?",
                expectedToContain: ['solution', 'database', 'connection'],
                description: 'Should generate descriptive title based on solution and context'
            },
            {
                name: 'Configuration Title',
                content: "Set your DATABASE_URL environment variable to postgresql://...",
                userInput: "Database setup help",
                expectedToContain: ['configuration', 'database'],
                description: 'Should identify configuration topic'
            }
        ];

        for (const testCase of testCases) {
            const result = this.analyzer.analyzeContent(testCase.content, testCase.userInput);
            const title = result.suggestedTitle.toLowerCase();

            const containsExpected = testCase.expectedToContain.some(expected =>
                title.includes(expected.toLowerCase())
            );

            if (containsExpected && title.length > 10) {
                this.recordSuccess(testCase.name);
            } else {
                this.recordFailure(testCase.name, {
                    title: result.suggestedTitle,
                    expected: testCase.expectedToContain,
                    description: testCase.description
                });
            }
        }

        console.log('');
    }

    // ===========================================
    // DATABASE INTEGRATION TESTS
    // ===========================================

    async testDatabaseIntegration() {
        console.log('6️⃣ Testing Database Integration...');

        try {
            // Test 1: Save extracted knowledge
            const testContent = "Here's how to configure PostgreSQL: Set the connection string in your .env file like this: DATABASE_URL=postgresql://localhost:5432/mydb";
            const analysisResult = this.analyzer.analyzeContent(testContent, "How do I configure PostgreSQL?");

            if (analysisResult.shouldExtract) {
                const saved = await this.db.saveExtractedKnowledge(
                    this.testProject.id,
                    analysisResult,
                    testContent,
                    "How do I configure PostgreSQL?"
                );

                if (saved && saved.id) {
                    this.recordSuccess('Save Extracted Knowledge');
                } else {
                    this.recordFailure('Save Extracted Knowledge', 'Failed to save to database');
                }
            } else {
                this.recordFailure('Save Extracted Knowledge', 'Content was not marked for extraction');
            }

            // Test 2: Get recent extractions
            const recentExtractions = await this.db.getRecentExtractions(this.testProject.id, 5);
            if (Array.isArray(recentExtractions)) {
                this.recordSuccess('Get Recent Extractions');
            } else {
                this.recordFailure('Get Recent Extractions', 'Did not return array');
            }

            // Test 3: Get extraction stats
            const stats = await this.db.getExtractionStats(this.testProject.id);
            if (stats && typeof stats.total_extractions === 'number') {
                this.recordSuccess('Get Extraction Statistics');
            } else {
                this.recordFailure('Get Extraction Statistics', 'Invalid stats format');
            }

        } catch (error) {
            this.recordFailure('Database Integration', error.message);
        }

        console.log('');
    }

    // ===========================================
    // DUPLICATE DETECTION TESTS
    // ===========================================

    async testDuplicateDetection() {
        console.log('7️⃣ Testing Duplicate Detection...');

        try {
            const testContent = "PostgreSQL configuration involves setting up your database connection string.";
            const testTitle = "PostgreSQL Configuration Guide";

            // Check for duplicates (should return array even if empty)
            const duplicates = await this.db.checkForDuplicateKnowledge(
                this.testProject.id,
                testContent,
                testTitle
            );

            if (Array.isArray(duplicates)) {
                this.recordSuccess('Duplicate Detection Query');
            } else {
                this.recordFailure('Duplicate Detection Query', 'Did not return array');
            }

        } catch (error) {
            this.recordFailure('Duplicate Detection', error.message);
        }

        console.log('');
    }

    // ===========================================
    // SEARCH FUNCTIONALITY TESTS
    // ===========================================

    async testSearchFunctionality() {
        console.log('8️⃣ Testing Search Functionality...');

        try {
            // Test search functionality
            const searchResults = await this.db.searchExtractedKnowledge(
                this.testProject.id,
                'postgresql',
                10
            );

            if (Array.isArray(searchResults)) {
                this.recordSuccess('Knowledge Search');
            } else {
                this.recordFailure('Knowledge Search', 'Did not return array');
            }

        } catch (error) {
            this.recordFailure('Search Functionality', error.message);
        }

        console.log('');
    }

    // ===========================================
    // PERFORMANCE TESTS
    // ===========================================

    async testPerformance() {
        console.log('9️⃣ Testing Performance...');

        const testContent = `
        Here's a comprehensive solution for setting up a PostgreSQL database with Node.js:
        
        First, install the required packages:
        npm install pg dotenv
        
        Then configure your environment:
        DATABASE_URL=postgresql://username:password@localhost:5432/dbname
        
        Create your connection:
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        
        Best practices include using connection pooling and proper error handling.
        `;

        // Test analysis performance
        const startTime = Date.now();
        const result = this.analyzer.analyzeContent(testContent);
        const analysisTime = Date.now() - startTime;

        if (analysisTime < 100) { // Should complete in under 100ms
            this.recordSuccess('Analysis Performance');
        } else {
            this.recordFailure('Analysis Performance', `Took ${analysisTime}ms (expected <100ms)`);
        }

        // Test multiple rapid analyses
        const batchStartTime = Date.now();
        for (let i = 0; i < 10; i++) {
            this.analyzer.analyzeContent(testContent);
        }
        const batchTime = Date.now() - batchStartTime;

        if (batchTime < 500) { // 10 analyses should complete in under 500ms
            this.recordSuccess('Batch Analysis Performance');
        } else {
            this.recordFailure('Batch Analysis Performance', `Took ${batchTime}ms for 10 analyses`);
        }

        console.log('');
    }

    // ===========================================
    // UTILITY METHODS
    // ===========================================

    recordSuccess(testName) {
        console.log(`  ✅ ${testName}`);
        this.testResults.passed++;
        this.testResults.total++;
    }

    recordFailure(testName, details) {
        console.log(`  ❌ ${testName}`);
        this.testResults.failed++;
        this.testResults.total++;
        this.testResults.failures.push({ name: testName, details });
    }

    showResults() {
        console.log('📊 Test Results Summary');
        console.log('========================');
        console.log(`Total Tests: ${this.testResults.total}`);
        console.log(`✅ Passed: ${this.testResults.passed}`);
        console.log(`❌ Failed: ${this.testResults.failed}`);
        console.log(`Success Rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`);

        if (this.testResults.failures.length > 0) {
            console.log('\n🔍 Failure Details:');
            this.testResults.failures.forEach(failure => {
                console.log(`\n❌ ${failure.name}:`);
                console.log(`   ${JSON.stringify(failure.details, null, 2)}`);
            });
        }

        if (this.testResults.failed === 0) {
            console.log('\n🎉 All tests passed! Enhanced Knowledge Extraction is ready for integration.');
        } else {
            console.log('\n⚠️  Some tests failed. Review and fix issues before proceeding.');
        }
    }

    async cleanup() {
        try {
            await this.db.close();
        } catch (error) {
            console.log('⚠️  Cleanup warning:', error.message);
        }
    }
}

// Run tests if called directly
async function runTests() {
    const tester = new KnowledgeExtractionTester();
    await tester.runAllTests();
}

// Export for use in other modules
module.exports = KnowledgeExtractionTester;

// Run tests when script is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}
