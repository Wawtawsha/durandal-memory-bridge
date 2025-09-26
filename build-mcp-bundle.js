#!/usr/bin/env node

const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const archiver = require('archiver');

class MCPBundleBuilder {
    constructor() {
        this.bundleConfig = require('./mcp-bundle.json');
        this.outputDir = './dist';
        this.bundleName = `${this.bundleConfig.name}-${this.bundleConfig.version}.mcpb`;
    }

    async build() {
        console.log('📦 Building MCP Bundle...');

        try {
            // Create output directory
            await this.ensureOutputDirectory();

            // Validate required files
            await this.validateFiles();

            // Create the bundle archive
            await this.createBundle();

            console.log(`✅ MCP Bundle created: ${path.join(this.outputDir, this.bundleName)}`);
            console.log('📁 Bundle contents:');
            this.bundleConfig.files.forEach(file => console.log(`   - ${file}`));

        } catch (error) {
            console.error('❌ Bundle creation failed:', error.message);
            process.exit(1);
        }
    }

    async ensureOutputDirectory() {
        try {
            await fsPromises.access(this.outputDir);
        } catch {
            await fsPromises.mkdir(this.outputDir, { recursive: true });
            console.log(`📁 Created output directory: ${this.outputDir}`);
        }
    }

    async validateFiles() {
        console.log('🔍 Validating required files...');

        for (const file of this.bundleConfig.files) {
            try {
                await fsPromises.access(file);
                console.log(`✅ Found: ${file}`);
            } catch {
                throw new Error(`Required file missing: ${file}`);
            }
        }
    }

    async createBundle() {
        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(path.join(this.outputDir, this.bundleName));
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', () => {
                console.log(`📦 Bundle size: ${archive.pointer()} bytes`);
                resolve();
            });

            archive.on('error', reject);
            archive.pipe(output);

            // Add bundle configuration
            archive.append(JSON.stringify(this.bundleConfig, null, 2), { name: 'mcp-bundle.json' });

            // Add all required files
            this.bundleConfig.files.forEach(file => {
                archive.file(file, { name: file });
            });

            // Add additional documentation
            const additionalFiles = ['README.md', 'INSTALL.md', 'LICENSE'];
            additionalFiles.forEach(file => {
                try {
                    archive.file(file, { name: file });
                } catch {
                    // File doesn't exist, skip
                }
            });

            archive.finalize();
        });
    }

    async generateInstallationScript() {
        const installScript = `#!/bin/bash

# Durandal Memory MCP Bundle Installation Script
# Version: ${this.bundleConfig.version}

echo "🗡️  Installing Durandal Memory MCP Bundle v${this.bundleConfig.version}"
echo "================================================"

# Check Node.js version
NODE_VERSION=$(node --version | cut -c 2-)
REQUIRED_VERSION="${this.bundleConfig.requirements.node.substring(2)}"

if [ "$(printf '%s\\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js version $NODE_VERSION is below required $REQUIRED_VERSION"
    exit 1
fi

echo "✅ Node.js version: $NODE_VERSION"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Setup configuration
if [ ! -f ".env" ]; then
    echo "📄 Creating .env configuration file..."
    cp .env.distribution .env
    echo "⚠️  Please edit .env file with your configuration"
else
    echo "📄 .env file already exists"
fi

# Test installation
echo "🧪 Testing MCP server..."
timeout 5 node durandal-mcp-server-v2.js > /dev/null 2>&1 &
SERVER_PID=$!

sleep 2

if kill -0 $SERVER_PID 2>/dev/null; then
    echo "✅ MCP server started successfully"
    kill $SERVER_PID
else
    echo "❌ MCP server failed to start"
    exit 1
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Add to Claude Code MCP configuration:"
echo "   {\"durandal-memory\": {\"command\": \"node\", \"args\": [\"$(pwd)/durandal-mcp-server-v2.js\"]}}"
echo ""
`;

        await fsPromises.writeFile(path.join(this.outputDir, 'install.sh'), installScript);
        console.log('📜 Generated installation script: install.sh');
    }
}

// Build bundle if script is run directly
if (require.main === module) {
    const builder = new MCPBundleBuilder();
    builder.build();
}

module.exports = MCPBundleBuilder;