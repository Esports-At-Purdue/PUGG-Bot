import {
    Client,
    CommandInteraction,
    MessageActionRow,
    MessageButton,
    MessageEmbed,
    MessageSelectMenu,
    Permissions, Snowflake
} from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'
import { game_roles, platform_roles, genre_roles, server_roles, esports_roles, officer_roles }from '../jsons/roles.json'
import {guild_id} from '../config.json';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Creates a various-purpose menu.')
        .setDefaultPermission(false)
        .addStringOption(option => option
                .setName('menu_name')
                .setDescription('The name of the menu to setup')
                .setRequired(true)
                .addChoice('verification', 'verification_menu')
                .addChoice('esports', 'esports_menu')
                .addChoice('games', 'games_menu')
                .addChoice('platforms', 'platform_menu')
                .addChoice('genres', 'genre_menu')),
    async execute(interaction: CommandInteraction) {
        let menu_name = interaction.options.getString('menu_name');
        let guild = interaction.guild;
        let user = interaction.user;
        guild.members.fetch(user).then(guildMember => {
            let hasManageMessages = guildMember.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES);
            if (hasManageMessages) {
                switch(menu_name) {
                    case 'verification_menu':
                        return buildVerificationMenu(interaction);
                    case 'esports_menu':
                        return buildEsportsMenu(interaction);
                    case 'games_menu':
                        return buildGamesMenu(interaction);
                    case 'platform_menu':
                        return buildPlatformsMenu(interaction);
                    case 'genre_menu':
                        return buildGenresMenu(interaction);
                    default:
                        interaction.reply({content: 'Sorry, the specified menu does not exist', ephemeral: true});
                }
            } else {
                interaction.reply({content: 'Sorry, you do not have permission to do this!', ephemeral: true});
            }
        })
    },
    async setPermissions(client: Client, commandId: Snowflake) {
        let guild = await client.guilds.fetch(guild_id);
        let commandPermissionsManager = guild.commands.permissions;

        for (let role in officer_roles) {
            await commandPermissionsManager.add({
                command: commandId, permissions: [
                    {
                        id: officer_roles[role].id,
                        type: 'ROLE',
                        permission: true
                    },
                ]
            })
        }
    }
}

function buildVerificationMenu(interaction) {
    let embed = new MessageEmbed()
        .setTitle("Server Roles Menu")
        .setDescription("Indicate your affiliation with Purdue. The Purdue role requires email verification. You must apply either the Purdue role or Non-Purdue role in order to access public channels.");

    let row = new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setCustomId(server_roles["purdue"]["id"])
                .setLabel('Purdue')
                .setStyle('PRIMARY'),
            new MessageButton()
                .setCustomId(server_roles["non_purdue"]["id"])
                .setLabel('Non-Purdue')
                .setStyle('SECONDARY'),
        );
    interaction.reply({ embeds: [embed] , components: [row] });
}

function buildEsportsMenu(interaction) {
    let embed = new MessageEmbed()
        .setTitle("Esports Roles Menu")
        .setDescription("If you play on a competitive esports team for Purdue, select any of the positions to open a request ticket. If multiple positions apply to you, communicate that in your ticket.");

    let row = new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setCustomId(esports_roles["coach"]["id"])
                .setLabel('Coach')
                .setStyle('PRIMARY'),
            new MessageButton()
                .setCustomId(esports_roles["captain"]["id"])
                .setLabel('Captain')
                .setStyle('PRIMARY'),
            new MessageButton()
                .setCustomId(esports_roles["player"]["id"])
                .setLabel('Player')
                .setStyle('PRIMARY')
        );

    interaction.reply({ embeds: [embed] , components: [row] });
}

function buildGamesMenu(interaction) {
    let rows;
    let embed;

    rows = buildGamesRows();
    embed = new MessageEmbed()
        .setTitle("Game Selection Menu")
        .setDescription("Select any game to apply the role to yourself!");

    interaction.reply({ embeds: [embed], components: rows });
}

function buildPlatformsMenu(interaction) {
    let embed = new MessageEmbed()
        .setTitle("Platform Button Menu")
        .setDescription("Select any of the platforms you game on!");

    let row = new MessageActionRow()
    platform_roles.forEach(role => {
        row.addComponents(
            new MessageButton()
                .setCustomId(`${role.id}`)
                .setLabel(`${role.name}`)
                .setStyle('SECONDARY')
        );
    })

    interaction.reply({ embeds: [embed] , components: [row] });
}

function buildGenresMenu(interaction) {
    let embed = new MessageEmbed()
        .setTitle("Genres Button Menu")
        .setDescription("Select any of the game genres that you enjoy!");

    let row = new MessageActionRow()

    genre_roles.forEach(role => {
        row.addComponents(
            new MessageButton()
                .setCustomId(`${role.id}`)
                .setLabel(`${role.name}`)
                .setStyle('SECONDARY')
        )
    })
    interaction.reply({ embeds: [embed] , components: [row] });
}

function buildGamesRows() {
    let rows = [];
    let games = sortGames(game_roles);
    for (let i = 0; i < Math.ceil(games.length / 25); i++) {
        let actionRow = new MessageActionRow()
        let selectMenu = new MessageSelectMenu()
            .setCustomId(`games_${i}`)
            .setPlaceholder('Select Games');

        for (let j = i * 25; j < (i * 25) + 25; j++) {
            if (games[j] !== undefined) {
                selectMenu.addOptions([
                    {
                        label: `${games[j]["name"]}`,
                        value: `${games[j]["id"]}`
                    }
                ])
            }
        }
        actionRow.addComponents(selectMenu);
        rows.push(actionRow);
    }

    return rows;
}

function sortGames(array) {
    array.sort(function(a,b) {
        let name1 = a.name.toLowerCase();
        let name2 = b.name.toLowerCase();
        if (name1 < name2) {
            return -1;
        }
        if (name2 < name1) {
            return 1;
        }
        return 0;
    });
    return array;
}