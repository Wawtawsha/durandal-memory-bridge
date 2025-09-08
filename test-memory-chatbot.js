const ClaudeClient = require('./claude-client');
const ClaudeMemoryDB = require('./db-client');

async function testMemoryChatbot() {
    console.log('🧪 Testing Memory-Enabled Chatbot Components...\n');
    
    const db = new ClaudeMemoryDB();
    const claude = new ClaudeClient();
    
    try {
        // Test 1: Database Connection
        console.log('1️⃣ Testing database connection...');
        const dbTest = await db.testConnection();
        if (dbTest.success) {
            console.log('✅ Database connection successful');
        } else {
            throw new Error(`Database failed: ${dbTest.error}`);
        }
        
        // Test 2: Claude API Connection
        console.log('\n2️⃣ Testing Claude API connection...');
        const claudeTest = await claude.testConnection();
        if (claudeTest.success) {
            console.log('✅ Claude API connection successful');
        } else {
            throw new Error(`Claude API failed: ${claudeTest.error}`);
        }
        
        // Test 3: Project Management
        console.log('\n3️⃣ Testing project management...');
        const testProject = 'test-memory-chatbot';
        
        let project = await db.getProject(testProject);
        if (!project) {
            project = await db.createProject(
                testProject,
                'Test project for memory chatbot',
                { type: 'test', location: '/test' }
            );
            console.log('✅ Test project created');
        } else {
            console.log('✅ Test project found');
        }
        
        // Test 4: Conversation Session Management
        console.log('\n4️⃣ Testing conversation sessions...');
        const session = await db.startConversationSession(project.id, 'Test Topic');
        console.log('✅ Conversation session created');
        
        // Test 5: Knowledge Artifact Storage
        console.log('\n5️⃣ Testing knowledge artifacts...');
        const artifact = await db.saveKnowledgeArtifact(
            project.id,
            'test',
            'Test Knowledge',
            { test_data: 'This is test knowledge', created_by: 'test_script' },
            { test: true },
            ['test', 'memory', 'chatbot'],
            7
        );
        console.log('✅ Knowledge artifact saved');
        
        // Test 6: Project State Capture
        console.log('\n6️⃣ Testing project state capture...');
        const state = await db.saveProjectState(
            project.id,
            'Test State',
            { 
                test_state: true, 
                components: ['database', 'claude', 'chatbot'],
                status: 'testing'
            },
            { files: ['test.js'] },
            { node_version: process.version },
            true
        );
        console.log('✅ Project state saved');
        
        // Test 7: Conversation Ending
        console.log('\n7️⃣ Testing conversation ending...');
        await db.endConversationSession(
            session.id,
            { 
                messages: [
                    { role: 'user', content: 'Test message' },
                    { role: 'assistant', content: 'Test response' }
                ],
                test: true
            },
            'Test conversation completed',
            2
        );
        console.log('✅ Conversation session ended');
        
        // Test 8: Data Retrieval
        console.log('\n8️⃣ Testing data retrieval...');
        const summary = await db.getProjectSummary(project.id);
        console.log(`✅ Project summary: ${summary.conversations} conversations, ${summary.artifacts} artifacts`);
        
        const conversations = await db.getConversationHistory(project.id, 5);
        console.log(`✅ Retrieved ${conversations.length} conversation sessions`);
        
        const artifacts = await db.getKnowledgeArtifacts(project.id, 'test', 5);
        console.log(`✅ Retrieved ${artifacts.length} test artifacts`);
        
        // Test 9: File System Integration Test
        console.log('\n9️⃣ Testing file system integration...');
        const fs = require('fs').promises;
        const path = require('path');
        
        try {
            const projectRoot = process.cwd();
            const items = await fs.readdir(projectRoot);
            const jsFiles = items.filter(item => item.endsWith('.js'));
            console.log(`✅ Found ${jsFiles.length} JavaScript files in project:`, jsFiles.slice(0, 3).join(', '));
        } catch (error) {
            console.log('⚠️  File system test partial:', error.message);
        }
        
        console.log('\n🎉 All memory chatbot component tests passed!');
        console.log('\n📋 Ready to run memory-enabled-chatbot.js');
        console.log('   Usage: node memory-enabled-chatbot.js');
        
        console.log('\n🔧 Quick Start Guide:');
        console.log('   1. The chatbot will prompt you to select a conversation topic');
        console.log('   2. Type "/commands" to see all available commands');
        console.log('   3. Type "/status" to see project summary');
        console.log('   4. Type "exit" to save and quit');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('   - Ensure PostgreSQL is running');
        console.log('   - Check .env file has correct API key and database credentials');
        console.log('   - Verify all npm packages are installed');
    } finally {
        await db.close();
    }
}

// Run the tests
testMemoryChatbot();
