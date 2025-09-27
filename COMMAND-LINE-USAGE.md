# Command-Line Usage Guide

This document provides correct usage examples for all Durandal MCP Server command-line flags.

## Quick Reference

| Command | Purpose | Exits? |
|---------|---------|--------|
| `durandal-mcp -v` | Show version | ✅ Yes |
| `durandal-mcp --version` | Show version | ✅ Yes |
| `durandal-mcp -h` | Show help | ✅ Yes |
| `durandal-mcp --help` | Show help | ✅ Yes |
| `durandal-mcp --test` | Run tests | ✅ Yes |
| `durandal-mcp --update` | Check for and install updates | ✅ Yes |
| `durandal-mcp` | Start server | ❌ No (blocks) |
| `durandal-mcp --debug` | Start with debug logs | ❌ No (blocks) |
| `durandal-mcp --verbose` | Start with verbose output | ❌ No (blocks) |

## Important: Flag Syntax Rules

### ✅ Correct Usage

**Short flags** use a **single dash** (`-`) followed by a **single letter**:
```bash
durandal-mcp -v    # Correct
durandal-mcp -h    # Correct
```

**Long flags** use **double dashes** (`--`) followed by the **full word**:
```bash
durandal-mcp --version    # Correct
durandal-mcp --help       # Correct
durandal-mcp --test       # Correct
durandal-mcp --debug      # Correct
```

### ❌ Common Mistakes

**Double dash + single letter** is NOT valid:
```bash
durandal-mcp --v    # ❌ WRONG - Starts server instead of showing version
durandal-mcp --h    # ❌ WRONG - Starts server instead of showing help
```

**Why?** This violates Unix command-line conventions. Always use:
- Single dash for short flags: `-v`, `-h`
- Double dash for long flags: `--version`, `--help`

## Detailed Command Examples

### Show Version Information

**Correct:**
```bash
durandal-mcp -v
durandal-mcp --version
```

**Output:**
```
Durandal MCP Server
Version: 3.0.0
Node.js: v22.20.0
Platform: win32 x64
MCP SDK: ^1.17.5
SQLite3: ^5.1.6
```

**Exit Code:** 0 (success)

---

### Show Help Message

**Correct:**
```bash
durandal-mcp -h
durandal-mcp --help
```

**Output:**
```
Durandal MCP Server v3 - Zero-config AI memory system for Claude Code

Usage: durandal-mcp [options]

Options:
  --help, -h        Show this help message
  --version, -v     Show version information
  --test            Run built-in test suite
  --debug           Enable debug logging
  --verbose         Enable verbose output
  --log-file FILE   Write logs to file
  --log-level LEVEL Set log level (debug, info, warn, error)

Environment Variables:
  LOG_LEVEL         Set logging level (debug, info, warn, error)
  VERBOSE           Enable verbose logging (true/false)
  DEBUG             Enable debug mode (true/false)
  LOG_MCP_TOOLS     Log all MCP tool calls (true/false)
  LOG_FILE          Path to log file
  ERROR_LOG_FILE    Path to error log file
  DATABASE_PATH     SQLite database path (default: ./durandal-mcp-memory.db)

Examples:
  durandal-mcp                    # Start normally
  durandal-mcp --test             # Run tests
  durandal-mcp --debug            # Start with debug logging
  DEBUG=true durandal-mcp         # Enable debug via environment
  LOG_FILE=./logs/mcp.log durandal-mcp  # Log to file
```

**Exit Code:** 0 (success)

---

### Run Test Suite

**Correct:**
```bash
durandal-mcp --test
node durandal-mcp-server-v3.js --test
npm test
```

**Output:**
```
🧪 Running Durandal MCP Server Tests

🧪 Running Durandal MCP Server Tests...

==================================================
  Database Connection... ✅ (9ms)
  Schema Validation... ✅ (3ms)
  Store Memory... ✅ (18ms)
  Search Memory... ✅ (7ms)
  Get Recent Memories... ✅ (15ms)
  Cache Operations... ✅ (0ms)
  MCP Tool Availability... ✅ (0ms)
  Error Handling... ✅ (3ms)
  Performance Benchmarks... ✅ (472ms)

==================================================
📊 Test Summary:
==================================================

  Total Tests: 9
  ✅ Passed: 9
  ❌ Failed: 0
  ⏱️  Duration: 529ms

🎉 All tests passed!
```

**Exit Code:** 0 (all tests pass) or 1 (tests failed)

---

### Check for and Install Updates

**Correct:**
```bash
durandal-mcp --update
node durandal-mcp-server-v3.js --update
```

**Output:**
```
🔄 Durandal MCP Update Tool

🔍 Checking for updates...

✅ Update available: v3.0.1 → v3.0.2

📋 This will run: npm install -g durandal-memory-mcp@latest

⏳ Installing update...

✅ Update completed successfully!
   Run 'durandal-mcp --version' to verify.
```

**Behavior:**
- Checks npm registry for latest version
- If update available, downloads and installs it automatically
- Requires npm to be installed and accessible
- May require elevated permissions (sudo on macOS/Linux)

**Exit Code:** 0 (update successful) or 1 (update failed)

**Update Notifications:**

When you start the server normally, it will check for updates once per day and show a notification if one is available:

```bash
$ durandal-mcp
📊 Database: Using SQLite at ./durandal-mcp-memory.db
✅ SQLite schema initialized

╭──────────────────────────────────────────────────────────╮
│                                                          │
│  Update available: 3.0.1 → 3.0.2                        │
│                                                          │
│  Run: durandal-mcp --update                             │
│                                                          │
│  Release: https://github.com/.../releases/v3.0.2        │
│                                                          │
╰──────────────────────────────────────────────────────────╯

[Server continues running normally...]
```

**Disable Update Checks:**

To disable automatic update notifications, set an environment variable:

```bash
# Disable update checks completely
export NO_UPDATE_CHECK=1
durandal-mcp

# Or use the config file
UPDATE_CHECK_ENABLED=false durandal-mcp
```

**Configuration Options:**

See `.env.mcp-minimal` for all update configuration options:
- `UPDATE_CHECK_ENABLED` - Enable/disable update checks (default: true)
- `UPDATE_CHECK_INTERVAL` - Check interval in ms (default: 24 hours)
- `UPDATE_NOTIFICATION` - Show notifications (default: true)
- `AUTO_UPDATE` - Auto-update without prompting (NOT RECOMMENDED)
- `SHOW_PRERELEASE` - Show pre-release versions (default: false)

---

### Start Server (Normal Mode)

**Correct:**
```bash
durandal-mcp
node durandal-mcp-server-v3.js
npm start
```

**Output:**
```
📊 Database: Using SQLite at ./durandal-mcp-memory.db
✅ SQLite schema initialized
[Server blocks here, waiting for MCP protocol messages]
```

**Behavior:** Server starts and **blocks** (does not exit). This is correct - the server waits for stdin messages from Claude Code via MCP protocol.

**To stop:** Press `Ctrl+C` or send SIGTERM/SIGINT signal.

---

### Start Server (Debug Mode)

**Correct:**
```bash
durandal-mcp --debug
node durandal-mcp-server-v3.js --debug
```

**Output:**
```
[2025-09-26T18:14:14.802Z] INFO  🚀 Durandal MCP Server starting {"version":"3.0.0","node":"v22.20.0","pid":7356}
📊 Database: Using SQLite at ./durandal-mcp-memory.db
[2025-09-26T18:14:14.810Z] INFO  Server Configuration {"logLevel":"debug","verbose":false,"debug":true,...}
[2025-09-26T18:14:14.812Z] INFO  🚀 Durandal MCP Server running {"transport":"stdio","features":[...]}
[2025-09-26T18:14:14.812Z] INFO  System Information {"nodeVersion":"v22.20.0","platform":"win32",...}
✅ SQLite schema initialized
[Server blocks here with debug logging enabled]
```

**Behavior:** Server starts with debug-level logging and **blocks** (does not exit).

---

### Start Server (Verbose Mode)

**Correct:**
```bash
durandal-mcp --verbose
node durandal-mcp-server-v3.js --verbose
```

**Behavior:** Server starts with verbose output and **blocks** (does not exit).

---

### Advanced Options

#### Custom Log File

```bash
durandal-mcp --log-file ./logs/mcp.log
```

#### Custom Log Level

```bash
durandal-mcp --log-level debug
durandal-mcp --log-level info
durandal-mcp --log-level warn
durandal-mcp --log-level error
```

#### Combined Flags

```bash
durandal-mcp --debug --log-file ./logs/debug.log
durandal-mcp --verbose --log-level info
```

---

## Environment Variables

You can also configure the server using environment variables:

### Windows (cmd)
```cmd
set LOG_LEVEL=debug
set DATABASE_PATH=./custom-memory.db
durandal-mcp
```

### Windows (PowerShell)
```powershell
$env:LOG_LEVEL="debug"
$env:DATABASE_PATH="./custom-memory.db"
durandal-mcp
```

### macOS/Linux
```bash
export LOG_LEVEL=debug
export DATABASE_PATH=./custom-memory.db
durandal-mcp
```

### One-time Environment Variables

**Windows:**
```cmd
cmd /c "set LOG_LEVEL=debug && durandal-mcp"
```

**macOS/Linux:**
```bash
LOG_LEVEL=debug durandal-mcp
```

---

## Troubleshooting

### Problem: `durandal-mcp --v` doesn't show version

**Cause:** `--v` is not a valid flag. The double dash is for long flags (`--version`), not short flags.

**Solution:** Use either:
- `durandal-mcp -v` (single dash + single letter), OR
- `durandal-mcp --version` (double dash + full word)

### Problem: Server doesn't exit after starting

**Cause:** This is correct behavior! The server is supposed to block and wait for MCP messages.

**Solution:**
- If testing: Use `Ctrl+C` to stop
- If using with Claude Code: Let Claude Code manage the server lifecycle

### Problem: Unknown flags are ignored

**Cause:** The server silently ignores unknown flags and starts normally.

**Example:**
```bash
durandal-mcp --unknown-flag
# Result: Server starts normally (blocks)
```

**Solution:** Double-check flag spelling. Refer to `durandal-mcp --help` for valid flags.

---

## Summary: Flag Syntax

| Format | Example | Valid? |
|--------|---------|--------|
| `-X` (single dash + letter) | `-v`, `-h` | ✅ Valid |
| `--word` (double dash + word) | `--version`, `--help` | ✅ Valid |
| `--X` (double dash + letter) | `--v`, `--h` | ❌ Invalid |
| `---word` (triple dash) | `---version` | ❌ Invalid |

**Remember:** When in doubt, use `durandal-mcp --help` to see all valid options!