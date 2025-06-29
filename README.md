# Modular Discord Bot

A flexible, plugin-based Discord bot framework built with Discord.js v14+. Features a modular architecture with a comprehensive web-based management interface, Discord OAuth2 authentication, and hot-reload capabilities.

## ✨ Key Features

### Core Framework

- **Plugin System**: Modular architecture allowing easy addition and removal of features
- **Hot-Reload Capability**: Plugins reload instantly when configuration changes, no bot restart required
- **Web Management Interface**: Real-time dashboard with dark theme and responsive design
- **Visual Configuration**: Channel and role dropdowns instead of manual ID entry
- **Discord OAuth2 Authentication**: Role-based access control with Discord login
- **Unified Logging**: All events logged to `bot.log` with plugin categorization

### Included Plugins

#### Verification Plugin (`/verify`)

Complete user verification system with configurable screenshot requirements, admin approval workflows, and automated moderation.

**Key Features:**

- Flexible screenshot requirements (0, 1, or 2 screenshots)
- Dynamic field requirements (character/guild names)
- Interactive approval/denial system with reason tracking
- Auto-moderation and DM fallback systems
- Visual role and channel configuration

> **Note**: This verification plugin was originally forked from [discord-verification-bot](https://github.com/Zachdidit/discord-verification-bot) and has been extensively enhanced and integrated into the modular framework.

[📖 Full Documentation](docs/VERIFICATION_PLUGIN.md)

#### Purge Plugin (`/purge`)

Comprehensive message management system with manual commands and automated scheduling capabilities.

**Key Features:**

- Manual message purging (specific count or all messages)
- Auto-purge scheduling with cron expressions and timezone support
- Handles Discord's 14-day bulk delete limitation
- Rate limit compliance and permission validation
- Multiple schedules for different channels

[📖 Full Documentation](docs/PURGE_PLUGIN.md)

#### Moderation Plugin (`/mod`)

Comprehensive moderation system with manual commands, auto-moderation detection, and extensive configuration options.

**Key Features:**

- Complete moderation toolkit (timeout, kick, ban, warn, etc.)
- Role and nickname management with hierarchy validation
- Message management (bulk delete, pin/unpin)
- Utility commands (user info, server statistics)
- Advanced auto-moderation (spam, caps, links, profanity detection)
- Granular action toggles and exemption system
- Real-time configuration through web interface

[📖 Full Documentation](docs/MODERATION_PLUGIN.md)

## 🚀 Quick Start

### Prerequisites

- **Node.js** v16 or newer
- **Discord Bot Application** with proper permissions
- **Discord Server** with admin access

### Installation

1. **Clone and Install**:

```bash
git clone https://github.com/Zachdidit/discord-verification-bot.git
cd discord-verification-bot
npm install
```

2. **Configure Bot**:

```bash
cp config.example.json config.json
# Edit config.json with your bot token, client ID, and guild ID
```

3. **Start Bot**:

```bash
# Development
node index.js

# Production with PM2
npm install -g pm2
pm2 start index.js --name discord-bot
```

4. **Access Web Interface**:
   Navigate to `http://localhost:3000` (or your configured port)

### Discord Bot Setup

1. Create application at [Discord Developer Portal](https://discord.com/developers/applications)
2. Go to "Bot" tab and copy the bot token
3. Enable "Server Members Intent" under Privileged Gateway Intents
4. Generate invite URL with these permissions:
   - Send Messages
   - Embed Links
   - Manage Roles
   - Manage Messages
   - Manage Nicknames
   - Read Message History
   - Use Application Commands
   - Moderate Members (for timeout functionality)
   - Kick Members (for kick functionality)
   - Ban Members (for ban/unban functionality)

## 📋 Configuration

### Basic Configuration

```json
{
  "bot": {
    "token": "YOUR_BOT_TOKEN",
    "clientId": "YOUR_CLIENT_ID",
    "guildId": "YOUR_GUILD_ID",
    "enableUI": true,
    "uiPort": 3000
  },
  "plugins": {
    "verification": {
      "enabled": true,
      "channels": {
        "verifyChannelId": "ADMIN_VERIFICATION_CHANNEL_ID",
        "verifyCommandChannelId": "USER_COMMAND_CHANNEL_ID"
      },
      "roles": {
        "verifiedRoleId": "VERIFIED_ROLE_ID",
        "verifierRoleIds": ["ADMIN_ROLE_ID"]
      }
    },
    "purge": {
      "enabled": true,
      "logging": {
        "channelId": "LOG_CHANNEL_ID"
      }
    },
    "moderation": {
      "enabled": true,
      "logging": {
        "channelId": "MODERATION_LOG_CHANNEL_ID"
      },
      "roles": {
        "moderatorRoleIds": ["MODERATOR_ROLE_ID"]
      }
    }
  }
}
```

### Advanced Configuration

For detailed configuration options, see:

- [Verification Plugin Configuration](docs/VERIFICATION_PLUGIN.md#configuration)
- [Purge Plugin Configuration](docs/PURGE_PLUGIN.md#configuration)
- [Moderation Plugin Configuration](docs/MODERATION_PLUGIN.md#configuration)

## 🌐 Web Interface

The bot includes a comprehensive web-based management interface:

### Features

- **Real-time Configuration**: Change settings with immediate effects
- **Visual Dropdowns**: Select channels and roles from organized dropdowns
- **Plugin Management**: Enable/disable plugins and configure settings
- **Command Reference**: Plugin headers display associated slash commands
- **Change Tracking**: Save button activates only when changes are made
- **Hot-Reload**: Plugins reload automatically without bot restart

### Authentication (Optional)

Enable Discord OAuth2 authentication to restrict access:

```json
{
  "bot": {
    "uiAuth": {
      "enabled": true,
      "clientSecret": "your_discord_client_secret",
      "sessionSecret": "your_session_secret",
      "allowedRoleIds": ["ADMIN_ROLE_ID_1", "ADMIN_ROLE_ID_2"],
      "redirectUri": "http://localhost:3000/auth/discord/callback"
    }
  }
}
```

For detailed setup instructions, see [AUTHENTICATION_SETUP.md](docs/AUTHENTICATION_SETUP.md)

## 🛠️ Plugin Development

Create custom plugins to extend bot functionality:

```javascript
const Plugin = require("../../core/Plugin");
const { SlashCommandBuilder } = require("discord.js");

class MyPlugin extends Plugin {
  async load() {
    const myCommand = {
      data: new SlashCommandBuilder()
        .setName("mycommand")
        .setDescription("My custom command"),
      execute: async (interaction) => {
        await interaction.reply("Hello from my plugin!");
      },
    };
    this.registerCommand(myCommand);
  }
}

module.exports = MyPlugin;
```

[📖 Plugin Development Guide](docs/PLUGIN_DEVELOPMENT.md)

## 📚 Documentation

### Plugin Documentation

- [Verification Plugin](docs/VERIFICATION_PLUGIN.md) - Complete user verification system
- [Purge Plugin](docs/PURGE_PLUGIN.md) - Message management and auto-purge
- [Moderation Plugin](docs/MODERATION_PLUGIN.md) - Comprehensive moderation system

### Development & Operations

- [Plugin Development Guide](docs/PLUGIN_DEVELOPMENT.md) - Create custom plugins
- [Testing Guide](docs/TESTING.md) - Comprehensive testing procedures
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions

## 🔧 Management Commands

### PM2 Commands

```bash
pm2 list                    # View all processes
pm2 logs discord-bot        # View live logs
pm2 restart discord-bot     # Restart bot
pm2 stop discord-bot        # Stop bot
pm2 delete discord-bot      # Remove from PM2
```

### Configuration Validation

```bash
node check-config.js        # Validate configuration
```

## 🆕 Recent Updates

### Version 6.0 - Advanced Moderation System

- **Moderation Plugin**: Comprehensive moderation system with `/mod` commands
- **Auto-Moderation**: Spam, caps, links, and profanity detection with configurable actions
- **Role Management**: Add/remove roles with hierarchy validation
- **Message Management**: Bulk delete, pin/unpin messages with smart filtering
- **Granular Controls**: Individual command toggles and exemption system
- **Advanced UI**: Dynamic configuration forms with real-time validation

### Version 5.0 - Enhanced UI & Purge Plugin

- **Purge Plugin**: Complete message management with manual and auto-purge
- **Visual Dropdowns**: Channel and role selection with visual indicators
- **Command Display**: Plugin headers show slash commands for quick reference
- **Multi-Select Interface**: Advanced role selection with color indicators
- **Auto-Purge Scheduling**: Cron-based automatic message deletion
- **Enhanced Logging**: Detailed logging for all operations

### Version 4.0 - Web Management & Hot-Reload

- **Web Management Interface**: Comprehensive dashboard for real-time configuration
- **Discord OAuth2 Authentication**: Role-based access control
- **Hot-Reload System**: Plugins reload automatically when configuration changes
- **Dark Theme UI**: Modern, responsive interface
- **Real-time Updates**: WebSocket integration for live configuration updates

### Version 3.0 - Modular Framework

- **Complete Architecture Redesign**: Transformed into modular bot framework
- **Plugin System**: Modular architecture for easy feature addition/removal
- **Verification as Plugin**: Original functionality now exists as a plugin
- **Unified Logging**: All logs categorized by plugin

## 🤝 Contributing

Contributions are welcome! Please feel free to:

- Submit bug reports and feature requests
- Create pull requests for improvements
- Develop and share custom plugins
- Improve documentation

## 📄 License

This project is open source. Please refer to the license file for more information.

## 🔗 Links

- **Repository**: [GitHub](https://github.com/skov11/modular-discord-bot/)
- **Discord Developer Portal**: [Create Bot Application](https://discord.com/developers/applications)
- **Cron Expression Generator**: [crontab.guru](https://crontab.guru/)

---

**Note**: Keep your bot token secure and never commit it to version control. Use environment variables or configuration files that are excluded from your repository.
