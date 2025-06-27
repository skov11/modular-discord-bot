# Plugin Development Guide

This guide covers how to create custom plugins for the Modular Discord Bot framework.

## Plugin Architecture

### Base Plugin Class

All plugins must extend the base `Plugin` class:

```javascript
const Plugin = require("../../core/Plugin");
const { SlashCommandBuilder } = require("discord.js");

class MyPlugin extends Plugin {
    constructor(client, config) {
        super(client, config);
        // Plugin-specific initialization
    }

    async load() {
        // Plugin loading logic
        this.log("Loading My Plugin...");
        
        // Register commands
        this.registerCommand(myCommand);
        
        this.log("My Plugin loaded successfully");
    }

    async unload() {
        // Plugin cleanup logic
        this.log("My Plugin unloaded");
    }
}

module.exports = MyPlugin;
```

### Plugin Structure

Each plugin should be organized as follows:

```
src/plugins/my-plugin/
├── index.js          # Main plugin file
├── commands/          # Command definitions (optional)
├── events/           # Event handlers (optional)
├── utils/            # Utility functions (optional)
└── README.md         # Plugin documentation
```

## Core Plugin Methods

### Required Methods

#### `async load()`
Called when the plugin is loaded. Use this to:
- Register slash commands
- Set up event listeners
- Initialize plugin-specific data
- Perform any startup tasks

#### `async unload()`
Called when the plugin is unloaded. Use this to:
- Clean up resources
- Remove event listeners
- Save any persistent data
- Perform cleanup tasks

### Optional Methods

#### `async reloadConfig(newConfig)`
Called when configuration is updated via hot-reload:

```javascript
async reloadConfig(newConfig) {
    this.config = newConfig;
    // Update plugin behavior based on new config
    this.log("Configuration reloaded");
}
```

## Command Registration

### Basic Command

```javascript
const myCommand = {
    data: new SlashCommandBuilder()
        .setName("mycommand")
        .setDescription("My custom command")
        .addStringOption(option =>
            option
                .setName("input")
                .setDescription("Input parameter")
                .setRequired(true)
        ),
    execute: async (interaction) => {
        const input = interaction.options.getString("input");
        await interaction.reply(`You said: ${input}`);
    }
};

// Register in load() method
this.registerCommand(myCommand);
```

### Command with Permissions

```javascript
const adminCommand = {
    data: new SlashCommandBuilder()
        .setName("admin")
        .setDescription("Admin only command")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    execute: async (interaction) => {
        // Command logic
    }
};
```

### Command with Subcommands

```javascript
const complexCommand = {
    data: new SlashCommandBuilder()
        .setName("manage")
        .setDescription("Management commands")
        .addSubcommand(subcommand =>
            subcommand
                .setName("add")
                .setDescription("Add something")
                .addStringOption(option =>
                    option.setName("item").setDescription("Item to add").setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("remove")
                .setDescription("Remove something")
                .addStringOption(option =>
                    option.setName("item").setDescription("Item to remove").setRequired(true)
                )
        ),
    execute: async (interaction) => {
        const subcommand = interaction.options.getSubcommand();
        const item = interaction.options.getString("item");
        
        switch (subcommand) {
            case "add":
                // Add logic
                break;
            case "remove":
                // Remove logic
                break;
        }
    }
};
```

## Configuration

### Plugin Configuration Structure

Add your plugin configuration to `config.json`:

```json
{
  "plugins": {
    "myPlugin": {
      "enabled": true,
      "setting1": "value1",
      "setting2": 123,
      "complexSetting": {
        "nested": "value"
      }
    }
  }
}
```

### Accessing Configuration

```javascript
class MyPlugin extends Plugin {
    async load() {
        // Access plugin config
        const setting1 = this.config.setting1;
        const enabled = this.config.enabled;
        
        // Use configuration
        if (enabled) {
            this.log(`Setting1 is: ${setting1}`);
        }
    }
}
```

### Configuration Validation

```javascript
async load() {
    // Validate required configuration
    if (!this.config.requiredSetting) {
        throw new Error("requiredSetting is not configured");
    }
    
    if (typeof this.config.numericSetting !== 'number') {
        throw new Error("numericSetting must be a number");
    }
}
```

## Logging

### Basic Logging

```javascript
// Info logging
this.log("Plugin operation completed");

// Error logging
this.log("An error occurred", "error");

// Debug logging (only shows when debug mode enabled)
this.log("Debug information", "debug");
```

### Structured Logging

```javascript
// Log with additional context
this.log(`User ${interaction.user.tag} executed command ${interaction.commandName}`);

// Log errors with details
this.log(`Failed to process user ${userId}: ${error.message}`, "error");
```

## Event Handling

### Discord Events

```javascript
class MyPlugin extends Plugin {
    async load() {
        // Listen to Discord events
        this.client.on('messageCreate', this.handleMessage.bind(this));
        this.client.on('guildMemberAdd', this.handleMemberJoin.bind(this));
    }
    
    async handleMessage(message) {
        if (message.author.bot) return;
        
        // Process message
        this.log(`Message from ${message.author.tag}: ${message.content}`);
    }
    
    async handleMemberJoin(member) {
        // Welcome new member
        this.log(`New member joined: ${member.user.tag}`);
    }
    
    async unload() {
        // Remove event listeners
        this.client.removeAllListeners('messageCreate');
        this.client.removeAllListeners('guildMemberAdd');
    }
}
```

### Custom Events

```javascript
// Emit custom events
this.client.emit('myPlugin:customEvent', { data: 'value' });

// Listen to custom events from other plugins
this.client.on('otherPlugin:event', this.handleCustomEvent.bind(this));
```

## Database Integration

### File-based Storage

```javascript
const fs = require('fs').promises;
const path = require('path');

class MyPlugin extends Plugin {
    constructor(client, config) {
        super(client, config);
        this.dataFile = path.join(__dirname, 'data.json');
    }
    
    async loadData() {
        try {
            const data = await fs.readFile(this.dataFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return {}; // Return default if file doesn't exist
        }
    }
    
    async saveData(data) {
        await fs.writeFile(this.dataFile, JSON.stringify(data, null, 2));
    }
}
```

### External Database

```javascript
// Example with sqlite3
const sqlite3 = require('sqlite3').verbose();

class MyPlugin extends Plugin {
    async load() {
        this.db = new sqlite3.Database('plugin_data.db');
        
        // Create tables
        this.db.run(`
            CREATE TABLE IF NOT EXISTS my_table (
                id INTEGER PRIMARY KEY,
                data TEXT
            )
        `);
    }
    
    async unload() {
        if (this.db) {
            this.db.close();
        }
    }
}
```

## Web Interface Integration

### Adding Plugin to UI

To add your plugin to the web interface, modify `ui/public/js/dashboard.js`:

```javascript
// In createPluginCard method
if (plugin.name === 'verification') {
    card.innerHTML = this.createVerificationPluginForm(config);
} else if (plugin.name === 'purge') {
    card.innerHTML = this.createPurgePluginForm(config);
} else if (plugin.name === 'myPlugin') {
    card.innerHTML = this.createMyPluginForm(config);
} else {
    card.innerHTML = this.createGenericPluginForm(plugin, config);
}
```

### Custom Plugin Form

```javascript
createMyPluginForm(config) {
    return `
        <div class="card-header d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center flex-grow-1">
                <h6 class="mb-0 me-3"><i class="fas fa-cog"></i> My Plugin</h6>
                <button class="btn btn-sm btn-outline-secondary collapse-toggle collapsed" type="button" 
                        data-bs-toggle="collapse" data-bs-target="#myPlugin-config" 
                        aria-expanded="false" aria-controls="myPlugin-config">
                    <i class="fas fa-chevron-down"></i>
                </button>
                <button class="btn btn-sm btn-outline-info ms-2 reload-plugin-btn" type="button" 
                        data-plugin="myPlugin" title="Reload plugin">
                    <i class="fas fa-sync-alt"></i>
                </button>
                <div class="ms-auto me-3">
                    <span class="badge bg-secondary">/mycommand</span>
                </div>
            </div>
            <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="myPlugin-enabled" 
                       ${config.enabled !== false ? 'checked' : ''}>
                <label class="form-check-label" for="myPlugin-enabled">Enabled</label>
            </div>
        </div>
        <div class="collapse" id="myPlugin-config">
            <div class="card-body">
                <div class="mb-3">
                    <label for="myPlugin-setting1" class="form-label">Setting 1</label>
                    <input type="text" class="form-control" id="myPlugin-setting1" 
                           value="${config.setting1 || ''}" placeholder="Enter value">
                </div>
                <div class="mb-3">
                    <label for="myPlugin-setting2" class="form-label">Setting 2</label>
                    <input type="number" class="form-control" id="myPlugin-setting2" 
                           value="${config.setting2 || 0}">
                </div>
            </div>
        </div>
    `;
}
```

### Configuration Update Handler

```javascript
// In updateConfigFromForm method
const myPluginEnabled = document.getElementById('myPlugin-enabled');
if (myPluginEnabled) {
    if (!this.config.plugins.myPlugin) {
        this.config.plugins.myPlugin = {};
    }
    
    this.config.plugins.myPlugin.enabled = myPluginEnabled.checked;
    this.config.plugins.myPlugin.setting1 = document.getElementById('myPlugin-setting1')?.value || '';
    this.config.plugins.myPlugin.setting2 = parseInt(document.getElementById('myPlugin-setting2')?.value) || 0;
}
```

## Error Handling

### Command Error Handling

```javascript
const myCommand = {
    data: new SlashCommandBuilder()
        .setName("mycommand")
        .setDescription("My command"),
    execute: async (interaction) => {
        try {
            // Command logic here
            await interaction.reply("Success!");
            
        } catch (error) {
            this.log(`Error in mycommand: ${error.message}`, "error");
            
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply("An error occurred while processing your command.");
            } else {
                await interaction.reply({ 
                    content: "An error occurred while processing your command.", 
                    ephemeral: true 
                });
            }
        }
    }
};
```

### Plugin Error Handling

```javascript
async load() {
    try {
        // Plugin loading logic
        this.log("Plugin loaded successfully");
    } catch (error) {
        this.log(`Failed to load plugin: ${error.message}`, "error");
        throw error; // Re-throw to prevent plugin from loading
    }
}
```

## Best Practices

### Code Organization

1. **Separate Concerns**: Keep commands, events, and utilities in separate files
2. **Use Descriptive Names**: Clear function and variable names
3. **Comment Complex Logic**: Explain non-obvious code sections
4. **Consistent Style**: Follow existing code formatting

### Performance

1. **Lazy Loading**: Only load resources when needed
2. **Efficient Queries**: Minimize database/API calls
3. **Memory Management**: Clean up resources in unload()
4. **Rate Limiting**: Respect Discord API limits

### Security

1. **Input Validation**: Validate all user inputs
2. **Permission Checks**: Verify user permissions before actions
3. **Sanitize Data**: Clean data before storage/display
4. **Error Information**: Don't expose sensitive data in error messages

### Configuration

1. **Default Values**: Provide sensible defaults
2. **Validation**: Validate configuration on load
3. **Documentation**: Document all configuration options
4. **Hot-Reload Support**: Support configuration updates without restart

## Example Plugin: Simple Counter

```javascript
const Plugin = require("../../core/Plugin");
const { SlashCommandBuilder } = require("discord.js");
const fs = require('fs').promises;
const path = require('path');

class CounterPlugin extends Plugin {
    constructor(client, config) {
        super(client, config);
        this.dataFile = path.join(__dirname, 'counter.json');
        this.counters = {};
    }

    async load() {
        this.log("Loading Counter Plugin...");
        
        // Load saved data
        await this.loadCounters();
        
        // Register commands
        const counterCommand = {
            data: new SlashCommandBuilder()
                .setName("counter")
                .setDescription("Manage counters")
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("increment")
                        .setDescription("Increment a counter")
                        .addStringOption(option =>
                            option.setName("name").setDescription("Counter name").setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("get")
                        .setDescription("Get counter value")
                        .addStringOption(option =>
                            option.setName("name").setDescription("Counter name").setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("reset")
                        .setDescription("Reset a counter")
                        .addStringOption(option =>
                            option.setName("name").setDescription("Counter name").setRequired(true)
                        )
                ),
            execute: async (interaction) => {
                await this.handleCounterCommand(interaction);
            }
        };
        
        this.registerCommand(counterCommand);
        this.log("Counter Plugin loaded successfully");
    }

    async unload() {
        this.log("Unloading Counter Plugin...");
        await this.saveCounters();
        this.log("Counter Plugin unloaded");
    }

    async handleCounterCommand(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const name = interaction.options.getString("name");
        
        try {
            switch (subcommand) {
                case "increment":
                    this.counters[name] = (this.counters[name] || 0) + 1;
                    await this.saveCounters();
                    await interaction.reply(`Counter "${name}" is now ${this.counters[name]}`);
                    break;
                    
                case "get":
                    const value = this.counters[name] || 0;
                    await interaction.reply(`Counter "${name}" value: ${value}`);
                    break;
                    
                case "reset":
                    this.counters[name] = 0;
                    await this.saveCounters();
                    await interaction.reply(`Counter "${name}" has been reset to 0`);
                    break;
            }
        } catch (error) {
            this.log(`Error in counter command: ${error.message}`, "error");
            await interaction.reply({ 
                content: "An error occurred while processing the counter command.", 
                ephemeral: true 
            });
        }
    }

    async loadCounters() {
        try {
            const data = await fs.readFile(this.dataFile, 'utf8');
            this.counters = JSON.parse(data);
            this.log("Counters loaded from file");
        } catch (error) {
            this.log("No existing counter data found, starting fresh");
            this.counters = {};
        }
    }

    async saveCounters() {
        try {
            await fs.writeFile(this.dataFile, JSON.stringify(this.counters, null, 2));
            this.log("Counters saved to file");
        } catch (error) {
            this.log(`Failed to save counters: ${error.message}`, "error");
        }
    }

    async reloadConfig(newConfig) {
        this.config = newConfig;
        this.log("Counter plugin configuration reloaded");
    }
}

module.exports = CounterPlugin;
```

This example demonstrates:
- Basic plugin structure
- Command registration with subcommands
- Data persistence
- Error handling
- Configuration reload support
- Proper logging

## Testing Your Plugin

1. **Add to Configuration**: Include your plugin in `config.json`
2. **Restart Bot**: Load your plugin
3. **Test Commands**: Verify slash commands work correctly
4. **Test Hot-Reload**: Make config changes via web interface
5. **Check Logs**: Monitor for errors or issues
6. **Test Error Cases**: Verify error handling works properly

## Publishing Your Plugin

1. **Documentation**: Create comprehensive README
2. **Configuration Schema**: Document all config options
3. **Dependencies**: List any additional npm packages
4. **Examples**: Provide usage examples
5. **Testing**: Include test procedures
6. **Versioning**: Use semantic versioning for releases