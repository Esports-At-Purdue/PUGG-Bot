import {
    CommandInteraction,
    MessageActionRow,
    MessageButton,
    MessageEmbed,
    MessageSelectMenu
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
            .addChoice('welcome', 'welcome_menu')
        ),

    permissions: [
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
        switch(menu_name) {
            case 'verification_menu': await buildVerificationMenu(interaction);
                break;
            case 'esports_menu': await buildEsportsMenu(interaction);
                break;
            case 'games_menu': await buildGamesMenu(interaction);
                break;
            case 'platform_menu': await buildPlatformsMenu(interaction);
                break;
            case 'genre_menu': await buildGenresMenu(interaction);
                break;
            case 'welcome_menu': await buildWelcomeMenu(interaction);
                break;
            default: await interaction.reply({content: 'Sorry, the specified menu does not exist', ephemeral: true});
        }
        await interaction.reply({content: "Your menu has been generated!", ephemeral: true});
    }
}

async function buildVerificationMenu(interaction) {
    let embed = new MessageEmbed()
        .setTitle("Purdue Affiliation Menu")
        .setColor("#f1c40f")
        .setDescription("Indicate your affiliation with Purdue. The Purdue role requires email verification.\n\n" +
            "**How to authenticate yourself as a Purdue Student!**\n" +
            "1. Use `/verify start` to have a one-time code sent to your email.\n" +
            "2. Use `/verify complete` with your one-time code.\n");

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
    await interaction.channel.send({embeds: [embed], components: [row]});
}

async function buildEsportsMenu(interaction) {
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

    await interaction.channel.send({embeds: [embed], components: [row]});
}

async function buildGamesMenu(interaction) {
    let rows;
    let embed;

    rows = await buildGamesRows();
    embed = new MessageEmbed()
        .setTitle("Game Selection Menu")
        .setColor("#f1c40f")
        .setDescription("Select any game to apply the role to yourself!");

    await interaction.channel.send({ embeds: [embed], components: rows });
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

    await interaction.channel.send({embeds: [embed], components: [row]});
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

    await interaction.channel.send({ embeds: [embed] , components: [row] });
}

async function buildWelcomeMenu(interaction) {
    let row
    let embed;

    embed = new MessageEmbed()
        .setTitle("Welcome to PUGG!")
        .setColor("#f1c40f")
        .setDescription(
            "Thanks for joining the Purdue University Gamers Group discord server!\n" +
            "\n" +
            "To view the full server, click the button below to get the <@&224771028679655426> role. You will only see announcements until you do this.\n" +
            "\n" +
            "Esports roles as well as individual game roles can be found in <#887080782668136478>. To gain access to the verified Purdue-only channels, head over to <#887084374217072670>.\n" +
            "\n" +
            "Thanks again for checking us out, and if you have any questions, just find the relevant text channel! "
        );

    row = new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setCustomId(config.roles.pugger)
                .setLabel('Become A PUGGer')
                .setStyle('PRIMARY')
        )
    await interaction.channel.send({embeds: [embed], components: [row]});
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