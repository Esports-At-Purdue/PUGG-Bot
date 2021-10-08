import {tryToOpenEsportsTicket} from "../modules/Ticket";

export {
    requestRole
}

async function requestRole(interaction, roleId) {
    let discordGuild; //Discord guild in which interaction originated
    let discordRole; //Discord role that is being requested
    let guildMember; //GuildMember instance from discordUser
    let hasRole; //Whether or not the GuildMember has the requested discordRole

    discordGuild = interaction.guild;
    discordRole = await discordGuild.roles.fetch(roleId);
    guildMember = await interaction.member;
    hasRole = await checkIfGuildMemberHasRole(guildMember, discordRole.name);

    switch (discordRole.name) //Evaluate different roles
    {
        case 'Coach':
        case 'Captain':
        case 'Player':
            if (!hasRole) {
                let isVerifiedStudent = await checkIfGuildMemberHasRole(guildMember, 'Purdue');
                if (isVerifiedStudent) return await tryToOpenEsportsTicket(guildMember, discordRole, interaction);
                else {
                    return interaction.reply({
                        content: "Please verify yourself first with **/verify** in any channel.",
                        ephemeral: true
                    });
                }
            } else {
                return interaction.reply({content: "You already have this role.", ephemeral: true});
            }

        case 'Purdue':
            if (hasRole) return interaction.reply({
                content: "You already have this role.",
                ephemeral: true
            });
            else return interaction.reply({
                content: `Use the command **/verify** in any channel to verify your purdue email and receive the Purdue role.`,
                ephemeral: true
            })

        case 'Non-Purdue':
            let hasPurdueRole = checkIfGuildMemberHasRole(guildMember, 'Purdue');

            if (hasRole) {
                guildMember.roles.remove(discordRole);
                return interaction.reply({
                    content: `You successfully removed the role **${discordRole.name}** from yourself.`,
                    ephemeral: true});
            } else {
                if (hasPurdueRole) return interaction.reply({
                    content: "You cannot receive this role because you already have the role 'Purdue'.",
                    ephemeral: true});
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
            } else {
                guildMember.roles.add(discordRole);
                return interaction.reply({
                    content: `You successfully applied the role **${discordRole.name}** to yourself.`,
                    ephemeral: true
                });
            }
    }
}

async function checkIfGuildMemberHasRole(guildMember, roleName) {
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
}