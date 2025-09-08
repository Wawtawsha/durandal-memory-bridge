const UniversalMemorySystem = require('./universal-memory-system');
const readline = require('readline');

class UniversalAI {
    constructor() {
        this.memory = new UniversalMemorySystem();
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        this.isRunning = false;
        this.commands = {
            '/provider': 'Switch AI provider (e.g., /provider openai)',
            '/project': 'Set project (e.g., /project myapp)',
            '/session': 'Set session (e.g., /session feature-dev)',
            '/status': 'Show current status and costs',
            '/providers': 'List available providers',
            '/cost': 'Show cost summary',
            '/help': 'Show this help',
            '/quit': 'Exit the application'
        };
    }

    async start() {
        console.log('🌐 Universal AI Memory System');
        console.log('============================');
        console.log('The world\'s first universal AI memory platform');
        console.log('');
        
        try {
            const connections = await this.memory.initialize();
            
            console.log('');
            console.log('🚀 Ready! Type /help for commands or just start chatting.');
            console.log('');
            
            this.isRunning = true;
            this.chat();
            
        } catch (error) {
            console.error('❌ Startup failed:', error.message);
            console.log('');
            console.log('💡 Make sure you have CLAUDE_API_KEY in your .env file');
            console.log('   For OpenAI support, also add OPENAI_API_KEY');
            process.exit(1);
        }
    }

    async chat() {
        while (this.isRunning) {
            try {
                const input = await this.prompt('> ');
                
                if (input.trim() === '') continue;
                
                if (input.startsWith('/')) {
                    await this.handleCommand(input);
                } else {
                    await this.sendMessage(input);
                }
                
            } catch (error) {
                console.error('❌ Error:', error.message);
            }
        }
    }

    async handleCommand(command) {
        const [cmd, ...args] = command.split(' ');
        const arg = args.join(' ').trim();
        
        switch (cmd.toLowerCase()) {
            case '/help':
                this.showHelp();
                break;
                
            case '/provider':
                if (!arg) {
                    console.log('Usage: /provider <name> (e.g., /provider openai)');
                    console.log('Available:', this.memory.gateway.getAvailableProviders().join(', '));
                } else {
                    await this.memory.setProvider(arg);
                }
                break;
                
            case '/providers':
                const providers = this.memory.gateway.getAvailableProviders();
                console.log('Available providers:', providers.join(', '));
                console.log('Current provider:', this.memory.currentProvider);
                break;
                
            case '/project':
                if (!arg) {
                    console.log('Usage: /project <name> (e.g., /project myapp)');
                } else {
                    await this.memory.setProject(arg);
                }
                break;
                
            case '/session':
                if (!arg) {
                    console.log('Usage: /session <name> (e.g., /session feature-dev)');
                } else {
                    await this.memory.setSession(arg);
                }
                break;
                
            case '/status':
                this.showStatus();
                break;
                
            case '/cost':
                this.showCosts();
                break;
                
            case '/quit':
            case '/exit':
                console.log('👋 Goodbye!');
                await this.memory.cleanup();
                this.isRunning = false;
                this.rl.close();
                break;
                
            default:
                console.log(`❓ Unknown command: ${cmd}`);
                console.log('Type /help for available commands');
        }
    }

    async sendMessage(message) {
        if (!this.memory.currentProject) {
            console.log('⚠️  Please set a project first: /project <name>');
            return;
        }
        
        if (!this.memory.currentSession) {
            console.log('⚠️  Please set a session first: /session <name>');
            return;
        }
        
        console.log('\n💭 Thinking...\n');
        
        try {
            const result = await this.memory.sendMessage(message);
            
            console.log(`🤖 ${result.provider.toUpperCase()}: ${result.response}`);
            
            if (result.context.memoryEnabled && result.context.messageCount > 0) {
                console.log(`\n💡 Used ${result.context.messageCount} memories, ${result.context.artifactCount} insights`);
            }
            
            const cost = result.cost.totalCost;
            if (cost > 0) {
                console.log(`💰 Cost: $${cost.toFixed(4)} (session total)`);
            }
            
        } catch (error) {
            console.error('❌ Message failed:', error.message);
        }
        
        console.log('');
    }

    showHelp() {
        console.log('\n🆘 Available Commands:');
        console.log('=====================');
        for (const [cmd, desc] of Object.entries(this.commands)) {
            console.log(`${cmd.padEnd(12)} - ${desc}`);
        }
        console.log('');
        console.log('💬 Or just type any message to chat with AI!');
        console.log('');
    }

    showStatus() {
        const status = this.memory.getStatus();
        
        console.log('\n📊 System Status:');
        console.log('=================');
        console.log(`🤖 Provider: ${status.provider}`);
        console.log(`📁 Project: ${status.project}`);
        console.log(`💬 Session: ${status.session}`);
        console.log(`🧠 Memory: ${status.memoryEnabled ? 'Enabled' : 'Disabled'}`);
        console.log(`💰 Session Cost: $${status.cost.totalCost.toFixed(4)}`);
        console.log(`📞 API Calls: ${status.cost.sessionCalls}`);
        console.log('');
    }

    showCosts() {
        const cost = this.memory.gateway.getCostSummary();
        
        console.log('\n💰 Cost Summary:');
        console.log('================');
        console.log(`Total Cost: $${cost.totalCost.toFixed(4)}`);
        console.log(`Total Calls: ${cost.sessionCalls}`);
        
        if (Object.keys(cost.providerBreakdown).length > 0) {
            console.log('\nProvider Breakdown:');
            for (const [provider, usage] of Object.entries(cost.providerBreakdown)) {
                console.log(`  ${provider}: ${usage.calls} calls, $${usage.totalCost.toFixed(4)}`);
            }
        }
        console.log('');
    }

    prompt(question) {
        return new Promise(resolve => {
            this.rl.question(question, resolve);
        });
    }
}

async function main() {
    const app = new UniversalAI();
    
    process.on('SIGINT', async () => {
        console.log('\n\n👋 Shutting down...');
        await app.memory.cleanup();
        process.exit(0);
    });
    
    await app.start();
}

if (require.main === module) {
    main().catch(error => {
        console.error('❌ Fatal error:', error.message);
        process.exit(1);
    });
}

module.exports = UniversalAI;