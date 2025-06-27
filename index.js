const DiscordBot = require("./src/bot");
const path = require("path");

const configPath = path.join(__dirname, "config.json");
const bot = new DiscordBot(configPath);

bot.start().catch((error) => {
  console.error("Failed to start bot:", error);
  process.exit(1);
});

process.on("SIGINT", async () => {
  await bot.stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await bot.stop();
  process.exit(0);
});
