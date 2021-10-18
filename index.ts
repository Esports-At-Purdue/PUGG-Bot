import * as fs from 'fs';
import * as readline from 'readline';
import {REST} from '@discordjs/rest';
import {Routes} from 'discord-api-types/v9';
import {channelMention, roleMention, userMention} from '@discordjs/builders'
import {
    Client, Intents,
    Collection, Snowflake,
    ButtonInteraction,
    CommandInteraction,
    SelectMenuInteraction,
    GuildMember, Role, ApplicationCommand, MessageEmbed, Guild, TextChannel
} from 'discord.js';
import {token, guild_id, client_id, log_channel_id} from './config.json';
import {server_roles} from './jsons/roles.json';
import {synchronize} from './modules/Database';
import {Log, LogType} from './modules/Log';
import {tryToCloseEsportsTicket, tryToOpenEsportsTicket} from "./modules/Ticket";

const client = new Client({
    intents:
        [
            Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS,
            Intents.FLAGS.GUILD_BANS, Intents.FLAGS.GUILD_MESSAGES,
            Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.DIRECT_MESSAGES,
            Intents.FLAGS.DIRECT_MESSAGE_REACTIONS
        ]
});

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const rest = new REST({ version: '9' }).setToken(token);
client["commands"] = new Collection();

client.on('ready', async () => {
    await setRichPresence(client);
    await sendLogToDiscord(new Log(LogType.RESTART, 'Bot has been Restarted!'));
    await synchronize();
});

client.login(token).then(async () => {
    let commands = [];

    //Collect and Register Commands
    await collectAndSetCommandFiles(commands, commandFiles);
    await registerClientCommands(commands);

    //Readline
    await listenForStopCommand();
});

client.on('interactionCreate', async interaction => {
    try {
        //Sort Interactions
        if (interaction.isButton()) await receiveButton(interaction);
        if (interaction.isSelectMenu()) await receiveSelectMenu(interaction);
        if (interaction.isCommand()) await receiveCommand(interaction);
        await sendLogToDiscord(new Log(LogType.INTERACTION, `Successful ${interaction.type}`));
    } catch(error) {
        await sendLogToDiscord(new Log(LogType.ERROR, `${interaction.type}: ${error}\n
        Channel: ${channelMention(interaction.channelId)}\n
        User: ${userMention(interaction.user.id)}`));
    }
    /*
    if (interaction.isButton()) await receiveButton(interaction);
    if (interaction.isSelectMenu()) await receiveSelectMenu(interaction);
    if (interaction.isCommand()) await receiveCommand(interaction);
    await sendLogToDiscord(new Log(LogType.INTERACTION, `Successful ${interaction.type}`));
     */
});

/**
 * Takes data from commands files (./commands/**) and set's them as client's commands
 * @param commands
 * @param commandFiles
 */
async function collectAndSetCommandFiles(commands, commandFiles) {
    for (let commandFile of commandFiles) {
        let command = require(`./commands/${commandFile}`);
        commands.push(command.data.toJSON());
        await client["commands"].set(command.data.name, command);
    }
}

/**
 * Takes commands and registers them with Discord Restful API, then sets their permissions
 * @param commands
 */
async function registerClientCommands(commands) {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(client_id, guild_id),
            {body: commands},
        );

        let guildCommands = await rest.get(Routes.applicationGuildCommands(client_id, guild_id)) as Array <ApplicationCommand>;

        for (let guildCommand of guildCommands) {
            let command = client["commands"].get(guildCommand.name);
            await command.setPermissions(client, guildCommand.id);
        }

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
}

/**
 * Executes logic on a Command Interaction
 * @param interaction
 */
async function receiveCommand(interaction: CommandInteraction) {
    const command = client["commands"].get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        await sendLogToDiscord(new Log(LogType.ERROR, error));
    }
}

/**
 * Executes logic on a Button Interaction
 * @param interaction
 */
async function receiveButton(interaction: ButtonInteraction) {
    let id = interaction.customId;

    if (id === 'close_ticket') await tryToCloseEsportsTicket(interaction);
    else {
        let role = await interaction.guild.roles.fetch(id);
        let guildMember = interaction.member as GuildMember;
        let response = await requestRole(role, guildMember, interaction);
        response ? await interaction.reply({content: response, ephemeral: true}) : 0;
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

    if (!hasRole) {
        await addRoleToMember(roleId, guildMember);
        await interaction.reply({content: `You successfully applied the role **${roleMention(roleId)}** to yourself.`, ephemeral: true});
    } else {
        await removeRoleFromMember(roleId, guildMember);
        await interaction.reply({content: `You successfully removed the role **${roleMention(roleId)}** from yourself.`, ephemeral: true});
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
    let hasPurdueRole = await checkIfMemberHasRole(server_roles["purdue"]["id"], guildMember);

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
 * @param client
 */
async function setRichPresence(client: Client) {
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

/**
 * Sends a log to the discord developer channel
 * @param log
 */
async function sendLogToDiscord(log: Log) {
    let guild = await client.guilds.fetch(guild_id) as Guild;
    let channel = await guild.channels.fetch(log_channel_id) as TextChannel;
    let embed = new MessageEmbed().setTitle(log.type).setDescription(log.message).setTimestamp(log.time).setColor(log.color);

    await channel.send({embeds: [embed]});
}

/**
 * Listens for a command 'stop' in console, which will shutdown the bot
 */
async function listenForStopCommand() {
    const consoleInterface = await createInterface();
    consoleInterface.question('', function (command) {
        if (command === 'stop') {
            process.exit(0);
        }
    });
}

/**
 * Initializes console interface for listening to commands
 */
async function createInterface() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })
}

export {
    sendLogToDiscord
}