import {SlashCommandBuilder} from '@discordjs/builders'
import * as nodemailer from 'nodemailer';
import {CommandInteraction, GuildMember} from "discord.js";
import * as config from "../config.json";
import Student from "../modules/Student";
import {collections} from "../services/database.service";
import {bot} from "../index";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Initiates Purdue email verification process')
        .setDefaultPermission(false)

        // start - subcommand
        .addSubcommand((command) => command
            .setName('start')
            .setDescription('Command to initiate verification')
            .addStringOption(string => string
                .setName('email')
                .setDescription('Your Purdue University email address')
                .setRequired(true)
            )
        )

        // complete - subcommand
        .addSubcommand((command) => command
            .setName('complete')
            .setDescription('Completes Purdue email verification process.')
            .addIntegerOption((integer) => integer
                .setName("code")
                .setDescription("The code received in verification email")
                .setRequired(true)
            )
        ),

    permissions: [
        {
            id: config.guild,
            type: 'ROLE',
            permission: true
        },
    ],

    async execute(interaction: CommandInteraction) {
        let response;
        let subcommand = interaction.options.getSubcommand();
        let student = await Student.get(interaction.user.id);

        switch (subcommand) {
            case "start":
                let email = interaction.options.getString('email');
                if (student) {
                    if (student.status) {
                        response = {content: "You are verified.", ephemeral: true};
                        await (interaction.member as GuildMember).roles.add(config.roles.purdue);
                        await (interaction.member as GuildMember).roles.remove(config.roles["non-purdue"]);
                    } else response = {content: "Please finish verification with \`/verify complete\`.", ephemeral: true};
                } else if (await collections.students.findOne({_email: email})) {
                    response = {content: "This email is already in use.", ephemeral: true}
                } else if (isValidEmail(email)) {
                    let code = Math.floor(100000 + Math.random() * 900000);
                    let username = interaction.user.username;
                    await sendEmail(email, code);
                    await bot.logger.info(`New Student Registered - Username: ${username}`)
                    await Student.post(new Student(interaction.user.id, username, email, code, false));
                    response = {content: `An email containing your one-time code was sent to \`${email}\`.`, ephemeral: true};
                }
                break;
            case "complete":
                if (student) {
                    let code = interaction.options.getInteger('code');
                    if (student.status) {
                        response = {content: "You are verified.", ephemeral: true};
                        await (interaction.member as GuildMember).roles.add(config.roles.purdue);
                        await (interaction.member as GuildMember).roles.remove(config.roles["non-purdue"]);
                    } else if (code == student.code) {
                        student.code = 0;
                        student.status = true;
                        await student.save();
                        await (interaction.member as GuildMember).roles.add(config.roles.purdue);
                        await bot.logger.info(`Student Verified - Username: ${student.username}`);
                        response = {content: "You have successfully been authenticated!", ephemeral: true};
                    } else response = {content: "Sorry, this code is incorrect.", ephemeral: true};
                } else {
                    response = {content: "You need to submit an email for verification first. Use \`/verify start\`", ephemeral: true};
                }
                break;
            default:
                response = {content: "Something went very wrong... Please send this to <@!751910711218667562>."};
                throw new Error("Verify command failed - Inaccessible option");
        }
        await interaction.reply(response);
    }
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
            user: config.email.username,
            pass: config.email.password
        }
    });
    let mailOptions = {
        from: config.email.username,
        to: email,
        subject: 'PUGG Discord Account Verification',
        text: `Use this one-time code to verify your account!\nCode: ${code}\nUse the command \'/verify complete\' in any channel.`
    };

    await transporter.sendMail(mailOptions, async function (error, info) {
        if (error) await bot.logger.error(`An error occurred sending an email to ${email}`, error);
        else await bot.logger.info('Email sent: ' + info.response);
    });
}

/**
 * Parses the provided email address and confirms that is valid
 * @param email the provided email address
 */
function isValidEmail(email): boolean {
    let emailRegEx = new RegExp(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/m);
    email = email.toLowerCase().match(emailRegEx)[0];
    return email.endsWith('@purdue.edu') || email.endsWith('@alumni.purdue.edu') || email.endsWith("@student.purdueglobal.edu");
}