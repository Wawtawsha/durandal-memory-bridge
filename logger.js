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
            error: 3,
            fatal: 4
        };

        // Configuration from environment or options
        this.currentLevel = this.levels[process.env.LOG_LEVEL?.toLowerCase()] ??
                           this.levels[options.level?.toLowerCase()] ??
                           this.levels.warn;

        this.verbose = process.env.VERBOSE === 'true' || options.verbose === true;
        this.debugMode = process.env.DEBUG === 'true' || options.debug === true;
        this.logMCPTools = process.env.LOG_MCP_TOOLS === 'true' || options.logMCPTools === true;

        // File logging configuration
        this.logFile = process.env.LOG_FILE || options.logFile;
        this.errorLogFile = process.env.ERROR_LOG_FILE || options.errorLogFile;

        // Color support for terminal output
        this.useColors = process.stdout.isTTY && !process.env.NO_COLOR;

        // Color codes for different log levels
        this.colors = {
            debug: '\x1b[36m',         // Cyan
            info: '\x1b[32m',          // Green
            warn: '\x1b[33m',          // Yellow
            error: '\x1b[31m',         // Red
            fatal: '\x1b[1m\x1b[31m', // Bright Red
            bright: '\x1b[1m',         // Bright/Bold
            dim: '\x1b[2m',            // Dim
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

    formatMessage(level, message, meta = {}, emoji = '') {
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

        // For console output, format nicely with sparse colors
        if (this.useColors) {
            const color = this.colors[level] || '';
            const reset = this.colors.reset;
            const levelStr = level.toUpperCase().padEnd(5);

            let output;
            if (level === 'fatal') {
                output = `${this.colors.fatal}${emoji} ${message}${reset}`;
            } else if (level === 'error') {
                output = `${this.colors.bright}${color}${emoji} ${message}${reset}`;
            } else if (level === 'warn') {
                output = `${color}${emoji} ${message}${reset}`;
            } else if (level === 'info') {
                output = `${this.colors.bright}${color}${emoji} ${message}${reset}`;
            } else if (level === 'debug') {
                output = `${color}${emoji} ${message}${reset}`;
            } else {
                output = `${color}[${timestamp}] ${levelStr}${reset} ${message}`;
            }

            if (Object.keys(meta).length > 0) {
                if (this.verbose) {
                    output += '\n' + util.inspect(meta, { colors: true, depth: null });
                } else if (this.currentLevel <= this.levels.debug) {
                    const metaStr = Object.entries(meta)
                        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
                        .join(' ');
                    if (metaStr) {
                        output += ` ${this.colors.dim}${metaStr}${reset}`;
                    }
                }
            }

            return output;
        } else {
            return `[${timestamp}] ${level.toUpperCase().padEnd(5)} ${emoji} ${message} ${JSON.stringify(meta)}`;
        }
    }

    log(level, message, meta = {}, emoji = '') {
        // Fatal errors are ALWAYS displayed
        if (level !== 'fatal') {
            const levelValue = this.levels[level];
            if (levelValue === undefined || levelValue < this.currentLevel) {
                return;
            }
        }

        const formattedMessage = this.formatMessage(level, message, meta, emoji);

        // Console output
        if (level === 'error' || level === 'fatal') {
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

        if (this.errorStream && (level === 'error' || level === 'fatal')) {
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
        if (this.debugMode || this.currentLevel <= this.levels.debug) {
            this.log('debug', message, meta);
        }
    }

    info(message, meta = {}) {
        this.log('info', message, meta, 'ℹ️ ');
    }

    warn(message, meta = {}) {
        this.log('warn', message, meta, '⚠️ ');
    }

    error(message, meta = {}) {
        this.log('error', message, meta, '❌');
    }

    fatal(message, meta = {}) {
        this.log('fatal', message, meta, '🛑');
    }

    processing(message, meta = {}) {
        if (this.currentLevel <= this.levels.info) {
            console.log(`${this.colors.debug}🔄 ${message}${this.colors.reset}`);
        }
    }

    success(message, meta = {}) {
        if (this.currentLevel <= this.levels.info) {
            this.log('info', message, meta, '✅');
        }
    }

    substep(message, meta = {}) {
        if (this.debugMode || this.currentLevel <= this.levels.debug) {
            console.log(`${this.colors.dim}  └─ ${message}${this.colors.reset}`);
        }
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