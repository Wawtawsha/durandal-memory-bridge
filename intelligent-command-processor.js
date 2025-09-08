const EventEmitter = require('events');

/**
 * Intelligent Command Processor - Smart command processing and suggestions for Phase 3
 * 
 * Provides intelligent command processing capabilities:
 * - Smart command suggestion based on context and history
 * - Auto-completion for commands and parameters
 * - Command validation and error prevention
 * - Context-aware command routing and orchestration
 * - Learning from user patterns and preferences
 * - Natural language command interpretation
 */
class IntelligentCommandProcessor extends EventEmitter {
    constructor(contextCommands, knowledgeSystem, monitoringSystem, options = {}) {
        super();
        
        this.contextCommands = contextCommands;
        this.knowledgeSystem = knowledgeSystem;
        this.monitoringSystem = monitoringSystem;
        
        this.config = {
            enableSuggestions: true,
            enableAutoComplete: true,
            enableNLProcessing: true,
            suggestionThreshold: 0.7,
            maxSuggestions: 5,
            learningEnabled: true,
            contextAwareness: true,
            ...options
        };
        
        // Command registry - aggregates all available commands
        this.commandRegistry = new Map();
        this.commandCategories = new Map([
            ['context', { description: 'Context management commands', priority: 1 }],
            ['knowledge', { description: 'Knowledge base operations', priority: 2 }],
            ['monitoring', { description: 'System monitoring and diagnostics', priority: 3 }],
            ['meta', { description: 'Meta commands and help', priority: 4 }]
        ]);
        
        // Learning and pattern recognition
        this.commandHistory = [];
        this.userPatterns = new Map(); // pattern -> frequency
        this.contextPatterns = new Map(); // context -> preferred commands
        this.commandUsageStats = new Map(); // command -> usage stats
        
        // Natural language processing patterns
        this.nlPatterns = new Map([
            // Context commands
            [/(?:switch|change|use).*(revolutionary|maximum|aggressive|intelligent).*(mode|context)/i, 'context-mode'],
            [/(?:show|display|check).*(context|mode).*(status|info)/i, '/cs'],
            [/(?:optimize|improve).*(context|performance)/i, '/oc'],
            
            // Knowledge commands  
            [/(?:search|find|lookup).*(knowledge|info)/i, 'knowledge-search'],
            [/(?:show|display).*(knowledge|stats|statistics)/i, '/kstats'],
            [/(?:review|check|analyze).*(knowledge|artifacts)/i, '/kr'],
            [/(?:extract|save).*(knowledge|info)/i, '/kextract'],
            
            // Monitoring commands
            [/(?:show|display|check).*(system|health|status)/i, '/health'],
            [/(?:monitor|watch).*(system|performance)/i, '/sysmon'],
            [/(?:check|show).*(performance|metrics)/i, '/perf'],
            [/(?:diagnose|analyze|debug).*(system|issues)/i, '/diag'],
            [/(?:show|check).*(alerts|warnings)/i, '/alerts'],
            
            // Help and meta
            [/(?:help|assist|guide)/i, '/help'],
            [/(?:list|show).*(commands|options)/i, '/commands']
        ]);
        
        // Command suggestions based on context
        this.contextualSuggestions = new Map([
            ['error_context', ['/health', '/diag', '/alerts', '/trace']],
            ['performance_context', ['/perf', '/benchmark', '/sysmon', '/mc']],
            ['knowledge_context', ['/ks', '/kr', '/kstats', '/kextract']],
            ['development_context', ['/rm', '/ac', '/diag', '/trace']],
            ['startup_context', ['/health', '/sysmon', '/cs', '/help']]
        ]);
        
        // Session state
        this.sessionStats = {
            commandsProcessed: 0,
            suggestionsOffered: 0,
            suggestionsAccepted: 0,
            nlCommandsProcessed: 0,
            startTime: Date.now()
        };
        
        // Delay initialization to reduce memory pressure during startup
        this.initialized = false;
        this.delayedInitialize();
        
        console.log('🧠 IntelligentCommandProcessor initialized with AI-powered assistance');
    }

    /**
     * Delayed initialization to reduce memory pressure during startup
     */
    delayedInitialize() {
        // Initialize after startup to reduce memory pressure
        setTimeout(() => {
            this.initialize();
        }, 5000); // 5 second delay
    }

    /**
     * Initialize the command processor
     */
    initialize() {
        if (this.initialized) return;
        this.initialized = true;
        
        // Register commands from all systems
        this.registerCommands();
        
        // Set up natural language processing
        this.setupNLProcessing();
        
        // Start learning patterns
        this.startPatternLearning();
        
        console.log(`🧠 Command processor ready with ${this.commandRegistry.size} commands`);
    }

    /**
     * Register commands from all subsystems
     */
    registerCommands() {
        // Context commands
        if (this.contextCommands && this.contextCommands.getAvailableCommands) {
            this.contextCommands.getAvailableCommands().forEach(cmd => {
                this.commandRegistry.set(cmd.command.substring(1), {
                    ...cmd,
                    category: 'context',
                    handler: this.contextCommands.processCommand.bind(this.contextCommands),
                    system: 'contextCommands'
                });
            });
        }
        
        // Knowledge commands
        if (this.knowledgeSystem && this.knowledgeSystem.getAvailableCommands) {
            this.knowledgeSystem.getAvailableCommands().forEach(cmd => {
                this.commandRegistry.set(cmd.command.substring(1), {
                    ...cmd,
                    category: 'knowledge',
                    handler: this.knowledgeSystem.processCommand.bind(this.knowledgeSystem),
                    system: 'knowledgeSystem'
                });
            });
        }
        
        // Monitoring commands
        if (this.monitoringSystem && this.monitoringSystem.getAvailableCommands) {
            this.monitoringSystem.getAvailableCommands().forEach(cmd => {
                this.commandRegistry.set(cmd.command.substring(1), {
                    ...cmd,
                    category: 'monitoring',
                    handler: this.monitoringSystem.processCommand.bind(this.monitoringSystem),
                    system: 'monitoringSystem'
                });
            });
        }
        
        // Meta commands
        this.commandRegistry.set('help', {
            command: '/help',
            description: 'Show available commands and intelligent assistance',
            category: 'meta',
            handler: this.handleHelp.bind(this),
            system: 'processor'
        });
        
        this.commandRegistry.set('commands', {
            command: '/commands',
            description: 'List all available commands with categories',
            category: 'meta',
            handler: this.handleCommands.bind(this),
            system: 'processor'
        });
        
        this.commandRegistry.set('suggest', {
            command: '/suggest',
            description: 'Get intelligent command suggestions for current context',
            category: 'meta',
            handler: this.handleSuggest.bind(this),
            system: 'processor'
        });
        
        this.commandRegistry.set('learn', {
            command: '/learn',
            description: 'Show learned patterns and preferences',
            category: 'meta',
            handler: this.handleLearn.bind(this),
            system: 'processor'
        });
    }

    /**
     * Process a command with intelligent assistance
     */
    async processCommand(input, conversationHistory = [], projectContext = null) {
        // Ensure initialization is complete
        if (!this.initialized) {
            await this.initialize();
        }
        
        const startTime = Date.now();
        this.sessionStats.commandsProcessed++;
        
        try {
            // First, try natural language processing
            if (!input.startsWith('/') && this.config.enableNLProcessing) {
                const nlResult = await this.processNaturalLanguage(input, conversationHistory, projectContext);
                if (nlResult.handled) {
                    this.sessionStats.nlCommandsProcessed++;
                    return nlResult;
                }
            }
            
            // Standard command processing
            if (!input.startsWith('/')) {
                return { handled: false, suggestions: this.getSuggestionsForInput(input, conversationHistory) };
            }
            
            const parts = input.substring(1).split(' ');
            const command = parts[0].toLowerCase();
            const args = parts.slice(1);
            
            // Track command usage
            this.trackCommandUsage(command, conversationHistory, projectContext);
            
            // Find command in registry
            const commandInfo = this.commandRegistry.get(command);
            if (!commandInfo) {
                return await this.handleUnknownCommand(command, args, conversationHistory, projectContext);
            }
            
            // Validate command before execution
            const validation = this.validateCommand(commandInfo, args, conversationHistory);
            if (!validation.valid) {
                console.log(`⚠️  Command validation failed: ${validation.reason}`);
                if (validation.suggestions) {
                    console.log(`💡 Did you mean: ${validation.suggestions.join(', ')}`);
                }
                return { handled: true, success: false, error: validation.reason, suggestions: validation.suggestions };
            }
            
            // Execute command
            const handled = await commandInfo.handler(input, conversationHistory, projectContext);
            
            if (handled) {
                // Learn from successful command execution
                this.learnFromExecution(command, conversationHistory, projectContext, true);
                
                // Offer contextual suggestions
                const suggestions = this.getContextualSuggestions(command, conversationHistory);
                if (suggestions.length > 0) {
                    this.offerSuggestions(suggestions);
                }
                
                const duration = Date.now() - startTime;
                this.emit('command:processed', { 
                    command, 
                    success: true, 
                    duration, 
                    system: commandInfo.system 
                });
                
                return { handled: true, success: true, duration, suggestions };
            } else {
                return { handled: false };
            }
            
        } catch (error) {
            this.learnFromExecution(command, conversationHistory, projectContext, false);
            console.error('🧠 Command processing failed:', error.message);
            
            this.emit('command:processed', { 
                command: input, 
                success: false, 
                error: error.message 
            });
            
            return { 
                handled: true, 
                success: false, 
                error: error.message,
                suggestions: this.getRecoveryCommands(input, error)
            };
        }
    }

    /**
     * Process natural language input
     */
    async processNaturalLanguage(input, conversationHistory, projectContext) {
        console.log('🧠 Processing natural language input...');
        
        // Try to match against NL patterns
        for (const [pattern, commandHint] of this.nlPatterns) {
            if (pattern.test(input)) {
                console.log(`💡 Natural language detected: "${input}" → ${commandHint}`);
                
                let command;
                if (commandHint === 'context-mode') {
                    // Determine which context mode was mentioned
                    if (/revolutionary/i.test(input)) command = '/rm';
                    else if (/maximum/i.test(input)) command = '/mc';
                    else if (/aggressive/i.test(input)) command = '/ac';
                    else command = '/ic';
                } else if (commandHint === 'knowledge-search') {
                    // Extract search terms
                    const searchMatch = input.match(/(?:search|find|lookup)\s+(?:for\s+)?(.+?)(?:\s+in|\s+from|$)/i);
                    const searchTerm = searchMatch ? searchMatch[1].trim() : '';
                    command = `/ks ${searchTerm}`;
                } else {
                    command = commandHint;
                }
                
                console.log(`🎯 Executing interpreted command: ${command}`);
                return await this.processCommand(command, conversationHistory, projectContext);
            }
        }
        
        // If no pattern matched, offer suggestions based on keywords
        const suggestions = this.analyzeNLForSuggestions(input);
        if (suggestions.length > 0) {
            console.log('💡 Natural language suggestions:');
            suggestions.forEach(suggestion => {
                console.log(`   ${suggestion.command}: ${suggestion.reason}`);
            });
            
            this.sessionStats.suggestionsOffered += suggestions.length;
        }
        
        return { handled: false, nlProcessed: true, suggestions };
    }

    /**
     * Handle unknown commands with intelligent suggestions
     */
    async handleUnknownCommand(command, args, conversationHistory, projectContext) {
        console.log(`❓ Unknown command: /${command}`);
        
        // Find similar commands
        const suggestions = this.findSimilarCommands(command);
        
        if (suggestions.length > 0) {
            console.log('💡 Did you mean:');
            suggestions.forEach(suggestion => {
                console.log(`   /${suggestion.command}: ${suggestion.description}`);
            });
            
            this.sessionStats.suggestionsOffered += suggestions.length;
        } else {
            console.log('💡 No similar commands found. Try /help or /commands for available options.');
        }
        
        // Offer contextual alternatives
        const contextual = this.getContextualSuggestions('unknown', conversationHistory);
        if (contextual.length > 0) {
            console.log('\n🎯 Based on your context, you might want:');
            contextual.forEach(cmd => {
                const info = this.commandRegistry.get(cmd.substring(1));
                if (info) {
                    console.log(`   ${cmd}: ${info.description}`);
                }
            });
        }
        
        return { 
            handled: true, 
            success: false, 
            error: `Unknown command: /${command}`,
            suggestions: suggestions.map(s => s.command)
        };
    }

    /**
     * Validate command before execution
     */
    validateCommand(commandInfo, args, conversationHistory) {
        // Basic validation
        const validation = { valid: true, reason: null, suggestions: [] };
        
        // Check if command requires specific conditions
        if (commandInfo.category === 'knowledge' && this.knowledgeSystem === null) {
            validation.valid = false;
            validation.reason = 'Knowledge system not available';
            validation.suggestions = ['/health', '/diag'];
            return validation;
        }
        
        if (commandInfo.category === 'monitoring' && this.monitoringSystem === null) {
            validation.valid = false;
            validation.reason = 'Monitoring system not available';
            validation.suggestions = ['/help', '/commands'];
            return validation;
        }
        
        // Context-specific validation
        if (commandInfo.command === '/kr' && args.includes('--execute') && conversationHistory.length === 0) {
            validation.valid = false;
            validation.reason = 'Destructive knowledge operations require conversation context';
            validation.suggestions = ['/kr', '/kstats'];
            return validation;
        }
        
        return validation;
    }

    /**
     * Track command usage for learning
     */
    trackCommandUsage(command, conversationHistory, projectContext) {
        // Update usage statistics
        const stats = this.commandUsageStats.get(command) || {
            count: 0,
            lastUsed: null,
            contexts: new Set(),
            effectiveness: 1.0
        };
        
        stats.count++;
        stats.lastUsed = Date.now();
        
        // Track context
        const context = this.analyzeContext(conversationHistory, projectContext);
        stats.contexts.add(context);
        
        this.commandUsageStats.set(command, stats);
        
        // Update command history
        this.commandHistory.push({
            command,
            timestamp: Date.now(),
            context,
            conversationLength: conversationHistory.length
        });
        
        // Keep history manageable
        if (this.commandHistory.length > 1000) {
            this.commandHistory = this.commandHistory.slice(-500);
        }
    }

    /**
     * Learn from command execution results
     */
    learnFromExecution(command, conversationHistory, projectContext, success) {
        const stats = this.commandUsageStats.get(command);
        if (stats) {
            // Adjust effectiveness based on success
            if (success) {
                stats.effectiveness = Math.min(1.0, stats.effectiveness + 0.05);
            } else {
                stats.effectiveness = Math.max(0.1, stats.effectiveness - 0.1);
            }
            
            this.commandUsageStats.set(command, stats);
        }
        
        // Learn patterns
        const context = this.analyzeContext(conversationHistory, projectContext);
        const pattern = `${context}:${command}`;
        
        if (success) {
            const frequency = this.userPatterns.get(pattern) || 0;
            this.userPatterns.set(pattern, frequency + 1);
            
            // Update contextual preferences
            const contextCommands = this.contextPatterns.get(context) || new Map();
            const commandFreq = contextCommands.get(command) || 0;
            contextCommands.set(command, commandFreq + 1);
            this.contextPatterns.set(context, contextCommands);
        }
    }

    /**
     * Get contextual suggestions based on current state
     */
    getContextualSuggestions(currentCommand, conversationHistory) {
        const context = this.analyzeContext(conversationHistory);
        const suggestions = [];
        
        // Get suggestions from context patterns
        const contextSugs = this.contextualSuggestions.get(context) || [];
        suggestions.push(...contextSugs);
        
        // Get suggestions from learned patterns
        const learnedPrefs = this.contextPatterns.get(context);
        if (learnedPrefs) {
            const topCommands = Array.from(learnedPrefs.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([cmd, _]) => `/${cmd}`);
            suggestions.push(...topCommands);
        }
        
        // Command-specific follow-ups
        const followUps = this.getCommandFollowUps(currentCommand);
        suggestions.push(...followUps);
        
        // Remove duplicates and filter out current command
        const unique = [...new Set(suggestions)]
            .filter(cmd => cmd !== `/${currentCommand}`)
            .slice(0, this.config.maxSuggestions);
        
        return unique;
    }

    /**
     * Offer suggestions to the user
     */
    offerSuggestions(suggestions) {
        if (!this.config.enableSuggestions || suggestions.length === 0) return;
        
        console.log('\n💡 Suggested next commands:');
        suggestions.forEach((suggestion, index) => {
            const commandInfo = this.commandRegistry.get(suggestion.substring(1));
            const description = commandInfo ? commandInfo.description : 'Command';
            console.log(`   ${index + 1}. ${suggestion} - ${description}`);
        });
        
        this.sessionStats.suggestionsOffered += suggestions.length;
    }

    /**
     * Analyze context from conversation and project state
     */
    analyzeContext(conversationHistory, projectContext) {
        if (!conversationHistory || conversationHistory.length === 0) {
            return 'startup_context';
        }
        
        const recentMessages = conversationHistory.slice(-5);
        const content = recentMessages.map(m => m.content || '').join(' ').toLowerCase();
        
        if (/error|fail|bug|issue|problem/i.test(content)) {
            return 'error_context';
        }
        
        if (/slow|performance|speed|optimize/i.test(content)) {
            return 'performance_context';
        }
        
        if (/knowledge|learn|remember|extract|search/i.test(content)) {
            return 'knowledge_context';
        }
        
        if (/implement|develop|code|create|build/i.test(content)) {
            return 'development_context';
        }
        
        return 'general_context';
    }

    /**
     * Find similar commands using string similarity
     */
    findSimilarCommands(input) {
        const similarities = [];
        
        for (const [command, info] of this.commandRegistry) {
            const similarity = this.calculateStringSimilarity(input, command);
            if (similarity > 0.4) {
                similarities.push({
                    command,
                    description: info.description,
                    similarity
                });
            }
        }
        
        return similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, this.config.maxSuggestions);
    }

    /**
     * Calculate string similarity (Levenshtein distance-based)
     */
    calculateStringSimilarity(a, b) {
        const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
        
        for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
        
        for (let j = 1; j <= b.length; j++) {
            for (let i = 1; i <= a.length; i++) {
                const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + substitutionCost
                );
            }
        }
        
        const maxLength = Math.max(a.length, b.length);
        return 1 - (matrix[b.length][a.length] / maxLength);
    }

    /**
     * Analyze natural language for command suggestions
     */
    analyzeNLForSuggestions(input) {
        const suggestions = [];
        const lower = input.toLowerCase();
        
        // Keyword-based suggestions
        if (/status|health|check/i.test(input)) {
            suggestions.push({ command: '/health', reason: 'System health check keywords detected' });
        }
        
        if (/performance|slow|speed/i.test(input)) {
            suggestions.push({ command: '/perf', reason: 'Performance-related keywords detected' });
        }
        
        if (/search|find|lookup/i.test(input)) {
            suggestions.push({ command: '/ks', reason: 'Search-related keywords detected' });
        }
        
        if (/help|assist|guide/i.test(input)) {
            suggestions.push({ command: '/help', reason: 'Help keywords detected' });
        }
        
        return suggestions;
    }

    /**
     * Get command-specific follow-up suggestions
     */
    getCommandFollowUps(command) {
        const followUps = {
            'health': ['/diag', '/perf', '/alerts'],
            'perf': ['/benchmark', '/sysmon', '/trace'],
            'ks': ['/kstats', '/kr', '/kextract'],
            'rm': ['/cs', '/perf', '/health'],
            'mc': ['/cs', '/benchmark'],
            'ac': ['/cs', '/health'],
            'sysmon': ['/alerts', '/perf', '/health'],
            'diag': ['/health', '/alerts', '/trace']
        };
        
        return followUps[command] || [];
    }

    /**
     * Get recovery commands for error scenarios
     */
    getRecoveryCommands(failedCommand, error) {
        return ['/health', '/help', '/commands'];
    }

    // Meta command handlers

    async handleHelp(args, conversationHistory, projectContext) {
        console.log('🧠 INTELLIGENT COMMAND ASSISTANCE');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Show intelligent features
        console.log('🤖 AI-Powered Features:');
        console.log('   • Natural language command interpretation');
        console.log('   • Context-aware command suggestions');
        console.log('   • Pattern learning from your usage');
        console.log('   • Auto-completion and error prevention');
        console.log('   • Smart command routing and validation');
        
        // Show command categories
        console.log('\n📂 Command Categories:');
        for (const [category, info] of this.commandCategories) {
            const commands = Array.from(this.commandRegistry.values())
                .filter(cmd => cmd.category === category)
                .length;
            console.log(`   ${category.toUpperCase()}: ${commands} commands - ${info.description}`);
        }
        
        // Show natural language examples
        console.log('\n💬 Natural Language Examples:');
        console.log('   "switch to revolutionary mode" → /rm');
        console.log('   "search for authentication info" → /ks authentication');
        console.log('   "show system health" → /health');
        console.log('   "check performance metrics" → /perf');
        
        // Show contextual suggestions
        const context = this.analyzeContext(conversationHistory, projectContext);
        const suggestions = this.getContextualSuggestions('help', conversationHistory);
        
        if (suggestions.length > 0) {
            console.log('\n💡 Recommended for your current context:');
            suggestions.forEach(cmd => {
                const info = this.commandRegistry.get(cmd.substring(1));
                if (info) {
                    console.log(`   ${cmd}: ${info.description}`);
                }
            });
        }
        
        console.log('\n📚 More Information:');
        console.log('   /commands - List all available commands');
        console.log('   /suggest - Get smart suggestions for current context');
        console.log('   /learn - View your usage patterns and preferences');
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return true;
    }

    async handleCommands(args, conversationHistory, projectContext) {
        const category = args[0];
        
        console.log('📋 AVAILABLE COMMANDS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        if (category) {
            // Show commands for specific category
            const categoryCommands = Array.from(this.commandRegistry.values())
                .filter(cmd => cmd.category === category);
            
            if (categoryCommands.length === 0) {
                console.log(`❌ No commands found for category: ${category}`);
                console.log('Available categories:', Array.from(this.commandCategories.keys()).join(', '));
                return true;
            }
            
            console.log(`📂 ${category.toUpperCase()} COMMANDS:\n`);
            
            categoryCommands
                .sort((a, b) => a.command.localeCompare(b.command))
                .forEach(cmd => {
                    const usage = this.commandUsageStats.get(cmd.command.substring(1));
                    const usageInfo = usage ? ` (used ${usage.count} times)` : '';
                    console.log(`   ${cmd.command}: ${cmd.description}${usageInfo}`);
                });
        } else {
            // Show all commands by category
            for (const [categoryName, categoryInfo] of this.commandCategories) {
                const categoryCommands = Array.from(this.commandRegistry.values())
                    .filter(cmd => cmd.category === categoryName)
                    .sort((a, b) => a.command.localeCompare(b.command));
                
                if (categoryCommands.length > 0) {
                    console.log(`\n📂 ${categoryName.toUpperCase()} - ${categoryInfo.description}:`);
                    categoryCommands.forEach(cmd => {
                        console.log(`   ${cmd.command}: ${cmd.description}`);
                    });
                }
            }
        }
        
        console.log('\n💡 Usage Tips:');
        console.log('   • Use natural language: "show system health"');
        console.log('   • Tab completion available for command names');
        console.log('   • Context-aware suggestions after each command');
        console.log('   • Use /suggest for intelligent recommendations');
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return true;
    }

    async handleSuggest(args, conversationHistory, projectContext) {
        console.log('🎯 INTELLIGENT COMMAND SUGGESTIONS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        const context = this.analyzeContext(conversationHistory, projectContext);
        console.log(`🔍 Current Context: ${context}`);
        
        // Get contextual suggestions
        const contextual = this.getContextualSuggestions('suggest', conversationHistory);
        
        if (contextual.length > 0) {
            console.log('\n🎯 Contextual Recommendations:');
            contextual.forEach((cmd, index) => {
                const info = this.commandRegistry.get(cmd.substring(1));
                if (info) {
                    const usage = this.commandUsageStats.get(cmd.substring(1));
                    const effectiveness = usage ? ` (${(usage.effectiveness * 100).toFixed(0)}% effective)` : '';
                    console.log(`   ${index + 1}. ${cmd}: ${info.description}${effectiveness}`);
                }
            });
        }
        
        // Show popular commands
        const popular = Array.from(this.commandUsageStats.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5);
        
        if (popular.length > 0) {
            console.log('\n📈 Your Most Used Commands:');
            popular.forEach(([cmd, stats]) => {
                const info = this.commandRegistry.get(cmd);
                if (info) {
                    console.log(`   /${cmd}: ${stats.count} times (${(stats.effectiveness * 100).toFixed(0)}% effective)`);
                }
            });
        }
        
        // Show learning insights
        if (this.userPatterns.size > 0) {
            console.log('\n🧠 Learned Patterns:');
            const topPatterns = Array.from(this.userPatterns.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);
            
            topPatterns.forEach(([pattern, frequency]) => {
                const [context, command] = pattern.split(':');
                console.log(`   In ${context}, you often use /${command} (${frequency} times)`);
            });
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return true;
    }

    async handleLearn(args, conversationHistory, projectContext) {
        console.log('🧠 LEARNING & PATTERN ANALYSIS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Session statistics
        const uptime = Date.now() - this.sessionStats.startTime;
        console.log('📊 Session Statistics:');
        console.log(`   Commands Processed: ${this.sessionStats.commandsProcessed}`);
        console.log(`   Natural Language Commands: ${this.sessionStats.nlCommandsProcessed}`);
        console.log(`   Suggestions Offered: ${this.sessionStats.suggestionsOffered}`);
        console.log(`   Suggestions Accepted: ${this.sessionStats.suggestionsAccepted}`);
        console.log(`   Session Uptime: ${Math.round(uptime / 1000)}s`);
        
        // Usage patterns
        if (this.commandUsageStats.size > 0) {
            console.log('\n📈 Command Usage Analysis:');
            const sortedCommands = Array.from(this.commandUsageStats.entries())
                .sort((a, b) => b[1].count - a[1].count);
            
            sortedCommands.slice(0, 10).forEach(([cmd, stats]) => {
                const effectiveness = (stats.effectiveness * 100).toFixed(0);
                const lastUsed = stats.lastUsed ? 
                    new Date(stats.lastUsed).toLocaleTimeString() : 'Never';
                console.log(`   /${cmd}: ${stats.count} uses, ${effectiveness}% effective, last: ${lastUsed}`);
            });
        }
        
        // Context patterns
        if (this.contextPatterns.size > 0) {
            console.log('\n🎯 Context Preferences:');
            for (const [context, commands] of this.contextPatterns) {
                const topCommand = Array.from(commands.entries())
                    .sort((a, b) => b[1] - a[1])[0];
                if (topCommand) {
                    console.log(`   ${context}: prefers /${topCommand[0]} (${topCommand[1]} times)`);
                }
            }
        }
        
        // Learning recommendations
        console.log('\n💡 Learning Insights:');
        if (this.sessionStats.suggestionsOffered > 0) {
            const acceptanceRate = (this.sessionStats.suggestionsAccepted / this.sessionStats.suggestionsOffered * 100).toFixed(1);
            console.log(`   Suggestion acceptance rate: ${acceptanceRate}%`);
        }
        
        if (this.sessionStats.nlCommandsProcessed > 0) {
            const nlRate = (this.sessionStats.nlCommandsProcessed / this.sessionStats.commandsProcessed * 100).toFixed(1);
            console.log(`   Natural language usage: ${nlRate}%`);
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return true;
    }

    // Pattern learning and startup
    startPatternLearning() {
        // Periodically analyze patterns and optimize suggestions
        setInterval(() => {
            this.optimizePatterns();
        }, 300000); // Every 5 minutes
    }

    optimizePatterns() {
        // Remove low-frequency patterns
        for (const [pattern, frequency] of this.userPatterns) {
            if (frequency < 2) {
                this.userPatterns.delete(pattern);
            }
        }
        
        // Update suggestion weights based on effectiveness
        for (const [command, stats] of this.commandUsageStats) {
            if (stats.effectiveness < 0.3) {
                // Consider deprioritizing this command in suggestions
                stats.effectiveness = Math.max(0.1, stats.effectiveness - 0.05);
            }
        }
    }

    setupNLProcessing() {
        // Initialize natural language processing capabilities
        console.log('🧠 Natural language processing ready');
    }

    getSuggestionsForInput(input, conversationHistory) {
        // Analyze input and provide relevant suggestions
        const suggestions = this.analyzeNLForSuggestions(input);
        return suggestions.map(s => s.command);
    }

    // Public API
    getAvailableCommands() {
        return Array.from(this.commandRegistry.values()).map(cmd => ({
            command: cmd.command,
            description: cmd.description,
            category: cmd.category
        }));
    }

    getSessionStats() {
        return {
            ...this.sessionStats,
            uptime: Date.now() - this.sessionStats.startTime,
            commandsRegistered: this.commandRegistry.size,
            patternsLearned: this.userPatterns.size
        };
    }

    getProcessorStats() {
        return {
            session: this.getSessionStats(),
            patterns: {
                total: this.userPatterns.size,
                contexts: this.contextPatterns.size,
                commands: this.commandUsageStats.size
            },
            capabilities: {
                naturalLanguage: this.config.enableNLProcessing,
                suggestions: this.config.enableSuggestions,
                learning: this.config.learningEnabled,
                contextAware: this.config.contextAwareness
            }
        };
    }
}

module.exports = IntelligentCommandProcessor;