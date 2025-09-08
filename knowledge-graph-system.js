/**
 * Cross-Project Knowledge Graph System - Relationship Mapping
 * Clean, minimal implementation focusing on intelligent pattern recognition
 */

const crypto = require('crypto');

class KnowledgeGraphSystem {
    constructor(options = {}) {
        this.workspaceRoot = options.workspaceRoot || process.cwd();
        
        // Graph storage (in-memory for fast access)
        this.nodes = new Map(); // Entity nodes (files, functions, classes, concepts)
        this.edges = new Map(); // Relationships between nodes
        this.nodeTypes = new Set(['file', 'function', 'class', 'interface', 'concept', 'technology', 'pattern']);
        this.relationshipTypes = new Set(['DEPENDS_ON', 'SIMILAR_TO', 'IMPLEMENTS', 'USES', 'PART_OF', 'CALLS', 'IMPORTS']);
        
        // Pattern recognition cache
        this.patternCache = new Map();
        this.conceptIndex = new Map(); // Abstract concepts extracted from code
    }
    
    /**
     * Add a node to the knowledge graph
     */
    addNode(nodeId, nodeData) {
        const node = {
            id: nodeId,
            type: nodeData.type,
            name: nodeData.name,
            properties: nodeData.properties || {},
            metadata: {
                created: Date.now(),
                lastUpdated: Date.now(),
                weight: nodeData.weight || 1.0
            },
            connections: new Set()
        };
        
        this.nodes.set(nodeId, node);
        
        // Index concepts for fast lookup
        if (node.type === 'concept') {
            this.conceptIndex.set(node.name.toLowerCase(), nodeId);
        }
        
        return node;
    }
    
    /**
     * Add a relationship between two nodes
     */
    addRelationship(fromNodeId, toNodeId, relationshipType, properties = {}) {
        if (!this.nodes.has(fromNodeId) || !this.nodes.has(toNodeId)) {
            throw new Error('Both nodes must exist before creating relationship');
        }
        
        const edgeId = this.generateEdgeId(fromNodeId, toNodeId, relationshipType);
        const edge = {
            id: edgeId,
            from: fromNodeId,
            to: toNodeId,
            type: relationshipType,
            properties,
            strength: properties.strength || 1.0,
            created: Date.now()
        };
        
        this.edges.set(edgeId, edge);
        
        // Update node connections
        this.nodes.get(fromNodeId).connections.add(edgeId);
        this.nodes.get(toNodeId).connections.add(edgeId);
        
        return edge;
    }
    
    /**
     * Build graph from directory (expected by tests)
     */
    async buildGraphFromDirectory(directoryPath) {
        console.log(`🧠 Building knowledge graph from directory: ${directoryPath}`);
        const fs = require('fs').promises;
        const path = require('path');
        
        try {
            // Mock analysis results for test
            const mockAnalysisResults = [];
            const files = await this.findCodeFiles(directoryPath);
            console.log(`🔍 Found ${files.length} code files to analyze`);
            
            for (const filePath of files) {
                try {
                    const content = await fs.readFile(filePath, 'utf8');
                    const analysis = {
                        path: filePath,
                        language: this.detectLanguage(path.extname(filePath)),
                        components: {
                            functions: this.extractFunctions(content),
                            classes: this.extractClasses(content),
                            imports: this.extractImports(content)
                        }
                    };
                    mockAnalysisResults.push(analysis);
                    console.log(`📄 Analyzed ${path.basename(filePath)}: ${analysis.components.functions.length} functions, ${analysis.components.classes.length} classes`);
                } catch (error) {
                    console.warn(`⚠️  Failed to read ${filePath}:`, error.message);
                }
            }
            
            console.log(`✅ Analysis complete, building graph from ${mockAnalysisResults.length} files`);
            const result = await this.buildFromCodebase(mockAnalysisResults);
            
            console.log(`🎯 Knowledge graph built successfully: ${result.nodes} nodes, ${result.edges} relationships`);
            return {
                nodes: result.nodes,
                relationships: result.edges
            };
        } catch (error) {
            console.error(`❌ Knowledge graph build failed:`, error.message);
            throw error;
        }
    }
    
    /**
     * Find nodes by name (expected by tests)
     */
    async findNodes(nodeName) {
        const results = [];
        for (const [nodeId, node] of this.nodes.entries()) {
            if (node.name.includes(nodeName)) {
                results.push(node);
            }
        }
        return results;
    }
    
    /**
     * Get node relationships (expected by tests)
     */
    async getNodeRelationships(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return [];
        
        const relationships = [];
        for (const edgeId of node.connections) {
            const edge = this.edges.get(edgeId);
            if (edge) {
                relationships.push({
                    type: edge.type,
                    target: edge.from === nodeId ? edge.to : edge.from,
                    strength: edge.strength
                });
            }
        }
        return relationships;
    }
    
    async findCodeFiles(directory) {
        const fs = require('fs').promises;
        const path = require('path');
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
                // Skip directories that can't be read
            }
        }
        
        await traverse(directory);
        return files;
    }
    
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
    
    /**
     * Build knowledge graph from code analysis
     */
    async buildFromCodebase(codeAnalysisResults) {
        console.log('🧠 Building knowledge graph from codebase...');
        
        let nodesAdded = 0;
        let edgesAdded = 0;
        
        // Add file nodes
        for (const analysis of codeAnalysisResults) {
            const fileNode = this.addFileNode(analysis);
            nodesAdded++;
            
            // Add function nodes
            if (analysis.components.functions) {
                for (const func of analysis.components.functions) {
                    const funcNode = this.addFunctionNode(func, analysis.path);
                    this.addRelationship(funcNode.id, fileNode.id, 'PART_OF');
                    nodesAdded++;
                    edgesAdded++;
                }
            }
            
            // Add class nodes
            if (analysis.components.classes) {
                for (const cls of analysis.components.classes) {
                    const classNode = this.addClassNode(cls, analysis.path);
                    this.addRelationship(classNode.id, fileNode.id, 'PART_OF');
                    nodesAdded++;
                    edgesAdded++;
                }
            }
            
            // Add dependency relationships
            if (analysis.components.imports) {
                for (const importPath of analysis.components.imports) {
                    const depNode = this.findOrCreateDependencyNode(importPath);
                    this.addRelationship(fileNode.id, depNode.id, 'DEPENDS_ON');
                    edgesAdded++;
                }
            }
        }
        
        // Discover cross-project patterns
        await this.discoverPatterns();
        
        console.log(`✅ Knowledge graph built: ${nodesAdded} nodes, ${edgesAdded} relationships`);
        return { nodes: nodesAdded, edges: edgesAdded };
    }
    
    /**
     * Discover architectural patterns and relationships
     */
    async discoverPatterns() {
        console.log('🔍 Discovering patterns and relationships...');
        
        const patterns = {
            designPatterns: this.detectDesignPatterns(),
            architecturalPatterns: this.detectArchitecturalPatterns(),
            namingPatterns: this.detectNamingPatterns(),
            dependencyPatterns: this.detectDependencyPatterns()
        };
        
        // Create concept nodes for discovered patterns
        for (const [patternType, patternList] of Object.entries(patterns)) {
            for (const pattern of patternList) {
                const conceptNode = this.addConceptNode(pattern);
                
                // Link relevant nodes to this concept
                for (const nodeId of pattern.relatedNodes) {
                    this.addRelationship(nodeId, conceptNode.id, 'IMPLEMENTS', {
                        confidence: pattern.confidence
                    });
                }
            }
        }
        
        return patterns;
    }
    
    /**
     * Query the knowledge graph
     */
    async query(queryParams) {
        const { type, filters, relationships, limit = 20 } = queryParams;
        
        let results = [];
        
        switch (type) {
            case 'findSimilar':
                results = this.findSimilarNodes(filters.nodeId, limit);
                break;
            case 'findDependencies': 
                results = this.findDependencies(filters.nodeId, filters.depth || 2);
                break;
            case 'findUsage':
                results = this.findUsage(filters.nodeId, limit);
                break;
            case 'findPatterns':
                results = this.findPatterns(filters.pattern, limit);
                break;
            case 'pathBetween':
                results = this.findPath(filters.from, filters.to);
                break;
            default:
                results = this.searchNodes(filters, limit);
        }
        
        return this.formatQueryResults(results);
    }
    
    /**
     * Find similar nodes using graph traversal
     */
    findSimilarNodes(nodeId, limit) {
        const targetNode = this.nodes.get(nodeId);
        if (!targetNode) return [];
        
        const similarities = [];
        
        for (const [id, node] of this.nodes.entries()) {
            if (id === nodeId) continue;
            
            const similarity = this.calculateNodeSimilarity(targetNode, node);
            if (similarity > 0.3) {
                similarities.push({ node, similarity });
            }
        }
        
        return similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
    }
    
    /**
     * Find all dependencies of a node
     */
    findDependencies(nodeId, maxDepth = 2) {
        const visited = new Set();
        const dependencies = [];
        
        const traverse = (currentId, depth) => {
            if (depth > maxDepth || visited.has(currentId)) return;
            visited.add(currentId);
            
            const node = this.nodes.get(currentId);
            if (!node) return;
            
            // Find outgoing DEPENDS_ON relationships
            for (const edgeId of node.connections) {
                const edge = this.edges.get(edgeId);
                if (edge && edge.from === currentId && edge.type === 'DEPENDS_ON') {
                    const depNode = this.nodes.get(edge.to);
                    if (depNode) {
                        dependencies.push({
                            node: depNode,
                            relationship: edge,
                            depth
                        });
                        traverse(edge.to, depth + 1);
                    }
                }
            }
        };
        
        traverse(nodeId, 0);
        return dependencies;
    }
    
    /**
     * Find where a node is used
     */
    findUsage(nodeId, limit) {
        const usages = [];
        const targetNode = this.nodes.get(nodeId);
        if (!targetNode) return [];
        
        // Find incoming relationships
        for (const edgeId of targetNode.connections) {
            const edge = this.edges.get(edgeId);
            if (edge && edge.to === nodeId) {
                const sourceNode = this.nodes.get(edge.from);
                if (sourceNode) {
                    usages.push({
                        node: sourceNode,
                        relationship: edge,
                        context: this.getUsageContext(edge)
                    });
                }
            }
        }
        
        return usages.slice(0, limit);
    }
    
    /**
     * Find nodes implementing specific patterns
     */
    findPatterns(patternName, limit) {
        const patternNodes = [];
        const conceptId = this.conceptIndex.get(patternName.toLowerCase());
        
        if (conceptId) {
            const implementations = this.findUsage(conceptId, limit);
            return implementations.map(impl => impl.node);
        }
        
        // Fallback: search by pattern keywords
        for (const [nodeId, node] of this.nodes.entries()) {
            if (this.nodeMatchesPattern(node, patternName)) {
                patternNodes.push(node);
            }
        }
        
        return patternNodes.slice(0, limit);
    }
    
    /**
     * Find shortest path between two nodes
     */
    findPath(fromNodeId, toNodeId) {
        const queue = [[fromNodeId]];
        const visited = new Set();
        
        while (queue.length > 0) {
            const path = queue.shift();
            const currentId = path[path.length - 1];
            
            if (currentId === toNodeId) {
                return this.formatPath(path);
            }
            
            if (visited.has(currentId)) continue;
            visited.add(currentId);
            
            const node = this.nodes.get(currentId);
            if (!node) continue;
            
            for (const edgeId of node.connections) {
                const edge = this.edges.get(edgeId);
                if (!edge) continue;
                
                const nextId = edge.from === currentId ? edge.to : edge.from;
                if (!visited.has(nextId)) {
                    queue.push([...path, nextId]);
                }
            }
        }
        
        return []; // No path found
    }
    
    // Node creation helpers
    addFileNode(analysis) {
        const nodeId = this.generateNodeId('file', analysis.path);
        return this.addNode(nodeId, {
            type: 'file',
            name: analysis.path,
            properties: {
                language: analysis.language,
                size: analysis.components.size || 0,
                complexity: this.calculateComplexity(analysis.components)
            }
        });
    }
    
    addFunctionNode(func, filePath) {
        const nodeId = this.generateNodeId('function', `${filePath}:${func.name}`);
        return this.addNode(nodeId, {
            type: 'function',
            name: func.name,
            properties: {
                file: filePath,
                parameters: func.params || [],
                complexity: func.complexity || 1
            }
        });
    }
    
    addClassNode(cls, filePath) {
        const nodeId = this.generateNodeId('class', `${filePath}:${cls.name}`);
        return this.addNode(nodeId, {
            type: 'class',
            name: cls.name,
            properties: {
                file: filePath,
                methods: cls.methods || [],
                inheritance: cls.inheritance || []
            }
        });
    }
    
    addConceptNode(pattern) {
        const nodeId = this.generateNodeId('concept', pattern.name);
        return this.addNode(nodeId, {
            type: 'concept',
            name: pattern.name,
            properties: {
                description: pattern.description,
                confidence: pattern.confidence,
                instances: pattern.relatedNodes.length
            }
        });
    }
    
    findOrCreateDependencyNode(importPath) {
        const nodeId = this.generateNodeId('dependency', importPath);
        
        if (this.nodes.has(nodeId)) {
            return this.nodes.get(nodeId);
        }
        
        return this.addNode(nodeId, {
            type: 'dependency',
            name: importPath,
            properties: {
                external: !importPath.startsWith('.'),
                package: this.extractPackageName(importPath)
            }
        });
    }
    
    // Pattern detection
    detectDesignPatterns() {
        const patterns = [];
        
        // Singleton pattern detection
        patterns.push(...this.detectSingletonPattern());
        
        // Factory pattern detection
        patterns.push(...this.detectFactoryPattern());
        
        // Observer pattern detection
        patterns.push(...this.detectObserverPattern());
        
        return patterns;
    }
    
    detectSingletonPattern() {
        const singletons = [];
        
        for (const [nodeId, node] of this.nodes.entries()) {
            if (node.type === 'class' && 
                node.name.toLowerCase().includes('singleton') ||
                node.properties.methods?.some(m => m.name === 'getInstance')) {
                
                singletons.push({
                    name: 'singleton',
                    description: 'Singleton Design Pattern',
                    confidence: 0.8,
                    relatedNodes: [nodeId]
                });
            }
        }
        
        return singletons;
    }
    
    detectFactoryPattern() {
        const factories = [];
        
        for (const [nodeId, node] of this.nodes.entries()) {
            if (node.type === 'class' && 
                (node.name.toLowerCase().includes('factory') ||
                 node.properties.methods?.some(m => m.name.startsWith('create')))) {
                
                factories.push({
                    name: 'factory',
                    description: 'Factory Design Pattern',
                    confidence: 0.7,
                    relatedNodes: [nodeId]
                });
            }
        }
        
        return factories;
    }
    
    detectObserverPattern() {
        const observers = [];
        
        for (const [nodeId, node] of this.nodes.entries()) {
            if (node.type === 'class' && 
                node.properties.methods?.some(m => 
                    ['subscribe', 'unsubscribe', 'notify', 'emit'].includes(m.name))) {
                
                observers.push({
                    name: 'observer',
                    description: 'Observer Design Pattern',
                    confidence: 0.8,
                    relatedNodes: [nodeId]
                });
            }
        }
        
        return observers;
    }
    
    detectArchitecturalPatterns() {
        return [
            ...this.detectMVCPattern(),
            ...this.detectRepositoryPattern(),
            ...this.detectServicePattern()
        ];
    }
    
    detectMVCPattern() {
        const controllers = [];
        const models = [];
        const views = [];
        
        for (const [nodeId, node] of this.nodes.entries()) {
            const name = node.name.toLowerCase();
            if (name.includes('controller')) controllers.push(nodeId);
            if (name.includes('model')) models.push(nodeId);
            if (name.includes('view')) views.push(nodeId);
        }
        
        if (controllers.length && models.length) {
            return [{
                name: 'mvc',
                description: 'Model-View-Controller Architecture',
                confidence: 0.9,
                relatedNodes: [...controllers, ...models, ...views]
            }];
        }
        
        return [];
    }
    
    detectRepositoryPattern() {
        const repositories = [];
        
        for (const [nodeId, node] of this.nodes.entries()) {
            if (node.name.toLowerCase().includes('repository') ||
                node.properties.methods?.some(m => 
                    ['save', 'find', 'delete', 'findById'].includes(m.name))) {
                repositories.push(nodeId);
            }
        }
        
        return repositories.length ? [{
            name: 'repository',
            description: 'Repository Pattern',
            confidence: 0.8,
            relatedNodes: repositories
        }] : [];
    }
    
    detectServicePattern() {
        const services = [];
        
        for (const [nodeId, node] of this.nodes.entries()) {
            if (node.name.toLowerCase().includes('service')) {
                services.push(nodeId);
            }
        }
        
        return services.length ? [{
            name: 'service',
            description: 'Service Pattern',
            confidence: 0.7,
            relatedNodes: services
        }] : [];
    }
    
    detectNamingPatterns() {
        const patterns = new Map();
        
        for (const [nodeId, node] of this.nodes.entries()) {
            const namingStyle = this.analyzeNamingStyle(node.name);
            if (!patterns.has(namingStyle)) {
                patterns.set(namingStyle, []);
            }
            patterns.get(namingStyle).push(nodeId);
        }
        
        return Array.from(patterns.entries()).map(([style, nodes]) => ({
            name: `naming_${style}`,
            description: `${style} naming convention`,
            confidence: 0.6,
            relatedNodes: nodes
        }));
    }
    
    detectDependencyPatterns() {
        const patterns = [];
        const dependencyGroups = new Map();
        
        for (const [edgeId, edge] of this.edges.entries()) {
            if (edge.type === 'DEPENDS_ON') {
                const toNode = this.nodes.get(edge.to);
                if (toNode && toNode.properties.package) {
                    const pkg = toNode.properties.package;
                    if (!dependencyGroups.has(pkg)) {
                        dependencyGroups.set(pkg, []);
                    }
                    dependencyGroups.get(pkg).push(edge.from);
                }
            }
        }
        
        for (const [pkg, dependents] of dependencyGroups.entries()) {
            if (dependents.length >= 3) {
                patterns.push({
                    name: `dependency_${pkg}`,
                    description: `Heavy usage of ${pkg}`,
                    confidence: 0.8,
                    relatedNodes: dependents
                });
            }
        }
        
        return patterns;
    }
    
    // Utility methods
    generateNodeId(type, identifier) {
        return crypto.createHash('sha256').update(`${type}:${identifier}`).digest('hex').substring(0, 16);
    }
    
    generateEdgeId(fromId, toId, type) {
        return crypto.createHash('sha256').update(`${fromId}->${toId}:${type}`).digest('hex').substring(0, 16);
    }
    
    calculateComplexity(components) {
        let complexity = 1;
        if (components.functions) complexity += components.functions.length * 2;
        if (components.classes) complexity += components.classes.length * 3;
        if (components.imports) complexity += components.imports.length;
        return complexity;
    }
    
    calculateNodeSimilarity(nodeA, nodeB) {
        if (nodeA.type !== nodeB.type) return 0;
        
        let similarity = 0;
        
        // Name similarity
        const nameScore = this.stringSimilarity(nodeA.name, nodeB.name);
        similarity += nameScore * 0.4;
        
        // Properties similarity
        const propsScore = this.propertiesSimilarity(nodeA.properties, nodeB.properties);
        similarity += propsScore * 0.3;
        
        // Connection patterns similarity
        const connectionScore = this.connectionSimilarity(nodeA, nodeB);
        similarity += connectionScore * 0.3;
        
        return similarity;
    }
    
    stringSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        return (longer.length - this.editDistance(longer, shorter)) / longer.length;
    }
    
    editDistance(str1, str2) {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
        
        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
        
        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                if (str1[i-1] === str2[j-1]) {
                    matrix[j][i] = matrix[j-1][i-1];
                } else {
                    matrix[j][i] = Math.min(
                        matrix[j-1][i-1] + 1,
                        matrix[j][i-1] + 1,
                        matrix[j-1][i] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    propertiesSimilarity(propsA, propsB) {
        const keysA = Object.keys(propsA || {});
        const keysB = Object.keys(propsB || {});
        const commonKeys = keysA.filter(key => keysB.includes(key));
        
        if (keysA.length === 0 && keysB.length === 0) return 1.0;
        if (commonKeys.length === 0) return 0;
        
        return commonKeys.length / Math.max(keysA.length, keysB.length);
    }
    
    connectionSimilarity(nodeA, nodeB) {
        const connectionsA = this.getConnectionTypes(nodeA);
        const connectionsB = this.getConnectionTypes(nodeB);
        
        const commonTypes = connectionsA.filter(type => connectionsB.includes(type));
        return commonTypes.length / Math.max(connectionsA.length, connectionsB.length, 1);
    }
    
    getConnectionTypes(node) {
        const types = [];
        for (const edgeId of node.connections) {
            const edge = this.edges.get(edgeId);
            if (edge) types.push(edge.type);
        }
        return [...new Set(types)];
    }
    
    analyzeNamingStyle(name) {
        if (/^[A-Z][a-zA-Z0-9]*$/.test(name)) return 'PascalCase';
        if (/^[a-z][a-zA-Z0-9]*$/.test(name)) return 'camelCase';
        if (/^[a-z][a-z0-9_]*$/.test(name)) return 'snake_case';
        if (/^[A-Z][A-Z0-9_]*$/.test(name)) return 'CONSTANT_CASE';
        if (/^[a-z][a-z0-9-]*$/.test(name)) return 'kebab-case';
        return 'mixed';
    }
    
    extractPackageName(importPath) {
        if (importPath.startsWith('.')) return 'local';
        return importPath.split('/')[0];
    }
    
    nodeMatchesPattern(node, pattern) {
        const searchText = `${node.name} ${JSON.stringify(node.properties)}`.toLowerCase();
        return searchText.includes(pattern.toLowerCase());
    }
    
    getUsageContext(edge) {
        return {
            relationship: edge.type,
            strength: edge.strength,
            properties: edge.properties
        };
    }
    
    formatPath(path) {
        return path.map(nodeId => {
            const node = this.nodes.get(nodeId);
            return node ? { id: nodeId, name: node.name, type: node.type } : null;
        }).filter(Boolean);
    }
    
    formatQueryResults(results) {
        return results.map(result => {
            if (result.node) {
                return {
                    ...result,
                    node: {
                        id: result.node.id,
                        name: result.node.name,
                        type: result.node.type,
                        properties: result.node.properties
                    }
                };
            }
            return result;
        });
    }
    
    searchNodes(filters, limit) {
        const results = [];
        
        for (const [nodeId, node] of this.nodes.entries()) {
            let matches = true;
            
            if (filters.type && node.type !== filters.type) matches = false;
            if (filters.name && !node.name.toLowerCase().includes(filters.name.toLowerCase())) matches = false;
            
            if (matches) {
                results.push({ node, score: 1.0 });
            }
        }
        
        return results.slice(0, limit);
    }
    
    // Statistics and monitoring
    getGraphStatistics() {
        const nodesByType = {};
        for (const node of this.nodes.values()) {
            nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
        }
        
        const edgesByType = {};
        for (const edge of this.edges.values()) {
            edgesByType[edge.type] = (edgesByType[edge.type] || 0) + 1;
        }
        
        return {
            totalNodes: this.nodes.size,
            totalEdges: this.edges.size,
            nodesByType,
            edgesByType,
            concepts: this.conceptIndex.size,
            avgConnectionsPerNode: this.calculateAverageConnections()
        };
    }
    
    calculateAverageConnections() {
        if (this.nodes.size === 0) return 0;
        const totalConnections = Array.from(this.nodes.values()).reduce((sum, node) => sum + node.connections.size, 0);
        return totalConnections / this.nodes.size;
    }
    
    // Export/Import for persistence
    exportGraph() {
        return {
            nodes: Array.from(this.nodes.entries()),
            edges: Array.from(this.edges.entries()),
            conceptIndex: Array.from(this.conceptIndex.entries())
        };
    }
    
    importGraph(graphData) {
        this.nodes.clear();
        this.edges.clear();
        this.conceptIndex.clear();
        
        for (const [id, node] of graphData.nodes) {
            node.connections = new Set(node.connections);
            this.nodes.set(id, node);
        }
        
        for (const [id, edge] of graphData.edges) {
            this.edges.set(id, edge);
        }
        
        for (const [concept, nodeId] of graphData.conceptIndex) {
            this.conceptIndex.set(concept, nodeId);
        }
    }
}

module.exports = KnowledgeGraphSystem;