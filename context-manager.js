const RAMR = require('./ramr');
const fs = require('fs').promises;
const path = require('path');

class SimpleContextManager {
    constructor(db, knowledgeAnalyzer, claudeClient, projectRoot) {
        this.db = db;
        this.knowledgeAnalyzer = knowledgeAnalyzer;
        this.claudeClient = claudeClient;
        this.projectRoot = projectRoot;
        this.ramr = new RAMR('./ramr.db', knowledgeAnalyzer);
        
        this.config = {
            maxTokens: 4096,
            recentMessageCount: 6,
            maxArtifacts: 5
        };
        
        this.conversationState = {
            totalMessages: 0,
            currentTokenCount: 0
        };
    }

    async initialize() {
        await this.ramr.initialize();
    }

    async buildContext(userMessage, sessionId, projectId, mode = 'intelligent') {
        try {
            const context = {
                recentMessages: await this.getRecentMessages(sessionId),
                relevantArtifacts: await this.getRelevantArtifacts(userMessage, projectId),
                projectInfo: await this.getProjectInfo(projectId)
            };

            return this.formatContext(context, userMessage);
        } catch (error) {
            console.error('Context building error:', error);
            return { context: '', metadata: { error: error.message } };
        }
    }

    async getRecentMessages(sessionId) {
        if (!sessionId || !this.db) return [];
        
        try {
            const messages = await this.db.getConversationHistory(sessionId, this.config.recentMessageCount);
            return messages || [];
        } catch (error) {
            console.error('Error fetching recent messages:', error);
            return [];
        }
    }

    async getRelevantArtifacts(userMessage, projectId) {
        if (!this.knowledgeAnalyzer || !projectId) return [];

        try {
            const artifacts = await this.knowledgeAnalyzer.findRelevantArtifacts(userMessage, projectId);
            return (artifacts || []).slice(0, this.config.maxArtifacts);
        } catch (error) {
            console.error('Error fetching artifacts:', error);
            return [];
        }
    }

    async getProjectInfo(projectId) {
        if (!projectId || !this.db) return null;

        try {
            return await this.db.getProject(projectId);
        } catch (error) {
            console.error('Error fetching project info:', error);
            return null;
        }
    }

    formatContext(context, userMessage) {
        let contextString = '';
        let tokenCount = 0;

        if (context.projectInfo) {
            contextString += `Project: ${context.projectInfo.name}\n`;
            tokenCount += this.estimateTokens(context.projectInfo.name) + 10;
        }

        if (context.recentMessages.length > 0) {
            contextString += '\nRecent conversation:\n';
            for (const message of context.recentMessages.slice(-3)) {
                const messageText = `${message.role}: ${message.content}\n`;
                if (tokenCount + this.estimateTokens(messageText) < this.config.maxTokens * 0.7) {
                    contextString += messageText;
                    tokenCount += this.estimateTokens(messageText);
                }
            }
        }

        if (context.relevantArtifacts.length > 0) {
            contextString += '\nRelevant information:\n';
            for (const artifact of context.relevantArtifacts) {
                const artifactText = `${artifact.type}: ${artifact.content}\n`;
                if (tokenCount + this.estimateTokens(artifactText) < this.config.maxTokens * 0.9) {
                    contextString += artifactText;
                    tokenCount += this.estimateTokens(artifactText);
                }
            }
        }

        return {
            context: contextString,
            metadata: {
                tokenCount,
                messageCount: context.recentMessages.length,
                artifactCount: context.relevantArtifacts.length
            }
        };
    }

    estimateTokens(text) {
        return Math.ceil((text || '').length / 4);
    }

    async cacheContext(key, context) {
        if (this.ramr) {
            await this.ramr.cache(key, context);
        }
    }

    async cleanup() {
        if (this.ramr) {
            await this.ramr.cleanup();
        }
    }
}

module.exports = SimpleContextManager;