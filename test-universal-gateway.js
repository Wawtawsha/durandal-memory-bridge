require('dotenv').config();
const UniversalApiGateway = require('./universal-api-gateway');

async function testUniversalGateway() {
    console.log('🚀 Testing Universal AI Gateway');
    console.log('================================');
    
    try {
        const gateway = new UniversalApiGateway();
        
        console.log('\n📋 Available Providers:');
        const providers = gateway.getAvailableProviders();
        console.log(providers.join(', '));
        
        console.log('\n🔍 Testing Connections:');
        const connectionTests = await gateway.testAllConnections();
        
        for (const [provider, result] of Object.entries(connectionTests)) {
            const status = result.success ? '✅' : '❌';
            console.log(`${status} ${provider}: ${result.success ? 'Connected' : result.error}`);
        }
        
        console.log('\n💬 Testing Messages:');
        
        for (const provider of providers) {
            try {
                console.log(`\n--- Testing ${provider.toUpperCase()} ---`);
                const response = await gateway.sendMessage(provider, 'Say "Hello from universal gateway!" and nothing else.');
                console.log(`Response: ${response}`);
                
                const costInfo = gateway.getCostSummary();
                console.log(`Cost Info: $${costInfo.totalCost.toFixed(4)} (${costInfo.sessionCalls} calls)`);
                
            } catch (error) {
                console.log(`❌ ${provider} failed: ${error.message}`);
            }
        }
        
        console.log('\n📊 Final Cost Summary:');
        const finalCost = gateway.getCostSummary();
        console.log(`Total Cost: $${finalCost.totalCost.toFixed(4)}`);
        console.log(`Total Calls: ${finalCost.sessionCalls}`);
        console.log('Provider Breakdown:');
        for (const [provider, usage] of Object.entries(finalCost.providerBreakdown)) {
            console.log(`  ${provider}: ${usage.calls} calls, ${usage.tokensUsed} tokens, $${usage.totalCost.toFixed(4)}`);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

if (require.main === module) {
    testUniversalGateway();
}