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
exports.requestRole = void 0;
const Ticket_1 = require("../modules/Ticket");
function requestRole(interaction, roleId) {
    return __awaiter(this, void 0, void 0, function* () {
        let discordGuild; //Discord guild in which interaction originated
        let discordRole; //Discord role that is being requested
        let guildMember; //GuildMember instance from discordUser
        let hasRole; //Whether or not the GuildMember has the requested discordRole
        discordGuild = interaction.guild;
        discordRole = yield discordGuild.roles.fetch(roleId);
        guildMember = yield interaction.member;
        hasRole = yield checkIfGuildMemberHasRole(guildMember, discordRole.name);
        switch (discordRole.name) //Evaluate different roles
         {
            case 'Coach':
            case 'Captain':
            case 'Player':
                if (!hasRole) {
                    let isVerifiedStudent = yield checkIfGuildMemberHasRole(guildMember, 'Purdue');
                    if (isVerifiedStudent)
                        return yield Ticket_1.tryToOpenEsportsTicket(guildMember, discordRole, interaction);
                    else {
                        return interaction.reply({
                            content: "Please verify yourself first with **/verify** in any channel.",
                            ephemeral: true
                        });
                    }
                }
                else {
                    return interaction.reply({ content: "You already have this role.", ephemeral: true });
                }
            case 'Purdue':
                if (hasRole)
                    return interaction.reply({
                        content: "You already have this role.",
                        ephemeral: true
                    });
                else
                    return interaction.reply({
                        content: `Use the command **/verify** in any channel to verify your purdue email and receive the Purdue role.`,
                        ephemeral: true
                    });
            case 'Non-Purdue':
                let hasPurdueRole = checkIfGuildMemberHasRole(guildMember, 'Purdue');
                if (hasRole) {
                    guildMember.roles.remove(discordRole);
                    return interaction.reply({
                        content: `You successfully removed the role **${discordRole.name}** from yourself.`,
                        ephemeral: true
                    });
                }
                else {
                    if (hasPurdueRole)
                        return interaction.reply({
                            content: "You cannot receive this role because you already have the role 'Purdue'.",
                            ephemeral: true
                        });
                    else {
                        guildMember.roles.add(discordRole);
                        return interaction.reply({
                            content: `You successfully applied the role **${discordRole.name}** to yourself.`,
                            ephemeral: true
                        });
                    }
                }
            default:
                if (hasRole) {
                    guildMember.roles.remove(discordRole);
                    return interaction.reply({
                        content: `You successfully removed the role **${discordRole.name}** from yourself.`,
                        ephemeral: true
                    });
                }
                else {
                    guildMember.roles.add(discordRole);
                    return interaction.reply({
                        content: `You successfully applied the role **${discordRole.name}** to yourself.`,
                        ephemeral: true
                    });
                }
        }
    });
}
exports.requestRole = requestRole;
function checkIfGuildMemberHasRole(guildMember, roleName) {
    return __awaiter(this, void 0, void 0, function* () {
        let hasRole;
        let userRoleCache;
        let cachedRoleName;
        hasRole = false;
        userRoleCache = guildMember.roles.cache;
        userRoleCache.forEach((Role) => {
            cachedRoleName = Role.name;
            if (cachedRoleName === roleName) {
                hasRole = true;
            }
        });
        return hasRole;
    });
}
