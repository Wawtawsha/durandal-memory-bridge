/**
 * Simple File Manager - Handle file operations without complexity
 * Clean, minimal implementation for reading, writing, and managing files
 */

const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');
const XLSX = require('xlsx');
const csv = require('csv-parser');
const xml2js = require('xml2js');
const { createReadStream } = require('fs');

class FileManager {
    constructor(workspaceRoot = process.cwd()) {
        this.workspaceRoot = workspaceRoot;
        this.supportedExtensions = [
            '.js', '.ts', '.py', '.sql', '.cs', '.cpp', '.c', '.h',
            '.json', '.xml', '.yml', '.yaml', '.md', '.txt',
            '.pdf', '.docx', '.xlsx', '.csv'
        ];
    }

    async readFile(filePath) {
        try {
            const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.workspaceRoot, filePath);
            const content = await fs.readFile(fullPath, 'utf8');
            const stats = await fs.stat(fullPath);
            
            return {
                content,
                path: fullPath,
                relativePath: path.relative(this.workspaceRoot, fullPath),
                extension: path.extname(fullPath),
                size: stats.size,
                modified: stats.mtime,
                name: path.basename(fullPath)
            };
        } catch (error) {
            throw new Error(`Failed to read file ${filePath}: ${error.message}`);
        }
    }

    async writeFile(filePath, content) {
        try {
            const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.workspaceRoot, filePath);
            await fs.mkdir(path.dirname(fullPath), { recursive: true });
            await fs.writeFile(fullPath, content, 'utf8');
            
            return {
                path: fullPath,
                relativePath: path.relative(this.workspaceRoot, fullPath),
                size: Buffer.byteLength(content, 'utf8')
            };
        } catch (error) {
            throw new Error(`Failed to write file ${filePath}: ${error.message}`);
        }
    }

    async listFiles(directory = '', extensions = []) {
        try {
            const fullDir = path.isAbsolute(directory) ? directory : path.join(this.workspaceRoot, directory);
            const entries = await fs.readdir(fullDir, { withFileTypes: true });
            const files = [];

            for (const entry of entries) {
                const fullPath = path.join(fullDir, entry.name);
                const relativePath = path.relative(this.workspaceRoot, fullPath);
                
                if (entry.isFile()) {
                    const ext = path.extname(entry.name);
                    const extensionsArray = Array.isArray(extensions) ? extensions : [];
                    const shouldInclude = extensionsArray.length === 0 || 
                                        extensionsArray.includes(ext) || 
                                        this.supportedExtensions.includes(ext);
                    
                    if (shouldInclude) {
                        const stats = await fs.stat(fullPath);
                        files.push({
                            name: entry.name,
                            path: fullPath,
                            relativePath: relativePath,
                            extension: ext,
                            size: stats.size,
                            modified: stats.mtime
                        });
                    }
                } else if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                    // Recursively list subdirectories (with depth limit)
                    const subFiles = await this.listFiles(path.join(directory, entry.name), extensions);
                    files.push(...subFiles);
                }
            }

            return files.sort((a, b) => a.name.localeCompare(b.name));
        } catch (error) {
            throw new Error(`Failed to list files in ${directory}: ${error.message}`);
        }
    }

    async findFiles(pattern, directory = '') {
        try {
            const files = await this.listFiles(directory);
            const regex = new RegExp(pattern, 'i');
            
            return files.filter(file => 
                regex.test(file.name) || regex.test(file.relativePath)
            );
        } catch (error) {
            throw new Error(`Failed to find files matching ${pattern}: ${error.message}`);
        }
    }

    async getFileInfo(filePath) {
        try {
            const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.workspaceRoot, filePath);
            const stats = await fs.stat(fullPath);
            
            return {
                path: fullPath,
                relativePath: path.relative(this.workspaceRoot, fullPath),
                name: path.basename(fullPath),
                extension: path.extname(fullPath),
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                isFile: stats.isFile(),
                isDirectory: stats.isDirectory()
            };
        } catch (error) {
            throw new Error(`Failed to get file info for ${filePath}: ${error.message}`);
        }
    }

    async exists(filePath) {
        try {
            const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.workspaceRoot, filePath);
            await fs.access(fullPath);
            return true;
        } catch {
            return false;
        }
    }

    async createDirectory(dirPath) {
        try {
            const fullPath = path.isAbsolute(dirPath) ? dirPath : path.join(this.workspaceRoot, dirPath);
            await fs.mkdir(fullPath, { recursive: true });
            return fullPath;
        } catch (error) {
            throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
        }
    }

    // Demo scenario support methods
    async findLegacyFiles(keywords = []) {
        const allFiles = await this.listFiles('', ['.js', '.ts', '.py', '.cs', '.sql']);
        const legacyPatterns = [...keywords, 'legacy', 'old', 'deprecated', 'todo', 'fixme'];
        
        const results = [];
        for (const file of allFiles) {
            try {
                const { content } = await this.readFile(file.relativePath);
                const hasLegacyMarkers = legacyPatterns.some(pattern => 
                    content.toLowerCase().includes(pattern.toLowerCase())
                );
                
                if (hasLegacyMarkers) {
                    results.push({
                        ...file,
                        legacyMarkers: legacyPatterns.filter(pattern => 
                            content.toLowerCase().includes(pattern.toLowerCase())
                        )
                    });
                }
            } catch {
                // Skip files that can't be read
            }
        }
        
        return results;
    }

    // Get workspace overview for context
    async getWorkspaceOverview() {
        const files = await this.listFiles();
        const overview = {
            totalFiles: files.length,
            languages: {},
            directories: new Set(),
            totalSize: 0
        };

        files.forEach(file => {
            overview.totalSize += file.size;
            overview.directories.add(path.dirname(file.relativePath));
            
            const lang = this.getLanguageFromExtension(file.extension);
            overview.languages[lang] = (overview.languages[lang] || 0) + 1;
        });

        overview.directories = Array.from(overview.directories).sort();
        
        return overview;
    }

    getLanguageFromExtension(ext) {
        const mapping = {
            '.js': 'JavaScript',
            '.ts': 'TypeScript',
            '.py': 'Python',
            '.sql': 'SQL',
            '.cs': 'C#',
            '.cpp': 'C++',
            '.c': 'C',
            '.json': 'JSON',
            '.xml': 'XML',
            '.md': 'Markdown'
        };
        return mapping[ext] || 'Other';
    }

    // Additional methods needed by dev-assistant
    getFullPath(relativePath) {
        return path.isAbsolute(relativePath) ? relativePath : path.join(this.workspaceRoot, relativePath);
    }

    async searchFiles(query, dirPath = '') {
        // Simple search implementation
        const files = await this.listFiles(dirPath);
        const results = [];
        
        for (const file of files) {
            try {
                const { content } = await this.readFile(file.relativePath);
                const matches = [];
                const lines = content.split('\n');
                
                lines.forEach((line, index) => {
                    if (line.toLowerCase().includes(query.toLowerCase())) {
                        matches.push({
                            line: index + 1,
                            content: line.trim()
                        });
                    }
                });
                
                if (matches.length > 0) {
                    results.push({
                        file: file.relativePath,
                        matches: matches.slice(0, 10) // Limit matches
                    });
                }
            } catch {
                // Skip files that can't be read
            }
        }
        
        return results;
    }

    async executeCode(code, language = 'javascript') {
        // Mock implementation - would need actual execution environment
        return {
            stdout: 'Mock execution result',
            stderr: '',
            exitCode: 0
        };
    }

    // Phase 2: Enhanced File Processing Methods

    async readFileAdvanced(filePath) {
        try {
            const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.workspaceRoot, filePath);
            const extension = path.extname(fullPath).toLowerCase();
            const stats = await fs.stat(fullPath);
            
            const baseInfo = {
                path: fullPath,
                relativePath: path.relative(this.workspaceRoot, fullPath),
                extension,
                size: stats.size,
                modified: stats.mtime,
                name: path.basename(fullPath)
            };

            switch (extension) {
                case '.pdf':
                    return await this.processPDF(fullPath, baseInfo);
                case '.xlsx':
                case '.xls':
                    return await this.processExcel(fullPath, baseInfo);
                case '.csv':
                    return await this.processCSV(fullPath, baseInfo);
                case '.xml':
                    return await this.processXML(fullPath, baseInfo);
                case '.log':
                    return await this.processLogFile(fullPath, baseInfo);
                default:
                    // Fall back to standard text reading
                    const content = await fs.readFile(fullPath, 'utf8');
                    return { ...baseInfo, content, type: 'text' };
            }
        } catch (error) {
            throw new Error(`Failed to read file ${filePath}: ${error.message}`);
        }
    }

    async processPDF(filePath, baseInfo) {
        try {
            const dataBuffer = await fs.readFile(filePath);
            const pdfData = await pdfParse(dataBuffer);
            
            return {
                ...baseInfo,
                type: 'pdf',
                content: pdfData.text,
                metadata: {
                    pages: pdfData.numpages,
                    info: pdfData.info,
                    textLength: pdfData.text.length,
                    hasText: pdfData.text.length > 0
                }
            };
        } catch (error) {
            throw new Error(`PDF processing failed: ${error.message}`);
        }
    }

    async processExcel(filePath, baseInfo) {
        try {
            const workbook = XLSX.readFile(filePath);
            const sheets = {};
            const summary = {
                sheetNames: workbook.SheetNames,
                totalSheets: workbook.SheetNames.length,
                totalRows: 0,
                totalCols: 0
            };

            for (const sheetName of workbook.SheetNames) {
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                const csvData = XLSX.utils.sheet_to_csv(worksheet);
                
                sheets[sheetName] = {
                    data: jsonData.slice(0, 100), // Limit data for performance
                    headers: jsonData[0] || [],
                    rowCount: jsonData.length,
                    colCount: jsonData[0] ? jsonData[0].length : 0,
                    csv: csvData.length > 10000 ? csvData.slice(0, 10000) + '...' : csvData
                };

                summary.totalRows += jsonData.length;
                summary.totalCols = Math.max(summary.totalCols, jsonData[0] ? jsonData[0].length : 0);
            }

            return {
                ...baseInfo,
                type: 'excel',
                content: `Excel file with ${summary.totalSheets} sheets, ${summary.totalRows} total rows`,
                sheets,
                summary
            };
        } catch (error) {
            throw new Error(`Excel processing failed: ${error.message}`);
        }
    }

    async processCSV(filePath, baseInfo) {
        try {
            const results = [];
            let headers = [];
            let rowCount = 0;

            return new Promise((resolve, reject) => {
                createReadStream(filePath)
                    .pipe(csv())
                    .on('headers', (headerList) => {
                        headers = headerList;
                    })
                    .on('data', (data) => {
                        if (rowCount < 100) { // Limit rows for performance
                            results.push(data);
                        }
                        rowCount++;
                    })
                    .on('end', () => {
                        const csvContent = results.length > 0 ? 
                            results.map(row => Object.values(row).join(',')).join('\n') :
                            'Empty CSV file';

                        resolve({
                            ...baseInfo,
                            type: 'csv',
                            content: `CSV file with ${rowCount} rows, ${headers.length} columns`,
                            data: results,
                            headers,
                            summary: {
                                totalRows: rowCount,
                                totalColumns: headers.length,
                                preview: csvContent.slice(0, 1000) + (csvContent.length > 1000 ? '...' : '')
                            }
                        });
                    })
                    .on('error', (error) => {
                        reject(new Error(`CSV processing failed: ${error.message}`));
                    });
            });
        } catch (error) {
            throw new Error(`CSV processing failed: ${error.message}`);
        }
    }

    async processXML(filePath, baseInfo) {
        try {
            const xmlContent = await fs.readFile(filePath, 'utf8');
            const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
            const result = await parser.parseStringPromise(xmlContent);
            
            return {
                ...baseInfo,
                type: 'xml',
                content: xmlContent,
                parsed: result,
                summary: {
                    rootElement: Object.keys(result)[0],
                    structure: this.analyzeXMLStructure(result),
                    size: xmlContent.length
                }
            };
        } catch (error) {
            throw new Error(`XML processing failed: ${error.message}`);
        }
    }

    async processLogFile(filePath, baseInfo) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const lines = content.split('\n');
            
            const analysis = this.analyzeLogFile(lines);
            
            return {
                ...baseInfo,
                type: 'log',
                content: content.length > 10000 ? content.slice(0, 10000) + '...' : content,
                analysis,
                summary: {
                    totalLines: lines.length,
                    errorCount: analysis.errors.length,
                    warningCount: analysis.warnings.length,
                    timeSpan: analysis.timeSpan
                }
            };
        } catch (error) {
            throw new Error(`Log processing failed: ${error.message}`);
        }
    }

    analyzeXMLStructure(obj, depth = 0, maxDepth = 3) {
        if (depth > maxDepth || typeof obj !== 'object') {
            return '[...]';
        }

        const structure = {};
        for (const [key, value] of Object.entries(obj)) {
            if (Array.isArray(value)) {
                structure[key] = `[Array of ${value.length} items]`;
            } else if (typeof value === 'object' && value !== null) {
                structure[key] = this.analyzeXMLStructure(value, depth + 1, maxDepth);
            } else {
                structure[key] = typeof value;
            }
        }
        return structure;
    }

    analyzeLogFile(lines) {
        const errors = [];
        const warnings = [];
        const patterns = {
            timestamp: /(\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2})/,
            error: /\b(error|ERROR|Error|exception|EXCEPTION|Exception|failed|FAILED|Failed)\b/,
            warning: /\b(warning|WARNING|Warning|warn|WARN|Warn)\b/,
            info: /\b(info|INFO|Info|information|INFORMATION|Information)\b/
        };

        let firstTimestamp = null;
        let lastTimestamp = null;

        lines.forEach((line, index) => {
            const timestampMatch = line.match(patterns.timestamp);
            if (timestampMatch) {
                const timestamp = timestampMatch[1];
                if (!firstTimestamp) firstTimestamp = timestamp;
                lastTimestamp = timestamp;
            }

            if (patterns.error.test(line)) {
                errors.push({ line: index + 1, content: line.trim() });
            } else if (patterns.warning.test(line)) {
                warnings.push({ line: index + 1, content: line.trim() });
            }
        });

        return {
            errors: errors.slice(0, 20), // Limit for performance
            warnings: warnings.slice(0, 20),
            timeSpan: firstTimestamp && lastTimestamp ? 
                `${firstTimestamp} to ${lastTimestamp}` : 
                'Unknown time span',
            patterns: {
                hasTimestamps: firstTimestamp !== null,
                errorPattern: patterns.error.toString(),
                warningPattern: patterns.warning.toString()
            }
        };
    }

    // Enhanced file type detection for Phase 2
    getFileType(filePath) {
        const extension = path.extname(filePath).toLowerCase();
        const typeMap = {
            '.pdf': 'PDF Document',
            '.xlsx': 'Excel Spreadsheet',
            '.xls': 'Excel Spreadsheet (Legacy)',
            '.csv': 'CSV Data File',
            '.xml': 'XML Configuration',
            '.log': 'Log File',
            '.json': 'JSON Configuration',
            '.yaml': 'YAML Configuration',
            '.yml': 'YAML Configuration',
            '.js': 'JavaScript Code',
            '.ts': 'TypeScript Code',
            '.py': 'Python Code',
            '.sql': 'SQL Script',
            '.md': 'Markdown Document'
        };
        return typeMap[extension] || 'Unknown File Type';
    }
}

module.exports = FileManager;