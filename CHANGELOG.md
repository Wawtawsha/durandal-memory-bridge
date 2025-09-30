# Changelog

All notable changes to Durandal MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.2.1] - 2025-09-30

### Core Change: Project/Session Enumeration Tool
Added new MCP tool to list all projects and sessions with their memory counts and samples.

### New Features
- **`list_projects_sessions` MCP tool** - Enumerate all projects and sessions in database
  - List projects with memory counts
  - List sessions with memory counts
  - Show first and last memory dates
  - Optional sample memories from each project/session
  - Flexible filtering: projects only, sessions only, or both

### Usage Example
```javascript
// In Claude Code, use the new tool:
list_projects_sessions({ type: 'both', include_samples: true })

// Returns formatted list like:
## Projects (2 total)
### default
- Memories: 500
- First: 9/25/2025
- Latest: 9/30/2025
- Recent samples:
  - "Example memory content..."

### my-project
- Memories: 235
- First: 9/28/2025
- Latest: 9/30/2025
```

### Files Changed
- `durandal-mcp-server-v3.js` - Added list_projects_sessions tool and handler
- `package.json` - Version 3.2.1

---

## [3.2.0] - 2025-09-30

### Core Change: Database Migration & Enhanced Memory Management
Major update with database migration tool, enhanced status display, and improved memory organization with project/session metadata.

### What This Means for Users
- **Merge all databases** - New migration tool consolidates multiple databases into one
- **Better memory organization** - Memories now track project and session automatically
- **Rich status display** - See exactly how many memories, projects, and sessions you have
- **No more lost data** - Migration tool preserves all memories from all databases

### New Features
1. **Database Migration Tool** (`--migrate`)
   - Finds all databases on your system
   - Merges them into a single universal database
   - Preserves all memories with deduplication
   - Shows migration statistics and progress

2. **Enhanced Status Display**
   - Shows total memory count in database
   - Displays number of projects
   - Shows number of sessions
   - Cache memory count displayed separately

3. **Project/Session Metadata**
   - Memories automatically tagged with project and session
   - Default project: "default"
   - Default session: current date (YYYY-MM-DD)
   - Can override with metadata: `{ project: "my-app", session: "feature-x" }`

### CLI Commands
- `durandal-mcp --migrate` - Merge all databases into one universal database
- `durandal-mcp --discover` - Find all databases (enhanced from v3.1.8)
- `durandal-mcp --status` - View enhanced status with memory counts

### Example Status Display
```
┃  Database:        [OK] Connected                     ┃
┃  Database Size:   0.10 MB                           ┃
┃  Stored Memories: 525 memories                      ┃
┃  Projects:        12 projects                       ┃
┃  Sessions:        47 sessions                       ┃
┃  Cache Memories:  15 / 1000 cached                  ┃
```

### Migration Example
```bash
$ durandal-mcp --migrate

Found 2 database(s) to migrate:
  - C:\Users\you\Desktop\durandal-mcp-memory.db (105 memories)
  - C:\Users\you\OldProject\memories.db (420 memories)

Migration Complete!
Total memories processed: 525
Successfully migrated: 520
Duplicates skipped: 5

✅ Universal database now contains: 520 memories
```

### Files Changed
- `db-migrate.js` - New database migration tool
- `durandal-mcp-server-v3.js` - Enhanced status display, project/session support, --migrate command
- `package.json` - Version 3.2.0

---

## [3.1.8] - 2025-09-30

### Core Change: Data Preservation Guarantee
Implemented exhaustive database discovery to ensure user data is NEVER lost during updates or installation changes.

### What This Means for Users
- **Your data is safe** - Durandal will find your database wherever it is
- **Automatic recovery** - Databases in non-standard locations are discovered
- **No data loss on updates** - Existing databases are never overwritten
- **Clear guidance** - Shows all found databases and which one is selected

### Critical Improvements
- **Exhaustive search** - Searches entire system for existing databases before creating new
- **Smart selection** - Chooses database with most records when multiple exist
- **Discovery tool** - New `--discover` command finds all databases on system
- **Data protection** - Will NEVER create new database if ANY existing one is found

### New Features
- `durandal-mcp --discover` - Find all Durandal databases on your system
- `db-discovery.js` - Standalone tool for database discovery and verification
- Enhanced database resolution with system-wide search
- Record count-based selection (not just file size)

### Example Discovery Output
```
Found 2 potential database(s):
📁 C:\Users\you\.durandal-mcp\durandal-mcp-memory.db
   Size: 104.0 KB
   Records: 525 memories
📁 C:\Users\you\Desktop\Claude\durandal-mcp-memory.db
   Size: 52.0 KB
   Records: 105 memories

SELECTED: Database with most data (525 memories)
```

### Files Changed
- `mcp-db-client.js` - Complete rewrite of database resolution with exhaustive search
- `db-discovery.js` - New comprehensive database discovery tool
- `durandal-mcp-server-v3.js` - Added `--discover` CLI command
- `package.json` - Version 3.1.8

### Data Preservation Guarantee
From this version forward, Durandal will:
1. Search exhaustively for any existing databases
2. Never overwrite or abandon existing data
3. Always select the database with the most records
4. Provide clear visibility into database selection

---

## [3.1.7] - 2025-09-30

### Core Change: Fix Database Status Reporting
Fixed critical bug where status commands incorrectly reported "Database Missing" even when database exists and is being used.

### What This Means for Users
- **Status now shows correct database state** - No more false "Database Missing" errors
- **Accurate database path reporting** - Shows the actual database being used
- **Consistent with resolution logic** - Status uses same database detection as server

### Critical Bug Fixed
The status command was looking for the database in the wrong location (script directory) instead of using the smart resolution logic that finds databases in current directory or home directory.

### Before and After
**Before (v3.1.6):**
```
Database:        [ERR] Not Found     // Wrong!
Database Size:   0.00 MB
```

**After (v3.1.7):**
```
Database:        [OK] Connected      // Correct!
Database Size:   0.09 MB
```

### Files Changed
- `durandal-mcp-server-v3.js` - Fixed `handleGetStatus()` and CLI `--status` to use actual resolved database path
- `package.json` - Version 3.1.7

---

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