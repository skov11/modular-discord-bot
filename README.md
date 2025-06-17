Discord Verification Bot

A self-hosted Discord bot for verifying users via screenshot submission and admin approval via a button interface. Uses Discord.js v14+ and supports logging to both a file and a Discord channel.

✅ Features

Slash command /verify with screenshot, character name, and guild name

Sends embed with "Approve Verification" button to a designated channel

Only users with specified roles can approve

Prevents double-verification

Logs verification events to a file and Discord channel

📦 Prerequisites

Node.js v16 or newer

A Discord account and server (with bot permissions)

WSL or Linux shell (if on Windows)

🧱 Step 0: Install Node.js

Option 1: NodeSource (Recommended)

curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

Option 2: NVM (Node Version Manager)

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
nvm alias default 18

🛠️ Step 1: Set Up Your Bot in Discord Developer Portal

Go to https://discord.com/developers/applications

Create a new application

Go to Bot tab → Click Add Bot

Copy the Token

Enable Server Members Intent

Invite the Bot to Your Server:

Go to OAuth2 > URL Generator

Select scopes: bot, applications.commands

Bot permissions:

Send Messages

Embed Links

Manage Roles

Read Message History

Use Application Commands

Use the generated URL to invite your bot

🗂️ Step 2: Project Setup

mkdir discord-verification-bot
cd discord-verification-bot
npm init -y
npm install discord.js



🔌 Step 3: Register Slash Command
Run:
node deploy-commands.js

🧠 Step 4: Run the Bot with PM2

sudo npm install -g pm2
pm2 start discord_verification_bot.js --name thufir-bot
pm2 save

Helpful PM2 Commands

Command

Purpose

pm2 list

View running processes

pm2 logs thufir-bot

View live logs

pm2 restart thufir-bot

Restart the bot

pm2 stop thufir-bot

Stop the bot

pm2 delete thufir-bot

Remove the bot

pm2 startup

Setup auto-start on reboot

✅ Testing the Bot

Use /verify in the correct channel

Upload screenshot + provide name/guild

Admin with allowed role clicks "Approve Verification"

User is given the role, logs are recorded in:

verification_bot_logs.txt

Discord log channel

🧩 Future Ideas

Add a Reject button

Add expiration on verification requests

Handle DM notifications to verified users

