const Plugin = require('../../core/Plugin');
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

class VerificationPlugin extends Plugin {
    constructor(client, config) {
        super(client, config);
        this.deniedUsers = new Set();
        this.flatConfig = this.flattenConfig(config);
    }

    flattenConfig(config) {
        // Flatten nested config structure for easier access
        const flat = { ...config };
        
        if (config.channels) {
            Object.assign(flat, config.channels);
        }
        if (config.roles) {
            Object.assign(flat, config.roles);
        }
        if (config.messages) {
            Object.assign(flat, config.messages);
        }
        if (config.settings) {
            Object.assign(flat, config.settings);
        }
        
        return flat;
    }

    async load() {
        this.validateConfig();
        this.registerVerifyCommand();
        this.setupEventHandlers();
        this.log('Verification plugin loaded');
    }

    validateConfig() {
        const requiredFields = [
            'verifyChannelId',
            'verifyCommandChannelId',
            'verifiedRoleId',
            'verifierRoleIds'
        ];

        const missingFields = [];
        for (const field of requiredFields) {
            if (!this.flatConfig[field]) {
                missingFields.push(field);
            }
        }

        if (missingFields.length > 0) {
            this.log(`WARNING: Missing required configuration fields: ${missingFields.join(', ')}`, 'warn');
            this.log('The plugin will load but some features may not work properly.', 'warn');
        }

        if (this.flatConfig.verifierRoleIds && !Array.isArray(this.flatConfig.verifierRoleIds)) {
            this.log('WARNING: verifierRoleIds should be an array', 'warn');
        }

        // Validate screenshot count
        const screenshotCount = this.flatConfig.screenshotCount;
        if (screenshotCount !== undefined && (screenshotCount < 0 || screenshotCount > 2)) {
            this.log('WARNING: screenshotCount should be 0, 1, or 2. Defaulting to 0.', 'warn');
        }

        // Log configuration summary
        this.log(`Configuration: screenshots=${screenshotCount || 0}, character=${this.flatConfig.requireCharacterName}, guild=${this.flatConfig.requireGuildName}`, 'info');
    }

    async unload() {
        this.log('Verification plugin unloaded');
    }

    registerVerifyCommand() {
        const commandBuilder = new SlashCommandBuilder()
            .setName('verify')
            .setDescription('Verify your account');

        // Add character name option if required
        if (this.flatConfig.requireCharacterName) {
            commandBuilder.addStringOption(option =>
                option.setName('character')
                    .setDescription('Your in-game character name')
                    .setRequired(true));
        }

        // Add guild name option if required
        if (this.flatConfig.requireGuildName) {
            commandBuilder.addStringOption(option =>
                option.setName('guild')
                    .setDescription('Your in-game guild name')
                    .setRequired(true));
        }

        // Add screenshot options based on count setting
        const screenshotCount = this.flatConfig.screenshotCount || 0;
        
        if (screenshotCount >= 1) {
            commandBuilder.addAttachmentOption(option =>
                option.setName('screenshot1')
                    .setDescription('First verification screenshot')
                    .setRequired(true));
        }

        if (screenshotCount >= 2) {
            commandBuilder.addAttachmentOption(option =>
                option.setName('screenshot2')
                    .setDescription('Second verification screenshot')
                    .setRequired(true));
        }

        const command = {
            data: commandBuilder,
            execute: async (interaction) => this.handleVerifyCommand(interaction)
        };

        this.registerCommand(command);
    }

    setupEventHandlers() {
        this.client.on('messageCreate', (message) => this.handleMessageCreate(message));
        this.client.on('interactionCreate', (interaction) => this.handleInteractionCreate(interaction));
    }

    async handleVerifyCommand(interaction) {
        try {
            await interaction.deferReply({ flags: 64 }); // 64 = EPHEMERAL

            if (!this.flatConfig.verifiedRoleId) {
                return await interaction.editReply({
                    content: 'Verification system is not properly configured. Please contact an administrator.'
                });
            }

            const hasRole = interaction.member.roles.cache.has(this.flatConfig.verifiedRoleId);
            if (hasRole) {
                return await interaction.editReply({
                    content: 'You are already verified! No need to submit again.'
                });
            }

            // Remove user from denied list when they resubmit
            if (this.deniedUsers.has(interaction.user.id)) {
                this.deniedUsers.delete(interaction.user.id);
                this.log(`Removed ${interaction.user.tag} from denied users list - allowing resubmission`, 'debug');
            }

            // Get character and guild names if required
            const characterName = this.flatConfig.requireCharacterName ? 
                interaction.options.getString('character') : 'Not provided';
            const guildName = this.flatConfig.requireGuildName ? 
                interaction.options.getString('guild') : 'Not provided';

            // Get screenshots based on configuration
            const screenshotCount = this.flatConfig.screenshotCount || 0;
            const screenshots = [];
            
            if (screenshotCount >= 1) {
                const screenshot1 = interaction.options.getAttachment('screenshot1');
                if (screenshot1) screenshots.push(screenshot1);
            }
            
            if (screenshotCount >= 2) {
                const screenshot2 = interaction.options.getAttachment('screenshot2');
                if (screenshot2) screenshots.push(screenshot2);
            }

            // Validate screenshot formats if any are provided
            if (screenshots.length > 0) {
                const validFormats = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
                const isValidFormat = (attachment) => {
                    const extension = attachment.name.split('.').pop().toLowerCase();
                    return validFormats.includes(extension);
                };

                const invalidScreenshots = screenshots.filter(screenshot => !isValidFormat(screenshot));
                if (invalidScreenshots.length > 0) {
                    return await interaction.editReply({
                        content: 'Please upload valid image files (PNG, JPG, GIF, or WebP format).'
                    });
                }
            }

            if (!this.flatConfig.verifyChannelId) {
                this.log('verifyChannelId is not configured', 'error');
                return await interaction.editReply({
                    content: 'Verification channel is not configured. Please contact an administrator.'
                });
            }

            const verifyChannel = await this.client.channels.fetch(this.flatConfig.verifyChannelId).catch(error => {
                this.log(`Failed to fetch verification channel ${this.flatConfig.verifyChannelId}: ${error.message}`, 'error');
                return null;
            });

            if (!verifyChannel) {
                return await interaction.editReply({
                    content: 'Unable to access verification channel. Please contact an administrator.'
                });
            }
            
            // Create embeds based on screenshots
            const embeds = [];
            
            // Main embed with user info and first screenshot (if any)
            const mainEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(screenshots.length > 0 ? 'Verification Request - Screenshot 1' : 'Verification Request')
                .addFields(
                    { name: 'User', value: `${interaction.user} (${interaction.user.tag})`, inline: true }
                )
                .setTimestamp();

            // Add character name field if configured
            if (this.flatConfig.requireCharacterName) {
                mainEmbed.addFields({ name: 'Character Name', value: characterName, inline: true });
            }

            // Add guild name field if configured
            if (this.flatConfig.requireGuildName) {
                mainEmbed.addFields({ name: 'Guild', value: guildName, inline: true });
            }

            // Add first screenshot if provided
            if (screenshots.length >= 1) {
                mainEmbed.setImage(screenshots[0].url);
            }

            embeds.push(mainEmbed);

            // Add second screenshot embed if provided
            if (screenshots.length >= 2) {
                const secondEmbed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle('Verification Request - Screenshot 2')
                    .setImage(screenshots[1].url);
                embeds.push(secondEmbed);
            }

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`verify_approve_${interaction.user.id}`)
                        .setLabel('Approve')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`verify_deny_${interaction.user.id}`)
                        .setLabel('Deny')
                        .setStyle(ButtonStyle.Danger)
                );

            await verifyChannel.send({
                embeds: embeds,
                components: [row]
            });

            await interaction.editReply({
                content: 'Your verification request has been submitted! You will receive a DM when it has been reviewed.'
            });

            const logDetails = [];
            if (this.flatConfig.requireCharacterName) logDetails.push(`Character: ${characterName}`);
            if (this.flatConfig.requireGuildName) logDetails.push(`Guild: ${guildName}`);
            logDetails.push(`Screenshots: ${screenshots.length}`);
            
            this.log(`Verification request submitted by ${interaction.user.tag} (${interaction.user.id}) - ${logDetails.join(', ')}`, 'debug');

        } catch (error) {
            this.log(`Error in verify command: ${error}`, 'error');
            await interaction.editReply({
                content: 'An error occurred while processing your verification request. Please try again later.'
            });
        }
    }

    async handleMessageCreate(message) {
        if (message.author.bot) return;
        if (!this.flatConfig.verifyCommandChannelId || message.channel.id !== this.flatConfig.verifyCommandChannelId) return;

        await message.delete().catch(() => {});
        
        const verifyCommand = this.client.application?.commands.cache.find(cmd => cmd.name === 'verify');
        const howToVerifyText = this.flatConfig.howToVerifyID ? ` Check <#${this.flatConfig.howToVerifyID}> for instructions.` : '';
        
        const reply = await message.channel.send({
            content: `${message.author}, please use the </verify:${verifyCommand?.id || '1'}> command to submit your verification request.${howToVerifyText}`,
            allowedMentions: { users: [message.author.id] }
        });

        setTimeout(() => reply.delete().catch(() => {}), 10000);
    }

    async handleInteractionCreate(interaction) {
        if (!interaction.isButton()) return;
        if (!interaction.customId.startsWith('verify_')) return;

        const [, action, userId] = interaction.customId.split('_');
        
        const isVerifier = interaction.member.roles.cache.some(role => 
            this.flatConfig.verifierRoleIds.includes(role.id)
        );

        if (!isVerifier) {
            return await interaction.reply({
                content: 'You do not have permission to handle verification requests.',
                flags: 64
            });
        }

        if (action === 'approve') {
            await this.handleApproval(interaction, userId);
        } else if (action === 'deny') {
            await this.handleDenial(interaction, userId);
        }
    }

    async handleApproval(interaction, userId) {
        try {
            if (this.deniedUsers.has(userId)) {
                return await interaction.reply({
                    content: 'This user was previously denied and must resubmit their verification request before they can be approved.',
                    flags: 64
                });
            }

            const member = await interaction.guild.members.fetch(userId);
            const characterNameField = interaction.message.embeds[0].fields.find(f => f.name === 'Character Name');
            const characterName = characterNameField ? characterNameField.value : null;

            await member.roles.add(this.flatConfig.verifiedRoleId);
            
            // Only attempt nickname update if character name is required and provided
            if (this.flatConfig.requireCharacterName && characterName && characterName !== 'Not provided') {
                try {
                    await member.setNickname(characterName);
                    this.log(`📝 Updated nickname for ${member.user.tag} to "${characterName}"`);
                } catch (nicknameError) {
                    this.log(`❌ Failed to update nickname for ${member.user.tag} to "${characterName}": ${nicknameError.message}`);
                }
            } else if (this.flatConfig.requireCharacterName) {
                this.log(`⚠️ Could not extract character name for ${member.user.tag} - nickname not updated`);
            } else {
                this.log(`ℹ️ Character name not required for ${member.user.tag} - nickname not updated`);
            }

            // Create approval status embed while preserving original content
            const approvalEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ APPROVED')
                .setDescription(`Approved by ${interaction.user}`)
                .setTimestamp();

            // Preserve original embeds and add approval status
            const originalEmbeds = [...interaction.message.embeds];
            const allEmbeds = [...originalEmbeds, approvalEmbed];

            await interaction.message.edit({
                embeds: allEmbeds,
                components: [] // Remove buttons only
            });

            try {
                await member.send(this.flatConfig.approvalMessage);
                this.log(`✅ Approval DM sent to ${member.user.tag}`);
            } catch (error) {
                this.log(`⚠️ Failed to send approval DM to ${member.user.tag}: ${error.message}`);
                await interaction.channel.send({
                    content: `Could not DM ${member}. They have been verified but should be notified manually.`,
                    allowedMentions: { users: [] }
                });
            }


            const logMessage = `✅ ${interaction.user.tag} verified ${member.user.tag} at ${new Date().toLocaleString()}`;
            this.log(logMessage);
            
            // Send same message to Discord
            if (this.flatConfig.logChannelId) {
                this.client.channels.fetch(this.flatConfig.logChannelId)
                    .then(channel => channel.send(logMessage))
                    .catch(() => {});
            }

        } catch (error) {
            this.log(`Error in approval: ${error}`, 'error');
            await interaction.reply({
                content: 'An error occurred while approving the verification.',
                flags: 64
            });
        }
    }

    async handleDenial(interaction, userId) {
        await interaction.showModal({
            title: 'Deny Verification',
            customId: `verify_deny_modal_${userId}`,
            components: [
                {
                    type: 1,
                    components: [{
                        type: 4,
                        customId: 'reason',
                        label: 'Reason for denial',
                        style: 1,
                        min_length: 10,
                        max_length: 500,
                        placeholder: 'Please provide a detailed reason for denying this verification...',
                        required: true
                    }]
                }
            ]
        });

        const modalSubmit = await interaction.awaitModalSubmit({
            time: 300000,
            filter: i => i.customId === `verify_deny_modal_${userId}`
        }).catch(() => null);

        if (!modalSubmit) return;

        const reason = modalSubmit.fields.getTextInputValue('reason');
        this.deniedUsers.add(userId);

        // Create denial status embed while preserving original content
        const denialEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ DENIED')
            .setDescription(`Denied by ${interaction.user}`)
            .addFields({ name: 'Reason', value: reason })
            .setTimestamp();

        // Preserve original embeds and add denial status
        const originalEmbeds = [...modalSubmit.message.embeds];
        const allEmbeds = [...originalEmbeds, denialEmbed];

        await modalSubmit.message.edit({
            embeds: allEmbeds,
            components: [] // Remove buttons only
        });

        let member;
        try {
            member = await interaction.guild.members.fetch(userId);
            const denialDM = `${this.flatConfig.denialMessagePrefix}\nReason: ${reason}`;
            await member.user.send(denialDM);
            this.log(`✅ Denial DM sent to ${member.user.tag} with reason: ${reason}`);
        } catch (error) {
            this.log(`⚠️ Failed to send denial DM to ${member ? member.user.tag : userId}: ${error.message}`);
            
            // Send DM failure to Discord for moderator awareness
            if (this.flatConfig.logChannelId) {
                this.client.channels.fetch(this.flatConfig.logChannelId)
                    .then(channel => channel.send(`⚠️ Failed to send denial DM to <@${userId}> - user may have DMs disabled. Reason was: ${reason}`))
                    .catch(() => {});
            }
            
            await modalSubmit.channel.send({
                content: `Could not DM <@${userId}>. They should be notified of the denial manually.`,
                allowedMentions: { users: [] }
            });
        }

        await modalSubmit.reply({
            content: 'Verification denied successfully.',
            flags: 64
        });

        this.log(`❌ ${interaction.user.tag} denied verification for ${member ? member.user.tag : userId}. Reason: ${reason}`);
        
        // Send to Discord with mentions
        if (this.flatConfig.logChannelId) {
            this.client.channels.fetch(this.flatConfig.logChannelId)
                .then(channel => channel.send(`❌ <@${interaction.user.id}> denied verification for <@${userId}>. Reason: ${reason}`))
                .catch(() => {});
        }
    }

    log(message, type = 'info') {
        // Call parent log method for console output
        super.log(message, type);
        
        // Log to bot's main log file if available
        if (this.botLog) {
            // Always log to file, except for debug messages when debug mode is disabled
            if (type === 'debug' && !this.flatConfig.debugMode) {
                return; // Don't log debug messages to file when debug mode is off
            }
            
            this.botLog(`[VERIFICATION] ${message}`, type);
        }
    }
}

module.exports = VerificationPlugin;