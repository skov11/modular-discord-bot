// discord_verification_bot.js
// Requires Node.js v16+, discord.js v14+

const fs = require("fs");
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  Events,
  SlashCommandBuilder,
  REST,
  Routes,
} = require("discord.js");
const config = require("./config.json");
const {
  token,
  guildId,
  atreidesRoleId,
  verifierRoleIds,
  verifyChannelId,
  verifyCommandChannelId,
  logChannelId,
  howToVerifyID, // Using your config variable name
} = config;

// Debug flag - set to false for production
const DEBUG_MODE = config.debugMode || false;

// Rate limiting for auto-responses
const userResponseTracker = new Map();
const RESPONSE_COOLDOWN = 60000; // 1 minute in milliseconds

const logToFile = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync("verification_bot_logs.txt", `${logMessage}\n`);
};

const debugLog = (message) => {
  if (DEBUG_MODE) {
    logToFile(message);
  }
};

const logToDiscord = async (client, message) => {
  const logChannel = await client.channels
    .fetch(logChannelId)
    .catch(() => null);
  if (logChannel) logChannel.send(message);
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Message, Partials.Channel],
});

client.once("ready", async () => {
  logToFile(`✅ Logged in as ${client.user.tag}`);
  debugLog(`🔍 Debug mode is ${DEBUG_MODE ? "ENABLED" : "DISABLED"}`);

  // Output roles to log file (only in debug mode)
  if (DEBUG_MODE) {
    try {
      const guild = await client.guilds.fetch(guildId);
      const roles = await guild.roles.fetch();
      debugLog("📜 Server roles and IDs:");
      roles.forEach((role) => {
        debugLog(`- ${role.name}: ${role.id}`);
      });
    } catch (err) {
      logToFile(`❌ Failed to fetch roles: ${err.message}`);
    }
  }
});

// NEW: Auto-response for messages in verify-here channel
client.on("messageCreate", async (message) => {
  // Ignore messages from bots
  if (message.author.bot) return;

  // Only respond to messages in the verify command channel
  if (message.channelId !== verifyCommandChannelId) return;

  debugLog("🔍 ======== MESSAGE IN VERIFY CHANNEL ========");
  debugLog(`🔍 Message from: ${message.author.tag} (${message.author.id})`);
  debugLog(`🔍 Message content: "${message.content}"`);
  debugLog(`🔍 Channel: ${message.channel.name} (${message.channelId})`);

  try {
    // Check if the message is a slash command (these start with /)
    // Slash commands don't actually appear as regular messages, but just in case
    if (message.content.startsWith("/")) {
      debugLog("🔍 Message appears to be a command, ignoring");
      return;
    }

    // Rate limiting check
    const userId = message.author.id;
    const now = Date.now();
    const lastResponse = userResponseTracker.get(userId);

    if (lastResponse && now - lastResponse < RESPONSE_COOLDOWN) {
      debugLog(
        `🔍 Rate limit active for user ${message.author.tag}, skipping response`
      );
      return;
    }

    // Update rate limiting tracker
    userResponseTracker.set(userId, now);

    // Clean up old entries from rate limiting tracker (older than cooldown period)
    for (const [id, timestamp] of userResponseTracker.entries()) {
      if (now - timestamp > RESPONSE_COOLDOWN) {
        userResponseTracker.delete(id);
      }
    }

    debugLog("🔍 Sending auto-response to guide user to /verify command");

    // Create the guidance message with your specific format
    const howToVerifyMention = howToVerifyID
      ? ` Check out the instructions in <#${howToVerifyID}>.`
      : "";
    const responseMessage = `Please use the /verify command to begin the verification process.${howToVerifyMention}`;

    // Try to send private DM first, fallback to public reply if DMs are disabled
    try {
      await message.author.send(responseMessage);
      debugLog("✅ Auto-response DM sent successfully");

      // Log the auto-response event to Discord log channel
      const logMessage = `🤖 Auto-response DM sent to <@${message.author.id}> in <#${message.channelId}> - guided to use /verify command`;
      logToFile(logMessage);
      logToDiscord(client, logMessage);
    } catch (dmError) {
      debugLog(
        `⚠️ Failed to send DM to ${message.author.tag}: ${dmError.message}`
      );
      debugLog("🔄 Falling back to public reply in channel");

      try {
        // Fallback: Send public reply if DM fails
        await message.reply({
          content: responseMessage,
          allowedMentions: { repliedUser: false },
        });

        debugLog(
          "✅ Auto-response public reply sent successfully (DM fallback)"
        );

        // Log the fallback event
        const fallbackLogMessage = `🤖 Auto-response public reply sent to <@${message.author.id}> in <#${message.channelId}> - DM failed, used public fallback`;
        logToFile(fallbackLogMessage);
        logToDiscord(client, fallbackLogMessage);
      } catch (replyError) {
        debugLog(
          `❌ Both DM and reply failed for ${message.author.tag}: ${replyError.message}`
        );

        // Log the complete failure
        const failureLogMessage = `❌ Failed to send auto-response to <@${message.author.id}> in <#${message.channelId}> - both DM and public reply failed`;
        logToFile(failureLogMessage);
        logToDiscord(client, failureLogMessage);
      }
    }

    // Auto-delete the user's message after sending response
    try {
      debugLog("🗑️ Attempting to delete user's message to keep channel clean");
      await message.delete();
      debugLog("✅ User's message deleted successfully");

      // Log message deletion
      const deleteLogMessage = `🗑️ Auto-deleted message from <@${message.author.id}> in <#${message.channelId}> - keeping verification channel clean`;
      logToFile(deleteLogMessage);
      logToDiscord(client, deleteLogMessage);
    } catch (deleteError) {
      debugLog(
        `❌ Failed to delete message from ${message.author.tag}: ${deleteError.message}`
      );

      // Log deletion failure
      const deleteFailLogMessage = `❌ Failed to auto-delete message from <@${message.author.id}> in <#${message.channelId}> - insufficient permissions`;
      logToFile(deleteFailLogMessage);
      logToDiscord(client, deleteFailLogMessage);
    }
  } catch (error) {
    debugLog("🔍 ======== ERROR IN AUTO-RESPONSE ========");
    logToFile(`❌ Error sending auto-response: ${error.message}`);
    debugLog(`❌ Error stack: ${error.stack}`);
    debugLog("🔍 ======== AUTO-RESPONSE ERROR END ========");
  }

  debugLog("🔍 ======== MESSAGE PROCESSING END ========");
});

client.on("interactionCreate", async (interaction) => {
  if (
    interaction.isChatInputCommand() &&
    interaction.commandName === "verify"
  ) {
    // Enhanced debug logging starts here
    debugLog("🔍 ======== /VERIFY COMMAND EXECUTION START ========");
    debugLog(
      `🔍 Starting /verify command execution for user: ${interaction.user.tag} (${interaction.user.id})`
    );
    debugLog(`🔍 Guild: ${interaction.guild.name} (${interaction.guild.id})`);
    debugLog(
      `🔍 Channel: ${interaction.channel.name} (${interaction.channel.id})`
    );
    debugLog(`🔍 Expected verify command channel: ${verifyCommandChannelId}`);

    if (interaction.channelId !== verifyCommandChannelId) {
      debugLog("🔒 Command used in the wrong channel");
      return interaction.reply({
        content: `❌ You can only use this command in the <#${verifyCommandChannelId}> channel.`,
        ephemeral: true,
      });
    }

    try {
      // Step 1: Collect command options (wrapped in try/catch)
      let characterName, guildName, screenshot;
      try {
        debugLog("🔍 Step 1: Attempting to collect command options...");
        characterName = interaction.options.getString("character");
        guildName = interaction.options.getString("guild");
        screenshot = interaction.options.getAttachment("screenshot");
        debugLog("✅ Step 1: Options collected successfully");
      } catch (optionsError) {
        logToFile(
          `❌ Step 1 FAILED: Error collecting options: ${optionsError.message}`
        );
        throw optionsError;
      }

      debugLog(
        `🔍 Received options - Character: ${characterName}, Guild: ${guildName}, Screenshot: ${
          screenshot ? "Yes" : "No"
        }`
      );
      if (screenshot && DEBUG_MODE) {
        debugLog(`🔍 Screenshot URL: ${screenshot.url}`);
        debugLog(`🔍 Screenshot size: ${screenshot.size} bytes`);
        debugLog(`🔍 Screenshot content type: ${screenshot.contentType}`);
      }

      // Step 2: Check if user already has the role (wrapped in try/catch)
      let member, hasRole;
      try {
        debugLog(
          "🔍 Step 2: Checking if user already has verification role..."
        );
        member = interaction.member;
        hasRole = member.roles.cache.has(atreidesRoleId);
        debugLog(
          `✅ Step 2: Role check completed - Has Atreides role (${atreidesRoleId}): ${hasRole}`
        );
      } catch (roleCheckError) {
        logToFile(
          `❌ Step 2 FAILED: Error checking user roles: ${roleCheckError.message}`
        );
        throw roleCheckError;
      }

      if (hasRole) {
        debugLog("⚠️ User already has verification role");
        return interaction.reply({
          content: "⚠️ You are already verified.",
          ephemeral: true,
        });
      }

      // Step 3: Fetch verification channel (wrapped in try/catch)
      let verifyChannel;
      try {
        debugLog(
          `🔍 Step 3: Attempting to fetch verification channel: ${verifyChannelId}`
        );
        verifyChannel = await client.channels.fetch(verifyChannelId);
        if (!verifyChannel) {
          throw new Error(`Verification channel not found: ${verifyChannelId}`);
        }
        debugLog(
          `✅ Step 3: Found verification channel: ${verifyChannel.name} (Type: ${verifyChannel.type})`
        );
      } catch (channelFetchError) {
        logToFile(
          `❌ Step 3 FAILED: Error fetching verification channel: ${channelFetchError.message}`
        );
        logToFile(`❌ Channel fetch error code: ${channelFetchError.code}`);
        logToFile(`❌ Channel fetch error status: ${channelFetchError.status}`);
        throw channelFetchError;
      }

      // Step 4: Check bot permissions (wrapped in try/catch)
      let botPermissions;
      try {
        debugLog(
          "🔍 Step 4: Checking bot permissions in verification channel..."
        );
        const botMember = interaction.guild.members.me;
        botPermissions = verifyChannel.permissionsFor(botMember);
        debugLog(
          `✅ Step 4: Permissions retrieved: ${botPermissions
            .toArray()
            .join(", ")}`
        );

        // Check specific permissions
        const canViewChannel = botPermissions.has("ViewChannel");
        const canSendMessages = botPermissions.has("SendMessages");
        const canEmbedLinks = botPermissions.has("EmbedLinks");
        const canAttachFiles = botPermissions.has("AttachFiles");

        debugLog(`🔍 Can View Channel: ${canViewChannel}`);
        debugLog(`🔍 Can Send Messages: ${canSendMessages}`);
        debugLog(`🔍 Can Embed Links: ${canEmbedLinks}`);
        debugLog(`🔍 Can Attach Files: ${canAttachFiles}`);

        if (!canViewChannel) {
          throw new Error("Bot cannot view the verification channel");
        }
        if (!canSendMessages) {
          throw new Error(
            "Bot cannot send messages in the verification channel"
          );
        }
      } catch (permissionError) {
        logToFile(
          `❌ Step 4 FAILED: Error checking permissions: ${permissionError.message}`
        );
        throw permissionError;
      }

      // Step 5: Create embed (wrapped in try/catch)
      let embed;
      try {
        debugLog("🔍 Step 5: Creating verification embed...");
        embed = new EmbedBuilder()
          .setTitle("🛡️ Verification Request")
          .addFields(
            { name: "Character Name", value: characterName },
            { name: "Guild Name", value: guildName },
            { name: "Discord User", value: `<@${interaction.user.id}>` }
          )
          .setImage(screenshot.url)
          .setTimestamp()
          .setFooter({ text: `User ID: ${interaction.user.id}` });
        debugLog("✅ Step 5: Embed created successfully");
      } catch (embedError) {
        logToFile(
          `❌ Step 5 FAILED: Error creating embed: ${embedError.message}`
        );
        throw embedError;
      }

      // Step 6: Create button (wrapped in try/catch)
      let button, row;
      try {
        debugLog("🔍 Step 6: Creating approval button...");
        button = new ButtonBuilder()
          .setCustomId(`verify_${interaction.user.id}`)
          .setLabel("Approve Verification")
          .setStyle(ButtonStyle.Success);

        row = new ActionRowBuilder().addComponents(button);
        debugLog("✅ Step 6: Button created successfully");
      } catch (buttonError) {
        logToFile(
          `❌ Step 6 FAILED: Error creating button: ${buttonError.message}`
        );
        throw buttonError;
      }

      // Step 7: Send to verification channel (wrapped in try/catch)
      let verificationMessage;
      try {
        debugLog(
          "🔍 Step 7: Attempting to send message to verification channel..."
        );
        verificationMessage = await verifyChannel.send({
          embeds: [embed],
          components: [row],
        });
        debugLog(
          `✅ Step 7: Message sent successfully. Message ID: ${verificationMessage.id}`
        );
      } catch (sendError) {
        logToFile(
          `❌ Step 7 FAILED: Error sending message to verification channel: ${sendError.message}`
        );
        logToFile(`❌ Send error name: ${sendError.name}`);
        logToFile(`❌ Send error code: ${sendError.code}`);
        logToFile(`❌ Send error status: ${sendError.status}`);
        logToFile(`❌ Send error method: ${sendError.method}`);
        logToFile(`❌ Send error path: ${sendError.path}`);
        logToFile(`❌ Send error stack: ${sendError.stack}`);
        throw sendError;
      }

      // Step 8: Reply to user (wrapped in try/catch)
      try {
        debugLog("🔍 Step 8: Attempting to reply to user...");
        await interaction.reply({
          content: "✅ Your verification request has been submitted.",
          ephemeral: true,
        });
        debugLog("✅ Step 8: Successfully replied to user");
      } catch (replyError) {
        logToFile(
          `❌ Step 8 FAILED: Error replying to user: ${replyError.message}`
        );
        logToFile(`❌ Reply error code: ${replyError.code}`);
        throw replyError;
      }

      debugLog("✅ /verify command completed successfully");
      debugLog("🔍 ======== /VERIFY COMMAND EXECUTION END ========");
    } catch (err) {
      // Enhanced error logging
      debugLog("🔍 ======== ERROR IN /VERIFY COMMAND ========");
      logToFile(`❌ Error during /verify command: ${err.message}`);
      debugLog(`❌ Error name: ${err.name}`);
      debugLog(`❌ Error code: ${err.code || "No code"}`);
      debugLog(`❌ Error status: ${err.status || "No status"}`);
      debugLog(`❌ Error method: ${err.method || "No method"}`);
      debugLog(`❌ Error path: ${err.path || "No path"}`);
      debugLog(`❌ Full error stack: ${err.stack}`);

      // Log additional context
      debugLog(
        `❌ Error occurred for user: ${interaction.user.tag} (${interaction.user.id})`
      );
      debugLog(
        `❌ Guild: ${interaction.guild?.name} (${interaction.guild?.id})`
      );
      debugLog(
        `❌ Channel: ${interaction.channel?.name} (${interaction.channel?.id})`
      );
      debugLog(`❌ Interaction replied: ${interaction.replied}`);
      debugLog(`❌ Interaction deferred: ${interaction.deferred}`);

      if (!interaction.replied && !interaction.deferred) {
        try {
          await interaction.reply({
            content: "⚠️ An error occurred while processing your request.",
            ephemeral: true,
          });
          debugLog("✅ Error response sent to user");
        } catch (replyErr) {
          logToFile(`❌ Failed to send error response: ${replyErr.message}`);
        }
      }
      debugLog("🔍 ======== ERROR LOGGING END ========");
    }
  }

  if (interaction.isButton()) {
    debugLog("🔍 ======== BUTTON INTERACTION START ========");
    const customId = interaction.customId;
    debugLog(`🔍 Button interaction received: ${customId}`);

    if (!customId.startsWith("verify_")) {
      debugLog("🔍 Button is not a verification button, ignoring");
      return;
    }

    try {
      const memberId = customId.replace("verify_", "");
      debugLog(`🔍 Extracted member ID from button: ${memberId}`);

      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        logToFile(`❌ Could not find guild: ${guildId}`);
        return;
      }

      debugLog("🔍 Fetching member and verifier...");
      const member = await guild.members.fetch(memberId).catch((err) => {
        logToFile(`❌ Failed to fetch member ${memberId}: ${err.message}`);
        return null;
      });
      const verifier = await guild.members
        .fetch(interaction.user.id)
        .catch((err) => {
          logToFile(
            `❌ Failed to fetch verifier ${interaction.user.id}: ${err.message}`
          );
          return null;
        });

      if (!member || !verifier) {
        logToFile(
          `❌ Member or verifier not found. Member: ${!!member}, Verifier: ${!!verifier}`
        );
        return;
      }

      debugLog(`🔍 Member: ${member.user.tag}, Verifier: ${verifier.user.tag}`);

      // Check verifier permissions
      debugLog("🔍 Checking verifier permissions...");
      if (!Array.isArray(verifierRoleIds)) {
        logToFile("❌ verifierRoleIds is not an array!");
        return;
      }

      const verifierRoles = verifier.roles.cache.map((role) => role.id);
      debugLog(`🔍 Verifier roles: [${verifierRoles.join(", ")}]`);
      debugLog(`🔍 Required verifier roles: [${verifierRoleIds.join(", ")}]`);

      const hasVerifierRole = verifier.roles.cache.some((role) =>
        verifierRoleIds.includes(role.id)
      );
      debugLog(`🔍 Verifier has required role: ${hasVerifierRole}`);

      if (!hasVerifierRole) {
        debugLog("❌ Verifier does not have permission");
        return interaction.reply({
          content: "❌ You do not have permission to approve verifications.",
          ephemeral: true,
        });
      }

      // Check if already verified
      debugLog("🔍 Checking if member is already verified...");
      const alreadyVerified = member.roles.cache.has(atreidesRoleId);
      debugLog(`🔍 Member already has verification role: ${alreadyVerified}`);

      if (alreadyVerified) {
        debugLog("⚠️ Member already verified");
        return interaction.reply({
          content: "⚠️ This user has already been verified.",
          ephemeral: true,
        });
      }

      // Add role
      debugLog(`🔍 Adding role ${atreidesRoleId} to member...`);
      await member.roles.add(atreidesRoleId);
      debugLog("✅ Role added successfully");

      // Update interaction
      debugLog("🔍 Updating interaction message...");
      await interaction.update({
        content: `✅ <@${memberId}> has been verified by <@${verifier.id}>.`,
        components: [],
        embeds: interaction.message.embeds,
      });
      debugLog("✅ Interaction updated successfully");

      const logMessage = `✅ ${verifier.user.tag} verified ${
        member.user.tag
      } at ${new Date().toLocaleString()}`;
      logToFile(logMessage);
      logToDiscord(client, logMessage);

      debugLog("✅ Button interaction completed successfully");
      debugLog("🔍 ======== BUTTON INTERACTION END ========");
    } catch (err) {
      debugLog("🔍 ======== ERROR IN BUTTON INTERACTION ========");
      logToFile(`❌ Error during button interaction: ${err.message}`);
      debugLog(`❌ Error stack: ${err.stack}`);
      debugLog("🔍 ======== BUTTON ERROR END ========");
    }
  }
});

client.login(token);
