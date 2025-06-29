const { Collection } = require('discord.js');

class Plugin {
    constructor(client, config) {
        this.client = client;
        this.config = config;
        this.name = this.constructor.name;
        this.commands = new Collection();
        this.enabled = true;
    }

    async load() {
        throw new Error(`Plugin ${this.name} must implement load() method`);
    }

    async unload() {
        throw new Error(`Plugin ${this.name} must implement unload() method`);
    }

    registerCommand(command) {
        this.commands.set(command.data.name, command);
    }

    getCommands() {
        return Array.from(this.commands.values());
    }

    log(message, type = 'info') {
        // Skip debug messages if debug mode is disabled
        if (type === 'debug' && !this.botConfig?.debugMode) {
            return;
        }
        
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${this.name}] [${type.toUpperCase()}] ${message}`);
    }
}

module.exports = Plugin;