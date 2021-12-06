import {SlashCommandBuilder, userMention} from '@discordjs/builders'
import { username, password } from '../jsons/email.json';
import * as nodemailer from 'nodemailer';
import {Client, CommandInteraction, GuildMember, Snowflake} from "discord.js";
import {guild_id} from "../config.json";
import {sendLogToDiscord} from "../index";
import {Log, LogType} from "../modules/Log";
import {server_roles} from "../jsons/roles.json";
import newUser from "../NewUser";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Initiates Purdue email verification process.')
        .setDefaultPermission(false)
        .addStringOption(string => string
            .setName('email')
            .setDescription('Your Purdue University email address.')
            .setRequired(true)),
    async execute(interaction: CommandInteraction) {
        let guildMember;
        let emailAddress;
        let isAlreadyVerified;
        let isValidEmailAddress;

        guildMember = interaction.member
        emailAddress = interaction.options.getString('email');
        isAlreadyVerified = await checkIfProfileVerified(guildMember.id);
        isValidEmailAddress = checkIfEmailIsValid(emailAddress);

        if (isAlreadyVerified) {
            await interaction.reply({content: "You have already been verified!", ephemeral: true});
            let purdueRole = await guildMember.guild.roles.fetch(server_roles["purdue"]["id"]);
            await guildMember.roles.add(purdueRole);
        }
        else if (isValidEmailAddress) await finishAuthentication(interaction, guildMember, emailAddress);
        else {
            await interaction.reply({
                content: `The email you provided, ${emailAddress}, was invalid. Please use a valid Purdue email or Alumni email.`,
                ephemeral: true
            })
        }
    },
    async setPermissions(client: Client, commandId: Snowflake) {
        let guild = await client.guilds.fetch(guild_id);
        let commandPermissionsManager = guild.commands.permissions;

        await commandPermissionsManager.add({
            command: commandId, permissions: [
                {
                    id: guild.id,
                    type: 'ROLE',
                    permission: true
                },
            ]
        })
    }
}

/**
 * Finalizes the authentication process once the provided email is validated
 * @param interaction
 * @param guildMember
 * @param emailAddress
 */
async function finishAuthentication(interaction, guildMember, emailAddress) {
    let code;
    let user;
    let id;

    code = generateAuthCode();
    id = guildMember.id;
    user = await newUser.get(id);

    console.log("made it this far");

    await sendEmail(emailAddress, code);
    if (user) {
        user.code = code;
        user.email = emailAddress;
        await newUser.put(user);
    } else {
        await createAndReturnProfile(guildMember, emailAddress, code)
    }

    return interaction.reply({
        content: `A confirmation email containing your one-time code was sent to \`${emailAddress}\`.`,
        ephemeral: true
    });

}

/**
 * Sends an authentication code to a provided email address
 * @param email
 * @param code
 */
async function sendEmail(email, code) {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: username,
            pass: password
        }
    });
    let mailOptions = {
        from: username,
        to: email,
        subject: 'PUGG Discord Account Verification',
        text: `Use this one-time code to verify your account!\nCode: ${code}\nUse the command \'/authenticate\' in any channel.`
    };

    await transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

/**
 * Parses the provided email address and confirms that is valid
 * @param emailAddress
 */
function checkIfEmailIsValid(emailAddress) {
    let emailRegExFilter;
    let filteredAddress = '';

    emailRegExFilter = new RegExp(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
    emailAddress = emailAddress.toLowerCase().match(emailRegExFilter);

    if (emailAddress) filteredAddress = emailAddress[0];

    return filteredAddress.endsWith('@purdue.edu') || filteredAddress.endsWith('@alumni.purdue.edu');
}

/**
 * Checks whether a User entry exists for a GuildMember
 * @param snowflake
 */
async function checkIfProfileVerified(snowflake: Snowflake) {
    let user;
    let result;

    user = await newUser.get(snowflake);
    result = user ? user.status : false;

    return result;
}

/**
 * Creates a new User from provided GuildMember, Email, and Auth Code
 * @param guildMember
 * @param email
 * @param code
 */
async function createAndReturnProfile(guildMember: GuildMember, email: string, code: number) {
    let name;
    let user;
    let id;

    name = guildMember.user.username;
    id = guildMember.id;
    user = new newUser(id, name, email, code, false);
    await newUser.post(user);

    await sendLogToDiscord(new Log(LogType.DATABASE_UPDATE, `New User Created:\nMember: ${userMention(user.id)}\nId: ${id}\nEmail: ${user.email}`))
    return user;
}

/**
 * Generates a random 6 digit code
 */
function generateAuthCode() {
    return Math.floor(100000 + Math.random() * 900000);
}