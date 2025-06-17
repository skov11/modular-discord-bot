// discord_verification_bot.js
// Requires Node.js v16+, discord.js v14+

const fs = require('fs');
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, Events, SlashCommandBuilder, REST, Routes } = require('discord.js');
const { token, guildId, atreidesRoleId, verifierRoleIds, verifyChannelId, verifyCommandChannelId, logChannelId } = require('./config.json');

const logToFile = (message) => {
  const timestamp = new Date().toISOString();
  fs.appendFileSync('verification_bot_logs.txt', `[${timestamp}] ${message}\n`);
};

const logToDiscord = async (client, message) => {
  const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
  if (logChannel) logChannel.send(message);
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Message, Partials.Channel]
});

client.once('ready', async () => {
  logToFile(`✅ Logged in as ${client.user.tag}`);

  // Output roles to log file
  try {
    const guild = await client.guilds.fetch(guildId);
    const roles = await guild.roles.fetch();
    logToFile('📜 Server roles and IDs:');
    roles.forEach(role => {
      logToFile(`- ${role.name}: ${role.id}`);
    });
  } catch (err) {
    logToFile(`❌ Failed to fetch roles: ${err.message}`);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand() && interaction.commandName === 'verify') {
    logToFile('🟡 Received /verify command');

    if (interaction.channelId !== verifyCommandChannelId) {
      logToFile('🔒 Command used in the wrong channel');
      return interaction.reply({
        content: `❌ You can only use this command in the <#${verifyCommandChannelId}> channel.`,
        ephemeral: true
      });
    }

    try {
      const characterName = interaction.options.getString('character');
      const guildName = interaction.options.getString('guild');
      const screenshot = interaction.options.getAttachment('screenshot');

      logToFile(`📦 Collected options: character=${characterName}, guild=${guildName}, screenshotURL=${screenshot?.url}`);

      const verifyChannel = await client.channels.fetch(verifyChannelId);
      logToFile('📨 Fetched verify channel');

      const embed = new EmbedBuilder()
        .setTitle('🛡️ Verification Request')
        .addFields(
          { name: 'Character Name', value: characterName },
          { name: 'Guild Name', value: guildName },
          { name: 'Discord User', value: `<@${interaction.user.id}>` }
        )
        .setImage(screenshot.url)
        .setTimestamp()
        .setFooter({ text: `User ID: ${interaction.user.id}` });

      const button = new ButtonBuilder()
        .setCustomId(`verify_${interaction.user.id}`)
        .setLabel('Approve Verification')
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder().addComponents(button);

      await verifyChannel.send({ embeds: [embed], components: [row] });
      logToFile('✅ Sent verification message with button');

      await interaction.reply({ content: '✅ Your verification request has been submitted.', ephemeral: true });
      logToFile('✅ Replied to interaction');
    } catch (err) {
      logToFile(`❌ Error during /verify command: ${err.message}`);
      if (!interaction.replied) {
        await interaction.reply({
          content: '⚠️ An error occurred while processing your request.',
          ephemeral: true
        });
      }
    }
  }

  if (interaction.isButton()) {
    const customId = interaction.customId;
    if (!customId.startsWith('verify_')) return;

    const memberId = customId.replace('verify_', '');
    const guild = client.guilds.cache.get(guildId);
    const member = await guild.members.fetch(memberId).catch(() => null);
    const verifier = await guild.members.fetch(interaction.user.id).catch(() => null);

    if (!member || !verifier) return;
    if (!Array.isArray(verifierRoleIds)) {
      logToFile('❌ verifierRoleIds is not an array!');
      return;
    }
    if (!verifier.roles.cache.some(role => verifierRoleIds.includes(role.id))) {
      return interaction.reply({ content: '❌ You do not have permission to approve verifications.', ephemeral: true });
    }

    if (member.roles.cache.has(atreidesRoleId)) {
      return interaction.reply({ content: '⚠️ This user has already been verified.', ephemeral: true });
    }

    await member.roles.add(atreidesRoleId);
    await interaction.update({ content: `✅ <@${memberId}> has been verified by <@${verifier.id}>.`, components: [], embeds: interaction.message.embeds });

    const logMessage = `✅ ${verifier.user.tag} verified ${member.user.tag} at ${new Date().toLocaleString()}`;
    logToFile(logMessage);
    logToDiscord(client, logMessage);
  }
});

client.login(token);
