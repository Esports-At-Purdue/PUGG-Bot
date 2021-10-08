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
const fs = require("fs");
const readline = require("readline");
const rest_1 = require("@discordjs/rest");
const v9_1 = require("discord-api-types/v9");
const discord_js_1 = require("discord.js");
const config_json_1 = require("./config.json");
const roleManager_1 = require("./scripts/roleManager");
const Database_1 = require("./modules/Database");
const Ticket_1 = require("./modules/Ticket");
const client = new discord_js_1.Client({ intents: [discord_js_1.Intents.FLAGS.GUILDS, discord_js_1.Intents.FLAGS.GUILD_MEMBERS, discord_js_1.Intents.FLAGS.GUILD_BANS, discord_js_1.Intents.FLAGS.GUILD_MESSAGES, discord_js_1.Intents.FLAGS.GUILD_MESSAGE_REACTIONS, discord_js_1.Intents.FLAGS.DIRECT_MESSAGES, discord_js_1.Intents.FLAGS.DIRECT_MESSAGE_REACTIONS] });
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const rest = new rest_1.REST({ version: '9' }).setToken(config_json_1.token);
client["commands"] = new discord_js_1.Collection();
client.on('ready', () => __awaiter(void 0, void 0, void 0, function* () {
    yield setRichPresence(client);
    yield informDiscordOfRestart(client);
    yield Database_1.synchronize();
}));
client.login(config_json_1.token).then(() => __awaiter(void 0, void 0, void 0, function* () {
    let commands = [];
    //Collect and Register Commands
    yield collectAndSetCommandFiles(commands, commandFiles);
    yield registerClientCommands(commands);
    //Readline
    yield listenForStopCommand();
}));
client.on('interactionCreate', (interaction) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        //Sort Interactions
        if (interaction.isButton())
            yield receiveButton(interaction);
        if (interaction.isSelectMenu())
            yield receiveSelectMenu(interaction);
        if (interaction.isCommand())
            yield receiveCommand(interaction);
    }
    catch (error) {
        yield informDiscordOfError(error);
    }
}));
/**
 * Takes data from commands files (./commands/**) and set's them as client's commands
 * @param commands
 * @param commandFiles
 */
function collectAndSetCommandFiles(commands, commandFiles) {
    return __awaiter(this, void 0, void 0, function* () {
        for (let commandFile of commandFiles) {
            let command = require(`./commands/${commandFile}`);
            commands.push(command.data.toJSON());
            yield client["commands"].set(command.data.name, command);
        }
    });
}
/**
 * Takes all commands and registers them with Discord Restful API
 * @param commands
 */
function registerClientCommands(commands) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Started refreshing application (/) commands.');
            yield rest.put(v9_1.Routes.applicationGuildCommands(config_json_1.clientId, config_json_1.guildId), { body: commands });
            console.log('Successfully reloaded application (/) commands.');
        }
        catch (error) {
            console.error(error);
        }
    });
}
/**
 * Executes logic on a Button Interaction
 * @param interaction
 */
function receiveButton(interaction) {
    return __awaiter(this, void 0, void 0, function* () {
        let id = interaction.customId;
        if (id === `close_ticket`)
            return yield Ticket_1.tryToCloseEsportsTicket(interaction);
        else
            yield roleManager_1.requestRole(interaction, id);
    });
}
/**
 * Executes logic on a Command Interaction
 * @param interaction
 */
function receiveCommand(interaction) {
    return __awaiter(this, void 0, void 0, function* () {
        const command = client["commands"].get(interaction.commandName);
        if (!command)
            return;
        try {
            yield command.execute(interaction);
        }
        catch (error) {
            console.error(error);
            yield informDiscordOfError(error);
        }
    });
}
/**
 * Executes logic on a SelectMenu Interaction
 * @param interaction
 */
function receiveSelectMenu(interaction) {
    return __awaiter(this, void 0, void 0, function* () {
        let roleId = interaction.values[0];
        yield roleManager_1.requestRole(interaction, roleId);
    });
}
function setRichPresence(client) {
    return __awaiter(this, void 0, void 0, function* () {
        let user;
        let activity;
        user = client.user;
        activity = {
            name: 'GRIT™',
            type: 'PLAYING'
        };
        user.setActivity(activity);
    });
}
/**
 * Informs Admins that the bot has been restarted
 * @param client
 */
function informDiscordOfRestart(client) {
    return __awaiter(this, void 0, void 0, function* () {
        yield informDiscord("Bot has restarted.");
    });
}
/**
 * Informs Admins that the bot has encountered an error
 * @param error
 */
function informDiscordOfError(error) {
    return __awaiter(this, void 0, void 0, function* () {
        yield informDiscord(error);
    });
}
/**
 * Sends a message to the discord developer channel
 * @param message
 */
function informDiscord(message) {
    return __awaiter(this, void 0, void 0, function* () {
        let guild;
        let channel;
        guild = yield client.guilds.fetch("210627864691736577");
        channel = yield guild.channels.fetch("882040910928556062");
        yield channel.send({ content: `${message}` });
    });
}
/**
 * Listens for a command 'stop' in console, which will shutdown the bot
 */
function listenForStopCommand() {
    return __awaiter(this, void 0, void 0, function* () {
        const consoleInterface = yield createInterface();
        consoleInterface.question('', function (command) {
            if (command === 'stop') {
                process.exit(0);
            }
        });
    });
}
/**
 * Initializes console interface for listening to commands
 */
function createInterface() {
    return __awaiter(this, void 0, void 0, function* () {
        return readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    });
}
module.exports = {
    informDiscord
};
