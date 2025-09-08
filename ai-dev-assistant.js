#!/usr/bin/env node

/**
 * AI Development Assistant - Simple Usage Interface
 * 
 * This is the main entry point for using the AI development environment.
 * It provides an easy-to-use interface that combines all the powerful components
 * we've built: AI Provider Manager, Language Pack Manager, Claude Code Integration,
 * and Advanced Integration Manager.
 */

const AdvancedIntegrationManager = require('./advanced-integration-manager');
const path = require('path');
const fs = require('fs').promises;

class AIDevAssistant {
    constructor(options = {}) {
        this.workspaceRoot = options.workspaceRoot || process.cwd();
        this.aiProvider = options.aiProvider || 'claude';
        this.enableCodeExecution = options.enableCodeExecution !== false;
        this.contextMode = options.contextMode || 'intelligent';
        
        this.manager = new AdvancedIntegrationManager({
            workspaceRoot: this.workspaceRoot,
            aiProvider: this.aiProvider,
            enableCodeExecution: this.enableCodeExecution,
            contextMode: this.contextMode
        });
        
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        console.log('🚀 Initializing AI Development Assistant...');
        console.log(`📁 Workspace: ${this.workspaceRoot}`);
        console.log(`🤖 AI Provider: ${this.aiProvider}`);
        console.log(`⚙️ Context Mode: ${this.contextMode}`);
        console.log(`🔧 Code Execution: ${this.enableCodeExecution ? 'Enabled' : 'Disabled'}`);
        
        try {
            await this.manager.initialize();
            this.initialized = true;
            console.log('✅ AI Development Assistant ready!');
            console.log('');
        } catch (error) {
            console.error('❌ Failed to initialize:', error.message);
            throw error;
        }
    }

    /**
     * Main method for processing development requests
     */
    async ask(message, options = {}) {
        if (!this.initialized) {
            await this.initialize();
        }

        const request = {
            message,
            files: options.files || [],
            executeCode: options.executeCode !== false,
            language: options.language,
            context: options.context || {}
        };

        console.log(`💬 Processing: "${message}"`);
        if (request.files.length > 0) {
            console.log(`📄 Files: ${request.files.join(', ')}`);
        }
        console.log('');

        try {
            const result = await this.manager.processRequest(request);
            
            console.log('🎯 Response:');
            console.log(result.response);
            
            if (result.codeBlocks && result.codeBlocks.length > 0) {
                console.log('\n📝 Code Generated:');
                result.codeBlocks.forEach((block, i) => {
                    console.log(`\n--- Code Block ${i + 1} (${block.language}) ---`);
                    console.log(block.code);
                });
            }
            
            if (result.executionResults && result.executionResults.length > 0) {
                console.log('\n🔧 Execution Results:');
                result.executionResults.forEach((exec, i) => {
                    console.log(`\n--- Execution ${i + 1} ---`);
                    console.log(`Exit Code: ${exec.exitCode}`);
                    if (exec.stdout) console.log(`Output: ${exec.stdout}`);
                    if (exec.stderr) console.log(`Error: ${exec.stderr}`);
                });
            }
            
            console.log('');
            return result;
            
        } catch (error) {
            console.error('❌ Error processing request:', error.message);
            throw error;
        }
    }

    /**
     * Analyze a specific file or directory
     */
    async analyzeCode(filePath, options = {}) {
        const fullPath = path.resolve(this.workspaceRoot, filePath);
        
        try {
            // Check if file exists
            await fs.access(fullPath);
            
            return await this.ask(`Analyze the code in ${filePath}`, {
                files: [filePath],
                ...options
            });
        } catch (error) {
            console.error(`❌ File not found: ${filePath}`);
            throw error;
        }
    }

    /**
     * Execute code with AI assistance
     */
    async executeCode(code, language = 'javascript', options = {}) {
        return await this.ask(`Execute this ${language} code: ${code}`, {
            executeCode: true,
            language,
            ...options
        });
    }

    /**
     * Get help and suggestions for a development task
     */
    async getHelp(task, options = {}) {
        return await this.ask(`Help me with: ${task}`, options);
    }

    /**
     * Review and improve existing code
     */
    async reviewCode(filePath, focusAreas = []) {
        const focus = focusAreas.length > 0 ? ` Focus on: ${focusAreas.join(', ')}` : '';
        return await this.analyzeCode(filePath, {
            context: { reviewType: 'code-review', focusAreas }
        });
    }

    /**
     * Generate documentation for code
     */
    async generateDocs(filePath, docType = 'auto') {
        return await this.ask(`Generate ${docType} documentation for ${filePath}`, {
            files: [filePath],
            context: { documentationType: docType }
        });
    }

    /**
     * Get system health and statistics
     */
    async getStatus() {
        if (!this.initialized) {
            console.log('❌ Assistant not initialized');
            return { status: 'not_initialized' };
        }

        const health = await this.manager.getHealth();
        const stats = await this.manager.getStatistics();
        
        console.log('📊 System Status:');
        console.log(`Health: ${health.status}`);
        console.log(`Requests Processed: ${stats.requestsProcessed}`);
        console.log(`Files Analyzed: ${stats.filesAnalyzed}`);
        console.log(`Code Blocks Executed: ${stats.codeBlocksExecuted}`);
        console.log(`Uptime: ${Math.round(stats.uptime / 1000)}s`);
        
        return { health, stats };
    }

    /**
     * Shutdown the assistant
     */
    async shutdown() {
        if (this.initialized) {
            console.log('🔄 Shutting down AI Development Assistant...');
            await this.manager.shutdown();
            this.initialized = false;
            console.log('✅ Shutdown complete');
        }
    }
}

// Command line interface
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
🤖 AI Development Assistant - Usage Examples:

Interactive Mode:
  node ai-dev-assistant.js

Quick Commands:
  node ai-dev-assistant.js "analyze src/app.js"
  node ai-dev-assistant.js "help me optimize this function" --files src/utils.js
  node ai-dev-assistant.js "execute console.log('hello')" --language javascript
  node ai-dev-assistant.js "review my code for security issues" --files src/auth.js

Options:
  --workspace <path>     Set workspace directory (default: current directory)
  --provider <name>      AI provider: claude, openai (default: claude)
  --no-exec             Disable code execution
  --context <mode>       Context mode: intelligent, aggressive, maximum (default: intelligent)
  --files <files>        Comma-separated list of files to include
  --language <lang>      Programming language for code execution

Examples:
  node ai-dev-assistant.js "refactor this code" --files src/app.js --context aggressive
  node ai-dev-assistant.js "find bugs in my project" --workspace ./my-project
  node ai-dev-assistant.js "generate tests" --files src/calculator.js --provider openai
        `);
        return;
    }

    const message = args[0];
    const options = {};
    
    // Parse command line arguments
    for (let i = 1; i < args.length; i += 2) {
        const flag = args[i];
        const value = args[i + 1];
        
        switch (flag) {
            case '--workspace':
                options.workspaceRoot = value;
                break;
            case '--provider':
                options.aiProvider = value;
                break;
            case '--context':
                options.contextMode = value;
                break;
            case '--no-exec':
                options.enableCodeExecution = false;
                i--; // No value for this flag
                break;
            case '--files':
                options.files = value.split(',').map(f => f.trim());
                break;
            case '--language':
                options.language = value;
                break;
        }
    }

    const assistant = new AIDevAssistant(options);
    
    try {
        const result = await assistant.ask(message, options);
        await assistant.shutdown();
    } catch (error) {
        console.error('❌ Error:', error.message);
        await assistant.shutdown();
        process.exit(1);
    }
}

// Export for programmatic use
module.exports = AIDevAssistant;

// Run CLI if called directly
if (require.main === module) {
    main().catch(console.error);
}