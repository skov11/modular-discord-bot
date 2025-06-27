const DiscordBot = require("./src/bot");
const path = require("path");
const fs = require("fs");

const configPath = path.join(__dirname, "config.json");
const bot = new DiscordBot(configPath);

// Load config to check if UI should be started
let config = {};
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
  console.error("Failed to load config:", error);
}

// Start UI server if enabled
let uiServer = null;
if (config.bot?.enableUI) {
  try {
    const UIServer = require("./ui/server-class");
    uiServer = new UIServer(config.bot.uiPort);
    uiServer.setBotInstance(bot);
    uiServer.start();
    console.log(`UI Server enabled and starting on port ${config.bot.uiPort || 3000}`);
  } catch (error) {
    console.error("Failed to start UI server:", error);
  }
}

bot.start().catch((error) => {
  console.error("Failed to start bot:", error);
  process.exit(1);
});

process.on("SIGINT", async () => {
  if (uiServer) {
    console.log("Stopping UI server...");
    uiServer.stop();
  }
  await bot.stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  if (uiServer) {
    console.log("Stopping UI server...");
    uiServer.stop();
  }
  await bot.stop();
  process.exit(0);
});
