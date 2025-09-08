# Database Architecture and API Design

## Overview

This document specifies the technical design for the database integration layer that will connect Durandal to external databases (SQL Server, PostgreSQL, MySQL) and provide intelligent analysis capabilities.

## Design Principles

- **Simple, Direct API** - Clean interfaces that extend our existing foundation
- **Multi-Database Support** - Unified interface across different database types
- **Connection Management** - Reliable connection pooling and error handling
- **Security First** - Secure credential management and query safety
- **Performance Focused** - Optimized for typical developer workflows

## Component Architecture

### 1. Database Client (`simple-database.js`)

#### Core Responsibilities
- Manage connections to multiple database types
- Execute queries with consistent response format
- Provide schema discovery and documentation
- Handle connection pooling and timeout management

#### API Interface Design
```javascript
class SimpleDatabase {
    constructor(options = {}) {
        this.connections = new Map();
        this.pools = new Map();
        this.options = {
            defaultTimeout: 30000,
            maxConnections: 10,
            retryAttempts: 3,
            ...options
        };
    }

    // Connection Management
    async connect(connectionConfig) {
        // Returns: connectionId (string)
    }
    
    async disconnect(connectionId) {
        // Returns: boolean success
    }
    
    async testConnection(connectionConfig) {
        // Returns: { success: boolean, responseTime: number, error?: string }
    }

    // Query Operations
    async query(connectionId, sql, params = []) {
        // Returns: { columns: [], rows: [], executionTime: number, rowCount: number }
    }
    
    async batchQuery(connectionId, queries) {
        // Returns: Array of query results
    }

    // Schema Discovery
    async listTables(connectionId, schema = null) {
        // Returns: Array of table metadata
    }
    
    async describeTable(connectionId, tableName, schema = null) {
        // Returns: { columns: [], indexes: [], foreignKeys: [], primaryKey: [] }
    }
    
    async getTableRelationships(connectionId, tableName = null) {
        // Returns: Relationship graph data
    }

    // Documentation Generation
    async generateSchemaDocumentation(connectionId) {
        // Returns: Comprehensive schema documentation
    }
    
    async generateTableDocumentation(connectionId, tableName) {
        // Returns: Detailed table documentation with sample queries
    }
}
```

### 2. Connection Configuration Management

#### Connection Config Schema
```javascript
const connectionConfig = {
    id: 'unique-connection-id',
    name: 'Human readable name',
    type: 'sqlserver' | 'postgresql' | 'mysql',
    host: 'server-address',
    port: 1433, // or database-specific default
    database: 'database-name',
    authentication: {
        type: 'sql' | 'windows' | 'certificate',
        username: 'user', // for sql auth
        password: 'pass', // for sql auth (encrypted storage)
        domain: 'domain', // for windows auth
        certificatePath: 'path' // for certificate auth
    },
    options: {
        encrypt: true, // for SQL Server
        trustServerCertificate: false,
        connectionTimeout: 30000,
        requestTimeout: 30000,
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000
        }
    }
};
```

### 3. Database-Specific Adapters

#### SQL Server Adapter
```javascript
class SQLServerAdapter {
    constructor(config) {
        this.config = config;
        this.pool = null;
    }

    async connect() {
        // Use 'mssql' package
        // Handle Windows authentication
        // Set up connection pool
    }

    async query(sql, params) {
        // Execute with prepared statements
        // Handle SQL Server specific data types
        // Return normalized results
    }

    async getSchemaInfo() {
        // Query INFORMATION_SCHEMA views
        // Get SQL Server specific metadata
    }
}
```

#### PostgreSQL Adapter
```javascript
class PostgreSQLAdapter {
    constructor(config) {
        this.config = config;
        this.pool = null;
    }

    async connect() {
        // Use 'pg' package
        // Handle SSL configuration
        // Set up connection pool
    }

    async query(sql, params) {
        // Execute with parameterized queries
        // Handle PostgreSQL data types
        // Return normalized results
    }

    async getSchemaInfo() {
        // Query pg_catalog tables
        // Get PostgreSQL specific metadata
    }
}
```

#### MySQL Adapter
```javascript
class MySQLAdapter {
    constructor(config) {
        this.config = config;
        this.pool = null;
    }

    async connect() {
        // Use 'mysql2' package
        // Handle SSL/TLS configuration
        // Set up connection pool
    }

    async query(sql, params) {
        // Execute with prepared statements
        // Handle MySQL data types
        // Return normalized results
    }

    async getSchemaInfo() {
        // Query INFORMATION_SCHEMA
        // Get MySQL specific metadata
    }
}
```

## Integration with Existing Components

### Integration into DevAssistant (`dev-assistant.js`)

```javascript
// Add to DevAssistant class
class DevAssistant {
    constructor(options = {}) {
        // ... existing initialization
        this.database = new SimpleDatabase(options.database);
    }

    // New database-related methods
    async connectDatabase(connectionConfig) {
        const connectionId = await this.database.connect(connectionConfig);
        this.rememberConnection(connectionId, connectionConfig);
        return connectionId;
    }

    async queryDatabase(connectionId, question) {
        // Use AI to interpret natural language question
        // Generate appropriate SQL query
        // Execute and explain results
        const aiQuery = await this.aiClient.ask(
            `Convert this to SQL for the database: ${question}`,
            this.getConnectionContext(connectionId)
        );
        
        const result = await this.database.query(connectionId, aiQuery);
        const explanation = await this.aiClient.ask(
            `Explain these query results: ${JSON.stringify(result)}`
        );
        
        return { query: aiQuery, result, explanation };
    }

    async explainSchema(connectionId, tableName = null) {
        const schema = tableName ? 
            await this.database.describeTable(connectionId, tableName) :
            await this.database.generateSchemaDocumentation(connectionId);
            
        const explanation = await this.aiClient.ask(
            `Explain this database schema in business terms: ${JSON.stringify(schema)}`
        );
        
        return { schema, explanation };
    }

    async suggestQueries(connectionId, tableName) {
        const table = await this.database.describeTable(connectionId, tableName);
        const suggestions = await this.aiClient.ask(
            `Suggest useful queries for this table: ${JSON.stringify(table)}`
        );
        
        return suggestions;
    }
}
```

## Security Considerations

### 1. Credential Management
- **Encryption at Rest**: Store database credentials using Node.js crypto
- **Memory Protection**: Clear credentials from memory after use
- **Access Control**: Validate connection permissions before execution

### 2. Query Safety
- **SQL Injection Prevention**: Use parameterized queries exclusively
- **Query Validation**: Basic SQL parsing to prevent dangerous operations
- **Resource Limits**: Query timeout and result size limits

### 3. Connection Security
- **TLS/SSL**: Enforce encrypted connections by default
- **Certificate Validation**: Validate server certificates
- **Network Isolation**: Support for VPN and private network configurations

## Performance Considerations

### 1. Connection Pooling
```javascript
const poolConfig = {
    max: 10, // maximum connections in pool
    min: 0,  // minimum connections maintained
    idleTimeoutMillis: 30000, // close idle connections
    acquireTimeoutMillis: 60000, // timeout waiting for connection
    createTimeoutMillis: 30000, // timeout creating new connection
    destroyTimeoutMillis: 5000 // timeout destroying connection
};
```

### 2. Query Optimization
- **Result Caching**: Cache frequently requested schema information
- **Lazy Loading**: Load schema details only when requested
- **Batch Operations**: Support for multiple queries in single round-trip

### 3. Memory Management
- **Stream Large Results**: Use streams for large query results
- **Result Pagination**: Limit result set sizes with pagination
- **Connection Cleanup**: Automatic cleanup of idle connections

## Error Handling Strategy

### 1. Connection Errors
```javascript
class DatabaseConnectionError extends Error {
    constructor(message, connectionConfig, originalError) {
        super(message);
        this.name = 'DatabaseConnectionError';
        this.connectionId = connectionConfig.id;
        this.databaseType = connectionConfig.type;
        this.originalError = originalError;
    }
}
```

### 2. Query Errors
```javascript
class DatabaseQueryError extends Error {
    constructor(message, query, connectionId, originalError) {
        super(message);
        this.name = 'DatabaseQueryError';
        this.query = query;
        this.connectionId = connectionId;
        this.originalError = originalError;
    }
}
```

### 3. Error Recovery
- **Automatic Retry**: Retry failed connections with exponential backoff
- **Circuit Breaker**: Temporarily disable problematic connections
- **Graceful Degradation**: Provide cached results when connections fail

## Testing Strategy

### 1. Unit Tests
- Test each database adapter independently
- Mock database responses for consistent testing
- Test error conditions and edge cases

### 2. Integration Tests
- Use containerized databases (Docker) for testing
- Test with AdventureWorks and other sample databases
- Test connection pooling and concurrent access

### 3. Performance Tests
- Load testing with multiple concurrent connections
- Memory usage monitoring during large queries
- Connection pool behavior under stress

## Database Schema Documentation Format

### Table Documentation Output
```javascript
{
    tableName: 'Users',
    description: 'AI-generated business description',
    columns: [
        {
            name: 'UserId',
            dataType: 'int',
            nullable: false,
            primaryKey: true,
            description: 'Unique identifier for user'
        }
        // ... more columns
    ],
    relationships: [
        {
            type: 'foreignKey',
            column: 'DepartmentId',
            referencedTable: 'Departments',
            referencedColumn: 'DepartmentId'
        }
    ],
    sampleQueries: [
        'SELECT * FROM Users WHERE LastLoginDate > DATEADD(day, -30, GETDATE())',
        'SELECT COUNT(*) FROM Users GROUP BY DepartmentId'
    ],
    businessPurpose: 'AI-generated explanation of table purpose'
}
```

## Implementation Priorities

### Phase 1: Core Foundation
1. Basic SimpleDatabase class structure
2. SQL Server adapter (primary target database)
3. Connection management and pooling
4. Basic query execution

### Phase 2: Schema Discovery
1. Table and column metadata retrieval
2. Relationship mapping
3. Basic documentation generation

### Phase 3: Multi-Database Support
1. PostgreSQL adapter
2. MySQL adapter
3. Unified schema representation

### Phase 4: AI Integration
1. Natural language to SQL conversion
2. Query result explanation
3. Business context generation

This design provides a solid foundation for database integration while maintaining the clean, simple architecture of our existing system.