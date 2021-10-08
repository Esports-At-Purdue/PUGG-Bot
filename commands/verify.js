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
const builders_1 = require("@discordjs/builders");
const User_1 = require("../modules/User");
const email_json_1 = require("../jsons/email.json");
const nodemailer = require("nodemailer");
module.exports = {
    data: new builders_1.SlashCommandBuilder()
        .setName('verify')
        .setDescription('Initiates Purdue email verification process.')
        .addStringOption(string => string
        .setName('email')
        .setDescription('Your Purdue University email address.')
        .setRequired(true)),
    execute(interaction) {
        return __awaiter(this, void 0, void 0, function* () {
            let guildMember;
            let emailAddress;
            let isAlreadyVerified;
            let isValidEmailAddress;
            guildMember = interaction.member;
            emailAddress = interaction.options.getString('email');
            isAlreadyVerified = yield checkIfProfileVerified(guildMember.id);
            isValidEmailAddress = checkIfEmailIsValid(emailAddress);
            if (isAlreadyVerified)
                return interaction.reply({ content: "You have already been verified!", ephemeral: true });
            if (isValidEmailAddress)
                yield finishAuthentication(interaction, guildMember, emailAddress);
            else {
                return interaction.reply({
                    content: `The email you provided, ${emailAddress}, was invalid. Please use a valid Purdue email or Alumni email.`,
                    ephemeral: true
                });
            }
        });
    }
};
function finishAuthentication(interaction, guildMember, emailAddress) {
    return __awaiter(this, void 0, void 0, function* () {
        let code;
        let profile;
        let id;
        code = generateAuthCode();
        id = guildMember.id;
        profile = yield getUserById(id);
        yield sendEmail(emailAddress, code);
        if (profile) {
            profile.code = code;
            profile.email = emailAddress;
            profile.save();
        }
        else {
            yield createAndReturnProfile(guildMember, emailAddress, code);
        }
        return interaction.reply({
            content: `A confirmation email containing your one-time code was sent to \`${emailAddress}\`.`,
            ephemeral: true
        });
    });
}
function sendEmail(email, code) {
    return __awaiter(this, void 0, void 0, function* () {
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: email_json_1.username,
                pass: email_json_1.password
            }
        });
        let mailOptions = {
            from: email_json_1.username,
            to: email,
            subject: 'PUGG Discord Account Verification',
            text: `Use this one-time code to verify your account!\nCode: ${code}\nUse the command \'/authenticate\' in any channel.`
        };
        yield transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            }
            else {
                console.log('Email sent: ' + info.response);
            }
        });
    });
}
function checkIfEmailIsValid(emailAddress) {
    let emailRegExFilter;
    let filteredAddress = '';
    emailRegExFilter = new RegExp(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
    emailAddress = emailAddress.match(emailRegExFilter);
    if (emailAddress)
        filteredAddress = emailAddress[0];
    return filteredAddress.endsWith('@purdue.edu') || filteredAddress.endsWith('@alumni.purdue.edu');
}
function checkIfProfileVerified(snowflake) {
    return __awaiter(this, void 0, void 0, function* () {
        let user;
        let result;
        user = yield getUserById(snowflake);
        result = user !== null ? user.status : false;
        return result;
    });
}
function getUserById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield User_1.User.findByPk(id);
    });
}
function createAndReturnProfile(guildMember, email, code) {
    return __awaiter(this, void 0, void 0, function* () {
        let name;
        let id;
        name = guildMember.user.username;
        id = guildMember.id;
        return yield User_1.User.create({ username: name, email: email, id: id, code: code });
    });
}
function generateAuthCode() {
    return Math.floor(100000 + Math.random() * 900000);
}
