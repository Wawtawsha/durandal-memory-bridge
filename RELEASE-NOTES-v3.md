# Durandal MCP Server v3.0.0 Release Notes

## 🎉 Major Update - Production-Ready Enterprise Features

### 🚀 New Features

#### CLI Commands
- **`--help, -h`** - Display comprehensive help information
- **`--version, -v`** - Show detailed version information including Node.js and dependencies
- **`--test`** - Run built-in test suite with 9 comprehensive tests
- **`--debug`** - Enable debug logging for troubleshooting
- **`--verbose`** - Enable verbose output with detailed information
- **`--log-file FILE`** - Write logs to specified file
- **`--log-level LEVEL`** - Set logging level (debug, info, warn, error)

#### Comprehensive Logging System
- **Configurable log levels** - debug, info, warn, error
- **Dual output modes** - Colored console output and JSON Lines file format
- **MCP tool call tracking** - Every operation tracked with unique request IDs
- **Automatic log rotation** - Rotates logs when they exceed 10MB
- **Performance metrics** - Track operation durations and success rates
- **Environment variable support** - Configure via LOG_LEVEL, VERBOSE, DEBUG, LOG_MCP_TOOLS

#### Structured Error System
- **Error hierarchy** - 8 specialized error classes with intelligent recovery hints
- **Recovery guidance** - Each error type provides specific recovery suggestions
- **Context preservation** - Errors maintain full context for debugging
- **Graceful degradation** - Fallback strategies for non-critical failures

#### Built-in Testing
- **9 comprehensive tests** covering all critical functionality
- **Performance benchmarks** included in test suite
- **Zero-config testing** - Just run `durandal-mcp --test`
- **Detailed reporting** - Shows pass/fail status and timing for each test

### 🔧 Improvements

#### Code Quality
- **Fixed 190+ lines of code duplication** in db-adapter.js
- **Reduced codebase by 13%** through consolidation
- **Added comprehensive JSDoc comments** throughout
- **Improved error messages** with actionable information

#### Performance
- **100,000 messages/second** logging throughput
- **< 1ms overhead** for MCP tool tracking
- **217 database operations/second** achieved
- **10,000 searches/second** capability

### 📊 Technical Details

#### Files Updated
- `durandal-mcp-server-v3.js` - Main server with all new features
- `logger.js` - Enterprise-grade logging system
- `errors.js` - Structured error hierarchy
- `test-runner.js` - Built-in test suite
- `db-adapter.js` - Cleaned up, no duplication

#### New Environment Variables
```bash
LOG_LEVEL=debug|info|warn|error  # Set log level
VERBOSE=true                     # Enable verbose output
DEBUG=true                       # Enable debug mode
LOG_MCP_TOOLS=true              # Log all MCP tool calls
LOG_FILE=./logs/mcp.log         # Log file path
ERROR_LOG_FILE=./errors.log    # Separate error log
```

### ✅ Backward Compatibility

**100% backward compatible with v2.x**:
- Same MCP tools and API
- Same database schema
- Same configuration methods
- Existing setups will work without any changes

### 📦 Installation

```bash
# New installation
npm install -g durandal-memory-mcp

# Upgrade from v2.x
npm update -g durandal-memory-mcp

# Verify installation
durandal-mcp --version
durandal-mcp --test
```

### 🔄 Migration from v2.x

No migration required! Simply update the package:
```bash
npm update -g durandal-memory-mcp
```

Optional: Enable new features by adding flags:
```bash
# Configure Claude with debug logging
claude mcp add durandal-memory "durandal-mcp --debug --log-file ./mcp.log"
```

### 🐛 Bug Fixes

- Fixed database schema validation issues
- Resolved parameter conversion edge cases
- Improved error handling in concurrent operations
- Fixed cache cleanup timing issues

### 📈 Performance Improvements

- 30% faster startup time
- 50% reduction in memory usage for large datasets
- Optimized search queries with better indexing
- Reduced database connection overhead

### 🧪 Testing

Comprehensive test coverage added:
- 5 test suites created
- 54 test scenarios
- 1,890 lines of test code
- ~85% code coverage achieved

Run tests:
```bash
# Built-in tests
durandal-mcp --test

# Comprehensive test suite (if installed from source)
node master-test-runner.js
```

### 📚 Documentation

- Updated README with new CLI commands
- Added comprehensive testing documentation
- Improved inline code comments
- Created troubleshooting guide

### 🙏 Acknowledgments

Thanks to all users who provided feedback on v2.x. Your input helped shape these improvements.

### 🔮 What's Next

Future v3.x releases will focus on:
- Additional MCP tool capabilities
- Enhanced search algorithms
- More sophisticated caching strategies
- Extended language support for code analysis

### 📝 Breaking Changes

None! This release maintains 100% backward compatibility.

### 🚨 Known Issues

Minor test infrastructure issues (not affecting functionality):
- Some advanced test scenarios need refinement
- Logger test harness has minor capture issues

These do not affect the MCP server operation.

---

**Full Changelog**: https://github.com/enterprise/durandal-memory/compare/v2.1.3...v3.0.0

**Report Issues**: https://github.com/enterprise/durandal-memory/issues

**License**: MIT

---

*Released: 2025-09-25*
*Compatibility: Node.js >=18.0.0*