require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');

class UniversalConfig {
    constructor() {
        this.configPath = path.join(__dirname, 'universal-config.json');
        this.defaults = {
            system: {
                defaultProvider: 'claude',
                defaultProject: 'universal-ai',
                defaultSession: 'main',
                memoryEnabled: true,
                autoSaveConfig: true
            },
            ui: {
                port: 3000,
                theme: 'brutalist',
                colors: {
                    accent: '#e22658',
                    text: '#000000',
                    secondary: '#6d6d6d',
                    background: '#ffffff',
                    backgroundGray: '#dbdbdb'
                },
                autoRefreshStatus: 30000 // 30 seconds
            },
            memory: {
                ramrDbPath: './universal-ramr.db',
                maxContextTokens: 4096,
                recentMessageCount: 6,
                maxArtifacts: 5,
                cacheTimeout: 1800000 // 30 minutes
            },
            providers: {
                claude: {
                    model: 'claude-sonnet-4-20250514',
                    temperature: 0.7,
                    maxTokens: 4000
                },
                openai: {
                    model: 'gpt-4-turbo-preview',
                    temperature: 0.7,
                    maxTokens: 4000
                }
            },
            costs: {
                trackingEnabled: true,
                alertThreshold: 10.0, // $10 USD
                resetOnStartup: false
            }
        };
        
        this.config = { ...this.defaults };
    }

    async load() {
        try {
            const configData = await fs.readFile(this.configPath, 'utf8');
            const loadedConfig = JSON.parse(configData);
            
            this.config = this.mergeDeep(this.defaults, loadedConfig);
            
            console.log('✅ Configuration loaded');
            return true;
        } catch (error) {
            console.log('⚠️  No configuration file found, using defaults');
            await this.save(); // Create default config file
            return false;
        }
    }

    async save() {
        try {
            await fs.writeFile(
                this.configPath, 
                JSON.stringify(this.config, null, 2),
                'utf8'
            );
            console.log('✅ Configuration saved');
            return true;
        } catch (error) {
            console.error('❌ Failed to save configuration:', error.message);
            return false;
        }
    }

    get(path) {
        const keys = path.split('.');
        let value = this.config;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return undefined;
            }
        }
        
        return value;
    }

    set(path, newValue) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let current = this.config;
        
        for (const key of keys) {
            if (!(key in current) || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[lastKey] = newValue;
        
        if (this.get('system.autoSaveConfig')) {
            this.save();
        }
        
        return true;
    }

    getSystemConfig() {
        return this.get('system');
    }

    getUIConfig() {
        return this.get('ui');
    }

    getMemoryConfig() {
        return this.get('memory');
    }

    getProviderConfig(provider) {
        return this.get(`providers.${provider}`);
    }

    getCostConfig() {
        return this.get('costs');
    }

    // Helper method to deep merge objects
    mergeDeep(target, source) {
        const output = { ...target };
        
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        output[key] = source[key];
                    } else {
                        output[key] = this.mergeDeep(target[key], source[key]);
                    }
                } else {
                    output[key] = source[key];
                }
            });
        }
        
        return output;
    }

    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }

    // Environment variable integration
    getFromEnv(envVar, configPath, defaultValue = null) {
        const envValue = process.env[envVar];
        if (envValue !== undefined) {
            return envValue;
        }
        
        const configValue = this.get(configPath);
        if (configValue !== undefined) {
            return configValue;
        }
        
        return defaultValue;
    }

    // Validation
    validate() {
        const errors = [];
        
        // Check required environment variables
        const requiredEnvVars = ['CLAUDE_API_KEY'];
        const optionalEnvVars = ['OPENAI_API_KEY', 'DATABASE_URL'];
        
        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                errors.push(`Missing required environment variable: ${envVar}`);
            }
        }
        
        // Check config values
        const port = this.get('ui.port');
        if (port < 1024 || port > 65535) {
            errors.push(`Invalid port number: ${port}`);
        }
        
        const alertThreshold = this.get('costs.alertThreshold');
        if (alertThreshold < 0) {
            errors.push(`Invalid cost alert threshold: ${alertThreshold}`);
        }
        
        return {
            valid: errors.length === 0,
            errors,
            warnings: optionalEnvVars.filter(env => !process.env[env])
        };
    }

    // Export current configuration
    export() {
        return {
            timestamp: new Date().toISOString(),
            config: { ...this.config }
        };
    }

    // Reset to defaults
    reset() {
        this.config = { ...this.defaults };
        console.log('🔄 Configuration reset to defaults');
        
        if (this.get('system.autoSaveConfig')) {
            this.save();
        }
    }

    // Get summary for display
    getSummary() {
        return {
            defaultProvider: this.get('system.defaultProvider'),
            memoryEnabled: this.get('system.memoryEnabled'),
            uiPort: this.get('ui.port'),
            trackingEnabled: this.get('costs.trackingEnabled'),
            configPath: this.configPath
        };
    }
}

module.exports = UniversalConfig;