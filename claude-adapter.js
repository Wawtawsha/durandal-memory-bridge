const BaseAdapter = require('./base-adapter');
const ClaudeClient = require('./claude-client');

class ClaudeAdapter extends BaseAdapter {
    constructor() {
        super();
        this.client = new ClaudeClient();
        this.tokensUsed = 0;
    }

    async sendMessage(message, options = {}) {
        const response = await this.client.sendMessage(message, options);
        
        this.tokensUsed += this.estimateTokens(message + response);
        
        return response;
    }

    async testConnection() {
        return await this.client.testConnection();
    }

    getProvider() {
        return 'claude';
    }

    getCostInfo() {
        return {
            provider: 'claude',
            tokensUsed: this.tokensUsed,
            estimatedCost: this.calculateCost(this.tokensUsed)
        };
    }

    estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }

    calculateCost(tokens) {
        const costPerMillion = 15;
        return (tokens / 1000000) * costPerMillion;
    }
}

module.exports = ClaudeAdapter;