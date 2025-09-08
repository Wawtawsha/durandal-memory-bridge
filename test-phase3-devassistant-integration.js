#!/usr/bin/env node

/**
 * Phase 3 DevAssistant Integration Test
 * Tests Phase 3 advanced commands integrated into the main DevAssistant interface
 */

const DevAssistant = require('./dev-assistant');

async function testPhase3DevAssistantIntegration() {
    console.log('🧪 Phase 3 DevAssistant Integration Test');
    console.log('═'.repeat(50));
    
    let passedTests = 0;
    let totalTests = 0;
    
    try {
        // Initialize DevAssistant
        console.log('⚡ Initializing DevAssistant with Phase 3...');
        const assistant = new DevAssistant({
            apiKey: 'test-key',
            workspaceRoot: __dirname
        });
        
        // Allow Phase 3 to initialize
        await new Promise(resolve => setTimeout(resolve, 200));
        
        console.log('✅ DevAssistant initialized with Phase 3 capabilities\n');
        
        // Test 1: Phase Integration Verification
        console.log('📋 Test 1: Multi-Phase Method Availability');
        totalTests++;
        
        const phase1Methods = ['connectToDatabase', 'queryDatabase', 'disconnectDatabase'];
        const phase2Methods = ['analyzeFileAdvanced', 'processMultipleFiles', 'generateFileSummary'];
        const phase3Methods = ['setContextMode', 'getSystemHealth', 'searchKnowledge', 'processAdvancedCommand'];
        
        let methodsWorking = 0;
        let totalMethods = phase1Methods.length + phase2Methods.length + phase3Methods.length;
        
        phase1Methods.forEach(method => {
            if (typeof assistant[method] === 'function') {
                console.log(`   ✅ Phase 1: ${method}`);
                methodsWorking++;
            } else {
                console.log(`   ❌ Phase 1: ${method} - missing`);
            }
        });
        
        phase2Methods.forEach(method => {
            if (typeof assistant[method] === 'function') {
                console.log(`   ✅ Phase 2: ${method}`);
                methodsWorking++;
            } else {
                console.log(`   ❌ Phase 2: ${method} - missing`);
            }
        });
        
        phase3Methods.forEach(method => {
            if (typeof assistant[method] === 'function') {
                console.log(`   ✅ Phase 3: ${method}`);
                methodsWorking++;
            } else {
                console.log(`   ❌ Phase 3: ${method} - missing`);
            }
        });
        
        if (methodsWorking === totalMethods) {
            console.log(`   ✅ All ${totalMethods} phase methods available`);
            passedTests++;
        } else {
            console.log(`   ❌ Only ${methodsWorking}/${totalMethods} methods available`);
        }
        
        // Test 2: Context Mode Management
        console.log('\n🎛️  Test 2: Advanced Context Mode Management');
        totalTests++;
        
        try {
            const modes = ['intelligent', 'aggressive', 'maximum', 'revolutionary'];
            let modeTests = 0;
            
            for (const mode of modes) {
                const result = await assistant.setContextMode(mode);
                if (result.success) {
                    console.log(`   ✅ Set context mode: ${mode}`);
                    modeTests++;
                } else {
                    console.log(`   ❌ Failed to set mode: ${mode}`);
                }
            }
            
            if (modeTests === modes.length) {
                console.log(`   ✅ All ${modes.length} context modes work`);
                passedTests++;
            } else {
                console.log(`   ❌ Only ${modeTests}/${modes.length} modes work`);
            }
        } catch (error) {
            console.log(`   ❌ Context mode test failed: ${error.message}`);
        }
        
        // Test 3: System Monitoring Integration
        console.log('\n📊 Test 3: System Monitoring & Health Checks');
        totalTests++;
        
        try {
            let monitoringTests = 0;
            
            // Test system health
            const health = await assistant.getSystemHealth();
            if (health.success && health.result.status) {
                console.log(`   ✅ System health: ${health.result.status}`);
                monitoringTests++;
            }
            
            // Test performance metrics
            const perf = await assistant.getPerformanceMetrics();
            if (perf.success && perf.result.metrics) {
                console.log(`   ✅ Performance metrics collected`);
                monitoringTests++;
            }
            
            // Test diagnostics
            const diag = await assistant.runDiagnostics();
            if (diag.success && diag.result.diagnostics) {
                console.log(`   ✅ Diagnostics completed: ${diag.result.diagnostics.length} checks`);
                monitoringTests++;
            }
            
            if (monitoringTests === 3) {
                console.log('   ✅ All monitoring functions work');
                passedTests++;
            } else {
                console.log(`   ❌ Only ${monitoringTests}/3 monitoring functions work`);
            }
        } catch (error) {
            console.log(`   ❌ Monitoring test failed: ${error.message}`);
        }
        
        // Test 4: Knowledge Base Operations
        console.log('\n📚 Test 4: Knowledge Base Integration');
        totalTests++;
        
        try {
            let knowledgeTests = 0;
            
            // Test knowledge search
            const search = await assistant.searchKnowledge('authentication patterns');
            if (search.success && search.result.results) {
                console.log(`   ✅ Knowledge search: ${search.result.results.length} results`);
                knowledgeTests++;
            }
            
            // Test knowledge stats
            const stats = await assistant.getKnowledgeStats();
            if (stats.success && stats.result.statistics) {
                console.log(`   ✅ Knowledge stats: ${stats.result.statistics.totalItems} items`);
                knowledgeTests++;
            }
            
            // Test knowledge extraction
            const extract = await assistant.extractKnowledge('test conversation context');
            if (extract.success) {
                console.log(`   ✅ Knowledge extraction: ${extract.result.extracted.length} items`);
                knowledgeTests++;
            }
            
            if (knowledgeTests === 3) {
                console.log('   ✅ All knowledge functions work');
                passedTests++;
            } else {
                console.log(`   ❌ Only ${knowledgeTests}/3 knowledge functions work`);
            }
        } catch (error) {
            console.log(`   ❌ Knowledge test failed: ${error.message}`);
        }
        
        // Test 5: Direct Command Processing
        console.log('\n⚡ Test 5: Direct Phase 3 Command Processing');
        totalTests++;
        
        try {
            const directCommands = ['/health', '/cs', '/kstats', '/rm'];
            let commandTests = 0;
            
            for (const command of directCommands) {
                const result = await assistant.processAdvancedCommand(command);
                if (result.handled && result.success) {
                    console.log(`   ✅ Direct command: ${command}`);
                    commandTests++;
                } else {
                    console.log(`   ❌ Direct command failed: ${command}`);
                }
            }
            
            if (commandTests === directCommands.length) {
                console.log(`   ✅ All ${directCommands.length} direct commands work`);
                passedTests++;
            } else {
                console.log(`   ❌ Only ${commandTests}/${directCommands.length} direct commands work`);
            }
        } catch (error) {
            console.log(`   ❌ Direct command test failed: ${error.message}`);
        }
        
        // Test 6: Integrated Workflow
        console.log('\n🔄 Test 6: Cross-Phase Integrated Workflow');
        totalTests++;
        
        try {
            // Workflow: Context Mode → Health Check → File Operation → Performance Check
            console.log('   🔄 Running integrated workflow...');
            
            // Step 1: Set advanced context
            await assistant.setContextMode('maximum');
            console.log('   ✅ Step 1: Set maximum context mode');
            
            // Step 2: Check system health
            const preHealth = await assistant.getSystemHealth();
            console.log(`   ✅ Step 2: Pre-operation health: ${preHealth.result.status}`);
            
            // Step 3: Perform file operation (Phase 2)
            const fileInfo = await assistant.fileManager.getFileInfo('./dev-assistant.js');
            console.log(`   ✅ Step 3: File operation: ${fileInfo.name} (${fileInfo.size} bytes)`);
            
            // Step 4: Get performance metrics
            const postPerf = await assistant.getPerformanceMetrics();
            console.log(`   ✅ Step 4: Post-operation performance metrics collected`);
            
            // Step 5: Extract knowledge about the workflow
            const knowledge = await assistant.extractKnowledge('integrated workflow test completed');
            console.log(`   ✅ Step 5: Knowledge extraction: ${knowledge.result.extracted.length} insights`);
            
            console.log('   ✅ Integrated workflow completed successfully');
            passedTests++;
            
        } catch (error) {
            console.log(`   ❌ Integrated workflow failed: ${error.message}`);
        }
        
        // Test 7: Help System Integration
        console.log('\n📖 Test 7: Unified Help System');
        totalTests++;
        
        try {
            const help = await assistant.help();
            
            const hasPhase1 = help.includes('DATABASE OPERATIONS (Phase 1)');
            const hasPhase2 = help.includes('ENHANCED FILE PROCESSING (Phase 2');
            const hasPhase3 = help.includes('ADVANCED COMMANDS & MONITORING (Phase 3)');
            
            console.log(`   Phase 1 in help: ${hasPhase1 ? '✅' : '❌'}`);
            console.log(`   Phase 2 in help: ${hasPhase2 ? '✅' : '❌'}`);
            console.log(`   Phase 3 in help: ${hasPhase3 ? '✅' : '❌'}`);
            
            if (hasPhase1 && hasPhase2 && hasPhase3) {
                console.log('   ✅ Unified help system includes all phases');
                passedTests++;
            } else {
                console.log('   ❌ Help system missing some phase documentation');
            }
        } catch (error) {
            console.log(`   ❌ Help system test failed: ${error.message}`);
        }
        
        // Final Results
        console.log('\n🎉 Phase 3 DevAssistant Integration Test Complete!');
        console.log('═'.repeat(50));
        console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);
        console.log(`📈 Success Rate: ${((passedTests/totalTests)*100).toFixed(1)}%`);
        
        if (passedTests === totalTests) {
            console.log('✅ All integration tests passed - Phase 3 fully integrated!');
            console.log('✅ DevAssistant now supports all three phases');
            console.log('✅ Advanced commands, monitoring, and knowledge base operational');
        } else {
            console.log(`⚠️  ${totalTests - passedTests} test(s) failed - review required`);
        }
        
    } catch (error) {
        console.error('❌ Integration test suite failed:', error.message);
        process.exit(1);
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testPhase3DevAssistantIntegration().catch(console.error);
}

module.exports = testPhase3DevAssistantIntegration;