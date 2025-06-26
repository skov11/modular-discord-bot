const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const PluginManager = require('./core/PluginManager');
const fs = require('fs');
const path = require('path');

class DiscordBot {
    constructor(configPath) {
        this.config = this.loadConfig(configPath);
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

    async start() {
        await this.setupEventHandlers();
        await this.login();
        await this.loadPlugins();
        await this.deployCommands();
    }

    async setupEventHandlers() {
        this.client.once('ready', () => {
            console.log(`Bot is ready! Logged in as ${this.client.user.tag}`);
        });

        this.client.on('interactionCreate', async (interaction) => {
            if (!interaction.isCommand()) return;

            const command = this.pluginManager.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`Error executing command ${interaction.commandName}:`, error);
                
                const errorMessage = 'There was an error while executing this command!';
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: errorMessage, ephemeral: true });
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true });
                }
            }
        });

        this.client.on('error', (error) => {
            console.error('Discord client error:', error);
        });
    }

    async login() {
        try {
            await this.client.login(this.config.token);
        } catch (error) {
            console.error('Failed to login:', error);
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
                            await this.pluginManager.loadPlugin(pluginPath, pluginConfig);
                        } catch (error) {
                            console.error(`Failed to load plugin ${pluginName}:`, error);
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
            console.log('No commands to deploy');
            return;
        }

        const rest = new REST({ version: '10' }).setToken(this.config.token);

        try {
            console.log(`Started refreshing ${commands.length} application (/) commands.`);

            const data = await rest.put(
                Routes.applicationGuildCommands(this.config.clientId, this.config.guildId),
                { body: commands },
            );

            console.log(`Successfully reloaded ${data.length} application (/) commands.`);
        } catch (error) {
            console.error('Error deploying commands:', error);
        }
    }

    async stop() {
        console.log('Shutting down bot...');
        
        for (const plugin of this.pluginManager.getAllPlugins()) {
            await this.pluginManager.unloadPlugin(plugin.name);
        }
        
        this.client.destroy();
    }
}

module.exports = DiscordBot;