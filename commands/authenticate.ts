import { SlashCommandBuilder } from '@discordjs/builders'
import { User } from '../modules/User';
import { server_roles } from '../jsons/roles.json'

module.exports = {
    data: new SlashCommandBuilder()
        .setName('authenticate')
        .setDescription('Authenticates email address with unique code')
        .addIntegerOption(integer => integer
            .setName('code')
            .setDescription('Code received in verification email.')
            .setRequired(true)),
    async execute(interaction) {
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
        user = await User.findByPk(guildMember.id);
        purdueRole = await discordGuild.roles.fetch(server_roles["purdue"]["id"]);

        if (user !== null) //Evaluate whether there is a User associated with the discord account in the DB yet
        {
            status = user.status;
            code = user.code;

            if (status) //Evaluate whether the User profile has been activated yet
            {
                return interaction.reply({
                    content: "You have already been authenticated!",
                    ephemeral: true});

            } else {
                if (code === clientInput) //Evaluate whether the code the user input matches the authentication code
                {
                    await User.update({status: true, code: 0}, {where: {id: guildMember.id}});
                    guildMember.roles.add(purdueRole);
                    return interaction.reply({
                        content: "You have successfully been authenticated!",
                        ephemeral: true});

                } else {
                    return interaction.reply({
                        content: "Sorry, this code is incorrect.",
                        ephemeral: true});

                }
            }
        } else {
            return interaction.reply({
                content: "You need to submit an email for verification first. (/verify)",
                ephemeral: true});
        }
    }
}