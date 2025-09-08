class QueryClassifier {
    constructor() {
        this.patterns = {
            'code-generation': [
                /write.*function/i,
                /create.*class/i,
                /implement.*method/i,
                /generate.*code/i,
                /build.*script/i,
                /refactor/i
            ],
            'explanation': [
                /explain/i,
                /what.*does/i,
                /how.*works/i,
                /why.*this/i,
                /describe/i,
                /understand/i
            ],
            'simple-question': [
                /^(yes|no|true|false)/i,
                /^(what|when|where|who|which)/i,
                /\?$/,
                /quick.*question/i
            ],
            'documentation': [
                /document/i,
                /readme/i,
                /comment/i,
                /spec/i,
                /api.*docs/i
            ],
            'debugging': [
                /debug/i,
                /error/i,
                /bug/i,
                /fix.*issue/i,
                /troubleshoot/i,
                /not.*working/i
            ],
            'analysis': [
                /analyze/i,
                /review/i,
                /audit/i,
                /performance/i,
                /optimize/i,
                /security/i
            ]
        };
        
        this.tokenLimits = {
            'code-generation': 8192,
            'explanation': 4096,
            'simple-question': 1024,
            'documentation': 16384,
            'debugging': 6144,
            'analysis': 12288,
            'default': 4096
        };
    }

    classifyQuery(message) {
        const text = message.toLowerCase();
        
        for (const [type, patterns] of Object.entries(this.patterns)) {
            for (const pattern of patterns) {
                if (pattern.test(text)) {
                    return type;
                }
            }
        }
        
        return 'default';
    }

    getOptimalTokens(message, contextSize = 0) {
        const queryType = this.classifyQuery(message);
        let baseTokens = this.tokenLimits[queryType];
        
        // Adjust based on context size
        if (contextSize > 50000) {
            baseTokens = Math.min(baseTokens * 1.5, 16384);
        } else if (contextSize > 20000) {
            baseTokens = Math.min(baseTokens * 1.25, 12288);
        }
        
        return {
            queryType,
            maxTokens: Math.floor(baseTokens),
            reasoning: `Query classified as '${queryType}', context size: ${contextSize} chars`
        };
    }

    shouldUseExtendedOutput(message, contextSize) {
        const massiveRefactorPatterns = [
            /massive.*refactor/i,
            /rewrite.*entire/i,
            /complete.*overhaul/i,
            /generate.*full.*application/i
        ];
        
        return massiveRefactorPatterns.some(pattern => pattern.test(message)) && 
               contextSize > 100000;
    }
}

module.exports = QueryClassifier;