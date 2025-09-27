/**
 * Test Update Notification Display
 *
 * This script simulates an update being available and displays the notification
 */

const UpdateChecker = require('./update-checker');
const Logger = require('./logger');

const logger = new Logger({ level: 'warn' });

// Simulate package info with an older version
const packageInfo = {
    name: 'durandal-memory-mcp',
    version: '3.0.0'  // Pretend we're on an older version
};

const checker = new UpdateChecker(packageInfo, logger, {
    enabled: true,
    showNotification: true
});

console.log('🧪 Testing Update Notification Display\n');
console.log('Simulating server startup with update available...\n');
console.log('='.repeat(70));

// Simulate the update info that would come from checking
const mockUpdateInfo = {
    current: '3.0.0',
    latest: '3.0.2',
    updateAvailable: true,
    homepage: 'https://github.com/Wawtawsha/durandal-memory-bridge#readme',
    repository: 'git+https://github.com/Wawtawsha/durandal-memory-bridge.git',
    checked: new Date().toISOString()
};

// Show what the server startup would look like
console.log('📊 Database: Using SQLite at ./durandal-mcp-memory.db');
console.log('✅ SQLite schema initialized');

// Display the actual notification
checker.showUpdateNotification(mockUpdateInfo);

console.log('[Server continues running normally...]');
console.log('\n' + '='.repeat(70));
console.log('\n✅ This is what users see when an update is available!\n');
console.log('To suppress this notification, users can set:');
console.log('  NO_UPDATE_CHECK=1');
console.log('  or UPDATE_NOTIFICATION=false\n');