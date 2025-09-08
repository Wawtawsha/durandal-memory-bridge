const ClaudeClient = require('./claude-client');

async function testClaudeConnection() {
    console.log('🧪 Testing Claude API connection...\n');
    
    try {
        const claude = new ClaudeClient();
        
        // Test basic connection
        console.log('📡 Testing basic connection...');
        const testResult = await claude.testConnection();
        
        if (testResult.success) {
            console.log('✅ Connection successful!');
            console.log('🤖 Claude responded:', testResult.message);
        } else {
            console.log('❌ Connection failed:', testResult.error);
            return;
        }
        
        // Test a simple chatbot interaction
        console.log('\n💬 Testing chatbot interaction...');
        const chatResponse = await claude.sendMessage('What is the capital of France?');
        console.log('🤖 Claude:', chatResponse);
        
        console.log('\n🎉 All tests passed! Your Claude API setup is working correctly.');
        
    } catch (error) {
        console.error('❌ Setup Error:', error.message);
        console.log('\n🔧 Troubleshooting tips:');
        console.log('- Check that your API key is correct in the .env file');
        console.log('- Ensure you have internet connectivity');
        console.log('- Verify your API key has proper permissions');
    }
}

// Run the test
testClaudeConnection();
