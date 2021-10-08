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
exports.tryToCloseEsportsTicket = exports.tryToOpenEsportsTicket = exports.Ticket = void 0;
const sequelize_1 = require("sequelize");
const Database_1 = require("./Database");
const config_json_1 = require("../config.json");
const discord_js_1 = require("discord.js");
const builders_1 = require("@discordjs/builders");
/**
 * Ticket Class
 */
class Ticket extends sequelize_1.Model {
}
exports.Ticket = Ticket;
/**
 * Ticket DB Model
 */
Ticket.init({
    ownerId: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    channelId: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        primaryKey: true
    },
    status: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: true
    },
    content: {
        type: sequelize_1.DataTypes.STRING
    }
}, {
    sequelize: Database_1.sequelize,
    modelName: 'Ticket' // Model Name
});
/**
 * Attempts to open an Esports Role Ticket
 * @param guildMember
 * @param role
 * @param interaction
 */
function tryToOpenEsportsTicket(guildMember, role, interaction) {
    return __awaiter(this, void 0, void 0, function* () {
        let currentOpenTickets;
        let ticketChannel;
        let embed;
        let actionRow;
        let ticket;
        currentOpenTickets = yield getOpenTickets(guildMember);
        if (currentOpenTickets.length < 1) {
            interaction.reply({ content: "Request Failed: You already have an esports ticket open.", ephemeral: true });
        }
        else {
            ticketChannel = yield createTicketChannel(guildMember, role);
            embed = yield createTicketEmbed();
            actionRow = yield createTicketActionRow();
            ticket = yield createTicket(guildMember.id, ticketChannel.id);
            yield ticketChannel.send({ embeds: [embed], components: [actionRow] });
            yield logTicket(ticket, guildMember);
            interaction.reply({ content: `A ticket has been opened for you. Please follow instructions in ${builders_1.channelMention(ticket.channelId)}`, ephemeral: true });
        }
    });
}
exports.tryToOpenEsportsTicket = tryToOpenEsportsTicket;
/**
 * Closes an Esports ticket via an interaction in the Ticket Channel
 * @param interaction
 */
function tryToCloseEsportsTicket(interaction) {
    return __awaiter(this, void 0, void 0, function* () {
        let ticketChannel;
        let messageCollection;
        let channelMessages;
        let guildMember;
        let guild;
        let ticket;
        guild = interaction.guild;
        guildMember = interaction.member;
        ticketChannel = interaction.channel;
        ticket = yield Ticket.findByPk(ticketChannel.id);
        ticketChannel = yield guild.channels.fetch(ticketChannel.id);
        channelMessages = '';
        messageCollection = yield ticketChannel.messages.fetch({ limit: 100 });
        messageCollection.forEach(message => {
            let username = message.author.username;
            channelMessages = channelMessages.concat(`${username}: ${message.content}\n`);
        });
        ticket.status = false;
        ticket.content = channelMessages;
        yield logTicket(ticket, guildMember);
        yield ticket.save();
        yield ticketChannel.delete();
    });
}
exports.tryToCloseEsportsTicket = tryToCloseEsportsTicket;
/**
 * Creates a channel for a new Ticket
 * @param guildMember
 * @param role
 */
function createTicketChannel(guildMember, role) {
    return __awaiter(this, void 0, void 0, function* () {
        let guild = guildMember.guild;
        let ticketChannelCategory = yield guild.channels.fetch(config_json_1.ticket_category_id);
        return yield guild.channels.create(`${guildMember.user.username}-${role.name}`, {
            type: "GUILD_TEXT",
            parent: ticketChannelCategory,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: ["VIEW_CHANNEL"]
                },
                {
                    id: guildMember.id,
                    allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "READ_MESSAGE_HISTORY", "USE_APPLICATION_COMMANDS"]
                }
            ]
        });
    });
}
/**
 * Creates and returns a new Ticket object
 * @param snowflake
 * @param channelId
 */
function createTicket(snowflake, channelId) {
    return __awaiter(this, void 0, void 0, function* () {
        return Ticket.create({ ownerId: snowflake, channelId: channelId });
    });
}
/**
 * Collects and returns all open Tickets for a particular guildMember
 * @param guildMember
 */
function getOpenTickets(guildMember) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield Ticket.findAll({ where: { ownerId: guildMember.id } });
    });
}
/**
 * Logs ticket openings and closings in the designated Ticket Log Channel
 * @param ticket
 * @param guildMember
 */
function logTicket(ticket, guildMember) {
    return __awaiter(this, void 0, void 0, function* () {
        let status = ticket.status;
        let channelId = ticket.channelId;
        let logChannel = yield guildMember.guild.channels.fetch(config_json_1.ticket_log_id);
        let embed = new discord_js_1.MessageEmbed();
        if (status) {
            embed.setTitle(`Esports Role Ticket Opened`)
                .setDescription(`${builders_1.userMention(ticket.ownerId)} has opened a new ticket in ${builders_1.channelMention(channelId)}`)
                .setColor("GREEN");
        }
        else {
            embed.setTitle(`Esports Role Ticket Closed`)
                .setDescription(`${builders_1.userMention(ticket.ownerId)}'s ticket has been closed by ${builders_1.userMention(guildMember.id)}`)
                .setColor("RED");
        }
        logChannel.send({ embeds: [embed] });
    });
}
/**
 * Creates the MessageEmbed for an Esports Ticket
 */
function createTicketEmbed() {
    return __awaiter(this, void 0, void 0, function* () {
        return new discord_js_1.MessageEmbed()
            .setTitle(`Role Request Ticket`)
            .setDescription(`Please list your game and position and an Officer will review your request.\n`);
    });
}
/**
 * Creates the ActionRow for an EsportsTicket
 */
function createTicketActionRow() {
    return __awaiter(this, void 0, void 0, function* () {
        return new discord_js_1.MessageActionRow()
            .addComponents(new discord_js_1.MessageButton()
            .setCustomId(`close_ticket`)
            .setLabel('Close Ticket')
            .setStyle('DANGER'));
    });
}
