const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class DurandalConfig {
    constructor() {
        this.configDir = path.join(os.homedir(), '.durandal');
        this.configFile = path.join(this.configDir, 'config.json');
        this.defaultConfig = {
            version: '2.1.0',
            lastUpdate: new Date().toISOString(),
            preferences: {
                defaultProvider: 'claude',
                uiTheme: 'dark',
                logLevel: 'info',
                enableTelemetry: true,
                autoBackup: true,
                backupInterval: 86400000 // 24 hours
            },
            providers: {
                claude: {
                    enabled: false,
                    model: 'claude-3-5-sonnet-20241022',
                    temperature: 0.7,
                    maxTokens: 4000
                },
                openai: {
                    enabled: false,
                    model: 'gpt-4-turbo-preview',
                    temperature: 0.7,
                    maxTokens: 4000
                },
                google: {
                    enabled: false,
                    model: 'gemini-pro',
                    temperature: 0.7,
                    maxTokens: 4000
                }
            },
            database: {
                type: 'sqlite',
                path: './durandal-memory.db',
                encryption: false,
                backupEnabled: true
            },
            mcp: {
                enabled: true,
                port: 3001,
                toolPrefix: 'durandal-memory'
            }
        };
    }

    async initialize() {
        try {
            console.log('🚀 Initializing Durandal configuration...');

            // Create config directory
            await this.ensureConfigDirectory();

            // Create or update config file
            await this.createConfigFile();

            // Create .env file if it doesn't exist
            await this.createEnvironmentFile();

            // Create logs directory
            await this.createLogsDirectory();

            console.log('✅ Configuration initialized successfully!');
            console.log(`📁 Config directory: ${this.configDir}`);
            console.log('📝 Next steps:');
            console.log('   1. Edit .env file with your API keys');
            console.log('   2. Run: durandal --test');
            console.log('   3. Start using: durandal');

            return true;
        } catch (error) {
            console.error('❌ Configuration initialization failed:', error.message);
            return false;
        }
    }

    async ensureConfigDirectory() {
        try {
            await fs.access(this.configDir);
        } catch {
            await fs.mkdir(this.configDir, { recursive: true });
            console.log(`📁 Created config directory: ${this.configDir}`);
        }
    }

    async createConfigFile() {
        try {
            await fs.access(this.configFile);
            console.log('📄 Config file already exists, updating...');

            // Update existing config with new defaults
            const existingConfig = await this.loadConfig();
            const mergedConfig = this.mergeConfigs(existingConfig, this.defaultConfig);
            await fs.writeFile(this.configFile, JSON.stringify(mergedConfig, null, 2));
        } catch {
            // Create new config file
            await fs.writeFile(this.configFile, JSON.stringify(this.defaultConfig, null, 2));
            console.log(`📄 Created config file: ${this.configFile}`);
        }
    }

    async createEnvironmentFile() {
        const envPath = path.join(process.cwd(), '.env');

        try {
            await fs.access(envPath);
            console.log('📄 .env file already exists');
        } catch {
            const distributionPath = path.join(process.cwd(), '.env.distribution');

            try {
                await fs.access(distributionPath);
                await fs.copyFile(distributionPath, envPath);
                console.log('📄 Created .env file from .env.distribution template');
            } catch {
                // Create basic .env file
                const basicEnv = this.generateBasicEnvFile();
                await fs.writeFile(envPath, basicEnv);
                console.log('📄 Created basic .env file');
            }
        }
    }

    async createLogsDirectory() {
        const logsDir = path.join(process.cwd(), 'logs');

        try {
            await fs.access(logsDir);
        } catch {
            await fs.mkdir(logsDir, { recursive: true });
            console.log(`📁 Created logs directory: ${logsDir}`);
        }
    }

    generateBasicEnvFile() {
        return `# Durandal AI Memory System Configuration
# Copy from .env.distribution for full configuration options

# =================================================================
# AI PROVIDER CONFIGURATION (Configure at least one)
# =================================================================

# Claude API (Anthropic) - Recommended
CLAUDE_API_KEY=your_claude_api_key_here
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# OpenAI API (Optional)
# OPENAI_API_KEY=your_openai_api_key_here
# OPENAI_MODEL=gpt-4-turbo-preview

# Google AI / Gemini (Optional)
# GOOGLE_API_KEY=your_google_api_key_here
# GOOGLE_MODEL=gemini-pro

# =================================================================
# DATABASE CONFIGURATION
# =================================================================

# SQLite (Default - No setup required)
DATABASE_TYPE=sqlite
DATABASE_PATH=./durandal-memory.db

# =================================================================
# APPLICATION CONFIGURATION
# =================================================================

NODE_ENV=production
PORT=3000
MEMORY_API_KEY=durandal-secure-key-change-this

# =================================================================
# LOGGING
# =================================================================

LOG_LEVEL=info
DEBUG_MODE=false
`;
    }

    async loadConfig() {
        try {
            const configData = await fs.readFile(this.configFile, 'utf8');
            return JSON.parse(configData);
        } catch {
            return this.defaultConfig;
        }
    }

    mergeConfigs(existing, defaults) {
        const merged = { ...defaults };

        // Preserve existing values while adding new defaults
        for (const key in existing) {
            if (typeof existing[key] === 'object' && !Array.isArray(existing[key])) {
                merged[key] = { ...defaults[key], ...existing[key] };
            } else {
                merged[key] = existing[key];
            }
        }

        merged.lastUpdate = new Date().toISOString();
        return merged;
    }

    async validateConfiguration() {
        console.log('🔍 Validating configuration...');

        const results = {
            providers: {},
            database: false,
            overall: false
        };

        // Check API keys
        const providers = ['claude', 'openai', 'google'];
        let validProviders = 0;

        for (const provider of providers) {
            const apiKeyVar = `${provider.toUpperCase()}_API_KEY`;
            const hasKey = !!process.env[apiKeyVar];
            results.providers[provider] = hasKey;

            if (hasKey) {
                validProviders++;
                console.log(`✅ ${provider}: API key configured`);
            } else {
                console.log(`❌ ${provider}: API key missing`);
            }
        }

        if (validProviders === 0) {
            console.log('❌ No AI provider API keys configured');
            console.log('📝 Please add at least one API key to your .env file');
            return results;
        }

        // Check database configuration
        const dbType = process.env.DATABASE_TYPE || 'sqlite';
        if (dbType === 'sqlite') {
            results.database = true;
            console.log('✅ Database: SQLite configured');
        } else if (dbType === 'postgresql') {
            const hasDbUrl = !!process.env.DATABASE_URL;
            const hasDbComponents = !!(process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER);
            results.database = hasDbUrl || hasDbComponents;
            if (hasDbUrl) {
                console.log('✅ Database: PostgreSQL configured (DATABASE_URL)');
            } else if (hasDbComponents) {
                console.log('✅ Database: PostgreSQL configured (individual components)');
            } else {
                console.log('❌ Database: PostgreSQL configuration missing');
            }
        }

        results.overall = validProviders > 0 && results.database;

        if (results.overall) {
            console.log('✅ Configuration validation passed');
        } else {
            console.log('❌ Configuration validation failed');
        }

        return results;
    }

    async testProviders() {
        console.log('🧪 Testing AI providers...');

        const AIProviderManager = require('./ai-provider-manager');
        const aiManager = new AIProviderManager();

        const availableProviders = aiManager.getAvailableProviders();

        if (availableProviders.length === 0) {
            console.log('❌ No providers available for testing');
            return false;
        }

        for (const provider of availableProviders) {
            try {
                console.log(`🔄 Testing ${provider}...`);
                const response = await aiManager.sendMessage('Hello! This is a test message.', { provider });
                console.log(`✅ ${provider}: Working (${response.model})`);
            } catch (error) {
                console.log(`❌ ${provider}: Failed - ${error.message}`);
            }
        }

        return true;
    }

    async generateDiagnosticReport() {
        console.log('📊 Generating diagnostic report...');

        const report = {
            timestamp: new Date().toISOString(),
            system: {
                platform: os.platform(),
                arch: os.arch(),
                nodeVersion: process.version,
                memory: process.memoryUsage(),
                cwd: process.cwd()
            },
            configuration: await this.loadConfig(),
            environment: {
                hasClaudeKey: !!process.env.CLAUDE_API_KEY,
                hasOpenAIKey: !!process.env.OPENAI_API_KEY,
                hasGoogleKey: !!process.env.GOOGLE_API_KEY,
                databaseType: process.env.DATABASE_TYPE,
                nodeEnv: process.env.NODE_ENV
            },
            validation: await this.validateConfiguration()
        };

        const reportPath = path.join(this.configDir, 'diagnostic-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

        console.log(`📊 Diagnostic report saved: ${reportPath}`);
        return report;
    }
}

module.exports = DurandalConfig;