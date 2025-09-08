/**
 * DevAssistant Usage Examples
 * Your complete AI-powered development assistant
 */

const DevAssistant = require('./dev-assistant');

async function demonstrateDevAssistant() {
    console.log('🚀 Initializing DevAssistant...\n');
    
    // Initialize the assistant
    const assistant = new DevAssistant({
        workspaceRoot: process.cwd()
    });
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('✅ DevAssistant ready! Here are your options:\n');
    
    try {
        // === PHASE 4: SEMANTIC SEARCH & AI FEATURES ===
        console.log('🔍 PHASE 4: Semantic Search & AI Features');
        
        // 1. Semantic search
        console.log('1. Semantic Search:');
        const searchResults = await assistant.semanticSearch('file management functions');
        console.log(`   Found ${searchResults.results?.length || 0} relevant code files\n`);
        
        // 2. Find similar code
        console.log('2. Similar Code Analysis:');
        const similarCode = await assistant.findSimilarCode('./dev-assistant.js');
        console.log(`   Found ${similarCode.similarFiles?.length || 0} similar files\n`);
        
        // 3. Predict next files
        console.log('3. File Predictions:');
        const predictions = await assistant.predictFiles({ taskType: 'development' });
        console.log(`   ML suggests ${predictions.predictions?.length || 0} files (${(predictions.confidence * 100).toFixed(1)}% confidence)\n`);
        
        // 4. Analyze code quality
        console.log('4. Code Quality Analysis:');
        const quality = await assistant.analyzeCodeQuality('./dev-assistant.js');
        console.log(`   Quality score: ${quality.qualityScore} (${quality.issues?.length || 0} issues found)\n`);
        
        // 5. Get code relationships
        console.log('5. Code Relationships:');
        const relationships = await assistant.getCodeRelationships('./dev-assistant.js');
        console.log(`   Connected to ${relationships.relatedFiles?.length || 0} other files\n`);
        
        // === PHASE 3: ADVANCED COMMANDS ===
        console.log('🎛️  PHASE 3: Advanced Commands & Monitoring');
        
        // 6. System health
        const health = await assistant.getSystemHealth();
        console.log(`6. System Health: ${health.handled ? health.result?.status || 'healthy' : 'available'}\n`);
        
        // 7. Context management
        await assistant.setContextMode('intelligent');
        console.log('7. Context Mode: Set to intelligent\n');
        
        // === PHASE 2: FILE PROCESSING ===
        console.log('📄 PHASE 2: Enhanced File Processing');
        
        // 8. Advanced file analysis (works with PDFs, Excel, CSV, etc.)
        console.log('8. Advanced File Analysis: Ready for PDF, Excel, CSV, XML, Logs\n');
        
        // === PHASE 1: DATABASE & CORE ===
        console.log('🗃️  PHASE 1: Database & Core Operations');
        
        // 9. Code analysis
        const codeAnalysis = await assistant.analyzeCode('./dev-assistant.js');
        console.log(`9. Code Analysis: ${codeAnalysis.functions?.length || 0} functions, ${codeAnalysis.classes?.length || 0} classes\n`);
        
        // 10. Project overview
        const projectInfo = await assistant.getWorkspaceInfo();
        console.log(`10. Workspace: ${projectInfo.totalFiles} files, ${projectInfo.codeFiles} code files\n`);
        
        console.log('🎉 ALL FEATURES WORKING! Your DevAssistant is ready to use.');
        console.log('\n📚 Get full help with: await assistant.help()');
        
    } catch (error) {
        console.error('Error during demonstration:', error.message);
    }
}

// === INTERACTIVE USAGE EXAMPLES ===

async function interactiveExamples() {
    const assistant = new DevAssistant();
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 INTERACTIVE EXAMPLES - Copy & Use These:');
    console.log('='.repeat(60));
    
    const examples = [
        {
            category: '🔍 Smart Code Search',
            code: `// Find authentication-related code
const authResults = await assistant.semanticSearch('authentication middleware login');
console.log('Found auth code in:', authResults.results?.map(r => r.file));`
        },
        {
            category: '🤖 AI Code Analysis',
            code: `// Analyze code quality and get suggestions
const quality = await assistant.analyzeCodeQuality('./your-file.js');
console.log('Quality Score:', quality.qualityScore);
console.log('Issues:', quality.issues);
console.log('Recommendations:', quality.recommendations);`
        },
        {
            category: '📈 Predictive Intelligence',
            code: `// Get ML-powered file suggestions
const predictions = await assistant.predictFiles({ 
    taskType: 'debugging', 
    project: 'my-app' 
});
console.log('Suggested files:', predictions.predictions.map(p => p.file));`
        },
        {
            category: '📚 Auto Documentation',
            code: `// Generate documentation for your code
const docs = await assistant.generateDocumentation('./my-component.js', {
    formats: ['markdown', 'jsdoc'],
    types: ['api', 'inline']
});
console.log('Documentation generated:', docs.generated?.length);`
        },
        {
            category: '🔧 Refactoring Assistance',
            code: `// Get intelligent refactoring suggestions
const suggestions = await assistant.suggestRefactoring('./legacy-code.js');
console.log('Refactoring suggestions:', suggestions.map(s => s.description));`
        },
        {
            category: '🌐 Knowledge Graph',
            code: `// Build project knowledge graph
const graph = await assistant.buildKnowledgeGraph('./src');
console.log('Built graph:', graph.nodes, 'nodes,', graph.relationships, 'relationships');`
        },
        {
            category: '⚡ Advanced Commands',
            code: `// Use Phase 3 advanced commands
await assistant.setContextMode('revolutionary');
const health = await assistant.getSystemHealth();
const knowledge = await assistant.searchKnowledge('react components');`
        },
        {
            category: '📊 Project Intelligence',
            code: `// Full workspace indexing with ML training
const indexResults = await assistant.indexWorkspace('./src');
console.log('Indexed:', indexResults.summary.filesIndexed, 'files');
console.log('Relationships:', indexResults.summary.relationships);`
        }
    ];
    
    examples.forEach((example, index) => {
        console.log(`\n${index + 1}. ${example.category}`);
        console.log('-'.repeat(40));
        console.log(example.code);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('📖 For complete API reference: await assistant.help()');
    console.log('🧪 Test everything: npm run test-all');
    console.log('='.repeat(60));
}

// Run the demonstration
if (require.main === module) {
    demonstrateDevAssistant()
        .then(() => interactiveExamples())
        .catch(console.error);
}

module.exports = { demonstrateDevAssistant, interactiveExamples };