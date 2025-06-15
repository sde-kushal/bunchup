import { Injectable } from "@nestjs/common";
import { ADMIN_COMMANDS_CHANNEL_ID } from "constants/env";
import { DiscordChannelNotFoundError, DiscordChannelNotRepliableError } from "constants/errors";
import { MODALS, ModalType } from "constants/modals";
import { REDIS_DB_INDEX } from "constants/redis";
import { ButtonInteraction, CacheType, ChannelType, Client, Interaction, ModalSubmitInteraction, SendableChannels } from "discord.js";
import { DiscordTemplateService } from "src/_discord/templates/discord.templates.service";
import { RedisService } from "src/_redis/redis.service";
import { buttonKeys } from "utils/buttonKeys";
import { generateEmbed } from "utils/generateEmbed";
import { generateModal } from "utils/generateModal";
import { redisKeys } from "utils/redisKeys";
import { ForumChannelGroupCategory } from "./types";

type ForumCategoryModalFields = { "category-name": string };
@Injectable()
export class AdminCommandService {
    constructor(
        private discordTemplateService: DiscordTemplateService,
        private redisService: RedisService
    ) { }

    async adminOnlyCreateForumCategory({ interaction }: { interaction: ButtonInteraction<CacheType> }) {
        try {
            const modal = generateModal({
                id: MODALS.ADMIN_ONLY_FORUM_CATEGORY_CREATE.customId,
                title: MODALS.ADMIN_ONLY_FORUM_CATEGORY_CREATE.title,
                fields: MODALS.ADMIN_ONLY_FORUM_CATEGORY_CREATE.fields
            });

            interaction.showModal(modal);
        }
        catch (err) {
            console.error(`Error generating modal for admin create forum category: ${err.message || err}`)
        }
    }


    async adminOnlyActiveBusinessList(interaction: Interaction) {
        this.discordTemplateService.paginatedActiveBusinessList({ interaction, currIndex: 0 });
    }


    // MODAL HANDLERS ==============================
    async handleModal(interaction: ModalSubmitInteraction<CacheType>, type: ModalType) {
        let inputFields = {};

        MODALS[type].fields.forEach(({ id }) => {
            inputFields[id] = interaction.fields.getTextInputValue(id);
        });

        if (type === "ADMIN_ONLY_FORUM_CATEGORY_CREATE") this.handleForumCategoryCreateModal({ interaction, userId: interaction.user.id, inputFields: inputFields as ForumCategoryModalFields });
    }

    private async handleForumCategoryCreateModal({ inputFields, interaction, userId }: { interaction: ModalSubmitInteraction<CacheType>, userId: string, inputFields: ForumCategoryModalFields }) {
        try {
            const categoryName = inputFields["category-name"];

            // check in redis --------
            const cachedGroupCategories = await this.redisService.getValue({
                db: REDIS_DB_INDEX.DATA_SIZE,
                key: redisKeys.activityGroup.groups
            });
            const groupCategories = (cachedGroupCategories ? JSON.parse(cachedGroupCategories) : []) as ForumChannelGroupCategory[];

            const existsInRedis = groupCategories.find(({ name }) => name.toLowerCase() === categoryName.toLowerCase());
            if (existsInRedis) throw new Error(`Forum Category already exists`);

            // check discord accepted --------
            const guild = interaction.guild;
            if (!guild) throw new Error(`Forum Category already exists`);

            await guild.channels.fetch();
            const existingCategory = guild.channels.cache.find((ch) =>
                ch.type === ChannelType.GuildCategory &&
                ch.name.toLowerCase() === categoryName.toLowerCase()
            );

            if (existingCategory) throw new Error(`Forum Category already exists`);

            // save new data --------
            const category = await guild.channels.create({
                name: categoryName,
                type: ChannelType.GuildCategory,
            });

            const updatedCachedGroupCategories = [
                ...groupCategories,
                { name: category.name, id: category.id }
            ];

            await this.redisService.setValue({
                db: REDIS_DB_INDEX.DATA_SIZE,
                key: redisKeys.activityGroup.groups,
                value: JSON.stringify(updatedCachedGroupCategories)
            });

            // notify user --------
            interaction.reply({
                content: `✅ Category: \`${category.name}\` created.`,
                flags: 64
            });
        }
        catch (err) {
            console.error(`Forum Category Admin Modal err: ${err.message || err}`);
        }
    }


    // EXECUTE ONCE BUTTONS ==============================
    async adminOnlyActionButtonsExecuteOnce({ client }: { client: Client }) {
        try {
            const channel = client.channels.cache.get(ADMIN_COMMANDS_CHANNEL_ID);
            if (!channel) throw new DiscordChannelNotFoundError(`Channel not found or not cached.`);
            if (!channel.isSendable()) throw new DiscordChannelNotRepliableError(`Channel does not have permissions to send messages.`);

            await Promise.allSettled([
                this.executeOnceActiveBusinessShow({ channel }),
                this.executeOnceForumCategoryCreate({ channel }),
            ]);
        }
        catch (err) {
            console.error(`Error creating admin action button: ${err.message || err}`);
        }
    }


    private async executeOnceForumCategoryCreate({ channel }: { channel: SendableChannels }) {
        const { embed, rows } = generateEmbed({
            data: {
                embed: {
                    color: "Greyple",
                    description: "**OFFER ACTIVITY GROUP**\nCategorize offers into logical Activity Groups.",
                },
                actions: [
                    {
                        category: "buttons",
                        data: [
                            {
                                id: buttonKeys.admin.generate({ type: "forumCategory", element: "", misc: "", stage: "" }),
                                type: "primary",
                                label: "📝 Create Offer Activity Group"
                            }
                        ]
                    }
                ]
            }
        })

        await channel.send({
            embeds: [embed],
            components: rows
        });
    }

    private async executeOnceActiveBusinessShow({ channel }: { channel: SendableChannels }) {
        const { embed, rows } = generateEmbed({
            data: {
                embed: {
                    color: "DarkOrange",
                    description: "**ACTIVE BUSINESSES**\nCurrently running verified businesses.",
                },
                actions: [
                    {
                        category: "buttons",
                        data: [
                            {
                                id: buttonKeys.admin.generate({ type: "activeBusinesses", element: "", misc: "", stage: "" }),
                                type: "primary",
                                label: "🔍 See Active Businesses"
                            }
                        ]
                    }
                ]
            }
        })

        await channel.send({
            embeds: [embed],
            components: rows
        });
    }
}