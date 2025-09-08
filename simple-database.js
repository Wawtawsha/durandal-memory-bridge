/**
 * Simple Database - Multi-database connector with clean interface
 * Supports SQL Server, PostgreSQL with unified API
 * Focused on demo scenarios and VC presentation needs
 */

const sql = require('mssql'); // SQL Server
const { Pool } = require('pg'); // PostgreSQL

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
        try {
            const connectionId = connectionConfig.id || this.generateConnectionId(connectionConfig);
            
            if (this.connections.has(connectionId)) {
                return connectionId; // Already connected
            }

            let connection;
            if (connectionConfig.type === 'sqlserver') {
                connection = await this.connectSqlServer(connectionConfig);
            } else if (connectionConfig.type === 'postgresql') {
                connection = await this.connectPostgreSQL(connectionConfig);
            } else {
                throw new Error(`Database type '${connectionConfig.type}' not supported`);
            }

            this.connections.set(connectionId, {
                config: connectionConfig,
                connection: connection,
                type: connectionConfig.type,
                connected: Date.now()
            });

            return connectionId;
        } catch (error) {
            throw new Error(`Database connection failed: ${error.message}`);
        }
    }

    async connectSqlServer(config) {
        const poolConfig = {
            server: config.host,
            port: config.port || 1433,
            database: config.database,
            connectionTimeout: config.options?.connectionTimeout || this.options.defaultTimeout,
            requestTimeout: config.options?.requestTimeout || this.options.defaultTimeout,
            pool: {
                max: config.options?.pool?.max || this.options.maxConnections,
                min: config.options?.pool?.min || 0,
                idleTimeoutMillis: config.options?.pool?.idleTimeoutMillis || 30000
            },
            options: {
                encrypt: config.options?.encrypt ?? true,
                trustServerCertificate: config.options?.trustServerCertificate ?? false
            }
        };

        // Add authentication
        if (config.authentication.type === 'sql') {
            poolConfig.user = config.authentication.username;
            poolConfig.password = config.authentication.password;
        }
        // Note: Windows authentication would require additional setup

        const pool = new sql.ConnectionPool(poolConfig);
        await pool.connect();
        this.pools.set(config.id || this.generateConnectionId(config), pool);
        return pool;
    }

    async connectPostgreSQL(config) {
        const poolConfig = {
            host: config.host,
            port: config.port || 5432,
            database: config.database,
            user: config.authentication.username,
            password: config.authentication.password,
            max: config.options?.pool?.max || this.options.maxConnections,
            idleTimeoutMillis: config.options?.pool?.idleTimeoutMillis || 30000,
            connectionTimeoutMillis: config.options?.connectionTimeout || this.options.defaultTimeout,
            ssl: config.options?.ssl || false
        };

        const pool = new Pool(poolConfig);
        this.pools.set(config.id || this.generateConnectionId(config), pool);
        return pool;
    }

    async disconnect(connectionId) {
        try {
            const connectionInfo = this.connections.get(connectionId);
            if (!connectionInfo) return false;

            const pool = this.pools.get(connectionId);
            if (pool) {
                if (connectionInfo.type === 'sqlserver') {
                    await pool.close();
                } else if (connectionInfo.type === 'postgresql') {
                    await pool.end();
                }
                this.pools.delete(connectionId);
            }

            this.connections.delete(connectionId);
            return true;
        } catch (error) {
            console.error(`Error disconnecting from ${connectionId}:`, error.message);
            return false;
        }
    }

    async testConnection(connectionConfig) {
        const start = Date.now();
        try {
            const connectionId = await this.connect(connectionConfig);
            const result = await this.query(connectionId, 'SELECT 1 as test');
            const responseTime = Date.now() - start;
            
            // Clean up test connection
            await this.disconnect(connectionId);
            
            return {
                success: true,
                responseTime,
                rowCount: result.rowCount || 0
            };
        } catch (error) {
            return {
                success: false,
                responseTime: Date.now() - start,
                error: error.message
            };
        }
    }

    // Query Operations
    async query(connectionId, sqlQuery, params = []) {
        const start = Date.now();
        try {
            const connectionInfo = this.connections.get(connectionId);
            if (!connectionInfo) {
                throw new Error(`Connection ${connectionId} not found`);
            }

            const pool = this.pools.get(connectionId);
            let result;

            if (connectionInfo.type === 'sqlserver') {
                const request = pool.request();
                
                // Add parameters
                params.forEach((param, index) => {
                    request.input(`param${index}`, param);
                });

                const queryResult = await request.query(sqlQuery);
                result = {
                    columns: queryResult.columns ? Object.keys(queryResult.columns) : [],
                    rows: queryResult.recordset || [],
                    executionTime: Date.now() - start,
                    rowCount: queryResult.rowsAffected ? queryResult.rowsAffected[0] : 0
                };
            } else if (connectionInfo.type === 'postgresql') {
                const queryResult = await pool.query(sqlQuery, params);
                result = {
                    columns: queryResult.fields ? queryResult.fields.map(f => f.name) : [],
                    rows: queryResult.rows || [],
                    executionTime: Date.now() - start,
                    rowCount: queryResult.rowCount || 0
                };
            }

            return result;
        } catch (error) {
            throw new Error(`Query execution failed: ${error.message}`);
        }
    }

    async batchQuery(connectionId, queries) {
        const results = [];
        for (const query of queries) {
            try {
                const result = await this.query(connectionId, query.sql, query.params);
                results.push({ success: true, ...result });
            } catch (error) {
                results.push({ success: false, error: error.message });
            }
        }
        return results;
    }

    // Schema Discovery - Core for Demo Scenarios
    async listTables(connectionId, schema = null) {
        try {
            const connectionInfo = this.connections.get(connectionId);
            if (!connectionInfo) {
                throw new Error(`Connection ${connectionId} not found`);
            }

            let query;
            if (connectionInfo.type === 'sqlserver') {
                query = `
                    SELECT 
                        TABLE_SCHEMA as schema_name,
                        TABLE_NAME as table_name,
                        TABLE_TYPE as table_type
                    FROM INFORMATION_SCHEMA.TABLES 
                    WHERE TABLE_TYPE = 'BASE TABLE'
                    ${schema ? "AND TABLE_SCHEMA = @schema" : ""}
                    ORDER BY TABLE_SCHEMA, TABLE_NAME
                `;
            } else if (connectionInfo.type === 'postgresql') {
                query = `
                    SELECT 
                        schemaname as schema_name,
                        tablename as table_name,
                        'BASE TABLE' as table_type
                    FROM pg_tables 
                    WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
                    ${schema ? "AND schemaname = $1" : ""}
                    ORDER BY schemaname, tablename
                `;
            }

            const result = await this.query(connectionId, query, schema ? [schema] : []);
            return result.rows;
        } catch (error) {
            throw new Error(`Failed to list tables: ${error.message}`);
        }
    }

    async describeTable(connectionId, tableName, schema = 'dbo') {
        try {
            const connectionInfo = this.connections.get(connectionId);
            if (!connectionInfo) {
                throw new Error(`Connection ${connectionId} not found`);
            }

            let query;
            if (connectionInfo.type === 'sqlserver') {
                query = `
                    SELECT 
                        COLUMN_NAME as column_name,
                        DATA_TYPE as data_type,
                        IS_NULLABLE as is_nullable,
                        COLUMN_DEFAULT as default_value,
                        CHARACTER_MAXIMUM_LENGTH as max_length
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = '${tableName}'
                    ${schema ? `AND TABLE_SCHEMA = '${schema}'` : ""}
                    ORDER BY ORDINAL_POSITION
                `;
            } else if (connectionInfo.type === 'postgresql') {
                query = `
                    SELECT 
                        column_name,
                        data_type,
                        is_nullable,
                        column_default as default_value,
                        character_maximum_length as max_length
                    FROM information_schema.columns 
                    WHERE table_name = '${tableName}'
                    ${schema ? `AND table_schema = '${schema}'` : ""}
                    ORDER BY ordinal_position
                `;
            }

            const result = await this.query(connectionId, query);
            return {
                columns: result.rows,
                tableName,
                schema
            };
        } catch (error) {
            throw new Error(`Failed to describe table ${tableName}: ${error.message}`);
        }
    }

    // Documentation Generation for Demo Scenarios
    async generateSchemaDocumentation(connectionId) {
        try {
            const tables = await this.listTables(connectionId);
            const documentation = {
                database: this.connections.get(connectionId)?.config.database,
                generated: new Date().toISOString(),
                tableCount: tables.length,
                tables: []
            };

            for (const table of tables.slice(0, 10)) { // Limit for demo
                try {
                    const tableInfo = await this.describeTable(connectionId, table.table_name, table.schema_name);
                    documentation.tables.push({
                        name: table.table_name,
                        schema: table.schema_name,
                        columnCount: tableInfo.columns.length,
                        columns: tableInfo.columns.map(col => ({
                            name: col.column_name,
                            type: col.data_type,
                            nullable: col.is_nullable === 'YES'
                        }))
                    });
                } catch (error) {
                    console.warn(`Skipped table ${table.table_name}: ${error.message}`);
                }
            }

            return documentation;
        } catch (error) {
            throw new Error(`Failed to generate schema documentation: ${error.message}`);
        }
    }

    // Demo scenario helper: Find interesting tables for presentation
    async findDemoTables(connectionId) {
        try {
            const tables = await this.listTables(connectionId);
            
            // Look for common business table names for better demos
            const interestingPatterns = ['user', 'customer', 'product', 'order', 'employee', 'account'];
            const demoTables = tables.filter(table => 
                interestingPatterns.some(pattern => 
                    table.table_name.toLowerCase().includes(pattern)
                )
            );

            return demoTables.length > 0 ? demoTables : tables.slice(0, 5);
        } catch (error) {
            throw new Error(`Failed to find demo tables: ${error.message}`);
        }
    }

    // Utility methods
    generateConnectionId(config) {
        return `${config.type}_${config.host}_${config.database}_${Date.now()}`;
    }

    getConnectionInfo(connectionId) {
        return this.connections.get(connectionId);
    }

    listConnections() {
        return Array.from(this.connections.entries()).map(([id, info]) => ({
            id,
            name: info.config.name,
            type: info.config.type,
            database: info.config.database,
            connected: new Date(info.connected).toISOString()
        }));
    }

    // Cleanup all connections
    async cleanup() {
        const connectionIds = Array.from(this.connections.keys());
        await Promise.all(connectionIds.map(id => this.disconnect(id)));
    }
}

module.exports = SimpleDatabase;