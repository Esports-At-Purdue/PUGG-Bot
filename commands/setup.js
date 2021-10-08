"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const builders_1 = require("@discordjs/builders");
const roles_json_1 = require("../jsons/roles.json");
module.exports = {
    data: new builders_1.SlashCommandBuilder()
        .setName('setup')
        .setDescription('Creates a various-purpose menu.')
        .addStringOption(option => option
        .setName('menu_name')
        .setDescription('The name of the menu to setup')
        .setRequired(true)
        .addChoice('verification', 'verification_menu')
        .addChoice('esports', 'esports_menu')
        .addChoice('games', 'games_menu')
        .addChoice('platforms', 'platform_menu')
        .addChoice('genres', 'genre_menu')),
    execute(interaction) {
        return __awaiter(this, void 0, void 0, function* () {
            let menu_name = interaction.options.getString('menu_name');
            let guild = interaction.guild;
            let user = interaction.user;
            guild.members.fetch(user).then(guildMember => {
                // @ts-ignore
                let hasManageMessages = guildMember.permissions.has(discord_js_1.Permissions.FLAGS.MANAGE_MESSAGES);
                if (hasManageMessages) {
                    switch (menu_name) {
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
                            interaction.reply({ content: 'Sorry, the specified menu does not exist', ephemeral: true });
                    }
                }
                else {
                    interaction.reply({ content: 'Sorry, you do not have permission to do this!', ephemeral: true });
                }
            });
        });
    }
};
function buildVerificationMenu(interaction) {
    let embed = new discord_js_1.MessageEmbed()
        .setTitle("Server Roles Menu")
        .setDescription("Indicate your affiliation with Purdue. The Purdue role requires email verification. You must apply either the Purdue role or Non-Purdue role in order to access public channels.");
    let row = new discord_js_1.MessageActionRow()
        .addComponents(new discord_js_1.MessageButton()
        .setCustomId(roles_json_1.server_roles["purdue"]["id"])
        .setLabel('Purdue')
        .setStyle('PRIMARY'), new discord_js_1.MessageButton()
        .setCustomId(roles_json_1.server_roles["non_purdue"]["id"])
        .setLabel('Non-Purdue')
        .setStyle('SECONDARY'));
    interaction.reply({ embeds: [embed], components: [row] });
}
function buildEsportsMenu(interaction) {
    let embed = new discord_js_1.MessageEmbed()
        .setTitle("Esports Roles Menu")
        .setDescription("Purdue Esport Players, select any of the roles to request verification. If multiple apply to you, communicate that in your ticket.");
    let row = new discord_js_1.MessageActionRow()
        .addComponents(new discord_js_1.MessageButton()
        .setCustomId(roles_json_1.esports_roles["coach"]["id"])
        .setLabel('Coach')
        .setStyle('PRIMARY'), new discord_js_1.MessageButton()
        .setCustomId(roles_json_1.esports_roles["captain"]["id"])
        .setLabel('Captain')
        .setStyle('PRIMARY'), new discord_js_1.MessageButton()
        .setCustomId(roles_json_1.esports_roles["player"]["id"])
        .setLabel('Player')
        .setStyle('PRIMARY'));
    interaction.reply({ embeds: [embed], components: [row] });
}
function buildGamesMenu(interaction) {
    let rows;
    let games;
    let embed;
    rows = [];
    games = sortGames(roles_json_1.game_roles);
    embed = new discord_js_1.MessageEmbed()
        .setTitle("Game Selection Menu")
        .setDescription("Select any game to apply the role to yourself!");
    for (let i = 0; i < Math.ceil(games.length / 25); i++) {
        let actionRow = new discord_js_1.MessageActionRow();
        let selectMenu = new discord_js_1.MessageSelectMenu()
            .setCustomId(`games_${i}`)
            .setPlaceholder('Select Games');
        for (let j = i * 25; j < (i * 25) + 25; j++) {
            if (games[j] !== undefined) {
                selectMenu.addOptions([
                    {
                        label: `${games[j]["name"]}`,
                        value: `${games[j]["id"]}`
                    }
                ]);
            }
        }
        actionRow.addComponents(selectMenu);
        rows.push(actionRow);
    }
    interaction.reply({ embeds: [embed], components: rows });
}
function buildPlatformsMenu(interaction) {
    let embed = new discord_js_1.MessageEmbed()
        .setTitle("Platform Button Menu")
        .setDescription("Select any of the platforms you game on!");
    let row = new discord_js_1.MessageActionRow();
    roles_json_1.platform_roles.forEach(role => {
        row.addComponents(new discord_js_1.MessageButton()
            .setCustomId(`${role.id}`)
            .setLabel(`${role.name}`)
            .setStyle('SECONDARY'));
    });
    interaction.reply({ embeds: [embed], components: [row] });
}
function buildGenresMenu(interaction) {
    let embed = new discord_js_1.MessageEmbed()
        .setTitle("Genres Button Menu")
        .setDescription("Select any of the game genres that you enjoy!");
    let row = new discord_js_1.MessageActionRow();
    roles_json_1.genre_roles.forEach(role => {
        row.addComponents(new discord_js_1.MessageButton()
            .setCustomId(`${role.id}`)
            .setLabel(`${role.name}`)
            .setStyle('SECONDARY'));
    });
    interaction.reply({ embeds: [embed], components: [row] });
}
exports.buildGamesMenu = buildGamesMenu;
function sortGames(array) {
    array.sort(function (a, b) {
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
