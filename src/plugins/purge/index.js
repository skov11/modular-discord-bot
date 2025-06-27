const Plugin = require("../../core/Plugin");
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const cron = require("node-cron");

class PurgePlugin extends Plugin {
    constructor(client, config) {
        super(client, config);
        this.scheduledJobs = new Map();
    }

    async load() {
        this.log("Loading Purge Plugin...");

        // Register purge command
        const purgeCommand = {
            data: new SlashCommandBuilder()
                .setName("purge")
                .setDescription("Purge messages from a channel")
                .addIntegerOption(option =>
                    option
                        .setName("count")
                        .setDescription("Number of messages to delete (1-100, or 0 for all)")
                        .setRequired(true)
                        .setMinValue(0)
                        .setMaxValue(100)
                )
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("Channel to purge (defaults to current channel)")
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option
                        .setName("reason")
                        .setDescription("Reason for purging messages")
                        .setRequired(false)
                )
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
            execute: async (interaction) => {
                await this.handlePurgeCommand(interaction);
            }
        };

        this.registerCommand(purgeCommand);

        // Schedule auto-purge jobs
        this.scheduleAutoPurgeJobs();

        this.log("Purge Plugin loaded successfully");
    }

    async unload() {
        this.log("Unloading Purge Plugin...");
        
        // Cancel all scheduled jobs
        for (const [jobId, job] of this.scheduledJobs) {
            job.destroy();
            this.log(`Cancelled scheduled purge job: ${jobId}`);
        }
        this.scheduledJobs.clear();

        this.log("Purge Plugin unloaded");
    }

    async handlePurgeCommand(interaction) {
        try {
            const count = interaction.options.getInteger("count");
            const targetChannel = interaction.options.getChannel("channel") || interaction.channel;
            const reason = interaction.options.getString("reason") || "Manual purge command";

            // Check permissions
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                return await interaction.reply({
                    content: "❌ You don't have permission to manage messages.",
                    ephemeral: true
                });
            }

            // Check bot permissions
            if (!targetChannel.permissionsFor(this.client.user).has(PermissionFlagsBits.ManageMessages)) {
                return await interaction.reply({
                    content: "❌ I don't have permission to manage messages in that channel.",
                    ephemeral: true
                });
            }

            await interaction.deferReply({ ephemeral: true });

            let deletedCount = 0;

            if (count === 0) {
                // Purge all messages
                deletedCount = await this.purgeAllMessages(targetChannel, reason);
            } else {
                // Purge specific count
                deletedCount = await this.purgeMessages(targetChannel, count, reason);
            }

            await interaction.editReply({
                content: `✅ Successfully deleted ${deletedCount} message(s) from ${targetChannel}.`
            });

            // Log the action
            this.log(`Manual purge: ${deletedCount} messages deleted from ${targetChannel.name} by ${interaction.user.tag}. Reason: ${reason}`);

            // Log to Discord if configured
            if (this.config.logging?.channelId) {
                await this.logToDiscord(`🗑️ **Manual Purge**\n` +
                    `**Channel:** ${targetChannel}\n` +
                    `**Messages Deleted:** ${deletedCount}\n` +
                    `**Moderator:** ${interaction.user}\n` +
                    `**Reason:** ${reason}`);
            }

        } catch (error) {
            this.log(`Error in purge command: ${error.message}`, "error");
            
            if (interaction.deferred) {
                await interaction.editReply({
                    content: "❌ An error occurred while purging messages."
                });
            } else {
                await interaction.reply({
                    content: "❌ An error occurred while purging messages.",
                    ephemeral: true
                });
            }
        }
    }

    async purgeMessages(channel, count, reason) {
        let deletedCount = 0;
        let remaining = count;

        while (remaining > 0) {
            const batchSize = Math.min(remaining, 100);
            const messages = await channel.messages.fetch({ limit: batchSize });
            
            if (messages.size === 0) break;

            // Separate messages by age (Discord API limitation: can't bulk delete messages older than 14 days)
            const now = Date.now();
            const twoWeeksAgo = now - (14 * 24 * 60 * 60 * 1000);
            
            const recentMessages = messages.filter(msg => msg.createdTimestamp > twoWeeksAgo);
            const oldMessages = messages.filter(msg => msg.createdTimestamp <= twoWeeksAgo);

            // Bulk delete recent messages
            if (recentMessages.size > 0) {
                await channel.bulkDelete(recentMessages, true);
                deletedCount += recentMessages.size;
            }

            // Delete old messages individually
            for (const message of oldMessages.values()) {
                try {
                    await message.delete();
                    deletedCount++;
                    // Add delay to avoid rate limits
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    this.log(`Failed to delete old message: ${error.message}`, "error");
                }
            }

            remaining -= messages.size;
            
            // Avoid rate limits
            if (remaining > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        return deletedCount;
    }

    async purgeAllMessages(channel, reason) {
        let totalDeleted = 0;
        let hasMoreMessages = true;

        while (hasMoreMessages) {
            const messages = await channel.messages.fetch({ limit: 100 });
            
            if (messages.size === 0) {
                hasMoreMessages = false;
                break;
            }

            // Separate messages by age
            const now = Date.now();
            const twoWeeksAgo = now - (14 * 24 * 60 * 60 * 1000);
            
            const recentMessages = messages.filter(msg => msg.createdTimestamp > twoWeeksAgo);
            const oldMessages = messages.filter(msg => msg.createdTimestamp <= twoWeeksAgo);

            // Bulk delete recent messages
            if (recentMessages.size > 0) {
                await channel.bulkDelete(recentMessages, true);
                totalDeleted += recentMessages.size;
            }

            // Delete old messages individually
            for (const message of oldMessages.values()) {
                try {
                    await message.delete();
                    totalDeleted++;
                    // Add delay to avoid rate limits
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    this.log(`Failed to delete old message: ${error.message}`, "error");
                }
            }

            // If we only had old messages and deleted them all, check for more
            if (recentMessages.size === 0 && oldMessages.size < 100) {
                hasMoreMessages = false;
            }

            // Avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        return totalDeleted;
    }

    scheduleAutoPurgeJobs() {
        if (!this.config.autoPurge?.enabled || !this.config.autoPurge.schedules) {
            return;
        }

        this.config.autoPurge.schedules.forEach((schedule, index) => {
            if (!schedule.enabled) return;

            try {
                const jobId = `autopurge-${index}`;
                
                // Convert timezone if specified
                const options = {};
                if (schedule.timezone) {
                    options.timezone = schedule.timezone;
                }

                const job = cron.schedule(schedule.cron, async () => {
                    await this.executeAutoPurge(schedule);
                }, {
                    ...options,
                    scheduled: true
                });

                this.scheduledJobs.set(jobId, job);
                this.log(`Scheduled auto-purge job: ${jobId} with cron: ${schedule.cron}${schedule.timezone ? ` (${schedule.timezone})` : ''}`);
                
            } catch (error) {
                this.log(`Failed to schedule auto-purge job ${index}: ${error.message}`, "error");
            }
        });
    }

    async executeAutoPurge(schedule) {
        try {
            // Support both old single channel format and new multi-channel format
            const channelIds = schedule.channelIds || (schedule.channelId ? [schedule.channelId] : []);
            
            if (channelIds.length === 0) {
                this.log(`Auto-purge failed: No channels specified for schedule ${schedule.name}`, "error");
                return;
            }

            let totalDeletedCount = 0;
            const channelResults = [];

            for (const channelId of channelIds) {
                try {
                    const channel = await this.client.channels.fetch(channelId);
                    if (!channel) {
                        this.log(`Auto-purge failed: Channel ${channelId} not found`, "error");
                        channelResults.push({ channelId, name: 'Unknown', deletedCount: 0, error: 'Channel not found' });
                        continue;
                    }

                    // Check bot permissions
                    if (!channel.permissionsFor(this.client.user).has(PermissionFlagsBits.ManageMessages)) {
                        this.log(`Auto-purge failed: No permission to manage messages in ${channel.name}`, "error");
                        channelResults.push({ channelId, name: channel.name, deletedCount: 0, error: 'No permission' });
                        continue;
                    }

                    let deletedCount = 0;

                    if (schedule.messageCount === 0) {
                        // Purge all messages
                        deletedCount = await this.purgeAllMessages(channel, `Auto-purge: ${schedule.name || 'Scheduled cleanup'}`);
                    } else {
                        // Purge specific count
                        deletedCount = await this.purgeMessages(channel, schedule.messageCount, `Auto-purge: ${schedule.name || 'Scheduled cleanup'}`);
                    }

                    totalDeletedCount += deletedCount;
                    channelResults.push({ channelId, name: channel.name, deletedCount, error: null });
                    
                    this.log(`Auto-purge completed for ${channel.name}: ${deletedCount} messages deleted. Schedule: ${schedule.name || 'Unnamed'}`);

                    // Add small delay between channels to avoid rate limits
                    if (channelIds.length > 1) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }

                } catch (error) {
                    this.log(`Auto-purge failed for channel ${channelId}: ${error.message}`, "error");
                    channelResults.push({ channelId, name: 'Unknown', deletedCount: 0, error: error.message });
                }
            }

            this.log(`Auto-purge schedule '${schedule.name || 'Unnamed'}' completed: ${totalDeletedCount} total messages deleted across ${channelResults.length} channels`);

            // Log to Discord if configured
            if (this.config.logging?.channelId) {
                const successfulChannels = channelResults.filter(r => !r.error);
                const failedChannels = channelResults.filter(r => r.error);
                
                let logMessage = `🕐 **Auto-Purge Completed**\n` +
                    `**Schedule:** ${schedule.name || 'Unnamed'}\n` +
                    `**Total Messages Deleted:** ${totalDeletedCount}\n` +
                    `**Time:** ${new Date().toLocaleString()}\n\n`;

                if (successfulChannels.length > 0) {
                    logMessage += `**Successful Channels:**\n`;
                    successfulChannels.forEach(channel => {
                        logMessage += `• #${channel.name}: ${channel.deletedCount} messages\n`;
                    });
                }

                if (failedChannels.length > 0) {
                    logMessage += `\n**Failed Channels:**\n`;
                    failedChannels.forEach(channel => {
                        logMessage += `• ${channel.name}: ${channel.error}\n`;
                    });
                }

                await this.logToDiscord(logMessage);
            }

        } catch (error) {
            this.log(`Auto-purge execution failed: ${error.message}`, "error");
        }
    }

    async logToDiscord(message) {
        try {
            if (!this.config.logging?.channelId) return;
            
            const logChannel = await this.client.channels.fetch(this.config.logging.channelId);
            if (logChannel) {
                await logChannel.send(message);
            }
        } catch (error) {
            this.log(`Failed to log to Discord: ${error.message}`, "error");
        }
    }

    async reloadConfig(newConfig) {
        this.config = newConfig;
        
        // Cancel existing jobs
        for (const [jobId, job] of this.scheduledJobs) {
            job.destroy();
        }
        this.scheduledJobs.clear();

        // Reschedule with new config
        this.scheduleAutoPurgeJobs();
        
        this.log("Purge plugin configuration reloaded");
    }
}

module.exports = PurgePlugin;