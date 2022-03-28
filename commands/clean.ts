import {SlashCommandBuilder} from "@discordjs/builders";
import * as config from "../config.json";
import {CommandInteraction, TextChannel} from "discord.js";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("clean")
        .setDescription("Deletes messages")
        .setDefaultPermission(false)
        .addIntegerOption((integer) => integer
            .setName("count")
            .setDescription("The number of messages to delete")
            .setMaxValue(100)
        )
    ,

    permissions: [
        {
            id: config.roles.pugg_officer,
            type: 'ROLE',
            permission: true
        },
        {
            id: config.roles.esports_officer,
            type: 'ROLE',
            permission: true
        },
        {
            id: config.roles.casual_officer,
            type: 'ROLE',
            permission: true
        }
    ],

    async execute(interaction: CommandInteraction) {
        const count = interaction.options.getInteger("count");
        let messages = await interaction.channel.messages.fetch({limit: count})
        let deletedMessages = await (interaction.channel as TextChannel).bulkDelete(messages, true);

        if (count != deletedMessages.size) {
            let remainingMessages = await interaction.channel.messages.fetch({limit: count - deletedMessages.size});
            await remainingMessages.forEach(message => {
                message.delete();
            })
        }

        if (count > 1) await interaction.reply({content: `${count} messages were deleted.`, ephemeral: true});
        else await interaction.reply({content: `1 message was deleted.`, ephemeral: true});
    }
}