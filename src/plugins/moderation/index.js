const Plugin = require("../../core/Plugin");
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

class ModerationPlugin extends Plugin {
    constructor(client, config) {
        super(client, config);
        this.moderationHistory = new Map(); // userId -> array of actions
        this.serverModerationLog = []; // Array of all moderation actions
    }

    async load() {
        this.log("Loading Moderation Plugin...");

        // Register moderation commands
        const modCommand = {
            data: new SlashCommandBuilder()
                .setName("mod")
                .setDescription("Moderation commands")
                .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("timeout")
                        .setDescription("Timeout a user")
                        .addUserOption(option =>
                            option.setName("user")
                                .setDescription("User to timeout")
                                .setRequired(true))
                        .addIntegerOption(option =>
                            option.setName("duration")
                                .setDescription("Duration in minutes (1-40320)")
                                .setRequired(true)
                                .setMinValue(1)
                                .setMaxValue(40320))
                        .addStringOption(option =>
                            option.setName("reason")
                                .setDescription("Reason for timeout")
                                .setRequired(false)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("kick")
                        .setDescription("Kick a user from the server")
                        .addUserOption(option =>
                            option.setName("user")
                                .setDescription("User to kick")
                                .setRequired(true))
                        .addStringOption(option =>
                            option.setName("reason")
                                .setDescription("Reason for kick")
                                .setRequired(false)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("ban")
                        .setDescription("Ban a user from the server")
                        .addUserOption(option =>
                            option.setName("user")
                                .setDescription("User to ban")
                                .setRequired(true))
                        .addStringOption(option =>
                            option.setName("reason")
                                .setDescription("Reason for ban")
                                .setRequired(false))
                        .addIntegerOption(option =>
                            option.setName("delete_messages")
                                .setDescription("Delete messages from last X days (0-7)")
                                .setRequired(false)
                                .setMinValue(0)
                                .setMaxValue(7)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("unban")
                        .setDescription("Unban a user")
                        .addStringOption(option =>
                            option.setName("user_id")
                                .setDescription("User ID to unban")
                                .setRequired(true))
                        .addStringOption(option =>
                            option.setName("reason")
                                .setDescription("Reason for unban")
                                .setRequired(false)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("warn")
                        .setDescription("Warn a user")
                        .addUserOption(option =>
                            option.setName("user")
                                .setDescription("User to warn")
                                .setRequired(true))
                        .addStringOption(option =>
                            option.setName("reason")
                                .setDescription("Reason for warning")
                                .setRequired(true)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("slowmode")
                        .setDescription("Set channel slowmode")
                        .addIntegerOption(option =>
                            option.setName("seconds")
                                .setDescription("Slowmode duration in seconds (0-21600)")
                                .setRequired(true)
                                .setMinValue(0)
                                .setMaxValue(21600))
                        .addChannelOption(option =>
                            option.setName("channel")
                                .setDescription("Channel to set slowmode (defaults to current)")
                                .setRequired(false)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("addrole")
                        .setDescription("Add a role to a user")
                        .addUserOption(option =>
                            option.setName("user")
                                .setDescription("User to add role to")
                                .setRequired(true))
                        .addRoleOption(option =>
                            option.setName("role")
                                .setDescription("Role to add")
                                .setRequired(true))
                        .addStringOption(option =>
                            option.setName("reason")
                                .setDescription("Reason for adding role")
                                .setRequired(false)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("removerole")
                        .setDescription("Remove a role from a user")
                        .addUserOption(option =>
                            option.setName("user")
                                .setDescription("User to remove role from")
                                .setRequired(true))
                        .addRoleOption(option =>
                            option.setName("role")
                                .setDescription("Role to remove")
                                .setRequired(true))
                        .addStringOption(option =>
                            option.setName("reason")
                                .setDescription("Reason for removing role")
                                .setRequired(false)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("nickname")
                        .setDescription("Change a user's nickname")
                        .addUserOption(option =>
                            option.setName("user")
                                .setDescription("User to change nickname")
                                .setRequired(true))
                        .addStringOption(option =>
                            option.setName("nickname")
                                .setDescription("New nickname (leave empty to clear)")
                                .setRequired(false))
                        .addStringOption(option =>
                            option.setName("reason")
                                .setDescription("Reason for nickname change")
                                .setRequired(false)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("purgemsg")
                        .setDescription("Bulk delete messages")
                        .addIntegerOption(option =>
                            option.setName("count")
                                .setDescription("Number of messages to delete (1-100)")
                                .setRequired(true)
                                .setMinValue(1)
                                .setMaxValue(100))
                        .addUserOption(option =>
                            option.setName("user")
                                .setDescription("Only delete messages from this user")
                                .setRequired(false))
                        .addChannelOption(option =>
                            option.setName("channel")
                                .setDescription("Channel to purge (defaults to current)")
                                .setRequired(false)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("pin")
                        .setDescription("Pin a message")
                        .addStringOption(option =>
                            option.setName("message_id")
                                .setDescription("ID of message to pin")
                                .setRequired(true))
                        .addChannelOption(option =>
                            option.setName("channel")
                                .setDescription("Channel containing the message (defaults to current)")
                                .setRequired(false)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("unpin")
                        .setDescription("Unpin a message")
                        .addStringOption(option =>
                            option.setName("message_id")
                                .setDescription("ID of message to unpin")
                                .setRequired(true))
                        .addChannelOption(option =>
                            option.setName("channel")
                                .setDescription("Channel containing the message (defaults to current)")
                                .setRequired(false)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("userinfo")
                        .setDescription("Display user account details and moderation history")
                        .addUserOption(option =>
                            option.setName("user")
                                .setDescription("User to get information about")
                                .setRequired(true)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("serverstats")
                        .setDescription("Display server moderation statistics")),
            execute: async (interaction) => {
                await this.handleModCommand(interaction);
            }
        };

        // Keep the test command for basic functionality testing
        const moderationTestCommand = {
            data: new SlashCommandBuilder()
                .setName("modtest")
                .setDescription("Test moderation plugin functionality")
                .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
            execute: async (interaction) => {
                await this.handleModerationTest(interaction);
            }
        };

        this.registerCommand(modCommand);
        this.registerCommand(moderationTestCommand);

        this.log("Moderation Plugin loaded successfully");
    }

    async unload() {
        this.log("Unloading Moderation Plugin...");
        this.log("Moderation Plugin unloaded");
    }

    async handleModCommand(interaction) {
        try {
            // Check permissions
            if (!this.hasModeratorPermission(interaction.member)) {
                return await interaction.reply({
                    content: "❌ You don't have permission to use moderation commands.",
                    ephemeral: true
                });
            }

            const subcommand = interaction.options.getSubcommand();

            // Check if the specific action is enabled
            if (!this.isActionEnabled(subcommand)) {
                return await interaction.reply({
                    content: `❌ The **${subcommand}** command is currently disabled.`,
                    ephemeral: true
                });
            }

            // Check for channel exemptions
            if (this.isChannelExempt(interaction.channel)) {
                return await interaction.reply({
                    content: "❌ Moderation commands cannot be used in this channel.",
                    ephemeral: true
                });
            }

            // Check for user exemptions (for commands that target users)
            const targetUser = interaction.options.getUser('user');
            if (targetUser && this.isUserExempt(interaction.guild.members.cache.get(targetUser.id))) {
                return await interaction.reply({
                    content: "❌ This user is exempt from moderation actions.",
                    ephemeral: true
                });
            }

            switch (subcommand) {
                case "timeout":
                    await this.handleTimeout(interaction);
                    break;
                case "kick":
                    await this.handleKick(interaction);
                    break;
                case "ban":
                    await this.handleBan(interaction);
                    break;
                case "unban":
                    await this.handleUnban(interaction);
                    break;
                case "warn":
                    await this.handleWarn(interaction);
                    break;
                case "slowmode":
                    await this.handleSlowmode(interaction);
                    break;
                case "addrole":
                    await this.handleAddRole(interaction);
                    break;
                case "removerole":
                    await this.handleRemoveRole(interaction);
                    break;
                case "nickname":
                    await this.handleNickname(interaction);
                    break;
                case "purgemsg":
                    await this.handlePurgeMessages(interaction);
                    break;
                case "pin":
                    await this.handlePin(interaction);
                    break;
                case "unpin":
                    await this.handleUnpin(interaction);
                    break;
                case "userinfo":
                    await this.handleUserInfo(interaction);
                    break;
                case "serverstats":
                    await this.handleServerStats(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: "❌ Unknown moderation command.",
                        ephemeral: true
                    });
            }
        } catch (error) {
            this.log(`Error in mod command: ${error.message}`, "error");
            await interaction.reply({
                content: "❌ An error occurred while executing the moderation command.",
                ephemeral: true
            });
        }
    }

    async handleTimeout(interaction) {
        const user = interaction.options.getUser("user");
        const duration = interaction.options.getInteger("duration");
        const reason = interaction.options.getString("reason") || "No reason provided";

        try {
            const member = await interaction.guild.members.fetch(user.id);
            
            if (!member) {
                return await interaction.reply({
                    content: "❌ User not found in this server.",
                    ephemeral: true
                });
            }

            if (member.id === interaction.user.id) {
                return await interaction.reply({
                    content: "❌ You cannot timeout yourself.",
                    ephemeral: true
                });
            }

            if (member.roles.highest.position >= interaction.member.roles.highest.position) {
                return await interaction.reply({
                    content: "❌ You cannot timeout a user with equal or higher roles.",
                    ephemeral: true
                });
            }

            const timeoutDuration = duration * 60 * 1000; // Convert minutes to milliseconds
            await member.timeout(timeoutDuration, reason);

            const embed = new EmbedBuilder()
                .setColor(0xFF6B35)
                .setTitle("🔇 User Timed Out")
                .addFields(
                    { name: "User", value: `${targetMember?.displayName || user.username} (${user.id})`, inline: true },
                    { name: "Duration", value: `${duration} minutes`, inline: true },
                    { name: "Moderator", value: interaction.member?.displayName || interaction.user.username, inline: true },
                    { name: "Reason", value: reason }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            await this.logModAction("timeout", user, interaction.user, reason, { duration, guild: interaction.guild });

        } catch (error) {
            this.log(`Error timing out user: ${error.message}`, "error");
            await interaction.reply({
                content: "❌ Failed to timeout user. Check permissions and try again.",
                ephemeral: true
            });
        }
    }

    async handleKick(interaction) {
        const user = interaction.options.getUser("user");
        const reason = interaction.options.getString("reason") || "No reason provided";

        try {
            const member = await interaction.guild.members.fetch(user.id);
            
            if (!member) {
                return await interaction.reply({
                    content: "❌ User not found in this server.",
                    ephemeral: true
                });
            }

            if (member.id === interaction.user.id) {
                return await interaction.reply({
                    content: "❌ You cannot kick yourself.",
                    ephemeral: true
                });
            }

            if (member.roles.highest.position >= interaction.member.roles.highest.position) {
                return await interaction.reply({
                    content: "❌ You cannot kick a user with equal or higher roles.",
                    ephemeral: true
                });
            }

            await member.kick(reason);

            const embed = new EmbedBuilder()
                .setColor(0xFF9500)
                .setTitle("👢 User Kicked")
                .addFields(
                    { name: "User", value: `${targetMember?.displayName || user.username} (${user.id})`, inline: true },
                    { name: "Moderator", value: interaction.member?.displayName || interaction.user.username, inline: true },
                    { name: "Reason", value: reason }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            await this.logModAction("kick", user, interaction.user, reason, { guild: interaction.guild });

        } catch (error) {
            this.log(`Error kicking user: ${error.message}`, "error");
            await interaction.reply({
                content: "❌ Failed to kick user. Check permissions and try again.",
                ephemeral: true
            });
        }
    }

    async handleBan(interaction) {
        const user = interaction.options.getUser("user");
        const reason = interaction.options.getString("reason") || "No reason provided";
        const deleteMessages = interaction.options.getInteger("delete_messages") || 0;

        try {
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
            
            if (member) {
                if (member.id === interaction.user.id) {
                    return await interaction.reply({
                        content: "❌ You cannot ban yourself.",
                        ephemeral: true
                    });
                }

                if (member.roles.highest.position >= interaction.member.roles.highest.position) {
                    return await interaction.reply({
                        content: "❌ You cannot ban a user with equal or higher roles.",
                        ephemeral: true
                    });
                }
            }

            await interaction.guild.members.ban(user.id, {
                reason: reason,
                deleteMessageDays: deleteMessages
            });

            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("🔨 User Banned")
                .addFields(
                    { name: "User", value: `${targetMember?.displayName || user.username} (${user.id})`, inline: true },
                    { name: "Moderator", value: interaction.member?.displayName || interaction.user.username, inline: true },
                    { name: "Messages Deleted", value: `${deleteMessages} days`, inline: true },
                    { name: "Reason", value: reason }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            await this.logModAction("ban", user, interaction.user, reason, { deleteMessages, guild: interaction.guild });

        } catch (error) {
            this.log(`Error banning user: ${error.message}`, "error");
            await interaction.reply({
                content: "❌ Failed to ban user. Check permissions and try again.",
                ephemeral: true
            });
        }
    }

    async handleUnban(interaction) {
        const userId = interaction.options.getString("user_id");
        const reason = interaction.options.getString("reason") || "No reason provided";

        try {
            const bannedUser = await interaction.guild.bans.fetch(userId).catch(() => null);
            
            if (!bannedUser) {
                return await interaction.reply({
                    content: "❌ User is not banned or user ID is invalid.",
                    ephemeral: true
                });
            }

            await interaction.guild.members.unban(userId, reason);

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle("✅ User Unbanned")
                .addFields(
                    { name: "User", value: `${bannedUser.user.username} (${userId})`, inline: true },
                    { name: "Moderator", value: interaction.member?.displayName || interaction.user.username, inline: true },
                    { name: "Reason", value: reason }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            await this.logModAction("unban", bannedUser.user, interaction.user, reason, { guild: interaction.guild });

        } catch (error) {
            this.log(`Error unbanning user: ${error.message}`, "error");
            await interaction.reply({
                content: "❌ Failed to unban user. Check that the user ID is correct and try again.",
                ephemeral: true
            });
        }
    }

    async handleWarn(interaction) {
        const user = interaction.options.getUser("user");
        const reason = interaction.options.getString("reason");

        try {
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
            
            if (user.id === interaction.user.id) {
                return await interaction.reply({
                    content: "❌ You cannot warn yourself.",
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor(0xFFFF00)
                .setTitle("⚠️ User Warned")
                .addFields(
                    { name: "User", value: `${member?.displayName || user.username} (${user.id})`, inline: true },
                    { name: "Moderator", value: interaction.member?.displayName || interaction.user.username, inline: true },
                    { name: "Reason", value: reason }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            await this.logModAction("warn", user, interaction.user, reason, { guild: interaction.guild });

            // Try to DM the user about the warning
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(0xFFFF00)
                    .setTitle(`⚠️ Warning from ${interaction.guild.name}`)
                    .addFields(
                        { name: "Moderator", value: interaction.member?.displayName || interaction.user.username, inline: true },
                        { name: "Reason", value: reason }
                    )
                    .setTimestamp();

                await user.send({ embeds: [dmEmbed] });
            } catch (dmError) {
                this.log(`Could not DM warning to ${member?.displayName || user.username}: ${dmError.message}`);
            }

        } catch (error) {
            this.log(`Error warning user: ${error.message}`, "error");
            await interaction.reply({
                content: "❌ Failed to warn user. Please try again.",
                ephemeral: true
            });
        }
    }

    async handleSlowmode(interaction) {
        const seconds = interaction.options.getInteger("seconds");
        const channel = interaction.options.getChannel("channel") || interaction.channel;

        try {
            if (!channel.isTextBased()) {
                return await interaction.reply({
                    content: "❌ Slowmode can only be set on text channels.",
                    ephemeral: true
                });
            }

            await channel.setRateLimitPerUser(seconds);

            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle("🐌 Slowmode Updated")
                .addFields(
                    { name: "Channel", value: `${channel.toString()}`, inline: true },
                    { name: "Duration", value: seconds === 0 ? "Disabled" : `${seconds} seconds`, inline: true },
                    { name: "Moderator", value: interaction.member?.displayName || interaction.user.username, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            await this.logModAction("slowmode", null, interaction.user, `Set slowmode to ${seconds} seconds in ${channel.name}`, { channel: channel.name, seconds });

        } catch (error) {
            this.log(`Error setting slowmode: ${error.message}`, "error");
            await interaction.reply({
                content: "❌ Failed to set slowmode. Check permissions and try again.",
                ephemeral: true
            });
        }
    }

    async handleAddRole(interaction) {
        const user = interaction.options.getUser("user");
        const role = interaction.options.getRole("role");
        const reason = interaction.options.getString("reason") || "No reason provided";

        try {
            const member = await interaction.guild.members.fetch(user.id);
            
            if (!member) {
                return await interaction.reply({
                    content: "❌ User not found in this server.",
                    ephemeral: true
                });
            }

            if (user.id === interaction.user.id) {
                return await interaction.reply({
                    content: "❌ You cannot modify your own roles.",
                    ephemeral: true
                });
            }

            if (role.position >= interaction.member.roles.highest.position) {
                return await interaction.reply({
                    content: "❌ You cannot assign a role equal to or higher than your highest role.",
                    ephemeral: true
                });
            }

            if (member.roles.cache.has(role.id)) {
                return await interaction.reply({
                    content: `❌ User already has the ${role.name} role.`,
                    ephemeral: true
                });
            }

            await member.roles.add(role, reason);

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle("✅ Role Added")
                .addFields(
                    { name: "User", value: `${member?.displayName || user.username} (${user.id})`, inline: true },
                    { name: "Role", value: role.name, inline: true },
                    { name: "Moderator", value: interaction.member?.displayName || interaction.user.username, inline: true },
                    { name: "Reason", value: reason }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            await this.logModAction("addrole", user, interaction.user, reason, { role: role.name, guild: interaction.guild });

        } catch (error) {
            this.log(`Error adding role: ${error.message}`, "error");
            await interaction.reply({
                content: "❌ Failed to add role. Check permissions and try again.",
                ephemeral: true
            });
        }
    }

    async handleRemoveRole(interaction) {
        const user = interaction.options.getUser("user");
        const role = interaction.options.getRole("role");
        const reason = interaction.options.getString("reason") || "No reason provided";

        try {
            const member = await interaction.guild.members.fetch(user.id);
            
            if (!member) {
                return await interaction.reply({
                    content: "❌ User not found in this server.",
                    ephemeral: true
                });
            }

            if (user.id === interaction.user.id) {
                return await interaction.reply({
                    content: "❌ You cannot modify your own roles.",
                    ephemeral: true
                });
            }

            if (role.position >= interaction.member.roles.highest.position) {
                return await interaction.reply({
                    content: "❌ You cannot remove a role equal to or higher than your highest role.",
                    ephemeral: true
                });
            }

            if (!member.roles.cache.has(role.id)) {
                return await interaction.reply({
                    content: `❌ User does not have the ${role.name} role.`,
                    ephemeral: true
                });
            }

            await member.roles.remove(role, reason);

            const embed = new EmbedBuilder()
                .setColor(0xFF9500)
                .setTitle("🗑️ Role Removed")
                .addFields(
                    { name: "User", value: `${member?.displayName || user.username} (${user.id})`, inline: true },
                    { name: "Role", value: role.name, inline: true },
                    { name: "Moderator", value: interaction.member?.displayName || interaction.user.username, inline: true },
                    { name: "Reason", value: reason }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            await this.logModAction("removerole", user, interaction.user, reason, { role: role.name, guild: interaction.guild });

        } catch (error) {
            this.log(`Error removing role: ${error.message}`, "error");
            await interaction.reply({
                content: "❌ Failed to remove role. Check permissions and try again.",
                ephemeral: true
            });
        }
    }

    async handleNickname(interaction) {
        const user = interaction.options.getUser("user");
        const nickname = interaction.options.getString("nickname");
        const reason = interaction.options.getString("reason") || "No reason provided";

        try {
            const member = await interaction.guild.members.fetch(user.id);
            
            if (!member) {
                return await interaction.reply({
                    content: "❌ User not found in this server.",
                    ephemeral: true
                });
            }

            if (user.id === interaction.user.id) {
                return await interaction.reply({
                    content: "❌ You cannot change your own nickname.",
                    ephemeral: true
                });
            }

            if (member.roles.highest.position >= interaction.member.roles.highest.position) {
                return await interaction.reply({
                    content: "❌ You cannot change the nickname of a user with equal or higher roles.",
                    ephemeral: true
                });
            }

            const oldNickname = member.displayName;
            await member.setNickname(nickname, reason);

            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle("📝 Nickname Changed")
                .addFields(
                    { name: "User", value: `${member?.displayName || user.username} (${user.id})`, inline: true },
                    { name: "Old Nickname", value: oldNickname || "None", inline: true },
                    { name: "New Nickname", value: nickname || "None", inline: true },
                    { name: "Moderator", value: interaction.member?.displayName || interaction.user.username, inline: true },
                    { name: "Reason", value: reason }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            await this.logModAction("nickname", user, interaction.user, reason, { 
                oldNickname: oldNickname || "None", 
                newNickname: nickname || "None",
                guild: interaction.guild
            });

        } catch (error) {
            this.log(`Error changing nickname: ${error.message}`, "error");
            await interaction.reply({
                content: "❌ Failed to change nickname. Check permissions and try again.",
                ephemeral: true
            });
        }
    }

    async handlePurgeMessages(interaction) {
        const count = interaction.options.getInteger("count");
        const targetUser = interaction.options.getUser("user");
        const channel = interaction.options.getChannel("channel") || interaction.channel;

        try {
            if (!channel.isTextBased()) {
                return await interaction.reply({
                    content: "❌ Messages can only be purged from text channels.",
                    ephemeral: true
                });
            }

            await interaction.deferReply({ ephemeral: true });

            let fetchedMessages = await channel.messages.fetch({ limit: Math.min(count + 50, 100) });
            
            if (targetUser) {
                fetchedMessages = fetchedMessages.filter(msg => msg.author.id === targetUser.id);
            }

            // Discord doesn't allow bulk deletion of messages older than 14 days
            const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
            const messagesToDelete = fetchedMessages.filter(msg => msg.createdTimestamp > twoWeeksAgo).first(count);

            if (messagesToDelete.length === 0) {
                return await interaction.editReply({
                    content: "❌ No messages found to delete (messages older than 14 days cannot be bulk deleted)."
                });
            }

            await channel.bulkDelete(messagesToDelete);

            const embed = new EmbedBuilder()
                .setColor(0xFF6B35)
                .setTitle("🗑️ Messages Purged")
                .addFields(
                    { name: "Channel", value: channel.toString(), inline: true },
                    { name: "Count", value: messagesToDelete.length.toString(), inline: true },
                    { name: "Moderator", value: interaction.member?.displayName || interaction.user.username, inline: true }
                )
                .setTimestamp();

            if (targetUser) {
                const targetMember = interaction.guild.members.cache.get(targetUser.id);
                embed.addFields({ name: "Target User", value: `${targetMember?.displayName || targetUser.username}`, inline: true });
            }

            await interaction.editReply({ embeds: [embed] });
            await this.logModAction("purgemsg", targetUser, interaction.user, "Message purge", { 
                channel: channel.name, 
                count: messagesToDelete.length,
                guild: interaction.guild
            });

        } catch (error) {
            this.log(`Error purging messages: ${error.message}`, "error");
            await interaction.editReply({
                content: "❌ Failed to purge messages. Check permissions and try again."
            });
        }
    }

    async handlePin(interaction) {
        const messageId = interaction.options.getString("message_id");
        const channel = interaction.options.getChannel("channel") || interaction.channel;

        try {
            if (!channel.isTextBased()) {
                return await interaction.reply({
                    content: "❌ Messages can only be pinned in text channels.",
                    ephemeral: true
                });
            }

            const message = await channel.messages.fetch(messageId);
            
            if (!message) {
                return await interaction.reply({
                    content: "❌ Message not found.",
                    ephemeral: true
                });
            }

            if (message.pinned) {
                return await interaction.reply({
                    content: "❌ Message is already pinned.",
                    ephemeral: true
                });
            }

            await message.pin();

            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle("📌 Message Pinned")
                .addFields(
                    { name: "Channel", value: channel.toString(), inline: true },
                    { name: "Message ID", value: messageId, inline: true },
                    { name: "Moderator", value: interaction.member?.displayName || interaction.user.username, inline: true },
                    { name: "Message Preview", value: message.content.substring(0, 100) + (message.content.length > 100 ? "..." : "") }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            await this.logModAction("pin", null, interaction.user, "Message pinned", { 
                channel: channel.name, 
                messageId 
            });

        } catch (error) {
            this.log(`Error pinning message: ${error.message}`, "error");
            await interaction.reply({
                content: "❌ Failed to pin message. Check permissions and message ID.",
                ephemeral: true
            });
        }
    }

    async handleUnpin(interaction) {
        const messageId = interaction.options.getString("message_id");
        const channel = interaction.options.getChannel("channel") || interaction.channel;

        try {
            if (!channel.isTextBased()) {
                return await interaction.reply({
                    content: "❌ Messages can only be unpinned in text channels.",
                    ephemeral: true
                });
            }

            const message = await channel.messages.fetch(messageId);
            
            if (!message) {
                return await interaction.reply({
                    content: "❌ Message not found.",
                    ephemeral: true
                });
            }

            if (!message.pinned) {
                return await interaction.reply({
                    content: "❌ Message is not pinned.",
                    ephemeral: true
                });
            }

            await message.unpin();

            const embed = new EmbedBuilder()
                .setColor(0xFF9500)
                .setTitle("📌 Message Unpinned")
                .addFields(
                    { name: "Channel", value: channel.toString(), inline: true },
                    { name: "Message ID", value: messageId, inline: true },
                    { name: "Moderator", value: interaction.member?.displayName || interaction.user.username, inline: true },
                    { name: "Message Preview", value: message.content.substring(0, 100) + (message.content.length > 100 ? "..." : "") }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            await this.logModAction("unpin", null, interaction.user, "Message unpinned", { 
                channel: channel.name, 
                messageId 
            });

        } catch (error) {
            this.log(`Error unpinning message: ${error.message}`, "error");
            await interaction.reply({
                content: "❌ Failed to unpin message. Check permissions and message ID.",
                ephemeral: true
            });
        }
    }

    async handleUserInfo(interaction) {
        try {
            const targetUser = interaction.options.getUser('user');
            const targetMember = interaction.guild.members.cache.get(targetUser.id);
            
            // Check for user exemptions
            if (targetMember && this.isUserExempt(targetMember)) {
                return await interaction.reply({
                    content: "❌ This user is exempt from moderation actions.",
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle(`👤 User Information`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addFields([
                    {
                        name: 'User Details',
                        value: [
                            `**Username:** ${targetUser.username}`,
                            `**Display Name:** ${targetUser.displayName || 'None'}`,
                            `**ID:** ${targetUser.id}`,
                            `**Created:** <t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>`,
                            `**Account Age:** <t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`
                        ].join('\n'),
                        inline: false
                    }
                ]);

            if (targetMember) {
                const roles = targetMember.roles.cache
                    .filter(role => role.id !== interaction.guild.id)
                    .sort((a, b) => b.position - a.position)
                    .map(role => role.toString())
                    .slice(0, 10);

                embed.addFields([
                    {
                        name: 'Server Details',
                        value: [
                            `**Nickname:** ${targetMember.nickname || 'None'}`,
                            `**Joined:** <t:${Math.floor(targetMember.joinedTimestamp / 1000)}:F>`,
                            `**Member Since:** <t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>`,
                            `**Highest Role:** ${targetMember.roles.highest.toString()}`,
                            `**Status:** ${targetMember.presence?.status || 'Offline'}`
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: `Roles (${targetMember.roles.cache.size - 1})`,
                        value: roles.length > 0 ? roles.join(' ') : 'No roles',
                        inline: false
                    }
                ]);

                // Add moderation flags
                const flags = [];
                if (targetMember.permissions.has('Administrator')) flags.push('🛡️ Administrator');
                if (targetMember.permissions.has('ModerateMembers')) flags.push('🔨 Can Moderate');
                if (targetMember.permissions.has('ManageMessages')) flags.push('📝 Can Manage Messages');
                if (targetMember.isCommunicationDisabled()) flags.push('🔇 Timed Out');
                
                if (flags.length > 0) {
                    embed.addFields([{
                        name: 'Permissions & Status',
                        value: flags.join('\n'),
                        inline: false
                    }]);
                }
            } else {
                embed.addFields([{
                    name: 'Server Details',
                    value: '❌ User is not a member of this server',
                    inline: false
                }]);
            }

            // Add moderation history
            const moderationHistory = this.getUserModerationHistory(targetUser.id);
            if (moderationHistory.length > 0) {
                const historyText = moderationHistory.slice(0, 5).map(record => {
                    const actionEmojis = {
                        timeout: "🔇", kick: "👢", ban: "🔨", unban: "✅", warn: "⚠️",
                        slowmode: "🐌", addrole: "➕", removerole: "➖", nickname: "📝",
                        purgemsg: "🗑️", pin: "📌", unpin: "📌"
                    };
                    const emoji = actionEmojis[record.action] || "🛡️";
                    const timeAgo = `<t:${Math.floor(record.timestamp / 1000)}:R>`;
                    const actionName = record.action.charAt(0).toUpperCase() + record.action.slice(1);
                    const moderatorName = record.moderator.displayName || record.moderator.tag;
                    return `${emoji} **${actionName}** by ${moderatorName} ${timeAgo}`;
                }).join('\n');

                embed.addFields([{
                    name: `🛡️ Recent Moderation History (${moderationHistory.length})`,
                    value: historyText,
                    inline: false
                }]);
            }

            embed.setFooter({ 
                text: `Requested by ${interaction.member?.displayName || interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            await this.logModAction("userinfo", targetUser, interaction.user, "User info requested");

        } catch (error) {
            this.log(`Error getting user info: ${error.message}`, "error");
            await interaction.reply({
                content: "❌ Failed to get user information.",
                ephemeral: true
            });
        }
    }

    async handleServerStats(interaction) {
        try {
            const guild = interaction.guild;
            const memberCount = guild.memberCount;
            const botCount = guild.members.cache.filter(member => member.user.bot).size;
            const humanCount = memberCount - botCount;
            
            // Get basic server stats
            const channelCount = guild.channels.cache.size;
            const roleCount = guild.roles.cache.size;
            const emojiCount = guild.emojis.cache.size;
            
            // Calculate server age
            const serverAge = Math.floor((Date.now() - guild.createdTimestamp) / (1000 * 60 * 60 * 24));
            
            // Get moderation stats (basic)
            const moderatorRoles = this.config.roles?.moderatorRoleIds || [];
            const moderatorCount = guild.members.cache.filter(member => 
                member.roles.cache.some(role => moderatorRoles.includes(role.id)) ||
                member.permissions.has('ModerateMembers')
            ).size;

            // Get online status counts
            const onlineMembers = guild.members.cache.filter(member => 
                member.presence?.status === 'online'
            ).size;
            const idleMembers = guild.members.cache.filter(member => 
                member.presence?.status === 'idle'
            ).size;
            const dndMembers = guild.members.cache.filter(member => 
                member.presence?.status === 'dnd'
            ).size;

            const embed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle(`📊 Server Statistics`)
                .setThumbnail(guild.iconURL({ dynamic: true }))
                .addFields([
                    {
                        name: '👥 Members',
                        value: [
                            `**Total:** ${memberCount.toLocaleString()}`,
                            `**Humans:** ${humanCount.toLocaleString()}`,
                            `**Bots:** ${botCount.toLocaleString()}`,
                            `**Moderators:** ${moderatorCount.toLocaleString()}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '📋 Server Info',
                        value: [
                            `**Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,
                            `**Age:** ${serverAge} days`,
                            `**Owner:** <@${guild.ownerId}>`,
                            `**Verification:** ${guild.verificationLevel}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '📊 Activity',
                        value: [
                            `**🟢 Online:** ${onlineMembers}`,
                            `**🟡 Idle:** ${idleMembers}`,
                            `**🔴 DND:** ${dndMembers}`,
                            `**⚫ Offline:** ${memberCount - onlineMembers - idleMembers - dndMembers}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '🏗️ Structure',
                        value: [
                            `**Channels:** ${channelCount}`,
                            `**Roles:** ${roleCount}`,
                            `**Emojis:** ${emojiCount}`,
                            `**Boost Level:** ${guild.premiumTier} (${guild.premiumSubscriptionCount || 0} boosts)`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '🛡️ Moderation',
                        value: [
                            `**Plugin:** ${this.config.enabled ? '✅ Enabled' : '❌ Disabled'}`,
                            `**Auto-Mod:** ${this.config.autoModeration?.enabled ? '✅ Enabled' : '❌ Disabled'}`,
                            `**Log Channel:** ${this.config.logging?.channelId ? '✅ Set' : '❌ Not Set'}`,
                            `**Actions:** ${Object.values(this.config.actions || {}).filter(Boolean).length}/14 enabled`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '📈 Features',
                        value: [
                            `**Features:** ${guild.features.length > 0 ? guild.features.slice(0, 3).map(f => f.replace(/_/g, ' ').toLowerCase()).join(', ') : 'None'}`,
                            `**Max Members:** ${guild.maximumMembers?.toLocaleString() || 'Unknown'}`,
                            `**Max Presence:** ${guild.maximumPresences?.toLocaleString() || 'Unknown'}`,
                            `**Explicit Filter:** ${guild.explicitContentFilter}`
                        ].join('\n'),
                        inline: true
                    }
                ])
                .setFooter({ 
                    text: `Requested by ${interaction.member?.displayName || interaction.user.username} • ID: ${guild.id}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            await this.logModAction("serverstats", null, interaction.user, "Server stats requested");

        } catch (error) {
            this.log(`Error getting server stats: ${error.message}`, "error");
            await interaction.reply({
                content: "❌ Failed to get server statistics.",
                ephemeral: true
            });
        }
    }

    async logModAction(action, targetUser, moderator, reason, extra = {}) {
        try {
            // Add to moderation history if there's a target user and it's not a utility command
            if (targetUser && !['userinfo', 'serverstats'].includes(action)) {
                this.addModerationRecord(targetUser.id, action, moderator, reason, extra, extra.guild);
            }

            if (!this.config.logging?.channelId) return;

            const actionEmojis = {
                timeout: "🔇",
                kick: "👢", 
                ban: "🔨",
                unban: "✅",
                warn: "⚠️",
                slowmode: "🐌",
                addrole: "➕",
                removerole: "➖",
                nickname: "📝",
                purgemsg: "🗑️",
                pin: "📌",
                unpin: "📌",
                userinfo: "👤",
                serverstats: "📊"
            };

            let logMessage = `${actionEmojis[action] || "🛡️"} **${action.toUpperCase()}**\n`;
            
            // Get target user display name
            let targetDisplayName = null;
            if (targetUser) {
                targetDisplayName = targetUser.username;
                if (extra.guild) {
                    const targetMember = extra.guild.members.cache.get(targetUser.id);
                    if (targetMember) {
                        targetDisplayName = targetMember.displayName || targetUser.username;
                    }
                }
                logMessage += `**Target:** ${targetDisplayName} (${targetUser.id})\n`;
            }
            
            // Get moderator display name
            let moderatorDisplayName = moderator.username;
            if (extra.guild) {
                const moderatorMember = extra.guild.members.cache.get(moderator.id);
                if (moderatorMember) {
                    moderatorDisplayName = moderatorMember.displayName || moderator.username;
                }
            }
            
            logMessage += `**Moderator:** ${moderatorDisplayName}\n`;
            logMessage += `**Reason:** ${reason}\n`;
            
            if (extra.duration) {
                logMessage += `**Duration:** ${extra.duration} minutes\n`;
            }
            if (extra.deleteMessages !== undefined) {
                logMessage += `**Messages Deleted:** ${extra.deleteMessages} days\n`;
            }
            if (extra.channel) {
                logMessage += `**Channel:** ${extra.channel}\n`;
            }
            if (extra.seconds !== undefined) {
                logMessage += `**Slowmode:** ${extra.seconds} seconds\n`;
            }
            if (extra.role) {
                logMessage += `**Role:** ${extra.role}\n`;
            }
            if (extra.oldNickname && extra.newNickname) {
                logMessage += `**Old Nickname:** ${extra.oldNickname}\n`;
                logMessage += `**New Nickname:** ${extra.newNickname}\n`;
            }
            if (extra.count !== undefined) {
                logMessage += `**Messages Deleted:** ${extra.count}\n`;
            }
            if (extra.messageId) {
                logMessage += `**Message ID:** ${extra.messageId}\n`;
            }
            
            logMessage += `**Time:** ${new Date().toLocaleString()}`;

            await this.logToDiscord(logMessage);
            this.log(`${action.toUpperCase()}: ${targetUser ? targetDisplayName : 'N/A'} by ${moderatorDisplayName} - ${reason}`);

        } catch (error) {
            this.log(`Failed to log moderation action: ${error.message}`, "error");
        }
    }

    async handleModerationTest(interaction) {
        try {
            // Check if user has moderator role
            if (!this.hasModeratorPermission(interaction.member)) {
                return await interaction.reply({
                    content: "❌ You don't have permission to use moderation commands.",
                    ephemeral: true
                });
            }

            await interaction.reply({
                content: "✅ Moderation plugin is working! You have moderator permissions.",
                ephemeral: true
            });

            // Log to Discord if configured
            if (this.config.logging?.channelId) {
                await this.logToDiscord(`🛡️ **Moderation Test**\n` +
                    `**User:** ${interaction.member?.displayName || interaction.user.username}\n` +
                    `**Time:** ${new Date().toLocaleString()}`);
            }

            this.log(`Moderation test executed by ${interaction.member?.displayName || interaction.user.username}`);

        } catch (error) {
            this.log(`Error in moderation test: ${error.message}`, "error");
            await interaction.reply({
                content: "❌ An error occurred while testing moderation functionality.",
                ephemeral: true
            });
        }
    }

    isActionEnabled(action) {
        // If actions configuration doesn't exist, default to enabled
        if (!this.config.actions) {
            return true;
        }

        // Check if the specific action is enabled (default to true if not specified)
        return this.config.actions[action] !== false;
    }

    isUserExempt(member) {
        if (!member || !this.config.exemptRoles || this.config.exemptRoles.length === 0) {
            return false;
        }

        // Check if user has any exempt roles
        return member.roles.cache.some(role => this.config.exemptRoles.includes(role.id));
    }

    isChannelExempt(channel) {
        if (!channel || !this.config.exemptChannels || this.config.exemptChannels.length === 0) {
            return false;
        }

        // Check if channel is in exempt list
        return this.config.exemptChannels.includes(channel.id);
    }

    hasModeratorPermission(member) {
        // Check if user has any of the configured moderator roles
        if (!this.config.roles?.moderatorRoleIds || this.config.roles.moderatorRoleIds.length === 0) {
            // If no moderator roles configured, fall back to Discord permissions
            return member.permissions.has(PermissionFlagsBits.ModerateMembers);
        }

        // Check if user has any of the configured moderator roles
        return this.config.roles.moderatorRoleIds.some(roleId => 
            member.roles.cache.has(roleId)
        );
    }

    async logToDiscord(message) {
        try {
            if (!this.config.logging?.channelId) return;

            const channel = await this.client.channels.fetch(this.config.logging.channelId);
            if (channel) {
                await channel.send(message);
            }
        } catch (error) {
            this.log(`Failed to log to Discord: ${error.message}`, "error");
        }
    }

    addModerationRecord(userId, action, moderator, reason, extra = {}, guild = null) {
        // Get target user display information
        let targetUserInfo = {
            id: userId,
            tag: userId, // fallback
            displayName: userId // fallback
        };

        if (guild) {
            const targetMember = guild.members.cache.get(userId);
            if (targetMember) {
                targetUserInfo = {
                    id: userId,
                    tag: targetMember.user.username,
                    displayName: targetMember.displayName || targetMember.user.username,
                    nickname: targetMember.nickname
                };
            }
        }

        // Get moderator display information
        let moderatorInfo = {
            id: moderator.id,
            tag: moderator.username,
            displayName: moderator.username
        };

        if (guild) {
            const moderatorMember = guild.members.cache.get(moderator.id);
            if (moderatorMember) {
                moderatorInfo = {
                    id: moderator.id,
                    tag: moderator.username,
                    displayName: moderatorMember.displayName || moderator.username,
                    nickname: moderatorMember.nickname
                };
            }
        }

        const record = {
            id: Date.now() + Math.random(), // Unique ID for each record
            userId,
            targetUser: targetUserInfo,
            action,
            moderator: moderatorInfo,
            reason,
            timestamp: Date.now(),
            ...extra
        };

        // Add to user-specific history
        if (!this.moderationHistory.has(userId)) {
            this.moderationHistory.set(userId, []);
        }

        const userHistory = this.moderationHistory.get(userId);
        userHistory.unshift(record); // Add to beginning of array (most recent first)
        
        // Keep only last 10 actions per user to prevent memory issues
        if (userHistory.length > 10) {
            userHistory.splice(10);
        }

        // Add to server-wide log
        this.serverModerationLog.unshift(record);
        
        // Keep only last 1000 actions server-wide to prevent memory issues
        if (this.serverModerationLog.length > 1000) {
            this.serverModerationLog.splice(1000);
        }
    }

    getUserModerationHistory(userId) {
        return this.moderationHistory.get(userId) || [];
    }

    getServerModerationLog(filters = {}) {
        let filteredLog = [...this.serverModerationLog];

        // Filter by user ID, username, or display name
        if (filters.userId) {
            filteredLog = filteredLog.filter(record => {
                // Check user ID
                if (record.userId === filters.userId) return true;
                
                // Check if targetUser info exists and matches display name or tag
                if (record.targetUser) {
                    const searchTerm = filters.userId.toLowerCase();
                    return record.targetUser.displayName?.toLowerCase().includes(searchTerm) ||
                           record.targetUser.tag?.toLowerCase().includes(searchTerm) ||
                           record.targetUser.nickname?.toLowerCase().includes(searchTerm);
                }
                
                return false;
            });
        }

        // Filter by action type
        if (filters.action) {
            filteredLog = filteredLog.filter(record => 
                record.action.toLowerCase().includes(filters.action.toLowerCase())
            );
        }

        // Filter by moderator
        if (filters.moderator) {
            filteredLog = filteredLog.filter(record => {
                const searchTerm = filters.moderator.toLowerCase();
                return record.moderator.tag?.toLowerCase().includes(searchTerm) ||
                       record.moderator.displayName?.toLowerCase().includes(searchTerm) ||
                       record.moderator.nickname?.toLowerCase().includes(searchTerm);
            });
        }

        // Filter by time range (last X hours)
        if (filters.hours) {
            const cutoff = Date.now() - (filters.hours * 60 * 60 * 1000);
            filteredLog = filteredLog.filter(record => record.timestamp > cutoff);
        }

        return filteredLog;
    }

    async reloadConfig(newConfig) {
        this.config = newConfig;
        this.log("Moderation plugin configuration reloaded");
    }
}

module.exports = ModerationPlugin;