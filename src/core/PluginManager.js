const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

class PluginManager {
    constructor(client) {
        this.client = client;
        this.plugins = new Collection();
        this.commands = new Collection();
    }

    async loadPlugin(pluginPath, config = {}, botLogMethod = null) {
        try {
            const PluginClass = require(pluginPath);
            const plugin = new PluginClass(this.client, config);
            
            // Pass bot's log method to plugin if available
            if (botLogMethod) {
                plugin.botLog = botLogMethod;
            }
            
            await plugin.load();
            this.plugins.set(plugin.name, plugin);
            
            plugin.getCommands().forEach(command => {
                this.commands.set(command.data.name, command);
            });
            
            console.log(`[PluginManager] Loaded plugin: ${plugin.name}`);
            return plugin;
        } catch (error) {
            console.error(`[PluginManager] Failed to load plugin at ${pluginPath}:`, error);
            throw error;
        }
    }

    async loadPluginsFromDirectory(directory) {
        const pluginDirs = fs.readdirSync(directory).filter(file => {
            const fullPath = path.join(directory, file);
            return fs.statSync(fullPath).isDirectory();
        });

        for (const pluginDir of pluginDirs) {
            const pluginPath = path.join(directory, pluginDir);
            const indexPath = path.join(pluginPath, 'index.js');
            
            if (fs.existsSync(indexPath)) {
                const configPath = path.join(pluginPath, 'config.json');
                let config = {};
                
                if (fs.existsSync(configPath)) {
                    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                }
                
                try {
                    await this.loadPlugin(indexPath, config);
                } catch (error) {
                    console.error(`Failed to load plugin from ${pluginDir}:`, error);
                }
            }
        }
    }

    async unloadPlugin(pluginName) {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) {
            throw new Error(`Plugin ${pluginName} not found`);
        }

        await plugin.unload();
        
        plugin.getCommands().forEach(command => {
            this.commands.delete(command.data.name);
        });
        
        this.plugins.delete(pluginName);
        console.log(`[PluginManager] Unloaded plugin: ${pluginName}`);
    }

    getPlugin(name) {
        return this.plugins.get(name);
    }

    getAllPlugins() {
        return Array.from(this.plugins.values());
    }

    getAllCommands() {
        return this.commands;
    }

    async reloadPlugin(pluginName) {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) {
            throw new Error(`Plugin ${pluginName} not found`);
        }

        const config = plugin.config;
        await this.unloadPlugin(pluginName);
        
        delete require.cache[require.resolve(plugin.constructor)];
        
        await this.loadPlugin(plugin.constructor, config);
    }
}

module.exports = PluginManager;