/**
 * Advanced Search Interface - Natural Language Query Processing for Phase 4
 * Integrates semantic search, knowledge graph, and predictive suggestions
 * Clean, minimal implementation focusing on intelligent code discovery
 */

const SemanticCodeIndexing = require('./semantic-code-indexing');
const KnowledgeGraphSystem = require('./knowledge-graph-system');
const PredictiveFileSuggestions = require('./predictive-file-suggestions');

class AdvancedSearchInterface {
    constructor(options = {}) {
        this.workspaceRoot = options.workspaceRoot || process.cwd();
        // Use passed instances instead of creating new ones
        this.semanticIndexer = options.semanticIndexing || new SemanticCodeIndexing();
        this.knowledgeGraph = options.knowledgeGraph || new KnowledgeGraphSystem();
        this.predictiveEngine = options.predictiveFiles || new PredictiveFileSuggestions();
        
        // Natural language processing patterns
        this.queryPatterns = {
            // Intent classification patterns
            findFiles: /(?:find|search|locate|show me).*(?:files?|components?|modules?)/i,
            findFunctions: /(?:find|search|locate|show me).*(?:functions?|methods?)/i,
            findClasses: /(?:find|search|locate|show me).*(?:classes?|objects?|types?)/i,
            findSimilar: /(?:similar to|like|related to|comparable)/i,
            findUsage: /(?:where.*used|usage of|references to|calls to)/i,
            findDependencies: /(?:depends on|dependencies|imports|requires)/i,
            findPatterns: /(?:pattern|architecture|design|structure)/i,
            explainCode: /(?:explain|what does|how does|purpose)/i,
            findBugs: /(?:bugs?|errors?|issues?|problems?)/i,
            findTesting: /(?:tests?|testing|spec|coverage)/i
        };
        
        this.searchHistory = [];
        this.contextualMemory = new Map();
    }

    // Main search interface - natural language query processing
    async search(query, options = {}) {
        try {
            const startTime = Date.now();
            
            // Parse and classify the natural language query
            const parsedQuery = this.parseNaturalLanguage(query);
            
            // Get contextual suggestions from predictive engine
            const suggestions = await this.predictiveEngine.predictNextFiles(
                this.searchHistory.slice(-5), // Recent search context
                { includeConfidence: true }
            );
            
            // Execute multi-modal search
            const searchResults = await this.executeMultiModalSearch(parsedQuery, options);
            
            // Enhance results with knowledge graph insights
            const enhancedResults = await this.enhanceWithKnowledgeGraph(searchResults, parsedQuery);
            
            // Rank and filter results
            const rankedResults = this.rankSearchResults(enhancedResults, parsedQuery, suggestions);
            
            // Track search for learning
            this.trackSearch(query, parsedQuery, rankedResults);
            
            const searchTime = Date.now() - startTime;
            
            return {
                query: query,
                intent: parsedQuery.intent,
                results: rankedResults,
                suggestions: suggestions.slice(0, 5),
                metadata: {
                    searchTime,
                    resultCount: rankedResults.length,
                    confidence: this.calculateOverallConfidence(rankedResults),
                    queryComplexity: parsedQuery.complexity
                }
            };
            
        } catch (error) {
            throw new Error(`Advanced search failed: ${error.message}`);
        }
    }

    // Natural language query parsing and intent classification
    parseNaturalLanguage(query) {
        const queryLower = query.toLowerCase();
        const tokens = this.tokenizeQuery(query);
        
        // Classify intent based on patterns
        let intent = 'general';
        let confidence = 0.5;
        
        for (const [intentType, pattern] of Object.entries(this.queryPatterns)) {
            if (pattern.test(query)) {
                intent = intentType;
                confidence = 0.8;
                break;
            }
        }
        
        // Extract entities (file names, function names, technologies)
        const entities = this.extractEntities(tokens);
        
        // Extract filters (language, file type, date, etc.)
        const filters = this.extractFilters(queryLower);
        
        // Determine search scope
        const scope = this.determineScope(queryLower);
        
        return {
            original: query,
            intent,
            confidence,
            entities,
            filters,
            scope,
            tokens,
            complexity: this.calculateQueryComplexity(tokens, entities, filters)
        };
    }

    // Multi-modal search execution
    async executeMultiModalSearch(parsedQuery, options) {
        const results = [];
        
        // 1. Semantic similarity search
        if (parsedQuery.entities.codeTerms.length > 0) {
            const semanticResults = await this.semanticIndexer.searchSimilar(
                parsedQuery.entities.codeTerms.join(' '),
                { ...options, maxResults: 20 }
            );
            
            results.push(...semanticResults.map(r => ({
                ...r,
                searchType: 'semantic',
                relevanceScore: r.similarity
            })));
        }
        
        // 2. Knowledge graph traversal
        if (parsedQuery.intent === 'findSimilar' || parsedQuery.intent === 'findDependencies') {
            const graphResults = await this.searchKnowledgeGraph(parsedQuery);
            results.push(...graphResults);
        }
        
        // 3. Pattern-based code search
        if (parsedQuery.intent === 'findPatterns' || parsedQuery.intent === 'explainCode') {
            const patternResults = await this.searchPatterns(parsedQuery);
            results.push(...patternResults);
        }
        
        // 4. Traditional text search (fallback)
        if (results.length < 5) {
            const textResults = await this.performTextSearch(parsedQuery);
            results.push(...textResults);
        }
        
        return this.deduplicateResults(results);
    }

    // Knowledge graph integration for enhanced search
    async searchKnowledgeGraph(parsedQuery) {
        try {
            const graphResults = [];
            
            // Find relevant nodes in the knowledge graph
            for (const term of parsedQuery.entities.codeTerms) {
                const nodes = await this.knowledgeGraph.findNodes(term);
                
                for (const node of nodes) {
                    // Get relationships for context
                    const relationships = await this.knowledgeGraph.getNodeRelationships(node.id);
                    
                    graphResults.push({
                        filePath: node.filePath,
                        type: 'knowledge-graph',
                        nodeType: node.type,
                        relationships: relationships.map(r => ({
                            type: r.type,
                            target: r.targetNode.name,
                            weight: r.weight
                        })),
                        relevanceScore: node.importance || 0.5,
                        searchType: 'graph'
                    });
                }
            }
            
            return graphResults;
            
        } catch (error) {
            console.warn('Knowledge graph search failed:', error.message);
            return [];
        }
    }

    // Pattern-based code search for architectural queries
    async searchPatterns(parsedQuery) {
        const patterns = [];
        
        // Common architectural patterns
        const architecturalPatterns = {
            'mvc': /(?:model|view|controller).*(?:pattern|architecture)/i,
            'observer': /(?:observer|publish|subscribe|event)/i,
            'factory': /(?:factory|create|builder)/i,
            'singleton': /(?:singleton|instance|single)/i,
            'repository': /(?:repository|data.*access|crud)/i
        };
        
        for (const [patternName, regex] of Object.entries(architecturalPatterns)) {
            if (regex.test(parsedQuery.original)) {
                // Search for files that likely implement this pattern
                const patternFiles = await this.findPatternImplementations(patternName);
                patterns.push(...patternFiles.map(f => ({
                    ...f,
                    searchType: 'pattern',
                    patternType: patternName,
                    relevanceScore: 0.7
                })));
            }
        }
        
        return patterns;
    }

    // Enhanced result ranking with multiple signals
    rankSearchResults(results, parsedQuery, suggestions) {
        return results
            .map(result => {
                let score = result.relevanceScore || 0.5;
                
                // Boost score based on predictive suggestions
                const suggestionBoost = suggestions.find(s => 
                    s.filePath === result.filePath
                ) ? 0.2 : 0;
                
                // Boost recent files
                const recentBoost = this.isRecentlyAccessed(result.filePath) ? 0.15 : 0;
                
                // Intent-specific scoring
                const intentBoost = this.calculateIntentBoost(result, parsedQuery.intent);
                
                // File type relevance
                const fileTypeBoost = this.calculateFileTypeRelevance(result, parsedQuery.filters);
                
                const finalScore = Math.min(1.0, score + suggestionBoost + recentBoost + intentBoost + fileTypeBoost);
                
                return {
                    ...result,
                    finalScore,
                    scoreComponents: {
                        base: score,
                        suggestion: suggestionBoost,
                        recent: recentBoost,
                        intent: intentBoost,
                        fileType: fileTypeBoost
                    }
                };
            })
            .sort((a, b) => b.finalScore - a.finalScore)
            .slice(0, 50); // Limit results
    }

    // Visual search results formatting
    formatSearchResults(searchResponse) {
        const { query, intent, results, suggestions, metadata } = searchResponse;
        
        let output = `\n🔍 Advanced Search Results for: "${query}"\n`;
        output += `═`.repeat(60) + '\n';
        output += `Intent: ${intent} | Results: ${results.length} | Time: ${metadata.searchTime}ms\n\n`;
        
        // Top results
        if (results.length > 0) {
            output += `📁 **Top Results:**\n`;
            results.slice(0, 10).forEach((result, idx) => {
                output += `${idx + 1}. ${result.filePath} `;
                output += `(${result.searchType}) `;
                output += `[Score: ${(result.finalScore * 100).toFixed(0)}%]\n`;
                
                if (result.summary) {
                    output += `   ${result.summary}\n`;
                }
                
                if (result.relationships && result.relationships.length > 0) {
                    output += `   🔗 Related: ${result.relationships.slice(0, 3).map(r => r.target).join(', ')}\n`;
                }
                output += '\n';
            });
        }
        
        // Suggestions
        if (suggestions.length > 0) {
            output += `💡 **Smart Suggestions:**\n`;
            suggestions.forEach((suggestion, idx) => {
                output += `${idx + 1}. ${suggestion.filePath} `;
                output += `[Confidence: ${(suggestion.confidence * 100).toFixed(0)}%]\n`;
            });
            output += '\n';
        }
        
        // Search metadata
        output += `📊 **Search Insights:**\n`;
        output += `• Query complexity: ${metadata.queryComplexity}/10\n`;
        output += `• Result confidence: ${(metadata.confidence * 100).toFixed(0)}%\n`;
        output += `• Search modes used: ${this.getSearchModesUsed(results)}\n`;
        
        return output;
    }

    // Helper methods for query processing
    tokenizeQuery(query) {
        return query.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(token => token.length > 1);
    }

    extractEntities(tokens) {
        const entities = {
            codeTerms: [],
            fileTypes: [],
            technologies: [],
            functions: []
        };
        
        const techKeywords = ['javascript', 'python', 'react', 'node', 'express', 'sql', 'html', 'css'];
        const fileExtensions = ['.js', '.py', '.sql', '.html', '.css', '.json', '.md'];
        
        tokens.forEach(token => {
            if (techKeywords.includes(token)) {
                entities.technologies.push(token);
            } else if (fileExtensions.some(ext => token.includes(ext.slice(1)))) {
                entities.fileTypes.push(token);
            } else if (token.includes('function') || token.endsWith('()')) {
                entities.functions.push(token);
            } else if (token.length > 3) {
                entities.codeTerms.push(token);
            }
        });
        
        return entities;
    }

    extractFilters(queryLower) {
        const filters = {};
        
        // Language filters
        if (queryLower.includes('javascript') || queryLower.includes('js')) filters.language = 'javascript';
        if (queryLower.includes('python') || queryLower.includes('py')) filters.language = 'python';
        
        // File type filters  
        if (queryLower.includes('test')) filters.type = 'test';
        if (queryLower.includes('config')) filters.type = 'config';
        
        // Time filters
        if (queryLower.includes('recent') || queryLower.includes('new')) filters.timeframe = 'recent';
        
        return filters;
    }

    determineScope(queryLower) {
        if (queryLower.includes('project') || queryLower.includes('entire')) return 'project';
        if (queryLower.includes('directory') || queryLower.includes('folder')) return 'directory';
        return 'workspace';
    }

    calculateQueryComplexity(tokens, entities, filters) {
        let complexity = 1;
        complexity += tokens.length * 0.1;
        complexity += Object.values(entities).flat().length * 0.2;
        complexity += Object.keys(filters).length * 0.3;
        return Math.min(10, Math.round(complexity));
    }

    // Utility methods
    async performTextSearch(parsedQuery) {
        // Fallback text search implementation
        return [];
    }

    /**
     * Enhance search results with knowledge graph insights
     */
    async enhanceWithKnowledgeGraph(searchResults, parsedQuery) {
        try {
            if (!this.knowledgeGraph || !searchResults || searchResults.length === 0) {
                return searchResults;
            }

            const enhancedResults = [];
            
            for (const result of searchResults) {
                const enhanced = { ...result };
                
                // Try to find related nodes in the knowledge graph
                try {
                    const fileName = result.file || result.path || '';
                    if (fileName) {
                        const path = require('path');
                        const baseName = path.basename(fileName, path.extname(fileName));
                        const nodes = await this.knowledgeGraph.findNodes(baseName);
                        
                        if (nodes && nodes.length > 0) {
                            // Get relationships for the first matching node
                            const relationships = await this.knowledgeGraph.getNodeRelationships(nodes[0].id);
                            enhanced.knowledgeGraphContext = {
                                nodeId: nodes[0].id,
                                nodeType: nodes[0].type || 'file',
                                relationshipCount: relationships ? relationships.length : 0,
                                relatedFiles: relationships ? relationships.map(r => r.target).slice(0, 3) : []
                            };
                            
                            // Boost score if it has many relationships
                            if (relationships && relationships.length > 2) {
                                enhanced.finalScore = (enhanced.finalScore || enhanced.score || 0.5) * 1.2;
                            }
                        }
                    }
                } catch (error) {
                    // Continue without knowledge graph enhancement for this result
                }
                
                enhancedResults.push(enhanced);
            }
            
            return enhancedResults;
        } catch (error) {
            // If knowledge graph enhancement fails, return original results
            console.warn('Knowledge graph enhancement failed:', error.message);
            return searchResults;
        }
    }

    async findPatternImplementations(patternName) {
        // Pattern detection implementation
        return [];
    }

    deduplicateResults(results) {
        const seen = new Set();
        return results.filter(result => {
            const key = result.filePath || result.id;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    calculateIntentBoost(result, intent) {
        const intentBoosts = {
            'findFiles': result.searchType === 'semantic' ? 0.1 : 0,
            'findSimilar': result.searchType === 'graph' ? 0.15 : 0,
            'findPatterns': result.searchType === 'pattern' ? 0.2 : 0
        };
        return intentBoosts[intent] || 0;
    }

    calculateFileTypeRelevance(result, filters) {
        if (!filters.language || !result.filePath) return 0;
        
        const extension = result.filePath.split('.').pop();
        const languageMap = {
            'javascript': ['js', 'ts', 'jsx', 'tsx'],
            'python': ['py'],
            'sql': ['sql']
        };
        
        const relevantExtensions = languageMap[filters.language] || [];
        return relevantExtensions.includes(extension) ? 0.1 : 0;
    }

    isRecentlyAccessed(filePath) {
        return this.searchHistory.some(h => 
            h.results && h.results.some(r => r.filePath === filePath)
        );
    }

    calculateOverallConfidence(results) {
        if (results.length === 0) return 0;
        return results.reduce((sum, r) => sum + (r.finalScore || 0), 0) / results.length;
    }

    getSearchModesUsed(results) {
        const modes = [...new Set(results.map(r => r.searchType))];
        return modes.join(', ');
    }

    trackSearch(originalQuery, parsedQuery, results) {
        this.searchHistory.push({
            timestamp: Date.now(),
            query: originalQuery,
            intent: parsedQuery.intent,
            resultCount: results.length,
            results: results.slice(0, 5) // Store top 5 for learning
        });
        
        // Keep only recent history
        if (this.searchHistory.length > 100) {
            this.searchHistory.shift();
        }
    }

    // Advanced search interface methods
    async explainSearchResults(searchResponse) {
        const explanation = {
            queryAnalysis: {
                intent: searchResponse.intent,
                complexity: searchResponse.metadata.queryComplexity,
                entities: searchResponse.results[0]?.entities || {}
            },
            searchStrategy: this.explainSearchStrategy(searchResponse),
            resultQuality: this.assessResultQuality(searchResponse.results),
            recommendations: this.generateRecommendations(searchResponse)
        };
        
        return explanation;
    }

    explainSearchStrategy(searchResponse) {
        const modes = this.getSearchModesUsed(searchResponse.results).split(', ');
        return {
            primaryMode: modes[0] || 'text',
            fallbackModes: modes.slice(1),
            reasoning: this.getStrategyReasoning(searchResponse.intent, modes)
        };
    }

    getStrategyReasoning(intent, modes) {
        const strategies = {
            'findSimilar': 'Used semantic similarity and knowledge graph for contextual relationships',
            'findDependencies': 'Leveraged knowledge graph to trace code dependencies',
            'findPatterns': 'Applied architectural pattern recognition algorithms',
            'general': 'Combined multiple search modes for comprehensive coverage'
        };
        return strategies[intent] || strategies.general;
    }

    assessResultQuality(results) {
        const avgScore = results.reduce((sum, r) => sum + (r.finalScore || 0), 0) / results.length;
        
        return {
            averageRelevance: avgScore,
            quality: avgScore > 0.7 ? 'high' : avgScore > 0.4 ? 'medium' : 'low',
            diversity: this.calculateResultDiversity(results),
            coverage: Math.min(1, results.length / 10) // Optimal around 10 results
        };
    }

    calculateResultDiversity(results) {
        const types = [...new Set(results.map(r => r.searchType))];
        return types.length / 4; // Max 4 search types
    }

    generateRecommendations(searchResponse) {
        const recommendations = [];
        
        if (searchResponse.metadata.confidence < 0.5) {
            recommendations.push('Try more specific terms or include file extensions');
        }
        
        if (searchResponse.results.length < 3) {
            recommendations.push('Broaden your search or check spelling');
        }
        
        if (searchResponse.suggestions.length > 0) {
            recommendations.push('Consider the suggested files based on your usage patterns');
        }
        
        return recommendations;
    }
}

module.exports = AdvancedSearchInterface;