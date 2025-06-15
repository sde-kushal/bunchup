import { ButtonInteraction, CacheType, Client } from "discord.js"

export type DiscordButtonType =
    | "pagination"
    | "accept"
    | "decline"
    | "trigger"
    | "offer"
    | "admin"


export type DiscordButtonActionParams = {
    interaction: ButtonInteraction<CacheType>,
    client: Client,
    key: string
}