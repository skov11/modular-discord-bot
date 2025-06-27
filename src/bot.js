const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const PluginManager = require('./core/PluginManager');
const fs = require('fs');
const path = require('path');

class DiscordBot {
    constructor(configPath) {
        this.config = this.loadConfig(configPath);
        this.logFile = path.join(path.dirname(configPath), 'bot.log');
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.DirectMessages
            ]
        });
        
        this.pluginManager = new PluginManager(this.client);
    }

    loadConfig(configPath) {
        try {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } catch (error) {
            console.error('Failed to load config:', error);
            process.exit(1);
        }
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [BOT] [${type.toUpperCase()}] ${message}`;
        console.log(logMessage);
        
        try {
            fs.appendFileSync(this.logFile, `${logMessage}\n`);
        } catch (error) {
            console.error('Failed to write to bot log file:', error);
        }
    }

    async start() {
        await this.setupEventHandlers();
        await this.login();
        await this.loadPlugins();
        await this.deployCommands();
    }

    async setupEventHandlers() {
        this.client.once('ready', () => {
            this.log(`Bot is ready! Logged in as ${this.client.user.tag}`);
        });

        this.client.on('interactionCreate', async (interaction) => {
            if (!interaction.isCommand()) return;

            const command = this.pluginManager.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                this.log(`Error executing command ${interaction.commandName}: ${error.message}`, 'error');
                
                const errorMessage = 'There was an error while executing this command!';
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: errorMessage, flags: 64 });
                } else {
                    await interaction.reply({ content: errorMessage, flags: 64 });
                }
            }
        });

        this.client.on('error', (error) => {
            this.log(`Discord client error: ${error.message}`, 'error');
        });
    }

    async login() {
        try {
            await this.client.login(this.config.bot.token);
        } catch (error) {
            this.log(`Failed to login: ${error.message}`, 'error');
            process.exit(1);
        }
    }

    async loadPlugins() {
        const pluginsDir = path.join(__dirname, 'plugins');
        
        if (this.config.plugins) {
            for (const [pluginName, pluginConfig] of Object.entries(this.config.plugins)) {
                if (pluginConfig.enabled !== false) {
                    const pluginPath = path.join(pluginsDir, pluginName, 'index.js');
                    if (fs.existsSync(pluginPath)) {
                        try {
                            await this.pluginManager.loadPlugin(pluginPath, pluginConfig, this.log.bind(this), pluginName);
                        } catch (error) {
                            this.log(`Failed to load plugin ${pluginName}: ${error.message}`, 'error');
                        }
                    }
                }
            }
        } else {
            await this.pluginManager.loadPluginsFromDirectory(pluginsDir);
        }
    }

    async deployCommands() {
        const commands = [];
        this.pluginManager.commands.forEach(command => {
            commands.push(command.data.toJSON());
        });

        if (commands.length === 0) {
            this.log('No commands to deploy');
            return;
        }

        const rest = new REST({ version: '10' }).setToken(this.config.bot.token);

        try {
            this.log(`Started refreshing ${commands.length} application (/) commands.`);

            const data = await rest.put(
                Routes.applicationGuildCommands(this.config.bot.clientId, this.config.bot.guildId),
                { body: commands },
            );

            this.log(`Successfully reloaded ${data.length} application (/) commands.`);
        } catch (error) {
            this.log(`Error deploying commands: ${error.message}`, 'error');
        }
    }

    async reloadConfig(newConfig) {
        this.log('Configuration change detected, reloading affected plugins...');
        
        try {
            const oldConfig = this.config;
            this.config = newConfig;
            
            // Check which plugins need reloading
            if (newConfig.plugins && oldConfig.plugins) {
                for (const [pluginName, pluginConfig] of Object.entries(newConfig.plugins)) {
                    const oldPluginConfig = oldConfig.plugins[pluginName];
                    
                    if (pluginConfig.enabled !== false) {
                        if (!oldPluginConfig) {
                            // New plugin, load it
                            const pluginPath = path.join(__dirname, 'plugins', pluginName, 'index.js');
                            if (fs.existsSync(pluginPath)) {
                                await this.pluginManager.loadPlugin(pluginPath, pluginConfig, this.log.bind(this), pluginName);
                            }
                        } else {
                            // Existing plugin, reload if config changed
                            await this.pluginManager.reloadPluginConfig(pluginName, pluginConfig);
                        }
                    } else if (oldPluginConfig && this.pluginManager.getPlugin(pluginName)) {
                        // Plugin disabled, unload it
                        await this.pluginManager.unloadPlugin(pluginName);
                    }
                }
                
                // Check for removed plugins
                for (const [pluginName] of Object.entries(oldConfig.plugins)) {
                    if (!newConfig.plugins[pluginName] && this.pluginManager.getPlugin(pluginName)) {
                        await this.pluginManager.unloadPlugin(pluginName);
                    }
                }
            }
            
            // Redeploy commands if any plugins were reloaded
            await this.deployCommands();
            this.log('Configuration reload completed successfully');
            
        } catch (error) {
            this.log(`Error during configuration reload: ${error.message}`, 'error');
            throw error;
        }
    }

    async reloadPlugin(pluginName) {
        try {
            await this.pluginManager.reloadPlugin(pluginName);
            await this.deployCommands();
            this.log(`Plugin ${pluginName} reloaded successfully`);
        } catch (error) {
            this.log(`Failed to reload plugin ${pluginName}: ${error.message}`, 'error');
            throw error;
        }
    }

    async stop() {
        this.log('Shutting down bot...');
        
        for (const plugin of this.pluginManager.getAllPlugins()) {
            await this.pluginManager.unloadPlugin(plugin.name);
        }
        
        this.client.destroy();
        this.log('Bot shutdown complete');
    }
}

module.exports = DiscordBot;