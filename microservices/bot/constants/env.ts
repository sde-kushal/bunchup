import { config } from "dotenv";
config();

export const PORT = process.env.PORT || "";
export const HOST = process.env.HOST || '0.0.0.0';

export const BOT_TOKEN = process.env.BOT_TOKEN || "";
export const CLIENT_ID = process.env.CLIENT_ID || "";
export const GUILD_ID = process.env.GUILD_ID || "";
export const OFFER_APPLY_CHANNEL_ID = process.env.OFFER_APPLY_CHANNEL_ID || "";
export const ADMIN_COMMANDS_CHANNEL_ID = process.env.ADMIN_COMMANDS_CHANNEL_ID || "";
export const ANNOUNCEMENTS_CHANNEL_ID = process.env.ANNOUNCEMENTS_CHANNEL_ID || "";


export const DISCORD_ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID || "";

export const REDIS_URL = process.env.REDIS_URL || "";

export const KAFKA_BROKER = process.env.KAFKA_BROKER || "";