import { Injectable } from "@nestjs/common";
import { fetchActiveVerifiedBusinesses } from "api/adminOnly";
import { DISCORD_ADMIN_ROLE_ID } from "constants/env";
import { KafkaKey } from "constants/kafka";
import { BUSINESS_DATA_LIMIT } from "constants/limits";
import { EMOJI } from "constants/media";
import { REDIS_DB_INDEX } from "constants/redis";
import { CacheType, ColorResolvable, GuildMember, Interaction, InteractionEditReplyOptions, InteractionReplyOptions, RepliableInteraction } from "discord.js";
import { RedisService } from "src/_redis/redis.service";
import { buttonKeys } from "utils/buttonKeys";
import { generateEmbed } from "utils/generateEmbed";
import { getUsTime } from "utils/getDate";
import { tagDiscordUser } from "utils/tagDiscordUser";

@Injectable()
export class DiscordTemplateService {
    constructor(private redisService: RedisService) { }

    async paginatedActiveBusinessList({ interaction, currIndex, editReply }: { interaction: Interaction, currIndex: number, editReply?: boolean }) {
        const user = interaction.member as GuildMember | null;
        const isEditable = editReply !== undefined ? editReply : false;

        if (user && interaction.isRepliable()) {
            const isAdmin = user.roles.cache.has(DISCORD_ADMIN_ROLE_ID);
            // block non-admins --------------
            if (!isAdmin) {
                this.interactionReply({
                    data: {
                        content: `🚫 You are not an admin. Only admins can use this command.`,
                    },
                    editReply: isEditable,
                    interaction
                });
            }

            // return for admins -------------
            else {
                const cacheCount = await this.redisService.getValue({
                    db: REDIS_DB_INDEX.DATA_SIZE,
                    key: "business"
                });

                if (!cacheCount || isNaN(parseInt(cacheCount)) || parseInt(cacheCount) === 0)
                    await this.interactionReply({
                        interaction,
                        editReply: isEditable,
                        data: {
                            content: `There are no active verified businesses yet.`,
                        },
                    });

                else {
                    const count = parseInt(cacheCount);
                    const limit = BUSINESS_DATA_LIMIT;
                    const pages = Math.floor(count / limit) + (count % limit === 0 ? 0 : 1);

                    const data = await fetchActiveVerifiedBusinesses({ limit, index: currIndex });

                    const dataDescription = data
                        .map((el, i) => `🚀  **${limit * currIndex + i + 1}.  ${el.companyName}**
•  Creator: ${el.userId ? tagDiscordUser(el.userId) : "~~Removed~~"}
•  Name: \`${el.contactName}\`
•  Email: \`${el.contactEmail}\`
•  Number: \`${el.contactNumber}\`
•  Created on: \`${getUsTime(el.createdAt)}\``)
                        .join("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

                    const { embed, rows } = this.paginatedDataEmbed({
                        description: dataDescription,
                        currIndex,
                        pages,
                        color: "Gold",
                        key: "business"
                    });

                    await this.interactionReply({
                        editReply: isEditable,
                        interaction,
                        data: {
                            embeds: [embed],
                            components: rows
                        }
                    });
                }
            }
        }
    }

    private paginatedDataEmbed({
        currIndex,
        description,
        pages,
        title,
        color,
        thumbnail,
        image,
        key
    }: { key: KafkaKey, color: ColorResolvable, title?: string, currIndex: number, pages: number, description: string, thumbnail?: string, image?: string }) {
        return generateEmbed({
            data: {
                embed: { color, title, description, thumbnail, image },
                actions: [
                    {
                        category: "buttons",
                        data: [
                            { id: buttonKeys.pagination.generate({ index: 0, misc: "eb", type: key }), emoji: EMOJI.EXTREME_BACK_BUTTON, type: "neutral", disabled: currIndex === 0 },
                            { id: buttonKeys.pagination.generate({ index: currIndex - 1, misc: "b", type: key }), emoji: EMOJI.BACK_BUTTON, type: "primary", disabled: currIndex === 0 },
                            { id: "neutral", label: `${currIndex + 1}/${pages}`, type: "neutral", disabled: true },
                            { id: buttonKeys.pagination.generate({ index: currIndex + 1, misc: "n", type: key }), emoji: EMOJI.NEXT_BUTTON, type: "primary", disabled: currIndex === pages - 1 },
                            { id: buttonKeys.pagination.generate({ index: pages - 1, misc: "en", type: key }), emoji: EMOJI.EXTREME_NEXT_BUTTON, type: "neutral", disabled: currIndex === pages - 1 },
                        ]
                    }
                ]
            }
        });
    }

    private offerApplication({ index, }: { index: "summary" | "details" | "image" | "timings" | "monetary" | "confirm" }) {

    }

    private async interactionReply({ interaction, data, editReply }: {
        interaction: RepliableInteraction<CacheType>
    } & (
            | { data: InteractionReplyOptions, editReply: false }
            | { data: InteractionEditReplyOptions, editReply: true }
        )) {
        // @ts-ignore
        if (editReply) await interaction.update({ ...data, flags: 64 });
        else await interaction.reply({ ...data, flags: 64 });
    }
}