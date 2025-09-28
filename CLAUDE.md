# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Durandal Memory MCP** is a zero-config Model Context Protocol (MCP) server that provides persistent memory capabilities for Claude Code. The system stores, searches, and retrieves memories using SQLite, with advanced caching (RAMR), logging, and optimization features.

**Important:** When the user mentions "Durandal," default to working on the **Durandal MCP Server** unless they explicitly mention the full application (durandal-ui, dev-assistant, etc.).

## Development Commands

### MCP Server (Primary Focus)
- `npm start` or `node durandal-mcp-server-v3.js` - Start the MCP server (stdio transport)
- `npm test` or `node durandal-mcp-server-v3.js --test` - Run built-in test suite
- `durandal-mcp` - Run as installed global CLI command (after `npm install -g`)

### Testing the MCP Server
```bash
# Run built-in comprehensive tests
node durandal-mcp-server-v3.js --test

# Test with Claude Code
claude mcp add durandal-memory -- cmd /c durandal-mcp  # Windows
claude mcp add durandal-memory -- durandal-mcp         # macOS/Linux
claude mcp list  # Verify connection
```

### MCP Server Environment Variables
- `CONSOLE_LOG_LEVEL` - Terminal output level (error/warn/info/debug) - default: 'warn'
- `FILE_LOG_LEVEL` - File output level (error/warn/info/debug) - default: 'info'
- `LOG_LEVEL` - Legacy: sets both console and file levels - default: 'warn'
- `DATABASE_PATH` - SQLite database path - default: './durandal-mcp-memory.db'
- `VERBOSE` - Enable verbose logging - default: false
- `DEBUG` - Enable debug mode - default: false
- `LOG_MCP_TOOLS` - Log MCP tool calls - default: false

### Full Application Commands (Secondary - for reference)
- `npm run durandal` - Start the main Durandal CLI interface
- `npm run durandal-ui` - Start the UI version with Express server
- `npm run test-db` - Test database connection
- `npm run test-all` - Run comprehensive test orchestrator

## Architecture Overview

### MCP Server Core Components (Primary)

**DurandalMCPServer (`durandal-mcp-server-v3.js`)** - Main MCP server implementing Model Context Protocol
- Handles stdio transport communication with Claude Code
- Exposes 7 MCP tools: `store_memory`, `search_memories`, `get_context`, `optimize_memory`, `get_status`, `configure_logging`, `get_logs`
- Integrates DatabaseAdapter, Logger, ErrorHandler, and TestRunner
- Implements RAMR caching and selective attention mechanisms

**DatabaseAdapter (`db-adapter.js`)** - SQLite database interface
- Schema: `memories` table with content, metadata, categories, keywords, importance, timestamps
- Handles all database operations (store, search, retrieve, optimize)
- Automatic schema initialization on first run

**Logger (`logger.js`)** - Comprehensive logging system
- Levels: debug, info, warn, error
- Optional file logging for errors and general logs
- Structured logging with metadata
- Tool call logging for MCP operations

**ErrorHandler (`errors.js`)** - Centralized error management
- Custom error types: MCPError, ValidationError, DatabaseError, CacheError
- Error classification and handling
- Integration with Logger for error tracking

**TestRunner (`test-runner.js`)** - Built-in test suite
- Comprehensive tests for all MCP tools
- Database validation
- Cache verification
- Performance benchmarking

### MCP Server Database Schema

```sql
CREATE TABLE memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    metadata TEXT,
    category TEXT,
    keywords TEXT,
    importance REAL DEFAULT 0.5,
    access_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_accessed TEXT DEFAULT CURRENT_TIMESTAMP
)
```

### RAMR Cache System

**RAMR (Rapid Access Memory Register)** - Intelligent in-memory caching
- Hot cache for frequently accessed memories
- TTL-based expiration
- Importance-based prioritization
- Prefetches related memories
- Automatic cache maintenance

### MCP Tools Exposed to Claude Code

1. **store_memory** - Store new memories with automatic categorization
2. **search_memories** - Search with keyword filtering, categories, importance threshold
3. **get_context** - Retrieve recent memories and statistics
4. **optimize_memory** - Run maintenance, cleanup, and optimization
5. **get_status** - Display formatted system status dashboard
6. **configure_logging** - Change console and file log levels at runtime
7. **get_logs** - Retrieve and filter session history logs

## Environment Setup

### MCP Server Requirements
- Node.js >=18.0.0 required
- Dependencies: `@modelcontextprotocol/sdk`, `sqlite3`
- Zero configuration - works out of the box
- Optional: `.env` file for custom configuration (see `.env.mcp-minimal`)

### Installation & Setup
```bash
# Install dependencies
npm install

# Test the MCP server
npm test

# Install globally for Claude Code
npm install -g

# Add to Claude Code
claude mcp add durandal-memory -- cmd /c durandal-mcp
```

## Key File Locations (MCP Server)

### Core Files (Always edit these when working on MCP server)
- **`durandal-mcp-server-v3.js`** - Main MCP server entry point
- **`db-adapter.js`** - Database operations and schema
- **`logger.js`** - Logging system
- **`errors.js`** - Error handling
- **`test-runner.js`** - Test suite

### Configuration & Docs
- **`package.json`** - Package metadata and scripts
- **`README.md`** - User-facing documentation
- **`.env.mcp-minimal`** - Example configuration
- **`mcp-bundle.json`** - MCP metadata

### Generated Files (Do not edit)
- `durandal-mcp-memory.db` - SQLite database (auto-created)
- Log files (if configured)

## Development Notes

### MCP Server Development
- The server uses **stdio transport** for MCP communication
- All tool handlers are async and return standardized responses
- Database operations use prepared statements to prevent SQL injection
- RAMR cache improves performance for frequently accessed memories
- Logging is crucial for debugging - use `LOG_LEVEL=debug` when developing

### Error Handling Strategy
- All errors are caught and logged
- Errors are returned to Claude Code as MCP error responses
- Database errors trigger graceful degradation
- Cache errors don't prevent operations (cache is optional)

### Git Workflow
- Push all MCP server changes to Git immediately after finalizing
- Test before committing (`npm test`)
- Keep commits focused on MCP server changes

## Changelog Format
When creating update notes, use this simple, clear template (see CHANGELOG.md for examples):

### [Version] - Date

**Core Change:** One-line summary of the main change

**What This Means for Users:** Plain-language explanation of user impact

**New Features/Tools:** Bulleted list of additions

**Configuration:** New environment variables or config options

**CLI Updates:** Changes to command-line interface

**Testing:** Bug fixes and test coverage

**Files Changed:** List of modified files with brief description

---

## Full Durandal Application (Secondary - Reference Only)

The repository also contains a larger "Durandal AI Development Assistant" application with 4 phases of features. **Only work on these files if the user explicitly asks about the full application.**

### Full Application Components
- `durandal.js` - Main orchestrator
- `dev-assistant.js` - Development assistant interface
- `durandal-ui.js` - Web UI server
- `claude-client.js` - Claude API integration
- `ramr.js` - Advanced RAMR cache system
- `context-manager.js` - Context management
- `knowledge-analyzer.js` - Knowledge extraction
- `db-client.js` - PostgreSQL/SQLite abstraction
- Various Phase 2-4 components (file processing, semantic search, etc.)

### Full Application Commands
- `npm run durandal` - CLI interface
- `npm run durandal-ui` - Web UI
- `npm run test-all` - Full test suite

For detailed architecture of the full application, see `TECHNICAL-ARCHITECTURE-DOCUMENTATION.md`.