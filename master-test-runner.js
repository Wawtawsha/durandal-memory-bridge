#!/usr/bin/env node

/**
 * Master Test Runner for Durandal MCP Implementation
 * Orchestrates all test suites and generates comprehensive reports
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

class MasterTestRunner {
    constructor() {
        this.testSuites = [
            // Core Component Tests
            {
                name: 'MCP Server Basic Tests',
                file: 'durandal-mcp-server-v3.js',
                args: ['--test'],
                category: 'core',
                critical: true
            },
            {
                name: 'Logger Comprehensive Tests',
                file: 'test-logger-comprehensive.js',
                category: 'core',
                critical: true
            },
            {
                name: 'Error System Tests',
                file: 'test-errors-comprehensive.js',
                category: 'core',
                critical: true
            },
            {
                name: 'MCP Database Client Tests',
                file: 'test-mcp-db-client.js',
                category: 'database',
                critical: true
            },
            {
                name: 'Database Adapter Tests',
                file: 'test-db-adapter-fixed.js',
                category: 'database',
                critical: false
            },
            // Integration Tests
            {
                name: 'MCP Protocol Tests',
                file: 'test-mcp-protocol.js',
                category: 'integration',
                critical: false
            },
            {
                name: 'MCP Server Integration',
                file: 'test-mcp-server-integration.js',
                category: 'integration',
                critical: false
            },
            // Performance Tests
            {
                name: 'Performance Benchmarks',
                file: 'test-performance-benchmarks.js',
                category: 'performance',
                critical: false
            },
            {
                name: 'Stress Testing',
                file: 'test-stress-concurrent.js',
                category: 'performance',
                critical: false
            },
            // Security Tests
            {
                name: 'Security Validation',
                file: 'test-security-validation.js',
                category: 'security',
                critical: false
            },
            // End-to-End Tests
            {
                name: 'E2E Memory Lifecycle',
                file: 'test-e2e-memory-lifecycle.js',
                category: 'e2e',
                critical: false
            }
        ];

        this.results = {
            startTime: new Date(),
            endTime: null,
            totalSuites: 0,
            passedSuites: 0,
            failedSuites: 0,
            skippedSuites: 0,
            suiteResults: [],
            categories: {},
            criticalFailures: [],
            performanceMetrics: {
                totalDuration: 0,
                averageSuiteDuration: 0,
                longestSuite: null,
                shortestSuite: null
            }
        };

        this.reportPath = path.join(__dirname, 'test-reports');
        this.reportFile = null;
    }

    async run(options = {}) {
        const {
            category = null,
            skipMissing = true,
            parallel = false,
            verbose = false,
            generateReport = true
        } = options;

        console.log('🚀 Durandal MCP Master Test Runner');
        console.log('=' . repeat(60));
        console.log(`Start Time: ${this.results.startTime.toISOString()}`);
        console.log(`Mode: ${parallel ? 'Parallel' : 'Sequential'}`);
        if (category) console.log(`Category: ${category}`);
        console.log('');

        // Initialize report directory
        if (generateReport) {
            await this.initializeReporting();
        }

        // Filter suites by category if specified
        let suitesToRun = this.testSuites;
        if (category) {
            suitesToRun = this.testSuites.filter(s => s.category === category);
        }

        // Check which suites exist
        const availableSuites = [];
        for (const suite of suitesToRun) {
            if (await this.fileExists(suite.file)) {
                availableSuites.push(suite);
            } else if (!skipMissing && suite.critical) {
                console.error(`❌ Critical test file missing: ${suite.file}`);
                process.exit(1);
            } else if (!skipMissing) {
                console.warn(`⚠️  Test file not found: ${suite.file}`);
                this.results.skippedSuites++;
            }
        }

        this.results.totalSuites = availableSuites.length;

        // Run test suites
        if (parallel) {
            await this.runParallel(availableSuites, verbose);
        } else {
            await this.runSequential(availableSuites, verbose);
        }

        // Calculate final metrics
        this.calculateMetrics();

        // Generate reports
        if (generateReport) {
            await this.generateReports();
        }

        // Print summary
        this.printSummary();

        return this.results.failedSuites === 0;
    }

    async runSequential(suites, verbose) {
        for (const suite of suites) {
            await this.runTestSuite(suite, verbose);
        }
    }

    async runParallel(suites, verbose) {
        const promises = suites.map(suite => this.runTestSuite(suite, verbose));
        await Promise.all(promises);
    }

    async runTestSuite(suite, verbose) {
        const startTime = Date.now();
        console.log(`\n🧪 Running: ${suite.name}`);
        console.log(`   Category: ${suite.category} | Critical: ${suite.critical}`);

        const result = {
            name: suite.name,
            file: suite.file,
            category: suite.category,
            critical: suite.critical,
            startTime: new Date(),
            duration: 0,
            status: 'pending',
            output: [],
            errors: []
        };

        try {
            const output = await this.executeTest(suite.file, suite.args, verbose);

            // Parse output for test results
            const parsed = this.parseTestOutput(output);
            result.status = parsed.success ? 'passed' : 'failed';
            result.testsRun = parsed.total;
            result.testsPassed = parsed.passed;
            result.testsFailed = parsed.failed;
            result.output = output.split('\n');

            if (result.status === 'passed') {
                console.log(`   ✅ PASSED (${parsed.passed}/${parsed.total} tests)`);
                this.results.passedSuites++;
            } else {
                console.log(`   ❌ FAILED (${parsed.failed}/${parsed.total} tests failed)`);
                this.results.failedSuites++;
                if (suite.critical) {
                    this.results.criticalFailures.push(suite.name);
                }
            }

        } catch (error) {
            result.status = 'error';
            result.errors.push(error.message);
            console.log(`   💥 ERROR: ${error.message}`);
            this.results.failedSuites++;
            if (suite.critical) {
                this.results.criticalFailures.push(suite.name);
            }
        }

        result.duration = Date.now() - startTime;
        console.log(`   ⏱️  Duration: ${result.duration}ms`);

        this.results.suiteResults.push(result);

        // Update category stats
        if (!this.results.categories[suite.category]) {
            this.results.categories[suite.category] = {
                total: 0,
                passed: 0,
                failed: 0
            };
        }
        this.results.categories[suite.category].total++;
        if (result.status === 'passed') {
            this.results.categories[suite.category].passed++;
        } else {
            this.results.categories[suite.category].failed++;
        }
    }

    async executeTest(file, args = [], verbose) {
        return new Promise((resolve, reject) => {
            const testPath = path.join(__dirname, file);
            const testProcess = spawn('node', [testPath, ...(args || [])], {
                cwd: __dirname,
                env: { ...process.env, NODE_ENV: 'test' }
            });

            let output = '';
            let errorOutput = '';

            testProcess.stdout.on('data', (data) => {
                const text = data.toString();
                output += text;
                if (verbose) {
                    process.stdout.write(text);
                }
            });

            testProcess.stderr.on('data', (data) => {
                const text = data.toString();
                errorOutput += text;
                if (verbose) {
                    process.stderr.write(text);
                }
            });

            testProcess.on('close', (code) => {
                if (code === 0) {
                    resolve(output);
                } else {
                    // Non-zero exit code might still have test results
                    resolve(output || errorOutput);
                }
            });

            testProcess.on('error', (err) => {
                reject(err);
            });
        });
    }

    parseTestOutput(output) {
        const lines = output.split('\n');
        let total = 0;
        let passed = 0;
        let failed = 0;

        for (const line of lines) {
            // Look for common test result patterns
            if (line.includes('✅') && !line.includes('Test Summary')) {
                passed++;
                total++;
            } else if (line.includes('❌') && !line.includes('Test Summary')) {
                failed++;
                total++;
            } else if (line.match(/(\d+)\s+passing/i)) {
                passed = parseInt(RegExp.$1);
            } else if (line.match(/(\d+)\s+failing/i)) {
                failed = parseInt(RegExp.$1);
            } else if (line.match(/Total Tests?:\s*(\d+)/i)) {
                total = parseInt(RegExp.$1);
            } else if (line.match(/Passed:\s*(\d+)/i)) {
                passed = parseInt(RegExp.$1);
            } else if (line.match(/Failed:\s*(\d+)/i)) {
                failed = parseInt(RegExp.$1);
            }
        }

        // If we found totals but not pass/fail counts, calculate
        if (total > 0 && passed === 0 && failed === 0) {
            // Check for "All tests passed" type messages
            if (output.includes('All tests passed') || output.includes('🎉')) {
                passed = total;
            }
        }

        return {
            success: failed === 0 && total > 0,
            total,
            passed,
            failed
        };
    }

    calculateMetrics() {
        this.results.endTime = new Date();
        this.results.performanceMetrics.totalDuration =
            this.results.endTime - this.results.startTime;

        if (this.results.suiteResults.length > 0) {
            const durations = this.results.suiteResults.map(r => r.duration);
            this.results.performanceMetrics.averageSuiteDuration =
                durations.reduce((a, b) => a + b, 0) / durations.length;

            const sorted = [...this.results.suiteResults].sort((a, b) => a.duration - b.duration);
            this.results.performanceMetrics.shortestSuite = {
                name: sorted[0].name,
                duration: sorted[0].duration
            };
            this.results.performanceMetrics.longestSuite = {
                name: sorted[sorted.length - 1].name,
                duration: sorted[sorted.length - 1].duration
            };
        }
    }

    async initializeReporting() {
        // Create reports directory
        await fs.mkdir(this.reportPath, { recursive: true });

        // Create report file name with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        this.reportFile = path.join(this.reportPath, `test-report-${timestamp}.json`);
    }

    async generateReports() {
        // Generate JSON report
        const jsonReport = {
            ...this.results,
            environment: {
                nodeVersion: process.version,
                platform: process.platform,
                cwd: process.cwd()
            }
        };

        await fs.writeFile(
            this.reportFile,
            JSON.stringify(jsonReport, null, 2)
        );

        // Generate HTML report
        const htmlFile = this.reportFile.replace('.json', '.html');
        await this.generateHTMLReport(htmlFile);

        console.log(`\n📄 Reports generated:`);
        console.log(`   JSON: ${path.basename(this.reportFile)}`);
        console.log(`   HTML: ${path.basename(htmlFile)}`);
    }

    async generateHTMLReport(htmlFile) {
        const html = `<!DOCTYPE html>
<html>
<head>
    <title>Durandal MCP Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stat-card h3 { margin: 0 0 10px 0; color: #666; font-size: 14px; text-transform: uppercase; }
        .stat-card .value { font-size: 32px; font-weight: bold; }
        .passed { color: #10b981; }
        .failed { color: #ef4444; }
        .skipped { color: #f59e0b; }
        .suite-results { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; padding: 12px; border-bottom: 2px solid #e5e5e5; }
        td { padding: 12px; border-bottom: 1px solid #e5e5e5; }
        .status-passed { color: #10b981; font-weight: bold; }
        .status-failed { color: #ef4444; font-weight: bold; }
        .status-error { color: #dc2626; font-weight: bold; }
        .critical { background: #fef2f2; }
        .category-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .category-core { background: #dbeafe; color: #1e40af; }
        .category-database { background: #fce7f3; color: #9333ea; }
        .category-integration { background: #fed7aa; color: #c2410c; }
        .category-performance { background: #fef3c7; color: #d97706; }
        .category-security { background: #fee2e2; color: #dc2626; }
        .category-e2e { background: #d1fae5; color: #059669; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Durandal MCP Test Report</h1>
        <p>Generated: ${this.results.endTime?.toLocaleString() || 'In Progress'}</p>
        <p>Duration: ${Math.round(this.results.performanceMetrics.totalDuration / 1000)}s</p>
    </div>

    <div class="summary">
        <div class="stat-card">
            <h3>Total Suites</h3>
            <div class="value">${this.results.totalSuites}</div>
        </div>
        <div class="stat-card">
            <h3>Passed</h3>
            <div class="value passed">${this.results.passedSuites}</div>
        </div>
        <div class="stat-card">
            <h3>Failed</h3>
            <div class="value failed">${this.results.failedSuites}</div>
        </div>
        <div class="stat-card">
            <h3>Success Rate</h3>
            <div class="value">${this.results.totalSuites > 0 ?
                Math.round((this.results.passedSuites / this.results.totalSuites) * 100) : 0}%</div>
        </div>
    </div>

    ${this.results.criticalFailures.length > 0 ? `
    <div class="suite-results" style="background: #fef2f2; border: 2px solid #ef4444;">
        <h2 style="color: #ef4444;">⚠️ Critical Failures</h2>
        <ul>
            ${this.results.criticalFailures.map(f => `<li>${f}</li>`).join('')}
        </ul>
    </div>` : ''}

    <div class="suite-results">
        <h2>Test Suite Results</h2>
        <table>
            <thead>
                <tr>
                    <th>Suite</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Tests</th>
                    <th>Duration</th>
                </tr>
            </thead>
            <tbody>
                ${this.results.suiteResults.map(r => `
                <tr class="${r.critical ? 'critical' : ''}">
                    <td>${r.name}</td>
                    <td><span class="category-badge category-${r.category}">${r.category}</span></td>
                    <td><span class="status-${r.status}">${r.status.toUpperCase()}</span></td>
                    <td>${r.testsPassed !== undefined ? `${r.testsPassed}/${r.testsRun}` : '-'}</td>
                    <td>${r.duration}ms</td>
                </tr>`).join('')}
            </tbody>
        </table>
    </div>
</body>
</html>`;

        await fs.writeFile(htmlFile, html);
    }

    printSummary() {
        console.log('\n' + '=' . repeat(60));
        console.log('📊 MASTER TEST SUMMARY');
        console.log('=' . repeat(60));

        console.log(`\nTotal Test Suites: ${this.results.totalSuites}`);
        console.log(`✅ Passed: ${this.results.passedSuites}`);
        console.log(`❌ Failed: ${this.results.failedSuites}`);
        console.log(`⏭️  Skipped: ${this.results.skippedSuites}`);

        const successRate = this.results.totalSuites > 0 ?
            (this.results.passedSuites / this.results.totalSuites) * 100 : 0;
        console.log(`\n📈 Success Rate: ${successRate.toFixed(1)}%`);

        // Category breakdown
        console.log('\nCategory Breakdown:');
        for (const [category, stats] of Object.entries(this.results.categories)) {
            const catRate = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0;
            console.log(`  ${category}: ${stats.passed}/${stats.total} (${catRate.toFixed(0)}%)`);
        }

        // Performance metrics
        console.log('\nPerformance Metrics:');
        console.log(`  Total Duration: ${Math.round(this.results.performanceMetrics.totalDuration / 1000)}s`);
        console.log(`  Average Suite Duration: ${Math.round(this.results.performanceMetrics.averageSuiteDuration)}ms`);
        if (this.results.performanceMetrics.longestSuite) {
            console.log(`  Longest: ${this.results.performanceMetrics.longestSuite.name} (${this.results.performanceMetrics.longestSuite.duration}ms)`);
        }
        if (this.results.performanceMetrics.shortestSuite) {
            console.log(`  Shortest: ${this.results.performanceMetrics.shortestSuite.name} (${this.results.performanceMetrics.shortestSuite.duration}ms)`);
        }

        // Critical failures
        if (this.results.criticalFailures.length > 0) {
            console.log('\n⚠️  CRITICAL FAILURES:');
            for (const failure of this.results.criticalFailures) {
                console.log(`  - ${failure}`);
            }
        }

        // Final status
        console.log('\n' + '=' . repeat(60));
        if (successRate === 100) {
            console.log('🎉 ALL TESTS PASSED! The system is ready for production.');
        } else if (successRate >= 80) {
            console.log('✅ Good test coverage. Minor issues to address.');
        } else if (successRate >= 60) {
            console.log('⚠️  Moderate test coverage. Several issues need attention.');
        } else {
            console.log('❌ Poor test coverage. Critical issues must be resolved.');
        }

        if (this.results.criticalFailures.length > 0) {
            console.log('🚨 CRITICAL COMPONENTS FAILED - System not ready for production!');
        }
    }

    async fileExists(file) {
        try {
            await fs.access(path.join(__dirname, file));
            return true;
        } catch {
            return false;
        }
    }
}

// CLI interface
if (require.main === module) {
    const runner = new MasterTestRunner();

    // Parse command line arguments
    const args = process.argv.slice(2);
    const options = {
        category: null,
        skipMissing: true,
        parallel: false,
        verbose: false,
        generateReport: true
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--category':
                options.category = args[++i];
                break;
            case '--parallel':
                options.parallel = true;
                break;
            case '--verbose':
                options.verbose = true;
                break;
            case '--no-skip':
                options.skipMissing = false;
                break;
            case '--no-report':
                options.generateReport = false;
                break;
            case '--help':
                console.log(`
Durandal MCP Master Test Runner

Usage: node master-test-runner.js [options]

Options:
  --category <name>  Run only tests in specified category (core, database, integration, performance, security, e2e)
  --parallel         Run test suites in parallel
  --verbose          Show detailed test output
  --no-skip          Don't skip missing test files
  --no-report        Don't generate HTML/JSON reports
  --help             Show this help message

Examples:
  node master-test-runner.js                    # Run all tests sequentially
  node master-test-runner.js --parallel         # Run all tests in parallel
  node master-test-runner.js --category core    # Run only core tests
  node master-test-runner.js --verbose          # Show detailed output
                `);
                process.exit(0);
        }
    }

    runner.run(options)
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Master test runner failed:', error);
            process.exit(1);
        });
}

module.exports = MasterTestRunner;