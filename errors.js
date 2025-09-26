/**
 * Durandal MCP Server - Error Classes
 *
 * Structured error hierarchy for better error handling and debugging
 */

/**
 * Base error class for all MCP server errors
 */
class MCPError extends Error {
    constructor(message, code = 'MCP_ERROR', context = {}, recovery = null) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.context = context;
        this.recovery = recovery;
        this.timestamp = new Date().toISOString();

        // Capture stack trace
        Error.captureStackTrace(this, this.constructor);
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            context: this.context,
            recovery: this.recovery,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }

    toString() {
        let str = `${this.name}: ${this.message} (Code: ${this.code})`;
        if (this.recovery) {
            str += `\nRecovery: ${this.recovery}`;
        }
        return str;
    }
}

/**
 * Error for validation failures
 */
class ValidationError extends MCPError {
    constructor(message, field = null, value = null) {
        const context = {};
        if (field) context.field = field;
        if (value !== undefined) context.value = value;

        super(
            message,
            'VALIDATION_ERROR',
            context,
            'Check input parameters and ensure they meet requirements'
        );
    }
}

/**
 * Error for database operations
 */
class DatabaseError extends MCPError {
    constructor(message, operation = null, error = null) {
        const context = {};
        if (operation) context.operation = operation;
        if (error) {
            context.originalError = error.message || error;
            if (error.code) context.sqliteCode = error.code;
        }

        let recovery = 'Check database connectivity and permissions';
        if (error?.code === 'SQLITE_CANTOPEN') {
            recovery = 'Ensure database file path is valid and writable';
        } else if (error?.code === 'SQLITE_BUSY') {
            recovery = 'Database is locked, try again in a moment';
        } else if (error?.code === 'SQLITE_CORRUPT') {
            recovery = 'Database file is corrupted, may need to recreate';
        }

        super(message, 'DATABASE_ERROR', context, recovery);
    }
}

/**
 * Error for cache operations
 */
class CacheError extends MCPError {
    constructor(message, operation = null) {
        const context = {};
        if (operation) context.operation = operation;

        super(
            message,
            'CACHE_ERROR',
            context,
            'Cache operation failed, falling back to database'
        );
    }
}

/**
 * Error for MCP protocol issues
 */
class ProtocolError extends MCPError {
    constructor(message, toolName = null, request = null) {
        const context = {};
        if (toolName) context.tool = toolName;
        if (request && !process.env.VERBOSE) {
            // Sanitize request for non-verbose mode
            context.requestSize = JSON.stringify(request).length;
        } else if (request) {
            context.request = request;
        }

        super(
            message,
            'PROTOCOL_ERROR',
            context,
            'Check MCP tool parameters and format'
        );
    }
}

/**
 * Error for configuration issues
 */
class ConfigurationError extends MCPError {
    constructor(message, configKey = null, configValue = null) {
        const context = {};
        if (configKey) context.key = configKey;
        if (configValue !== undefined) context.value = configValue;

        super(
            message,
            'CONFIGURATION_ERROR',
            context,
            'Check environment variables and configuration files'
        );
    }
}

/**
 * Error for file system operations
 */
class FileSystemError extends MCPError {
    constructor(message, path = null, operation = null, error = null) {
        const context = {};
        if (path) context.path = path;
        if (operation) context.operation = operation;
        if (error) {
            context.originalError = error.message || error;
            if (error.code) context.fsCode = error.code;
        }

        let recovery = 'Check file permissions and disk space';
        if (error?.code === 'ENOENT') {
            recovery = 'File or directory does not exist';
        } else if (error?.code === 'EACCES') {
            recovery = 'Permission denied, check file permissions';
        } else if (error?.code === 'ENOSPC') {
            recovery = 'No space left on device';
        }

        super(message, 'FILESYSTEM_ERROR', context, recovery);
    }
}

/**
 * Error for memory/resource issues
 */
class ResourceError extends MCPError {
    constructor(message, resource = null, limit = null, current = null) {
        const context = {};
        if (resource) context.resource = resource;
        if (limit !== undefined) context.limit = limit;
        if (current !== undefined) context.current = current;

        super(
            message,
            'RESOURCE_ERROR',
            context,
            'Consider increasing resource limits or optimizing usage'
        );
    }
}

/**
 * Error wrapper utility for consistent error handling
 */
class ErrorHandler {
    constructor(logger) {
        this.logger = logger;
    }

    /**
     * Wrap an error with appropriate error class
     */
    wrap(error, defaultMessage = 'An error occurred', context = {}) {
        // If already an MCPError, just return it
        if (error instanceof MCPError) {
            return error;
        }

        // Try to determine error type based on error properties or message
        if (error.code?.startsWith('SQLITE_')) {
            return new DatabaseError(
                error.message || defaultMessage,
                context.operation,
                error
            );
        }

        if (error.code && ['ENOENT', 'EACCES', 'ENOSPC'].includes(error.code)) {
            return new FileSystemError(
                error.message || defaultMessage,
                context.path,
                context.operation,
                error
            );
        }

        // Default to generic MCPError
        return new MCPError(
            error.message || defaultMessage,
            'UNKNOWN_ERROR',
            {
                ...context,
                originalError: error.message || error,
                stack: error.stack
            }
        );
    }

    /**
     * Log and format error for response
     */
    handle(error, requestId = null) {
        const wrappedError = this.wrap(error);

        // Log the error
        this.logger.error(wrappedError.message, {
            code: wrappedError.code,
            context: wrappedError.context,
            recovery: wrappedError.recovery,
            requestId
        });

        // Return formatted error for MCP response
        return {
            error: {
                message: wrappedError.message,
                code: wrappedError.code,
                recovery: wrappedError.recovery
            }
        };
    }
}

module.exports = {
    MCPError,
    ValidationError,
    DatabaseError,
    CacheError,
    ProtocolError,
    ConfigurationError,
    FileSystemError,
    ResourceError,
    ErrorHandler
};