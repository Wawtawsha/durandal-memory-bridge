# Simplified MCP Server Architecture

## Overview

This document outlines the refactored MCP server architecture that eliminates AI dependencies while providing hooks for future automatic intelligent features (RAMR, Knowledge Analyzer, Selective Attention).

## Core Principles

1. **Data-Only MCP Server**: No AI processing, pure data persistence layer
2. **Intelligence via Metadata**: Claude Code provides enriched metadata that drives automatic behaviors
3. **Event-Driven Extensibility**: Future features integrate through events and hooks
4. **Rule-Based Automation**: Intelligent behaviors use metadata-driven rules, not AI inference

## Architecture Diagram

```
Claude Code (AI Processing)
    ↓ (enriched content + metadata)
MCP Server (Data Layer)
    ↓ (events & hooks)
Automatic Features (Rule-Based)
    ↓ (updates metadata)
Database (Persistent Storage)
```

## Enriched Memory Model

### Core Memory Structure
```javascript
{
  id: "uuid",
  content: "raw content",
  metadata: {
    // === AI-Generated Intelligence (from Claude Code) ===
    importance: 0.8,                    // 0.0-1.0 importance score
    categories: ["code", "pattern"],     // semantic categories
    embeddings: [0.1, 0.2, ...],       // vector embeddings
    relationships: [                     // semantic relationships
      {type: "related_to", target: "memory_id", strength: 0.7},
      {type: "implements", target: "memory_id", strength: 0.9}
    ],
    summary: "concise summary",          // AI-generated summary
    keywords: ["auth", "security"],      // extracted keywords

    // === Automatic Feature Metadata ===
    ramr: {
      cache_priority: "high",           // high/medium/low
      prefetch_related: true,           // auto-prefetch flag
      access_pattern: {
        frequency: 5,                   // access count
        last_access: timestamp,         // last access time
        trending: true                  // trending indicator
      }
    },

    selective_attention: {
      retain: true,                     // retention decision
      reason: "high_importance",        // retention reason
      review_date: timestamp,           // next review date
      archive_candidate: false,         // archival candidate
      attention_score: 0.85            // attention priority
    },

    knowledge_graph: {
      node_type: "code_pattern",        // graph node type
      cluster: "auth_patterns",         // semantic cluster
      centrality_score: 0.8,           // graph centrality
      connections: ["mem1", "mem2"]    // connected memories
    }
  },

  // === System Metadata ===
  project: "project_name",
  session: "session_id",
  created_at: timestamp,
  updated_at: timestamp,
  version: 1
}
```

## Future Automatic Features

### 1. RAMR (Rapid Access Memory Register)

**Purpose**: Intelligent caching and memory hierarchy management

**Automatic Behaviors**:
- Cache memories with high importance + frequent access
- Prefetch related memories based on relationship metadata
- Evict cached memories using LRU + importance scoring
- Boost cache priority for trending memories

**Rule-Based Implementation**:
```javascript
// Cache scoring algorithm
cache_score = (importance * 0.4) + (frequency * 0.3) + (recency * 0.2) + (trending * 0.1)

// Prefetch trigger
if (memory.metadata.ramr.prefetch_related && cache_score > 0.7) {
  prefetch(memory.metadata.relationships.map(r => r.target))
}

// Eviction policy
if (cache_full) {
  evict_candidates = cache.filter(m => m.cache_score < 0.5 && !m.metadata.ramr.trending)
}
```

### 2. Knowledge Analyzer

**Purpose**: Pattern recognition and knowledge graph construction

**Automatic Behaviors**:
- Group memories by semantic clusters
- Identify emerging patterns across projects
- Build relationship networks
- Suggest knowledge consolidation opportunities

**Rule-Based Implementation**:
```javascript
// Clustering algorithm
clusters = groupBy(memories, m => m.metadata.categories.primary)

// Pattern detection
patterns = findFrequentItemsets(memories.map(m => m.metadata.keywords))

// Relationship strength calculation
relationship_strength = semantic_similarity * usage_correlation * temporal_proximity

// Knowledge consolidation
if (cluster.size > 10 && cluster.coherence > 0.8) {
  suggest_consolidation(cluster)
}
```

### 3. Selective Attention

**Purpose**: Intelligent memory retention and archival

**Automatic Behaviors**:
- Archive low-importance, rarely-accessed memories
- Retain high-value patterns and insights
- Compress old sessions while preserving key learnings
- Focus attention on current context

**Rule-Based Implementation**:
```javascript
// Retention scoring
retention_score = (importance * 0.5) + (access_frequency * 0.2) +
                 (relationship_centrality * 0.2) + (recency * 0.1)

// Archival policy
if (memory.age > 30_days && retention_score < 0.3 && !memory.metadata.selective_attention.retain) {
  archive_memory(memory)
}

// Attention focusing
current_context_memories = memories.filter(m =>
  m.project === current_project &&
  m.metadata.selective_attention.attention_score > 0.7
)
```

## MCP Server Implementation

### Core Components

1. **DataLayer**: Direct database operations using DatabaseAdapter
2. **MetadataProcessor**: Handles enriched metadata from Claude Code
3. **EventEmitter**: Emits events for automatic feature integration
4. **CacheManager**: Simple rule-based caching using metadata
5. **QueryEngine**: Fast search using metadata indexes

### API Design

```javascript
class SimplifiedMCPServer {
  // Core memory operations
  async storeMemory(content, metadata)
  async searchMemories(query, filters)
  async getContext(project, session, limit)

  // Automatic feature hooks
  async updateAccessPattern(memoryId)
  async processRetentionRules()
  async buildKnowledgeGraph()
  async optimizeCache()

  // Event emission
  emit('memory_stored', {memory, metadata})
  emit('memory_accessed', {memoryId, context})
  emit('pattern_detected', {pattern, memories})
  emit('attention_shift', {from_context, to_context})
}
```

### Database Schema Extensions

```sql
-- Enhanced memory table
ALTER TABLE conversation_messages ADD COLUMN metadata JSONB;
CREATE INDEX idx_memory_importance ON conversation_messages ((metadata->>'importance'));
CREATE INDEX idx_memory_categories ON conversation_messages USING GIN ((metadata->'categories'));
CREATE INDEX idx_memory_ramr ON conversation_messages ((metadata->'ramr'->>'cache_priority'));

-- Access patterns tracking
CREATE TABLE memory_access_patterns (
  memory_id UUID REFERENCES conversation_messages(id),
  access_time TIMESTAMP DEFAULT NOW(),
  context JSONB,
  session_id VARCHAR(255)
);

-- Knowledge graph relationships
CREATE TABLE memory_relationships (
  source_id UUID REFERENCES conversation_messages(id),
  target_id UUID REFERENCES conversation_messages(id),
  relationship_type VARCHAR(100),
  strength FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Implementation Strategy

### Phase 1: Core Refactoring (Current)
- Remove AI dependencies from MCP server
- Implement direct database operations
- Add metadata processing capabilities
- Create event emission framework

### Phase 2: Automatic Features (Future)
- Implement RAMR caching rules
- Add Knowledge Analyzer pattern detection
- Create Selective Attention retention policies
- Build event-driven integration framework

### Phase 3: Optimization (Future)
- Performance tuning for large datasets
- Advanced caching strategies
- Machine learning model integration (optional)
- Cross-project intelligence features

## Benefits

1. **Performance**: Eliminates AI processing overhead in MCP calls
2. **Reliability**: No circular dependencies or API failures
3. **Scalability**: Direct database operations scale better
4. **Extensibility**: Event-driven architecture allows easy feature addition
5. **Intelligence**: Rich metadata enables sophisticated automatic behaviors
6. **Maintainability**: Clear separation of concerns between AI and data layers

## Migration Path

1. Deploy simplified MCP server alongside current version
2. Update Claude Code to provide enriched metadata
3. Gradually migrate automatic features to rule-based implementations
4. Remove deprecated AI-dependent MCP server
5. Add advanced automatic features incrementally

This architecture provides immediate benefits (performance, reliability) while creating a foundation for sophisticated automatic intelligent features in the future.