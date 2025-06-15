import { Injectable } from "@nestjs/common";
import { EmbedFieldLabel } from "constants/embedFields";
import { OfferCacheData } from "constants/localTypes";
import { REDIS_DB_INDEX } from "constants/redis";
import { ROLE_NAMES } from "constants/roles";
import { ButtonInteraction, CacheType, Client, ModalSubmitInteraction, StringSelectMenuInteraction, } from "discord.js";
import { DiscordButtonType } from "src/_discord/buttons/types";
import { KafkaService } from "src/_kafka/kafka.service";
import { RedisService } from "src/_redis/redis.service";
import { OfferService } from "src/requests/offer/request.offer.service";
import { extractEmbedFields } from "utils/extractEmbedFields";
import { generateCustomEmbed, generateEmbed } from "utils/generateEmbed";
import { redisKeys } from "utils/redisKeys";
import { tagDiscordUser } from "utils/tagDiscordUser";
import { AdminActionStages } from "./types";
import { EmptyDropdownError, RedisNullValueError } from "constants/errors";
import { buttonKeys, dropdownKeys } from "utils/buttonKeys";
import { ForumChannelGroupCategory } from "./commands/types";
import { generateModal } from "utils/generateModal";
import { MODALS, ModalType } from "constants/modals";
import { toSlug } from "utils/toSlug";
import { requestForumChannelCreate } from "api/adminOnly";

const KEYS = {
    OFFERS: { plugin: "plugin", start: "start" }
};
const SUBKEYS = {
    OFFERS: {
        START: { stage: "stage" },
        PLUGIN: { stage: "stage", dropdown: "category", details: "details" }
    }
};

type AdminOfferDetailsFields = { "offer-name": string };

@Injectable()
export class AdminService {
    constructor(
        private kafkaService: KafkaService,
        private redisService: RedisService,
        private offerService: OfferService
    ) { }

    // ADMIN OFFER APPLICATION ===========================================
    async handleAdminOfferApplicationActions({ client, interaction, element, stage, userId }: { interaction: ButtonInteraction<CacheType>, client: Client, stage: AdminActionStages["offer"], element: string, userId: string }) {
        console.log({ element, stage, userId });
        if (stage === KEYS.OFFERS.start) this.handleAdminOfferStartStage({ interaction, key: element, userId })
        if (stage === KEYS.OFFERS.plugin) this.handleAdminOfferPluginStage({ interaction, key: element, userId })
    }

    private async handleAdminOfferStartStage({ key, userId, interaction }: { key: string, userId: string, interaction: ButtonInteraction<CacheType> }) {
        if (key === SUBKEYS.OFFERS.START.stage) {
            try {
                // show all description of the application as was --
                const draftRedisKey = redisKeys.offerApplication.draft(userId);
                const cache = await this.redisService.getValue({
                    db: REDIS_DB_INDEX.OFFERS,
                    key: draftRedisKey
                });

                if (!cache) throw new RedisNullValueError(`❌ [key: ${draftRedisKey}, db: ${REDIS_DB_INDEX.OFFERS}] not found`);
                const offerData = JSON.parse(cache) as OfferCacheData;

                const dataEmbed = generateCustomEmbed.offerApplicationDataEmbed({ userId, data: offerData });
                const { embed, rows } = generateEmbed({
                    data: {
                        embed: dataEmbed,
                        actions: [
                            {
                                category: "buttons",
                                data: [
                                    {
                                        id: buttonKeys.admin.generate({
                                            type: "offer",
                                            stage: KEYS.OFFERS.plugin,
                                            element: SUBKEYS.OFFERS.PLUGIN.stage,
                                            misc: userId
                                        }),
                                        label: "Accept",
                                        type: "success"
                                    },
                                    {
                                        id: buttonKeys.decline.generate({ type: "offer", userId: userId }),
                                        label: "Decline",
                                        type: "fail"
                                    }
                                ]
                            }
                        ]
                    }
                });

                interaction.update({
                    embeds: [embed],
                    components: rows
                });
            }
            catch (err) {
                console.error(`Error in start stage of admin offer application: ${err.message || err}`);
            }
        }
    }

    private async handleAdminOfferPluginStage({ key, userId, interaction }: { key: string, userId: string, interaction: ButtonInteraction<CacheType> | StringSelectMenuInteraction<CacheType> | ModalSubmitInteraction<CacheType> }) {
        if (key === SUBKEYS.OFFERS.PLUGIN.stage) {
            try {
                /* i prioritize sequential query over parallel querying bcz this is not
                 a function that will always be under heavy load */
                
                 // show select menu for activity groups and a button to add a new category instead
                const cachedActivityGroups = await this.redisService.getValue({
                    db: REDIS_DB_INDEX.DATA_SIZE,
                    key: redisKeys.activityGroup.groups
                });
                // -- this is also RedisNullValueError however EmptyDropdownError handler is more needed --
                if (!cachedActivityGroups) throw new EmptyDropdownError(`❌ Categories dropdown has no values`);

                const activityGroups = JSON.parse(cachedActivityGroups) as ForumChannelGroupCategory[];
                if (activityGroups.length === 0) throw new EmptyDropdownError(`❌ Categories dropdown has no values`);

                const redisKey = redisKeys.offerApplication.draft(userId);
                const cache = await this.redisService.getValue({
                    db: REDIS_DB_INDEX.OFFERS,
                    key: redisKey
                });
                if (!cache) throw new RedisNullValueError(`❌ [key: ${redisKey}, db: ${REDIS_DB_INDEX.OFFERS}] not found`)
                const offerData = JSON.parse(cache) as OfferCacheData;

                // check submission eligibility
                const cachedAdminDraft = await this.redisService.getValue({
                    db: REDIS_DB_INDEX.OFFERS,
                    key: redisKeys.offerApplication.adminDraft(userId)
                });
                const adminDraft = cachedAdminDraft
                    ? JSON.parse(cachedAdminDraft) as { name: string, parentId: string }
                    : null;

                const isSubmittable: boolean = adminDraft && adminDraft.name.length > 0 && adminDraft.parentId.length > 0 ? true : false;

                const { embed, rows } = generateEmbed({
                    data: {
                        embed: {
                            description:
                                `**Submit these details to create offer**
- **Group Category**
- **Forum Channel Name and Rate Limit**`,
                            fields: [
                                { name: "User", value: tagDiscordUser(userId), inline: true },
                                { name: "Event Name", value: offerData.event.details.name, inline: true },
                            ],
                            color: "Blurple"
                        },
                        actions: [
                            {
                                category: "buttons",
                                data: [
                                    {
                                        id: dropdownKeys.admin.generate({
                                            type: "offer",
                                            stage: KEYS.OFFERS.plugin,
                                            element: SUBKEYS.OFFERS.PLUGIN.details,
                                            misc: userId
                                        }),
                                        type: "primary",
                                        label: "Forum Channel Details"
                                    }
                                ]
                            },
                            {
                                category: "dropdown",
                                data: {
                                    id: buttonKeys.admin.generate({
                                        type: "offer",
                                        stage: KEYS.OFFERS.plugin,
                                        element: SUBKEYS.OFFERS.PLUGIN.dropdown,
                                        misc: userId
                                    }),
                                    options: activityGroups.map(({ name, id }) => ({ label: name, value: id })),
                                    placeholder: "Select Group Category"
                                }
                            },
                            {
                                category: "buttons",
                                data: [
                                    {
                                        id: buttonKeys.admin.generate({
                                            type: "offer",
                                            stage: KEYS.OFFERS.start,
                                            element: SUBKEYS.OFFERS.START.stage,
                                            misc: userId
                                        }),
                                        type: "neutral",
                                        label: "Go Back"
                                    },
                                    {
                                        id: buttonKeys.accept.generate({ type: "offer", userId }),
                                        type: "success",
                                        label: "Confirm",
                                        disabled: !isSubmittable
                                    },
                                    {
                                        id: buttonKeys.decline.generate({ type: "offer", userId }),
                                        type: "fail",
                                        label: "Reject"
                                    }
                                ]
                            }
                        ]
                    }
                });

                // @ts-ignore
                interaction.update({
                    embeds: [embed],
                    components: rows
                });
            }
            catch (err) {
                if (err instanceof EmptyDropdownError) {
                    const { embed, rows } = generateEmbed({
                        data: {
                            embed: {
                                description: `There are **no active group categories** in the server. Start by adding one.`,
                                color: "Red"
                            },
                            actions: [
                                {
                                    category: "buttons",
                                    data: [
                                        {
                                            id: buttonKeys.admin.generate({
                                                type: "offer",
                                                stage: KEYS.OFFERS.start,
                                                element: SUBKEYS.OFFERS.START.stage,
                                                misc: userId
                                            }),
                                            type: "neutral",
                                            label: "Go Back"
                                        },
                                        {
                                            id: buttonKeys.decline.generate({ type: "offer", userId }),
                                            type: "fail",
                                            label: "Reject"
                                        }
                                    ]
                                }
                            ]
                        }
                    });

                    // @ts-ignore
                    interaction.update({
                        embeds: [embed],
                        components: rows,
                    });
                }
                else {
                    console.error(`Error in plugin stage of admin offer application: ${err.message || err}`);
                }
            }
        }


        // handle dropdown -------
        else if (key === SUBKEYS.OFFERS.PLUGIN.dropdown) {
            if ("values" in interaction) {
                const groupCategoryId = interaction.values[0];
                const adminRedisKey = redisKeys.offerApplication.adminDraft(userId);

                let adminDraft: { name: string, parentId: string } = { name: "", parentId: "" };

                const cachedAdmin = await this.redisService.getValue({
                    db: REDIS_DB_INDEX.OFFERS,
                    key: adminRedisKey
                });
                if (cachedAdmin) adminDraft = JSON.parse(cachedAdmin);

                adminDraft = { ...adminDraft, parentId: groupCategoryId };
                await this.redisService.setValue({
                    db: REDIS_DB_INDEX.OFFERS,
                    key: adminRedisKey,
                    value: JSON.stringify(adminDraft)
                });

                return this.handleAdminOfferPluginStage({ interaction, key: SUBKEYS.OFFERS.PLUGIN.stage, userId });
            }
        }


        // show modal -------
        else if (key === SUBKEYS.OFFERS.PLUGIN.details) {
            const modal = generateModal({
                id: MODALS.ADMIN_ONLY_OFFER_APPLICATION_DETAILS.customId,
                title: MODALS.ADMIN_ONLY_OFFER_APPLICATION_DETAILS.title,
                fields: MODALS.ADMIN_ONLY_OFFER_APPLICATION_DETAILS.fields
            });

            // @ts-ignore
            interaction.showModal(modal);
        }
    }



    // MODAL HANDLERS ==============================
    async handleModal(interaction: ModalSubmitInteraction<CacheType>, type: ModalType) {
        let inputFields = {};

        MODALS[type].fields.forEach(({ id }) => {
            inputFields[id] = interaction.fields.getTextInputValue(id);
        });

        if (type === "ADMIN_ONLY_OFFER_APPLICATION_DETAILS") this.handleForumCategoryDetailsModal({ interaction, userId: interaction.user.id, inputFields: inputFields as AdminOfferDetailsFields });
    }


    private async handleForumCategoryDetailsModal({ inputFields, interaction, userId }: { interaction: ModalSubmitInteraction<CacheType>, userId: string, inputFields: AdminOfferDetailsFields }) {
        try {
            const sluggedOfferName = toSlug(inputFields["offer-name"]);
            const adminRedisKey = redisKeys.offerApplication.adminDraft(userId);
            let adminDraft: { name: string, parentId: string } = { name: "", parentId: "" };

            const cachedAdmin = await this.redisService.getValue({
                db: REDIS_DB_INDEX.OFFERS,
                key: adminRedisKey
            });
            if (cachedAdmin) adminDraft = JSON.parse(cachedAdmin);

            adminDraft = { ...adminDraft, name: sluggedOfferName };
            await this.redisService.setValue({
                db: REDIS_DB_INDEX.OFFERS,
                key: adminRedisKey,
                value: JSON.stringify(adminDraft)
            });

            return this.handleAdminOfferPluginStage({ interaction, key: SUBKEYS.OFFERS.PLUGIN.stage, userId });
        }
        catch (err) {
            console.error(`Err: ${err.message || err}`);
        }
    }




    // DROPDOWN HANDLERS ==============================
    async handleDropdowns(interaction: StringSelectMenuInteraction<CacheType>, key: string) {
        const { stage, type, misc: userId, element } = dropdownKeys.admin.breakdown(key);
        if (type === "offer") {
            if (stage === KEYS.OFFERS.plugin && element === SUBKEYS.OFFERS.PLUGIN.dropdown)
                this.handleAdminOfferPluginStage({ userId, interaction, key: element });
        }
    }


    // ACCEPT + DECLINE BUTTONS ===========================================
    async handleBusinessApplicationButtonAction({ userId, interaction, status, client }: { status: DiscordButtonType, userId: string, client: Client, interaction: ButtonInteraction<CacheType> }) {
        const guild = interaction.guild;
        if (!guild) return;

        const member = await guild.members.fetch(userId).catch(() => null);
        const targetUser = await client.users.fetch(userId).catch(() => null);

        const embed = interaction.message.embeds[0];
        const fields: Record<EmbedFieldLabel, string> | null = extractEmbedFields(embed);

        const businessName = fields ? (fields['Company Name D/B/A'] || "") : "";

        if (!member || !targetUser) {
            interaction.update({ content: 'User not found. Embed will be deleted in 5s.', components: [], embeds: [] });
        }

        else if (status === "accept") {
            const role = guild.roles.cache.find(r => r.name === ROLE_NAMES.BUSINESS);
            if (role) await member.roles.add(role);

            this.kafkaService.produceMessage({
                topic: "data-create",
                key: "business",
                message: fields
            });

            targetUser.send(`✅ Your business: '${businessName}' has been verified! You can add offers now.`);
            interaction.update({ content: 'Request accepted. Embed will be deleted in 5s.', components: [], embeds: [] });
        }

        else if (status === "decline") {
            this.redisService.deleteValue({
                db: REDIS_DB_INDEX.BUSINESS_OWNERS,
                key: userId
            });

            targetUser.send(`❌ Your business: '${businessName}' verification has been declined.`);
            interaction.update({ content: 'Request declined. Embed will be deleted in 5s.', components: [], embeds: [] });
        }

        setTimeout(() => interaction.message.delete().catch(() => { }), 5000);
    }

    async handleOfferApplicationButtonAction({ userId, interaction, status, client }: { status: DiscordButtonType, userId: string, client: Client, interaction: ButtonInteraction<CacheType> }) {
        const guild = interaction.guild;
        if (!guild) return;

        const member = await guild.members.fetch(userId).catch(() => null);
        const targetUser = await client.users.fetch(userId).catch(() => null);

        if (!member || !targetUser) {
            interaction.update({ content: 'User not found. Embed will be deleted in 5s.', components: [], embeds: [] });
        }

        else if (status === "accept") {
            // on this btn click, send a request to notification.service and behave accordingly --
            // const applicationData = await this.redisService.getValue({
            //     db: REDIS_DB_INDEX.OFFERS,
            //     key: redisKeys.offerApplication.draft(userId)
            // });

            const adminCache = await this.redisService.getValue({
                db: REDIS_DB_INDEX.OFFERS,
                key: redisKeys.offerApplication.adminDraft(userId)
            });
            const adminDraft = adminCache ? JSON.parse(adminCache) as { name: string, parentId: string } : null;

            if (adminDraft) {
                const result = await requestForumChannelCreate({
                    data: {
                        name: adminDraft.name,
                        parentId: adminDraft.parentId,
                        slowmode: 10,
                        threadRateLimit: 10
                    }
                });

                if (result.status) {
                    // delete records --
                    await Promise.allSettled([
                        this.redisService.deleteValue({
                            db: REDIS_DB_INDEX.OFFERS,
                            key: redisKeys.offerApplication.draft(userId)
                        }),
                        this.redisService.deleteValue({
                            db: REDIS_DB_INDEX.OFFERS,
                            key: redisKeys.offerApplication.applied(userId)
                        }),
                        this.redisService.deleteValue({
                            db: REDIS_DB_INDEX.OFFERS,
                            key: redisKeys.offerApplication.adminDraft(userId)
                        })
                    ]);

                    targetUser.send(`✅ Your offer application has been accepted. Check out the associated forum`);
                    interaction.update({ content: 'Application accepted. Forum channel created. Embed will be deleted in 5s.', components: [], embeds: [] });


                    // ping to request.service.ts and update the set storing applied users
                    this.offerService.clearUncheckedOfferUser({ userId });
                    setTimeout(() => interaction.message.delete().catch(() => { }), 5000);
                }

            }
        }

        else if (status === "decline") {
            // delete records --
            await Promise.allSettled([
                this.redisService.deleteValue({
                    db: REDIS_DB_INDEX.OFFERS,
                    key: redisKeys.offerApplication.draft(userId)
                }),
                this.redisService.deleteValue({
                    db: REDIS_DB_INDEX.OFFERS,
                    key: redisKeys.offerApplication.applied(userId)
                }),
                this.redisService.deleteValue({
                    db: REDIS_DB_INDEX.OFFERS,
                    key: redisKeys.offerApplication.adminDraft(userId)
                })
            ]);

            targetUser.send(`❌ Your offer application has been rejected.`);
            interaction.update({ content: 'Application declined. Embed will be deleted in 5s.', components: [], embeds: [] });


            // ping to request.service.ts and update the set storing applied users
            this.offerService.clearUncheckedOfferUser({ userId });
            setTimeout(() => interaction.message.delete().catch(() => { }), 5000);
        }
    }
}