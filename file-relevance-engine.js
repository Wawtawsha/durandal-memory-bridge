const path = require('path');

class FileRelevanceEngine {
    constructor(filesystemManager) {
        this.filesystemManager = filesystemManager;
        this.indexer = filesystemManager.indexer;
        this.classifier = filesystemManager.classifier;
        
        // Query analysis patterns
        this.queryPatterns = {
            // Explicit file references (include common compound file names)
            fileReference: /\b[a-zA-Z0-9_.-]+\.(js|py|json|md|txt|html|css|yml|yaml|sql|sh|bat|env)\b/gi,
            functionReference: /function\s+(\w+)|(\w+)\s*\(.*\)|def\s+(\w+)/gi,
            classReference: /class\s+(\w+)|new\s+(\w+)|(\w+)\.prototype/gi,
            
            // Intent patterns (with word boundaries to prevent false matches)
            configIntent: /\b(config|settings|setup|environment|\.env)\b/gi,
            documentationIntent: /\b(readme|docs|documentation|help|guide)\b/gi,
            testIntent: /\b(test|spec|testing|unit\s*test|integration)\b/gi,
            errorIntent: /\b(error|bug|fix|debug|issue|problem)\b/gi,
            implementationIntent: /\b(implement|create|add|build|develop)\b/gi,
            
            // Technical terms
            databaseIntent: /\b(database|db|sql|postgres|sqlite|mysql)\b/gi,
            apiIntent: /\b(api|endpoint|route|server|express)\b/gi,
            uiIntent: /ui|interface|component|react|vue|html|css/gi,
            authIntent: /auth|login|user|session|token|jwt/gi,
        };
        
        // Conversation context tracking
        this.conversationHistory = [];
        this.recentlyAccessedFiles = new Map(); // filePath -> { accessTime, frequency }
        this.userPreferences = {
            preferredFileTypes: new Set(['js', 'py', 'md']),
            importanceThreshold: 5,
            maxContextFiles: 8
        };
        
        console.log('🎯 FileRelevanceEngine initialized');
    }

    async analyzeQuery(userQuery, conversationHistory = []) {
        const analysis = {
            query: userQuery.toLowerCase(),
            originalQuery: userQuery,
            explicitFiles: [],
            functions: [],
            classes: [],
            intents: [],
            technicalTerms: [],
            keywords: [],
            confidence: 0,
            conversationContext: this.analyzeConversationContext(conversationHistory),
            recentlyMentionedFiles: this.extractRecentlyMentionedFiles(conversationHistory),
            queryType: 'unknown'
        };

        // Extract explicit file references
        const fileMatches = userQuery.match(this.queryPatterns.fileReference) || [];
        analysis.explicitFiles = [...new Set(fileMatches.map(f => f.toLowerCase()))];

        // Extract function references (enhanced with common function terms)
        const functionMatches = userQuery.match(this.queryPatterns.functionReference) || [];
        analysis.functions = functionMatches.map(match => {
            const parts = match.match(/(\w+)/g);
            return parts ? parts[parts.length - 1] : null;
        }).filter(Boolean);
        
        // Also extract common function-related words that might be mentioned
        const functionTerms = /\b(authenticate|authentication|verify|verification|validate|validation|connect|connection|register|registration|login|logout|authorize|encrypt|decrypt|hash|save|load|create|update|delete|get|set|fetch|send|receive)\b/gi;
        const termMatches = userQuery.match(functionTerms) || [];
        termMatches.forEach(term => {
            // Convert to likely function names
            const normalized = term.toLowerCase();
            if (normalized === 'authentication') {
                analysis.functions.push('authenticate');
            } else if (normalized === 'verification') {
                analysis.functions.push('verify');
            } else if (normalized === 'validation') {
                analysis.functions.push('validate');
            } else if (normalized === 'connection') {
                analysis.functions.push('connect');
            } else if (normalized === 'registration') {
                analysis.functions.push('register');
            } else {
                // For words like 'authenticate', 'verify', etc. add them directly
                analysis.functions.push(normalized);
            }
        });
        
        // Remove duplicates
        analysis.functions = [...new Set(analysis.functions)];

        // Extract class references
        const classMatches = userQuery.match(this.queryPatterns.classReference) || [];
        analysis.classes = classMatches.map(match => {
            const parts = match.match(/(\w+)/g);
            return parts ? parts[parts.length - 1] : null;
        }).filter(Boolean);

        // Identify intents
        for (const [intent, pattern] of Object.entries(this.queryPatterns)) {
            if (intent.endsWith('Intent')) {
                // Reset regex state to avoid issues with global flag
                pattern.lastIndex = 0;
                if (pattern.test(userQuery)) {
                    analysis.intents.push(intent.replace('Intent', ''));
                }
                // Reset again after test
                pattern.lastIndex = 0;
            }
        }

        // Extract keywords (simple word extraction)
        analysis.keywords = this.extractKeywords(userQuery);

        // Determine query type for better relevance scoring
        analysis.queryType = this.determineQueryType(analysis);
        
        // Calculate confidence based on explicit references
        analysis.confidence = this.calculateAnalysisConfidence(analysis);

        return analysis;
    }

    extractKeywords(text) {
        // Simple keyword extraction
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2)
            .filter(word => !this.isStopWord(word));
        
        return [...new Set(words)];
    }

    isStopWord(word) {
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
            'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
            'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that',
            'these', 'those', 'what', 'where', 'when', 'why', 'how', 'which'
        ]);
        return stopWords.has(word);
    }

    analyzeConversationContext(conversationHistory) {
        const recentMessages = conversationHistory.slice(-5); // Last 5 messages
        const context = {
            topics: new Set(),
            mentionedFiles: new Set(),
            codeElements: new Set(),
            errors: [],
            tasks: []
        };

        for (const message of recentMessages) {
            if (message && typeof message.content === 'string') {
                const content = message.content.toLowerCase();
                
                // Extract topics from message content
                const words = content.split(/\s+/).filter(w => w.length > 3);
                words.forEach(word => context.topics.add(word));
                
                // Look for error indicators
                if (/error|fail|bug|issue|problem|exception/.test(content)) {
                    context.errors.push(content.substring(0, 100));
                }
                
                // Look for task indicators
                if (/implement|create|add|fix|update|modify|change/.test(content)) {
                    context.tasks.push(content.substring(0, 100));
                }
                
                // Extract file mentions (improved pattern to catch full filenames including dots and special files like .env)
                const fileMatches = content.match(/\b[a-zA-Z0-9_.-]+\.(js|py|json|md|txt|html|css|yml|yaml|sql|sh|bat|env)\b/gi) || [];
                fileMatches.forEach(file => context.mentionedFiles.add(file.toLowerCase()));
                
                // Also check for special files like .env, .gitignore, etc.
                const specialFileMatches = content.match(/(?:^|\s)(\.[a-zA-Z][a-zA-Z0-9_.-]*)(?:\s|$)/gi) || [];
                specialFileMatches.forEach(match => {
                    // Extract the actual filename from the match (remove whitespace)
                    const file = match.trim();
                    if (/\.(env|gitignore|dockerignore|npmrc|babelrc|eslintrc)/.test(file)) {
                        context.mentionedFiles.add(file.toLowerCase());
                    }
                });
                
                // Extract code elements (functions, methods, classes)
                const codePatterns = [
                    /\b([A-Z][a-zA-Z0-9_]*)\.(authenticate|verify|validate|connect|login|logout|register|create|add|update|delete|get|set|save|load)\b/gi, // ClassName.method
                    /\b(authenticate|verify|validate|connect|login|logout|register|create|add|update|delete|get|set|save|load|routes|endpoints|API)\s*[\(\s]/gi, // function calls with parentheses
                    /\b(endpoints|routes|API|database|connection|middleware|controller|service|model|schema|query|transaction)\b/gi, // code-related terms without parentheses
                    /\b(jwt|token|auth|user|session|cookie|hash|encrypt|decrypt|UserService)\b/gi, // common code terms
                    /\bclass\s+([A-Z][a-zA-Z0-9_]*)/gi, // class definitions
                    /\bfunction\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi, // function definitions
                    /\b(mock|test|spec|assert|expect|describe|it)\b/gi // testing terms
                ];
                
                for (const pattern of codePatterns) {
                    const matches = content.match(pattern) || [];
                    matches.forEach(match => {
                        let cleaned = match.replace(/\b(class|function)\s+/gi, '').replace(/\s*[\(\s].*$/g, '');
                        // Remove dots for class.method patterns, keep the method name
                        if (cleaned.includes('.')) {
                            const parts = cleaned.split('.');
                            cleaned = parts[parts.length - 1]; // Get the method name
                        }
                        if (cleaned.length > 2 && !/^(the|and|or|in|on|at|is|was|are|were|be|been|have|has|had|do|does|did|will|would|should|could|can|may|might)$/i.test(cleaned)) {
                            context.codeElements.add(cleaned.toLowerCase());
                        }
                    });
                }
            }
        }

        return {
            topics: Array.from(context.topics).slice(0, 20),
            mentionedFiles: Array.from(context.mentionedFiles),
            codeElements: Array.from(context.codeElements).slice(0, 15),
            errors: context.errors,
            tasks: context.tasks,
            hasErrors: context.errors.length > 0,
            hasTasks: context.tasks.length > 0
        };
    }

    extractRecentlyMentionedFiles(conversationHistory) {
        const recentFiles = new Map(); // filename -> { mentions: count, lastMention: index }
        
        conversationHistory.slice(-10).forEach((message, index) => {
            if (message && typeof message.content === 'string') {
                const fileMatches = message.content.match(/\b[a-zA-Z0-9_.-]+\.(js|py|json|md|txt|html|css|yml|yaml|sql|sh|bat|env)\b/gi) || [];
                // Also check for special files like .env
                const specialFileMatches = message.content.match(/(?:^|\s)(\.[a-zA-Z][a-zA-Z0-9_.-]*)(?:\s|$)/gi) || [];
                // Process regular file matches
                fileMatches.forEach(file => {
                    const filename = file.toLowerCase();
                    const existing = recentFiles.get(filename) || { mentions: 0, lastMention: -1 };
                    recentFiles.set(filename, {
                        mentions: existing.mentions + 1,
                        lastMention: index
                    });
                });
                
                // Process special file matches
                specialFileMatches.forEach(match => {
                    const file = match.trim();
                    if (/\.(env|gitignore|dockerignore|npmrc|babelrc|eslintrc)/.test(file)) {
                        const filename = file.toLowerCase();
                        const existing = recentFiles.get(filename) || { mentions: 0, lastMention: -1 };
                        recentFiles.set(filename, {
                            mentions: existing.mentions + 1,
                            lastMention: index
                        });
                    }
                });
            }
        });
        
        return Array.from(recentFiles.entries())
            .sort((a, b) => b[1].lastMention - a[1].lastMention)
            .slice(0, 5)
            .map(([filename, data]) => ({ filename, ...data }));
    }

    determineQueryType(analysis) {
        // Check for ambiguous/vague queries first (should be general regardless of specific terms)
        const ambiguousStarters = ['show me', 'tell me about', 'what is', 'how is', 'where is', 'help me with'];
        const queryLower = analysis.originalQuery.toLowerCase();
        const isAmbiguous = ambiguousStarters.some(starter => queryLower.startsWith(starter));
        
        // If ambiguous query and only has technical terms (no clear action), classify as general
        if (isAmbiguous && !analysis.keywords.some(k => ['create', 'add', 'implement', 'build', 'update', 'fix', 'debug', 'test'].includes(k))) {
            return 'general';
        }
        
        // Intent-based queries (check first, more specific)
        if (analysis.intents.includes('test')) return 'testing';
        if (analysis.intents.includes('config')) return 'configuration';
        if (analysis.intents.includes('documentation')) return 'documentation';
        if (analysis.intents.includes('error')) return 'debugging';
        
        // Check for mixed intents - testing takes priority over implementation  
        if (analysis.intents.includes('implementation') && 
            analysis.keywords.some(k => ['test', 'spec', 'testing', 'tests'].includes(k))) {
            return 'testing';
        }
        if (analysis.intents.includes('implementation')) return 'development';
        
        // Keyword-based queries (higher priority than file mentions)
        if (analysis.keywords.some(k => ['bug', 'error', 'fix', 'debug'].includes(k))) return 'debugging';
        if (analysis.keywords.some(k => ['test', 'spec', 'testing', 'tests'].includes(k))) return 'testing';
        if (analysis.keywords.some(k => ['create', 'add', 'implement', 'build'].includes(k)) && 
            !analysis.keywords.some(k => ['test', 'spec', 'testing', 'tests'].includes(k))) return 'development';
        if (analysis.keywords.some(k => ['config', 'configuration', 'setup', 'dependencies', 'versions'].includes(k))) return 'configuration';
        if (analysis.keywords.some(k => ['update', 'upgrade', 'change', 'modify'].includes(k)) && 
            analysis.explicitFiles.some(f => ['package.json', '.env', 'config', 'yml', 'yaml'].some(c => f.includes(c)))) {
            return 'configuration';
        }
        
        // Check for configuration file references
        if (analysis.explicitFiles.some(f => ['package.json', '.env', 'config.', 'tsconfig.'].some(c => f.includes(c)))) {
            return 'configuration';
        }
        
        // Code-related queries
        if (analysis.functions.length > 0 || analysis.classes.length > 0) return 'code_specific';
        
        // Explicit file operations (lower priority, more general)
        if (analysis.explicitFiles.length > 0) return 'file_specific';
        
        return 'general';
    }

    calculateAnalysisConfidence(analysis) {
        let confidence = 0;
        
        // High confidence for explicit file references
        if (analysis.explicitFiles.length > 0) confidence += 0.8;
        
        // Medium confidence for function/class references
        if (analysis.functions.length > 0) confidence += 0.6;
        if (analysis.classes.length > 0) confidence += 0.6;
        
        // Boost confidence for recently mentioned files
        if (analysis.recentlyMentionedFiles.length > 0) confidence += 0.5;
        
        // Lower confidence for intents and keywords
        if (analysis.intents.length > 0) confidence += 0.4;
        if (analysis.keywords.length > 3) confidence += 0.3;
        
        // Conversation context boosts confidence
        if (analysis.conversationContext.hasErrors) confidence += 0.3;
        if (analysis.conversationContext.hasTasks) confidence += 0.2;
        
        return Math.min(1.0, confidence);
    }
    
    getZeroScores() {
        return {
            explicitMatch: 0,
            contentMatch: 0,
            intentMatch: 0,
            structureMatch: 0,
            recentActivity: 0,
            userPreference: 0,
            importance: 0,
            conversationRelevance: 0,
            queryTypeMatch: 0,
            temporalRelevance: 0,
            total: 0
        };
    }

    async scoreFiles(queryAnalysis, conversationHistory = [], options = {}) {
        const {
            maxResults = 10,
            minImportance = 3,
            includeRecent = true,
            boostAccessedFiles = true
        } = options;

        const fileScores = new Map(); // filePath -> score details
        
        // Get all indexed files
        const allFiles = Array.from(this.indexer.index.files.values());
        
        for (const fileInfo of allFiles) {
            if (fileInfo.importance < minImportance) continue;
            
            const score = await this.calculateFileRelevanceScore(
                fileInfo, 
                queryAnalysis, 
                conversationHistory,
                { includeRecent, boostAccessedFiles }
            );
            
            if (score.total > 0) {
                fileScores.set(fileInfo.path, {
                    file: fileInfo,
                    ...score,
                    relativePath: path.relative(this.filesystemManager.projectRoot, fileInfo.path)
                });
            }
        }

        // Sort by total score and return top results
        const sortedResults = Array.from(fileScores.values())
            .sort((a, b) => b.total - a.total)
            .slice(0, maxResults);

        return {
            queryAnalysis,
            results: sortedResults,
            totalCandidates: fileScores.size,
            averageScore: sortedResults.length > 0 
                ? sortedResults.reduce((sum, r) => sum + r.total, 0) / sortedResults.length 
                : 0
        };
    }

    async calculateFileRelevanceScore(fileInfo, queryAnalysis, conversationHistory, options = {}) {
        // Handle invalid inputs gracefully
        if (!fileInfo) {
            console.warn('🎯 FileRelevanceEngine: Invalid fileInfo provided, returning zero scores');
            return this.getZeroScores();
        }
        
        if (!queryAnalysis || typeof queryAnalysis !== 'object') {
            console.warn('🎯 FileRelevanceEngine: Invalid queryAnalysis provided, using defaults');
            queryAnalysis = {
                query: '',
                keywords: [],
                explicitFiles: [],
                functions: [],
                classes: [],
                intents: [],
                queryType: 'general',
                conversationContext: { topics: [], codeElements: [], hasErrors: false },
                recentlyMentionedFiles: []
            };
        }
        
        const scores = {
            explicitMatch: 0,
            contentMatch: 0,
            intentMatch: 0,
            structureMatch: 0,
            recentActivity: 0,
            userPreference: 0,
            importance: 0,
            conversationRelevance: 0,
            queryTypeMatch: 0,
            temporalRelevance: 0,
            total: 0
        };

        // 1. Explicit file name matches (highest priority)
        scores.explicitMatch = this.calculateExplicitMatch(fileInfo, queryAnalysis);

        // 2. Content-based matching
        scores.contentMatch = this.calculateContentMatch(fileInfo, queryAnalysis);

        // 3. Intent-based matching
        scores.intentMatch = this.calculateIntentMatch(fileInfo, queryAnalysis);

        // 4. Code structure matching (functions, classes)
        scores.structureMatch = this.calculateStructureMatch(fileInfo, queryAnalysis);

        // 5. Recent activity boost
        if (options.includeRecent) {
            scores.recentActivity = this.calculateRecentActivityScore(fileInfo);
        }

        // 6. User preference matching
        scores.userPreference = this.calculateUserPreferenceScore(fileInfo);

        // 7. Base importance score
        scores.importance = fileInfo.importance * 0.1;

        // 8. Recently accessed files boost
        if (options.boostAccessedFiles) {
            scores.recentActivity += this.calculateAccessFrequencyBoost(fileInfo.path);
        }
        
        // 9. Conversation context relevance
        scores.conversationRelevance = this.calculateConversationRelevance(fileInfo, queryAnalysis);
        
        // 10. Query type specific matching
        scores.queryTypeMatch = this.calculateQueryTypeMatch(fileInfo, queryAnalysis);
        
        // 11. Temporal relevance (file mentioned recently vs file modified recently)
        scores.temporalRelevance = this.calculateTemporalRelevance(fileInfo, queryAnalysis);

        try {
            // Calculate total weighted score with enhanced conversation awareness
            scores.total = (
                scores.explicitMatch * 3.0 +           // Explicit matches are most important
                scores.contentMatch * 2.0 +            // Content matches are very important
                scores.conversationRelevance * 2.5 +   // Conversation relevance is very important
                scores.structureMatch * 1.8 +          // Structure matches are quite important
                scores.intentMatch * 1.5 +             // Intent matches are important
                scores.queryTypeMatch * 1.4 +          // Query type matching is important
                scores.temporalRelevance * 1.3 +       // Temporal relevance matters
                scores.recentActivity * 1.2 +          // Recent activity is moderately important
                scores.userPreference * 0.8 +          // User preferences matter
                scores.importance * 1.0                // Base importance
            );
        } catch (calculationError) {
            console.warn('🎯 FileRelevanceEngine: Error in score calculation, using fallback:', calculationError.message);
            scores.total = scores.importance || 0;
        }

        return scores;
    }

    calculateExplicitMatch(fileInfo, queryAnalysis) {
        let score = 0;
        
        // Check for exact file name matches
        for (const explicitFile of queryAnalysis.explicitFiles) {
            if (fileInfo.fileName.toLowerCase().includes(explicitFile)) {
                score += 10; // Very high score for explicit matches
            }
            if (fileInfo.relativePath.toLowerCase().includes(explicitFile)) {
                score += 8;
            }
        }
        
        return Math.min(score, 15); // Cap the score
    }

    calculateContentMatch(fileInfo, queryAnalysis) {
        let score = 0;
        
        if (!fileInfo.words || fileInfo.words.size === 0) return 0;
        
        // Check keyword matches in file content
        for (const keyword of queryAnalysis.keywords) {
            if (fileInfo.words.has(keyword)) {
                score += 2;
            }
        }
        
        // Check for partial keyword matches
        const fileWords = Array.from(fileInfo.words);
        for (const keyword of queryAnalysis.keywords) {
            const partialMatches = fileWords.filter(word => 
                word.includes(keyword) || keyword.includes(word)
            );
            score += partialMatches.length * 0.5;
        }
        
        return Math.min(score, 20);
    }

    calculateIntentMatch(fileInfo, queryAnalysis) {
        let score = 0;
        
        for (const intent of queryAnalysis.intents) {
            switch (intent) {
                case 'config':
                    if (fileInfo.category === 'config' || 
                        fileInfo.fileName.includes('config') ||
                        fileInfo.extension === '.env') {
                        score += 5;
                    }
                    break;
                    
                case 'documentation':
                    if (fileInfo.category === 'docs' || 
                        fileInfo.language === 'markdown' ||
                        fileInfo.fileName.toLowerCase().includes('readme')) {
                        score += 5;
                    }
                    break;
                    
                case 'test':
                    if (fileInfo.features?.includes('test_file') ||
                        fileInfo.fileName.includes('test') ||
                        fileInfo.fileName.includes('spec')) {
                        score += 4;
                    }
                    break;
                    
                case 'database':
                    if (fileInfo.language === 'sql' ||
                        fileInfo.fileName.includes('db') ||
                        fileInfo.words?.has('database') ||
                        fileInfo.words?.has('query')) {
                        score += 4;
                    }
                    break;
                    
                case 'api':
                    if (fileInfo.features?.includes('express_server') ||
                        fileInfo.words?.has('router') ||
                        fileInfo.words?.has('endpoint') ||
                        fileInfo.fileName.includes('api')) {
                        score += 4;
                    }
                    break;
                    
                case 'ui':
                    if (fileInfo.language === 'html' ||
                        fileInfo.language === 'css' ||
                        fileInfo.features?.includes('react_component')) {
                        score += 4;
                    }
                    break;
            }
        }
        
        return Math.min(score, 15);
    }

    calculateStructureMatch(fileInfo, queryAnalysis) {
        let score = 0;
        
        // Check for function matches
        if (fileInfo.functions) {
            for (const func of fileInfo.functions) {
                for (const queryFunc of queryAnalysis.functions) {
                    if (func.name && func.name.toLowerCase().includes(queryFunc.toLowerCase())) {
                        score += 6;
                    }
                }
            }
        }
        
        // Check for class matches
        if (fileInfo.classes) {
            for (const cls of fileInfo.classes) {
                for (const queryCls of queryAnalysis.classes) {
                    if (cls.name && cls.name.toLowerCase().includes(queryCls.toLowerCase())) {
                        score += 6;
                    }
                }
            }
        }
        
        return Math.min(score, 18);
    }

    calculateRecentActivityScore(fileInfo) {
        if (!fileInfo.modified) return 0;
        
        const now = Date.now();
        const modifiedTime = new Date(fileInfo.modified).getTime();
        const daysSinceModified = (now - modifiedTime) / (1000 * 60 * 60 * 24);
        
        if (daysSinceModified < 1) return 3;      // Very recent
        if (daysSinceModified < 3) return 2;      // Recent
        if (daysSinceModified < 7) return 1;      // Somewhat recent
        return 0;
    }

    calculateUserPreferenceScore(fileInfo) {
        let score = 0;
        
        // Preferred file types
        const extension = fileInfo.extension?.substring(1); // Remove the dot
        if (this.userPreferences.preferredFileTypes.has(extension)) {
            score += 2;
        }
        
        // High importance files
        if (fileInfo.importance >= this.userPreferences.importanceThreshold + 2) {
            score += 1;
        }
        
        return score;
    }

    calculateAccessFrequencyBoost(filePath) {
        const accessInfo = this.recentlyAccessedFiles.get(filePath);
        if (!accessInfo) return 0;
        
        const now = Date.now();
        const hoursSinceAccess = (now - accessInfo.accessTime) / (1000 * 60 * 60);
        
        if (hoursSinceAccess < 1) return accessInfo.frequency * 2;
        if (hoursSinceAccess < 6) return accessInfo.frequency * 1.5;
        if (hoursSinceAccess < 24) return accessInfo.frequency;
        return accessInfo.frequency * 0.5;
    }

    // Track file access for learning user patterns
    trackFileAccess(filePath) {
        const now = Date.now();
        const existing = this.recentlyAccessedFiles.get(filePath);
        
        if (existing) {
            existing.accessTime = now;
            existing.frequency += 1;
        } else {
            this.recentlyAccessedFiles.set(filePath, {
                accessTime: now,
                frequency: 1
            });
        }
        
        // Cleanup old entries (older than 7 days)
        const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
        for (const [path, info] of this.recentlyAccessedFiles) {
            if (info.accessTime < weekAgo) {
                this.recentlyAccessedFiles.delete(path);
            }
        }
    }

    // Update user preferences based on usage patterns
    updateUserPreferences(fileTypes, importanceLevel) {
        if (fileTypes) {
            fileTypes.forEach(type => {
                this.userPreferences.preferredFileTypes.add(type);
            });
        }
        
        if (importanceLevel) {
            this.userPreferences.importanceThreshold = importanceLevel;
        }
    }

    // Get relevance explanation for debugging
    explainRelevance(fileInfo, queryAnalysis) {
        const score = this.calculateFileRelevanceScore(fileInfo, queryAnalysis, []);
        
        return {
            file: fileInfo.relativePath || fileInfo.fileName,
            totalScore: score.total,
            breakdown: {
                explicitMatch: `${score.explicitMatch} (file name matches)`,
                contentMatch: `${score.contentMatch} (content keywords)`,
                intentMatch: `${score.intentMatch} (intent matching)`,
                structureMatch: `${score.structureMatch} (functions/classes)`,
                recentActivity: `${score.recentActivity} (recent changes)`,
                userPreference: `${score.userPreference} (user preferences)`,
                importance: `${score.importance} (base importance)`
            },
            reasoning: this.generateReasoningText(fileInfo, queryAnalysis, score)
        };
    }

    calculateConversationRelevance(fileInfo, queryAnalysis) {
        let score = 0;
        const context = queryAnalysis.conversationContext;
        
        // Check if file was recently mentioned in conversation
        for (const recentFile of queryAnalysis.recentlyMentionedFiles) {
            if (fileInfo.fileName.toLowerCase().includes(recentFile.filename) ||
                recentFile.filename.includes(fileInfo.fileName.toLowerCase())) {
                score += 8 + (recentFile.mentions * 2); // High score for mentioned files
            }
        }
        
        // Check if file content relates to conversation topics
        if (fileInfo.words && Array.isArray(context.topics)) {
            for (const topic of context.topics) {
                if (fileInfo.words.has(topic)) {
                    score += 1;
                }
            }
        }
        
        // Check if file contains code elements mentioned in conversation
        if (fileInfo.functions && Array.isArray(context.codeElements)) {
            for (const func of fileInfo.functions) {
                if (func.name && context.codeElements.includes(func.name.toLowerCase())) {
                    score += 4;
                }
            }
        }
        
        if (fileInfo.classes && Array.isArray(context.codeElements)) {
            for (const cls of fileInfo.classes) {
                if (cls.name && context.codeElements.includes(cls.name.toLowerCase())) {
                    score += 4;
                }
            }
        }
        
        // Boost files that might help with errors mentioned in conversation
        if (context.hasErrors && (
            fileInfo.category === 'code' ||
            fileInfo.fileName.includes('test') ||
            fileInfo.fileName.includes('debug') ||
            fileInfo.features?.includes('has_debug_output')
        )) {
            score += 3;
        }
        
        return Math.min(score, 20);
    }
    
    calculateQueryTypeMatch(fileInfo, queryAnalysis) {
        let score = 0;
        
        switch (queryAnalysis.queryType) {
            case 'file_specific':
                // Already handled by explicit match
                break;
                
            case 'code_specific':
                if (fileInfo.category === 'code' && 
                    (fileInfo.functions?.length > 0 || fileInfo.classes?.length > 0)) {
                    score += 4;
                }
                break;
                
            case 'testing':
                if (fileInfo.features?.includes('test_file') ||
                    fileInfo.fileName.includes('test') ||
                    fileInfo.fileName.includes('spec')) {
                    score += 6;
                }
                break;
                
            case 'configuration':
                if (fileInfo.category === 'config' || 
                    fileInfo.extension === '.env' ||
                    fileInfo.fileName.includes('config')) {
                    score += 6;
                }
                break;
                
            case 'documentation':
                if (fileInfo.category === 'docs' ||
                    fileInfo.language === 'markdown' ||
                    fileInfo.fileName.toLowerCase().includes('readme')) {
                    score += 6;
                }
                break;
                
            case 'debugging':
                if (fileInfo.features?.includes('has_debug_output') ||
                    fileInfo.features?.includes('has_todos') ||
                    fileInfo.fileName.includes('debug') ||
                    fileInfo.category === 'code') {
                    score += 4;
                }
                break;
                
            case 'development':
                if (fileInfo.category === 'code' && fileInfo.importance >= 6) {
                    score += 3;
                }
                break;
        }
        
        return score;
    }
    
    calculateTemporalRelevance(fileInfo, queryAnalysis) {
        let score = 0;
        
        // Files mentioned recently in conversation get higher temporal relevance
        const recentMention = queryAnalysis.recentlyMentionedFiles.find(rf => 
            fileInfo.fileName.toLowerCase().includes(rf.filename) ||
            rf.filename.includes(fileInfo.fileName.toLowerCase())
        );
        
        if (recentMention) {
            score += 6 - recentMention.lastMention; // More recent = higher score
        }
        
        // Recently modified files (already calculated but enhanced here)
        if (fileInfo.modified) {
            const now = Date.now();
            const modifiedTime = new Date(fileInfo.modified).getTime();
            const hoursSinceModified = (now - modifiedTime) / (1000 * 60 * 60);
            
            if (hoursSinceModified < 2) score += 3;
            else if (hoursSinceModified < 8) score += 2;
            else if (hoursSinceModified < 24) score += 1;
        }
        
        return score;
    }

    generateReasoningText(fileInfo, queryAnalysis, scores) {
        const reasons = [];
        
        if (scores.explicitMatch > 5) {
            reasons.push("File name explicitly mentioned in query");
        }
        if (scores.conversationRelevance > 5) {
            reasons.push("Recently discussed in conversation");
        }
        if (scores.contentMatch > 5) {
            reasons.push("High keyword overlap with query content");
        }
        if (scores.queryTypeMatch > 4) {
            reasons.push(`Matches ${queryAnalysis.queryType} query type`);
        }
        if (scores.intentMatch > 3) {
            reasons.push("Matches query intent (config/docs/test/etc.)");
        }
        if (scores.structureMatch > 3) {
            reasons.push("Contains mentioned functions or classes");
        }
        if (scores.temporalRelevance > 2) {
            reasons.push("Recent activity or mention");
        }
        if (scores.recentActivity > 1) {
            reasons.push("Recently modified file");
        }
        if (fileInfo.importance >= 8) {
            reasons.push("High importance file in project");
        }
        
        return reasons.length > 0 ? reasons.join("; ") : "General relevance based on content analysis";
    }

    // Debug methods
    getStats() {
        return {
            recentlyAccessedFiles: this.recentlyAccessedFiles.size,
            userPreferences: {
                preferredFileTypes: Array.from(this.userPreferences.preferredFileTypes),
                importanceThreshold: this.userPreferences.importanceThreshold,
                maxContextFiles: this.userPreferences.maxContextFiles
            },
            totalIndexedFiles: this.indexer.index.files.size
        };
    }
}

module.exports = FileRelevanceEngine;