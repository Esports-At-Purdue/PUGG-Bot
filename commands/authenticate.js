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
const roles_json_1 = require("../jsons/roles.json");
module.exports = {
    data: new builders_1.SlashCommandBuilder()
        .setName('authenticate')
        .setDescription('Authenticates email address with unique code')
        .addIntegerOption(integer => integer
        .setName('code')
        .setDescription('Code received in verification email.')
        .setRequired(true)),
    execute(interaction) {
        return __awaiter(this, void 0, void 0, function* () {
            let user; //Database User
            let code; //Unique authentication code
            let status; //Whether the User is active or inactive
            let purdueRole; //Purdue discord role
            let guildMember; //Discord user that initiated the interaction
            let discordGuild; //Guild the guildMember is in
            let clientInput; //The authentication code the guildMember input
            guildMember = interaction.member;
            discordGuild = interaction.guild;
            clientInput = interaction.options.getInteger('code');
            user = yield User_1.User.findByPk(guildMember.id);
            purdueRole = yield discordGuild.roles.fetch(roles_json_1.server_roles["purdue"]["id"]);
            if (user !== null) //Evaluate whether there is a User associated with the discord account in the DB yet
             {
                status = user.status;
                code = user.code;
                if (status) //Evaluate whether the User profile has been activated yet
                 {
                    return interaction.reply({
                        content: "You have already been authenticated!",
                        ephemeral: true
                    });
                }
                else {
                    if (code === clientInput) //Evaluate whether the code the user input matches the authentication code
                     {
                        yield User_1.User.update({ status: true, code: 0 }, { where: { id: guildMember.id } });
                        guildMember.roles.add(purdueRole);
                        return interaction.reply({
                            content: "You have successfully been authenticated!",
                            ephemeral: true
                        });
                    }
                    else {
                        return interaction.reply({
                            content: "Sorry, this code is incorrect.",
                            ephemeral: true
                        });
                    }
                }
            }
            else {
                return interaction.reply({
                    content: "You need to submit an email for verification first. (/verify)",
                    ephemeral: true
                });
            }
        });
    }
};
