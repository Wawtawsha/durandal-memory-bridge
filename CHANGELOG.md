# Changelog

All notable changes to Durandal MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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