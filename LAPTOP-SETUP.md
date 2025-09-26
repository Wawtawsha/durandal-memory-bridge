# Durandal MCP - Laptop Setup Guide

## Overview

This guide helps you set up Durandal development on your new laptop and keep it in sync with your PC.

## One-Time Laptop Setup

### Step 1: Install Prerequisites

```bash
# Ensure you have Node.js 18+ installed
node --version

# Ensure you have Git installed
git --version

# Install Claude CLI (if not already installed)
npm install -g @anthropic-ai/claude-cli
```

### Step 2: Clone the Repository

```bash
# Navigate to where you want the project
cd ~/Desktop  # or wherever you prefer

# Clone from GitHub
git clone https://github.com/Wawtawsha/durandal-memory-bridge.git

# Enter the directory
cd durandal-memory-bridge

# Install dependencies
npm install
```

### Step 3: Configure Git Identity (if needed)

```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### Step 4: Set Up Claude Code on Laptop

#### A. Copy Global Claude Instructions

Copy your `CLAUDE.md` file from PC to laptop:

**From PC** (run on PC):
```bash
# Location: C:\Users\Donnager\.claude\CLAUDE.md
# Copy this file to a USB drive or cloud storage
```

**On Laptop**:
```bash
# Windows: Copy to C:\Users\YourName\.claude\CLAUDE.md
# Mac: Copy to ~/.claude/CLAUDE.md
# Linux: Copy to ~/.claude/CLAUDE.md
```

#### B. Configure Durandal MCP

For **end-user usage** (using NPM package):
```bash
# Install from NPM
npm install -g durandal-memory-mcp

# Configure Claude
claude mcp add durandal-memory "durandal-mcp"

# Verify
durandal-mcp --test
```

For **development usage** (from source):
```bash
# From the cloned repository
npm link

# Configure Claude to use local version
claude mcp add durandal-memory "durandal-mcp"
```

### Step 5: Optional - Transfer Durandal Database

If you want to continue with your existing memories from PC:

**From PC**:
```bash
# Copy the database file
# Location: C:\Users\Donnager\Desktop\Claude\pog\projectDir\claude-chatbot\durandal-mcp-memory.db
```

**On Laptop**:
```bash
# Place it in the cloned repository directory
# Or let it create a fresh one automatically
```

### Step 6: Verify Setup

```bash
# Test the MCP server
durandal-mcp --test

# Check version
durandal-mcp --version

# Run comprehensive tests (from source)
node master-test-runner.js
```

## Daily Development Workflow

### Before Starting Work (Both PC and Laptop)

```bash
# Pull latest changes
git pull origin main

# If needed, update dependencies
npm install
```

### After Making Changes (Both PC and Laptop)

```bash
# Check what changed
git status

# Stage your changes
git add .

# Commit with descriptive message
git commit -m "Your descriptive message here"

# Push to GitHub
git push origin main
```

### Best Practices

1. **Always pull before starting work** to avoid merge conflicts
2. **Commit frequently** with clear messages
3. **Push regularly** so both machines stay in sync
4. **Test before committing** with `durandal-mcp --test`

## File Locations Reference

### PC Paths
- **Project**: `C:\Users\Donnager\Desktop\Claude\pog\projectDir\claude-chatbot\`
- **Claude Config**: `C:\Users\Donnager\.claude\CLAUDE.md`
- **Claude Desktop Config**: `%APPDATA%\Claude\config.json`
- **Database**: `./durandal-mcp-memory.db` (in project directory)

### Laptop Paths (Windows)
- **Project**: `C:\Users\YourName\Desktop\durandal-memory-bridge\` (or wherever you cloned)
- **Claude Config**: `C:\Users\YourName\.claude\CLAUDE.md`
- **Claude Desktop Config**: `%APPDATA%\Claude\config.json`

### Laptop Paths (Mac)
- **Project**: `~/Desktop/durandal-memory-bridge/` (or wherever you cloned)
- **Claude Config**: `~/.claude/CLAUDE.md`
- **Claude Desktop Config**: `~/Library/Application Support/Claude/config.json`

## Troubleshooting

### Issue: Git merge conflicts

```bash
# If you get conflicts, resolve manually or:
git fetch origin
git reset --hard origin/main  # WARNING: Discards local changes
```

### Issue: Different Node versions

```bash
# Use nvm to match versions
nvm install 18
nvm use 18
```

### Issue: MCP not working after setup

```bash
# Reinstall the package
npm install -g durandal-memory-mcp

# Reconfigure Claude
claude mcp remove durandal-memory
claude mcp add durandal-memory "durandal-mcp"

# Restart Claude Desktop completely
```

### Issue: Database conflicts

If both machines have different databases and you want to merge:

```bash
# Option 1: Use PC database (recommended)
# Copy durandal-mcp-memory.db from PC to laptop

# Option 2: Start fresh on laptop
# Delete durandal-mcp-memory.db and let it recreate
```

## Development vs Production

### For Development (working on Durandal code)
- Clone the repository
- Use `npm link` to test locally
- Make changes, test, commit, push

### For Production (just using Durandal)
- Install from NPM: `npm install -g durandal-memory-mcp`
- Configure Claude: `claude mcp add durandal-memory "durandal-mcp"`
- No need to clone repository

## Quick Reference Commands

```bash
# Sync before work
git pull

# Check status
git status

# Commit and push
git add .
git commit -m "Description"
git push

# Run tests
durandal-mcp --test

# Check version
durandal-mcp --version

# View logs with debug
durandal-mcp --debug --log-file ./debug.log
```

## What Gets Synced?

✅ **Synced via Git:**
- All source code
- Tests
- Documentation
- Configuration files
- Package.json

❌ **NOT Synced (Machine-Specific):**
- `node_modules/` (reinstall with `npm install`)
- `durandal-mcp-memory.db` (database - optional to sync)
- `.env` files with secrets
- Claude Desktop configs

## Support

If you encounter issues:
1. Check this guide first
2. Run `durandal-mcp --test` to verify installation
3. Check GitHub issues: https://github.com/Wawtawsha/durandal-memory-bridge/issues
4. Check NPM page: https://www.npmjs.com/package/durandal-memory-mcp

---

**Repository**: https://github.com/Wawtawsha/durandal-memory-bridge
**NPM Package**: https://www.npmjs.com/package/durandal-memory-mcp
**Version**: 3.0.0