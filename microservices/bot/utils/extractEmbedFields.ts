import { EmbedFieldLabel } from "constants/embedFields";
import { Embed } from "discord.js";

export const extractEmbedFields = (embed: Embed) =>
    embed && embed.fields
        ? embed.fields.reduce(
            (acc, field) => (acc = {
                ...acc,
                [field.name as EmbedFieldLabel]:
                    (field.name as EmbedFieldLabel) === "User"
                        ? (field.value.match(/\d+/)?.[0] || field.value)
                        : field.value
            }),
            {} as Record<EmbedFieldLabel, string>
        )
        : null;