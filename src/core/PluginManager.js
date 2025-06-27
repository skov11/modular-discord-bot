const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

class PluginManager {
    constructor(client) {
        this.client = client;
        this.plugins = new Collection();
        this.commands = new Collection();
    }

    async loadPlugin(pluginPath, config = {}, botLogMethod = null, pluginName = null) {
        try {
            const PluginClass = require(pluginPath);
            const plugin = new PluginClass(this.client, config);
            
            // Store plugin metadata for reloading
            plugin.pluginPath = pluginPath;
            plugin.botLogMethod = botLogMethod;
            
            // Use provided plugin name or derive from path
            const actualPluginName = pluginName || path.basename(path.dirname(pluginPath));
            plugin.pluginName = actualPluginName; // Store the actual plugin name
            
            // Pass bot's log method to plugin if available
            if (botLogMethod) {
                plugin.botLog = botLogMethod;
            }
            
            await plugin.load();
            this.plugins.set(actualPluginName, plugin);
            
            plugin.getCommands().forEach(command => {
                this.commands.set(command.data.name, command);
            });
            
            console.log(`[PluginManager] Loaded plugin: ${actualPluginName}`);
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

    async reloadPlugin(pluginName, newConfig = null) {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) {
            throw new Error(`Plugin ${pluginName} not found`);
        }

        console.log(`[PluginManager] Reloading plugin: ${pluginName}`);
        
        // Store plugin metadata
        const pluginPath = plugin.pluginPath;
        const botLogMethod = plugin.botLogMethod;
        const config = newConfig || plugin.config;
        
        // Unload the plugin
        await this.unloadPlugin(pluginName);
        
        // Clear require cache for the plugin module
        delete require.cache[require.resolve(pluginPath)];
        
        // Reload the plugin with new config and preserve the plugin name
        const reloadedPlugin = await this.loadPlugin(pluginPath, config, botLogMethod, pluginName);
        
        console.log(`[PluginManager] Successfully reloaded plugin: ${pluginName}`);
        return reloadedPlugin;
    }

    async reloadPluginConfig(pluginName, newConfig) {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) {
            throw new Error(`Plugin ${pluginName} not found`);
        }

        // Check if config actually changed
        const currentConfigStr = JSON.stringify(plugin.config);
        const newConfigStr = JSON.stringify(newConfig);
        
        if (currentConfigStr === newConfigStr) {
            console.log(`[PluginManager] No config changes detected for ${pluginName}, skipping reload`);
            return plugin;
        }

        console.log(`[PluginManager] Config changed for ${pluginName}, reloading...`);
        return await this.reloadPlugin(pluginName, newConfig);
    }
}

module.exports = PluginManager;