/**
 * DevAssistant UI Demo - Test the API endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function demoUI() {
    console.log('🎨 DevAssistant UI Demo');
    console.log('='.repeat(50));
    
    try {
        // 1. Check health
        console.log('1. ✅ Health Check...');
        const health = await axios.get(`${BASE_URL}/api/health`);
        console.log(`   Status: ${health.data.status} - Assistant: ${health.data.assistant}`);
        
        // 2. Get workspace info
        console.log('\n2. 📊 Workspace Info...');
        const workspace = await axios.get(`${BASE_URL}/api/workspace-info`);
        const info = workspace.data.workspace;
        console.log(`   Files: ${info.totalFiles} total, ${info.codeFiles} code files`);
        console.log(`   Languages: ${info.languages.join(', ')}`);
        
        // 3. Test semantic search
        console.log('\n3. 🔍 Semantic Search...');
        const searchResult = await axios.post(`${BASE_URL}/api/semantic-search`, {
            query: 'file management functions'
        });
        console.log(`   Query: "file management functions"`);
        console.log(`   Results: ${searchResult.data.results?.length || 0} matches found`);
        
        // 4. Test code quality analysis
        console.log('\n4. 🤖 Code Quality Analysis...');
        const qualityResult = await axios.post(`${BASE_URL}/api/analyze-quality`, {
            filePath: './dev-assistant.js'
        });
        console.log(`   File: ./dev-assistant.js`);
        console.log(`   Quality Score: ${qualityResult.data.analysis.qualityScore}`);
        console.log(`   Issues: ${qualityResult.data.analysis.issues?.length || 0}`);
        
        // 5. Test file predictions
        console.log('\n5. 🔮 File Predictions...');
        const predictionResult = await axios.post(`${BASE_URL}/api/predict-files`, {
            context: { taskType: 'development' },
            limit: 5
        });
        const predictions = predictionResult.data.predictions;
        console.log(`   Context: development task`);
        console.log(`   Confidence: ${(predictions.confidence * 100).toFixed(1)}%`);
        console.log(`   Suggestions: ${predictions.predictions?.length || 0} files`);
        
        // 6. Test refactoring suggestions
        console.log('\n6. 🔧 Refactoring Suggestions...');
        const refactoringResult = await axios.post(`${BASE_URL}/api/suggest-refactoring`, {
            filePath: './dev-assistant.js'
        });
        console.log(`   File: ./dev-assistant.js`);
        console.log(`   Suggestions: ${refactoringResult.data.suggestions?.length || 0} recommendations`);
        
        console.log('\n' + '='.repeat(50));
        console.log('✅ All API endpoints working correctly!');
        console.log('🌐 Open http://localhost:3001 in your browser');
        console.log('='.repeat(50));
        
    } catch (error) {
        console.error('\n❌ Demo failed:', error.message);
        if (error.response?.status === 500) {
            console.error('   Server Error:', error.response.data?.error);
        }
        console.log('\n💡 Make sure the server is running: npm run devassistant-ui');
    }
}

demoUI();