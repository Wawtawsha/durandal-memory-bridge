/**
 * Update Checker - Secure, non-intrusive update notification system
 *
 * Checks npm registry for updates, caches results, respects user preferences
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class UpdateChecker {
    constructor(packageInfo, logger, options = {}) {
        this.packageInfo = packageInfo;
        this.logger = logger;

        // Configuration
        this.config = {
            enabled: this.parseBoolean(process.env.UPDATE_CHECK_ENABLED, true),
            interval: parseInt(process.env.UPDATE_CHECK_INTERVAL) || 86400000, // 24 hours
            showNotification: this.parseBoolean(process.env.UPDATE_NOTIFICATION, true),
            autoUpdate: this.parseBoolean(process.env.AUTO_UPDATE, false),
            showPrerelease: this.parseBoolean(process.env.SHOW_PRERELEASE, false),
            registryUrl: 'https://registry.npmjs.org',
            cacheDir: path.join(process.env.HOME || process.env.USERPROFILE || '.', '.durandal-mcp'),
            cacheFile: 'update-cache.json',
            timeout: 5000, // 5 second timeout for network requests
            ...options
        };

        // Check for opt-out environment variables
        if (process.env.NO_UPDATE_CHECK === '1' ||
            process.env.NO_UPDATE_CHECK === 'true' ||
            process.env.NO_UPDATE_NOTIFIER === '1') {
            this.config.enabled = false;
        }

        // Ensure cache directory exists
        this.ensureCacheDir();
    }

    parseBoolean(value, defaultValue) {
        if (value === undefined || value === null) return defaultValue;
        if (typeof value === 'boolean') return value;
        return value === 'true' || value === '1';
    }

    ensureCacheDir() {
        try {
            if (!fs.existsSync(this.config.cacheDir)) {
                fs.mkdirSync(this.config.cacheDir, { recursive: true });
            }
        } catch (error) {
            this.logger.debug('Could not create cache directory', { error: error.message });
        }
    }

    getCachePath() {
        return path.join(this.config.cacheDir, this.config.cacheFile);
    }

    loadCache() {
        try {
            const cachePath = this.getCachePath();
            if (fs.existsSync(cachePath)) {
                const data = fs.readFileSync(cachePath, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            this.logger.debug('Could not load update cache', { error: error.message });
        }
        return null;
    }

    saveCache(data) {
        try {
            const cachePath = this.getCachePath();
            fs.writeFileSync(cachePath, JSON.stringify(data, null, 2), 'utf8');
        } catch (error) {
            this.logger.debug('Could not save update cache', { error: error.message });
        }
    }

    isCacheValid(cache) {
        if (!cache || !cache.timestamp) return false;
        const age = Date.now() - cache.timestamp;
        return age < this.config.interval;
    }

    compareVersions(current, latest) {
        // Parse semantic versions (e.g., "3.0.1" -> [3, 0, 1])
        const parseCurrent = current.replace(/^v/, '').split('.').map(Number);
        const parseLatest = latest.replace(/^v/, '').split('.').map(Number);

        for (let i = 0; i < 3; i++) {
            if (parseLatest[i] > parseCurrent[i]) return 1; // Update available
            if (parseLatest[i] < parseCurrent[i]) return -1; // Current is newer
        }
        return 0; // Same version
    }

    async fetchLatestVersion() {
        return new Promise((resolve, reject) => {
            const packageName = this.packageInfo.name;
            const url = `${this.config.registryUrl}/${packageName}`;

            this.logger.debug('Fetching latest version from npm registry', { url });

            const request = https.get(url, { timeout: this.config.timeout }, (response) => {
                let data = '';

                if (response.statusCode !== 200) {
                    return reject(new Error(`npm registry returned ${response.statusCode}`));
                }

                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    try {
                        const packageData = JSON.parse(data);
                        const distTags = packageData['dist-tags'];

                        // Get latest version
                        let latestVersion = distTags.latest;

                        // Optionally include pre-releases
                        if (this.config.showPrerelease && distTags.next) {
                            const comparison = this.compareVersions(distTags.latest, distTags.next);
                            if (comparison < 0) {
                                latestVersion = distTags.next;
                            }
                        }

                        resolve({
                            version: latestVersion,
                            homepage: packageData.homepage,
                            repository: packageData.repository?.url
                        });
                    } catch (error) {
                        reject(new Error(`Failed to parse npm response: ${error.message}`));
                    }
                });
            });

            request.on('error', (error) => {
                reject(new Error(`Network error: ${error.message}`));
            });

            request.on('timeout', () => {
                request.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }

    async checkForUpdates() {
        if (!this.config.enabled) {
            this.logger.debug('Update checking is disabled');
            return null;
        }

        // Check cache first
        const cache = this.loadCache();
        if (cache && this.isCacheValid(cache)) {
            this.logger.debug('Using cached update information', {
                age: Math.round((Date.now() - cache.timestamp) / 1000 / 60) + ' minutes'
            });
            return cache.updateInfo;
        }

        try {
            this.logger.debug('Checking for updates...');

            const latest = await this.fetchLatestVersion();
            const currentVersion = this.packageInfo.version;
            const comparison = this.compareVersions(currentVersion, latest.version);

            const updateInfo = {
                current: currentVersion,
                latest: latest.version,
                updateAvailable: comparison > 0,
                homepage: latest.homepage,
                repository: latest.repository,
                checked: new Date().toISOString()
            };

            // Save to cache
            this.saveCache({
                timestamp: Date.now(),
                updateInfo
            });

            if (updateInfo.updateAvailable) {
                this.logger.info('Update available', {
                    current: currentVersion,
                    latest: latest.version
                });
            } else {
                this.logger.debug('No updates available', {
                    current: currentVersion,
                    latest: latest.version
                });
            }

            return updateInfo;
        } catch (error) {
            this.logger.debug('Update check failed', { error: error.message });
            return null;
        }
    }

    formatUpdateNotification(updateInfo) {
        if (!updateInfo || !updateInfo.updateAvailable) return null;

        const boxWidth = 62;
        const line = '─'.repeat(boxWidth - 2);

        // Truncate URL if too long
        const maxUrlLength = boxWidth - 15; // Leave room for "  Release: " prefix
        let url = updateInfo.homepage || 'https://npmjs.com/package/durandal-memory-mcp';
        if (url.length > maxUrlLength) {
            url = url.substring(0, maxUrlLength - 3) + '...';
        }

        // Calculate padding for each line
        const updateLine = `  Update available: ${updateInfo.current} → ${updateInfo.latest}`;
        const updatePadding = Math.max(0, boxWidth - 2 - updateLine.length);

        const runLine = '  Run: durandal-mcp --update';
        const runPadding = Math.max(0, boxWidth - 2 - runLine.length);

        const releaseLine = `  Release: ${url}`;
        const releasePadding = Math.max(0, boxWidth - 2 - releaseLine.length);

        return `
╭${line}╮
│${' '.repeat(boxWidth - 2)}│
│${updateLine}${' '.repeat(updatePadding)}│
│${' '.repeat(boxWidth - 2)}│
│${runLine}${' '.repeat(runPadding)}│
│${' '.repeat(boxWidth - 2)}│
│${releaseLine}${' '.repeat(releasePadding)}│
│${' '.repeat(boxWidth - 2)}│
╰${line}╯
`;
    }

    showUpdateNotification(updateInfo) {
        if (!this.config.showNotification) return;
        if (!updateInfo || !updateInfo.updateAvailable) return;

        const notification = this.formatUpdateNotification(updateInfo);
        console.log(notification);
    }

    async performUpdate(options = {}) {
        const { confirm = true, version = 'latest' } = options;

        // Security: Validate version format
        if (version !== 'latest' && !/^\d+\.\d+\.\d+$/.test(version)) {
            throw new Error('Invalid version format. Must be "latest" or semantic version (e.g., 3.0.1)');
        }

        // Get update info
        const updateInfo = await this.checkForUpdates();

        if (!updateInfo) {
            console.log('❌ Could not check for updates. Please try again later.');
            return false;
        }

        if (!updateInfo.updateAvailable) {
            console.log(`✅ Already on latest version (${updateInfo.current})`);
            return true;
        }

        // Show update information
        console.log(`\n🔍 Update available: v${updateInfo.current} → v${updateInfo.latest}\n`);

        // Build safe command - NEVER use string interpolation
        const packageToInstall = version === 'latest'
            ? `${this.packageInfo.name}@latest`
            : `${this.packageInfo.name}@${version}`;

        console.log(`📋 This will run: npm install -g ${packageToInstall}\n`);

        // Ask for confirmation if needed
        if (confirm && !this.config.autoUpdate) {
            // In a real CLI, we'd use readline here
            // For now, we'll provide instructions
            console.log('⚠️  To perform the update, run:');
            console.log(`   npm install -g ${packageToInstall}\n`);
            return false;
        }

        // Perform update
        return this.executeUpdate(packageToInstall);
    }

    async executeUpdate(packageToInstall) {
        return new Promise((resolve, reject) => {
            console.log('⏳ Installing update...\n');

            this.logger.info('Executing update', { package: packageToInstall });

            // Security: Use spawn with array arguments (not shell)
            const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
            const args = ['install', '-g', packageToInstall];

            const updateProcess = spawn(npmCommand, args, {
                stdio: 'inherit',
                shell: false // IMPORTANT: Don't use shell to prevent injection
            });

            let timeout = setTimeout(() => {
                updateProcess.kill();
                reject(new Error('Update timeout (30 seconds exceeded)'));
            }, 30000);

            updateProcess.on('exit', (code) => {
                clearTimeout(timeout);

                if (code === 0) {
                    console.log('\n✅ Update completed successfully!');
                    console.log(`   Run 'durandal-mcp --version' to verify.\n`);

                    this.logger.info('Update completed successfully', {
                        package: packageToInstall
                    });

                    // Clear cache to force re-check
                    try {
                        const cachePath = this.getCachePath();
                        if (fs.existsSync(cachePath)) {
                            fs.unlinkSync(cachePath);
                        }
                    } catch (error) {
                        // Ignore cache clear errors
                    }

                    resolve(true);
                } else {
                    const error = new Error(`Update failed with code ${code}`);
                    this.logger.error('Update failed', {
                        package: packageToInstall,
                        exitCode: code
                    });
                    reject(error);
                }
            });

            updateProcess.on('error', (error) => {
                clearTimeout(timeout);
                this.logger.error('Update process error', {
                    package: packageToInstall,
                    error: error.message
                });
                reject(error);
            });
        });
    }
}

module.exports = UpdateChecker;