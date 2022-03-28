import {roleMention} from '@discordjs/builders'
import {
    ButtonInteraction,
    Client,
    CommandInteraction,
    GuildMember, Interaction, InteractionReplyOptions, MessageEmbed, MessagePayload,
    Role,
    SelectMenuInteraction,
    Snowflake,
    TextChannel
} from 'discord.js';
import * as config from './config.json';
import Bot from "./modules/Bot";
import Ticket from "./modules/Ticket";
import Student from "./modules/Student";

export const bot = new Bot();

bot.login(config.token).then(async () => {
    await bot.init();
});

bot.on('ready', async () => {
    await setPresence(bot);
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

bot.on('messageCreate', async message => {
    if (message.channelId == config.channels.verify) {
        if (message.author.id != bot.user.id) {
            let embed = new MessageEmbed()
                .setDescription("Only slash commands are permitted in this channel.\n" +
                    "Please refer to [Discord - Slash Commands FAQ](https://support.discord.com/hc/en-us/articles/1500000368501-Slash-Commands-FAQ)" +
                    " if further instruction is needed."
                )
            let response = await message.reply({embeds: [embed]});
            setTimeout(async () => {
                try {
                    await response.delete();
                    await message.delete();
                } catch (e) {}
            }, 5000);
        }
    }
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
 * @param interaction
 */
async function receiveButton(interaction: ButtonInteraction) {
    let id = interaction.customId;
    try {
        if (id === 'close_ticket') await Ticket.close(interaction.channelId);
        else {
            let role = await interaction.guild.roles.fetch(id);
            let guildMember = interaction.member as GuildMember;
            await interaction.reply(await enhancedRoleRequest(role, guildMember, interaction));
        }
        await bot.logger.info(`${interaction.component.label} button used by ${interaction.user.username}`);
    } catch (error) {
        await bot.logger.error(`${interaction.component.label} button used by ${interaction.user.username} failed`, error);
    }
}

/**
 * Executes logic on a SelectMenu Interaction
 * @param interaction
 */
async function receiveSelectMenu(interaction: SelectMenuInteraction) {
    let role = await bot.guild.roles.fetch(interaction.values[0]);
    let guildMember = interaction.member as GuildMember;
    try {
        await interaction.reply(await enhancedRoleRequest(role, guildMember, interaction));
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
async function enhancedRoleRequest(role: Role, guildMember: GuildMember, interaction: ButtonInteraction | SelectMenuInteraction): Promise<InteractionReplyOptions> {
    let response;
    let memberHasRole = await hasRole(role.id, guildMember);
    let student = await Student.get(guildMember.id);

    switch (role.name) {
        case "Coach": case "Captain": case "Player":
            if (memberHasRole) response = {content: "You already have this role.", ephemeral: true}
            else if (student) {
                let ticket = await Ticket.open(student, role.name);
                response = {content: `A ticket has been opened in <#${ticket.id}>`, ephemeral: true}
            } else response = {content: `You must verify yourself as a student first. <#${config.channels.verify}>`, ephemeral: true}
            break;

        case "Purdue":
            if (student) {
                response = {content: "You are verified!", ephemeral: true}
                await addRole(config.roles.purdue, guildMember);
                await removeRole(config.roles["non-purdue"], guildMember);
            } else response = {content: "Please follow the instructions above to verify yourself.", ephemeral: true}
            break;

        case "Non-Purdue":
            if (memberHasRole) {
                response = {content: "You have removed the role **Non-Purdue** from yourself.", ephemeral: true}
                await removeRole(config.roles["non-purdue"], guildMember);
            } else {
                if (student) {
                    response = {content: "Purdue students cannot apply the Non-Purdue role.", ephemeral: true}
                } else {
                    response = {content: "You have applied the role **Non-Purdue** to yourself.", ephemeral: true}
                    await addRole(config.roles["non-purdue"], guildMember);
                }
            }
            break;

        default:
            if (memberHasRole) {
                response = {content: `You have removed the role **${roleMention(role.id)}** from yourself.`, ephemeral: true}
                await removeRole(role.id, guildMember);
            } else {
                response = {content: `You applied the role **${roleMention(role.id)}** to yourself.`, ephemeral: true}
                await addRole(role.id, guildMember);
            }
    }
    return response;
}

/**
 * Sets game status for Bot Client
 * @param client
 */
async function setPresence(client: Client) {
    let user;
    let activity;

    user = client.user;
    activity = {
        name: 'GRIT™',
        type: 'PLAYING'
    }

    user.setActivity(activity);
}

/**
 * Adds a Role to a GuildMember
 * @param id
 * @param guildMember
 */
async function addRole(id: string, guildMember: GuildMember) {
    await guildMember.roles.add(id);
}

/**
 * Removes a Role from a GuildMember
 * @param id
 * @param guildMember
 */
async function removeRole(id: string, guildMember: GuildMember) {
    await guildMember.roles.remove(id);
}

/**
 * Determines whether a GuildMember has a certain Role
 * @param id
 * @param guildMember
 */
async function hasRole(id: string, guildMember: GuildMember) {
    let result = false;
    let roles = guildMember.roles.cache;

    roles.forEach(role => {
        if (role.id === id) result = true;
    })
    return result;
}