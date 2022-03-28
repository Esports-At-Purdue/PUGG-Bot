import {
    ApplicationCommand,
    Client,
    ClientOptions,
    Collection,
    Guild,
    Intents,
    TextChannel
} from "discord.js";
import {connectToDatabase} from "../services/database.service";
import {Routes} from "discord-api-types/v9";
import * as config from "../config.json";
import {REST} from "@discordjs/rest";
import * as express from "express";
import * as fs from "fs";
import Logger from "./Logger";
import {studentsRouter} from "../services/students.router";
import {ticketsRouter} from "../services/tickets.router";
import {postTwitch} from "../services/twitch.service";

const options = {
    intents: [
        Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_BANS, Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGE_REACTIONS, Intents.FLAGS.GUILD_PRESENCES
    ]
} as ClientOptions;

export default class Bot extends Client{
    private _guild: Guild;
    private _logger: Logger;
    private _commands: Collection<any, any>;
    private _logChannel: TextChannel;

    constructor() {
        super(options);
        this._commands = new Collection();
    }

    get guild(): Guild {
        return this._guild;
    }

    set guild(value: Guild) {
        this._guild = value;
    }

    get logger(): Logger {
        return this._logger;
    }

    set logger(value: Logger) {
        this._logger = value;
    }

    get commands() {
        return this._commands;
    }

    set commands(value) {
        this._commands = value;
    }

    get logChannel(): TextChannel {
        return this._logChannel;
    }

    set logChannel(value: TextChannel) {
        this._logChannel = value;
    }

    async init() {
        this._guild = await this.guilds.fetch(config.guild);
        this._logChannel = await this._guild.channels.fetch(config.channels.log_channel) as TextChannel;
        this._logger = new Logger(this._logChannel);
        await this.initializeExpress(28018, 8080);
        await this.initializeCommands(config.token);
    }

    async initializeExpress(address: number, port: number) {
        await connectToDatabase().then(() => {
            const mongoApp = express();
            mongoApp.use("/students", studentsRouter);
            mongoApp.use("/tickets", ticketsRouter);
            mongoApp.listen(address, () => {
                this.logger.info(`Listening for DB Queries at http://localhost:${address}`)
            })
        }).catch((error: Error) => {
            this.logger.fatal("Database connection failure", error);
            process.exit(0);
        })

        const twitchApp = express();
        twitchApp.use(express.raw({ type: 'application/json'}));
        twitchApp.listen(port, () => {this.logger.info(`Listening for Twitch Callbacks at http://localhost:${port}`)})
        twitchApp.post('/eventsub', async (req, res) => {
            await postTwitch(req, res);
        })
    }

    async initializeCommands(token: string) {
        const commands = [];
        const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
        const rest = new REST({ version: '9' }).setToken(token);
        const id = this.application.id;
        const guild = this.guilds.cache.get(config.guild);

        for (const file of commandFiles) {
            const command = require(`../commands/${file}`);
            commands.push(command.data.toJSON());
            await this._commands.set(command.data.name, command);
        }

        try {
            await rest.put(Routes.applicationGuildCommands(id, guild.id), {body: commands});
            const guildCommands = await rest.get(Routes.applicationGuildCommands(id, guild.id)) as Array<ApplicationCommand>;
            for (const guildCommand of guildCommands) {
                const command = this._commands.get(guildCommand.name);
                await guild.commands.permissions.set({
                    command: guildCommand.id,
                    permissions: command.permissions
                })
            }
            await this.logger.info("Application commands uploaded");
        } catch (error) {
            await this.logger.error("Error uploading application commands", error);
        }
    }
}