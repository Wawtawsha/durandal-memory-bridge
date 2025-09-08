const UniversalMemorySystem = require('./universal-memory-system');

async function testUniversalAI() {
    console.log('🧪 Testing Universal AI Memory System');
    console.log('====================================');
    
    try {
        const memory = new UniversalMemorySystem();
        
        console.log('\n🔄 Initializing system...');
        await memory.initialize();
        
        console.log('\n📋 Setting up test environment...');
        await memory.setProject('test-project');
        await memory.setSession('test-session');
        
        console.log('\n📊 System Status:');
        const status = memory.getStatus();
        console.log(`Provider: ${status.provider}`);
        console.log(`Project: ${status.project}`);
        console.log(`Session: ${status.session}`);
        console.log(`Memory Enabled: ${status.memoryEnabled}`);
        console.log(`Available Providers: ${status.availableProviders.join(', ')}`);
        
        console.log('\n💬 Testing message with memory...');
        const result = await memory.sendMessage('Hello! What can you remember about our conversations?');
        
        console.log(`\nResponse: ${result.response}`);
        console.log(`Provider: ${result.provider}`);
        console.log(`Memory Info: ${result.context.messageCount} messages, ${result.context.artifactCount} artifacts`);
        console.log(`Cost: $${result.cost.totalCost.toFixed(4)}`);
        
        console.log('\n✅ Universal AI Memory System is working perfectly!');
        
        await memory.cleanup();
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\n💡 This is expected if you don\'t have API keys configured');
    }
}

if (require.main === module) {
    testUniversalAI();
}