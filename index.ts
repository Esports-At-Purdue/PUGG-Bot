import {roleMention} from '@discordjs/builders'
import {
    ButtonInteraction,
    Client,
    CommandInteraction,
    GuildMember,
    Role,
    SelectMenuInteraction,
    Snowflake,
    TextChannel
} from 'discord.js';
import * as config from './config.json';
import {synchronize} from './modules/Database';
import {tryToCloseEsportsTicket, tryToOpenEsportsTicket} from "./modules/Ticket";
import Bot from "./modules/Bot";
import {logger} from "sequelize/types/lib/utils/logger";

export const bot = new Bot();

bot.login(config.token).then(async () => {
    await bot.init();
});

bot.on('ready', async () => {
    await setRichPresence(bot);
    await synchronize();
    global.setInterval(async () => {
        bot.guild = await bot.guilds.fetch(config.guild);
    }, 600000)
});

bot.on('interactionCreate', async interaction => {
        //Sort Interactions
        if (interaction.isButton()) await receiveButton(interaction);
        if (interaction.isSelectMenu()) await receiveSelectMenu(interaction);
        if (interaction.isCommand()) await receiveCommand(interaction);
});

bot.on('guildMemberAdd', async guildMember => {
    const channel = await bot.guild.channels.fetch(config.channels.join_channel) as TextChannel;
    await channel.send({content: `${guildMember.user} has joined. Index: ${bot.guild.memberCount}`});
});

bot.on('guildMemberRemove', async guildMember => {
    const channel = await bot.guild.channels.fetch(config.channels.leave_channel) as TextChannel;
    await channel.send({content: `**${guildMember.user.username}** has left.`})
})

/**
 * Executes logic on a Command Interaction
 * @param interaction
 */
async function receiveCommand(interaction: CommandInteraction) {
    try {
        const command = bot.commands.get(interaction.commandName);
        await command.execute(interaction);
        await bot.logger.info(`${interaction.commandName} command issued by ${interaction.user.username}`);
    } catch (error) {
        await bot.logger.error(`${interaction.commandName} command issued by ${interaction.user.username} failed`, error);
        await interaction.reply({content: "There was an error running this command.", ephemeral: true});
    }
}

/**
 * Executes logic on a Button Interaction
 * @param button
 */
async function receiveButton(button: ButtonInteraction) {
    let id = button.customId;

    try {
        if (id === 'close_ticket') await tryToCloseEsportsTicket(button);
        else {
            let role = await button.guild.roles.fetch(id);
            let guildMember = button.member as GuildMember;
            let response = await requestRole(role, guildMember, button);
            response ? await button.reply({content: response, ephemeral: true}) : 0;
        }
        await bot.logger.info(`${button.component.label} button used by ${button.user.username}`);
    } catch (error) {
        await bot.logger.error(`${button.component.label} button used by ${button.user.username} failed`, error);
    }
}

/**
 * Executes logic on a SelectMenu Interaction
 * @param interaction
 */
async function receiveSelectMenu(interaction: SelectMenuInteraction) {
    let roleId = interaction.values[0] as Snowflake;
    let guildMember = interaction.member as GuildMember;
    let hasRole = await checkIfMemberHasRole(roleId, guildMember);

    try {
        if (!hasRole) {
            await addRoleToMember(roleId, guildMember);
            await interaction.reply({content: `You successfully applied the role **${roleMention(roleId)}** to yourself.`, ephemeral: true});
        } else {
            await removeRoleFromMember(roleId, guildMember);
            await interaction.reply({content: `You successfully removed the role **${roleMention(roleId)}** from yourself.`, ephemeral: true});
        }
        await bot.logger.info(`Select Menu option ${interaction.component.options[0].label} selected by ${interaction.user.username}`);
    } catch (error) {
        await bot.logger.error(`Select Menu option ${interaction.component.options[0].label} selected by ${interaction.user.username} failed`, error);
    }
}

/**
 * Executes logic for managing various roles from a ButtonInteraction
 * @param role
 * @param guildMember
 * @param interaction
 */
async function requestRole(role: Role, guildMember: GuildMember, interaction: ButtonInteraction) {
    let hasRole = await checkIfMemberHasRole(role.id, guildMember);
    let hasPurdueRole = await checkIfMemberHasRole(config.roles.purdue, guildMember);

    switch (role.name) {
        case 'Coach':
        case 'Captain':
        case 'Player':
            if (hasRole) return ("You already have this role.");
            if (hasPurdueRole) await tryToOpenEsportsTicket(guildMember, role, interaction);
            else return ("Pleaser verify yourself with **/verify** first.");
            break;

        case 'Purdue':
            if (hasRole) return "You already have this role.";
            else return `Use the command **/verify** in any channel to verify your purdue email and receive the Purdue role.`;

        case 'Non-Purdue':
            if (hasRole) {
                await removeRoleFromMember(role.id, guildMember);
                return `You successfully removed the role **${roleMention(role.id)}** from yourself.`;
            } else {
                if (hasPurdueRole) return "You cannot receive this role because you already have the role 'Purdue'.";
                else {
                    await addRoleToMember(role.id, guildMember);
                    return `You successfully applied the role **${roleMention(role.id)}** to yourself.`;
                }
            }

        default:
            if (!hasRole) {
                await addRoleToMember(role.id, guildMember);
                return `You successfully applied the role **${roleMention(role.id)}** to yourself.`;
            } else {
                await removeRoleFromMember(role.id, guildMember);
                return`You successfully removed the role **${roleMention(role.id)}** from yourself.`;
            }
    }
}

/**
 * Sets game status for Bot Client
 * @param bot
 */
async function setRichPresence(bot: Client) {
    let user;
    let activity;

    user = bot.user;
    activity = {
        name: 'GRIT™',
        type: 'PLAYING'
    }

    user.setActivity(activity);
}

/**
 * Adds a Role to a GuildMember
 * @param snowflake
 * @param guildMember
 */
async function addRoleToMember(snowflake: Snowflake, guildMember: GuildMember) {
    await guildMember.roles.add(snowflake);
}

/**
 * Removes a Role from a GuildMember
 * @param snowflake
 * @param guildMember
 */
async function removeRoleFromMember(snowflake: Snowflake, guildMember: GuildMember) {
    await guildMember.roles.remove(snowflake);
}

/**
 * Determines whether a GuildMember has a certain Role
 * @param snowflake
 * @param guildMember
 */
async function checkIfMemberHasRole(snowflake: Snowflake, guildMember: GuildMember) {
    let result = false;
    let roles = guildMember.roles.cache;

    roles.forEach(role => {
        if (role.id === snowflake) result = true;
    })
    return result;
}