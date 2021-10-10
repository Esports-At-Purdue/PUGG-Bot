import {DataTypes, Model} from "sequelize";
import {sequelize} from "./Database";
import {ticket_category_id, ticket_log_id} from "../config.json";
import {channelMention, userMention} from "@discordjs/builders";
import {
    ButtonInteraction, CategoryChannel,
    GuildMember,
    MessageActionRow,
    MessageButton,
    MessageEmbed,
    Role, Snowflake, TextChannel
} from "discord.js";

/**
 * Ticket Class
 */
class Ticket extends Model {
    status: boolean;
    content: string;
    channelId: string;
    ownerId: string;
}

/**
 * Ticket DB Model
 */
Ticket.init({
    ownerId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    channelId: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true
    },
    status: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    content: {
        type: DataTypes.STRING
    }
}, {
    sequelize, // Connection Instance
    modelName: 'Ticket' // Model Name
});

/**
 * Attempts to open an Esports Role Ticket
 * @param guildMember
 * @param role
 * @param interaction
 */
async function tryToOpenEsportsTicket(guildMember: GuildMember, role: Role, interaction: ButtonInteraction) {
    let currentOpenTickets;
    let ticketChannel;
    let embed;
    let actionRow;
    let ticket;

    currentOpenTickets = await getOpenTickets(guildMember);

    if (currentOpenTickets.length > 0) {
        await interaction.reply({
            content: "Request Failed: You already have an esports ticket open.",
            ephemeral: true
        });
    } else {
        ticketChannel = await createTicketChannel(guildMember, role);
        embed = await createTicketEmbed();
        actionRow = await createTicketActionRow();
        ticket = await createTicket(guildMember.id, ticketChannel.id);

        await ticketChannel.send({ embeds: [embed] , components: [actionRow] });
        await logTicket(ticket, guildMember);
        await interaction.reply({
            content: `A ticket has been opened for you. Please follow instructions in ${channelMention(ticket.channelId)}`,
            ephemeral: true
        })
    }
}

/**
 * Closes an Esports ticket via an interaction in the Ticket Channel
 * @param interaction
 */
async function tryToCloseEsportsTicket(interaction: ButtonInteraction) {
    let ticketChannel;
    let messageCollection;
    let channelMessages;
    let guildMember;
    let guild;
    let ticket;

    guild = interaction.guild;
    guildMember = interaction.member;
    ticketChannel = interaction.channel;
    ticket = await Ticket.findByPk(ticketChannel.id);
    ticketChannel = await guild.channels.fetch(ticketChannel.id);
    channelMessages = '';
    messageCollection = await ticketChannel.messages.fetch({limit: 100});

    messageCollection.forEach(message => {
        let username = message.author.username;
        channelMessages = channelMessages.concat(`${username}: ${message.content}\n`);
    });

    ticket.status = false;
    ticket.content = channelMessages;
    await logTicket(ticket, guildMember);
    await ticket.save();
    await ticketChannel.delete();
}

/**
 * Creates a channel for a new Ticket
 * @param guildMember
 * @param role
 */
async function createTicketChannel(guildMember: GuildMember, role: Role) {
    let guild = guildMember.guild;
    let ticketCategory = await guild.channels.fetch(ticket_category_id) as CategoryChannel;

    return await ticketCategory.createChannel(`${guildMember.user.username}-${role.name}`, {
        type: "GUILD_TEXT",
        permissionOverwrites: [
            {
                id: guild.id,
                deny: ["VIEW_CHANNEL"]
            },
            {
                id: guildMember.id,
                allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "READ_MESSAGE_HISTORY", "USE_APPLICATION_COMMANDS"]
            }]
    });
}

/**
 * Creates and returns a new Ticket object
 * @param ownerId
 * @param channelId
 */
async function createTicket(ownerId: Snowflake, channelId: Snowflake) {
    return Ticket.create({ownerId: ownerId, channelId: channelId})
}

/**
 * Collects and returns all open Tickets for a particular guildMember
 * @param guildMember
 */
async function getOpenTickets(guildMember: GuildMember) {
    return await Ticket.findAll({ where: { ownerId: guildMember.id}});
}

/**
 * Logs ticket openings and closings in the designated Ticket Log Channel
 * @param ticket
 * @param guildMember
 */
async function logTicket(ticket: Ticket, guildMember: GuildMember) {
    let status = ticket.status;
    let channelId = ticket.channelId;
    let logChannel = await guildMember.guild.channels.fetch(ticket_log_id) as TextChannel;
    let embed = new MessageEmbed();

    if (status) {
        embed.setTitle(`Esports Role Ticket Opened`)
            .setDescription(`${userMention(ticket.ownerId)} has opened a new ticket in ${channelMention(channelId)}`)
            .setColor("GREEN");
    } else {
        embed.setTitle(`Esports Role Ticket Closed`)
            .setDescription(`${userMention(ticket.ownerId)}'s ticket has been closed by ${userMention(guildMember.id)}`)
            .setColor("RED");
    }
    await logChannel.send({embeds: [embed]})
}

/**
 * Creates the MessageEmbed for an Esports Ticket
 */
async function createTicketEmbed() {
    return new MessageEmbed()
        .setTitle(`Role Request Ticket`)
        .setDescription(`Please list your game and position and an Officer will review your request.\n`);
}

/**
 * Creates the ActionRow for an EsportsTicket
 */
async function createTicketActionRow() {
    return new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setCustomId(`close_ticket`)
                .setLabel('Close Ticket')
                .setStyle('DANGER')
        );
}

export {
    Ticket,
    tryToOpenEsportsTicket,
    tryToCloseEsportsTicket
}
