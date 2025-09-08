require('dotenv').config();
const BaseAdapter = require('./base-adapter');

class OpenAIAdapter extends BaseAdapter {
    constructor() {
        super();
        this.apiKey = process.env.OPENAI_API_KEY;
        this.baseURL = 'https://api.openai.com/v1';
        this.tokensUsed = 0;
        
        if (!this.apiKey) {
            throw new Error('OPENAI_API_KEY environment variable is required');
        }
    }

    async sendMessage(message, options = {}) {
        const {
            model = 'gpt-4-turbo-preview',
            temperature = 0.7,
            maxTokens = 4000
        } = options;

        try {
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        {
                            role: 'user',
                            content: message
                        }
                    ],
                    temperature: temperature,
                    max_tokens: maxTokens
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`OpenAI API Error: ${response.status} - ${error.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            const responseText = data.choices[0].message.content;
            
            this.tokensUsed += data.usage?.total_tokens || this.estimateTokens(message + responseText);
            
            return responseText;
        } catch (error) {
            if (error.message.includes('fetch')) {
                throw new Error('Network Error: Unable to reach OpenAI API');
            }
            throw error;
        }
    }

    async testConnection() {
        try {
            const response = await this.sendMessage('Hello! Please respond with just "Connection successful" to test the API.');
            return { success: true, message: response };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    getProvider() {
        return 'openai';
    }

    getCostInfo() {
        return {
            provider: 'openai',
            tokensUsed: this.tokensUsed,
            estimatedCost: this.calculateCost(this.tokensUsed)
        };
    }

    estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }

    calculateCost(tokens) {
        const costPerMillion = 10;
        return (tokens / 1000000) * costPerMillion;
    }
}

module.exports = OpenAIAdapter;