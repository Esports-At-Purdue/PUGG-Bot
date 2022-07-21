import {
    ButtonInteraction, Client, CommandInteraction,
    GuildMember, InteractionReplyOptions, MessageActionRow, MessageEmbed, Modal, ModalSubmitInteraction,
    Role, SelectMenuInteraction, TextChannel, TextInputComponent
} from 'discord.js';
import * as crypto from "crypto";
import * as config from './config.json';
import * as nodemailer from 'nodemailer';
import Bot from "./modules/Bot";
import Ticket from "./modules/Ticket";
import Student from "./modules/Student";
import {collections} from "./services/database.service";

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
        if (interaction.isModalSubmit()) await receiveModal(interaction);
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
    let channel = await bot.guild.channels.fetch(config.channels.join_channel) as TextChannel;
    await channel.send({content: `${guildMember.user} has joined. Index: ${bot.guild.memberCount}`});
    channel = await bot.guild.channels.fetch(config.channels.general) as TextChannel;
    let embed = new MessageEmbed().setColor("#2f3136");
    switch (Math.floor(Math.random() * 11)) {
        case 0: embed.setDescription(`Welcome, **${guildMember.user.username}**. We were expecting you ( ͡° ͜ʖ ͡°)`); break;
        case 1: embed.setDescription(`Swoooosh. **${guildMember.user.username}** just landed.`); break;
        case 2: embed.setDescription(`**${guildMember.user.username}** just showed up. Hold my beer.`); break;
        case 3: embed.setDescription(`Challenger approaching - **${guildMember.user.username}** has appeared!`); break;
        case 4: embed.setDescription(`Never gonna give **${guildMember.user.username}** up. Never gonna let **${guildMember.user.username}** down.`); break;
        case 5: embed.setDescription(`We've been expecting you **${guildMember.user.username}**`); break;
        case 6: embed.setDescription(`**${guildMember.user.username}** has joined the server! It's super effective!`); break;
        case 7: embed.setDescription(`**${guildMember.user.username}** is here, as the prophecy foretold.`); break;
        case 8: embed.setDescription(`Ready player **${guildMember.user.username}**`); break;
        case 9: embed.setDescription(`Roses are red, violets are blue, **${guildMember.user.username}** joined this server to be with you`); break;
        case 10: embed.setDescription(`**${guildMember.user.username}** just arrived. Seems OP - please nerf.`); break;
    }
    // Welcome Messages Disabled
    //await channel.send({embeds: [embed]});
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
        await interaction.deferReply();
        const command = bot.commands.get(interaction.commandName);
        const response = await command.execute(interaction);
        await interaction.deleteReply();
        if (response.ephemeral) {
            await interaction.followUp(response);
        } else {
            await interaction.channel.send(response);
        }
        await bot.logger.info(`${interaction.commandName} command issued by ${interaction.user.username}`);
    } catch (error) {
        await bot.logger.error(`${interaction.commandName} command issued by ${interaction.user.username} failed`, error);
        await interaction.deleteReply();
        await interaction.followUp({content: "There was an error running this command.", ephemeral: true});
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
            let response = await enhancedRoleRequest(role, guildMember, interaction);
            if (response.content != null) {
                await interaction.reply(response);
            }
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
 * Executes logic on a ModalSubmit Interaction
 * @param interaction
 */
async function receiveModal(interaction: ModalSubmitInteraction) {
    let response = {content: null, ephemeral: true};
    let student: Student;

    try {
        switch (interaction.customId) {
            case "verify-start":
                let email = interaction.fields.getTextInputValue("email");
                student = Student.fromObject(await collections.students.findOne({_email: email}));
                if (student && student.status) {
                    response.content = "This email is already in use.";
                } else {
                    if (isValidEmail(email)) {
                        let username = interaction.user.username;
                        let hash = encrypt(interaction.user.id + "-" + Date.now());
                        let token = hash.iv + "-" + hash.content;
                        let url = `https://www.technowizzy.dev/api/v1/students/verify/${token}`;
                        await sendEmail(email, url);
                        await bot.logger.info(`New Student Registered - Username: ${username}`)
                        await Student.post(new Student(interaction.user.id, username, email, 0, false));
                        response.content = `A verification email was sent to \`${email}\`. Click the **Purdue Button** once you have verified!`;
                    } else {
                        response.content = `The email you provided, \`${email}\`, is invalid. Please provide a valid Purdue email.`;
                    }
                }
                break;
        }

        if (response.content != null) {
            await interaction.reply(response);
        }
    } catch (error) {
        await bot.logger.error(`Modal ${interaction.customId} selected by ${interaction.user.username} failed`, error);
    }
}

/**
 * Executes logic for managing various roles from a ButtonInteraction
 * @param role
 * @param guildMember
 * @param interaction
 */
async function enhancedRoleRequest
(role: Role, guildMember: GuildMember, interaction: ButtonInteraction | SelectMenuInteraction): Promise<InteractionReplyOptions> {
    let response: InteractionReplyOptions = {content: null, ephemeral: true};
    let memberHasRole = await hasRole(role.id, guildMember);
    let student = await Student.get(guildMember.id);

    switch (role.name) {
        case "Coach": case "Captain": case "Player":
            if (memberHasRole) response.content = "You already have this role.";
            else if (student) {
                let hasOpenTicket = false;
                let tickets = await collections.tickets.find({_owner: student.id});
                await tickets.forEach(document => {
                    let ticket = Ticket.fromObject(document);
                    if (ticket.status) {
                        response.content = `You already have a ticket open in <#${ticket.id}>`;
                        hasOpenTicket = true;
                    }
                })
                if (!hasOpenTicket) {
                    let ticket = await Ticket.open(student, role.name);
                    response.content = `A ticket has been opened in <#${ticket.id}>`;
                }
            } else response.content = `You must verify yourself as a student first. <#${config.channels.verify}>`;
            break;

        case "Purdue":
            if (student && student.status) {
                response.content = "You are verified!";
                await addRole(config.roles.purdue, guildMember);
                await removeRole(config.roles["non-purdue"], guildMember);
            } else {
                let modal = new Modal().setCustomId("verify-start").setTitle("Purdue Verification");
                let emailInput = new TextInputComponent().setCustomId("email").setLabel("What is your Purdue email address?").setStyle("SHORT");
                let row = new MessageActionRow().addComponents(emailInput);
                // @ts-ignore
                modal.addComponents(row);
                await interaction.showModal(modal);
            }
            break;

        case "Non-Purdue":
            if (memberHasRole) {
                response.content = "You have removed the role **Non-Purdue** from yourself.";
                await removeRole(config.roles["non-purdue"], guildMember);
            } else {
                if (student) {
                    response.content = "Purdue students cannot apply the Non-Purdue role.";
                } else {
                    response.content = "You have applied the role **Non-Purdue** to yourself.";
                    await addRole(config.roles["non-purdue"], guildMember);
                }
            }
            break;

        default:
            if (memberHasRole) {
                response.content = `You have removed the role **<@&${role.id}>** from yourself.`;
                await removeRole(role.id, guildMember);
            } else {
                response.content = `You applied the role **<@&${role.id}>** to yourself.`;
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

/**
 * Parses the provided email address and confirms that is valid
 * @param email the provided email address
 */
function isValidEmail(email): boolean {
    let emailRegEx = new RegExp(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/m);
    let matches = email.toLowerCase().match(emailRegEx);
    if (matches != null) {
        return matches[0].endsWith('@purdue.edu') || matches[0].endsWith('@alumni.purdue.edu') || matches[0].endsWith("@student.purdueglobal.edu");
    }
    return false;
}

/**
 * Sends an authentication code to a provided email address
 * @param email
 * @param link
 */
async function sendEmail(email, link) {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: config.email.username,
            pass: config.email.password
        }
    });
    let mailOptions = {
        from: config.email.username,
        to: email,
        subject: 'PUGG Discord Account Verification',
        text:
            `Click this link to verify your account!
            \nLink: ${link}
            \nClick the \'Purdue Button\' in #verify to finalize verification!`
    };

    await transporter.sendMail(mailOptions, async function (error, info) {
        if (error) await bot.logger.error(`An error occurred sending an email to ${email}`, error);
        else await bot.logger.info("Verification email sent");
    });
}

const encrypt = (text) => {

    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv("aes-256-ctr", config.key, iv);

    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

    return {
        iv: iv.toString('hex'),
        content: encrypted.toString('hex')
    };
};