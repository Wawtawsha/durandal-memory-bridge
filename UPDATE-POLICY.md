# Update Policy

This document explains how Durandal MCP Server handles updates, our philosophy, and security measures.

## Philosophy: User Control First

We believe that **users should be in control** of when and how their software updates. Our update system follows these principles:

1. **Non-Intrusive** - Update checks happen in the background and don't delay server startup
2. **Informative** - Users are notified when updates are available, not forced to install them
3. **Transparent** - All update activities are logged and visible
4. **Opt-Out Friendly** - Easy to disable update checks completely
5. **Secure** - Multiple security measures protect against malicious updates

## How Updates Work

### Automatic Update Checks

When you start the Durandal MCP Server normally (without flags), it will:

1. Check npm registry for latest version (once per 24 hours by default)
2. Compare with your currently installed version
3. Cache the result to avoid excessive API calls
4. Show a notification if an update is available
5. Continue starting the server normally

**This check is:**
- ✅ Asynchronous (doesn't block server startup)
- ✅ Cached (minimal performance impact)
- ✅ Optional (easy to disable)
- ✅ Respectful (once per day maximum)

### Manual Updates

To update manually:

```bash
durandal-mcp --update
```

This will:
1. Check for available updates
2. Show you what version is available
3. Display the command that will be run
4. Execute: `npm install -g durandal-memory-mcp@latest`
5. Verify the installation succeeded

## Security Measures

We take security seriously, especially given recent npm supply chain attacks. Here's what we do to protect you:

### 1. No Dependencies for Updates

The update checker is implemented using only Node.js built-in modules:
- `https` - For npm registry API calls
- `fs` - For cache management
- `child_process.spawn` - For safe command execution
- No external dependencies = smaller attack surface

### 2. Safe Command Execution

- ✅ Uses `child_process.spawn` with array arguments (not string interpolation)
- ✅ Never uses shell mode (prevents command injection)
- ✅ Validates all inputs before execution
- ✅ Timeout protection (30 second maximum)
- ✅ No user input directly passed to spawn

**Example of safe execution:**
```javascript
const args = ['install', '-g', 'durandal-memory-mcp@latest'];
spawn('npm', args, { shell: false });  // Safe!
```

**What we DON'T do:**
```javascript
spawn(`npm install -g ${userInput}`);  // Dangerous! Command injection risk
```

### 3. Package Integrity

- Checks official npm registry only (`https://registry.npmjs.org`)
- Validates semantic version format
- Compares versions using proper semantic versioning
- Logs all update attempts

### 4. User Consent

- Updates require explicit user action (running `--update` command)
- No automatic updates by default (unless explicitly enabled)
- Clear messaging about what will be executed
- Easy rollback instructions if something goes wrong

## Configuration

### Environment Variables

Control update behavior with environment variables:

```bash
# Completely disable update checks
export NO_UPDATE_CHECK=1

# Or use these for fine-grained control
export UPDATE_CHECK_ENABLED=false
export UPDATE_NOTIFICATION=false
export UPDATE_CHECK_INTERVAL=604800000  # 7 days in milliseconds
```

### Configuration File

Add to your `.env` file:

```bash
# Disable update notifications
UPDATE_CHECK_ENABLED=false

# Check less frequently (7 days instead of 24 hours)
UPDATE_CHECK_INTERVAL=604800000

# Hide notifications but still check
UPDATE_NOTIFICATION=false
```

## Opting Out

### Method 1: Environment Variable (Recommended)

```bash
# macOS/Linux
export NO_UPDATE_CHECK=1

# Windows (cmd)
set NO_UPDATE_CHECK=1

# Windows (PowerShell)
$env:NO_UPDATE_CHECK="1"
```

### Method 2: Configuration File

Create or edit `.env`:
```bash
UPDATE_CHECK_ENABLED=false
```

### Method 3: Delete Cache

Remove the update cache to prevent future checks:

```bash
# macOS/Linux
rm ~/.durandal-mcp/update-cache.json

# Windows
del %USERPROFILE%\.durandal-mcp\update-cache.json
```

## Update Frequency

By default:
- **Check frequency:** Once per 24 hours
- **Cache duration:** 24 hours
- **First run:** Checks but doesn't notify (avoids annoying new users)
- **Network timeout:** 5 seconds maximum

You can adjust the check interval:

```bash
# Check once per week (604800000 ms = 7 days)
export UPDATE_CHECK_INTERVAL=604800000
```

## Manual Update vs Auto-Update

### Manual Update (Default & Recommended)

**What happens:**
1. User runs `durandal-mcp --update`
2. System checks for updates
3. Shows available version
4. Executes `npm install -g durandal-memory-mcp@latest`
5. User sees real-time progress

**Pros:**
- ✅ User is in control
- ✅ Can review release notes first
- ✅ Can choose when to update
- ✅ Sees any errors immediately

### Auto-Update (NOT Recommended)

**To enable:**
```bash
export AUTO_UPDATE=true
```

**What happens:**
- Server checks for updates on startup
- If update available, installs automatically
- No user confirmation required

**Cons:**
- ❌ Breaking changes might break workflows
- ❌ No chance to review changes
- ❌ Could update during critical work
- ❌ Errors might go unnoticed

**We strongly recommend keeping AUTO_UPDATE=false (default)**

## Troubleshooting

### Update Check Fails

**Symptom:** No update notifications, errors in logs

**Causes:**
- Network connectivity issues
- npm registry temporarily unavailable
- Firewall blocking https requests

**Solution:**
Update checks fail silently by design. Check manually:
```bash
durandal-mcp --update
```

### Update Installation Fails

**Symptom:** Error during `npm install -g`

**Common causes:**

1. **Permission errors** (macOS/Linux)
   ```bash
   sudo npm install -g durandal-memory-mcp@latest
   ```

2. **npm not found**
   - Ensure Node.js and npm are installed
   - Check PATH environment variable

3. **Version conflicts**
   - Remove old version first:
     ```bash
     npm uninstall -g durandal-memory-mcp
     npm install -g durandal-memory-mcp@latest
     ```

### Rollback to Previous Version

If an update breaks something:

```bash
# Install specific older version
npm install -g durandal-memory-mcp@3.0.1

# Verify
durandal-mcp --version
```

### Clear Update Cache

If update checks are stuck or showing wrong information:

```bash
# macOS/Linux
rm -rf ~/.durandal-mcp/update-cache.json

# Windows
del /f %USERPROFILE%\.durandal-mcp\update-cache.json

# Then check again
durandal-mcp --update
```

## Release Channels

### Stable (Default)

```bash
# Uses 'latest' tag from npm
npm install -g durandal-memory-mcp@latest
```

### Pre-Release (Beta)

To see and install pre-release versions:

```bash
# Enable pre-release notifications
export SHOW_PRERELEASE=true

# Install specific pre-release
npm install -g durandal-memory-mcp@3.1.0-beta.1
```

### Specific Version

Lock to a specific version:

```bash
npm install -g durandal-memory-mcp@3.0.1
```

Then disable update checks:
```bash
export NO_UPDATE_CHECK=1
```

## Privacy

### What We Collect

**Nothing.** Update checks:
- Make HTTPS requests to `registry.npmjs.org` (public npm registry)
- Store cache locally in `~/.durandal-mcp/update-cache.json`
- Log to local files only (if logging enabled)

**We do NOT:**
- ❌ Phone home to our servers
- ❌ Track update installations
- ❌ Collect analytics
- ❌ Send user information anywhere

### What npm Sees

When you check for updates or install:
- npm registry sees your IP address
- Standard npm package request (like any npm install)
- No personal information transmitted

## Best Practices

### For Individual Users

1. ✅ Keep update checks enabled (default)
2. ✅ Review release notes before updating
3. ✅ Test in non-production first
4. ✅ Keep a rollback plan

### For Production/Enterprise

1. ✅ Disable automatic update checks:
   ```bash
   export NO_UPDATE_CHECK=1
   ```

2. ✅ Use specific version in production:
   ```bash
   npm install -g durandal-memory-mcp@3.0.1
   ```

3. ✅ Test updates in staging first

4. ✅ Use npm lock files or docker containers

### For CI/CD

Disable update checks in automated environments:

```bash
# In CI/CD scripts
export NO_UPDATE_CHECK=1
export NO_UPDATE_NOTIFIER=1
```

## Semantic Versioning

We follow [Semantic Versioning](https://semver.org/):

- **Major (3.0.0)** - Breaking changes, manual migration may be needed
- **Minor (3.1.0)** - New features, backward compatible
- **Patch (3.0.1)** - Bug fixes, backward compatible

**Update recommendations:**
- Patch updates: Safe to update immediately
- Minor updates: Review release notes, test if critical
- Major updates: Read migration guide, test thoroughly

## Support

### Getting Help

- **Issues:** https://github.com/Wawtawsha/durandal-memory-bridge/issues
- **Documentation:** https://github.com/Wawtawsha/durandal-memory-bridge#readme

### Reporting Update Issues

If you experience issues with the update system, please report:

1. Your environment:
   - Operating system and version
   - Node.js version (`node --version`)
   - npm version (`npm --version`)
   - Durandal version (`durandal-mcp --version`)

2. What happened:
   - Expected behavior
   - Actual behavior
   - Error messages (if any)

3. Logs:
   - Run with debug logging: `LOG_LEVEL=debug durandal-mcp`
   - Include relevant log output

## Security Disclosure

If you discover a security vulnerability in the update system:

1. **DO NOT** open a public issue
2. Email: [security contact - to be added]
3. Include details and proof of concept if possible
4. We'll respond within 48 hours

## Changes to This Policy

This policy may be updated as we improve the update system. Check the latest version at:

https://github.com/Wawtawsha/durandal-memory-bridge/blob/main/UPDATE-POLICY.md

---

**Last Updated:** 2025-09-26
**Version:** 1.0.0