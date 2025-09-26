# Durandal Memory MCP Server

[![NPM Version](https://img.shields.io/npm/v/durandal-memory-mcp.svg)](https://npmjs.org/package/durandal-memory-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

**Zero-config AI memory system for Claude Code via Model Context Protocol (MCP)**

Give Claude Code persistent memory that remembers across sessions. Store information, search memories, and maintain context automatically.

## 🚀 Quick Start

### 1. Install
```bash
npm install -g durandal-memory-mcp
```

### 2. Add to Claude Code
```bash
# For Windows
claude mcp add durandal-memory -- cmd /c durandal-mcp

# For macOS/Linux
claude mcp add durandal-memory -- durandal-mcp
```

### 3. Verify Setup
```bash
claude mcp list
# Should show: durandal-memory: ... - ✓ Connected
```

**That's it!** 🎉 No configuration files, no API keys, no database setup required.

## 💬 How to Use

Just talk naturally to Claude Code. The memory system activates automatically:

### Store Memories
- *"Remember that I prefer React with TypeScript"*
- *"Store this API endpoint for later: https://api.example.com"*
- *"I need you to remember my coding style preferences"*

### Retrieve Memories
- *"What do you remember about my preferences?"*
- *"Search my memories for React"*
- *"Do you recall anything about TypeScript?"*

### Get Context
- *"What context do you have about this project?"*
- *"Show me recent memories"*
- *"What's in my memory system?"*

### Optimize Memory
- *"Optimize my memories"*
- *"Clean up memory storage"*

## ✨ Features

- **🧠 Persistent Memory**: Remembers across Claude Code sessions
- **🔍 Smart Search**: Find information using natural language
- **📊 Auto-Categorization**: Organizes memories by type and importance
- **⚡ Zero Configuration**: Works immediately after installation
- **💾 SQLite Database**: Automatically created on first use
- **🔒 Local Storage**: All data stays on your machine

## 🛠️ MCP Tools Available

The server exposes these tools to Claude Code:

- `store_memory` - Store content with metadata
- `search_memories` - Search with filters and queries
- `get_context` - Retrieve recent memories and statistics
- `optimize_memory` - Run memory system optimization

## 📁 File Structure

After installation, the server creates:
- `durandal-mcp-memory.db` - SQLite database (auto-created)
- Memory data organized by:
  - Content and metadata
  - Categories and keywords
  - Importance scores
  - Timestamps

## ⚙️ Configuration (Optional)

The system works with zero configuration, but you can customize:

```bash
# Copy the minimal config template
cp node_modules/durandal-memory-mcp/.env.mcp-minimal .env

# Edit if needed (both settings are optional):
DATABASE_PATH=./my-custom-memory.db
LOG_LEVEL=info
```

## 🔧 Advanced Usage

### Check Server Status
```bash
durandal-mcp --help
```

### Run Standalone Test
```bash
durandal-mcp --test
```

### Different Working Directory
The MCP server creates its database in the current working directory where Claude Code is running.

## 🐛 Troubleshooting

### MCP Server Not Connecting
```bash
# Check if server is configured
claude mcp list

# Remove and re-add if needed
claude mcp remove durandal-memory
claude mcp add durandal-memory -- cmd /c durandal-mcp
```

### Database Issues
```bash
# The database is auto-created, but if you have permission issues:
# Make sure the directory is writable
# Delete the .db file to recreate: rm durandal-mcp-memory.db
```

### Memory Not Working
- Make sure you're using natural language (not technical commands)
- Try: *"Remember this:"* followed by your content
- Check that Claude Code shows the MCP server as connected

## 📋 Requirements

- **Node.js**: 18.0.0 or higher
- **Claude Code**: Latest version
- **Operating System**: Windows, macOS, or Linux

## 🤝 Support

- **Issues/Feedback**: stephen.leonard@entdna.com

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Zero-config persistent memory for Claude Code** 🧠✨