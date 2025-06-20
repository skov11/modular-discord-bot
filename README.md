# Discord Verification Bot

A self-hosted Discord bot for verifying users via screenshot submission and admin approval through an intuitive button interface. Built with Discord.js v14+ and includes comprehensive logging capabilities.

## ✨ Features

- **Slash Command Interface**: `/verify` command with screenshot, character name, and guild name parameters
- **Admin Approval System**: Sends verification requests to designated channels with "Approve Verification" buttons
- **Role-Based Permissions**: Only users with specified roles can approve verifications
- **Duplicate Prevention**: Prevents users from submitting multiple verification requests
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

Create a `.env` file in your project root with the following variables:

```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_id_here
GUILD_ID=your_server_id_here
VERIFICATION_CHANNEL_ID=channel_for_verification_requests
LOG_CHANNEL_ID=channel_for_logs
VERIFIED_ROLE_ID=role_to_assign_verified_users
ADMIN_ROLE_IDS=comma,separated,admin,role,ids
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

### For Admins

1. Monitor verification requests in the designated channel
2. Click "Approve Verification" button to approve users
3. Check logs in the log channel or `verification_bot_logs.txt` file

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

2. **Test Admin Approval**

   - Ensure admin has the required role
   - Click "Approve Verification" button
   - Verify user receives the designated role

3. **Check Logging**
   - Confirm logs appear in `verification_bot_logs.txt`
   - Verify log messages in the Discord log channel

## 🔮 Future Enhancements

- [ ] **Rejection System**: Add "Reject Verification" button with reason field
- [ ] **Request Expiration**: Auto-expire verification requests after set time
- [ ] **DM Notifications**: Send direct messages to users upon verification status changes
- [ ] **Audit Trail**: Enhanced logging with user IDs and timestamps
- [ ] **Multi-Server Support**: Support for multiple Discord servers
- [ ] **Web Dashboard**: Browser-based admin interface for managing verifications

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

**Logging not working**

- Ensure log channel ID is correct in configuration
- Verify bot has "Send Messages" permission in log channel
- Check file system permissions for log file creation

## 📄 License

This project is open source. Please refer to the license file for more information.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and enhancement requests.

---

**Note**: Keep your bot token secure and never commit it to version control. Use environment variables or configuration files that are excluded from your repository.
