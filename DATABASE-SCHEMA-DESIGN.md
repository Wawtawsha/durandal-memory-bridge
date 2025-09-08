# Database Schema Design

## Overview

This document specifies the comprehensive database schema design for Durandal's local storage needs, covering conversation memory, knowledge storage, analytics tracking, and system configuration.

## Design Principles

- **Simple Schema Evolution** - Easy to migrate and extend
- **Performance First** - Optimized for common query patterns
- **Data Integrity** - Foreign keys and constraints where needed
- **Privacy Compliant** - Separate sensitive and non-sensitive data
- **SQLite Foundation** - Start simple, PostgreSQL upgrade path clear

## Schema Architecture

### 1. Core System Tables

#### User Sessions
```sql
-- User session management
CREATE TABLE user_sessions (
    id TEXT PRIMARY KEY,
    user_id_hash TEXT NOT NULL, -- Privacy-safe user identifier
    started_at INTEGER NOT NULL, -- Unix timestamp
    ended_at INTEGER, -- Unix timestamp, NULL if active
    workspace_path TEXT NOT NULL,
    settings TEXT, -- JSON blob for session settings
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id_hash);
CREATE INDEX idx_user_sessions_started_at ON user_sessions(started_at);
```

#### Conversations
```sql
-- Conversation history and context
CREATE TABLE conversations (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    parent_id TEXT, -- For conversation threading
    question TEXT NOT NULL,
    response TEXT NOT NULL,
    context_files TEXT, -- JSON array of file paths
    context_databases TEXT, -- JSON array of database connection IDs
    tokens_used INTEGER,
    response_time_ms INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    
    FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_conversations_session_id ON conversations(session_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at);
CREATE INDEX idx_conversations_parent_id ON conversations(parent_id);

-- Full-text search on conversations
CREATE VIRTUAL TABLE conversations_fts USING fts5(
    question, 
    response, 
    content='conversations',
    content_rowid='rowid'
);
```

### 2. Knowledge Management Tables

#### Files and Documents
```sql
-- Tracked files and their metadata
CREATE TABLE tracked_files (
    id TEXT PRIMARY KEY,
    file_path TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'pdf', 'xlsx', 'js', 'sql', etc.
    file_size INTEGER NOT NULL,
    file_hash TEXT NOT NULL, -- SHA256 for change detection
    parsed_at INTEGER, -- When file was last parsed
    parsing_status TEXT DEFAULT 'pending', -- 'pending', 'success', 'failed'
    parsing_error TEXT, -- Error message if parsing failed
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_tracked_files_path ON tracked_files(file_path);
CREATE INDEX idx_tracked_files_type ON tracked_files(file_type);
CREATE INDEX idx_tracked_files_hash ON tracked_files(file_hash);
```

#### Extracted Knowledge
```sql
-- Knowledge extracted from files and conversations
CREATE TABLE knowledge_items (
    id TEXT PRIMARY KEY,
    source_type TEXT NOT NULL, -- 'file', 'conversation', 'database'
    source_id TEXT NOT NULL, -- ID of source (file_id, conversation_id, etc.)
    knowledge_type TEXT NOT NULL, -- 'coding_standard', 'pattern', 'concept', 'solution'
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    confidence REAL DEFAULT 0.5, -- 0.0 to 1.0 confidence score
    tags TEXT, -- JSON array of tags
    metadata TEXT, -- JSON blob for additional data
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_knowledge_items_source ON knowledge_items(source_type, source_id);
CREATE INDEX idx_knowledge_items_type ON knowledge_items(knowledge_type);
CREATE INDEX idx_knowledge_items_confidence ON knowledge_items(confidence);

-- Full-text search on knowledge
CREATE VIRTUAL TABLE knowledge_fts USING fts5(
    title,
    content,
    tags,
    content='knowledge_items',
    content_rowid='rowid'
);
```

#### Knowledge Relationships
```sql
-- Relationships between knowledge items
CREATE TABLE knowledge_relationships (
    id TEXT PRIMARY KEY,
    from_knowledge_id TEXT NOT NULL,
    to_knowledge_id TEXT NOT NULL,
    relationship_type TEXT NOT NULL, -- 'relates_to', 'contradicts', 'extends', 'implements'
    strength REAL DEFAULT 0.5, -- 0.0 to 1.0 relationship strength
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    
    FOREIGN KEY (from_knowledge_id) REFERENCES knowledge_items(id) ON DELETE CASCADE,
    FOREIGN KEY (to_knowledge_id) REFERENCES knowledge_items(id) ON DELETE CASCADE,
    UNIQUE(from_knowledge_id, to_knowledge_id, relationship_type)
);

CREATE INDEX idx_knowledge_relationships_from ON knowledge_relationships(from_knowledge_id);
CREATE INDEX idx_knowledge_relationships_to ON knowledge_relationships(to_knowledge_id);
```

### 3. Database Connection Management

#### Saved Connections
```sql
-- Database connection configurations
CREATE TABLE database_connections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    connection_type TEXT NOT NULL, -- 'sqlserver', 'postgresql', 'mysql'
    host TEXT NOT NULL,
    port INTEGER NOT NULL,
    database_name TEXT NOT NULL,
    username TEXT, -- For SQL authentication
    encrypted_password TEXT, -- Encrypted password storage
    auth_type TEXT NOT NULL DEFAULT 'sql', -- 'sql', 'windows', 'certificate'
    ssl_config TEXT, -- JSON blob for SSL configuration
    connection_options TEXT, -- JSON blob for additional options
    last_connected_at INTEGER, -- Last successful connection
    last_error TEXT, -- Last connection error
    is_active BOOLEAN DEFAULT true,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_database_connections_type ON database_connections(connection_type);
CREATE INDEX idx_database_connections_active ON database_connections(is_active);
```

#### Database Schema Cache
```sql
-- Cached database schema information
CREATE TABLE database_schemas (
    id TEXT PRIMARY KEY,
    connection_id TEXT NOT NULL,
    schema_name TEXT,
    table_name TEXT NOT NULL,
    table_type TEXT NOT NULL, -- 'table', 'view', 'stored_procedure'
    column_info TEXT, -- JSON blob with column details
    relationships TEXT, -- JSON blob with foreign key relationships
    indexes TEXT, -- JSON blob with index information
    row_count INTEGER, -- Approximate row count
    last_updated INTEGER NOT NULL, -- When schema was cached
    
    FOREIGN KEY (connection_id) REFERENCES database_connections(id) ON DELETE CASCADE,
    UNIQUE(connection_id, schema_name, table_name)
);

CREATE INDEX idx_database_schemas_connection ON database_schemas(connection_id);
CREATE INDEX idx_database_schemas_table ON database_schemas(table_name);
```

### 4. Analytics and Performance Tables

#### Feature Usage Tracking
```sql
-- Feature usage analytics
CREATE TABLE feature_usage (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    feature_name TEXT NOT NULL,
    feature_category TEXT NOT NULL, -- 'core', 'database', 'files', 'advanced'
    usage_context TEXT, -- JSON blob with usage context
    started_at INTEGER NOT NULL,
    completed_at INTEGER,
    success BOOLEAN,
    error_message TEXT,
    
    FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_feature_usage_session ON feature_usage(session_id);
CREATE INDEX idx_feature_usage_feature ON feature_usage(feature_name);
CREATE INDEX idx_feature_usage_started_at ON feature_usage(started_at);
```

#### Performance Metrics
```sql
-- System performance tracking
CREATE TABLE performance_metrics (
    id TEXT PRIMARY KEY,
    operation_type TEXT NOT NULL, -- 'ai_call', 'database_query', 'file_parse', etc.
    operation_details TEXT, -- JSON blob with operation specifics
    start_time INTEGER NOT NULL,
    end_time INTEGER NOT NULL,
    success BOOLEAN NOT NULL,
    error_type TEXT, -- If unsuccessful
    memory_used_mb REAL,
    tokens_used INTEGER, -- For AI operations
    cache_hit BOOLEAN DEFAULT false,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_performance_metrics_operation ON performance_metrics(operation_type);
CREATE INDEX idx_performance_metrics_start_time ON performance_metrics(start_time);
CREATE INDEX idx_performance_metrics_success ON performance_metrics(success);
```

#### Productivity Tracking
```sql
-- Time savings and productivity metrics
CREATE TABLE productivity_events (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'legacy_code_analysis', 'database_exploration', 'code_review'
    traditional_time_estimate INTEGER NOT NULL, -- Estimated traditional approach time (seconds)
    actual_time_taken INTEGER NOT NULL, -- Actual Durandal time (seconds)
    time_saved INTEGER NOT NULL, -- Calculated time savings (seconds)
    improvement_percentage REAL NOT NULL,
    context_data TEXT, -- JSON blob with event context
    user_satisfaction INTEGER, -- 1-5 rating if provided
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    
    FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_productivity_events_session ON productivity_events(session_id);
CREATE INDEX idx_productivity_events_type ON productivity_events(event_type);
CREATE INDEX idx_productivity_events_created_at ON productivity_events(created_at);
```

### 5. Configuration and Preferences

#### User Preferences
```sql
-- User preferences and settings
CREATE TABLE user_preferences (
    id TEXT PRIMARY KEY,
    user_id_hash TEXT NOT NULL,
    preference_category TEXT NOT NULL, -- 'ui', 'ai', 'privacy', 'performance'
    preference_key TEXT NOT NULL,
    preference_value TEXT NOT NULL, -- JSON value
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    
    UNIQUE(user_id_hash, preference_category, preference_key)
);

CREATE INDEX idx_user_preferences_user ON user_preferences(user_id_hash);
CREATE INDEX idx_user_preferences_category ON user_preferences(preference_category);
```

#### System Configuration
```sql
-- System-wide configuration
CREATE TABLE system_config (
    id TEXT PRIMARY KEY,
    config_key TEXT NOT NULL UNIQUE,
    config_value TEXT NOT NULL, -- JSON value
    config_description TEXT,
    is_sensitive BOOLEAN DEFAULT false, -- For password/API key configs
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_system_config_key ON system_config(config_key);
```

### 6. Cache Tables

#### AI Response Cache
```sql
-- Cache for AI responses to avoid redundant API calls
CREATE TABLE ai_response_cache (
    id TEXT PRIMARY KEY,
    prompt_hash TEXT NOT NULL UNIQUE, -- SHA256 of prompt + context
    prompt_preview TEXT NOT NULL, -- First 100 chars for debugging
    response TEXT NOT NULL,
    tokens_used INTEGER NOT NULL,
    model_used TEXT NOT NULL,
    cache_created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    last_accessed_at INTEGER NOT NULL DEFAULT (unixepoch()),
    access_count INTEGER DEFAULT 1
);

CREATE INDEX idx_ai_response_cache_hash ON ai_response_cache(prompt_hash);
CREATE INDEX idx_ai_response_cache_created_at ON ai_response_cache(cache_created_at);
CREATE INDEX idx_ai_response_cache_accessed_at ON ai_response_cache(last_accessed_at);
```

#### File Processing Cache
```sql
-- Cache for processed file results
CREATE TABLE file_processing_cache (
    id TEXT PRIMARY KEY,
    file_path TEXT NOT NULL,
    file_hash TEXT NOT NULL, -- For invalidation when file changes
    processing_type TEXT NOT NULL, -- 'parse', 'analyze', 'extract_metadata'
    processing_options TEXT, -- JSON blob for processing parameters
    result_data TEXT NOT NULL, -- JSON blob with processing results
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    last_accessed_at INTEGER NOT NULL DEFAULT (unixepoch()),
    
    UNIQUE(file_path, file_hash, processing_type)
);

CREATE INDEX idx_file_processing_cache_path ON file_processing_cache(file_path);
CREATE INDEX idx_file_processing_cache_hash ON file_processing_cache(file_hash);
```

## Views for Common Queries

### Analytics Dashboard View
```sql
-- Productivity summary view
CREATE VIEW productivity_summary AS
SELECT 
    DATE(created_at, 'unixepoch', 'localtime') as date,
    event_type,
    COUNT(*) as event_count,
    AVG(time_saved) as avg_time_saved,
    AVG(improvement_percentage) as avg_improvement,
    SUM(time_saved) as total_time_saved
FROM productivity_events
GROUP BY DATE(created_at, 'unixepoch', 'localtime'), event_type;

-- Feature adoption view  
CREATE VIEW feature_adoption AS
SELECT 
    feature_category,
    feature_name,
    COUNT(*) as usage_count,
    COUNT(DISTINCT session_id) as unique_users,
    AVG(CASE WHEN success THEN 1.0 ELSE 0.0 END) as success_rate,
    AVG((completed_at - started_at) / 1000.0) as avg_duration_seconds
FROM feature_usage
WHERE completed_at IS NOT NULL
GROUP BY feature_category, feature_name;

-- Knowledge growth view
CREATE VIEW knowledge_growth AS
SELECT 
    DATE(created_at, 'unixepoch', 'localtime') as date,
    knowledge_type,
    COUNT(*) as items_created,
    AVG(confidence) as avg_confidence
FROM knowledge_items
GROUP BY DATE(created_at, 'unixepoch', 'localtime'), knowledge_type;
```

## Data Migration and Versioning

### Schema Version Tracking
```sql
-- Track schema version for migrations
CREATE TABLE schema_version (
    version INTEGER PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Insert initial version
INSERT INTO schema_version (version, description) 
VALUES (1, 'Initial schema with core tables');
```

### Migration Framework
```javascript
class SchemaMigrator {
    constructor(db) {
        this.db = db;
        this.migrations = new Map();
    }

    addMigration(version, description, upScript, downScript) {
        this.migrations.set(version, {
            version,
            description,
            up: upScript,
            down: downScript
        });
    }

    async getCurrentVersion() {
        try {
            const result = await this.db.get('SELECT MAX(version) as version FROM schema_version');
            return result?.version || 0;
        } catch (error) {
            return 0; // Schema doesn't exist yet
        }
    }

    async migrate() {
        const currentVersion = await this.getCurrentVersion();
        const targetVersion = Math.max(...this.migrations.keys());

        if (currentVersion >= targetVersion) {
            return; // No migration needed
        }

        for (let version = currentVersion + 1; version <= targetVersion; version++) {
            const migration = this.migrations.get(version);
            if (migration) {
                await this.db.exec(migration.up);
                await this.db.run(
                    'INSERT INTO schema_version (version, description) VALUES (?, ?)',
                    [version, migration.description]
                );
                console.log(`Applied migration ${version}: ${migration.description}`);
            }
        }
    }
}
```

## Performance Optimization

### Indexing Strategy
```sql
-- Composite indexes for common query patterns
CREATE INDEX idx_conversations_session_created ON conversations(session_id, created_at);
CREATE INDEX idx_knowledge_items_type_confidence ON knowledge_items(knowledge_type, confidence DESC);
CREATE INDEX idx_feature_usage_session_feature ON feature_usage(session_id, feature_name);
CREATE INDEX idx_performance_metrics_type_time ON performance_metrics(operation_type, start_time);

-- Partial indexes for active records only
CREATE INDEX idx_active_connections ON database_connections(id) WHERE is_active = true;
CREATE INDEX idx_successful_feature_usage ON feature_usage(feature_name, started_at) WHERE success = true;
```

### Query Optimization Examples
```sql
-- Efficient queries for common dashboard needs
-- Get recent conversations with context
SELECT c.id, c.question, c.response, c.created_at,
       tf.file_name, tf.file_type
FROM conversations c
LEFT JOIN json_each(c.context_files) je ON true
LEFT JOIN tracked_files tf ON tf.file_path = je.value
WHERE c.session_id = ? 
ORDER BY c.created_at DESC 
LIMIT 50;

-- Get productivity metrics for last 30 days
SELECT event_type,
       COUNT(*) as event_count,
       AVG(time_saved / 60.0) as avg_minutes_saved,
       SUM(time_saved / 60.0) as total_minutes_saved
FROM productivity_events 
WHERE created_at > unixepoch() - (30 * 24 * 60 * 60)
GROUP BY event_type;

-- Find related knowledge items
SELECT ki.title, ki.content, ki.confidence,
       kr.relationship_type, kr.strength
FROM knowledge_items ki
JOIN knowledge_relationships kr ON ki.id = kr.to_knowledge_id
WHERE kr.from_knowledge_id = ?
ORDER BY kr.strength DESC, ki.confidence DESC;
```

## Data Retention and Cleanup

### Automatic Cleanup Policies
```sql
-- Clean up old cache entries (older than 30 days)
DELETE FROM ai_response_cache 
WHERE cache_created_at < unixepoch() - (30 * 24 * 60 * 60);

DELETE FROM file_processing_cache 
WHERE created_at < unixepoch() - (30 * 24 * 60 * 60);

-- Clean up old performance metrics (older than 90 days)
DELETE FROM performance_metrics 
WHERE created_at < unixepoch() - (90 * 24 * 60 * 60);

-- Vacuum after cleanup
VACUUM;
```

## PostgreSQL Upgrade Path

When migrating to PostgreSQL for enterprise features:

```sql
-- Enhanced features available in PostgreSQL
-- JSON/JSONB columns for better performance
ALTER TABLE conversations 
ALTER COLUMN context_files TYPE JSONB USING context_files::JSONB;

-- Full-text search with PostgreSQL
CREATE INDEX idx_conversations_fts ON conversations 
USING GIN(to_tsvector('english', question || ' ' || response));

-- Partitioning for large tables
CREATE TABLE productivity_events_partitioned (
    LIKE productivity_events INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- UUID primary keys for better distribution
ALTER TABLE conversations ADD COLUMN uuid UUID DEFAULT gen_random_uuid();
```

This schema design provides a solid foundation for all Durandal features while maintaining performance and allowing for future growth and enterprise requirements.