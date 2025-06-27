const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const AuthManager = require('./auth');

class UIServer {
    constructor(port = 3000) {
        this.app = express();
        this.port = port;
        this.configPath = path.join(__dirname, '..', 'config.json');
        this.botInstance = null;
        this.server = null;
        this.wss = null;
        this.authManager = null;
        
        this.setupMiddleware();
        this.setupAuth();
        this.setupRoutes();
    }

    setBotInstance(botInstance) {
        this.botInstance = botInstance;
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, 'public')));
        this.app.set('view engine', 'ejs');
        this.app.set('views', path.join(__dirname, 'views'));
        
        // Session middleware (needed for authentication)
        const config = this.loadConfig();
        if (config.bot?.uiAuth?.enabled) {
            this.app.use(session({
                secret: config.bot.uiAuth.sessionSecret || 'fallback-secret-change-this',
                resave: false,
                saveUninitialized: false,
                cookie: {
                    secure: false, // Set to true in production with HTTPS
                    maxAge: 24 * 60 * 60 * 1000 // 24 hours
                }
            }));
        }
    }

    setupAuth() {
        const config = this.loadConfig();
        if (config.bot?.uiAuth?.enabled) {
            this.authManager = new AuthManager(config.bot, this.botInstance);
            this.authManager.setupRoutes(this.app);
        }
    }

    setupRoutes() {
        // Authentication middleware
        const requireAuth = this.authManager ? this.authManager.requireAuth.bind(this.authManager) : (req, res, next) => next();

        // Main dashboard (protected)
        this.app.get('/', requireAuth, (req, res) => {
            res.render('dashboard', { 
                title: 'Bot Management Dashboard',
                user: req.user || null
            });
        });

        // API Routes (protected)
        this.app.get('/api/config', requireAuth, (req, res) => {
            try {
                const config = this.loadConfig();
                res.json(config);
            } catch (error) {
                res.status(500).json({ error: 'Failed to load config', details: error.message });
            }
        });

        this.app.post('/api/config', requireAuth, async (req, res) => {
            try {
                this.saveConfig(req.body);
                this.notifyConfigChange(req.body);
                
                // Trigger bot config reload if bot instance is available
                if (this.botInstance && typeof this.botInstance.reloadConfig === 'function') {
                    try {
                        await this.botInstance.reloadConfig(req.body);
                        console.log('[UI] Bot configuration reloaded successfully');
                    } catch (reloadError) {
                        console.error('[UI] Failed to reload bot configuration:', reloadError);
                        // Still return success for the config save, but note the reload failure
                        return res.json({ 
                            success: true, 
                            message: 'Configuration saved successfully, but plugin reload failed. You may need to restart the bot.',
                            warning: reloadError.message
                        });
                    }
                }
                
                res.json({ success: true, message: 'Configuration saved and plugins reloaded successfully' });
            } catch (error) {
                res.status(500).json({ error: 'Failed to save config', details: error.message });
            }
        });

        this.app.get('/api/bot/status', requireAuth, (req, res) => {
            res.json({
                running: this.botInstance !== null && this.botInstance.client?.isReady(),
                status: this.botInstance?.client?.isReady() ? 'online' : 'offline'
            });
        });

        this.app.post('/api/bot/restart', requireAuth, (req, res) => {
            try {
                this.restartBot();
                res.json({ success: true, message: 'Bot restart initiated' });
            } catch (error) {
                res.status(500).json({ error: 'Failed to restart bot', details: error.message });
            }
        });

        this.app.get('/api/plugins', requireAuth, (req, res) => {
            try {
                const plugins = this.getAvailablePlugins();
                res.json(plugins);
            } catch (error) {
                res.status(500).json({ error: 'Failed to get plugins', details: error.message });
            }
        });
        
        this.app.post('/api/plugins/:pluginName/reload', requireAuth, async (req, res) => {
            try {
                const { pluginName } = req.params;
                
                if (this.botInstance && typeof this.botInstance.reloadPlugin === 'function') {
                    // Debug: log available plugins
                    const loadedPlugins = Array.from(this.botInstance.pluginManager.plugins.keys());
                    console.log(`[UI] Available plugins: ${loadedPlugins.join(', ')}`);
                    console.log(`[UI] Attempting to reload plugin: ${pluginName}`);
                    
                    await this.botInstance.reloadPlugin(pluginName);
                    res.json({ success: true, message: `Plugin ${pluginName} reloaded successfully` });
                } else {
                    res.status(503).json({ error: 'Bot instance not available for plugin reload' });
                }
            } catch (error) {
                console.error(`[UI] Plugin reload error:`, error);
                res.status(500).json({ error: 'Failed to reload plugin', details: error.message });
            }
        });
    }

    setupWebSocket() {
        this.wss = new WebSocket.Server({ port: this.port + 1 });
        
        this.wss.on('connection', (ws) => {
            console.log(`[UI] WebSocket client connected`);
            
            ws.on('close', () => {
                console.log(`[UI] WebSocket client disconnected`);
            });
        });
    }

    loadConfig() {
        if (!fs.existsSync(this.configPath)) {
            return {
                bot: {
                    token: '',
                    clientId: '',
                    guildId: '',
                    enableUI: false,
                    uiPort: 3000
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
        if (!this.wss) return;
        
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
        if (this.botInstance) {
            console.log('[UI] Bot restart requested via UI');
            // In a real implementation, this would restart the bot
            // For now, we'll just log the request
            this.notifyBotRestart();
        } else {
            console.log('[UI] No bot instance available for restart');
        }
    }

    notifyBotRestart() {
        if (!this.wss) return;
        
        this.wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'botRestart',
                    message: 'Bot restart initiated'
                }));
            }
        });
    }

    start() {
        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(this.port, () => {
                    console.log(`[UI] Web interface running on http://localhost:${this.port}`);
                    this.setupWebSocket();
                    console.log(`[UI] WebSocket server running on ws://localhost:${this.port + 1}`);
                    resolve();
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    stop() {
        if (this.server) {
            this.server.close();
            console.log('[UI] Web server stopped');
        }
        
        if (this.wss) {
            this.wss.close();
            console.log('[UI] WebSocket server stopped');
        }
    }
}

module.exports = UIServer;