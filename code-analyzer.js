/**
 * Simple Code Analyzer - Parse and analyze code files
 * Clean, minimal implementation for the core functionality
 */

const fs = require('fs').promises;
const path = require('path');

class CodeAnalyzer {
    constructor() {
        this.supportedExtensions = {
            '.js': 'javascript',
            '.ts': 'typescript', 
            '.py': 'python',
            '.sql': 'sql',
            '.cs': 'csharp',
            '.cpp': 'cpp',
            '.c': 'c',
            '.json': 'json',
            '.xml': 'xml',
            '.md': 'markdown'
        };
    }

    async analyzeFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const analysis = this.parseCode(content, null, filePath);
            return {
                ...analysis,
                filePath,
                size: content.length,
                lines: content.split('\n').length
            };
        } catch (error) {
            throw new Error(`Failed to analyze file ${filePath}: ${error.message}`);
        }
    }

    parseCode(content, language = null, filePath = '') {
        const ext = path.extname(filePath).toLowerCase();
        const detectedLanguage = language || this.supportedExtensions[ext] || 'unknown';
        
        const analysis = {
            language: detectedLanguage,
            functions: this.extractFunctions(content, detectedLanguage),
            classes: this.extractClasses(content, detectedLanguage),
            imports: this.extractImports(content, detectedLanguage),
            complexity: this.calculateComplexity(content),
            content: content
        };

        return analysis;
    }

    extractFunctions(content, language) {
        const functions = [];
        
        if (language === 'javascript' || language === 'typescript') {
            // Match function declarations and expressions
            const functionRegex = /(?:function\s+(\w+)|(\w+)\s*[=:]\s*(?:function|\([^)]*\)\s*=>)|(?:async\s+)?(\w+)\s*\([^)]*\)\s*{)/g;
            let match;
            while ((match = functionRegex.exec(content)) !== null) {
                const functionName = match[1] || match[2] || match[3];
                if (functionName && !functions.includes(functionName)) {
                    functions.push(functionName);
                }
            }
        } else if (language === 'python') {
            // Match Python function definitions
            const functionRegex = /def\s+(\w+)\s*\(/g;
            let match;
            while ((match = functionRegex.exec(content)) !== null) {
                functions.push(match[1]);
            }
        } else if (language === 'csharp') {
            // Match C# method declarations
            const functionRegex = /(?:public|private|protected|internal)?\s*(?:static)?\s*(?:async)?\s*\w+\s+(\w+)\s*\(/g;
            let match;
            while ((match = functionRegex.exec(content)) !== null) {
                if (!['get', 'set', 'if', 'while', 'for', 'switch'].includes(match[1])) {
                    functions.push(match[1]);
                }
            }
        }

        return functions;
    }

    extractClasses(content, language) {
        const classes = [];
        
        if (language === 'javascript' || language === 'typescript') {
            const classRegex = /class\s+(\w+)/g;
            let match;
            while ((match = classRegex.exec(content)) !== null) {
                classes.push(match[1]);
            }
        } else if (language === 'python') {
            const classRegex = /class\s+(\w+)/g;
            let match;
            while ((match = classRegex.exec(content)) !== null) {
                classes.push(match[1]);
            }
        } else if (language === 'csharp') {
            const classRegex = /(?:public|internal)?\s*(?:abstract|sealed)?\s*class\s+(\w+)/g;
            let match;
            while ((match = classRegex.exec(content)) !== null) {
                classes.push(match[1]);
            }
        }

        return classes;
    }

    extractImports(content, language) {
        const imports = [];
        
        if (language === 'javascript' || language === 'typescript') {
            const importRegex = /(?:import\s+.*\s+from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g;
            let match;
            while ((match = importRegex.exec(content)) !== null) {
                imports.push(match[1] || match[2]);
            }
        } else if (language === 'python') {
            const importRegex = /(?:import\s+(\w+)|from\s+(\w+)\s+import)/g;
            let match;
            while ((match = importRegex.exec(content)) !== null) {
                imports.push(match[1] || match[2]);
            }
        } else if (language === 'csharp') {
            const importRegex = /using\s+([^;]+);/g;
            let match;
            while ((match = importRegex.exec(content)) !== null) {
                imports.push(match[1]);
            }
        }

        return imports;
    }

    calculateComplexity(content) {
        // Simple complexity metric based on control structures
        const controlStructures = content.match(/\b(if|else|for|while|switch|case|catch|try)\b/g) || [];
        const functions = content.match(/\bfunction\b|\bdef\b|\bclass\b/g) || [];
        
        return {
            controlStructures: controlStructures.length,
            functions: functions.length,
            linesOfCode: content.split('\n').filter(line => line.trim().length > 0).length,
            score: controlStructures.length + functions.length // Simple complexity score
        };
    }

    // Demo scenario support methods
    explainLegacyCode(analysis) {
        const { functions, classes, complexity, language } = analysis;
        
        let explanation = `This is a ${language} file with:\n`;
        explanation += `- ${functions.length} functions: ${functions.slice(0, 5).join(', ')}${functions.length > 5 ? '...' : ''}\n`;
        explanation += `- ${classes.length} classes: ${classes.join(', ')}\n`;
        explanation += `- Complexity score: ${complexity.score} (${complexity.score > 20 ? 'High' : complexity.score > 10 ? 'Medium' : 'Low'})\n`;
        explanation += `- ${complexity.linesOfCode} lines of code\n`;
        
        return explanation;
    }

    // Utility methods needed by dev-assistant
    isCodeFile(filename) {
        const ext = path.extname(filename).toLowerCase();
        return this.supportedExtensions.hasOwnProperty(ext);
    }

    detectLanguage(content, filename) {
        const ext = path.extname(filename).toLowerCase();
        return this.supportedExtensions[ext] || 'unknown';
    }

    async analyzeDirectory(dirPath) {
        // Simple implementation for compatibility
        return [];
    }

    summarize(analyses) {
        // Simple implementation for compatibility
        return {
            totalFiles: analyses.length,
            totalLines: 0,
            totalFunctions: 0,
            languages: []
        };
    }
}

module.exports = CodeAnalyzer;