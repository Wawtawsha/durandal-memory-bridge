/**
 * Test Helper: Generate all log levels for integration testing
 * This script is used by integration tests to verify log filtering
 */

const Logger = require('./logger');

const logFile = process.env.LOG_FILE || './test-helper.log';
const consoleLevel = process.env.CONSOLE_LOG_LEVEL || 'warn';
const fileLevel = process.env.FILE_LOG_LEVEL || 'info';

const logger = new Logger({
    consoleLevel,
    fileLevel,
    logFile
});

logger.debug('This is a debug message', { level: 'debug', test: true });
logger.info('This is an info message', { level: 'info', test: true });
logger.warn('This is a warning message', { level: 'warn', test: true });
logger.error('This is an error message', { level: 'error', test: true });

logger.close();

console.log('LOG_GENERATION_COMPLETE');