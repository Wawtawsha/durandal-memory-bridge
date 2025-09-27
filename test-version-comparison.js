/**
 * Test Version Comparison Logic
 */

const UpdateChecker = require('./update-checker');
const Logger = require('./logger');

const logger = new Logger({ level: 'error' }); // Suppress logs during tests

// Mock package info
const mockPackageInfo = {
    name: 'test-package',
    version: '3.0.1'
};

const checker = new UpdateChecker(mockPackageInfo, logger, { enabled: false });

// Test cases for version comparison
const tests = [
    // [current, latest, expected (1=update, 0=same, -1=current newer)]
    ['1.0.0', '1.0.0', 0, 'Same version'],
    ['1.0.0', '1.0.1', 1, 'Patch update available'],
    ['1.0.0', '1.1.0', 1, 'Minor update available'],
    ['1.0.0', '2.0.0', 1, 'Major update available'],
    ['2.0.0', '1.0.0', -1, 'Current is newer (major)'],
    ['1.1.0', '1.0.0', -1, 'Current is newer (minor)'],
    ['1.0.1', '1.0.0', -1, 'Current is newer (patch)'],
    ['3.0.1', '3.0.2', 1, 'Current patch to next patch'],
    ['3.0.2', '3.0.1', -1, 'Next patch to current patch'],
    ['v3.0.1', '3.0.1', 0, 'With v prefix'],
    ['3.0.1', 'v3.0.1', 0, 'Different v prefix'],
    ['10.0.0', '9.0.0', -1, 'Double digit version'],
    ['1.10.0', '1.9.0', -1, 'Double digit minor'],
    ['1.0.10', '1.0.9', -1, 'Double digit patch'],
];

console.log('🧪 Testing Version Comparison Logic\n');
console.log('='.repeat(70));

let passed = 0;
let failed = 0;

tests.forEach(([current, latest, expected, description], index) => {
    const result = checker.compareVersions(current, latest);
    const status = result === expected ? '✅' : '❌';

    if (result === expected) {
        passed++;
    } else {
        failed++;
        console.log(`${status} Test ${index + 1}: ${description}`);
        console.log(`   Current: ${current}, Latest: ${latest}`);
        console.log(`   Expected: ${expected}, Got: ${result}`);
    }
});

console.log('='.repeat(70));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${tests.length} tests`);

if (failed === 0) {
    console.log('🎉 All version comparison tests passed!\n');
    process.exit(0);
} else {
    console.log('❌ Some tests failed!\n');
    process.exit(1);
}