/**
 * Durandal MCP Server - Logging System
 *
 * Provides structured logging with configurable levels, optional file output,
 * and comprehensive debug capabilities for the MCP server.
 */

const fs = require('fs');
const path = require('path');
const util = require('util');

class Logger {
    constructor(options = {}) {
        // Log levels with numeric values for comparison
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };

        // Configuration from environment or options
        this.currentLevel = this.levels[process.env.LOG_LEVEL?.toLowerCase()] ??
                           this.levels[options.level?.toLowerCase()] ??
                           this.levels.warn;

        this.verbose = process.env.VERBOSE === 'true' || options.verbose === true;
        this.debug = process.env.DEBUG === 'true' || options.debug === true;
        this.logMCPTools = process.env.LOG_MCP_TOOLS === 'true' || options.logMCPTools === true;

        // File logging configuration
        this.logFile = process.env.LOG_FILE || options.logFile;
        this.errorLogFile = process.env.ERROR_LOG_FILE || options.errorLogFile;

        // Color support for terminal output
        this.useColors = process.stdout.isTTY && !process.env.NO_COLOR;

        // Color codes for different log levels
        this.colors = {
            debug: '\x1b[36m', // Cyan
            info: '\x1b[32m',  // Green
            warn: '\x1b[33m',  // Yellow
            error: '\x1b[31m', // Red
            reset: '\x1b[0m'
        };

        // Request tracking for MCP tools
        this.activeRequests = new Map();

        // Initialize file streams if needed
        this.initializeFileLogging();
    }

    initializeFileLogging() {
        if (this.logFile) {
            const logDir = path.dirname(this.logFile);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }

            // Create or append to log file
            this.logStream = fs.createWriteStream(this.logFile, { flags: 'a' });

            // Rotate logs if file is too large (10MB)
            this.checkAndRotateLog(this.logFile);
        }

        if (this.errorLogFile) {
            const errorLogDir = path.dirname(this.errorLogFile);
            if (!fs.existsSync(errorLogDir)) {
                fs.mkdirSync(errorLogDir, { recursive: true });
            }

            this.errorStream = fs.createWriteStream(this.errorLogFile, { flags: 'a' });
            this.checkAndRotateLog(this.errorLogFile);
        }
    }

    checkAndRotateLog(filePath) {
        try {
            const stats = fs.statSync(filePath);
            const maxSize = 10 * 1024 * 1024; // 10MB

            if (stats.size > maxSize) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const rotatedPath = filePath.replace(/\.log$/, `-${timestamp}.log`);
                fs.renameSync(filePath, rotatedPath);

                // Clean up old logs (keep last 7 days)
                this.cleanupOldLogs(path.dirname(filePath));
            }
        } catch (error) {
            // File doesn't exist yet, ignore
        }
    }

    cleanupOldLogs(logDir) {
        const files = fs.readdirSync(logDir);
        const now = Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;

        files.forEach(file => {
            if (file.match(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/)) {
                const filePath = path.join(logDir, file);
                const stats = fs.statSync(filePath);

                if (now - stats.mtime.getTime() > sevenDays) {
                    fs.unlinkSync(filePath);
                }
            }
        });
    }

    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();

        // Structured log object
        const logObject = {
            timestamp,
            level,
            message,
            ...meta
        };

        // For file output, use JSON Lines format
        if (this.logStream || this.errorStream) {
            return JSON.stringify(logObject) + '\n';
        }

        // For console output, format nicely
        if (this.useColors) {
            const color = this.colors[level] || '';
            const reset = this.colors.reset;
            const levelStr = level.toUpperCase().padEnd(5);

            let output = `${color}[${timestamp}] ${levelStr}${reset} ${message}`;

            if (Object.keys(meta).length > 0) {
                if (this.verbose) {
                    output += '\n' + util.inspect(meta, { colors: true, depth: null });
                } else {
                    // Compact meta display for non-verbose mode
                    const metaStr = Object.entries(meta)
                        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
                        .join(' ');
                    output += ` ${metaStr}`;
                }
            }

            return output;
        } else {
            // Plain text output without colors
            return `[${timestamp}] ${level.toUpperCase().padEnd(5)} ${message} ${JSON.stringify(meta)}`;
        }
    }

    log(level, message, meta = {}) {
        // Check if we should log this level
        const levelValue = this.levels[level];
        if (levelValue === undefined || levelValue < this.currentLevel) {
            return;
        }

        const formattedMessage = this.formatMessage(level, message, meta);

        // Console output
        if (level === 'error') {
            console.error(formattedMessage);
        } else {
            console.log(formattedMessage);
        }

        // File output
        if (this.logStream) {
            this.logStream.write(JSON.stringify({
                timestamp: new Date().toISOString(),
                level,
                message,
                ...meta
            }) + '\n');
        }

        if (this.errorStream && level === 'error') {
            this.errorStream.write(JSON.stringify({
                timestamp: new Date().toISOString(),
                level,
                message,
                ...meta
            }) + '\n');
        }
    }

    // Convenience methods
    debug(message, meta = {}) {
        if (this.debug) {
            this.log('debug', message, meta);
        }
    }

    info(message, meta = {}) {
        this.log('info', message, meta);
    }

    warn(message, meta = {}) {
        this.log('warn', message, meta);
    }

    error(message, meta = {}) {
        this.log('error', message, meta);
    }

    // MCP Tool logging helpers
    startMCPTool(toolName, args) {
        if (!this.logMCPTools) return null;

        const requestId = Math.random().toString(36).substring(7);
        const startTime = Date.now();

        this.activeRequests.set(requestId, { toolName, startTime });

        this.info(`MCP Tool Started: ${toolName}`, {
            requestId,
            tool: toolName,
            args: this.verbose ? args : {
                // Sanitized args for non-verbose mode
                hasContent: !!args.content,
                contentLength: args.content?.length,
                hasMetadata: !!args.metadata
            }
        });

        return requestId;
    }

    endMCPTool(requestId, success = true, result = null, error = null) {
        if (!this.logMCPTools || !requestId) return;

        const request = this.activeRequests.get(requestId);
        if (!request) return;

        const duration = Date.now() - request.startTime;
        this.activeRequests.delete(requestId);

        const logData = {
            requestId,
            tool: request.toolName,
            success,
            duration: `${duration}ms`,
        };

        if (success && result) {
            logData.resultSize = JSON.stringify(result).length;
            if (this.verbose) {
                logData.result = result;
            }
        }

        if (!success && error) {
            logData.error = error.message || error;
            if (this.verbose && error.stack) {
                logData.stack = error.stack;
            }
        }

        const level = success ? 'info' : 'error';
        this.log(level, `MCP Tool ${success ? 'Completed' : 'Failed'}: ${request.toolName}`, logData);
    }

    // System information logging
    logSystemInfo() {
        this.info('System Information', {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            pid: process.pid,
            memory: {
                rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
                heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
            }
        });
    }

    // Configuration logging
    logConfiguration(config) {
        this.info('Server Configuration', {
            logLevel: Object.keys(this.levels).find(key => this.levels[key] === this.currentLevel),
            verbose: this.verbose,
            debug: this.debug,
            logMCPTools: this.logMCPTools,
            fileLogging: !!this.logFile,
            errorFileLogging: !!this.errorLogFile,
            ...config
        });
    }

    // Close file streams
    close() {
        if (this.logStream) {
            this.logStream.end();
        }
        if (this.errorStream) {
            this.errorStream.end();
        }
    }
}

module.exports = Logger;