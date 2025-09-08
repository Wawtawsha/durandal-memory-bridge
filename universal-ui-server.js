const express = require('express');
const path = require('path');
const UniversalMemorySystem = require('./universal-memory-system');

class UniversalUIServer {
    constructor(port = 3000) {
        this.app = express();
        this.port = port;
        this.memory = new UniversalMemorySystem();
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        this.app.use(express.json());
        this.app.use(express.static('public'));
    }

    setupRoutes() {
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'universal-dashboard.html'));
        });

        this.app.post('/api/initialize', async (req, res) => {
            try {
                const connections = await this.memory.initialize();
                res.json({ success: true, connections, status: this.memory.getStatus() });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        this.app.post('/api/provider', async (req, res) => {
            try {
                const { provider } = req.body;
                await this.memory.setProvider(provider);
                res.json({ success: true, status: this.memory.getStatus() });
            } catch (error) {
                res.status(400).json({ success: false, error: error.message });
            }
        });

        this.app.post('/api/project', async (req, res) => {
            try {
                const { project } = req.body;
                await this.memory.setProject(project);
                res.json({ success: true, status: this.memory.getStatus() });
            } catch (error) {
                res.status(400).json({ success: false, error: error.message });
            }
        });

        this.app.post('/api/session', async (req, res) => {
            try {
                const { session } = req.body;
                await this.memory.setSession(session);
                res.json({ success: true, status: this.memory.getStatus() });
            } catch (error) {
                res.status(400).json({ success: false, error: error.message });
            }
        });

        this.app.post('/api/message', async (req, res) => {
            try {
                const { message } = req.body;
                const result = await this.memory.sendMessage(message);
                res.json({ success: true, result });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        this.app.get('/api/status', (req, res) => {
            res.json(this.memory.getStatus());
        });

        this.app.get('/api/providers', (req, res) => {
            res.json({ providers: this.memory.gateway.getAvailableProviders() });
        });

        this.app.post('/api/reset-costs', (req, res) => {
            this.memory.gateway.resetCostTracking();
            res.json({ success: true, message: 'Cost tracking reset' });
        });
    }

    async start() {
        this.app.listen(this.port, () => {
            console.log(`🌐 Universal AI Dashboard running at http://localhost:${this.port}`);
        });
    }
}

if (require.main === module) {
    const server = new UniversalUIServer(3000);
    server.start();
}

module.exports = UniversalUIServer;