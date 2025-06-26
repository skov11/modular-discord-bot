const Plugin = require('../../core/Plugin');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

class ExamplePlugin extends Plugin {
    constructor(client, config) {
        super(client, config);
    }

    async load() {
        this.registerCommands();
        this.setupEventHandlers();
        this.log('Example plugin loaded');
    }

    async unload() {
        this.log('Example plugin unloaded');
    }

    registerCommands() {
        const pingCommand = {
            data: new SlashCommandBuilder()
                .setName('ping')
                .setDescription('Replies with Pong!'),
            execute: async (interaction) => {
                const latency = Date.now() - interaction.createdTimestamp;
                await interaction.reply(`Pong! Latency: ${latency}ms`);
            }
        };

        const infoCommand = {
            data: new SlashCommandBuilder()
                .setName('info')
                .setDescription('Shows bot information'),
            execute: async (interaction) => {
                const embed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle('Bot Information')
                    .addFields(
                        { name: 'Bot Name', value: this.client.user.tag, inline: true },
                        { name: 'Server Count', value: `${this.client.guilds.cache.size}`, inline: true },
                        { name: 'Plugin', value: this.name, inline: true }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            }
        };

        this.registerCommand(pingCommand);
        this.registerCommand(infoCommand);
    }

    setupEventHandlers() {
        this.client.on('guildMemberAdd', (member) => {
            if (this.config.welcomeChannelId) {
                const channel = member.guild.channels.cache.get(this.config.welcomeChannelId);
                if (channel) {
                    channel.send(`Welcome to the server, ${member}!`);
                }
            }
        });
    }
}

module.exports = ExamplePlugin;