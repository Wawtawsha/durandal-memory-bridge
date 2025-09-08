# Comprehensive Dependencies List

## Overview

This document provides a complete list of all dependencies required for the Durandal AI Development Assistant MVP implementation, organized by component and priority level.

## Dependency Categories

### 1. Core Production Dependencies

#### AI and HTTP Communication
```json
{
  "axios": "^1.6.0",
  "anthropic": "^0.6.0"
}
```
- **axios**: HTTP client for API requests, file downloads, general HTTP operations
- **anthropic**: Official Anthropic Claude API client (alternative to raw axios)

#### Database Connectivity
```json
{
  "sqlite3": "^5.1.6",
  "better-sqlite3": "^9.2.2",
  "mssql": "^10.0.2",
  "pg": "^8.11.3",
  "mysql2": "^3.6.5"
}
```
- **sqlite3** OR **better-sqlite3**: Local database storage (better-sqlite3 is faster, synchronous)
- **mssql**: SQL Server connectivity with Windows Auth support
- **pg**: PostgreSQL database driver
- **mysql2**: MySQL database connectivity with promise support

#### File Processing
```json
{
  "pdf-parse": "^1.1.1",
  "xlsx": "^0.18.5",
  "csv-parser": "^3.0.0",
  "xml2js": "^0.6.2",
  "cheerio": "^1.0.0-rc.12",
  "file-type": "^18.7.0"
}
```
- **pdf-parse**: PDF text extraction and metadata parsing
- **xlsx**: Excel and spreadsheet file processing
- **csv-parser**: Streaming CSV file parser
- **xml2js**: XML to JavaScript object conversion
- **cheerio**: Server-side HTML/XML parsing
- **file-type**: File type detection from file contents

#### Utilities and Core
```json
{
  "fs-extra": "^11.2.0",
  "path": "built-in",
  "crypto": "built-in",
  "events": "built-in",
  "uuid": "^9.0.1",
  "dotenv": "^16.3.1"
}
```
- **fs-extra**: Enhanced filesystem operations with promises
- **path, crypto, events**: Node.js built-in modules
- **uuid**: Generate unique identifiers for sessions, requests
- **dotenv**: Environment variable management

### 2. Development and Testing Dependencies

#### Testing Framework
```json
{
  "jest": "^29.7.0",
  "@types/jest": "^29.5.8",
  "supertest": "^6.3.3"
}
```
- **jest**: Testing framework with mocking and coverage
- **@types/jest**: TypeScript definitions for Jest
- **supertest**: HTTP testing library

#### Development Tools
```json
{
  "nodemon": "^3.0.2",
  "eslint": "^8.55.0",
  "prettier": "^3.1.0",
  "concurrently": "^8.2.2"
}
```
- **nodemon**: Development server with auto-restart
- **eslint**: Code linting and style enforcement
- **prettier**: Code formatting
- **concurrently**: Run multiple npm scripts simultaneously

### 3. Optional/Enhancement Dependencies

#### Advanced Analytics
```json
{
  "d3": "^7.8.5",
  "chart.js": "^4.4.0"
}
```
- **d3**: Data visualization library for analytics dashboard
- **chart.js**: Simple charting library for usage metrics

#### Performance Monitoring
```json
{
  "clinic": "^12.2.0",
  "0x": "^5.7.0"
}
```
- **clinic**: Node.js performance profiling
- **0x**: Flame graph generation for performance analysis

#### Security (Future)
```json
{
  "helmet": "^7.1.0",
  "bcrypt": "^5.1.1"
}
```
- **helmet**: Security headers for HTTP server
- **bcrypt**: Password hashing for future user authentication

## Complete package.json

### Production Package Configuration
```json
{
  "name": "durandal-ai-assistant",
  "version": "1.0.0",
  "description": "AI-powered development assistant that eliminates manual information searching",
  "main": "dev-assistant.js",
  "type": "commonjs",
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  },
  "scripts": {
    "start": "node dev-assistant.js",
    "dev": "nodemon dev-assistant.js",
    "demo": "node simple-demo.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:clean": "node test-clean-system.js",
    "lint": "eslint *.js",
    "format": "prettier --write *.js",
    "db:init": "node scripts/init-database.js",
    "db:migrate": "node scripts/migrate-database.js",
    "build": "npm run lint && npm run test",
    "preversion": "npm run build",
    "postversion": "git push && git push --tags"
  },
  "dependencies": {
    "axios": "^1.6.0",
    "better-sqlite3": "^9.2.2",
    "mssql": "^10.0.2",
    "pg": "^8.11.3",
    "mysql2": "^3.6.5",
    "pdf-parse": "^1.1.1",
    "xlsx": "^0.18.5",
    "csv-parser": "^3.0.0",
    "xml2js": "^0.6.2",
    "cheerio": "^1.0.0-rc.12",
    "file-type": "^18.7.0",
    "fs-extra": "^11.2.0",
    "uuid": "^9.0.1",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "@types/jest": "^29.5.8",
    "supertest": "^6.3.3",
    "nodemon": "^3.0.2",
    "eslint": "^8.55.0",
    "prettier": "^3.1.0",
    "concurrently": "^8.2.2"
  },
  "optionalDependencies": {
    "d3": "^7.8.5",
    "chart.js": "^4.4.0",
    "clinic": "^12.2.0"
  },
  "keywords": [
    "ai",
    "assistant",
    "development",
    "claude",
    "automation",
    "productivity",
    "database",
    "code-analysis"
  ],
  "author": "Your Name",
  "license": "UNLICENSED",
  "private": true,
  "repository": {
    "type": "git",
    "url": "your-repo-url"
  }
}
```

## Platform-Specific Dependencies

### Windows-Specific
```json
{
  "node-windows": "^1.0.0-beta.8",
  "msnodesqlv8": "^4.2.1"
}
```
- **node-windows**: Windows service creation and management
- **msnodesqlv8**: Native Windows SQL Server driver for Windows Auth

### macOS/Linux-Specific
```json
{
  "node-gyp": "^10.0.1"
}
```
- **node-gyp**: Native addon build tool (for better-sqlite3, mssql compilation)

## Installation Commands

### Full Installation
```bash
# Install all dependencies
npm install

# Install platform-specific dependencies
npm install --save-optional

# Install development dependencies
npm install --save-dev
```

### Minimal Production Installation
```bash
# Core dependencies only
npm install axios better-sqlite3 pdf-parse xlsx fs-extra uuid dotenv

# Add database drivers as needed
npm install mssql pg mysql2

# Add file processing as needed
npm install csv-parser xml2js cheerio file-type
```

### Development Setup
```bash
# Full development environment
npm install
npm run db:init
npm test
npm run demo
```

## Dependency Analysis

### Bundle Size Impact
```javascript
const dependencySize = {
  core: {
    axios: '~500KB',
    'better-sqlite3': '~2MB',
    'fs-extra': '~50KB',
    uuid: '~20KB',
    dotenv: '~10KB'
  },
  database: {
    mssql: '~1MB',
    pg: '~300KB', 
    mysql2: '~800KB'
  },
  fileProcessing: {
    'pdf-parse': '~200KB',
    xlsx: '~1.5MB',
    'xml2js': '~100KB',
    cheerio: '~2MB'
  },
  total: '~8-10MB for full installation'
};
```

### Security Audit
```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Check specific package
npm view axios
```

### Update Strategy
```bash
# Check outdated packages
npm outdated

# Update minor versions
npm update

# Update major versions (carefully)
npm install package@latest
```

## Alternative Dependencies

### Database Alternatives
```javascript
const databaseAlternatives = {
  sqlite: {
    'sqlite3': 'Asynchronous, callback-based',
    'better-sqlite3': 'Synchronous, faster performance (RECOMMENDED)'
  },
  sqlserver: {
    'mssql': 'Standard driver, Windows Auth support (RECOMMENDED)',
    'msnodesqlv8': 'Native Windows driver, complex setup',
    'tedious': 'Pure JavaScript implementation'
  },
  postgresql: {
    'pg': 'Most popular, well maintained (RECOMMENDED)',
    'postgres': 'Promise-based wrapper around pg'
  }
};
```

### File Processing Alternatives
```javascript
const fileProcessingAlternatives = {
  pdf: {
    'pdf-parse': 'Simple text extraction (RECOMMENDED)',
    'pdf2pic': 'Convert PDF to images',
    'pdfkit': 'PDF generation (not parsing)'
  },
  excel: {
    'xlsx': 'Full-featured, handles complex Excel files (RECOMMENDED)',
    'exceljs': 'Full read/write support, larger bundle',
    'node-xlsx': 'Simpler API, less features'
  }
};
```

## Docker Dependencies

### Dockerfile
```dockerfile
FROM node:18-alpine

# Install system dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite \
    postgresql-client \
    mysql-client

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create necessary directories
RUN mkdir -p /app/data /app/logs

EXPOSE 3000

CMD ["npm", "start"]
```

## Installation Troubleshooting

### Common Issues and Solutions

#### Native Module Compilation Errors
```bash
# Install build tools
npm install -g node-gyp

# Windows
npm install -g windows-build-tools

# macOS
xcode-select --install

# Linux
sudo apt-get install build-essential
```

#### SQLite3 Installation Issues
```bash
# Use better-sqlite3 instead
npm uninstall sqlite3
npm install better-sqlite3
```

#### Windows Authentication Issues
```bash
# Install native SQL Server driver
npm install msnodesqlv8

# Or use connection string authentication
# No additional dependencies needed
```

#### Memory Issues with Large Files
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 dev-assistant.js

# Or set in package.json
"start": "node --max-old-space-size=4096 dev-assistant.js"
```

## Development Environment Setup

### VS Code Extensions (Recommended)
```json
{
  "recommendations": [
    "ms-vscode.vscode-json",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "formulahendry.auto-rename-tag"
  ]
}
```

### Git Hooks (Optional)
```json
{
  "husky": "^8.0.3",
  "lint-staged": "^15.1.0"
}
```

## Deployment Dependencies

### Production Server
```json
{
  "pm2": "^5.3.0",
  "compression": "^1.7.4",
  "express-rate-limit": "^7.1.5"
}
```
- **pm2**: Process manager for production deployment
- **compression**: Response compression middleware
- **express-rate-limit**: Rate limiting for API endpoints

This comprehensive dependencies list ensures all required packages are identified and properly managed for successful Durandal implementation.