# Durandal Installation Guide

Complete installation and setup guide for the Durandal AI Memory System.

## 📋 Prerequisites

### System Requirements
- **Node.js**: Version 18.0.0 or higher
- **NPM**: Version 8.0.0 or higher
- **Operating System**: Windows, macOS, or Linux
- **Memory**: Minimum 4GB RAM (8GB+ recommended)
- **Storage**: 1GB+ free space

### Required API Keys
At least one AI provider API key is required:
- **Claude API** (Anthropic) - Recommended
- **OpenAI API** (ChatGPT)
- **Google AI** (Gemini)

## 🚀 Installation Methods

### Method 1: NPM Global Installation (Recommended)

This is the easiest method for most users:

```bash
# Install globally
npm install -g @enterprise/durandal-memory

# Verify installation
durandal --version
```

**Available Commands After Installation:**
- `durandal` - Main CLI interface
- `durandal-ui` - Web UI server
- `durandal-mcp` - MCP server for Claude Code

### Method 2: Local Development Installation

For developers who want to modify the code:

```bash
# Clone repository
git clone <repository-url>
cd durandal-memory

# Install dependencies
npm install

# Run locally
npm start
```

### Method 3: Claude Code MCP Integration

For users wanting Durandal integrated with Claude Code:

```bash
# Install globally first
npm install -g @enterprise/durandal-memory

# Configure Claude Code integration
durandal-mcp --configure-claude-code
```

## ⚙️ Configuration Setup

### Step 1: Initialize Configuration

```bash
# Create configuration files
durandal --init
```

This creates:
- `.env` file for environment variables
- `durandal.config.json` for advanced settings
- `logs/` directory for system logs

### Step 2: Configure Environment Variables

Copy the distribution template:
```bash
cp .env.distribution .env
```

Edit `.env` file with your settings:

```env
# =================================================================
# AI PROVIDER CONFIGURATION (Choose your preferred AI)
# =================================================================

# Claude API (Anthropic) - Recommended
CLAUDE_API_KEY=your_claude_api_key_here
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# OpenAI API (Optional)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4-turbo-preview

# Google AI / Gemini (Optional)
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_MODEL=gemini-pro

# =================================================================
# DATABASE CONFIGURATION (Choose SQLite or PostgreSQL)
# =================================================================

# SQLite (Default - No setup required)
DATABASE_TYPE=sqlite
DATABASE_PATH=./durandal-memory.db

# PostgreSQL (Enterprise - Uncomment if needed)
# DATABASE_TYPE=postgresql
# DATABASE_URL=postgresql://username:password@localhost:5432/durandal_memory

# =================================================================
# APPLICATION CONFIGURATION
# =================================================================

NODE_ENV=production
PORT=3000
HOST=localhost
MEMORY_API_KEY=durandal-secure-key-change-this
```

### Step 3: Database Setup (Automated)

**New: One-Command Setup!**
```bash
durandal --setup-db
```

This interactive wizard will:
- Auto-detect your preferred database type
- Set up SQLite automatically (recommended for most users)
- Configure PostgreSQL with automatic database/user creation
- Run all necessary migrations
- Test the connection

#### Manual Database Configuration (Optional)

**SQLite (Default - Zero Configuration)**
```env
DATABASE_TYPE=sqlite
DATABASE_PATH=./durandal-memory.db
```

**PostgreSQL (Enterprise)**
```env
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://user:password@localhost:5432/durandal_memory
```

Or use individual components:
```env
DATABASE_TYPE=postgresql
DB_HOST=localhost
DB_NAME=durandal_memory
DB_USER=durandal_user
DB_PASSWORD=your_password
DB_PORT=5432
```

## 🧪 Verification & Testing

### Step 1: Basic System Test
```bash
durandal --test
```

### Step 2: Database Setup Test
```bash
durandal --test-setup
```

### Step 3: API Key Validation
```bash
durandal --validate-keys
```

### Step 4: Full System Test
```bash
durandal --test
```

Expected output:
```
✅ Database connection: OK
✅ API keys: Valid
✅ Memory system: Operational
✅ RAMR cache: Active
✅ Context manager: Ready
✅ Knowledge analyzer: Initialized
```

## 🔧 Claude Code Integration Setup

### Automatic Configuration (Recommended)

```bash
durandal-mcp --configure-claude-code
```

This automatically:
- Detects Claude Code installation
- Updates MCP server configuration
- Configures tool permissions
- Tests the integration

### Manual Configuration

1. **Locate Claude Code configuration directory:**
   - **Windows**: `%USERPROFILE%\.claude\`
   - **macOS/Linux**: `~/.claude/`

2. **Edit `settings.json`:**
   ```json
   {
     "mcpServers": {
       "durandal-memory": {
         "command": "durandal-mcp",
         "args": [],
         "env": {}
       }
     }
   }
   ```

3. **Configure tool permissions in `settings.json`:**
   ```json
   {
     "allowedTools": [
       "mcp__durandal-memory__store_memory",
       "mcp__durandal-memory__search_memories",
       "mcp__durandal-memory__get_context",
       "mcp__durandal-memory__optimize_memory"
     ]
   }
   ```

4. **Test integration:**
   ```bash
   claude --test-mcp durandal-memory
   ```

## 🎯 First Usage

### CLI Mode
```bash
durandal
```

Try these commands:
```
> store I prefer React with TypeScript for frontend development
> search React
> recall development preferences
> stats
```

### UI Mode
```bash
durandal-ui
```
Open browser to `http://localhost:3000`

### Claude Code Integration
Open Claude Code and test:
```
Store this memory: I work best between 9-11 AM and prefer Python for data analysis.
```

## 🔒 Security Configuration

### API Key Security
- Store API keys in `.env` file (never commit to version control)
- Use environment variable references for production
- Rotate keys regularly

### Database Security
```env
# Enable encryption
DB_ENCRYPTION=true
DB_ENCRYPTION_KEY=your-32-character-encryption-key

# Connection security
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
```

### Access Control
```env
# Enable authentication
USER_AUTHENTICATION=true
SESSION_SECRET=your-session-secret-key
JWT_SECRET=your-jwt-secret-key

# Rate limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW=3600
```

## 📊 Performance Optimization

### Memory Configuration
```env
# RAMR Cache optimization
RAMR_CACHE_SIZE=1000
RAMR_CACHE_TTL=3600
RAMR_PREFETCH_ENABLED=true

# Context management
MAX_CONTEXT_TOKENS=100000
CONTEXT_COMPRESSION_THRESHOLD=80000
INTELLIGENT_CONTEXT_MODE=true
```

### Database Performance
```env
# Connection pooling
DB_POOL_SIZE=10
DB_CONNECTION_TIMEOUT=30000
DB_QUERY_TIMEOUT=10000

# Query optimization
DB_ENABLE_QUERY_CACHE=true
DB_QUERY_CACHE_SIZE=100
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Installation Fails
```bash
# Clear npm cache
npm cache clean --force

# Install with verbose logging
npm install -g @enterprise/durandal-memory --verbose
```

#### 2. Database Connection Error
```bash
# Check database status
durandal --test-db

# Reset database
durandal --reset-db
```

#### 3. API Key Issues
```bash
# Validate all keys
durandal --validate-keys

# Test specific provider
durandal --test-provider claude
```

#### 4. MCP Integration Not Working
```bash
# Test MCP server
durandal-mcp --test

# Check Claude Code logs
claude --logs
```

#### 5. Performance Issues
```bash
# Optimize memory system
durandal --optimize

# Clear caches
durandal --clear-cache
```

### Debug Mode

Enable verbose logging:
```bash
DEBUG=durandal:* durandal
```

Or set in `.env`:
```env
DEBUG_MODE=true
VERBOSE_LOGGING=true
LOG_LEVEL=debug
```

## 🔄 Updates

### Automatic Updates
```bash
npm update -g @enterprise/durandal-memory
```

### Manual Updates
```bash
npm uninstall -g @enterprise/durandal-memory
npm install -g @enterprise/durandal-memory@latest
```

### Version Check
```bash
durandal --version
npm list -g @enterprise/durandal-memory
```

## 🗄️ Backup & Migration

### Backup
```bash
# Backup all data
durandal --backup

# Backup to specific location
durandal --backup --path ./backups/$(date +%Y%m%d)
```

### Restore
```bash
# Restore from backup
durandal --restore --path ./backups/20241122

# Restore with verification
durandal --restore --path ./backups/20241122 --verify
```

### Migration
```bash
# Migrate from older version
durandal --migrate

# Migrate from different database
durandal --migrate --from postgresql --to sqlite
```

## 🆘 Getting Help

### Documentation
- **Quick Start**: [README.md](README.md)
- **API Reference**: [docs/api.md](docs/api.md)
- **Advanced Configuration**: [docs/configuration.md](docs/configuration.md)

### Support Channels
- **GitHub Issues**: Report bugs and feature requests
- **GitHub Discussions**: Community support and questions
- **Email Support**: support@durandal-ai.com

### Diagnostic Information
```bash
# Generate diagnostic report
durandal --diagnose

# System information
durandal --system-info
```

---

**Installation Complete!** 🎉

You're now ready to use Durandal's advanced AI memory capabilities. Start with the CLI mode (`durandal`) to explore the features, or integrate with Claude Code for seamless development assistance.