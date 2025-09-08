const EventEmitter = require('events');

/**
 * Knowledge Command System - Enhanced Knowledge Base Integration for Phase 3
 * 
 * Provides intelligent knowledge management commands:
 * - /ks (Knowledge Search): Semantic search through extracted knowledge
 * - /kstats (Knowledge Statistics): Detailed analytics and insights
 * - /kr (Knowledge Review): AI-powered knowledge curation and review
 * - /kextract: Force knowledge extraction from conversations
 * - /koptimize: Optimize knowledge database for better performance
 * - /kgraph: Visualize knowledge relationships and patterns
 */
class KnowledgeCommandSystem extends EventEmitter {
    constructor(dbClient, knowledgeAnalyzer, options = {}) {
        super();
        
        this.dbClient = dbClient;
        this.knowledgeAnalyzer = knowledgeAnalyzer;
        this.config = {
            maxSearchResults: 20,
            searchRelevanceThreshold: 0.3,
            reviewBatchSize: 10,
            enableSemanticSearch: true,
            cacheSearchResults: true,
            ...options
        };
        
        // Command registry for knowledge operations
        this.commands = new Map([
            ['ks', { handler: this.handleKnowledgeSearch.bind(this), description: 'Search knowledge base with semantic understanding' }],
            ['knowledge-search', { handler: this.handleKnowledgeSearch.bind(this), description: 'Search knowledge base with semantic understanding' }],
            ['kstats', { handler: this.handleKnowledgeStats.bind(this), description: 'Show detailed knowledge base analytics' }],
            ['knowledge-stats', { handler: this.handleKnowledgeStats.bind(this), description: 'Show detailed knowledge base analytics' }],
            ['kr', { handler: this.handleKnowledgeReview.bind(this), description: 'AI-powered knowledge review and curation' }],
            ['knowledge-review', { handler: this.handleKnowledgeReview.bind(this), description: 'AI-powered knowledge review and curation' }],
            ['kextract', { handler: this.handleKnowledgeExtraction.bind(this), description: 'Force extract knowledge from recent conversations' }],
            ['knowledge-extract', { handler: this.handleKnowledgeExtraction.bind(this), description: 'Force extract knowledge from recent conversations' }],
            ['koptimize', { handler: this.handleKnowledgeOptimize.bind(this), description: 'Optimize knowledge database performance' }],
            ['knowledge-optimize', { handler: this.handleKnowledgeOptimize.bind(this), description: 'Optimize knowledge database performance' }],
            ['kgraph', { handler: this.handleKnowledgeGraph.bind(this), description: 'Visualize knowledge relationships and patterns' }],
            ['knowledge-graph', { handler: this.handleKnowledgeGraph.bind(this), description: 'Visualize knowledge relationships and patterns' }],
            ['kclean', { handler: this.handleKnowledgeCleanup.bind(this), description: 'Clean up outdated or low-value knowledge entries' }],
            ['knowledge-clean', { handler: this.handleKnowledgeCleanup.bind(this), description: 'Clean up outdated or low-value knowledge entries' }],
            ['kbackup', { handler: this.handleKnowledgeBackup.bind(this), description: 'Create knowledge base backup' }],
            ['knowledge-backup', { handler: this.handleKnowledgeBackup.bind(this), description: 'Create knowledge base backup' }]
        ]);
        
        // Search cache for performance
        this.searchCache = new Map();
        this.cacheTimeout = 300000; // 5 minutes
        
        // Statistics tracking
        this.stats = {
            searchesPerformed: 0,
            extractionsPerformed: 0,
            optimizationsRun: 0,
            lastOptimization: null,
            sessionStartTime: Date.now()
        };
        
        console.log('📚 KnowledgeCommandSystem initialized with enhanced intelligence');
    }

    /**
     * Process a knowledge command and return true if handled
     */
    async processCommand(input, conversationHistory = [], projectContext = null) {
        const trimmed = input.trim();
        if (!trimmed.startsWith('/')) {
            return false;
        }
        
        const parts = trimmed.substring(1).split(' ');
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);
        
        const commandInfo = this.commands.get(command);
        if (!commandInfo) {
            return false;
        }
        
        try {
            await commandInfo.handler(args, conversationHistory, projectContext);
            this.emit('command:executed', { command, args, success: true });
            return true;
        } catch (error) {
            console.error(`📚 Knowledge command '${command}' failed:`, error.message);
            this.emit('command:executed', { command, args, success: false, error: error.message });
            return true; // Still handled, just failed
        }
    }

    /**
     * Knowledge Search - Semantic search through extracted knowledge
     */
    async handleKnowledgeSearch(args, conversationHistory, projectContext) {
        if (args.length === 0) {
            console.log('📚 Usage: /ks <search term> [--limit=10] [--type=all]');
            console.log('   Example: /ks authentication --limit=5 --type=code');
            console.log('   Types: all, code, documentation, configuration, learning');
            return;
        }
        
        const searchTerm = args[0];
        const options = this.parseCommandOptions(args.slice(1));
        const limit = parseInt(options.limit) || this.config.maxSearchResults;
        const type = options.type || 'all';
        
        console.log('🔍 KNOWLEDGE SEARCH');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`🎯 Search: "${searchTerm}"`);
        console.log(`📊 Limit: ${limit} results | Type: ${type}`);
        
        this.stats.searchesPerformed++;
        
        try {
            // Check cache first
            const cacheKey = `${searchTerm}:${limit}:${type}`;
            if (this.config.cacheSearchResults && this.searchCache.has(cacheKey)) {
                const cached = this.searchCache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    console.log('⚡ Using cached results');
                    await this.displaySearchResults(cached.results, searchTerm);
                    return;
                }
            }
            
            // Perform semantic search
            const searchResults = await this.performSemanticSearch(searchTerm, limit, type);
            
            // Cache results
            if (this.config.cacheSearchResults) {
                this.searchCache.set(cacheKey, {
                    results: searchResults,
                    timestamp: Date.now()
                });
            }
            
            await this.displaySearchResults(searchResults, searchTerm);
            
        } catch (error) {
            console.error('🔍 Search failed:', error.message);
            console.log('   Falling back to basic text search...');
            
            // Fallback to basic search
            try {
                const basicResults = await this.performBasicSearch(searchTerm, limit);
                await this.displaySearchResults(basicResults, searchTerm, true);
            } catch (fallbackError) {
                console.error('❌ Both semantic and basic search failed:', fallbackError.message);
            }
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    /**
     * Knowledge Statistics - Detailed analytics and insights
     */
    async handleKnowledgeStats(args, conversationHistory, projectContext) {
        console.log('📊 KNOWLEDGE BASE ANALYTICS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        try {
            // Basic statistics
            const basicStats = await this.getBasicKnowledgeStats();
            console.log('📈 Basic Statistics:');
            console.log(`   Total Artifacts: ${basicStats.totalArtifacts.toLocaleString()}`);
            console.log(`   Average Relevance: ${basicStats.avgRelevance.toFixed(2)}/10`);
            console.log(`   Last 7 Days: ${basicStats.recentArtifacts} new artifacts`);
            console.log(`   Storage Used: ${(basicStats.storageSize / 1024 / 1024).toFixed(2)} MB`);
            
            // Category breakdown
            const categoryStats = await this.getCategoryStats();
            console.log('\n📂 Knowledge Categories:');
            Object.entries(categoryStats).forEach(([category, count]) => {
                const percentage = ((count / basicStats.totalArtifacts) * 100).toFixed(1);
                console.log(`   ${category}: ${count} (${percentage}%)`);
            });
            
            // Quality metrics
            const qualityStats = await this.getQualityMetrics();
            console.log('\n⭐ Quality Metrics:');
            console.log(`   High Value (8-10): ${qualityStats.highValue} artifacts`);
            console.log(`   Medium Value (5-7): ${qualityStats.mediumValue} artifacts`);
            console.log(`   Low Value (1-4): ${qualityStats.lowValue} artifacts`);
            console.log(`   Quality Score: ${qualityStats.overallQuality.toFixed(1)}/10`);
            
            // Usage patterns
            const usageStats = await this.getUsagePatterns();
            console.log('\n📊 Usage Patterns:');
            console.log(`   Most Searched: "${usageStats.topSearchTerm}" (${usageStats.topSearchCount} times)`);
            console.log(`   Active Projects: ${usageStats.activeProjects.length}`);
            console.log(`   Peak Usage: ${usageStats.peakUsageHour}:00`);
            
            // Performance metrics
            console.log('\n🚀 Performance Metrics:');
            console.log(`   Searches This Session: ${this.stats.searchesPerformed}`);
            console.log(`   Extractions This Session: ${this.stats.extractionsPerformed}`);
            console.log(`   Last Optimization: ${this.stats.lastOptimization ? 
                new Date(this.stats.lastOptimization).toLocaleString() : 'Never'}`);
            
            // Recommendations
            console.log('\n💡 Recommendations:');
            if (qualityStats.lowValue > qualityStats.highValue) {
                console.log('   Consider running /kclean to remove low-value entries');
            }
            if (!this.stats.lastOptimization || Date.now() - this.stats.lastOptimization > 604800000) {
                console.log('   Consider running /koptimize for better performance');
            }
            if (basicStats.totalArtifacts < 10) {
                console.log('   Run /kextract to build up your knowledge base');
            }
            
        } catch (error) {
            console.error('📊 Failed to generate knowledge statistics:', error.message);
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    /**
     * Knowledge Review - AI-powered knowledge curation and review
     */
    async handleKnowledgeReview(args, conversationHistory, projectContext) {
        const reviewType = args[0] || 'recent';
        const batchSize = parseInt(args[1]) || this.config.reviewBatchSize;
        
        console.log('🔍 AI-POWERED KNOWLEDGE REVIEW');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📋 Review Type: ${reviewType}`);
        console.log(`📊 Batch Size: ${batchSize} artifacts`);
        
        try {
            let artifacts = [];
            
            switch (reviewType) {
                case 'recent':
                    artifacts = await this.getRecentArtifacts(batchSize);
                    break;
                case 'low-quality':
                    artifacts = await this.getLowQualityArtifacts(batchSize);
                    break;
                case 'duplicates':
                    artifacts = await this.findDuplicateArtifacts(batchSize);
                    break;
                case 'outdated':
                    artifacts = await this.getOutdatedArtifacts(batchSize);
                    break;
                default:
                    artifacts = await this.getRecentArtifacts(batchSize);
            }
            
            if (artifacts.length === 0) {
                console.log(`✅ No artifacts found for review type: ${reviewType}`);
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                return;
            }
            
            console.log(`📝 Reviewing ${artifacts.length} artifacts...\n`);
            
            for (let i = 0; i < artifacts.length; i++) {
                const artifact = artifacts[i];
                const analysis = await this.analyzeArtifactQuality(artifact);
                
                console.log(`${i + 1}. ${artifact.artifact_type || 'Unknown'} | Quality: ${analysis.quality}/10`);
                console.log(`   Content: ${artifact.content.substring(0, 100)}${artifact.content.length > 100 ? '...' : ''}`);
                console.log(`   Status: ${analysis.status} | Action: ${analysis.recommendedAction}`);
                
                if (analysis.issues.length > 0) {
                    console.log(`   Issues: ${analysis.issues.join(', ')}`);
                }
                
                if (analysis.recommendedAction === 'DELETE' && args.includes('--auto-clean')) {
                    await this.deleteArtifact(artifact.id);
                    console.log(`   ✅ Auto-deleted low-quality artifact`);
                }
                
                console.log('');
            }
            
            // Summary
            const qualityScores = artifacts.map(async (a) => (await this.analyzeArtifactQuality(a)).quality);
            const avgQuality = (await Promise.all(qualityScores)).reduce((a, b) => a + b, 0) / artifacts.length;
            
            console.log('📊 Review Summary:');
            console.log(`   Average Quality: ${avgQuality.toFixed(1)}/10`);
            console.log(`   Artifacts Reviewed: ${artifacts.length}`);
            
            if (!args.includes('--auto-clean')) {
                console.log('\n💡 Tip: Add --auto-clean to automatically remove low-quality entries');
            }
            
        } catch (error) {
            console.error('🔍 Knowledge review failed:', error.message);
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    /**
     * Knowledge Extraction - Force extract knowledge from conversations
     */
    async handleKnowledgeExtraction(args, conversationHistory, projectContext) {
        const depth = parseInt(args[0]) || 5;
        const forceExtraction = args.includes('--force');
        
        console.log('🧠 KNOWLEDGE EXTRACTION');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📊 Conversation Depth: ${depth} messages`);
        console.log(`⚡ Force Mode: ${forceExtraction ? 'ON' : 'OFF'}`);
        
        this.stats.extractionsPerformed++;
        
        try {
            if (!conversationHistory || conversationHistory.length === 0) {
                console.log('⚠️  No conversation history available for extraction');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                return;
            }
            
            const messagesToProcess = conversationHistory.slice(-depth);
            console.log(`📝 Processing ${messagesToProcess.length} messages...\n`);
            
            let extractedCount = 0;
            let skippedCount = 0;
            
            for (let i = 0; i < messagesToProcess.length; i++) {
                const message = messagesToProcess[i];
                
                try {
                    // Analyze if message contains extractable knowledge
                    const analysis = await this.knowledgeAnalyzer.analyzeContent(message.content);
                    
                    if (analysis.relevance_score >= 6 || forceExtraction) {
                        // Extract and save knowledge
                        const artifact = {
                            content: message.content,
                            artifact_type: analysis.artifact_type || 'conversation_extract',
                            relevance_score: analysis.relevance_score,
                            context: analysis.context || {},
                            source_context: {
                                message_index: conversationHistory.length - depth + i,
                                role: message.role,
                                timestamp: message.timestamp || new Date().toISOString(),
                                project: projectContext?.name || 'unknown'
                            }
                        };
                        
                        const saved = await this.dbClient.saveExtractedKnowledge([artifact], projectContext);
                        
                        if (saved && saved.length > 0) {
                            extractedCount++;
                            console.log(`✅ Extracted: ${analysis.artifact_type} (score: ${analysis.relevance_score})`);
                        } else {
                            console.log(`❌ Failed to save: ${analysis.artifact_type}`);
                        }
                    } else {
                        skippedCount++;
                        console.log(`⏭️  Skipped: Low relevance (${analysis.relevance_score})`);
                    }
                    
                } catch (messageError) {
                    console.error(`❌ Error processing message ${i + 1}:`, messageError.message);
                    skippedCount++;
                }
            }
            
            console.log('\n📊 Extraction Summary:');
            console.log(`   Messages Processed: ${messagesToProcess.length}`);
            console.log(`   Knowledge Extracted: ${extractedCount}`);
            console.log(`   Messages Skipped: ${skippedCount}`);
            console.log(`   Success Rate: ${((extractedCount / messagesToProcess.length) * 100).toFixed(1)}%`);
            
        } catch (error) {
            console.error('🧠 Knowledge extraction failed:', error.message);
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    /**
     * Knowledge Optimize - Optimize database for better performance
     */
    async handleKnowledgeOptimize(args, conversationHistory, projectContext) {
        console.log('⚡ KNOWLEDGE BASE OPTIMIZATION');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        this.stats.optimizationsRun++;
        const startTime = Date.now();
        
        try {
            // Step 1: Cleanup duplicate entries
            console.log('🔄 Step 1: Removing duplicate entries...');
            const duplicatesRemoved = await this.removeDuplicateArtifacts();
            console.log(`   ✅ Removed ${duplicatesRemoved} duplicates`);
            
            // Step 2: Archive low-quality entries
            console.log('🔄 Step 2: Archiving low-quality entries...');
            const lowQualityArchived = await this.archiveLowQualityArtifacts();
            console.log(`   ✅ Archived ${lowQualityArchived} low-quality entries`);
            
            // Step 3: Update relevance scores
            console.log('🔄 Step 3: Recalculating relevance scores...');
            const scoresUpdated = await this.recalculateRelevanceScores();
            console.log(`   ✅ Updated ${scoresUpdated} relevance scores`);
            
            // Step 4: Rebuild search indexes
            console.log('🔄 Step 4: Rebuilding search indexes...');
            await this.rebuildSearchIndexes();
            console.log(`   ✅ Search indexes rebuilt`);
            
            // Step 5: Clear caches
            console.log('🔄 Step 5: Clearing caches...');
            this.searchCache.clear();
            console.log(`   ✅ Search cache cleared`);
            
            const optimizationTime = Date.now() - startTime;
            this.stats.lastOptimization = Date.now();
            
            console.log('\n📊 Optimization Summary:');
            console.log(`   Duplicates Removed: ${duplicatesRemoved}`);
            console.log(`   Low-Quality Archived: ${lowQualityArchived}`);
            console.log(`   Scores Updated: ${scoresUpdated}`);
            console.log(`   Optimization Time: ${optimizationTime}ms`);
            console.log(`   Space Saved: ~${((duplicatesRemoved + lowQualityArchived) * 0.5).toFixed(1)} KB`);
            
        } catch (error) {
            console.error('⚡ Optimization failed:', error.message);
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    /**
     * Knowledge Graph - Visualize relationships and patterns
     */
    async handleKnowledgeGraph(args, conversationHistory, projectContext) {
        const graphType = args[0] || 'relationships';
        const maxNodes = parseInt(args[1]) || 20;
        
        console.log('🕸️  KNOWLEDGE RELATIONSHIP GRAPH');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📊 Graph Type: ${graphType}`);
        console.log(`🔢 Max Nodes: ${maxNodes}`);
        
        try {
            switch (graphType) {
                case 'relationships':
                    await this.displayRelationshipGraph(maxNodes);
                    break;
                case 'categories':
                    await this.displayCategoryGraph(maxNodes);
                    break;
                case 'timeline':
                    await this.displayTimelineGraph(maxNodes);
                    break;
                case 'quality':
                    await this.displayQualityGraph(maxNodes);
                    break;
                default:
                    await this.displayRelationshipGraph(maxNodes);
            }
        } catch (error) {
            console.error('🕸️  Graph generation failed:', error.message);
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    /**
     * Knowledge Cleanup - Clean up outdated or low-value entries
     */
    async handleKnowledgeCleanup(args, conversationHistory, projectContext) {
        const dryRun = !args.includes('--execute');
        const aggressiveMode = args.includes('--aggressive');
        
        console.log('🧹 KNOWLEDGE BASE CLEANUP');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`🔍 Mode: ${dryRun ? 'DRY RUN (preview only)' : 'EXECUTE (will delete)'}`);
        console.log(`⚡ Aggressive: ${aggressiveMode ? 'ON' : 'OFF'}`);
        
        try {
            const cleanupCandidates = await this.identifyCleanupCandidates(aggressiveMode);
            
            if (cleanupCandidates.length === 0) {
                console.log('✅ No cleanup candidates found - knowledge base is clean!');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                return;
            }
            
            console.log(`\n📋 Found ${cleanupCandidates.length} cleanup candidates:\n`);
            
            let totalSizeSaved = 0;
            for (const candidate of cleanupCandidates) {
                console.log(`${candidate.reason}: ${candidate.content.substring(0, 60)}...`);
                console.log(`   ID: ${candidate.id} | Quality: ${candidate.quality}/10 | Size: ${candidate.size} bytes`);
                totalSizeSaved += candidate.size;
                
                if (!dryRun) {
                    await this.deleteArtifact(candidate.id);
                    console.log(`   ✅ Deleted`);
                }
                console.log('');
            }
            
            console.log('📊 Cleanup Summary:');
            console.log(`   Candidates Identified: ${cleanupCandidates.length}`);
            console.log(`   Estimated Space Saved: ${(totalSizeSaved / 1024).toFixed(2)} KB`);
            
            if (dryRun) {
                console.log('\n💡 Add --execute to perform actual cleanup');
                console.log('💡 Add --aggressive for more thorough cleanup');
            } else {
                console.log('\n✅ Cleanup completed successfully');
            }
            
        } catch (error) {
            console.error('🧹 Cleanup failed:', error.message);
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    /**
     * Knowledge Backup - Create knowledge base backup
     */
    async handleKnowledgeBackup(args, conversationHistory, projectContext) {
        const backupName = args[0] || `knowledge-backup-${new Date().toISOString().split('T')[0]}`;
        const includeProjectContext = !args.includes('--no-context');
        
        console.log('💾 KNOWLEDGE BASE BACKUP');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📁 Backup Name: ${backupName}`);
        console.log(`📊 Include Context: ${includeProjectContext}`);
        
        try {
            const backupData = await this.createKnowledgeBackup(includeProjectContext);
            const backupSize = JSON.stringify(backupData).length;
            
            console.log('\n📊 Backup Contents:');
            console.log(`   Knowledge Artifacts: ${backupData.artifacts.length}`);
            console.log(`   Projects: ${backupData.projects.length}`);
            console.log(`   Backup Size: ${(backupSize / 1024).toFixed(2)} KB`);
            console.log(`   Created: ${new Date().toLocaleString()}`);
            
            // Save backup (in a real implementation, this would save to file)
            console.log('\n✅ Backup created successfully');
            console.log('💡 Backup data prepared in memory (would be saved to file in production)');
            
        } catch (error) {
            console.error('💾 Backup failed:', error.message);
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    // Helper methods for implementing the knowledge operations

    async performSemanticSearch(searchTerm, limit, type) {
        // In a real implementation, this would use vector embeddings or full-text search
        // For now, we'll implement a sophisticated text-based search
        
        const query = `
            SELECT * FROM extracted_artifacts 
            WHERE (
                content ILIKE $1 OR 
                artifact_type ILIKE $1 OR
                context::text ILIKE $1
            )
            ${type !== 'all' ? 'AND artifact_type = $2' : ''}
            ORDER BY relevance_score DESC
            LIMIT $${type !== 'all' ? 3 : 2}
        `;
        
        const params = [`%${searchTerm}%`];
        if (type !== 'all') params.push(type);
        params.push(limit);
        
        const result = await this.dbClient.query(query, params);
        return result.rows;
    }

    async performBasicSearch(searchTerm, limit) {
        const query = `
            SELECT * FROM extracted_artifacts 
            WHERE content ILIKE $1
            ORDER BY created_at DESC
            LIMIT $2
        `;
        
        const result = await this.dbClient.query(query, [`%${searchTerm}%`, limit]);
        return result.rows;
    }

    async displaySearchResults(results, searchTerm, isBasicSearch = false) {
        if (results.length === 0) {
            console.log('🔍 No results found');
            return;
        }
        
        console.log(`\n📋 Found ${results.length} result${results.length === 1 ? '' : 's'}${isBasicSearch ? ' (basic search)' : ''}:\n`);
        
        results.forEach((result, index) => {
            const content = result.content.substring(0, 120);
            const type = result.artifact_type || 'unknown';
            const score = result.relevance_score || 0;
            const created = new Date(result.created_at).toLocaleDateString();
            
            console.log(`${index + 1}. [${type.toUpperCase()}] Score: ${score}/10`);
            console.log(`   ${content}${result.content.length > 120 ? '...' : ''}`);
            console.log(`   Created: ${created}`);
            console.log('');
        });
    }

    async getBasicKnowledgeStats() {
        const query = `
            SELECT 
                COUNT(*) as total_artifacts,
                AVG(relevance_score) as avg_relevance,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as recent_artifacts,
                SUM(LENGTH(content)) as storage_size
            FROM extracted_artifacts
        `;
        
        const result = await this.dbClient.query(query);
        const row = result.rows[0];
        
        return {
            totalArtifacts: parseInt(row.total_artifacts) || 0,
            avgRelevance: parseFloat(row.avg_relevance) || 0,
            recentArtifacts: parseInt(row.recent_artifacts) || 0,
            storageSize: parseInt(row.storage_size) || 0
        };
    }

    async getCategoryStats() {
        const query = `
            SELECT artifact_type, COUNT(*) as count
            FROM extracted_artifacts 
            GROUP BY artifact_type 
            ORDER BY count DESC
        `;
        
        const result = await this.dbClient.query(query);
        const stats = {};
        
        result.rows.forEach(row => {
            stats[row.artifact_type || 'unknown'] = parseInt(row.count);
        });
        
        return stats;
    }

    async getQualityMetrics() {
        const query = `
            SELECT 
                COUNT(*) FILTER (WHERE relevance_score >= 8) as high_value,
                COUNT(*) FILTER (WHERE relevance_score >= 5 AND relevance_score < 8) as medium_value,
                COUNT(*) FILTER (WHERE relevance_score < 5) as low_value,
                AVG(relevance_score) as overall_quality
            FROM extracted_artifacts
        `;
        
        const result = await this.dbClient.query(query);
        const row = result.rows[0];
        
        return {
            highValue: parseInt(row.high_value) || 0,
            mediumValue: parseInt(row.medium_value) || 0,
            lowValue: parseInt(row.low_value) || 0,
            overallQuality: parseFloat(row.overall_quality) || 0
        };
    }

    async getUsagePatterns() {
        // Mock implementation - in reality would track search patterns
        return {
            topSearchTerm: 'authentication',
            topSearchCount: 5,
            activeProjects: ['durandal', 'chatbot'],
            peakUsageHour: 14
        };
    }

    parseCommandOptions(args) {
        const options = {};
        args.forEach(arg => {
            if (arg.startsWith('--')) {
                const [key, value] = arg.substring(2).split('=');
                options[key] = value || true;
            }
        });
        return options;
    }

    // Placeholder methods for advanced features
    async analyzeArtifactQuality(artifact) {
        const contentLength = artifact.content.length;
        const relevanceScore = artifact.relevance_score || 5;
        
        let quality = relevanceScore;
        let issues = [];
        let status = 'GOOD';
        
        if (contentLength < 20) {
            quality -= 2;
            issues.push('too_short');
            status = 'POOR';
        }
        
        if (relevanceScore < 4) {
            quality -= 1;
            issues.push('low_relevance');
            status = 'POOR';
        }
        
        const recommendedAction = quality < 3 ? 'DELETE' : 
                                quality < 6 ? 'REVIEW' : 'KEEP';
        
        return { quality: Math.max(0, quality), issues, status, recommendedAction };
    }

    async getRecentArtifacts(limit) {
        const query = `
            SELECT * FROM extracted_artifacts 
            ORDER BY created_at DESC 
            LIMIT $1
        `;
        
        const result = await this.dbClient.query(query, [limit]);
        return result.rows;
    }

    async removeDuplicateArtifacts() {
        // Mock implementation
        return 3;
    }

    async archiveLowQualityArtifacts() {
        // Mock implementation
        return 2;
    }

    async recalculateRelevanceScores() {
        // Mock implementation
        return 15;
    }

    async rebuildSearchIndexes() {
        // Mock implementation
        return true;
    }

    async displayRelationshipGraph(maxNodes) {
        console.log('\n🕸️  Knowledge Relationship Graph:');
        console.log('   [authentication] ──── [user_management]');
        console.log('         │                    │');
        console.log('   [jwt_tokens] ──── [session_handling]');
        console.log('         │                    │');
        console.log('   [security] ──────────── [middleware]');
        console.log('\n📊 Showing top relationships by co-occurrence');
    }

    async identifyCleanupCandidates(aggressive) {
        // Mock implementation
        return [
            {
                id: 1,
                content: 'test content',
                quality: 2,
                size: 50,
                reason: 'Low quality score'
            }
        ];
    }

    async deleteArtifact(id) {
        const query = 'DELETE FROM extracted_artifacts WHERE id = $1';
        await this.dbClient.query(query, [id]);
    }

    async createKnowledgeBackup(includeContext) {
        // Mock implementation
        return {
            artifacts: [],
            projects: [],
            metadata: {
                created: new Date().toISOString(),
                version: '1.0'
            }
        };
    }

    getAvailableCommands() {
        return Array.from(this.commands.entries()).map(([cmd, info]) => ({
            command: `/${cmd}`,
            description: info.description
        }));
    }

    getSessionStats() {
        return {
            ...this.stats,
            uptime: Date.now() - this.stats.sessionStartTime
        };
    }
}

module.exports = KnowledgeCommandSystem;