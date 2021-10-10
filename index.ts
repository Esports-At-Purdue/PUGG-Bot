import * as fs from 'fs';
import * as readline from 'readline';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import {Client, Intents, Collection, ButtonInteraction, CommandInteraction, SelectMenuInteraction} from 'discord.js';
import { token, guildId, clientId } from './config.json';
import { requestRole } from './scripts/roleManager';
import { synchronize } from './modules/Database';
import { tryToCloseEsportsTicket } from "./modules/Ticket";

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_BANS, Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGE_REACTIONS
    ]});

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const rest = new REST({ version: '9' }).setToken(token);
client["commands"] = new Collection();

client.on('ready', async () => {
    await setRichPresence(client);
    await informDiscordOfRestart(client)
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
    } catch(error) {
        await informDiscordOfError(error);
    }
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
 * Takes all commands and registers them with Discord Restful API
 * @param commands
 */
async function registerClientCommands(commands) {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            {body: commands},
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
}

/**
 * Executes logic on a Button Interaction
 * @param interaction
 */
async function receiveButton(interaction: ButtonInteraction) {
    let id = interaction.customId;
    return (id === 'close_ticket') ? await tryToCloseEsportsTicket(interaction) : await  requestRole(interaction, id);
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
        console.error(error);
        await informDiscordOfError(error)
    }
}

/**
 * Executes logic on a SelectMenu Interaction
 * @param interaction
 */
async function receiveSelectMenu(interaction: SelectMenuInteraction) {
    let roleId = interaction.values[0];
    await requestRole(interaction, roleId);
}

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
 * Informs Admins that the bot has been restarted
 * @param client
 */
async function informDiscordOfRestart(client: Client) {
    await informDiscord("Bot has restarted.")
}

/**
 * Informs Admins that the bot has encountered an error
 * @param error
 */
async function informDiscordOfError(error) {
    await informDiscord(error)
}

/**
 * Sends a message to the discord developer channel
 * @param message
 */
async function informDiscord(message: String) {
    let guild;
    let channel;

    guild = await client.guilds.fetch("210627864691736577");
    channel = await guild.channels.fetch("882040910928556062")

    await channel.send({content: `${message}`})
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

module.exports = {
}