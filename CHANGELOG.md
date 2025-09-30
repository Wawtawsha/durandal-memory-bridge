# Changelog

All notable changes to Durandal MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.6] - 2025-09-30

### Core Change: Smart Database Resolution
Fixed critical issue where wrong database was selected when multiple databases exist.

### What This Means for Users
- **Automatically uses database with your data** - No more losing memories
- **Smart detection** - Selects database with most content when multiple exist
- **Clear warnings** - Shows all found databases and which one is selected
- **Backwards compatible** - Checks current directory FIRST for existing users

### Critical Bug Fixed
When users had databases in both `./` and `~/.durandal-mcp/`, the system was using the wrong (often empty) database. Now it:
1. Finds all existing databases
2. Shows their sizes
3. Uses the one with most data
4. Warns about duplicates

### Example Output with Multiple Databases
```
[DB] WARNING: Found 2 databases:
[DB]   - ./durandal-mcp-memory.db (425.3 KB)
[DB]   - /Users/you/.durandal-mcp/durandal-mcp-memory.db (0.5 KB)
[DB] Selected database with most data: ./durandal-mcp-memory.db
[DB] TIP: You have multiple databases. Consider consolidating...
```

### Files Changed
- `mcp-db-client.js` - Complete rewrite of `resolveDatabasePath()` with smart selection
- `package.json` - Version 3.1.6

---

## [3.1.5] - 2025-09-30

### Core Change: Critical Bug Fixes and Migration Support
Fixed critical bugs from v3.1.3-3.1.4 and added automatic database migration support.

### What This Means for Users
- **Automatic database discovery** - Finds existing databases before creating new ones
- **Non-breaking migration** - Your existing databases are found and used automatically
- **Proper abstraction** - Fixed internal architecture violations
- **Better schema validation** - More accurate database health checks

### Fixes from Previous Versions
1. **Database Access Pattern**: Fixed improper direct access to internal database layers
2. **Migration Support**: Now searches for existing databases in multiple locations
3. **Schema Validation**: Correctly validates actual database schema
4. **Architecture**: Properly uses DatabaseAdapter abstraction layer

### Database Search Order
1. `DATABASE_PATH` environment variable (explicit override)
2. `~/.durandal-mcp/durandal-mcp-memory.db` (preferred location)
3. `./durandal-mcp-memory.db` (legacy location)
4. Other common locations checked automatically

### Migration Guidance
If an existing database is found in a legacy location, you'll see:
```
[DB] Found existing database at: ./durandal-mcp-memory.db
[DB] NOTE: Consider moving database to ~/.durandal-mcp/durandal-mcp-memory.db
```

### Files Changed
- `db-adapter.js` - Added proper `storeMemory()` and `searchMemories()` delegation methods
- `durandal-mcp-server-v3.js` - Fixed database access patterns and improved schema validation
- `mcp-db-client.js` - Added database discovery with migration support
- `package.json` - Version 3.1.5

---

## [3.1.4] - 2025-09-30

### Core Change: Consistent Database Location
Changed database to always use `~/.durandal-mcp/durandal-mcp-memory.db` instead of creating it in the current working directory.

### What This Means for Users
- **Database always in the same location** regardless of where you run `durandal-mcp`
- **Your memories persist** across different projects and directories
- **More predictable** - no more wondering "where is my database?"
- **Cleaner projects** - no database files scattered in random directories

### Breaking Change
Previously, the database was created at `./durandal-mcp-memory.db` (current directory). Now it defaults to `~/.durandal-mcp/durandal-mcp-memory.db` (user home).

**Migration**: If you have an existing database in your project directory, you can:
1. Move it: `mv ./durandal-mcp-memory.db ~/.durandal-mcp/durandal-mcp-memory.db`
2. Or set: `export DATABASE_PATH=./durandal-mcp-memory.db` to keep using it

### Database Path Priority
1. `DATABASE_PATH` environment variable (explicit override)
2. `~/.durandal-mcp/durandal-mcp-memory.db` (default)

### Files Changed
- `mcp-db-client.js` - Added `resolveDatabasePath()` method with consistent location logic
- `package.json` - Version 3.1.4

---

## [3.1.3] - 2025-09-30

### Core Change: Database Startup Checks
Added comprehensive database health checks that run automatically on every server startup.

### What This Means for Users
- Server now validates database health before accepting requests
- Early detection of database issues prevents runtime failures
- Automatic verification of connectivity, schema, read/write operations, and integrity
- Clear error messages if database problems are detected

### New Features
- **Connectivity Test**: Verifies database connection is alive
- **Schema Validation**: Checks that all required tables and columns exist
- **Read/Write Test**: Performs a quick write and read operation to verify functionality
- **Integrity Check**: Runs SQLite's `PRAGMA integrity_check` to detect corruption
- **Startup Logging**: All checks logged with `[DB-CHECK]` prefix for easy monitoring

### Technical Details
- Four independent checks run sequentially on startup
- Checks are non-blocking - server continues even if non-critical issues found
- Test memory is created and cleaned up automatically
- Critical failures are logged prominently but don't crash the server
- All checks complete in < 100ms on healthy databases

### Files Changed
- `durandal-mcp-server-v3.js` - Added `runDatabaseStartupCheck()`, `validateDatabaseSchema()`, `testReadWrite()`, `checkDatabaseIntegrity()` methods
- `package.json` - Version 3.1.3

---

## [3.1.2] - 2025-09-28

### Core Change: Bug Fixes
Fixed log level persistence and removed emojis from MCP tool responses.

### What This Means for Users
- Log level settings now persist between server restarts
- Status display no longer uses emojis (better terminal compatibility)
- Configuration saved to `~/.durandal-mcp/.env`

### Bugs Fixed
- **Log level persistence**: Settings now save to user home directory
- **Emoji removal**: Status display uses [OK]/[ERR] instead of checkmarks/crosses
- **Config loading**: Server loads persisted settings on startup

### Files Changed
- `durandal-mcp-server-v3.js` - Config persistence and emoji removal
- `package.json` - Version 3.1.2

---

## [3.1.1] - 2025-09-28

### Core Change: Documentation Polish
Removed all emojis from published documentation for professional appearance on NPM registry and GitHub.

### What This Means for Users
- Cleaner, more professional documentation
- Better readability on terminals that don't support emojis
- No functional changes - purely documentation polish

### Files Changed
- `README.md` - Removed emojis from headings and bullet points
- `UPDATE-POLICY.md` - Replaced checkmark/cross emojis with [YES]/[NO] text

---

## [3.1.0] - 2025-09-27

### Core Change: Dual Log Levels
Split logging into **two independent levels**:
- **Console Level** (default: `warn`) - Clean terminal output
- **File Level** (default: `info`) - Detailed session history for debugging

### What This Means for Users
- Terminal stays quiet (only warnings/errors shown)
- Everything gets logged to `~/.durandal-mcp/logs/durandal-YYYY-MM-DD.log` for troubleshooting
- Users can configure each level independently
- **If you experience an issue you can now send in the error from the logs for debugging!**

### Three New MCP Tools
Claude Code can now:
1. **`get_status`** - Display formatted system status dashboard
2. **`configure_logging`** - Change log levels at runtime
3. **`get_logs`** - Retrieve and filter session history

### Configuration
New environment variables:
- `CONSOLE_LOG_LEVEL` - Terminal output (error, warn, info, debug)
- `FILE_LOG_LEVEL` - File output (error, warn, info, debug)
- `LOG_LEVEL` - Still works, sets both (backward compatible)

### CLI Updates
- `durandal-mcp --configure` now asks for both console and file levels
- Updated `.env.mcp-minimal` with documentation

### Testing
- Fixed bug where debug messages weren't logged to file
- Added validation for invalid log levels
- **51/51 tests passing** (11 new feature tests + 30 integration tests)

### Files Changed
- `logger.js` - Dual level architecture
- `durandal-mcp-server-v3.js` - Three new MCP tools + validation
- `.env.mcp-minimal` - Updated documentation
- `package.json` - Version 3.1.0

---

## [3.0.3] - 2025-09-26

### Previous Release
- Initial stable release with terminal graphics
- Status display command (`--status`)
- Interactive log level configuration
- Colored logging system
- Processing messages for Claude operations