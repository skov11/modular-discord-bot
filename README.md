# Modular Discord Bot

A flexible, plugin-based Discord bot framework built with Discord.js v14+. Features a modular architecture with a comprehensive web-based management interface, Discord OAuth2 authentication, and hot-reload capabilities. Includes a feature-rich verification plugin for user verification via configurable screenshot submission and admin approval.

## ✨ Features

### Core Bot Framework

- **Plugin System**: Modular architecture allowing easy addition and removal of features
- **Hot-Reload Capability**: Plugins reload instantly when configuration changes, no bot restart required
- **Dynamic Command Loading**: Commands are loaded from plugins at runtime and update immediately
- **Plugin Configuration**: Each plugin can have its own configuration settings
- **Unified Logging**: All events logged to `bot.log` with plugin categorization
- **Easy Extensibility**: Create new plugins to add any Discord bot functionality
- **Configuration Validation**: Built-in tools to verify setup correctness

### Web Management Interface

- **Real-time Dashboard**: Comprehensive web-based configuration management
- **Dark Theme UI**: Modern, responsive interface optimized for all devices
- **Live Configuration**: Change settings and see immediate effects without restarts
- **Plugin Management**: Enable/disable plugins and configure settings through the UI
- **Change Tracking**: Smart save button that only activates when changes are made
- **Section Persistence**: Modified plugin sections stay expanded for continued editing
- **Hot-Reload Integration**: Automatic plugin reloading when settings change

### Security & Authentication

- **Discord OAuth2**: Secure authentication using Discord accounts
- **Role-Based Access**: Restrict access to specific Discord roles
- **Session Management**: Secure session handling with configurable expiration
- **Optional Authentication**: Can be disabled for development or trusted environments
- **Audit Trail**: All configuration changes logged with user information

### Included Plugins

#### Verification Plugin

- **Flexible Screenshot Requirements**: Support for 0, 1, or 2 screenshots based on configuration
- **Dynamic Field Requirements**: Configure character and guild names as required or optional independently
- **Real-time Command Updates**: Verification command structure updates immediately when settings change
- **Image Validation**: Automatic validation to ensure uploads are valid image files (PNG, JPG, GIF, WebP)
- **Enhanced Display System**: Multi-embed display showing screenshots clearly in verification channels
- **Admin Approval System**: Interactive approval/denial buttons with comprehensive admin controls
- **Verification Denial System**: Moderators can deny requests with mandatory reason documentation
- **Resubmission Control**: Denied users must resubmit verification before being eligible for approval
- **Role-Based Permissions**: Only users with specified roles can approve verifications
- **Duplicate Prevention**: Prevents users from submitting multiple verification requests
- **Auto-Response System**: Automatically guides users who send non-command messages to use `/verify`
- **Channel Auto-Moderation**: Automatically deletes non-command messages to keep verification channels clean
- **Smart DM Fallback**: Sends private DMs to users with public reply fallback if DMs are disabled
- **Comprehensive Logging**: Records verification events to both file system and Discord channels
- **Hot-Configuration**: All verification settings can be changed through the web UI without restart

## 📋 Prerequisites

Before setting up the bot framework, ensure you have:

- **Node.js** v16 or newer
- **Discord account** with server admin permissions
- **WSL or Linux shell** (if running on Windows)

## 🚀 Installation

### Step 1: Install Node.js

Choose one of the following installation methods:

#### Option A: NodeSource (Recommended)

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### Option B: Node Version Manager (NVM)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
nvm alias default 18
```

### Step 2: Discord Bot Setup

1. **Create Application**

   - Navigate to [Discord Developer Portal](https://discord.com/developers/applications)
   - Click "New Application" and give it a name

2. **Configure Bot**

   - Go to the "Bot" tab
   - Click "Add Bot"
   - Copy the bot token (you'll need this later)
   - Enable "Server Members Intent" under Privileged Gateway Intents

3. **Set Bot Permissions**

   - Go to OAuth2 → URL Generator
   - Select scopes: `bot`, `applications.commands`
   - Select bot permissions:
     - Send Messages
     - Embed Links
     - Manage Roles
     - **Manage Nicknames** (for automatic nickname updates)
     - **Manage Messages** (for auto-deletion)
     - Read Message History
     - Use Application Commands

4. **Invite Bot to Server**
   - Use the generated URL to invite the bot to your Discord server

### Step 3: Project Setup

```bash
# Clone the repository
git clone https://github.com/skov11/modular-discord-bot.git
cd modular-discord-bot

# Install dependencies
npm install
```

### Step 4: Configuration

The bot now uses a plugin-based configuration system. Create a `config.json` file based on `config.example.json`:

```bash
cp config.example.json config.json
```

Edit the configuration with your values:

```json
{
  "bot": {
    "token": "your_bot_token_here",
    "clientId": "your_application_id_here",
    "guildId": "your_server_id_here",
    "enableUI": true,
    "uiPort": 3000,
    "uiAuth": {
      "enabled": false,
      "clientSecret": "your_discord_client_secret_here",
      "sessionSecret": "your_session_secret_here",
      "allowedRoleIds": ["admin_role_id_1", "admin_role_id_2"],
      "redirectUri": "http://localhost:3000/auth/discord/callback"
    }
  },

  "plugins": {
    "verification": {
      "enabled": true,
      "channels": {
        "verifyChannelId": "channel_for_verification_requests",
        "verifyCommandChannelId": "channel_where_users_use_verify_command",
        "logChannelId": "channel_for_logs",
        "howToVerifyID": "channel_with_verification_instructions"
      },
      "roles": {
        "verifiedRoleId": "role_to_assign_verified_users",
        "verifierRoleIds": ["admin_role_id_1", "admin_role_id_2"]
      },
      "messages": {
        "approvalMessage": "✅ Thank you for verifying! You have been approved.",
        "denialMessagePrefix": "❌ Your verification has been denied."
      },
      "settings": {
        "debugMode": true,
        "screenshotCount": 2,
        "requireCharacterName": true,
        "requireGuildName": true
      }
    }
  }
}
```

#### Validating Your Configuration

Before starting the bot, you can check if your configuration is properly set up:

```bash
node check-config.js
```

This will validate all required settings and provide helpful feedback about any missing or incorrect values.

#### Verification Plugin Configuration Options

The verification plugin supports flexible configuration to adapt to different server needs:

**Screenshot Requirements** (`screenshotCount`):

- `0` - No screenshots required (text-only verification)
- `1` - Single screenshot required
- `2` - Dual screenshots required (default)

**Field Requirements**:

- `requireCharacterName` - Whether character name is required (default: `true`)
- `requireGuildName` - Whether guild name is required (default: `true`)

**Example configurations:**

```json
// Gaming server with full verification
"settings": {
  "screenshotCount": 2,
  "requireCharacterName": true,
  "requireGuildName": true
}

// Simple verification with minimal requirements
"settings": {
  "screenshotCount": 0,
  "requireCharacterName": false,
  "requireGuildName": false
}

// Single screenshot with character name only
"settings": {
  "screenshotCount": 1,
  "requireCharacterName": true,
  "requireGuildName": false
}
```

### Step 5: Start the Bot

The bot automatically deploys commands when it starts. If `enableUI` is set to `true` in config.json, the web management interface will start automatically on the configured port:

#### Development Mode

```bash
node index.js
```

The bot and web interface will start together. Access the dashboard at `http://localhost:3000` (or your configured port).

#### Production Mode (with PM2)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the bot with UI
pm2 start index.js --name discord-bot

# Save PM2 configuration
pm2 save

# Setup auto-start on system reboot
pm2 startup
```

### Step 6: Access the Web Interface

Once the bot is running, you can access the management dashboard:

- **URL**: `http://localhost:3000` (or your configured `uiPort`)
- **Authentication**: If enabled, you'll be redirected to Discord OAuth2 login
- **Features**: Real-time configuration, plugin management, and bot monitoring

For authentication setup, see [AUTHENTICATION_SETUP.md](AUTHENTICATION_SETUP.md) for detailed instructions.

## 🌐 Web Management Interface

The bot includes a comprehensive web-based management interface for configuration and monitoring.

### Accessing the UI

When `enableUI` is set to `true` in your config.json, the web interface will be available at:

- **Web Interface**: `http://localhost:3000` (or your configured port)
- **Real-time Updates**: WebSocket connection on port 3001

### Key Features

- **Dynamic Configuration**: Modify bot and plugin settings with instant effects
- **Real-time Status**: Monitor bot connection status and performance
- **Plugin Management**: Enable/disable plugins and configure their settings
- **Hot-Reload**: Plugins reload automatically when configuration changes
- **Change Tracking**: Save button only activates when actual changes are made
- **Collapsible Sections**: Organize plugin configurations with expandable sections
- **Section Persistence**: Modified sections stay open after saving changes
- **Manual Plugin Reload**: Individual reload buttons for each plugin
- **Dark Theme**: Modern, eye-friendly interface optimized for extended use
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

### Using the UI

1. **Bot Settings**: Configure token, client ID, guild ID, and authentication preferences
2. **Plugin Configuration**:
   - Verification plugin with all settings (screenshot count, field requirements, messages)
   - Enable/disable plugins individually with toggle switches
   - Real-time validation and help text for all settings
   - Collapsible sections to focus on specific plugin configuration
3. **Actions**:
   - Save configuration changes (auto-activates when changes detected)
   - Manual plugin reload buttons for individual plugins
   - Restart bot (when needed for major changes)
   - Real-time bot status monitoring

### Production Deployment

The UI runs integrated with the main bot process when enabled:

```bash
# Start bot with UI (production)
pm2 start index.js --name discord-bot

# Or start without UI
# Set "enableUI": false in config.json first
pm2 start index.js --name discord-bot
```

## 🎮 Usage

The bot framework comes with several plugins that provide different functionality. Below are examples using the included verification plugin.

### Verification Plugin Usage

#### For Users

1. Use `/verify` command in the designated verification channel
2. **Upload 2 screenshots** as proof of verification (both required)
   - **Screenshot 1**: Primary verification image showing character and guild
   - **Screenshot 2**: Additional verification image for enhanced security
3. Provide your character name and guild name
4. Wait for admin approval
5. **Note**: Any non-command messages in the verification channel will be automatically deleted and you'll receive a private DM with guidance

#### Supported Image Formats

- PNG (.png)
- JPEG/JPG (.jpg, .jpeg)
- GIF (.gif)
- WebP (.webp)

#### For Admins

1. Monitor verification requests in the designated channel
2. **Review both screenshots** displayed in the verification embed:
   - Primary screenshot appears in the main embed
   - Secondary screenshot appears in a second embed below
3. Click "Approve Verification" button to approve users or "Deny Verification" to deny with reason
4. When denying, provide a mandatory reason in the popup modal
5. Check logs in the log channel or `verification_bot_logs.txt` file
6. Monitor auto-moderation events in the log channel

**Note**: Denied users must resubmit their verification before they can be approved.

## 🤖 Auto-Moderation Features

### Message Guidance System

- **Trigger**: When users send any message that isn't `/verify` in the verification channel
- **Response**: Bot sends a private DM with guidance to use `/verify` command
- **Fallback**: If DM fails (user has DMs disabled), sends a public reply
- **Auto-Delete**: Original message is automatically deleted to keep channel clean

### Dual Screenshot Validation

- **File Type Checking**: Automatically validates that both uploads are valid image files
- **Supported Formats**: PNG, JPG/JPEG, GIF, WebP
- **Error Handling**: Clear error messages for invalid file types
- **Enhanced Display**: Two embeds showing both screenshots with clear labeling

#### Example Auto-Moderation Flow

1. User types: "How do I get verified?"
2. Bot sends private DM: "Please use the /verify command to begin the verification process. Check out the instructions in #how-to-verify."
3. Bot deletes the original message
4. Channel stays clean and organized

#### Example Verification Flow

1. User runs: `/verify character:PlayerName guild:GuildName screenshot1:[image1] screenshot2:[image2]`
2. Bot validates both images are valid formats
3. Bot creates dual-embed display showing both screenshots
4. Admins can review both images before making approval decision

## 🔧 PM2 Management Commands

| Command                        | Purpose                    |
| ------------------------------ | -------------------------- |
| `pm2 list`                     | View all running processes |
| `pm2 logs verification-bot`    | View live bot logs         |
| `pm2 restart verification-bot` | Restart the bot            |
| `pm2 stop verification-bot`    | Stop the bot               |
| `pm2 delete verification-bot`  | Remove bot from PM2        |
| `pm2 monit`                    | Monitor bot performance    |

## 🧪 Testing

### Verification Plugin Testing

1. **Test Dual Screenshot Verification Flow**

   - Use `/verify` command in the correct channel
   - Upload 2 valid screenshots (different formats to test validation)
   - Provide character and guild information
   - Verify both screenshots display correctly in the verification channel

2. **Test Image Validation**

   - Try uploading non-image files (should be rejected)
   - Test different valid image formats (PNG, JPG, GIF, WebP)
   - Verify error messages for invalid file types

3. **Test Admin Actions**

   - Ensure admin has the required role
   - Review both screenshots in the dual-embed display
   - Click "Approve Verification" button and verify user receives the designated role
   - Click "Deny Verification" button, provide a reason, and verify the denial is processed
   - Test that denied users cannot be approved until they resubmit

4. **Test User Notifications**

   - Approve a verification and confirm the user receives an approval DM
   - Deny a verification with a reason and confirm the user receives a denial DM with the reason
   - Test with a user who has DMs disabled to verify warning logs appear

5. **Test Auto-Moderation**

   - Send a regular message in the verification channel
   - Verify you receive a private DM with guidance
   - Confirm the original message is deleted
   - Test with DMs disabled to verify public fallback

6. **Check Enhanced Logging**
   - Confirm logs show details about both uploaded screenshots
   - Verify log messages in the Discord log channel
   - Monitor auto-moderation events
   - Check file validation logging

## 📊 Logging Events

### File Logging (`bot.log`)

The bot logs all events to `bot.log` in the root directory:

- **Bot startup/shutdown events**
- **Plugin loading/unloading**
- **Command deployment status**
- **Verification events** (marked with `[VERIFICATION]`):
  - ✅ Successful verification approvals
  - ❌ Verification denials with reasons
  - 📝 Nickname updates (success/failure)
  - 💌 DM delivery status (success/failure)
  - 🔍 Debug information (when debug mode enabled)
  - ⚠️ Configuration warnings and errors

### Discord Channel Logging

Only specific events are sent to the Discord log channel:

- ✅ **Verification approvals**: `AdminName verified UserName at [timestamp]`
- ❌ **Verification denials**: `@Admin denied verification for @User. Reason: [reason]`
- ⚠️ **DM delivery failures**: `Failed to send denial DM to @User - user may have DMs disabled`

### Configuration Checking

Use the configuration checker to validate your setup:

```bash
node check-config.js
```

This tool will:

- Verify all required configuration values are set
- Check for missing channel IDs or role IDs
- Provide helpful tips for common configuration issues
- Show which settings are optional vs required

## 🆕 Recent Updates

### Version 4.0 - Web Management & Hot-Reload

- **Web Management Interface**: Comprehensive dashboard for real-time bot configuration
- **Discord OAuth2 Authentication**: Role-based access control with Discord login
- **Hot-Reload System**: Plugins reload automatically when configuration changes
- **Dark Theme UI**: Modern, responsive interface optimized for all devices
- **Change Tracking**: Smart save system that only activates when changes are made
- **Plugin Management**: Individual plugin controls with manual reload buttons
- **Real-time Updates**: WebSocket integration for live configuration updates
- **Section Persistence**: Modified plugin sections stay expanded for better UX

### Version 3.0 - Modular Bot Framework

- **Complete Architecture Redesign**: Transformed from a verification bot into a modular bot framework
- **Plugin System**: Modular architecture allowing easy addition and removal of features
- **Verification as Plugin**: Original verification functionality now exists as a plugin
- **Easy Extensibility**: Add any Discord bot functionality by creating plugins
- **Plugin Configuration**: Each plugin has its own organized configuration section
- **Unified Logging**: All logs go to `bot.log` with clear plugin categorization
- **Configuration Validation**: Added `check-config.js` tool for setup verification
- **Developer Friendly**: Clear separation between core framework and plugin implementations

### Version 2.0 - Dual Screenshot System

- **Enhanced Security**: Now requires 2 screenshots for verification
- **Image Validation**: Automatic file type checking for uploaded images
- **Improved Display**: Dual-embed system showing both screenshots clearly
- **Better Error Handling**: Clear messages for invalid file uploads
- **Enhanced Logging**: Detailed logging of both screenshot uploads
- **Maintained Compatibility**: All existing features work with new dual screenshot system

## 🔌 Plugin Development

This modular bot framework is designed for easy plugin development. Create custom plugins to add any Discord bot functionality you need.

### Quick Plugin Example

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

  async unload() {
    this.log("Plugin unloaded");
  }
}

module.exports = MyPlugin;
```

## 🔮 Future Enhancements

### Bot Framework

- [x] **Plugin Hot Reload**: Reload plugins without restarting bot ✅
- [x] **Web Dashboard**: Browser-based plugin management and configuration ✅
- [ ] **Plugin Dependencies**: Allow plugins to depend on other plugins
- [ ] **Plugin Marketplace**: Central repository for community plugins
- [ ] **Plugin Templates**: Generators for common plugin types
- [ ] **Inter-Plugin Communication**: Allow plugins to communicate with each other
- [ ] **API Integration**: REST API for external tool integration
- [ ] **Multi-Guild Support**: Manage multiple Discord servers from one interface

### Additional Plugin Ideas

- [ ] **Moderation Plugin**: Auto-moderation, warnings, bans, and kicks
- [ ] **Welcome Plugin**: Custom welcome messages and role assignment
- [ ] **Music Plugin**: Music playback and queue management
- [ ] **Economy Plugin**: Virtual currency and shop systems
- [ ] **Leveling Plugin**: XP tracking and role rewards
- [ ] **Ticket Plugin**: Support ticket system with private channels

### Verification Plugin

- [ ] **Request Expiration**: Auto-expire verification requests after set time
- [ ] **Audit Trail**: Enhanced logging with user IDs and timestamps
- [ ] **Multi-Server Support**: Support for multiple Discord servers
- [ ] **Custom Auto-Response Messages**: Configurable response templates
- [ ] **Whitelist System**: Allow certain users to bypass auto-moderation
- [ ] **Bulk Verification**: Process multiple verifications at once
- [ ] **Appeal System**: Allow users to appeal denied verifications
- [ ] **Screenshot Comparison**: AI-powered detection of duplicate or suspicious images
- [ ] **Custom Image Requirements**: Configurable image size and quality requirements
- [ ] **Watermark Detection**: Optional watermark validation for enhanced security

## 🐛 Troubleshooting

### Common Issues

**Bot not responding to commands**

- Verify bot has necessary permissions in the channel
- Check that slash commands are properly deployed (happens automatically on startup)
- Ensure bot is online and PM2 process is running
- Run `node check-config.js` to validate your configuration
- Check that the relevant plugin is enabled in config.json
- Try using the manual plugin reload button in the web interface
- Check the web dashboard for any error messages or warnings

**Approval buttons not working**

- Confirm admin roles are correctly configured
- Verify bot has "Manage Roles" permission
- Check console logs for error messages

**Screenshot validation failing**

- Verify uploaded files are valid image formats (PNG, JPG, GIF, WebP)
- Check file sizes aren't exceeding Discord's limits
- Monitor logs for specific validation errors
- Ensure both screenshots are provided (both required)

**Dual screenshot display issues**

- Verify bot has "Embed Links" permission
- Check that both screenshots are valid URLs
- Monitor logs for embed creation errors
- Ensure verification channel allows embeds

**User notifications not working**

- Verify users have DMs enabled from server members
- Check the Discord log channel for DM failure warnings
- Ensure `approvalMessage` and `denialMessagePrefix` are properly set in config.json
- Monitor file logs for DM delivery confirmations

**Verification denials not working**

- Verify the denial reason modal appears when clicking "Deny Verification"
- Check that denied users cannot be approved until resubmission
- Ensure denial reasons are being logged properly
- Monitor logs for modal submission errors

**Nickname updates not working**

- Ensure bot has "Manage Nicknames" permission
- Verify bot's role is higher than the user's highest role in the server hierarchy
- Check if the user is the server owner (nicknames cannot be changed for server owners)
- Monitor logs for specific permission errors

**Auto-moderation not working**

- Ensure bot has "Manage Messages" permission in verification channel
- Verify `verifyCommandChannelId` is correctly set in config
- Check if bot can send DMs to users
- Monitor logs for permission errors

**Image upload errors**

- Check Discord file size limits (8MB for non-Nitro users, 50MB for Nitro)
- Verify supported image formats are being used
- Monitor logs for specific upload validation errors
- Test with different image formats and sizes

**Web interface not accessible**

- Verify `enableUI` is set to `true` in config.json
- Check that the configured `uiPort` is not in use by another application
- Ensure no firewall is blocking the port
- Check browser console for JavaScript errors
- Verify the bot process is running and UI server started successfully

**Authentication issues**

- Ensure Discord OAuth2 settings are correctly configured (see AUTHENTICATION_SETUP.md)
- Verify `allowedRoleIds` contains your Discord role IDs
- Check that `clientSecret` and `sessionSecret` are properly set
- Confirm you're a member of the configured Discord server
- Try disabling authentication temporarily by setting `uiAuth.enabled: false`

**Plugin reload failures**

- Check the browser console and bot logs for specific error messages
- Verify the plugin configuration is valid JSON
- Try saving configuration changes instead of manual reload
- Restart the bot if hot-reload continues to fail
- Check file permissions on the plugin directory

**Logging not working**

- Run `node check-config.js` to verify log channel configuration
- Verify bot has "Send Messages" permission in log channel
- Check `bot.log` file in the root directory for file-based logs
- Ensure verification events are marked with `[VERIFICATION]` prefix in logs

**DMs not being sent**

- Verify users have DMs enabled from server members
- Check if public reply fallback is working
- Monitor logs for DM failure events

### New Troubleshooting for Dual Screenshots

**Only one screenshot showing**

- Verify both screenshot parameters are provided in the command
- Check embed permissions in the verification channel
- Monitor logs for second embed creation issues

**File validation errors**

- Ensure uploaded files are actually images, not renamed text files
- Check that file extensions match actual file content
- Verify files aren't corrupted during upload

## 📄 License

This project is open source. Please refer to the license file for more information.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and enhancement requests.

---

**Note**: Keep your bot token secure and never commit it to version control. Use environment variables or configuration files that are excluded from your repository.
