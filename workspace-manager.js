/**
 * Workspace Manager - Handle user workspace selection and validation
 * Clean, minimal implementation for flexible project management
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class WorkspaceManager {
    constructor() {
        this.currentWorkspace = process.cwd();
        this.recentWorkspaces = new Map(); // path -> metadata
        this.configPath = path.join(os.homedir(), '.devassistant-workspaces.json');
        this.maxRecentWorkspaces = 10;
        
        // Load saved workspaces on startup
        this.loadSavedWorkspaces();
    }
    
    /**
     * Set and validate a new workspace
     */
    async setWorkspace(workspacePath) {
        try {
            // 1. Path validation
            const resolvedPath = path.resolve(workspacePath);
            const stats = await fs.stat(resolvedPath);
            
            if (!stats.isDirectory()) {
                throw new Error('Path is not a directory');
            }
            
            // 2. Project validation - check if it contains code
            const projectInfo = await this.analyzeWorkspace(resolvedPath);
            
            if (projectInfo.codeFiles === 0) {
                console.warn('⚠️  No code files detected in workspace');
            }
            
            // 3. Update current workspace
            this.currentWorkspace = resolvedPath;
            
            // 4. Add to recent workspaces
            await this.addToRecentWorkspaces(resolvedPath, projectInfo);
            
            console.log(`✅ Workspace set to: ${resolvedPath}`);
            console.log(`📊 Project info: ${projectInfo.totalFiles} files, ${projectInfo.languages.length} languages`);
            
            return {
                success: true,
                path: resolvedPath,
                projectInfo
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                path: workspacePath
            };
        }
    }
    
    /**
     * Analyze workspace to determine if it's a valid project
     */
    async analyzeWorkspace(workspacePath) {
        const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.go', '.rs', '.php', '.rb', '.swift', '.kt'];
        const configFiles = ['package.json', 'pom.xml', 'Cargo.toml', 'requirements.txt', 'composer.json', 'go.mod'];
        const languages = new Set();
        
        let totalFiles = 0;
        let codeFiles = 0;
        let hasConfigFile = false;
        
        try {
            const files = await this.getAllFiles(workspacePath);
            
            for (const file of files) {
                totalFiles++;
                const ext = path.extname(file).toLowerCase();
                const basename = path.basename(file);
                
                // Check for code files
                if (codeExtensions.includes(ext)) {
                    codeFiles++;
                    languages.add(this.getLanguageFromExtension(ext));
                }
                
                // Check for config files
                if (configFiles.includes(basename)) {
                    hasConfigFile = true;
                }
            }
            
            return {
                path: workspacePath,
                totalFiles,
                codeFiles,
                languages: Array.from(languages),
                hasConfigFile,
                isValidProject: codeFiles > 0 || hasConfigFile,
                lastAnalyzed: new Date().toISOString()
            };
            
        } catch (error) {
            throw new Error(`Failed to analyze workspace: ${error.message}`);
        }
    }
    
    /**
     * Get all files in directory recursively
     */
    async getAllFiles(directory) {
        const files = [];
        const maxFiles = 1000; // Prevent overwhelming analysis
        
        async function traverse(dir, depth = 0) {
            if (depth > 10 || files.length >= maxFiles) return; // Prevent infinite recursion
            
            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    
                    // Skip hidden files and common ignore patterns
                    if (entry.name.startsWith('.') || 
                        ['node_modules', 'dist', 'build', '__pycache__', 'target'].includes(entry.name)) {
                        continue;
                    }
                    
                    if (entry.isDirectory()) {
                        await traverse(fullPath, depth + 1);
                    } else if (entry.isFile()) {
                        files.push(fullPath);
                    }
                }
            } catch (error) {
                // Skip directories that can't be read
                console.warn(`⚠️  Skipping directory: ${dir}`);
            }
        }
        
        await traverse(directory);
        return files;
    }
    
    /**
     * Map file extension to programming language
     */
    getLanguageFromExtension(ext) {
        const languageMap = {
            '.js': 'JavaScript',
            '.ts': 'TypeScript', 
            '.jsx': 'React',
            '.tsx': 'React TypeScript',
            '.py': 'Python',
            '.java': 'Java',
            '.cpp': 'C++',
            '.c': 'C',
            '.cs': 'C#',
            '.go': 'Go',
            '.rs': 'Rust',
            '.php': 'PHP',
            '.rb': 'Ruby',
            '.swift': 'Swift',
            '.kt': 'Kotlin'
        };
        
        return languageMap[ext] || ext.substring(1).toUpperCase();
    }
    
    /**
     * Add workspace to recent workspaces
     */
    async addToRecentWorkspaces(workspacePath, projectInfo) {
        this.recentWorkspaces.set(workspacePath, {
            ...projectInfo,
            lastUsed: new Date().toISOString(),
            displayName: path.basename(workspacePath)
        });
        
        // Keep only the most recent workspaces
        if (this.recentWorkspaces.size > this.maxRecentWorkspaces) {
            const entries = Array.from(this.recentWorkspaces.entries());
            entries.sort((a, b) => new Date(b[1].lastUsed) - new Date(a[1].lastUsed));
            
            this.recentWorkspaces.clear();
            entries.slice(0, this.maxRecentWorkspaces).forEach(([path, info]) => {
                this.recentWorkspaces.set(path, info);
            });
        }
        
        await this.saveWorkspaces();
    }
    
    /**
     * Get recent workspaces for UI
     */
    getRecentWorkspaces() {
        const workspaces = Array.from(this.recentWorkspaces.entries()).map(([path, info]) => ({
            path,
            displayName: info.displayName,
            lastUsed: info.lastUsed,
            totalFiles: info.totalFiles,
            languages: info.languages,
            isValidProject: info.isValidProject
        }));
        
        // Sort by last used (most recent first)
        return workspaces.sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed));
    }
    
    /**
     * Load saved workspaces from config file
     */
    async loadSavedWorkspaces() {
        try {
            const data = await fs.readFile(this.configPath, 'utf8');
            const saved = JSON.parse(data);
            
            if (saved.recentWorkspaces) {
                this.recentWorkspaces = new Map(saved.recentWorkspaces);
            }
            
            if (saved.currentWorkspace && await this.pathExists(saved.currentWorkspace)) {
                this.currentWorkspace = saved.currentWorkspace;
            }
            
            console.log(`📁 Loaded ${this.recentWorkspaces.size} recent workspaces`);
            
        } catch (error) {
            // Config file doesn't exist or is invalid - use defaults
            console.log('📁 No saved workspaces found, starting fresh');
        }
    }
    
    /**
     * Save workspaces to config file
     */
    async saveWorkspaces() {
        try {
            const config = {
                currentWorkspace: this.currentWorkspace,
                recentWorkspaces: Array.from(this.recentWorkspaces.entries()),
                lastSaved: new Date().toISOString()
            };
            
            await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
            
        } catch (error) {
            console.warn('⚠️  Failed to save workspace config:', error.message);
        }
    }
    
    /**
     * Check if path exists
     */
    async pathExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * Get current workspace info
     */
    getCurrentWorkspace() {
        return {
            path: this.currentWorkspace,
            metadata: this.recentWorkspaces.get(this.currentWorkspace) || null
        };
    }
    
    /**
     * Validate workspace path without setting it
     */
    async validateWorkspace(workspacePath) {
        try {
            const resolvedPath = path.resolve(workspacePath);
            const stats = await fs.stat(resolvedPath);
            
            if (!stats.isDirectory()) {
                return { valid: false, error: 'Path is not a directory' };
            }
            
            const projectInfo = await this.analyzeWorkspace(resolvedPath);
            
            return {
                valid: true,
                path: resolvedPath,
                projectInfo,
                warnings: projectInfo.codeFiles === 0 ? ['No code files detected'] : []
            };
            
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }
    
    /**
     * Reset to default workspace
     */
    resetToDefault() {
        this.currentWorkspace = process.cwd();
        console.log(`🔄 Reset workspace to: ${this.currentWorkspace}`);
        return this.currentWorkspace;
    }
}

module.exports = WorkspaceManager;