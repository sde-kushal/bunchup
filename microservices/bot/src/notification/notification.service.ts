import { Injectable } from "@nestjs/common";
import { Client, SendableChannels } from "discord.js";
import { DiscordService } from "src/_discord/discord.service";
import { buttonKeys } from "utils/buttonKeys";
import { delay } from "utils/delay";
import { generateCustomEmbed, generateEmbed } from "utils/generateEmbed";
import { AdminApplicationType } from "./types";
import { RedisService } from "src/_redis/redis.service";
import { REDIS_DB_INDEX } from "constants/redis";
import { OfferCacheData } from "constants/localTypes";
import { getOfferApplicationSummaryBeautified } from "utils/descriptionGenerators";
import { tagDiscordUser } from "utils/tagDiscordUser";


@Injectable()
export class NotificationService {
    private client: Client;

    constructor(
        private discordService: DiscordService,
        private redisService: RedisService
    ) {
        this.client = discordService.getClient();
    }

    async adminNewApplication({ channelId, data, type }: { data: any[], channelId: string, type: AdminApplicationType }) {
        const channel = await this.client.channels.fetch(channelId);
        if (data && channel && channel.isSendable()) {
            if (type === "business") await this.adminNewBusinessApplication({ data, channel });
            else if (type === "offer") await this.adminNewOfferApplication({ data, channel });
        }

        return { data, type }

        return true;
    }

    private async adminNewBusinessApplication({ data, channel }: { data: any[], channel: SendableChannels }) {
        const n = data.length;
        for (let i = 0; i < n; i += 4) {
            await Promise.all(
                Array.from({ length: Math.min(n - i, 4) }).map((_, j) => {
                    const { embed, rows } = generateEmbed({
                        data: {
                            embed: {
                                fields: [
                                    { name: "User", value: tagDiscordUser(data[i + j]?.user_id), inline: true },
                                    { name: "Company Name D/B/A", value: data[i + j]?.company, inline: true },
                                    { name: "Contact Name", value: data[i + j]?.name, inline: true },
                                    { name: "Contact Email", value: data[i + j]?.email, inline: true },
                                    { name: "Contact Number", value: data[i + j]?.number, inline: true },
                                ],
                                color: "Random"
                            },
                            actions: [
                                {
                                    category: "buttons",
                                    data: [
                                        {
                                            id: buttonKeys.accept.generate({ type: "business", userId: data[i + j]?.user_id }),
                                            label: "Accept",
                                            type: "success"
                                        },
                                        {
                                            id: buttonKeys.decline.generate({ type: "business", userId: data[i + j]?.user_id }),
                                            label: "Decline",
                                            type: "fail"
                                        }
                                    ]
                                }
                            ]
                        }
                    });

                    return channel.send({
                        embeds: [embed],
                        components: rows,
                        allowedMentions: { parse: [] }
                    });
                })
            );

            await delay(1000);
        }
    }

    private async adminNewOfferApplication({ data, channel }: { data: string[], channel: SendableChannels }) {
        const n = data.length;
        for (let i = 0; i < n; i += 4) {
            const caches = await Promise.allSettled(
                Array.from({ length: Math.min(n - i, 4) }).map(async (_, j) => ({
                    data: await this.redisService.getValue({
                        db: REDIS_DB_INDEX.OFFERS,
                        key: data[i + j]
                    }),
                    userId: data[i + j].split("-")[1]
                }))
            );

            const applications = caches
                .filter((cache) => cache.status === "fulfilled")
                .filter((cache) => cache.value.data ? true : false)
                .map((cache) => ({
                    userId: cache.value.userId,
                    application: JSON.parse(cache.value.data as string) as OfferCacheData
                }));

            console.log(caches)
            console.log(applications)

            await Promise.allSettled(
                Array.from({ length: Math.min(n - i, 4, applications.length) }).map((_, j) => {
                    const { embed, rows } = generateEmbed({
                        data: {
                            embed: generateCustomEmbed.offerApplicationDataEmbed({
                                data: applications[j].application,
                                userId: applications[j].userId
                            }),
                            actions: [
                                {
                                    category: "buttons",
                                    data: [
                                        {
                                            id: buttonKeys.admin.generate({ type: "offer", stage: "plugin", element: "stage", misc: applications[j].userId }),
                                            label: "Accept",
                                            type: "success"
                                        },
                                        {
                                            id: buttonKeys.decline.generate({ type: "offer", userId: applications[j].userId }),
                                            label: "Reject",
                                            type: "fail"
                                        }
                                    ]
                                }
                            ]
                        }
                    });

                    return channel.send({
                        embeds: [embed],
                        components: rows,
                        allowedMentions: { parse: [] }
                    });
                })
            );

            await delay(1000);
        }
    }
}