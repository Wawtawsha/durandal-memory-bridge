const ClaudeMemoryDB = require('./db-client');

async function testDatabase() {
    console.log('🗄️  Testing Claude Memory Database...\n');
    
    const db = new ClaudeMemoryDB();
    
    try {
        // Test connection
        console.log('📡 Testing database connection...');
        const connectionTest = await db.testConnection();
        
        if (connectionTest.success) {
            console.log('✅ Database connected successfully!');
            console.log('🕒 Server time:', connectionTest.timestamp);
        } else {
            console.log('❌ Database connection failed:', connectionTest.error);
            return;
        }
        
        // Get or create project
        console.log('\n📁 Testing project management...');
        let project = await db.getProject('claude-chatbot');
        if (!project) {
            project = await db.createProject('claude-chatbot', 'Initial Claude API integration project');
            console.log('✅ Project created:', project.name);
        } else {
            console.log('✅ Project found:', project.name);
        }
        
        // Test conversation session
        console.log('\n💬 Testing conversation session...');
        const session = await db.startConversationSession(project.id, 'Test Session');
        console.log('✅ Conversation session started:', session.id);
        
        // Test knowledge artifact
        console.log('\n🧠 Testing knowledge artifact...');
        const artifact = await db.saveKnowledgeArtifact(
            project.id,
            'test',
            'Database Setup Test',
            { test: 'This is a test artifact', setup_date: new Date().toISOString() },
            { type: 'test', importance: 'high' },
            ['test', 'setup', 'database'],
            8
        );
        console.log('✅ Knowledge artifact saved:', artifact.id);
        
        // Test project state
        console.log('\n📊 Testing project state...');
        const state = await db.saveProjectState(
            project.id,
            'Initial Database Setup',
            { 
                setup_complete: true, 
                database_schema_version: '1.0',
                tables_created: ['projects', 'conversation_sessions', 'knowledge_artifacts', 'project_states']
            },
            { directories: ['claude-chatbot'], files: ['chatbot.js', 'db-client.js'] },
            { postgresql_version: '16', nodejs_version: 'latest' },
            true
        );
        console.log('✅ Project state saved:', state.id);
        
        // Test search
        console.log('\n🔍 Testing search functionality...');
        const artifacts = await db.searchKnowledgeByTags(project.id, ['test']);
        console.log('✅ Search results:', artifacts.length, 'artifacts found');
        
        // Get project summary
        console.log('\n📈 Testing project summary...');
        const summary = await db.getProjectSummary(project.id);
        console.log('✅ Project summary:', summary);
        
        console.log('\n🎉 All database tests passed! PostgreSQL is ready for Claude integration.');
        
    } catch (error) {
        console.error('❌ Database test failed:', error.message);
        console.log('\n🔧 Troubleshooting tips:');
        console.log('- Check that PostgreSQL is running: sudo systemctl status postgresql');
        console.log('- Verify database credentials in .env file');
        console.log('- Ensure database schema was applied correctly');
    } finally {
        await db.close();
    }
}

// Run the test
testDatabase();
