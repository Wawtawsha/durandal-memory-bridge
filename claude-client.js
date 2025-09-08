require('dotenv').config();
const axios = require('axios');
const QueryClassifier = require('./query-classifier');

class ClaudeClient {
    constructor() {
        this.apiKey = process.env.CLAUDE_API_KEY;
        this.baseURL = 'https://api.anthropic.com/v1';
        
        if (!this.apiKey) {
            throw new Error('CLAUDE_API_KEY environment variable is required');
        }
        
        this.queryClassifier = new QueryClassifier();
    }

    async sendMessage(message, options = {}) {
        const {
            model = 'claude-sonnet-4-20250514',
            temperature = 0.7,
            contextSize = 0
        } = options;
        
        // Dynamic token allocation based on query type
        const tokenAllocation = options.maxTokens ? 
            { maxTokens: options.maxTokens, queryType: 'manual', reasoning: 'Manually specified' } :
            this.queryClassifier.getOptimalTokens(message, contextSize);
        
        const maxTokens = tokenAllocation.maxTokens;
        
        if (process.env.DEBUG_TOKENS) {
            console.log(`Token allocation: ${tokenAllocation.reasoning}`);
        }

        try {
            const response = await axios.post(
                `${this.baseURL}/messages`,
                {
                    model: model,
                    max_tokens: maxTokens,
                    temperature: temperature,
                    messages: [
                        {
                            role: 'user',
                            content: message
                        }
                    ]
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': this.apiKey,
                        'anthropic-version': '2023-06-01'
                    }
                }
            );

            return response.data.content[0].text;
        } catch (error) {
            if (error.response) {
                throw new Error(`Claude API Error: ${error.response.status} - ${error.response.data.error?.message || 'Unknown error'}`);
            } else if (error.request) {
                throw new Error('Network Error: Unable to reach Claude API');
            } else {
                throw new Error(`Error: ${error.message}`);
            }
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
}

module.exports = ClaudeClient;
