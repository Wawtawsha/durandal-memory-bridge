class BaseAdapter {
    constructor() {
        if (this.constructor === BaseAdapter) {
            throw new Error('BaseAdapter is abstract and cannot be instantiated');
        }
    }

    async sendMessage(message, options = {}) {
        throw new Error('sendMessage method must be implemented by subclass');
    }

    async testConnection() {
        throw new Error('testConnection method must be implemented by subclass');
    }

    getProvider() {
        throw new Error('getProvider method must be implemented by subclass');
    }

    getCostInfo() {
        return {
            provider: this.getProvider(),
            tokensUsed: 0,
            estimatedCost: 0
        };
    }
}

module.exports = BaseAdapter;