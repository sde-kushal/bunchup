import { ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder } from "@discordjs/builders"
import { EmbedFieldLabel } from "constants/embedFields"
import { OfferCacheData } from "constants/localTypes"
import { APIActionRowComponent, APIButtonComponent, APIChannelSelectComponent, APIMentionableSelectComponent, APIMessageComponentEmoji, APIRoleSelectComponent, APIStringSelectComponent, APITextInputComponent, APIUserSelectComponent, ButtonStyle, ColorResolvable, EmbedAuthorOptions, EmbedBuilder } from "discord.js"
import { tagDiscordUser } from "./tagDiscordUser"
import { getOfferApplicationSummaryBeautified } from "./descriptionGenerators"

export type StringSelectMenuOption = {
    label: string
    value: string
    emoji?: APIMessageComponentEmoji
    description?: string
    default?: true
}

export type ActionRowButtons = {
    category: "buttons"
    data: {
        type: "success" | "fail" | "neutral" | "primary",
        id: string
        label?: string
        emoji?: string
        disabled?: boolean
    }[]
}

export type ActionRowDropdowns = {
    category: "dropdown"
    data: {
        id: string
        placeholder: string
        disabled?: boolean
        minValues?: number
        maxValues?: number
        options: StringSelectMenuOption[]
    }
}

type EmbedProperties = {
    embed: {
        title?: string
        timestamp?: true
        color?: ColorResolvable
        author?: EmbedAuthorOptions
        description?: string
        image?: string
        thumbnail?: string
        url?: string
        fields?: {
            name: EmbedFieldLabel,
            value: string,
            inline?: true
        }[]
    },
    actions?: (ActionRowButtons | ActionRowDropdowns)[]
}

export const generateEmbed = ({ data: { embed, actions } }: { data: EmbedProperties }) => {
    let actionRows: APIActionRowComponent<APIButtonComponent | APIChannelSelectComponent | APIMentionableSelectComponent | APIRoleSelectComponent | APIStringSelectComponent | APIUserSelectComponent | APITextInputComponent>[] = [];

    // EMBED ===========================================
    const embedBuilder = new EmbedBuilder();

    if (embed.color) embedBuilder.setColor(embed.color);
    if (embed.author) embedBuilder.setAuthor(embed.author);
    if (embed.description) embedBuilder.setDescription(embed.description);
    if (embed.fields) embedBuilder.setFields(embed.fields);
    if (embed.image) embedBuilder.setImage(embed.image);
    if (embed.thumbnail) embedBuilder.setThumbnail(embed.thumbnail);
    if (embed.timestamp) embedBuilder.setTimestamp();
    if (embed.title) embedBuilder.setTitle(embed.title);
    if (embed.url) embedBuilder.setURL(embed.url);


    if (actions && actions.length > 0) {
        actionRows = actions.map((action) => {

            // BUTTON ACTIONS ===========================================
            if (action.category === "buttons") {
                const buttonsRow = action.data.map(({ type, id, label, disabled, emoji }) => {
                    const builder = new ButtonBuilder()
                        .setCustomId(id)
                        .setDisabled(disabled !== undefined ? disabled : false)
                        .setStyle(
                            type === "fail" ? ButtonStyle.Danger
                                : type === "neutral" ? ButtonStyle.Secondary
                                    : type === "success" ? ButtonStyle.Success
                                        : type === "primary" ? ButtonStyle.Primary
                                            : ButtonStyle.Link
                        );

                    if (label) builder.setLabel(label);
                    if (emoji) builder.setEmoji({ id: emoji });

                    return builder;
                });

                return new ActionRowBuilder().addComponents(buttonsRow).toJSON();
            }

            // DROPDOWNS ================================================
            else {
                const dropdown = action.data;
                const dropdownRow = new StringSelectMenuBuilder()
                    .setCustomId(dropdown.id)
                    .setPlaceholder(dropdown.placeholder)
                    .setOptions(
                        dropdown.options.map(({ value, default: defaultSelected, description, emoji, label }) => ({
                            label, value, description, emoji, default: defaultSelected
                        }))
                    );

                if (dropdown.disabled) dropdownRow.setDisabled(true);
                if (dropdown.minValues) dropdownRow.setMinValues(dropdown.minValues);
                if (dropdown.maxValues) dropdownRow.setMaxValues(dropdown.maxValues);

                return new ActionRowBuilder().addComponents(dropdownRow).toJSON();
            }
        });
    }

    return { embed: embedBuilder, rows: actionRows };
}



// CUSTOM TEMPLATE EMBEDS ##########################################
export const generateCustomEmbed = {
    offerApplicationDataEmbed: ({ userId, data }: { userId: string, data: OfferCacheData }) => ({
        color: "Random" as ColorResolvable,
        description:
            `**APPLICANT PROFILE**\n${tagDiscordUser(userId)}\n\n` +
            getOfferApplicationSummaryBeautified(data),
        thumbnail: data.event.details.image || undefined
    })
};