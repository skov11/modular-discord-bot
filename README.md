# Discord Verification Bot

A self-hosted Discord bot for verifying users via screenshot submission and admin approval through an intuitive button interface. Built with Discord.js v14+ and includes comprehensive logging capabilities and automatic channel moderation.

## ✨ Features

- **Slash Command Interface**: `/verify` command with screenshot, character name, and guild name parameters
- **Admin Approval System**: Sends verification requests to designated channels with "Approve Verification" and "Deny Verification" buttons
- **Verification Denial System**: Moderators can deny verification requests with mandatory reason documentation
- **Resubmission Control**: Denied users must resubmit verification before being eligible for approval
- **Role-Based Permissions**: Only users with specified roles can approve verifications
- **Duplicate Prevention**: Prevents users from submitting multiple verification requests
- **Auto-Response System**: Automatically guides users who send non-command messages to use `/verify`
- **Channel Auto-Moderation**: Automatically deletes non-command messages to keep verification channels clean
- **Smart DM Fallback**: Sends private DMs to users with public reply fallback if DMs are disabled
- **Comprehensive Logging**: Records verification events to both file system and Discord channels
- **Process Management**: PM2 integration for reliable bot hosting

## 📋 Prerequisites

Before setting up the bot, ensure you have:

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
# Create project directory
mkdir discord-verification-bot
cd discord-verification-bot

# Initialize npm project
npm init -y

# Install dependencies
npm install discord.js
```

### Step 4: Configuration

Create a `config.json` file in your project root with the following structure:

```json
{
  "token": "your_bot_token_here",
  "clientId": "your_application_id_here",
  "guildId": "your_server_id_here",
  "verifyChannelId": "channel_for_verification_requests",
  "verifyCommandChannelId": "channel_where_users_use_verify_command",
  "logChannelId": "channel_for_logs",
  "howToVerifyID": "channel_with_verification_instructions",
  "atreidesRoleId": "role_to_assign_verified_users",
  "verifierRoleIds": ["admin_role_id_1", "admin_role_id_2"],
  "debugMode": true
}
```

### Step 5: Deploy Commands

Register the slash commands with Discord:

```bash
node deploy-commands.js
```

### Step 6: Start the Bot

#### Development Mode

```bash
node discord_verification_bot.js
```

#### Production Mode (with PM2)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the bot
pm2 start discord_verification_bot.js --name verification-bot

# Save PM2 configuration
pm2 save

# Setup auto-start on system reboot
pm2 startup
```

## 🎮 Usage

### For Users

1. Use `/verify` command in the designated verification channel
2. Upload a screenshot as proof
3. Provide your character name and guild name
4. Wait for admin approval
5. **Note**: Any non-command messages in the verification channel will be automatically deleted and you'll receive a private DM with guidance

### For Admins

1. Monitor verification requests in the designated channel
2. Click "Approve Verification" button to approve users or "Deny Verification" to deny with reason
3. When denying, provide a mandatory reason in the popup modal
4. Check logs in the log channel or `verification_bot_logs.txt` file
5. Monitor auto-moderation events in the log channel

**Note**: Denied users must resubmit their verification before they can be approved.

## 🤖 Auto-Moderation Features

### Message Guidance System

- **Trigger**: When users send any message that isn't `/verify` in the verification channel
- **Response**: Bot sends a private DM with guidance to use `/verify` command
- **Fallback**: If DM fails (user has DMs disabled), sends a public reply
- **Auto-Delete**: Original message is automatically deleted to keep channel clean

### Auto-Moderation Features

#### Message Guidance System

- **Trigger**: When users send any message that isn't `/verify` in the verification channel
- **Response**: Bot sends a private DM with guidance to use `/verify` command
- **Fallback**: If DM fails (user has DMs disabled), sends a public reply
- **Auto-Delete**: Original message is automatically deleted to keep channel clean

#### Example Auto-Moderation Flow

1. User types: "How do I get verified?"
2. Bot sends private DM: "Please use the /verify command to begin the verification process. Check out the instructions in #how-to-verify."
3. Bot deletes the original message
4. Channel stays clean and organized

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

1. **Test Verification Flow**

   - Use `/verify` command in the correct channel
   - Upload a valid screenshot
   - Provide character and guild information

2. **Test Admin Actions**

   - Ensure admin has the required role
   - Click "Approve Verification" button and verify user receives the designated role
   - Click "Deny Verification" button, provide a reason, and verify the denial is processed
   - Test that denied users cannot be approved until they resubmit

3. **Test Auto-Moderation**

   - Send a regular message in the verification channel
   - Verify you receive a private DM with guidance
   - Confirm the original message is deleted
   - Test with DMs disabled to verify public fallback

4. **Check Logging**
   - Confirm logs appear in `verification_bot_logs.txt`
   - Verify log messages in the Discord log channel
   - Monitor auto-moderation events

## 📊 Logging Events

The bot logs the following events to both file and Discord:

- ✅ Successful verification approvals
- ❌ Verification denials with reasons
- 📝 Nickname updates to character names
- 🤖 Auto-response DMs sent to users
- ❌ Failed DM attempts with public fallbacks
- ❌ Nickname update failures due to permissions
- 🔍 Debug information (when debug mode enabled)

## 🔮 Future Enhancements

- [ ] **User Notification System**: Automated DMs to users when verification is approved/denied
- [ ] **Request Expiration**: Auto-expire verification requests after set time
- [ ] **Audit Trail**: Enhanced logging with user IDs and timestamps
- [ ] **Multi-Server Support**: Support for multiple Discord servers
- [ ] **Web Dashboard**: Browser-based admin interface for managing verifications
- [ ] **Custom Auto-Response Messages**: Configurable response templates
- [ ] **Whitelist System**: Allow certain users to bypass auto-moderation
- [ ] **Bulk Verification**: Process multiple verifications at once
- [ ] **Appeal System**: Allow users to appeal denied verifications

## 🐛 Troubleshooting

### Common Issues

**Bot not responding to commands**

- Verify bot has necessary permissions in the channel
- Check that slash commands are properly deployed
- Ensure bot is online and PM2 process is running

**Approval buttons not working**

- Confirm admin roles are correctly configured
- Verify bot has "Manage Roles" permission
- Check console logs for error messages

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

**Logging not working**

- Ensure log channel ID is correct in configuration
- Verify bot has "Send Messages" permission in log channel
- Check file system permissions for log file creation

**DMs not being sent**

- Verify users have DMs enabled from server members
- Check if public reply fallback is working
- Monitor logs for DM failure events

## 📄 License

This project is open source. Please refer to the license file for more information.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and enhancement requests.

---

**Note**: Keep your bot token secure and never commit it to version control. Use environment variables or configuration files that are excluded from your repository.
