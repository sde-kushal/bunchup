import { config } from "dotenv";
config();

export const PORT = process.env.PORT || "";
export const HOST = process.env.HOST || '0.0.0.0';

export const KAFKA_BROKER = process.env.KAFKA_BROKER || "";

export const DISCORD_ENDPOINT = process.env.DISCORD_MICROSERVICE || "";

export const DISCORD_CHANNEL_ID = {
    BUSINESS_APPLICATION: process.env.DISCORD_BUSINESS_APPLICATION_CHANNEL_ID || "",
    OFFER_APPLICATION: process.env.DISCORD_OFFER_APPLICATION_CHANNEL_ID || "",
    GENERAL: process.env.DISCORD_GENERAL_CHANNEL_ID || "",
    PUBLIC_ANNOUNCEMENT: process.env.DISCORD_PUBLIC_ANNOUNCEMENTS_CHANNEL_ID || "",
    ALL_OFFERS: process.env.DISCORD_ALL_OFFERS_CHANNEL_ID || "",
    GROUP_PERFORMANCE: process.env.DISCORD_GROUP_PERFORMANCE_CHANNEL_ID || "",
};


export const REDIS_URL = process.env.REDIS_URL || "";

export const AIRTABLE_ACCESS_TOKEN = process.env.AIRTABLE_ACCESS_TOKEN || "";
export const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "";