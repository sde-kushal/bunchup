import { ButtonInteraction, CacheType, Client } from "discord.js"

export type DiscordDropdownType =
    | "offer"
    | "admin"


export type DiscordButtonActionParams = {
    interaction: ButtonInteraction<CacheType>,
    client: Client,
    key: string
}