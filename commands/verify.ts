import { SlashCommandBuilder } from '@discordjs/builders'
import { User } from '../modules/User';
import { username, password } from '../jsons/email.json';
import * as nodemailer from 'nodemailer';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Initiates Purdue email verification process.')
        .addStringOption(string => string
            .setName('email')
            .setDescription('Your Purdue University email address.')
            .setRequired(true)),
    async execute(interaction) {
        let guildMember;
        let emailAddress;
        let isAlreadyVerified;
        let isValidEmailAddress;

        guildMember = interaction.member
        emailAddress = interaction.options.getString('email');
        isAlreadyVerified = await checkIfProfileVerified(guildMember.id);
        isValidEmailAddress = checkIfEmailIsValid(emailAddress);

        if (isAlreadyVerified) return interaction.reply({content: "You have already been verified!", ephemeral: true});
        if (isValidEmailAddress) await finishAuthentication(interaction, guildMember, emailAddress);
        else {
            return interaction.reply({
                content: `The email you provided, ${emailAddress}, was invalid. Please use a valid Purdue email or Alumni email.`,
                ephemeral: true
            })
        }
    }
}

async function finishAuthentication(interaction, guildMember, emailAddress) {
    let code;
    let profile;
    let id;

    code = generateAuthCode();
    id = guildMember.id;
    profile = await getUserById(id);

    await sendEmail(emailAddress, code);
    if (profile) {
        profile.code = code;
        profile.email = emailAddress;
        profile.save();
    } else {
        await createAndReturnProfile(guildMember, emailAddress, code)
    }

    return interaction.reply({
        content: `A confirmation email containing your one-time code was sent to \`${emailAddress}\`.`,
        ephemeral: true
    });

}


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

function checkIfEmailIsValid(emailAddress) {
    let emailRegExFilter;
    let filteredAddress = '';

    emailRegExFilter = new RegExp(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
    emailAddress = emailAddress.match(emailRegExFilter);

    if (emailAddress) filteredAddress = emailAddress[0];

    return filteredAddress.endsWith('@purdue.edu') || filteredAddress.endsWith('@alumni.purdue.edu');
}

async function checkIfProfileVerified(snowflake) {
    let user;
    let result;

    user = await getUserById(snowflake);
    result = user !== null ? user.status : false;

    return result;
}

async function getUserById(id) {
    return await User.findByPk(id);
}

async function createAndReturnProfile(guildMember, email, code) {
    let name;
    let id;

    name = guildMember.user.username;
    id = guildMember.id;

    return await User.create({ username: name, email: email, id: id, code: code})
}

function generateAuthCode() {
    return Math.floor(100000 + Math.random() * 900000);
}