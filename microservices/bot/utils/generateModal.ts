import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

export const generateModal = ({ id, title, fields }: {
    id: string,
    title: string,
    fields: {
        type: "text",
        label: string,
        id: string,
        required?: boolean,
        style?: "short" | "para"
    }[]
}): ModalBuilder => {
    const modal = new ModalBuilder()
        .setCustomId(id)
        .setTitle(title);

    const inputFields = fields.map(({ type, label, id, required, style }) => (
        type === "text"
            ? new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId(id)
                    .setLabel(label)
                    .setStyle(style === "para" ? TextInputStyle.Paragraph : TextInputStyle.Short)
                    .setRequired(required === false ? false : true)
            )
            : new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId(id)
                    .setLabel(label)
                    .setStyle(style === "para" ? TextInputStyle.Paragraph : TextInputStyle.Short)
                    .setRequired(required === false ? false : true)
            )
    ));

    modal.addComponents(inputFields);

    return modal;
}