/**
 * Durandal Knowledge Analyzer
 * Automatically extracts valuable knowledge from conversation content
 * Phase 2, Feature 1: Enhanced Knowledge Extraction
 */

class KnowledgeAnalyzer {
    constructor() {
        this.extractionPatterns = this.initializePatterns();
        this.scoringFactors = this.initializeScoringFactors();
        this.technicalTerms = this.initializeTechnicalTerms();
        this.minExtractableLength = 50; // Minimum content length for extraction
        this.extractionThreshold = 5;   // Minimum score for auto-extraction
    }

    /**
     * Main analysis method - determines if content should be extracted
     * @param {string} content - The content to analyze
     * @param {string} userInput - The user's original question/input
     * @returns {Object} Analysis result with extraction recommendation
     */
    analyzeContent(content, userInput = '') {
        try {
            // Skip if content too short
            if (!content || content.length < this.minExtractableLength) {
                return {
                    shouldExtract: false,
                    reason: 'content_too_short',
                    score: 0,
                    confidence: 0,
                    categories: [],
                    tags: [],
                    patterns: [],
                    extractionType: 'none',
                    suggestedTitle: 'No content to analyze'
                };
            }

            // Perform comprehensive analysis with error handling
            const patternAnalysis = this.analyzePatterns(content);
            const contentScore = this.calculateContentScore(content, userInput);
            const categories = this.identifyCategories(content, patternAnalysis);
            const tags = this.generateTags(content, patternAnalysis, userInput);
            const confidence = this.calculateConfidence(patternAnalysis, contentScore);

            const shouldExtract = contentScore >= this.extractionThreshold;

            return {
                shouldExtract,
                score: contentScore,
                confidence,
                categories: categories || [],
                tags: tags || [],
                patterns: patternAnalysis.matchedPatterns || [],
                extractionType: this.determineExtractionType(patternAnalysis),
                suggestedTitle: this.generateTitle(content, patternAnalysis, userInput),
                reason: shouldExtract ? 'meets_extraction_criteria' : 'below_threshold'
            };
        } catch (error) {
            console.error('Error in knowledge analysis:', error.message);
            return {
                shouldExtract: false,
                reason: 'analysis_error',
                score: 0,
                confidence: 0,
                categories: [],
                tags: [],
                patterns: [],
                extractionType: 'error',
                suggestedTitle: 'Analysis failed',
                error: error.message
            };
        }
    }

    /**
     * Analyze file content for semantic understanding and categorization
     * @param {string} filePath - The path to the file
     * @param {string} fileContent - The content of the file
     * @param {Object} fileStats - File statistics (size, modified time, etc.)
     * @returns {Object} Comprehensive file analysis result
     */
    analyzeFile(filePath, fileContent, fileStats = {}) {
        try {
            if (!filePath || !fileContent) {
                return {
                    shouldExtract: false,
                    reason: 'missing_file_data',
                    score: 0,
                    confidence: 0,
                    fileType: 'unknown',
                    categories: [],
                    tags: [],
                    patterns: [],
                    semanticSummary: 'No content to analyze',
                    importance: 'low',
                    relationships: [],
                    codeStructure: null
                };
            }

            // Perform comprehensive file analysis
            const fileType = this.determineFileType(filePath, fileContent);
            const patternAnalysis = this.analyzePatterns(fileContent);
            const contentScore = this.calculateFileContentScore(fileContent, filePath);
            const categories = this.identifyFileCategories(fileContent, filePath, patternAnalysis);
            const tags = this.generateFileTags(fileContent, filePath, patternAnalysis);
            const confidence = this.calculateConfidence(patternAnalysis, contentScore);
            const semanticSummary = this.generateSemanticSummary(fileContent, filePath, fileType);
            const importance = this.assessFileImportance(fileContent, filePath, fileStats);
            const relationships = this.detectFileRelationships(fileContent, filePath);
            const codeStructure = this.analyzeCodeStructure(fileContent, fileType);

            const shouldExtract = contentScore >= this.extractionThreshold || importance === 'high';

            return {
                shouldExtract,
                score: contentScore,
                confidence,
                fileType,
                categories: categories || [],
                tags: tags || [],
                patterns: patternAnalysis.matchedPatterns || [],
                semanticSummary,
                importance,
                relationships: relationships || [],
                codeStructure,
                reason: shouldExtract ? 'meets_file_extraction_criteria' : 'below_threshold',
                filePath,
                fileStats
            };
        } catch (error) {
            console.error('Error in file analysis:', error.message);
            return {
                shouldExtract: false,
                reason: 'file_analysis_error',
                score: 0,
                confidence: 0,
                fileType: 'error',
                categories: [],
                tags: [],
                patterns: [],
                semanticSummary: 'Analysis failed',
                importance: 'low',
                relationships: [],
                codeStructure: null,
                error: error.message,
                filePath
            };
        }
    }

    /**
     * Determine file type from path and content analysis
     */
    determineFileType(filePath, content) {
        const extension = filePath.split('.').pop()?.toLowerCase();
        const baseName = filePath.split('/').pop()?.toLowerCase();

        // Special files
        if (baseName === 'readme.md' || baseName === 'readme') return 'documentation';
        if (baseName === 'package.json') return 'package_config';
        if (baseName === 'dockerfile') return 'container_config';
        if (baseName === 'makefile') return 'build_script';
        if (baseName?.startsWith('.env')) return 'environment_config';

        // By extension
        const typeMap = {
            'js': 'javascript',
            'jsx': 'react_component',
            'ts': 'typescript', 
            'tsx': 'typescript_react',
            'py': 'python',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'cs': 'csharp',
            'php': 'php',
            'rb': 'ruby',
            'go': 'golang',
            'rs': 'rust',
            'html': 'html_template',
            'css': 'stylesheet',
            'scss': 'sass_stylesheet',
            'sass': 'sass_stylesheet',
            'less': 'less_stylesheet',
            'json': 'json_data',
            'xml': 'xml_data',
            'yaml': 'yaml_config',
            'yml': 'yaml_config',
            'toml': 'toml_config',
            'ini': 'ini_config',
            'md': 'markdown_doc',
            'sql': 'database_schema',
            'sh': 'shell_script',
            'bash': 'bash_script',
            'test.js': 'test_file',
            'spec.js': 'test_file'
        };

        // Content-based detection for ambiguous cases
        if (!typeMap[extension]) {
            if (content.includes('#!/bin/bash') || content.includes('#!/bin/sh')) return 'shell_script';
            if (content.includes('CREATE TABLE') || content.includes('SELECT')) return 'database_schema';
            if (content.includes('describe(') || content.includes('it(')) return 'test_file';
            if (content.includes('<html') || content.includes('<!DOCTYPE')) return 'html_template';
            if (content.includes('app.get') || content.includes('router.')) return 'api_route';
        }

        return typeMap[extension] || 'unknown';
    }

    /**
     * Calculate file-specific content score
     */
    calculateFileContentScore(content, filePath) {
        let score = this.calculateContentScore(content, ''); // Use existing scoring as base

        // File-specific bonuses
        const fileType = this.determineFileType(filePath, content);

        // Important file types get higher scores
        if (['package_config', 'environment_config', 'database_schema', 'api_route'].includes(fileType)) {
            score += 3;
        }

        // Configuration files are valuable
        if (fileType.includes('config') || fileType.includes('schema')) {
            score += 2;
        }

        // Documentation gets moderate boost
        if (fileType === 'documentation' || fileType === 'markdown_doc') {
            score += 1;
        }

        // Test files are moderately important
        if (fileType === 'test_file') {
            score += 1;
        }

        // Size-based scoring (larger files often contain more logic)
        if (content.length > 1000) score += 1;
        if (content.length > 5000) score += 1;
        if (content.length > 10000) score += 1;

        return Math.round(score * 10) / 10;
    }

    /**
     * Identify file-specific categories
     */
    identifyFileCategories(content, filePath, patternAnalysis) {
        const categories = this.identifyCategories(content, patternAnalysis);
        const fileType = this.determineFileType(filePath, content);

        // Add file type as category
        categories.push(fileType);

        // Add semantic categories based on file structure
        if (filePath.includes('/models/')) categories.push('data_model');
        if (filePath.includes('/controllers/')) categories.push('controller');
        if (filePath.includes('/services/')) categories.push('service');
        if (filePath.includes('/utils/') || filePath.includes('/helpers/')) categories.push('utility');
        if (filePath.includes('/components/')) categories.push('component');
        if (filePath.includes('/pages/')) categories.push('page');
        if (filePath.includes('/api/')) categories.push('api');
        if (filePath.includes('/test/') || filePath.includes('/__tests__/')) categories.push('test');
        if (filePath.includes('/docs/')) categories.push('documentation');
        if (filePath.includes('/config/')) categories.push('configuration');

        return [...new Set(categories)]; // Remove duplicates
    }

    /**
     * Generate file-specific tags
     */
    generateFileTags(content, filePath, patternAnalysis) {
        const tags = this.generateTags(content, patternAnalysis, '');
        
        // Add file-specific tags
        const fileType = this.determineFileType(filePath, content);
        tags.push(fileType);
        tags.push('file_content');

        // Add directory-based tags
        const pathParts = filePath.split('/');
        pathParts.forEach(part => {
            if (part && part.length > 2 && !part.includes('.')) {
                tags.push(part);
            }
        });

        return [...new Set(tags)].slice(0, 15); // Remove duplicates, limit tags
    }

    /**
     * Generate semantic summary of file content
     */
    generateSemanticSummary(content, filePath, fileType) {
        const fileName = filePath.split('/').pop();
        const lines = content.split('\n').length;
        const chars = content.length;

        // Extract key information based on file type
        let keyInfo = '';
        
        if (fileType === 'javascript' || fileType === 'typescript') {
            const functions = (content.match(/function\s+\w+/g) || []).length;
            const classes = (content.match(/class\s+\w+/g) || []).length;
            const exports = (content.match(/export\s+(default\s+)?\w+/g) || []).length;
            keyInfo = `${functions} functions, ${classes} classes, ${exports} exports`;
        } else if (fileType === 'database_schema') {
            const tables = (content.match(/CREATE\s+TABLE/gi) || []).length;
            const inserts = (content.match(/INSERT\s+INTO/gi) || []).length;
            keyInfo = `${tables} tables, ${inserts} inserts`;
        } else if (fileType === 'json_data') {
            try {
                const json = JSON.parse(content);
                const keys = Object.keys(json).length;
                keyInfo = `${keys} top-level properties`;
            } catch (e) {
                keyInfo = 'Invalid JSON structure';
            }
        }

        return `${fileName} (${fileType}): ${lines} lines, ${chars} chars. ${keyInfo}`.trim();
    }

    /**
     * Assess file importance for prioritization
     */
    assessFileImportance(content, filePath, fileStats) {
        let importance = 'low';
        const fileName = filePath.split('/').pop()?.toLowerCase();

        // Critical files
        if (['package.json', 'dockerfile', 'makefile', 'readme.md', '.env'].includes(fileName)) {
            importance = 'high';
        }

        // Main entry points
        if (['index.js', 'main.js', 'app.js', 'server.js'].includes(fileName)) {
            importance = 'high';
        }

        // Configuration files
        if (fileName?.includes('config') || filePath.includes('/config/')) {
            importance = 'medium';
        }

        // Large files often contain important logic
        if (content.length > 10000) {
            importance = importance === 'low' ? 'medium' : 'high';
        }

        // Recently modified files may be more relevant
        if (fileStats.mtime && (Date.now() - fileStats.mtime) < 86400000) { // 24 hours
            importance = importance === 'low' ? 'medium' : importance;
        }

        return importance;
    }

    /**
     * Detect relationships with other files
     */
    detectFileRelationships(content, filePath) {
        const relationships = [];

        // Import/require relationships
        const imports = content.match(/(import.*from ['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g) || [];
        imports.forEach(imp => {
            const match = imp.match(/['"]([^'"]+)['"]/);
            if (match) {
                relationships.push({
                    type: 'imports',
                    target: match[1],
                    strength: 'high'
                });
            }
        });

        // API endpoint references
        const apiCalls = content.match(/(fetch\(['"]([^'"]+)['"]|axios\.(get|post|put|delete)\(['"]([^'"]+)['"])/g) || [];
        apiCalls.forEach(call => {
            const match = call.match(/['"]([^'"]+)['"]/);
            if (match) {
                relationships.push({
                    type: 'api_call',
                    target: match[1],
                    strength: 'medium'
                });
            }
        });

        // File references in comments or strings
        const fileRefs = content.match(/['"`]([^'"`]*\.(js|ts|json|md|sql|py|java|cpp))['"]/g) || [];
        fileRefs.forEach(ref => {
            const match = ref.match(/['"`]([^'"`]+)['"]/);
            if (match) {
                relationships.push({
                    type: 'references',
                    target: match[1],
                    strength: 'low'
                });
            }
        });

        return relationships;
    }

    /**
     * Analyze code structure (functions, classes, etc.)
     */
    analyzeCodeStructure(content, fileType) {
        if (!['javascript', 'typescript', 'python', 'java'].includes(fileType)) {
            return null;
        }

        const structure = {
            functions: [],
            classes: [],
            constants: [],
            exports: [],
            complexity: 'low'
        };

        // Extract functions
        const functionMatches = content.match(/(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>)/g) || [];
        functionMatches.forEach(match => {
            const name = match.match(/\w+/)?.[0];
            if (name) structure.functions.push(name);
        });

        // Extract classes
        const classMatches = content.match(/class\s+(\w+)/g) || [];
        classMatches.forEach(match => {
            const name = match.match(/class\s+(\w+)/)?.[1];
            if (name) structure.classes.push(name);
        });

        // Extract constants
        const constMatches = content.match(/const\s+([A-Z_]+)\s*=/g) || [];
        constMatches.forEach(match => {
            const name = match.match(/const\s+([A-Z_]+)/)?.[1];
            if (name) structure.constants.push(name);
        });

        // Extract exports
        const exportMatches = content.match(/export\s+(?:default\s+)?(?:class\s+(\w+)|function\s+(\w+)|const\s+(\w+))/g) || [];
        exportMatches.forEach(match => {
            const name = match.match(/\w+$/)?.[0];
            if (name) structure.exports.push(name);
        });

        // Assess complexity
        const cyclomaticFactors = [
            (content.match(/if\s*\(/g) || []).length,
            (content.match(/for\s*\(/g) || []).length,
            (content.match(/while\s*\(/g) || []).length,
            (content.match(/switch\s*\(/g) || []).length,
            (content.match(/catch\s*\(/g) || []).length
        ].reduce((sum, count) => sum + count, 0);

        if (cyclomaticFactors > 20) structure.complexity = 'high';
        else if (cyclomaticFactors > 10) structure.complexity = 'medium';

        return structure;
    }

    /**
     * Initialize extraction patterns for different types of knowledge
     */
    initializePatterns() {
        return {
            solutions: {
                patterns: [
                    /here's how to (fix|solve|implement|create|set up|configure)/i,
                    /the solution is/i,
                    /you can (fix|solve|resolve) this by/i,
                    /to (fix|solve|resolve) this/i,
                    /here's the (fix|solution|approach)/i,
                    /try (this|these) steps/i
                ],
                weight: 3,
                category: 'solution'
            },
            explanations: {
                patterns: [
                    /let me explain/i,
                    /the reason (why|this works) is/i,
                    /this (works|happens) because/i,
                    /the key (concept|insight|point) is/i,
                    /to understand this/i,
                    /essentially,/i,
                    /in other words/i
                ],
                weight: 2,
                category: 'explanation'
            },
            recommendations: {
                patterns: [
                    /i recommend/i,
                    /best practice is/i,
                    /you should (use|consider|implement|choose)/i,
                    /it's better to/i,
                    /i suggest/i,
                    /consider using/i,
                    /the recommended (approach|way|method) is/i
                ],
                weight: 2,
                category: 'recommendation'
            },
            configurations: {
                patterns: [
                    /set (this|that|the) to/i,
                    /configure.*by/i,
                    /add (this|these|the following) (to|in)/i,
                    /modify.*file/i,
                    /in your (.*\.json|.*\.js|.*\.env|.*\.conf)/i,
                    /update your/i,
                    /install.*package/i
                ],
                weight: 3,
                category: 'configuration'
            },
            procedures: {
                patterns: [
                    /step \d+/i,
                    /first,.*second/i,
                    /follow these steps/i,
                    /here's the process/i,
                    /\d+\.\s/,  // Numbered lists
                    /^\s*[-*]\s/m  // Bullet points
                ],
                weight: 2,
                category: 'procedure'
            },
            code_examples: {
                patterns: [
                    /```[\s\S]*?```/,  // Code blocks
                    /`[^`]+`/,  // Inline code
                    /function\s+\w+/i,
                    /const\s+\w+\s*=/,
                    /npm install/i,
                    /import.*from/i
                ],
                weight: 3,
                category: 'code'
            },
            errors_debugging: {
                patterns: [
                    /error.*fix/i,
                    /debugging/i,
                    /troubleshoot/i,
                    /the issue is/i,
                    /this (error|problem) (occurs|happens)/i,
                    /to debug this/i
                ],
                weight: 3,
                category: 'debugging'
            },
            important_notes: {
                patterns: [
                    /important:?/i,
                    /note:?/i,
                    /warning:?/i,
                    /remember (that|to)/i,
                    /keep in mind/i,
                    /be careful/i,
                    /make sure/i
                ],
                weight: 2,
                category: 'important_note'
            },
            // FILE ANALYSIS PATTERNS - New for semantic file analysis
            file_architecture: {
                patterns: [
                    /class\s+\w+/,
                    /interface\s+\w+/,
                    /function\s+\w+/,
                    /const\s+\w+\s*=/,
                    /export\s+(default\s+)?(class|function|const)/,
                    /module\.exports\s*=/,
                    /import.*from/,
                    /require\(['"]/
                ],
                weight: 3,
                category: 'code_architecture'
            },
            file_configuration: {
                patterns: [
                    /\.env/,
                    /config|settings/,
                    /\.json$/,
                    /\.yaml$|\.yml$/,
                    /\.toml$/,
                    /\.ini$/,
                    /package\.json/,
                    /webpack\.config/,
                    /babel\.config/
                ],
                weight: 2,
                category: 'configuration_file'
            },
            file_documentation: {
                patterns: [
                    /README/i,
                    /\.md$/,
                    /docs?\//,
                    /\/\*\*[\s\S]*?\*\//,  // JSDoc comments
                    /^\s*#\s+/m,  // Markdown headers
                    /^\s*##\s+/m,
                    /^\s*###\s+/m
                ],
                weight: 2,
                category: 'documentation'
            },
            file_database_schema: {
                patterns: [
                    /CREATE\s+TABLE/i,
                    /ALTER\s+TABLE/i,
                    /INSERT\s+INTO/i,
                    /SELECT.*FROM/i,
                    /\.sql$/,
                    /schema/i,
                    /migration/i,
                    /database/i
                ],
                weight: 3,
                category: 'database_schema'
            },
            file_api_definitions: {
                patterns: [
                    /app\.(get|post|put|delete|patch)/,
                    /router\.(get|post|put|delete|patch)/,
                    /express\(\)/,
                    /endpoint|route/i,
                    /@app\./,
                    /api\//,
                    /\/api\//,
                    /REST|GraphQL/i
                ],
                weight: 3,
                category: 'api_definition'
            },
            file_tests: {
                patterns: [
                    /test|spec/i,
                    /\.test\./,
                    /\.spec\./,
                    /describe\(/,
                    /it\(/,
                    /expect\(/,
                    /assert/,
                    /jest|mocha|jasmine/i
                ],
                weight: 2,
                category: 'test_file'
            },
            file_styles: {
                patterns: [
                    /\.css$/,
                    /\.scss$/,
                    /\.sass$/,
                    /\.less$/,
                    /\.styl$/,
                    /style|theme|design/i,
                    /color|font|layout/i
                ],
                weight: 1,
                category: 'stylesheet'
            },
            file_build_tools: {
                patterns: [
                    /webpack|rollup|vite|parcel/i,
                    /grunt|gulp/i,
                    /Makefile/,
                    /Dockerfile/,
                    /\.yml$|\.yaml$/,
                    /build|deploy|ci|cd/i,
                    /pipeline/i
                ],
                weight: 2,
                category: 'build_tool'
            }
        };
    }

    /**
     * Initialize scoring factors for content quality assessment
     */
    initializeScoringFactors() {
        return {
            codeBlocks: 3,           // Contains code examples
            lengthBonus: 1,          // Substantial content (>150 words)
            technicalTerms: 2,       // Contains technical vocabulary  
            actionableSteps: 2,      // Contains numbered steps or procedures
            specificSolution: 3,     // Addresses specific problem
            errorResolution: 2,      // Fixes a specific error
            multipleOptions: 1,      // Presents alternatives
            bestPractices: 2,        // Contains best practices
            configuration: 2,        // Configuration/setup information
            newInformation: 1,       // Novel or custom information
            questionContext: 1       // Relates to user's question
        };
    }

    /**
     * Initialize technical terms for domain recognition
     */
    initializeTechnicalTerms() {
        return [
            // Programming
            'javascript', 'nodejs', 'npm', 'package.json', 'api', 'function', 'variable',
            'array', 'object', 'class', 'method', 'async', 'await', 'promise', 'callback',
            
            // Database
            'postgresql', 'database', 'table', 'query', 'sql', 'index', 'schema',
            'transaction', 'connection', 'pool', 'migration',
            
            // Development Tools
            'git', 'github', 'vscode', 'terminal', 'command', 'shell', 'bash',
            'docker', 'container', 'deployment', 'server', 'ubuntu',
            
            // Web/API
            'http', 'https', 'rest', 'json', 'xml', 'cors', 'authentication',
            'token', 'session', 'cookie', 'header', 'request', 'response',
            
            // AI/ML
            'claude', 'api', 'model', 'prompt', 'context', 'token', 'completion',
            'embedding', 'training', 'inference',
            
            // General Tech
            'configuration', 'environment', 'variable', 'parameter', 'argument',
            'dependency', 'module', 'library', 'framework', 'package',
            
            // File Types & Extensions
            'javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'php', 'ruby',
            'html', 'css', 'scss', 'sass', 'json', 'xml', 'yaml', 'toml', 'ini',
            'markdown', 'readme', 'dockerfile', 'makefile', 'gitignore',
            
            // Development Concepts
            'component', 'service', 'controller', 'middleware', 'repository', 'model',
            'view', 'template', 'schema', 'migration', 'seed', 'fixture',
            'test', 'unit', 'integration', 'e2e', 'mock', 'stub', 'spy',
            
            // Architecture Patterns  
            'mvc', 'mvp', 'mvvm', 'microservice', 'monolith', 'serverless',
            'event-driven', 'pub-sub', 'observer', 'singleton', 'factory',
            'builder', 'adapter', 'decorator', 'facade', 'proxy'
        ];
    }

    /**
     * Analyze content for extraction patterns
     */
    analyzePatterns(content) {
        try {
            const matchedPatterns = [];
            let totalWeight = 0;

            // Ensure extractionPatterns is properly initialized
            if (!this.extractionPatterns || typeof this.extractionPatterns !== 'object') {
                console.error('Extraction patterns not properly initialized');
                return {
                    matchedPatterns: [],
                    totalWeight: 0,
                    patternCount: 0
                };
            }

            for (const [patternType, patternData] of Object.entries(this.extractionPatterns)) {
                try {
                    if (!patternData || !Array.isArray(patternData.patterns)) {
                        continue;
                    }

                    for (const pattern of patternData.patterns) {
                        if (pattern && pattern.test && pattern.test(content)) {
                            matchedPatterns.push({
                                type: patternType,
                                pattern: pattern.source,
                                weight: patternData.weight || 1,
                                category: patternData.category || 'general'
                            });
                            totalWeight += (patternData.weight || 1);
                            break; // Only count each pattern type once
                        }
                    }
                } catch (patternError) {
                    console.error(`Error testing pattern ${patternType}:`, patternError.message);
                    continue;
                }
            }

            return {
                matchedPatterns,
                totalWeight,
                patternCount: matchedPatterns.length
            };
        } catch (error) {
            console.error('Error in pattern analysis:', error.message);
            return {
                matchedPatterns: [],
                totalWeight: 0,
                patternCount: 0
            };
        }
    }

    /**
     * Calculate comprehensive content score
     */
    calculateContentScore(content, userInput) {
        let score = 0;
        const factors = this.scoringFactors;

        // Code blocks bonus
        if (/```[\s\S]*?```/.test(content) || /`[^`]+`/.test(content)) {
            score += factors.codeBlocks;
        }

        // Length bonus for substantial content
        if (content.length > 150) {
            score += factors.lengthBonus;
        }

        // Technical terms bonus
        const technicalTermCount = this.countTechnicalTerms(content);
        if (technicalTermCount > 0) {
            score += Math.min(technicalTermCount, 3) * factors.technicalTerms;
        }

        // Actionable steps (numbered lists, procedures)
        if (/\d+\.\s/.test(content) || /step \d+/i.test(content)) {
            score += factors.actionableSteps;
        }

        // Specific solution indicators
        if (/solution|fix|resolve|solve/i.test(content)) {
            score += factors.specificSolution;
        }

        // Error resolution
        if (/error.*fix|debug|troubleshoot/i.test(content)) {
            score += factors.errorResolution;
        }

        // Multiple options presented
        if (/option|alternative|either.*or|choose between/i.test(content)) {
            score += factors.multipleOptions;
        }

        // Best practices
        if (/best practice|recommend|should use/i.test(content)) {
            score += factors.bestPractices;
        }

        // Configuration information
        if (/configure|setup|install|set.*to/i.test(content)) {
            score += factors.configuration;
        }

        // Question context relevance
        if (userInput && this.isRelevantToQuestion(content, userInput)) {
            score += factors.questionContext;
        }

        return Math.round(score * 10) / 10; // Round to 1 decimal place
    }

    /**
     * Count technical terms in content
     */
    countTechnicalTerms(content) {
        const lowerContent = content.toLowerCase();
        return this.technicalTerms.filter(term => 
            lowerContent.includes(term.toLowerCase())
        ).length;
    }

    /**
     * Check if content is relevant to user's question
     */
    isRelevantToQuestion(content, userInput) {
        const contentWords = content.toLowerCase().split(/\W+/);
        const questionWords = userInput.toLowerCase().split(/\W+/)
            .filter(word => word.length > 3); // Filter out short words

        const relevantWords = questionWords.filter(word => 
            contentWords.some(cWord => cWord.includes(word) || word.includes(cWord))
        );

        return relevantWords.length >= Math.min(2, questionWords.length);
    }

    /**
     * Identify content categories
     */
    identifyCategories(content, patternAnalysis) {
        try {
            const categories = new Set();
            
            // Add categories from matched patterns
            if (patternAnalysis && Array.isArray(patternAnalysis.matchedPatterns)) {
                patternAnalysis.matchedPatterns.forEach(match => {
                    if (match && match.category) {
                        categories.add(match.category);
                    }
                });
            }

            // Add implicit categories based on content analysis
            if (content) {
                // Check for code blocks
                if (/```[\s\S]*?```/.test(content)) {
                    categories.add('code');
                }
                
                // Check for solution patterns (enhance this check)
                if (/here's.*(?:function|solution|how to|fix|approach)/i.test(content) ||
                    /the.*(?:function|solution|way|method).*(?:is|you need)/i.test(content)) {
                    categories.add('solution');
                }
                
                if (/error|fix|debug|troubleshoot/i.test(content)) {
                    categories.add('debugging');
                }
                
                if (/install|setup|configure/i.test(content)) {
                    categories.add('setup');
                }
            }

            return Array.from(categories);
        } catch (error) {
            console.error('Error identifying categories:', error.message);
            return [];
        }
    }

    /**
     * Generate relevant tags
     */
    generateTags(content, patternAnalysis, userInput) {
        try {
            const tags = new Set();

            // Add pattern-based tags
            if (patternAnalysis && Array.isArray(patternAnalysis.matchedPatterns)) {
                patternAnalysis.matchedPatterns.forEach(match => {
                    if (match && match.type) {
                        tags.add(match.type);
                    }
                });
            }

            // Add technical term tags
            if (content && Array.isArray(this.technicalTerms)) {
                this.technicalTerms.forEach(term => {
                    if (content.toLowerCase().includes(term.toLowerCase())) {
                        tags.add(term);
                    }
                });
            }

            // Add context tags from user input
            if (userInput && typeof userInput === 'string') {
                const inputWords = userInput.toLowerCase().split(/\W+/)
                    .filter(word => word.length > 4);
                inputWords.forEach(word => {
                    if (this.technicalTerms && this.technicalTerms.some(term => 
                        term.toLowerCase().includes(word) || word.includes(term.toLowerCase())
                    )) {
                        tags.add(word);
                    }
                });
            }

            // Add automatic tags
            tags.add('auto_extracted');
            tags.add('durandal_knowledge');

            return Array.from(tags).slice(0, 10); // Limit to 10 most relevant tags
        } catch (error) {
            console.error('Error generating tags:', error.message);
            return ['auto_extracted', 'durandal_knowledge'];
        }
    }

    /**
     * Calculate confidence score (0-1)
     */
    calculateConfidence(patternAnalysis, contentScore) {
        // Base confidence on pattern matches and content score
        const patternConfidence = Math.min(patternAnalysis.totalWeight / 10, 1);
        const scoreConfidence = Math.min(contentScore / 15, 1);
        
        // Weight pattern matching more heavily
        const confidence = (patternConfidence * 0.7) + (scoreConfidence * 0.3);
        
        return Math.round(confidence * 100) / 100; // Round to 2 decimal places
    }

    /**
     * Determine the type of extraction
     */
    determineExtractionType(patternAnalysis) {
        const categoryCount = {};
        
        patternAnalysis.matchedPatterns.forEach(match => {
            categoryCount[match.category] = (categoryCount[match.category] || 0) + 1;
        });

        // Return the most common category
        let maxCategory = 'general';
        let maxCount = 0;
        
        for (const [category, count] of Object.entries(categoryCount)) {
            if (count > maxCount) {
                maxCount = count;
                maxCategory = category;
            }
        }

        return maxCategory;
    }

    /**
     * Generate a descriptive title for the extracted knowledge
     */
    generateTitle(content, patternAnalysis, userInput) {
        // Try to extract a natural title from content structure
        
        // Look for explicit titles or headers
        const headerMatch = content.match(/^#+ (.+)$/m);
        if (headerMatch) {
            return headerMatch[1].trim();
        }

        // Look for solution patterns
        const solutionMatch = content.match(/(?:solution|fix|approach)(?:\s+is)?:?\s*(.+?)(?:\.|$)/i);
        if (solutionMatch) {
            return `Solution: ${solutionMatch[1].trim().substring(0, 50)}`;
        }

        // Generate based on primary extraction type
        const primaryType = this.determineExtractionType(patternAnalysis);
        
        // Use user input context if available
        if (userInput && userInput.length < 100) {
            return `${primaryType}: ${userInput.replace(/[?!.]+$/, '')}`;
        }

        // Extract first meaningful sentence
        const sentences = content.split(/[.!?]+/);
        for (const sentence of sentences) {
            const trimmed = sentence.trim();
            if (trimmed.length > 20 && trimmed.length < 100) {
                return `${primaryType}: ${trimmed}`;
            }
        }

        // Fallback: use primary type with timestamp
        const timestamp = new Date().toLocaleString();
        return `${primaryType}: Extracted knowledge (${timestamp})`;
    }

    /**
     * Analyze a conversation message for knowledge extraction potential
     * @param {Object} message - Message object with role, content, timestamp
     * @returns {Object} Analysis result with extraction patterns and suggestions
     */
    async analyzeConversationMessage(message) {
        try {
            if (!message || !message.content) {
                return {
                    patterns: [],
                    shouldExtract: false,
                    reason: 'no_content',
                    score: 0,
                    confidence: 0,
                    categories: [],
                    tags: [],
                    extractionType: 'none',
                    suggestedTitle: 'No content to analyze'
                };
            }

            // Use the existing content analysis method
            const analysis = this.analyzeContent(message.content, '');
            
            // Add conversation-specific analysis
            const conversationContext = {
                role: message.role,
                timestamp: message.timestamp,
                isUserMessage: message.role === 'user',
                isAssistantMessage: message.role === 'assistant'
            };

            // Assistant messages are generally more valuable for extraction
            if (message.role === 'assistant') {
                analysis.score += 1;
                analysis.confidence = Math.min(analysis.confidence + 0.1, 1.0);
            }

            // Add conversation-specific tags
            analysis.tags = analysis.tags || [];
            analysis.tags.push('conversation');
            analysis.tags.push(message.role || 'unknown_role');
            
            // Add timestamp-based tags if available
            if (message.timestamp) {
                const date = new Date(message.timestamp);
                analysis.tags.push(date.toISOString().split('T')[0]); // YYYY-MM-DD format
            }

            // Return enhanced analysis with conversation context
            return {
                ...analysis,
                conversationContext,
                patterns: analysis.patterns || [],
                messageId: message.messageId || null,
                timestamp: message.timestamp || new Date().toISOString()
            };

        } catch (error) {
            console.error('Error in conversation message analysis:', error.message);
            return {
                patterns: [],
                shouldExtract: false,
                reason: 'analysis_error',
                score: 0,
                confidence: 0,
                categories: [],
                tags: ['conversation', 'error'],
                extractionType: 'error',
                suggestedTitle: 'Analysis failed',
                error: error.message,
                conversationContext: {
                    role: message?.role || 'unknown',
                    timestamp: message?.timestamp || new Date().toISOString(),
                    isUserMessage: false,
                    isAssistantMessage: false
                }
            };
        }
    }

    /**
     * Universal analyze method for compatibility with universal memory system
     * @param {string} content - Content to analyze
     * @param {string} projectId - Project identifier
     * @returns {Object} Analysis result with artifacts array
     */
    async analyze(content, projectId = null) {
        try {
            const analysis = this.analyzeContent(content, '');
            
            // Convert to expected format for universal memory system
            return {
                artifacts: analysis.shouldExtract ? [{
                    type: analysis.extractionType || 'knowledge',
                    title: analysis.suggestedTitle || 'Extracted Knowledge',
                    content: content,
                    score: analysis.score || 0,
                    confidence: analysis.confidence || 0,
                    tags: analysis.tags || [],
                    categories: analysis.categories || [],
                    patterns: analysis.patterns || [],
                    metadata: {
                        projectId,
                        extractedAt: new Date().toISOString(),
                        analyzer: 'durandal_knowledge_analyzer'
                    }
                }] : [],
                score: analysis.score || 0,
                shouldExtract: analysis.shouldExtract || false,
                extractionCount: analysis.shouldExtract ? 1 : 0
            };
        } catch (error) {
            console.error('Error in universal analyze method:', error.message);
            return {
                artifacts: [],
                score: 0,
                shouldExtract: false,
                extractionCount: 0,
                error: error.message
            };
        }
    }

    /**
     * Configure extraction settings
     */
    updateSettings(settings) {
        if (settings.minLength !== undefined) {
            this.minExtractableLength = settings.minLength;
        }
        if (settings.threshold !== undefined) {
            this.extractionThreshold = settings.threshold;
        }
        // Add more configurable settings as needed
    }

    /**
     * Get current extraction statistics
     */
    getAnalysisStats() {
        return {
            patterns: Object.keys(this.extractionPatterns).length,
            technicalTerms: this.technicalTerms.length,
            minLength: this.minExtractableLength,
            threshold: this.extractionThreshold,
            version: '1.0.0'
        };
    }
}

module.exports = KnowledgeAnalyzer;
