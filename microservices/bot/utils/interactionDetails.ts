import { Interaction } from "discord.js";
import { Channel, channelType } from "./channelType";

type InteractionDetails<T> = {
    user?: {
        id: T,
        username: T,
        globalName: T
    },
    guild?: {
        id: T,
        name: T,
    },
    channel?: {
        id: T,
        name: T,
        type: T extends boolean
        ? boolean
        : { type: Channel, inForum: boolean }
    },
    commandName?: T,
};

export const interactionDetails = ({ interaction, details }: {
    interaction: Interaction,
    details: InteractionDetails<boolean>
}) => {
    let data: InteractionDetails<string | null> = {};

    if (interaction.user) {
        data.user = {
            id: interaction.user.id,
            username: interaction.user.username,
            globalName: interaction.user.globalName || interaction.user.username,
        };
    }
    if (interaction.guild) {
        data.guild = {
            id: interaction.guild.id,
            name: interaction.guild.name,
        };
    }
    if (interaction.channel) {
        data.channel = {
            id: interaction.channel.id,
            // @ts-ignore
            name: interaction.channel?.name || null,
            type: channelType(interaction)
        };
    }
    if (details.commandName && interaction.isCommand()) {
        data.commandName = interaction.commandName;
    }

    return data;
}