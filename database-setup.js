const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');

class DatabaseSetup {
    constructor() {
        this.setupAttempted = false;
        this.setupSuccess = false;
        this.schemaFiles = [
            'claude_memory_schema.sql',
            'durandal_migration.sql'
        ];
    }

    async autoSetup() {
        console.log('🗃️  Setting up database automatically...');

        const dbType = process.env.DATABASE_TYPE || 'sqlite';

        if (dbType === 'sqlite') {
            return await this.setupSQLite();
        } else if (dbType === 'postgresql') {
            return await this.setupPostgreSQL();
        }

        throw new Error(`Unsupported database type: ${dbType}`);
    }

    async setupSQLite() {
        console.log('📄 Using SQLite - no additional setup required');

        // SQLite setup is automatic - just ensure directory exists
        const dbPath = process.env.DATABASE_PATH || './durandal-memory.db';
        const dbDir = path.dirname(path.resolve(dbPath));

        try {
            await fs.mkdir(dbDir, { recursive: true });
            console.log('✅ SQLite database directory ready');

            // Test SQLite connection by requiring sqlite3
            const sqlite3 = require('sqlite3');
            console.log('✅ SQLite driver available');

            return { success: true, type: 'sqlite', path: dbPath };
        } catch (error) {
            console.log('❌ SQLite setup failed:', error.message);
            return { success: false, error: error.message, type: 'sqlite' };
        }
    }

    async setupPostgreSQL() {
        console.log('🐘 Setting up PostgreSQL...');

        // Check if we have individual components or DATABASE_URL
        const dbUrl = process.env.DATABASE_URL;
        const hasComponents = !!(process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER);

        if (!dbUrl && !hasComponents) {
            return await this.tryAutoCreatePostgreSQL();
        }

        // Test existing configuration
        try {
            const result = await this.testPostgreSQLConnection();
            if (result.success) {
                console.log('✅ PostgreSQL connection successful');
                await this.runMigrations('postgresql');
                return result;
            }
        } catch (error) {
            console.log('⚠️  PostgreSQL connection failed, attempting auto-setup...');
        }

        // Try auto-setup if connection failed
        return await this.tryAutoCreatePostgreSQL();
    }

    async tryAutoCreatePostgreSQL() {
        console.log('🔧 Attempting automatic PostgreSQL setup...');

        // Try to connect to default postgres database to create our database
        const defaultConfig = {
            user: 'postgres',
            host: 'localhost',
            database: 'postgres',
            password: process.env.POSTGRES_PASSWORD || 'postgres',
            port: 5432
        };

        try {
            const adminPool = new Pool(defaultConfig);

            // Test admin connection
            await adminPool.query('SELECT 1');
            console.log('✅ Connected to PostgreSQL as admin');

            // Check if our database exists
            const dbName = process.env.DB_NAME || 'claude_memory';
            const userName = process.env.DB_USER || 'claude_user';
            const userPassword = process.env.DB_PASSWORD || 'durandal_default_pass';

            // Create user if not exists
            try {
                await adminPool.query(`CREATE USER ${userName} WITH PASSWORD '${userPassword}'`);
                console.log(`✅ Created user: ${userName}`);
            } catch (error) {
                if (error.code === '42710') { // User already exists
                    console.log(`✅ User ${userName} already exists`);
                } else {
                    throw error;
                }
            }

            // Create database if not exists
            try {
                await adminPool.query(`CREATE DATABASE ${dbName} OWNER ${userName}`);
                console.log(`✅ Created database: ${dbName}`);
            } catch (error) {
                if (error.code === '42P04') { // Database already exists
                    console.log(`✅ Database ${dbName} already exists`);
                } else {
                    throw error;
                }
            }

            // Grant privileges
            await adminPool.query(`GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${userName}`);
            console.log('✅ Granted database privileges');

            await adminPool.end();

            // Update environment variables for the session
            process.env.DB_HOST = 'localhost';
            process.env.DB_NAME = dbName;
            process.env.DB_USER = userName;
            process.env.DB_PASSWORD = userPassword;
            process.env.DB_PORT = '5432';

            console.log('✅ PostgreSQL auto-setup completed');

            // Test the new connection and run migrations
            const testResult = await this.testPostgreSQLConnection();
            if (testResult.success) {
                await this.runMigrations('postgresql');
            }

            return testResult;

        } catch (error) {
            console.log('❌ PostgreSQL auto-setup failed:', error.message);
            console.log('💡 Consider using SQLite instead or manual PostgreSQL setup');

            // Fallback to SQLite
            console.log('🔄 Falling back to SQLite...');
            process.env.DATABASE_TYPE = 'sqlite';
            return await this.setupSQLite();
        }
    }

    async testPostgreSQLConnection() {
        const config = this.getPostgreSQLConfig();
        const pool = new Pool(config);

        try {
            const result = await pool.query('SELECT 1 as test');
            await pool.end();

            return {
                success: true,
                type: 'postgresql',
                config: { ...config, password: '***' }
            };
        } catch (error) {
            try {
                await pool.end();
            } catch {}

            return {
                success: false,
                error: error.message,
                type: 'postgresql'
            };
        }
    }

    getPostgreSQLConfig() {
        if (process.env.DATABASE_URL) {
            return { connectionString: process.env.DATABASE_URL };
        }

        return {
            user: process.env.DB_USER || 'claude_user',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'claude_memory',
            password: process.env.DB_PASSWORD || 'durandal_default_pass',
            port: parseInt(process.env.DB_PORT) || 5432
        };
    }

    async runMigrations(dbType) {
        console.log('📋 Running database migrations...');

        if (dbType === 'sqlite') {
            return await this.runSQLiteMigrations();
        } else if (dbType === 'postgresql') {
            return await this.runPostgreSQLMigrations();
        }
    }

    async runSQLiteMigrations() {
        // SQLite migrations would be handled by the sqlite client
        // For now, we'll let the existing system handle this
        console.log('✅ SQLite migrations handled by application');
        return { success: true };
    }

    async runPostgreSQLMigrations() {
        const config = this.getPostgreSQLConfig();
        const pool = new Pool(config);

        try {
            for (const schemaFile of this.schemaFiles) {
                const schemaPath = path.join(__dirname, schemaFile);

                try {
                    const schemaSql = await fs.readFile(schemaPath, 'utf8');

                    // Split by statements and execute each
                    const statements = schemaSql
                        .split(';')
                        .map(stmt => stmt.trim())
                        .filter(stmt => stmt.length > 0);

                    for (const statement of statements) {
                        try {
                            await pool.query(statement);
                        } catch (error) {
                            // Ignore "already exists" errors
                            if (!error.message.includes('already exists') &&
                                error.code !== '42P07' && // relation already exists
                                error.code !== '42701') { // column already exists
                                throw error;
                            }
                        }
                    }

                    console.log(`✅ Applied migration: ${schemaFile}`);
                } catch (error) {
                    if (error.code === 'ENOENT') {
                        console.log(`⚠️  Schema file not found: ${schemaFile}`);
                    } else {
                        console.log(`❌ Migration failed for ${schemaFile}:`, error.message);
                    }
                }
            }

            await pool.end();
            console.log('✅ Database migrations completed');
            return { success: true };

        } catch (error) {
            try {
                await pool.end();
            } catch {}

            console.log('❌ Migration failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    async createDefaultEnvIfNeeded() {
        const envPath = path.join(process.cwd(), '.env');

        try {
            await fs.access(envPath);
            console.log('✅ .env file exists');
        } catch {
            console.log('📄 Creating default .env file...');

            const defaultEnv = `# Durandal AI Memory System Configuration
# Created by automatic setup

# =================================================================
# AI PROVIDER CONFIGURATION (Add your API key)
# =================================================================

# Claude API (Anthropic) - Recommended
CLAUDE_API_KEY=your_claude_api_key_here
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# =================================================================
# DATABASE CONFIGURATION (Auto-configured)
# =================================================================

# SQLite (Default - No setup required)
DATABASE_TYPE=sqlite
DATABASE_PATH=./durandal-memory.db

# =================================================================
# APPLICATION CONFIGURATION
# =================================================================

NODE_ENV=production
PORT=3000
MEMORY_API_KEY=durandal-secure-key-change-this
LOG_LEVEL=info
`;

            await fs.writeFile(envPath, defaultEnv);
            console.log('✅ Created default .env file');
            console.log('🔑 Please edit .env file and add your Claude API key');
        }
    }
}

module.exports = DatabaseSetup;