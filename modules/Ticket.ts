import Student from "./Student";
import {CategoryChannel, MessageActionRow, MessageButton, MessageEmbed, TextChannel} from "discord.js";
import * as config from "../config.json";
import {bot} from "../index";
import {collections} from "../services/database.service";

export default class Ticket{
    private _id: string;
    private _role: string;
    private _owner: string;
    private _status: boolean;
    private _content: string;

    constructor(id: string, role: string, owner: string, status: boolean, content: string) {
        this._id = id;
        this._role = role;
        this._owner = owner;
        this._status = status;
        this._content = content;
    }

    static fromObject(object): Ticket {
        return new Ticket(object._id, object._role, object._owner, object._status, object._content);
    }

    static async open(student: Student, role: string) {
        let ticket = new Ticket(null, role, student.id, true, null);
        await ticket.createChannel();
        await Ticket.post(ticket);
        await ticket.log();
        return ticket;
    }

    static async close(id: string) {
        let ticket = await Ticket.get(id);
        let messages = [];
        let channel = await bot.guild.channels.fetch(ticket.id) as TextChannel;
        let messageCollection = await channel.messages.fetch({limit: 100});
        messageCollection.forEach(message => {
            let username = message.author.username;
            messages.push(`${username}: ${message.content}`);
        });
        ticket.content = messages.reverse().join('\n');
        ticket.status = false;
        await ticket.log();
        await channel.delete();
        await ticket.save();
    }

    async createChannel() {
        let guildMember = await bot.guild.members.fetch(this.owner);
        let ticketCategory = await bot.guild.channels.fetch(config.support_category) as CategoryChannel;

        let channel = await ticketCategory.createChannel(`${guildMember.user.username}`, {
            type: "GUILD_TEXT",
            permissionOverwrites: [
                {
                    id: bot.guild.id,
                    deny: ["VIEW_CHANNEL"]
                },
                {
                    id: this.owner,
                    allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "READ_MESSAGE_HISTORY", "USE_APPLICATION_COMMANDS"]
                }]
        });

        let embed = new MessageEmbed()
            .setTitle(`Role Request Ticket`)
            .setDescription(`Please list your game and position and an Officer will review your request.\n`);
        let row = new MessageActionRow()
            .addComponents(new MessageButton().setCustomId(`close_ticket`).setLabel('Close Ticket').setStyle('DANGER'));

        this.id = channel.id;
        await channel.send({embeds: [embed], components: [row]});
    }

    async log() {
        let embed = new MessageEmbed();
        let guildMember = await bot.guild.members.fetch(this.owner);
        let logChannel = await bot.guild.channels.fetch(config.channels.ticket_log_channel) as TextChannel;
        if (this.status) embed.setTitle(`${guildMember.nickname} has opened a new ticket.`).setColor("DARK_GREEN");
        else embed.setTitle(`${guildMember.nickname}'s ticket has been closed.`).setColor("DARK_ORANGE");
        await logChannel.send({embeds: [embed]})
    }

    get id(): string {
        return this._id;
    }

    set id(value: string) {
        this._id = value;
    }

    get owner(): string {
        return this._owner;
    }

    set owner(value: string) {
        this._owner = value;
    }

    get role(): string {
        return this._role;
    }

    set role(value: string) {
        this._role = value;
    }

    get status(): boolean {
        return this._status;
    }

    set status(value: boolean) {
        this._status = value;
    }

    get content(): string {
        return this._content;
    }

    set content(value: string) {
        this._content = value;
    }

    async save() {
        await Ticket.put(this);
    }

    static async get(id: string) {
        try {
            const query = { _id: id };
            const ticket = Ticket.fromObject(await collections.tickets.findOne(query));

            if (ticket) {
                return ticket;
            }
        } catch (error) {
            return undefined;
        }
    }

    static async post(ticket: Ticket) {
        try {
            const Ticket = (ticket);
            // @ts-ignore
            return await collections.tickets.insertOne(Ticket);

        } catch (error) {
            console.error(error);
            return undefined;
        }
    }

    static async put(ticket: Ticket) {
        await collections.tickets.updateOne({ _id: (ticket.id) }, { $set: ticket });
    }

    static async delete(ticket: Ticket) {
        await collections.tickets.deleteOne({ _id: (ticket.id) });
    }
}