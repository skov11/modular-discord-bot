const Plugin = require('../../core/Plugin');
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

class VerificationPlugin extends Plugin {
    constructor(client, config) {
        super(client, config);
        this.deniedUsers = new Set();
        this.logFile = path.join(__dirname, 'verification_logs.txt');
    }

    async load() {
        this.registerVerifyCommand();
        this.setupEventHandlers();
        this.log('Verification plugin loaded');
    }

    async unload() {
        this.log('Verification plugin unloaded');
    }

    registerVerifyCommand() {
        const command = {
            data: new SlashCommandBuilder()
                .setName('verify')
                .setDescription('Verify your account with screenshots')
                .addStringOption(option =>
                    option.setName('character')
                        .setDescription('Your in-game character name')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('guild')
                        .setDescription('Your in-game guild name')
                        .setRequired(true))
                .addAttachmentOption(option =>
                    option.setName('screenshot1')
                        .setDescription('First verification screenshot')
                        .setRequired(true))
                .addAttachmentOption(option =>
                    option.setName('screenshot2')
                        .setDescription('Second verification screenshot')
                        .setRequired(true)),
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
            await interaction.deferReply({ ephemeral: true });

            const hasRole = interaction.member.roles.cache.has(this.config.atreidesRoleId);
            if (hasRole) {
                return await interaction.editReply({
                    content: 'You are already verified! No need to submit again.',
                    ephemeral: true
                });
            }

            const characterName = interaction.options.getString('character');
            const guildName = interaction.options.getString('guild');
            const screenshot1 = interaction.options.getAttachment('screenshot1');
            const screenshot2 = interaction.options.getAttachment('screenshot2');

            const validFormats = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
            const isValidFormat = (attachment) => {
                const extension = attachment.name.split('.').pop().toLowerCase();
                return validFormats.includes(extension);
            };

            if (!isValidFormat(screenshot1) || !isValidFormat(screenshot2)) {
                return await interaction.editReply({
                    content: 'Please upload valid image files (PNG, JPG, GIF, or WebP format).',
                    ephemeral: true
                });
            }

            const verifyChannel = await this.client.channels.fetch(this.config.verifyChannelId);
            
            const embed1 = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('Verification Request - Screenshot 1')
                .addFields(
                    { name: 'User', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                    { name: 'Character Name', value: characterName, inline: true },
                    { name: 'Guild', value: guildName, inline: true }
                )
                .setImage(screenshot1.url)
                .setTimestamp();

            const embed2 = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('Verification Request - Screenshot 2')
                .setImage(screenshot2.url);

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
                content: `<@&${this.config.verifierRoleIds.join('> <@&')}> New verification request:`,
                embeds: [embed1, embed2],
                components: [row]
            });

            await interaction.editReply({
                content: 'Your verification request has been submitted! You will receive a DM when it has been reviewed.',
                ephemeral: true
            });

            this.logToFile(`Verification request submitted by ${interaction.user.tag} (${interaction.user.id}) - Character: ${characterName}, Guild: ${guildName}`);

        } catch (error) {
            this.log(`Error in verify command: ${error}`, 'error');
            await interaction.editReply({
                content: 'An error occurred while processing your verification request. Please try again later.',
                ephemeral: true
            });
        }
    }

    async handleMessageCreate(message) {
        if (message.author.bot) return;
        if (message.channel.id !== this.config.verifyCommandChannelId) return;

        await message.delete().catch(() => {});
        
        const reply = await message.channel.send({
            content: `${message.author}, please use the </verify:${this.client.application.commands.cache.find(cmd => cmd.name === 'verify')?.id || '1'}> command to submit your verification request. Check <#${this.config.howToVerifyID}> for instructions.`,
            allowedMentions: { users: [message.author.id] }
        });

        setTimeout(() => reply.delete().catch(() => {}), 10000);
    }

    async handleInteractionCreate(interaction) {
        if (!interaction.isButton()) return;
        if (!interaction.customId.startsWith('verify_')) return;

        const [, action, userId] = interaction.customId.split('_');
        
        const isVerifier = interaction.member.roles.cache.some(role => 
            this.config.verifierRoleIds.includes(role.id)
        );

        if (!isVerifier) {
            return await interaction.reply({
                content: 'You do not have permission to handle verification requests.',
                ephemeral: true
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
                    ephemeral: true
                });
            }

            const member = await interaction.guild.members.fetch(userId);
            const characterName = interaction.message.embeds[0].fields.find(f => f.name === 'Character Name')?.value;

            await member.roles.add(this.config.atreidesRoleId);
            
            if (characterName) {
                await member.setNickname(characterName).catch(() => {
                    this.log(`Could not change nickname for ${member.user.tag}`, 'warn');
                });
            }

            const approvalEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('Verification Approved')
                .setDescription(`Approved by ${interaction.user}`)
                .setTimestamp();

            await interaction.message.edit({
                embeds: [approvalEmbed],
                components: []
            });

            try {
                await member.send(this.config.approvalMessage);
            } catch (error) {
                await interaction.channel.send({
                    content: `Could not DM ${member}. They have been verified but should be notified manually.`,
                    allowedMentions: { users: [] }
                });
            }

            await interaction.reply({
                content: `Successfully verified ${member}!`,
                ephemeral: true
            });

            this.logToFile(`Verification approved for ${member.user.tag} (${userId}) by ${interaction.user.tag}`);

        } catch (error) {
            this.log(`Error in approval: ${error}`, 'error');
            await interaction.reply({
                content: 'An error occurred while approving the verification.',
                ephemeral: true
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

        const denialEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('Verification Denied')
            .setDescription(`Denied by ${interaction.user}`)
            .addFields({ name: 'Reason', value: reason })
            .setTimestamp();

        await modalSubmit.message.edit({
            embeds: [denialEmbed],
            components: []
        });

        try {
            const member = await interaction.guild.members.fetch(userId);
            await member.send(`${this.config.denialMessagePrefix}\n\n**Reason:** ${reason}`);
        } catch (error) {
            await modalSubmit.channel.send({
                content: `Could not DM <@${userId}>. They should be notified of the denial manually.`,
                allowedMentions: { users: [] }
            });
        }

        await modalSubmit.reply({
            content: 'Verification denied successfully.',
            ephemeral: true
        });

        this.logToFile(`Verification denied for user ${userId} by ${interaction.user.tag}. Reason: ${reason}`);
    }

    logToFile(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}\n`;
        fs.appendFileSync(this.logFile, logMessage);
        
        if (this.config.logChannelId) {
            this.client.channels.fetch(this.config.logChannelId)
                .then(channel => channel.send(`\`\`\`${message}\`\`\``))
                .catch(() => {});
        }
    }
}

module.exports = VerificationPlugin;