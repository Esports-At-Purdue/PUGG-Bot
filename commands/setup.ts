import {
    CommandInteraction,
    MessageActionRow,
    MessageButton,
    MessageEmbed,
    MessageSelectMenu,
    Permissions
} from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'
import * as config from '../config.json';
import {bot} from "../index";

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
                .addChoice('genres', 'genre_menu')
        ),

    permissions: [
        {
            id: config.roles.president,
            type: 'ROLE',
            permission: true
        },
        {
            id: config.roles.pugg_officer,
            type: 'ROLE',
            permission: true
        },
        {
            id: config.roles.esports_officer,
            type: 'ROLE',
            permission: true
        },
        {
            id: config.roles.casual_officer,
            type: 'ROLE',
            permission: true
        }
    ],

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
    }
}

function buildVerificationMenu(interaction) {
    let embed = new MessageEmbed()
        .setTitle("Server Roles Menu")
        .setColor("#f1c40f")
        .setDescription("Indicate your affiliation with Purdue. The Purdue role requires email verification. You must apply either the Purdue role or Non-Purdue role in order to access public channels.");

    let row = new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setCustomId(config.roles.purdue)
                .setLabel('Purdue')
                .setStyle('PRIMARY'),
            new MessageButton()
                .setCustomId(config.roles["non-purdue"])
                .setLabel('Non-Purdue')
                .setStyle('SECONDARY'),
        );
    interaction.reply({ embeds: [embed] , components: [row] });
}

function buildEsportsMenu(interaction) {
    let embed = new MessageEmbed()
        .setTitle("Purdue Esports Roles Menu")
        .setColor("#f1c40f")
        .setDescription("If you play on a competitive esports team for Purdue, select any of the positions to open a request ticket. If multiple positions apply to you, communicate that in your ticket.");

    let row = new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setCustomId(config.roles.coach)
                .setLabel('Coach')
                .setStyle('PRIMARY'),
            new MessageButton()
                .setCustomId(config.roles.captain)
                .setLabel('Captain')
                .setStyle('PRIMARY'),
            new MessageButton()
                .setCustomId(config.roles.player)
                .setLabel('Player')
                .setStyle('PRIMARY')
        );

    interaction.reply({ embeds: [embed] , components: [row] });
}

async function buildGamesMenu(interaction) {
    let rows;
    let embed;

    rows = await buildGamesRows();
    embed = new MessageEmbed()
        .setTitle("Game Selection Menu")
        .setColor("#f1c40f")
        .setDescription("Select any game to apply the role to yourself!");

    interaction.reply({ embeds: [embed], components: rows });
}

async function buildPlatformsMenu(interaction) {
    let embed = new MessageEmbed()
        .setTitle("Platform Button Menu")
        .setColor("#f1c40f")
        .setDescription("Select any of the platforms you game on!");

    let row = new MessageActionRow();

    for (const role of config.platform_roles) {
        let emoji_guild = await bot.guilds.fetch(config.emote_guild);
        let emoji = await emoji_guild.emojis.fetch(role["emote_id"]);
        row.addComponents(
            new MessageButton()
                .setCustomId(`${role.id}`)
                .setLabel(`${role.name}`)
                .setStyle('SECONDARY')
                .setEmoji(emoji)
        )
    }

    interaction.reply({embeds: [embed], components: [row]});
}

async function buildGenresMenu(interaction) {
    let embed = new MessageEmbed()
        .setTitle("Genres Button Menu")
        .setColor("#f1c40f")
        .setDescription("Select any of the game genres that you enjoy!");

    let row = new MessageActionRow();

    for (const role of config.genre_roles) {
        let emoji_guild = await bot.guilds.fetch(config.emote_guild);
        let emoji = await emoji_guild.emojis.fetch(role["emote_id"]);
        row.addComponents(
            new MessageButton()
                .setCustomId(`${role.id}`)
                .setLabel(`${role.name}`)
                .setStyle('SECONDARY')
                .setEmoji(emoji)
        )
    }

    interaction.reply({ embeds: [embed] , components: [row] });
}

async function buildGamesRows() {
    let rows = [];
    let games = sortGames(config.game_roles);
    for (let i = 0; i < Math.ceil(games.length / 25); i++) {
        let actionRow = new MessageActionRow()
        let selectMenu = new MessageSelectMenu()
            .setCustomId(`select_${i}`)
            .setPlaceholder('Select your favorite games!');

        for (let j = i * 25; j < (i * 25) + 25; j++) {
            if (games[j] !== undefined) {
                let emoji_guild = await bot.guilds.fetch(config.emote_guild);
                let emoji = await emoji_guild.emojis.fetch(games[j]["emote_id"]);
                selectMenu.addOptions([
                    {
                        label: `${games[j]["name"]}`,
                        value: `${games[j]["id"]}`,
                        emoji: emoji
                    }
                ]);
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