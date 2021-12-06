import {SlashCommandBuilder, userMention} from '@discordjs/builders'
import {server_roles} from '../jsons/roles.json'
import {Client, CommandInteraction, Snowflake} from "discord.js";
import {guild_id} from "../config.json";
import {sendLogToDiscord} from "../index";
import {Log, LogType} from "../modules/Log";
import newUser from "../NewUser";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('authenticate')
        .setDescription('Authenticates email address with unique code')
        .setDefaultPermission(false)
        .addIntegerOption(integer => integer
            .setName('code')
            .setDescription('Code received in verification email.')
            .setRequired(true)),
    async execute(interaction: CommandInteraction) {
        let user; //Database User
        let code; //Unique authentication code
        let guildMember; //Discord user that initiated the interaction
        let clientInput; //The authentication code the guildMember input

        guildMember = interaction.member;
        clientInput = interaction.options.getInteger('code');
        user = await newUser.get(guildMember.id);

        if (user) {
            code = user.code;

            if (code === 0) return interaction.reply({content: "You have already been authenticated!", ephemeral: true});
            if (code !== clientInput) return interaction.reply({content: "Sorry, this code is incorrect.", ephemeral: true});

            await activateProfile(user, guildMember);
            await interaction.reply({content: "You have successfully been authenticated!", ephemeral: true});

        } else {
            await interaction.reply({content: "You need to submit an email for verification first. (/verify)", ephemeral: true});
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
 * Activates a User profile in the database and adds the verified role
 * @param user
 * @param guildMember
 */
async function activateProfile(user: newUser, guildMember) {
    let purdueRole = await guildMember.guild.roles.fetch(server_roles["purdue"]["id"]);

    user.status = true;
    user.code = 0;
    await newUser.put(user);
    await sendLogToDiscord(new Log(LogType.DATABASE_UPDATE, `Profile Activated:\nMember: ${userMention(user.id)}\nId: ${user.id}`));
    guildMember.roles.add(purdueRole);
}