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
        this.config = null;
        
        // Load config first before any setup
        this.loadConfig();
        
        // Now setup everything else
        this.setupMiddleware();
        this.setupAuth();
        this.setupRoutes();
    }
    
    loadConfig() {
        if (!fs.existsSync(this.configPath)) {
            this.config = {
                bot: {
                    token: '',
                    clientId: '',
                    guildId: '',
                    enableUI: false,
                    uiPort: 3000
                },
                plugins: {}
            };
            return;
        }
        
        try {
            const configData = fs.readFileSync(this.configPath, 'utf8');
            this.config = JSON.parse(configData);
        } catch (error) {
            console.error('[UI] Failed to load config:', error);
            this.config = {};
        }
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
        if (this.config.bot?.uiAuth?.enabled) {
            this.app.use(session({
                secret: this.config.bot.uiAuth.sessionSecret || 'fallback-secret-change-this',
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
        const config = this.config;
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
                // Reload config from file to ensure we have the latest
                this.loadConfig();
                res.json(this.config);
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
        
        this.app.get('/api/roles', requireAuth, async (req, res) => {
            try {
                if (this.botInstance && this.botInstance.client && this.botInstance.client.guilds.cache.size > 0) {
                    // Get the guild using the configured guild ID
                    const guildId = this.config.bot?.guildId;
                    let guild = null;
                    
                    if (guildId) {
                        guild = this.botInstance.client.guilds.cache.get(guildId);
                    }
                    
                    if (!guild) {
                        // Fallback to first guild if configured guild not found
                        guild = this.botInstance.client.guilds.cache.first();
                    }
                    
                    if (!guild) {
                        return res.json({ success: false, roles: [], message: 'No guild found' });
                    }
                    
                    // Get all roles except @everyone
                    const roles = guild.roles.cache
                        .filter(role => role.name !== '@everyone')
                        .map(role => ({
                            id: role.id,
                            name: role.name,
                            color: role.hexColor,
                            position: role.position,
                            managed: role.managed // Indicates if it's a bot role
                        }))
                        .sort((a, b) => b.position - a.position); // Sort by position (highest first)
                    
                    console.log(`[UI] Found ${roles.length} roles in guild ${guild.name}`);
                    res.json({ success: true, roles });
                } else {
                    res.json({ success: false, roles: [], message: 'Bot not connected to Discord' });
                }
            } catch (error) {
                console.error('[UI] Error fetching roles:', error);
                res.status(500).json({ error: 'Failed to fetch roles', details: error.message });
            }
        });
        
        this.app.get('/api/channels', requireAuth, async (req, res) => {
            try {
                if (this.botInstance && this.botInstance.client && this.botInstance.client.guilds.cache.size > 0) {
                    // Get the guild using the configured guild ID
                    const guildId = this.config.bot?.guildId;
                    let guild = null;
                    
                    if (guildId) {
                        guild = this.botInstance.client.guilds.cache.get(guildId);
                    }
                    
                    if (!guild) {
                        // Fallback to first guild if configured guild not found
                        guild = this.botInstance.client.guilds.cache.first();
                    }
                    
                    if (!guild) {
                        return res.json({ success: false, channels: [], message: 'No guild found' });
                    }
                    
                    // Get all text channels
                    const channels = guild.channels.cache
                        .filter(channel => channel.type === 0) // 0 = GUILD_TEXT
                        .map(channel => ({
                            id: channel.id,
                            name: channel.name,
                            category: channel.parent ? channel.parent.name : 'No Category'
                        }))
                        .sort((a, b) => {
                            // Sort by category first, then by name
                            if (a.category !== b.category) {
                                return a.category.localeCompare(b.category);
                            }
                            return a.name.localeCompare(b.name);
                        });
                    
                    console.log(`[UI] Found ${channels.length} text channels in guild ${guild.name}`);
                    res.json({ success: true, channels });
                } else {
                    res.json({ success: false, channels: [], message: 'Bot not connected to Discord' });
                }
            } catch (error) {
                console.error('[UI] Error fetching channels:', error);
                res.status(500).json({ error: 'Failed to fetch channels', details: error.message });
            }
        });

        this.app.get('/api/moderation/logs', requireAuth, async (req, res) => {
            try {
                if (this.botInstance && this.botInstance.pluginManager) {
                    const moderationPlugin = this.botInstance.pluginManager.plugins.get('moderation');
                    
                    if (moderationPlugin && typeof moderationPlugin.getServerModerationLog === 'function') {
                        const filters = {
                            userId: req.query.userId,
                            action: req.query.action,
                            moderator: req.query.moderator,
                            hours: req.query.hours ? parseInt(req.query.hours) : undefined
                        };

                        const logs = moderationPlugin.getServerModerationLog(filters);
                        res.json({ success: true, logs });
                    } else {
                        res.json({ success: false, logs: [], message: 'Moderation plugin not available' });
                    }
                } else {
                    res.status(503).json({ error: 'Bot instance not available' });
                }
            } catch (error) {
                console.error('[UI] Error fetching moderation logs:', error);
                res.status(500).json({ error: 'Failed to fetch moderation logs', details: error.message });
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

    saveConfig(config) {
        fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
        // Update internal config reference
        this.config = config;
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
        
        // Exclude example plugins from UI
        const excludedPlugins = ['example'];
        
        if (fs.existsSync(pluginsDir)) {
            const pluginDirs = fs.readdirSync(pluginsDir).filter(dir => {
                const pluginPath = path.join(pluginsDir, dir);
                return fs.statSync(pluginPath).isDirectory() && 
                       fs.existsSync(path.join(pluginPath, 'index.js')) &&
                       !excludedPlugins.includes(dir);
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