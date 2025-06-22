// deploy-commands.js

const { REST, Routes, SlashCommandBuilder } = require("discord.js");
const { token, guildId, clientId } = require("./config.json");

const commands = [
  new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Submit a verification request")
    .addStringOption((option) =>
      option
        .setName("character")
        .setDescription("Your in-game character name")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("guild")
        .setDescription("Your in-game guild name")
        .setRequired(true)
    )
    .addAttachmentOption((option) =>
      option
        .setName("screenshot1")
        .setDescription(
          "Upload first screenshot showing your character and guild"
        )
        .setRequired(true)
    )
    .addAttachmentOption((option) =>
      option
        .setName("screenshot2")
        .setDescription("Upload second screenshot for additional verification")
        .setRequired(true)
    ),
].map((command) => command.toJSON());

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log("⏳ Registering slash command...");

    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });

    console.log("✅ Slash command registered successfully.");
  } catch (error) {
    console.error("❌ Error registering command:", error);
  }
})();
