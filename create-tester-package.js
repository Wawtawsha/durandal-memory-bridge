#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Files to include in tester package
const INCLUDE_FILES = [
    // Core application files
    'durandal.js',
    'claude-client.js',
    'db-client.js',
    'context-manager.js',
    'knowledge-analyzer.js',
    'ramr.js',
    'workspace-manager.js',
    
    // DevAssistant UI files  
    'devassistant-ui.html',
    'devassistant-ui-server.js',
    'workspace-selector-ui.js',
    
    // Phase implementation files
    'phase1-integration-layer.js',
    'phase2-integration-layer.js', 
    'phase3-integration-layer.js',
    'phase4-integration-layer.js',
    
    // Phase 4 AI components
    'semantic-code-indexing.js',
    'knowledge-graph-system.js',
    'predictive-file-suggestions.js',
    'automated-code-documentation.js',
    'ai-code-relationship-analysis.js',
    
    // Database schemas
    'claude_memory_schema.sql',
    'durandal_migration.sql',
    
    // Configuration files
    'package.json',
    'CLAUDE.md',
    'TESTER-SETUP-GUIDE.md',
    
    // Test files (for testers to verify functionality)
    'test-connection.js',
    'test-db-connection.js',
    'run-comprehensive-tests.js'
];

// Directories to exclude completely
const EXCLUDE_DIRS = [
    'node_modules',
    '.git',
    'dev-history',
    '.env*',
    '*.log',
    '*.db',
    '*.db-journal',
    'ramr-cache.db',
    'temp-*'
];

function createTesterPackage() {
    const sourceDir = __dirname;
    const packageName = 'devassistant-tester-package.zip';
    const packagePath = path.join(sourceDir, packageName);
    
    console.log('🚀 Creating DevAssistant Tester Package...');
    console.log(`📦 Package: ${packageName}`);
    
    // Create zip archive
    const output = fs.createWriteStream(packagePath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    archive.pipe(output);
    
    // Add included files
    INCLUDE_FILES.forEach(file => {
        const filePath = path.join(sourceDir, file);
        if (fs.existsSync(filePath)) {
            console.log(`✅ Adding: ${file}`);
            archive.file(filePath, { name: file });
        } else {
            console.log(`⚠️  Skipping missing: ${file}`);
        }
    });
    
    // Create .env.example file
    const envExample = `# DevAssistant Configuration
# Copy this to .env and add your actual API key

# Required: Claude API Key from https://console.anthropic.com
CLAUDE_API_KEY=sk-ant-api03-your-actual-key-here

# Optional: Database configuration (defaults to SQLite)
# DB_TYPE=postgresql
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=durandal_ai
# DB_USER=your_username
# DB_PASS=your_password

# Optional: Server configuration
# PORT=3002
# NODE_ENV=production
`;
    
    archive.append(envExample, { name: '.env.example' });
    console.log('✅ Adding: .env.example (template)');
    
    output.on('close', () => {
        const sizeKB = Math.round(archive.pointer() / 1024);
        console.log('');
        console.log('🎉 Tester package created successfully!');
        console.log(`📁 File: ${packageName}`);
        console.log(`📊 Size: ${sizeKB} KB`);
        console.log('');
        console.log('📋 Next steps for testers:');
        console.log('1. Extract the package');
        console.log('2. Run: npm install');
        console.log('3. Copy .env.example to .env');
        console.log('4. Add Claude API key to .env');
        console.log('5. Run: npm run devassistant-ui');
        console.log('6. Open: http://localhost:3002');
        console.log('');
        console.log('📖 Full instructions in TESTER-SETUP-GUIDE.md');
    });
    
    archive.finalize();
}

// Check if archiver is available
try {
    require('archiver');
    createTesterPackage();
} catch (error) {
    console.log('📦 Installing archiver package...');
    const { execSync } = require('child_process');
    
    try {
        execSync('npm install archiver --save-dev', { stdio: 'inherit' });
        console.log('✅ Archiver installed successfully');
        
        // Retry package creation
        delete require.cache[require.resolve('archiver')];
        createTesterPackage();
        
    } catch (installError) {
        console.error('❌ Failed to install archiver:', installError.message);
        console.log('');
        console.log('Manual alternative:');
        console.log('1. Install archiver: npm install archiver');
        console.log('2. Run this script again: node create-tester-package.js');
    }
}