const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

class UIServer {
    constructor() {
        this.app = express();
        this.port = process.env.UI_PORT || 3000;
        this.configPath = path.join(__dirname, '..', 'config.json');
        this.botInstance = null;
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, 'public')));
        this.app.set('view engine', 'ejs');
        this.app.set('views', path.join(__dirname, 'views'));
    }

    setupRoutes() {
        // Main dashboard
        this.app.get('/', (req, res) => {
            res.render('dashboard', { title: 'Bot Management Dashboard' });
        });

        // API Routes
        this.app.get('/api/config', (req, res) => {
            try {
                const config = this.loadConfig();
                res.json(config);
            } catch (error) {
                res.status(500).json({ error: 'Failed to load config', details: error.message });
            }
        });

        this.app.post('/api/config', (req, res) => {
            try {
                this.saveConfig(req.body);
                this.notifyConfigChange(req.body);
                res.json({ success: true, message: 'Configuration saved successfully' });
            } catch (error) {
                res.status(500).json({ error: 'Failed to save config', details: error.message });
            }
        });

        this.app.get('/api/bot/status', (req, res) => {
            res.json({
                running: this.botInstance !== null,
                status: this.botInstance ? 'online' : 'offline'
            });
        });

        this.app.post('/api/bot/restart', (req, res) => {
            try {
                this.restartBot();
                res.json({ success: true, message: 'Bot restart initiated' });
            } catch (error) {
                res.status(500).json({ error: 'Failed to restart bot', details: error.message });
            }
        });

        this.app.get('/api/plugins', (req, res) => {
            try {
                const plugins = this.getAvailablePlugins();
                res.json(plugins);
            } catch (error) {
                res.status(500).json({ error: 'Failed to get plugins', details: error.message });
            }
        });
    }

    setupWebSocket() {
        this.wss = new WebSocket.Server({ port: this.port + 1 });
        
        this.wss.on('connection', (ws) => {
            console.log('WebSocket client connected');
            
            ws.on('close', () => {
                console.log('WebSocket client disconnected');
            });
        });
    }

    loadConfig() {
        if (!fs.existsSync(this.configPath)) {
            return {
                bot: {
                    token: '',
                    clientId: '',
                    guildId: ''
                },
                plugins: {}
            };
        }
        
        const configData = fs.readFileSync(this.configPath, 'utf8');
        return JSON.parse(configData);
    }

    saveConfig(config) {
        fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    }

    notifyConfigChange(config) {
        // Broadcast to all WebSocket clients
        this.wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'configChanged',
                    config: config
                }));
            }
        });
    }

    getAvailablePlugins() {
        const pluginsDir = path.join(__dirname, '..', 'src', 'plugins');
        const plugins = [];
        
        if (fs.existsSync(pluginsDir)) {
            const pluginDirs = fs.readdirSync(pluginsDir).filter(dir => {
                const pluginPath = path.join(pluginsDir, dir);
                return fs.statSync(pluginPath).isDirectory() && 
                       fs.existsSync(path.join(pluginPath, 'index.js'));
            });
            
            pluginDirs.forEach(dir => {
                plugins.push({
                    name: dir,
                    path: path.join(pluginsDir, dir)
                });
            });
        }
        
        return plugins;
    }

    restartBot() {
        // In a real implementation, this would communicate with the main bot process
        console.log('Bot restart requested');
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`UI Server running on http://localhost:${this.port}`);
            console.log(`WebSocket server running on ws://localhost:${this.port + 1}`);
        });
    }
}

const uiServer = new UIServer();
uiServer.start();