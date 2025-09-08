/**
 * Workspace Selector UI Component
 * Clean, modern interface for workspace management
 */

class WorkspaceSelectorUI {
    constructor(container) {
        this.container = container;
        this.currentWorkspace = null;
        this.render();
        this.attachEventListeners();
        this.loadCurrentWorkspace();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="workspace-selector">
                <div class="workspace-header">
                    <h3>📁 Project Workspace</h3>
                    <span class="current-workspace" id="current-workspace-path">
                        Loading...
                    </span>
                </div>
                
                <!-- Workspace Input Section -->
                <div class="workspace-input-section">
                    <div class="input-group">
                        <input 
                            type="text" 
                            id="workspace-path-input" 
                            placeholder="Enter project path (e.g., C:/my-projects/awesome-app)"
                            value=""
                        />
                        <button id="browse-btn" class="btn-secondary">📂 Browse</button>
                        <button id="validate-btn" class="btn-primary">✓ Validate</button>
                    </div>
                    
                    <!-- Validation Status -->
                    <div class="validation-status" id="validation-status"></div>
                </div>
                
                <!-- Recent Workspaces -->
                <div class="recent-workspaces-section">
                    <h4>📋 Recent Projects</h4>
                    <div class="recent-workspaces-list" id="recent-workspaces-list">
                        <div class="loading">Loading recent workspaces...</div>
                    </div>
                </div>
                
                <!-- Project Info Preview -->
                <div class="project-info-section">
                    <h4>📊 Project Information</h4>
                    <div class="project-info" id="project-info">
                        <div class="no-info">Select a workspace to see project details</div>
                    </div>
                </div>
                
                <!-- Action Buttons -->
                <div class="action-buttons">
                    <button id="set-workspace-btn" class="btn-success" disabled>
                        🚀 Set as Workspace
                    </button>
                    <button id="reset-workspace-btn" class="btn-secondary">
                        🔄 Reset to Default
                    </button>
                </div>
            </div>
        `;
        
        this.loadRecentWorkspaces();
        this.addStyles();
    }
    
    addStyles() {
        const styles = `
            <style>
            .workspace-selector {
                max-width: 800px;
                margin: 20px auto;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .workspace-header {
                margin-bottom: 24px;
                padding-bottom: 16px;
                border-bottom: 2px solid #e9ecef;
            }
            
            .workspace-header h3 {
                margin: 0 0 8px 0;
                color: #2c3e50;
                font-size: 1.4em;
            }
            
            .current-workspace {
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                background: #e3f2fd;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 0.9em;
                color: #1565c0;
                display: inline-block;
                max-width: 100%;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .workspace-input-section {
                margin-bottom: 32px;
            }
            
            .input-group {
                display: flex;
                gap: 12px;
                margin-bottom: 12px;
                align-items: center;
            }
            
            #workspace-path-input {
                flex: 1;
                padding: 12px 16px;
                border: 2px solid #dee2e6;
                border-radius: 8px;
                font-size: 1em;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                transition: border-color 0.2s ease;
            }
            
            #workspace-path-input:focus {
                outline: none;
                border-color: #007bff;
                box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
            }
            
            .btn-primary, .btn-secondary, .btn-success {
                padding: 12px 20px;
                border: none;
                border-radius: 8px;
                font-size: 0.95em;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                white-space: nowrap;
            }
            
            .btn-primary {
                background: #007bff;
                color: white;
            }
            
            .btn-primary:hover:not(:disabled) {
                background: #0056b3;
                transform: translateY(-1px);
            }
            
            .btn-secondary {
                background: #6c757d;
                color: white;
            }
            
            .btn-secondary:hover:not(:disabled) {
                background: #545b62;
                transform: translateY(-1px);
            }
            
            .btn-success {
                background: #28a745;
                color: white;
            }
            
            .btn-success:hover:not(:disabled) {
                background: #1e7e34;
                transform: translateY(-1px);
            }
            
            button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .validation-status {
                min-height: 24px;
                font-size: 0.9em;
                padding: 8px 0;
            }
            
            .validation-success {
                color: #28a745;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .validation-error {
                color: #dc3545;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .validation-warning {
                color: #ffc107;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .recent-workspaces-section, .project-info-section {
                margin-bottom: 24px;
            }
            
            .recent-workspaces-section h4, .project-info-section h4 {
                margin: 0 0 12px 0;
                color: #495057;
                font-size: 1.1em;
            }
            
            .recent-workspace-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                margin-bottom: 8px;
                background: white;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                border: 1px solid #e9ecef;
            }
            
            .recent-workspace-item:hover {
                background: #e3f2fd;
                border-color: #2196f3;
                transform: translateY(-1px);
            }
            
            .workspace-item-info {
                flex: 1;
            }
            
            .workspace-item-path {
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                font-size: 0.9em;
                color: #2c3e50;
                margin-bottom: 4px;
            }
            
            .workspace-item-meta {
                font-size: 0.8em;
                color: #6c757d;
                display: flex;
                gap: 16px;
            }
            
            .workspace-item-actions {
                display: flex;
                gap: 8px;
            }
            
            .project-info {
                background: white;
                padding: 16px;
                border-radius: 8px;
                border: 1px solid #e9ecef;
            }
            
            .project-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 16px;
                margin-bottom: 16px;
            }
            
            .project-stat {
                text-align: center;
                padding: 12px;
                background: #f8f9fa;
                border-radius: 6px;
            }
            
            .project-stat-value {
                font-size: 1.5em;
                font-weight: bold;
                color: #2c3e50;
            }
            
            .project-stat-label {
                font-size: 0.9em;
                color: #6c757d;
                margin-top: 4px;
            }
            
            .project-languages {
                margin-top: 16px;
            }
            
            .language-tag {
                display: inline-block;
                background: #e3f2fd;
                color: #1565c0;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 0.8em;
                margin: 2px;
            }
            
            .action-buttons {
                display: flex;
                gap: 16px;
                justify-content: center;
                padding-top: 16px;
                border-top: 1px solid #e9ecef;
            }
            
            .no-info, .loading {
                text-align: center;
                color: #6c757d;
                padding: 20px;
                font-style: italic;
            }
            
            @media (max-width: 768px) {
                .input-group {
                    flex-direction: column;
                }
                
                .workspace-item-meta {
                    flex-direction: column;
                    gap: 4px;
                }
                
                .action-buttons {
                    flex-direction: column;
                }
            }
            </style>
        `;
        
        if (!document.querySelector('#workspace-selector-styles')) {
            const styleElement = document.createElement('div');
            styleElement.id = 'workspace-selector-styles';
            styleElement.innerHTML = styles;
            document.head.appendChild(styleElement);
        }
    }
    
    attachEventListeners() {
        // Path input validation
        const pathInput = document.getElementById('workspace-path-input');
        const validateBtn = document.getElementById('validate-btn');
        const setWorkspaceBtn = document.getElementById('set-workspace-btn');
        
        validateBtn.addEventListener('click', () => this.validateWorkspace());
        setWorkspaceBtn.addEventListener('click', () => this.setWorkspace());
        
        // Reset workspace
        document.getElementById('reset-workspace-btn').addEventListener('click', () => {
            this.resetWorkspace();
        });
        
        // Browse button (for desktop apps)
        document.getElementById('browse-btn').addEventListener('click', () => {
            this.browseForWorkspace();
        });
        
        // Real-time validation on input
        pathInput.addEventListener('input', () => {
            const path = pathInput.value.trim();
            if (path.length > 3) {
                this.debounce(() => this.validateWorkspace(), 500)();
            }
        });
        
        // Enter key to validate
        pathInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.validateWorkspace();
            }
        });
    }
    
    async loadRecentWorkspaces() {
        const listContainer = document.getElementById('recent-workspaces-list');
        
        try {
            // In a real implementation, this would call the backend
            const response = await fetch('/api/workspace/recent');
            const recentWorkspaces = await response.json();
            
            if (recentWorkspaces.length === 0) {
                listContainer.innerHTML = '<div class="no-info">No recent workspaces found</div>';
                return;
            }
            
            listContainer.innerHTML = recentWorkspaces.map(workspace => `
                <div class="recent-workspace-item" data-path="${workspace.path}">
                    <div class="workspace-item-info">
                        <div class="workspace-item-path">${workspace.displayName}</div>
                        <div class="workspace-item-meta">
                            <span>📁 ${workspace.totalFiles} files</span>
                            <span>💻 ${workspace.languages.join(', ')}</span>
                            <span>🕒 ${this.formatDate(workspace.lastUsed)}</span>
                        </div>
                    </div>
                    <div class="workspace-item-actions">
                        <button class="btn-primary btn-sm" onclick="workspaceSelector.selectRecentWorkspace('${workspace.path}')">
                            Select
                        </button>
                    </div>
                </div>
            `).join('');
            
        } catch (error) {
            listContainer.innerHTML = '<div class="validation-error">⚠️ Failed to load recent workspaces</div>';
        }
    }
    
    async validateWorkspace() {
        const pathInput = document.getElementById('workspace-path-input');
        const statusDiv = document.getElementById('validation-status');
        const setBtn = document.getElementById('set-workspace-btn');
        
        const path = pathInput.value.trim();
        
        if (!path) {
            statusDiv.innerHTML = '';
            setBtn.disabled = true;
            return;
        }
        
        statusDiv.innerHTML = '🔄 Validating workspace...';
        
        try {
            // Call backend validation
            const response = await fetch('/api/workspace/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path })
            });
            
            const result = await response.json();
            
            if (result.valid) {
                statusDiv.innerHTML = `
                    <div class="validation-success">
                        ✅ Valid workspace detected
                        ${result.warnings.length > 0 ? '<br>⚠️ ' + result.warnings.join(', ') : ''}
                    </div>
                `;
                setBtn.disabled = false;
                this.showProjectInfo(result.projectInfo);
            } else {
                statusDiv.innerHTML = `
                    <div class="validation-error">
                        ❌ ${result.error}
                    </div>
                `;
                setBtn.disabled = true;
                this.clearProjectInfo();
            }
            
        } catch (error) {
            statusDiv.innerHTML = `
                <div class="validation-error">
                    ❌ Validation failed: ${error.message}
                </div>
            `;
            setBtn.disabled = true;
        }
    }
    
    async setWorkspace() {
        const pathInput = document.getElementById('workspace-path-input');
        const path = pathInput.value.trim();
        
        if (!path) return;
        
        try {
            const response = await fetch('/api/workspace/set', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Update UI to reflect new workspace
                document.getElementById('current-workspace-path').textContent = result.path;
                this.showSuccessMessage('✅ Workspace successfully updated!');
                this.loadRecentWorkspaces(); // Refresh recent list
                
                // Trigger workspace change event for other components
                this.dispatchWorkspaceChangeEvent(result.path);
                
            } else {
                this.showErrorMessage('❌ Failed to set workspace: ' + result.error);
            }
            
        } catch (error) {
            this.showErrorMessage('❌ Request failed: ' + error.message);
        }
    }
    
    selectRecentWorkspace(path) {
        document.getElementById('workspace-path-input').value = path;
        this.validateWorkspace();
    }
    
    resetWorkspace() {
        // Reset to default workspace
        fetch('/api/workspace/reset', { method: 'POST' })
            .then(response => response.json())
            .then(result => {
                document.getElementById('current-workspace-path').textContent = result.path;
                document.getElementById('workspace-path-input').value = '';
                this.clearValidationStatus();
                this.clearProjectInfo();
                this.showSuccessMessage('🔄 Workspace reset to default');
            })
            .catch(error => {
                this.showErrorMessage('❌ Reset failed: ' + error.message);
            });
    }
    
    browseForWorkspace() {
        // For desktop apps using Electron
        if (typeof window.electronAPI !== 'undefined') {
            window.electronAPI.selectDirectory()
                .then(result => {
                    if (!result.canceled && result.filePaths.length > 0) {
                        document.getElementById('workspace-path-input').value = result.filePaths[0];
                        this.validateWorkspace();
                    }
                });
        } else {
            // For web apps - show file input
            const input = document.createElement('input');
            input.type = 'file';
            input.webkitdirectory = true;
            input.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    const path = e.target.files[0].webkitRelativePath.split('/')[0];
                    document.getElementById('workspace-path-input').value = path;
                    this.validateWorkspace();
                }
            });
            input.click();
        }
    }
    
    showProjectInfo(projectInfo) {
        const infoDiv = document.getElementById('project-info');
        
        infoDiv.innerHTML = `
            <div class="project-stats">
                <div class="project-stat">
                    <div class="project-stat-value">${projectInfo.totalFiles}</div>
                    <div class="project-stat-label">Total Files</div>
                </div>
                <div class="project-stat">
                    <div class="project-stat-value">${projectInfo.codeFiles}</div>
                    <div class="project-stat-label">Code Files</div>
                </div>
                <div class="project-stat">
                    <div class="project-stat-value">${projectInfo.languages.length}</div>
                    <div class="project-stat-label">Languages</div>
                </div>
                <div class="project-stat">
                    <div class="project-stat-value">${projectInfo.hasConfigFile ? '✅' : '❌'}</div>
                    <div class="project-stat-label">Config Files</div>
                </div>
            </div>
            
            ${projectInfo.languages.length > 0 ? `
                <div class="project-languages">
                    <strong>Languages detected:</strong><br>
                    ${projectInfo.languages.map(lang => `<span class="language-tag">${lang}</span>`).join('')}
                </div>
            ` : ''}
        `;
    }
    
    clearProjectInfo() {
        document.getElementById('project-info').innerHTML = '<div class="no-info">Select a workspace to see project details</div>';
    }
    
    clearValidationStatus() {
        document.getElementById('validation-status').innerHTML = '';
        document.getElementById('set-workspace-btn').disabled = true;
    }
    
    showSuccessMessage(message) {
        // Create temporary notification
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
    
    showErrorMessage(message) {
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }
    
    dispatchWorkspaceChangeEvent(newPath) {
        // Notify other components about workspace change
        const event = new CustomEvent('workspaceChanged', {
            detail: { newPath }
        });
        window.dispatchEvent(event);
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        
        return date.toLocaleDateString();
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    async loadCurrentWorkspace() {
        try {
            const response = await fetch('/api/workspace/current');
            const data = await response.json();
            
            if (data && data.path) {
                document.getElementById('current-workspace-path').textContent = data.path;
                this.currentWorkspace = data.path;
            } else {
                document.getElementById('current-workspace-path').textContent = 'No workspace set';
            }
        } catch (error) {
            console.error('Failed to load current workspace:', error);
            document.getElementById('current-workspace-path').textContent = 'Error loading workspace';
        }
    }
}

// Make it globally accessible for onclick handlers
let workspaceSelector;