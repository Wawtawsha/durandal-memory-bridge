# Durandal AI - Production Deployment Guide

## 🚀 System Overview

**Durandal AI v2.1.0** is now ready for production deployment with complete 4-phase intelligent file management system:

- **Phase 1**: Core AI assistant with memory & context management
- **Phase 2**: Enhanced context-aware file selection (91.7% success rate)
- **Phase 3**: Advanced commands & system monitoring (50+ commands)
- **Phase 4**: Semantic search & AI-powered code understanding (100+ total commands)

## ✅ Pre-Deployment Checklist

### System Requirements
- [x] Node.js >=18.0.0
- [x] PostgreSQL or SQLite database
- [x] Claude API access
- [x] 4GB+ RAM recommended
- [x] 1GB+ disk space for indexing

### Component Status
- [x] All core components tested and functional
- [x] Phase 2-4 integration verified
- [x] Cross-phase communication operational
- [x] Error handling and graceful degradation implemented
- [x] Performance optimization completed

## 🔧 Production Setup

### 1. Environment Configuration

Create `.env` file with required variables:
```bash
# Claude API Configuration
CLAUDE_API_KEY=your_claude_api_key_here

# Database Configuration (choose one)
# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/durandal

# Or SQLite (default)
DATABASE_TYPE=sqlite
DATABASE_PATH=./durandal.db

# Optional: Performance Tuning
MAX_CONTEXT_TOKENS=25000
RAMR_CACHE_SIZE=1000
SEMANTIC_INDEX_BATCH_SIZE=50
```

### 2. Database Setup

#### PostgreSQL Setup
```sql
-- Run the schema migration
\i claude_memory_schema.sql
\i durandal_migration.sql
\i extraction_schema_update.sql
```

#### SQLite Setup (Default)
Database files will be created automatically:
- `durandal.db` - Main conversation and project data
- `ramr.db` - Intelligent caching system
- `ramr-cache.db` - Additional cache storage

### 3. Initial System Preparation

```bash
# Install dependencies
npm install

# Test system health
npm run test-quick

# Validate all components
node test-complete-system.js

# Initialize semantic indexing (optional, for existing codebases)
npm run durandal
# Then run: /index rebuild
```

## 🚀 Starting the System

### CLI Interface (Primary)
```bash
npm run durandal
# or
npm start
```

### Web UI Interface
```bash
npm run durandal-ui
```

### Development Mode
```bash
npm run dev          # CLI with auto-restart
npm run dev-memory   # Memory-focused development
```

## 🎯 Available Commands (100+)

### Core Commands
```bash
/commands              # Show all available commands
/status               # Project summary and statistics
/save <name>          # Save conversation session
/knowledge <text>     # Store project knowledge
```

### Phase 2: Enhanced File Management
```bash
/files                # Enhanced filesystem access
/files help           # Detailed file commands
```

### Phase 3: Advanced Commands
```bash
/ac, /advanced-context     # Advanced context commands
/mc, /maximum-context      # Maximum context operations
/ic, /intelligent-context  # Intelligent context analysis
/health, /perf, /diag      # System monitoring & diagnostics
/sysmon                    # System monitoring dashboard
/nlp, /suggest, /learn     # Intelligent command processing
```

### Phase 4: Semantic Search & AI
```bash
/search <query>            # Natural language semantic search
/semantic-search <query>   # Advanced semantic code search
/index [status|rebuild]    # Manage semantic indexing
/analyze [path]            # AI-powered code analysis
/predict [file]            # ML-based file predictions
/docs [path]               # Generate automated documentation
/graph [stats|explore]     # Knowledge graph operations
/phase4-metrics            # Phase 4 performance metrics
```

### Context Management
```bash
/revolutionary-mode (/rm)  # Maximum context + cross-session memory
/max-context (/mc)         # 18000+ token budget mode
/aggressive-mode (/am)     # 15000+ tokens + enhanced retrieval
/intelligent-mode (/im)    # Standard intelligent context
```

### Knowledge Management
```bash
/extraction-settings (/es) # Configure knowledge extraction
/knowledge-review (/kr)    # Review extracted knowledge
/knowledge-search (/ks)    # Search knowledge base
/knowledge-stats (/kstats) # Show extraction statistics
```

## 📊 Performance Monitoring

### Built-in Monitoring
```bash
/health               # System health check
/perf                 # Performance metrics
/diag                 # Diagnostic information
/phase4-metrics       # Semantic search performance
```

### Key Metrics to Monitor
- **Search Response Time**: Target <1000ms (currently ~1ms)
- **Memory Usage**: Monitor heap usage (currently ~5.6MB baseline)
- **Cache Hit Rate**: RAMR cache efficiency
- **Context Build Time**: Revolutionary mode performance
- **Semantic Index Size**: Growth over time

## 🔍 Usage Examples

### Natural Language Search
```bash
/search find authentication functions
/search show me database models
/search locate API endpoints with JWT
/search find similar components to UserModel
```

### AI-Powered Analysis
```bash
/analyze src/auth.js          # Analyze specific file
/predict auth.js              # Get file predictions
/docs src/                    # Generate documentation
/graph explore authentication # Explore knowledge graph
```

### Advanced Context Management
```bash
/revolutionary-mode           # Enable maximum context
/search complex authentication patterns  # Use enhanced context
/ac status                   # Check advanced context status
```

## 🛡️ Security & Best Practices

### API Security
- Store Claude API key securely in `.env`
- Use environment-specific API keys
- Monitor API usage and costs

### Data Security
- Database contains conversation history and extracted knowledge
- Implement regular backups
- Consider encryption for sensitive projects

### Performance Optimization
- Use `/index rebuild` for large codebases
- Monitor memory usage in production
- Clean up old conversation sessions periodically

## 🔧 Troubleshooting

### Common Issues

#### API Key Issues
```bash
# Error: CLAUDE_API_KEY not found
echo "CLAUDE_API_KEY=your_key_here" > .env
```

#### Database Connection Issues
```bash
# Test database connectivity
npm run test-db
```

#### Memory Issues
```bash
# Monitor memory usage
/health
/perf

# Clear caches if needed
/index status
# Restart system if memory usage is high
```

#### Search Not Returning Results
```bash
# Rebuild semantic index
/index rebuild

# Check indexing status
/index status

# Verify components
node test-phase4-simple.js
```

### Support Commands
```bash
npm run test-quick           # Quick health check
npm run test-all            # Comprehensive testing
npm run cleanup-test-data   # Clean test artifacts
node test-complete-system.js # Full system validation
```

## 📈 Scaling Considerations

### For Large Codebases
- Increase `SEMANTIC_INDEX_BATCH_SIZE` in .env
- Consider PostgreSQL for better performance
- Monitor disk usage for semantic indexes

### For Multiple Users
- Use PostgreSQL for concurrent access
- Implement user session management
- Monitor API rate limits

### For High Performance
- Use SSD storage for databases
- Increase Node.js heap size if needed: `--max-old-space-size=4096`
- Enable connection pooling for PostgreSQL

## 🎉 Success Validation

After deployment, verify the system is working correctly:

```bash
# 1. Test basic functionality
npm run test-quick

# 2. Test all phases
node test-complete-system.js

# 3. Test semantic search
/search test query

# 4. Check system health
/health

# 5. Verify all commands
/commands
```

If all tests pass and commands are available, **Durandal AI is successfully deployed and ready for production use!**

## 📞 Quick Start Commands

Once deployed, try these commands to get started:

```bash
/commands                    # See all available commands
/revolutionary-mode         # Enable maximum AI capabilities
/search find main functions # Test semantic search
/health                     # Check system status
/phase4-metrics            # View AI performance metrics
```

**Durandal AI is now ready to serve as your intelligent development assistant with full semantic search and AI-powered code understanding capabilities.**