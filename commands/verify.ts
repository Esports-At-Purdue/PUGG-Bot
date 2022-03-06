import {SlashCommandBuilder} from '@discordjs/builders'
import * as nodemailer from 'nodemailer';
import {CommandInteraction, GuildMember} from "discord.js";
import * as config from "../config.json";
import Student from "../modules/Student";
import {bot} from "../index";
import {collections} from "../services/database.service";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Initiates Purdue email verification process')
        .setDefaultPermission(false)

        // add - subcommand
        .addSubcommand((command) => command
            .setName('start')
            .setDescription('Command to initiate verification')
            .addStringOption(string => string
                .setName('email')
                .setDescription('Your Purdue University email address')
                .setRequired(true)
            )
        )

        // remove - subcommand
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
        let subcommand = interaction.options.getSubcommand();
        let guildMember = interaction.member as GuildMember;
        let student = await Student.get(guildMember.id);

        if (subcommand == "start") {
            let emailAddress = interaction.options.getString('email');
            let emailInUse = (await collections.students.findOne({_email: emailAddress})) != null;
            if (student) {
                if (student.status) {
                    await interaction.reply({content: "You have already been verified.", ephemeral: true});
                    let purdueRole = await guildMember.guild.roles.fetch(config.roles.purdue);
                    await guildMember.roles.add(purdueRole);
                } else {
                    await interaction.reply({content: "Please finish verification with /verify complete and the code I emailed you.", ephemeral: true});
                }
            } else if (emailInUse) await interaction.reply({content: "This email is already in use.", ephemeral: true});
            else if (isValidEmail(emailAddress)) await finishAuthentication(interaction, guildMember, emailAddress);
            else {
                await interaction.reply({
                    content: `The email you provided, ${emailAddress}, was invalid. Please use a valid Purdue email or Alumni email.`,
                    ephemeral: true
                })
            }
        } else {
            let clientInput = interaction.options.getInteger('code');
            let student = await Student.get(guildMember.id);

            if (student) {
                let code = student.code;

                if (code === 0) return interaction.reply({
                    content: "You have already been authenticated!",
                    ephemeral: true
                });
                if (code !== clientInput) return interaction.reply({
                    content: "Sorry, this code is incorrect.",
                    ephemeral: true
                });

                await activateProfile(student, guildMember);
                await interaction.reply({content: "You have successfully been authenticated!", ephemeral: true});

            } else {
                await interaction.reply({
                    content: "You need to submit an email for verification first. (/verify)",
                    ephemeral: true
                });
            }
        }
    }
}

/**
 * Finalizes the authentication process once the provided email is validated
 * @param interaction
 * @param guildMember
 * @param emailAddress
 */
async function finishAuthentication(interaction, guildMember, emailAddress) {
    let id = guildMember.id;
    let username = guildMember.user.username;
    let user = await Student.get(id);
    let code = generateAuthCode();

    await sendEmail(emailAddress, code);
    if (user) {
        user.username = username;
        user.code = code;
        user.email = emailAddress;
        await Student.put(user);
    } else {
        await Student.post(new Student(id, username, emailAddress, code, false));
        await bot.logger.info(`New Student Registered - Username: ${username}`)
    }

    return interaction.reply({
        content: `A confirmation email containing your one-time code was sent to \`${emailAddress}\`.`,
        ephemeral: true
    });
}

async function activateProfile(student: Student, guildMember) {
    let purdueRole = await guildMember.guild.roles.fetch(config.roles.purdue);
    student.status = true;
    student.code = 0;
    await bot.logger.info(`Student Verified - Username: ${student.username}`);
    await Student.put(student);
    guildMember.roles.add(purdueRole);
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
function isValidEmail(emailAddress): boolean {
    let emailRegExFilter;
    let filteredAddress = '';

    emailRegExFilter = new RegExp(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
    emailAddress = emailAddress.toLowerCase().match(emailRegExFilter);

    if (emailAddress) filteredAddress = emailAddress[0];

    return filteredAddress.endsWith('@purdue.edu') || filteredAddress.endsWith('@alumni.purdue.edu') || filteredAddress.endsWith("@student.purdueglobal.edu");
}

/**
 * Generates a random 6 digit code
 */
function generateAuthCode() {
    return Math.floor(100000 + Math.random() * 900000);
}

