require('dotenv').config();

class UniversalApiGateway {
    constructor() {
        this.adapters = new Map();
        this.costTracker = {
            totalCost: 0,
            sessionCosts: [],
            providerUsage: {}
        };
        
        this.initializeAdapters();
    }

    initializeAdapters() {
        try {
            const ClaudeAdapter = require('./claude-adapter');
            this.adapters.set('claude', new ClaudeAdapter());
        } catch (error) {
            console.warn('Claude adapter not available:', error.message);
        }

        try {
            const OpenAIAdapter = require('./openai-adapter');
            this.adapters.set('openai', new OpenAIAdapter());
        } catch (error) {
            console.warn('OpenAI adapter not available:', error.message);
        }

        if (this.adapters.size === 0) {
            throw new Error('No AI providers available. Check your configuration.');
        }
    }

    async sendMessage(provider, message, options = {}) {
        const adapter = this.adapters.get(provider.toLowerCase());
        
        if (!adapter) {
            throw new Error(`Provider '${provider}' not available. Available providers: ${this.getAvailableProviders().join(', ')}`);
        }

        const startTime = Date.now();
        
        try {
            const response = await adapter.sendMessage(message, options);
            const endTime = Date.now();
            
            this.trackCost(provider, {
                responseTime: endTime - startTime,
                ...adapter.getCostInfo()
            });
            
            return response;
        } catch (error) {
            throw new Error(`${provider} error: ${error.message}`);
        }
    }

    async testConnection(provider) {
        const adapter = this.adapters.get(provider.toLowerCase());
        
        if (!adapter) {
            return { success: false, error: `Provider '${provider}' not available` };
        }

        try {
            const result = await adapter.testConnection();
            return { ...result, provider: provider };
        } catch (error) {
            return { success: false, error: error.message, provider: provider };
        }
    }

    async testAllConnections() {
        const results = {};
        
        for (const [provider] of this.adapters) {
            results[provider] = await this.testConnection(provider);
        }
        
        return results;
    }

    getAvailableProviders() {
        return Array.from(this.adapters.keys());
    }

    trackCost(provider, costInfo) {
        if (!this.costTracker.providerUsage[provider]) {
            this.costTracker.providerUsage[provider] = {
                calls: 0,
                totalCost: 0,
                tokensUsed: 0
            };
        }

        const usage = this.costTracker.providerUsage[provider];
        usage.calls++;
        usage.totalCost += costInfo.estimatedCost || 0;
        usage.tokensUsed += costInfo.tokensUsed || 0;

        this.costTracker.sessionCosts.push({
            provider,
            timestamp: Date.now(),
            ...costInfo
        });

        this.costTracker.totalCost += costInfo.estimatedCost || 0;
    }

    getCostSummary() {
        return {
            totalCost: this.costTracker.totalCost,
            sessionCalls: this.costTracker.sessionCosts.length,
            providerBreakdown: { ...this.costTracker.providerUsage }
        };
    }

    resetCostTracking() {
        this.costTracker = {
            totalCost: 0,
            sessionCosts: [],
            providerUsage: {}
        };
    }
}

module.exports = UniversalApiGateway;