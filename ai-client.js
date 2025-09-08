/**
 * Simple AI Client - Direct interface to AI providers
 * No abstractions, no complexity, just works
 */

const axios = require('axios');

class AIClient {
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY;
        this.baseUrl = 'https://api.anthropic.com/v1/messages';
    }

    async ask(question, context = '') {
        if (!this.apiKey) {
            throw new Error('API key required');
        }

        const prompt = context ? `Context:\n${context}\n\nQuestion: ${question}` : question;

        try {
            const response = await axios.post(this.baseUrl, {
                model: 'claude-3-sonnet-20240229',
                max_tokens: 4000,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey
                }
            });

            return response.data.content[0].text;
        } catch (error) {
            throw new Error(`AI request failed: ${error.message}`);
        }
    }

    async analyzeCode(code, language = 'javascript') {
        const question = `Analyze this ${language} code for bugs, improvements, and best practices:\n\n${code}`;
        return this.ask(question);
    }

    async generateCode(description, language = 'javascript') {
        const question = `Generate ${language} code for: ${description}`;
        return this.ask(question);
    }

    async explainCode(code, language = 'javascript') {
        const question = `Explain what this ${language} code does:\n\n${code}`;
        return this.ask(question);
    }
}

module.exports = AIClient;