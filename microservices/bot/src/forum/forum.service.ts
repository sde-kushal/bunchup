import { Injectable } from "@nestjs/common";
import { GUILD_ID } from "constants/env";
import { TIMERS } from "constants/timers";
import { ChannelType, Client, DefaultReactionEmoji, ForumLayoutType, GuildForumTagData, SortOrderType } from "discord.js";
import { DiscordService } from "src/_discord/discord.service";
import { RedisService } from "src/_redis/redis.service";

const rateLimit = {
    min: TIMERS.FORUM_CHANNEL.RATE_LIMIT.MIN,
    max: TIMERS.FORUM_CHANNEL.RATE_LIMIT.MAX
};
const threadRateLimit = {
    min: TIMERS.FORUM_CHANNEL.THREAD_RATE_LIMIT.MIN,
    max: TIMERS.FORUM_CHANNEL.THREAD_RATE_LIMIT.MAX
};

@Injectable()
export class ForumService {
    private discordClient: Client;

    constructor(
        private redisService: RedisService,
        private discordService: DiscordService,
    ) {
        this.discordClient = this.discordService.getClient();
    }

    // create new forum -> send announcement using notification.service
    async createNewForumChannel({ categoryId, forum }: { categoryId: string, forum: { name: string, threadRateLimit: number, tags?: readonly GuildForumTagData[], slowmode: number, defaultReactionEmoji?: DefaultReactionEmoji, defaultSort?: SortOrderType } }) {
        try {
            const guild = await this.discordClient.guilds.fetch(GUILD_ID);
            const category = await guild.channels.fetch(categoryId);

            // GROUP CATEGORY CHECK --------------
            if (!category || category.type !== ChannelType.GuildCategory)
                throw new Error(`❌ Parent category not found or invalid.`)

            // FORUM NAME IS UNIQUE CHECK --------------
            const existing = guild.channels.cache.find((channel) => channel.name.toLowerCase() === forum.name.toLowerCase());
            if (existing)
                throw new Error(`❌ A channel named "${forum.name}" already exists.`);


            const forumChannel = await guild.channels.create({
                name: forum.name,
                type: ChannelType.GuildText,
                parent: category.id,
                defaultReactionEmoji: forum.defaultReactionEmoji,
                defaultSortOrder: forum.defaultSort || SortOrderType.CreationDate,
                rateLimitPerUser: Math.max(rateLimit.min, Math.min(rateLimit.max, forum.slowmode)),
                defaultThreadRateLimitPerUser: Math.max(threadRateLimit.min, Math.min(threadRateLimit.max, forum.threadRateLimit))
            });

            const forumId = forumChannel.id;
            const forumName = forumChannel.name;
            const forumParent = forumChannel.parent?.id;

            // save to postgres here...

            return {
                status: true,
                message: "Forum channel created: " + forumName
            };
        }
        catch (err) {
            console.error(`Forum channel creation failed: ${err.message || err}`);
            return {
                status: false,
                message: err.message || "Forum channel creation failed"
            };
        }
    }
}