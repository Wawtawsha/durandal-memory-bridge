/**
 * Semantic Code Indexing Engine - Vector Embedding for Code Understanding
 * Clean, minimal implementation focusing on code similarity and intelligent search
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class SemanticCodeIndexing {
    constructor(options = {}) {
        this.workspaceRoot = options.workspaceRoot || process.cwd();
        this.embeddingDimension = 384; // Lightweight 384-dimensional embeddings
        this.codeEmbeddings = new Map(); // Fast in-memory storage
        this.fileIndex = new Map(); // File metadata index
        
        // Language-specific parsers for AST extraction
        this.languageParsers = {
            javascript: this.parseJavaScript.bind(this),
            typescript: this.parseTypeScript.bind(this),
            python: this.parsePython.bind(this),
            json: this.parseJSON.bind(this),
            markdown: this.parseMarkdown.bind(this)
        };
    }
    
    /**
     * Generate vector embeddings for a code file
     */
    async generateCodeEmbedding(filePath, content) {
        const extension = path.extname(filePath).toLowerCase();
        const language = this.detectLanguage(extension);
        
        // Parse code into semantic components
        const codeComponents = await this.parseCode(content, language);
        
        // Generate lightweight embedding using hash-based encoding
        const embedding = this.createHashBasedEmbedding(codeComponents);
        
        // Store in index with metadata
        const fileId = this.generateFileId(filePath);
        this.codeEmbeddings.set(fileId, embedding);
        this.fileIndex.set(fileId, {
            path: filePath,
            language,
            size: content.length,
            lastModified: Date.now(),
            components: codeComponents
        });
        
        return { fileId, embedding, components: codeComponents };
    }
    
    /**
     * Find similar code using cosine similarity
     */
    async findSimilarCode(queryEmbedding, threshold = 0.7, limit = 10) {
        const similarities = [];
        
        for (const [fileId, embedding] of this.codeEmbeddings.entries()) {
            const similarity = this.cosineSimilarity(queryEmbedding, embedding);
            
            if (similarity >= threshold) {
                const metadata = this.fileIndex.get(fileId);
                similarities.push({
                    fileId,
                    similarity,
                    path: metadata.path,
                    language: metadata.language,
                    components: metadata.components
                });
            }
        }
        
        return similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
    }
    
    /**
     * Search code by semantic query
     */
    async searchBySemantic(query) {
        // Convert query to embedding
        const queryComponents = this.extractQueryComponents(query);
        const queryEmbedding = this.createHashBasedEmbedding(queryComponents);
        
        // Find similar code with much lower threshold for hash-based embeddings
        const results = await this.findSimilarCode(queryEmbedding, 0.1, 20);
        
        // Debug logging to understand similarity scores
        console.log(`🔍 Semantic search for "${query}":`, {
            queryComponentsType: typeof queryComponents,
            queryComponentsLength: Array.isArray(queryComponents) ? queryComponents.length : 'not array',
            totalEmbeddings: this.codeEmbeddings.size,
            resultsFound: results.length,
            topSimilarities: results.slice(0, 3).map(r => ({ 
                file: r.path.split('\\').pop(), 
                similarity: r.similarity.toFixed(3) 
            }))
        });
        
        return results.map(result => ({
            path: result.path,
            similarity: result.similarity,
            language: result.language,
            relevantComponents: this.findRelevantComponents(result.components, queryComponents)
        }));
    }
    
    /**
     * Index a directory (expected by tests)
     */
    async indexDirectory(directoryPath) {
        const oldRoot = this.workspaceRoot;
        this.workspaceRoot = directoryPath;
        const result = await this.indexWorkspace();
        this.workspaceRoot = oldRoot;
        return {
            filesProcessed: result.processed,
            totalEmbeddings: result.processed,
            errors: result.errors
        };
    }
    
    /**
     * Search for similar code (expected by tests)
     */
    async searchSimilar(query, options = {}) {
        const results = await this.searchBySemantic(query);
        return results.slice(0, options.limit || 10);
    }
    
    /**
     * Update index incrementally (expected by tests)
     */
    async updateIndex(filePath, content) {
        await this.generateCodeEmbedding(filePath, content);
        return { updated: true, filePath };
    }
    
    /**
     * Index entire workspace incrementally
     */
    async indexWorkspace() {
        const codeFiles = await this.findCodeFiles(this.workspaceRoot);
        const indexedCount = { total: codeFiles.length, processed: 0, errors: 0 };
        
        console.log(`📊 Indexing ${codeFiles.length} code files...`);
        
        for (const filePath of codeFiles) {
            try {
                const content = await fs.readFile(filePath, 'utf8');
                await this.generateCodeEmbedding(filePath, content);
                indexedCount.processed++;
                
                if (indexedCount.processed % 10 === 0) {
                    console.log(`   📈 Indexed ${indexedCount.processed}/${indexedCount.total} files`);
                }
            } catch (error) {
                indexedCount.errors++;
                console.warn(`   ⚠️  Error indexing ${filePath}: ${error.message}`);
            }
        }
        
        console.log(`✅ Workspace indexing complete: ${indexedCount.processed} files indexed, ${indexedCount.errors} errors`);
        return indexedCount;
    }
    
    // Language Detection
    detectLanguage(extension) {
        const languageMap = {
            '.js': 'javascript',
            '.ts': 'typescript', 
            '.jsx': 'javascript',
            '.tsx': 'typescript',
            '.py': 'python',
            '.json': 'json',
            '.md': 'markdown'
        };
        
        return languageMap[extension] || 'text';
    }
    
    // Code Parsers (Lightweight AST parsing)
    async parseCode(content, language) {
        const parser = this.languageParsers[language];
        return parser ? await parser(content) : this.parseGeneric(content);
    }
    
    parseJavaScript(content) {
        const components = {
            functions: this.extractFunctions(content),
            classes: this.extractClasses(content),
            imports: this.extractImports(content),
            exports: this.extractExports(content),
            variables: this.extractVariables(content),
            keywords: this.extractKeywords(content)
        };
        
        return components;
    }
    
    parseTypeScript(content) {
        // TypeScript extends JavaScript parsing with types
        const jsComponents = this.parseJavaScript(content);
        jsComponents.interfaces = this.extractInterfaces(content);
        jsComponents.types = this.extractTypes(content);
        
        return jsComponents;
    }
    
    parsePython(content) {
        return {
            functions: this.extractPythonFunctions(content),
            classes: this.extractPythonClasses(content), 
            imports: this.extractPythonImports(content),
            variables: this.extractPythonVariables(content),
            keywords: this.extractKeywords(content)
        };
    }
    
    parseJSON(content) {
        try {
            const data = JSON.parse(content);
            return {
                structure: this.analyzeJSONStructure(data),
                keys: this.extractJSONKeys(data),
                values: this.extractJSONValues(data)
            };
        } catch {
            return { structure: 'invalid', keys: [], values: [] };
        }
    }
    
    parseMarkdown(content) {
        return {
            headings: this.extractMarkdownHeadings(content),
            codeBlocks: this.extractCodeBlocks(content),
            links: this.extractLinks(content),
            keywords: this.extractKeywords(content)
        };
    }
    
    parseGeneric(content) {
        return {
            keywords: this.extractKeywords(content),
            structure: 'generic'
        };
    }
    
    // Hash-based Embedding Generation (Lightweight alternative to neural embeddings)
    createHashBasedEmbedding(codeComponents) {
        const embedding = new Float32Array(this.embeddingDimension);
        const features = this.extractFeatures(codeComponents);
        
        // Generate embedding using feature hashing
        for (const feature of features) {
            const hash = this.hashFeature(feature);
            const indices = this.getEmbeddingIndices(hash, 3); // 3 indices per feature
            
            for (const index of indices) {
                embedding[index] += 1.0 / Math.sqrt(features.length);
            }
        }
        
        // Normalize to unit vector
        return this.normalizeVector(embedding);
    }
    
    extractFeatures(components) {
        const features = [];
        
        // Function names and patterns
        if (components.functions) {
            features.push(...components.functions.map(f => `func:${f.name}`));
            features.push(...components.functions.map(f => `params:${f.params?.length || 0}`));
        }
        
        // Class names and structures
        if (components.classes) {
            features.push(...components.classes.map(c => `class:${c.name}`));
            features.push(...components.classes.map(c => `methods:${c.methods?.length || 0}`));
        }
        
        // Import/dependency patterns
        if (components.imports) {
            features.push(...components.imports.map(i => `import:${i}`));
        }
        
        // Semantic keywords
        if (components.keywords) {
            features.push(...components.keywords.map(k => `keyword:${k}`));
        }
        
        return features;
    }
    
    // Utility Methods
    generateFileId(filePath) {
        return crypto.createHash('sha256').update(filePath).digest('hex').substring(0, 16);
    }
    
    hashFeature(feature) {
        return crypto.createHash('sha256').update(feature).digest('hex');
    }
    
    getEmbeddingIndices(hash, count) {
        const indices = [];
        for (let i = 0; i < count; i++) {
            const index = parseInt(hash.substring(i * 8, (i + 1) * 8), 16) % this.embeddingDimension;
            indices.push(index);
        }
        return indices;
    }
    
    cosineSimilarity(vectorA, vectorB) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < vectorA.length; i++) {
            dotProduct += vectorA[i] * vectorB[i];
            normA += vectorA[i] * vectorA[i];
            normB += vectorB[i] * vectorB[i];
        }
        
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
    
    normalizeVector(vector) {
        const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        return norm > 0 ? vector.map(val => val / norm) : vector;
    }
    
    async findCodeFiles(directory) {
        const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.json', '.md'];
        const files = [];
        
        async function traverse(dir) {
            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    
                    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                        await traverse(fullPath);
                    } else if (entry.isFile() && codeExtensions.includes(path.extname(entry.name).toLowerCase())) {
                        files.push(fullPath);
                    }
                }
            } catch (error) {
                console.warn(`Warning: Cannot read directory ${dir}: ${error.message}`);
            }
        }
        
        await traverse(directory);
        return files;
    }
    
    // Simple regex-based extractors (lightweight alternative to full AST parsing)
    extractFunctions(content) {
        const functionRegex = /(?:function\s+(\w+)|(\w+)\s*[:=]\s*(?:async\s+)?function|(\w+)\s*\(\s*[^)]*\s*\)\s*(?:=>|{))/g;
        const functions = [];
        let match;
        
        while ((match = functionRegex.exec(content)) !== null) {
            const name = match[1] || match[2] || match[3];
            if (name) {
                functions.push({ name, type: 'function' });
            }
        }
        
        return functions;
    }
    
    extractClasses(content) {
        const classRegex = /class\s+(\w+)/g;
        const classes = [];
        let match;
        
        while ((match = classRegex.exec(content)) !== null) {
            classes.push({ name: match[1], type: 'class' });
        }
        
        return classes;
    }
    
    extractImports(content) {
        const importRegex = /(?:import\s+.+?\s+from\s+['""]([^'""]+)['""]\s*;?|require\s*\(\s*['""]([^'""]+)['""]\s*\))/g;
        const imports = [];
        let match;
        
        while ((match = importRegex.exec(content)) !== null) {
            imports.push(match[1] || match[2]);
        }
        
        return imports;
    }
    
    extractExports(content) {
        const exportRegex = /export\s+(?:default\s+|{[^}]*}|(?:const|let|var|function|class)\s+(\w+))/g;
        const exports = [];
        let match;
        
        while ((match = exportRegex.exec(content)) !== null) {
            if (match[1]) exports.push(match[1]);
        }
        
        return exports;
    }
    
    extractVariables(content) {
        const varRegex = /(?:const|let|var)\s+(\w+)/g;
        const variables = [];
        let match;
        
        while ((match = varRegex.exec(content)) !== null) {
            variables.push(match[1]);
        }
        
        return variables;
    }
    
    extractInterfaces(content) {
        const interfaceRegex = /interface\s+(\w+)/g;
        const interfaces = [];
        let match;
        
        while ((match = interfaceRegex.exec(content)) !== null) {
            interfaces.push(match[1]);
        }
        
        return interfaces;
    }
    
    extractTypes(content) {
        const typeRegex = /type\s+(\w+)/g;
        const types = [];
        let match;
        
        while ((match = typeRegex.exec(content)) !== null) {
            types.push(match[1]);
        }
        
        return types;
    }
    
    extractPythonFunctions(content) {
        const funcRegex = /def\s+(\w+)\s*\([^)]*\):/g;
        const functions = [];
        let match;
        
        while ((match = funcRegex.exec(content)) !== null) {
            functions.push({ name: match[1], type: 'function' });
        }
        
        return functions;
    }
    
    extractPythonClasses(content) {
        const classRegex = /class\s+(\w+)(?:\([^)]*\))?:/g;
        const classes = [];
        let match;
        
        while ((match = classRegex.exec(content)) !== null) {
            classes.push({ name: match[1], type: 'class' });
        }
        
        return classes;
    }
    
    extractPythonImports(content) {
        const importRegex = /(?:from\s+([^\s]+)\s+import|import\s+([^\s,]+))/g;
        const imports = [];
        let match;
        
        while ((match = importRegex.exec(content)) !== null) {
            imports.push(match[1] || match[2]);
        }
        
        return imports;
    }
    
    extractPythonVariables(content) {
        const varRegex = /^(\w+)\s*=[^=]/gm;
        const variables = [];
        let match;
        
        while ((match = varRegex.exec(content)) !== null) {
            variables.push(match[1]);
        }
        
        return variables;
    }
    
    extractKeywords(content) {
        const words = content.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
        const commonWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use']);
        
        return [...new Set(words.filter(word => !commonWords.has(word)))].slice(0, 20);
    }
    
    extractMarkdownHeadings(content) {
        const headingRegex = /^#+\s+(.+)$/gm;
        const headings = [];
        let match;
        
        while ((match = headingRegex.exec(content)) !== null) {
            headings.push(match[1]);
        }
        
        return headings;
    }
    
    extractCodeBlocks(content) {
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        const codeBlocks = [];
        let match;
        
        while ((match = codeBlockRegex.exec(content)) !== null) {
            codeBlocks.push({ language: match[1] || 'text', code: match[2] });
        }
        
        return codeBlocks;
    }
    
    extractLinks(content) {
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const links = [];
        let match;
        
        while ((match = linkRegex.exec(content)) !== null) {
            links.push({ text: match[1], url: match[2] });
        }
        
        return links;
    }
    
    analyzeJSONStructure(data) {
        if (Array.isArray(data)) {
            return `array[${data.length}]`;
        } else if (typeof data === 'object' && data !== null) {
            return `object{${Object.keys(data).length}}`;
        }
        return typeof data;
    }
    
    extractJSONKeys(data, prefix = '') {
        const keys = [];
        
        if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
            for (const key in data) {
                const fullKey = prefix ? `${prefix}.${key}` : key;
                keys.push(fullKey);
                
                if (typeof data[key] === 'object') {
                    keys.push(...this.extractJSONKeys(data[key], fullKey));
                }
            }
        }
        
        return keys;
    }
    
    extractJSONValues(data) {
        const values = [];
        
        if (Array.isArray(data)) {
            data.forEach(item => values.push(...this.extractJSONValues(item)));
        } else if (typeof data === 'object' && data !== null) {
            Object.values(data).forEach(value => values.push(...this.extractJSONValues(value)));
        } else {
            values.push(String(data));
        }
        
        return values.slice(0, 50); // Limit to prevent overflow
    }
    
    extractQueryComponents(query) {
        return {
            keywords: this.extractKeywords(query),
            functions: query.match(/\b\w+\(/g) || [],
            classes: query.match(/\bclass\s+\w+/gi) || [],
            structure: 'query'
        };
    }
    
    findRelevantComponents(components, queryComponents) {
        const relevant = [];
        
        // Find matching functions
        if (components.functions && queryComponents.keywords) {
            components.functions.forEach(func => {
                if (queryComponents.keywords.some(keyword => func.name.toLowerCase().includes(keyword))) {
                    relevant.push({ type: 'function', name: func.name });
                }
            });
        }
        
        // Find matching classes
        if (components.classes && queryComponents.keywords) {
            components.classes.forEach(cls => {
                if (queryComponents.keywords.some(keyword => cls.name.toLowerCase().includes(keyword))) {
                    relevant.push({ type: 'class', name: cls.name });
                }
            });
        }
        
        return relevant;
    }
    
    // Statistics and monitoring
    getIndexStatistics() {
        return {
            totalFiles: this.codeEmbeddings.size,
            totalEmbeddings: this.codeEmbeddings.size,
            embeddingDimension: this.embeddingDimension,
            memoryUsage: `${Math.round(this.codeEmbeddings.size * this.embeddingDimension * 4 / 1024 / 1024)}MB`,
            languages: [...new Set([...this.fileIndex.values()].map(f => f.language))]
        };
    }
}

module.exports = SemanticCodeIndexing;