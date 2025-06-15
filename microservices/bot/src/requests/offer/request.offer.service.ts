import { Injectable } from "@nestjs/common";
import { CacheType, Client, ColorResolvable, ModalSubmitInteraction, RepliableInteraction, StringSelectMenuInteraction } from "discord.js";
import { buttonKeys, dropdownKeys } from "utils/buttonKeys";
import { ActionRowDropdowns, generateEmbed } from "utils/generateEmbed";
import { OfferApplicationStage } from "./types";
import { OFFER_APPLY_CHANNEL_ID } from "constants/env";
import { generateModal } from "utils/generateModal";
import { MODALS, ModalType } from "constants/modals";
import { EMOJI } from "constants/media";
import { RedisService } from "src/_redis/redis.service";
import { REDIS_DB_INDEX } from "constants/redis";
import { isFutureDate, isFutureHours, isPresentDate, valid24Hours } from "utils/validDatesTimes";
import { isNumber, isPositiveNumber } from "utils/validTypes";
import { KafkaService } from "src/_kafka/kafka.service";
import { OfferCacheData, OfferEventDetailsFields, OfferPricingDetailsFields, OfferRebateTierFields, OfferVenueDetailsFields, TimingStartEndDetailsFields, Week, Month } from "constants/localTypes";
import { getOfferApplicationSummaryBeautified } from "utils/descriptionGenerators";
import { redisKeys } from "utils/redisKeys";
import { EmptyDropdownError } from "constants/errors";
import { ForumChannelGroupCategory } from "src/admins/commands/types";

const OFFER_DRAFT_GROUP_CATEGORIES = "group_categories";
const APPLIED_OFFER_KEY_SECRET = "submitted";

const EMBED_COLOR: ColorResolvable = "Blurple";
const DRAFT_DATA_TTL = 6 * 3600; // 6 hours

const SUBKEYS = {
    VENUE: {},
    TIMING: { WEEKLY: "week", MONTHLY: "month" },
    PRICING: { GROUP_CATEGORIES: "category" }
};

@Injectable()
export class OfferService {
    private appliedTiersSet: Map<string, Set<number>> = new Map();
    private submittedUncheckedOfferUsers: Set<string> = new Set();
    constructor(
        private redisService: RedisService,
        private kafkaService: KafkaService
    ) { }

    async clearUncheckedOfferUser({ userId }: { userId: string }) {
        if (this.submittedUncheckedOfferUsers.has(userId))
            this.submittedUncheckedOfferUsers.delete(userId);
    }

    async offerApplicationDataManagement({ index, interaction, userId, remainderKey }: { remainderKey?: string, interaction: RepliableInteraction<CacheType>, userId: string, index: OfferApplicationStage }) {
        const offerStages: Record<OfferApplicationStage, ({ userId, interaction, remainderKey }: { remainderKey?: string, interaction: RepliableInteraction<CacheType>, userId: string }) => Promise<void>> = {
            precheck: ({ interaction, userId, remainderKey }) => this.handleOfferPreCheckStage({ interaction, userId, remainderKey }),
            venue: ({ interaction, userId, remainderKey }) => this.handleOfferDataVenueStage({ interaction, userId, remainderKey: remainderKey || "stage" }),
            timing: ({ interaction, userId, remainderKey }) => this.handleOfferDataTimingStage({ interaction, userId, remainderKey }),
            pricing: ({ interaction, userId, remainderKey }) => this.handleOfferDataPricingStage({ interaction, userId, remainderKey }),
            summary: ({ interaction, userId, remainderKey }) => this.handleOfferDataSummaryStage({ interaction, userId, remainderKey }),
            quit: ({ interaction, userId, remainderKey }) => this.handleOfferQuit({ interaction, userId, remainderKey }),
        };

        return await offerStages[index]({ interaction, userId, remainderKey });
    }

    async offerApplicationModalHandle(interaction: ModalSubmitInteraction<CacheType>, type: ModalType) {
        let inputFields = {};

        MODALS[type].fields.forEach(({ id }) => {
            inputFields[id] = interaction.fields.getTextInputValue(id);
        });

        if (type === "OFFER_VENUE_DETAILS") this.handleOfferVenueDetailsModal({ interaction, userId: interaction.user.id, inputFields: inputFields as OfferVenueDetailsFields });
        if (type === "OFFER_EVENT_DETAILS") this.handleOfferEventDetailsModal({ interaction, userId: interaction.user.id, inputFields: inputFields as OfferEventDetailsFields });
        if (type === "OFFER_TIMING_DETAILS") this.handleTimingStartEndDetailsModal({ interaction, userId: interaction.user.id, inputFields: inputFields as TimingStartEndDetailsFields });
        if (type === "OFFER_PRICING_DETAILS") this.handlePricingDetailsModal({ interaction, userId: interaction.user.id, inputFields: inputFields as OfferPricingDetailsFields });
        if (type === "OFFER_PRICING_REBATE_TIERS") this.handlePricingRebateTiersModal({ interaction, userId: interaction.user.id, inputFields: inputFields as OfferRebateTierFields });
    }

    async offerApplicationDropdownHandle(interaction: StringSelectMenuInteraction<CacheType>, key: string) {
        const { remainder, stage } = dropdownKeys.offer.breakdown(key);
        if (stage === "timing") {
            if (remainder === SUBKEYS.TIMING.WEEKLY) this.handleTimingWeeklyDropdown({ userId: interaction.user.id, interaction });
            if (remainder === SUBKEYS.TIMING.MONTHLY) this.handleTimingMonthlyDropdown({ userId: interaction.user.id, interaction });
        }
        else if (stage === "pricing") {
            if (remainder === SUBKEYS.PRICING.GROUP_CATEGORIES) this.handlePricingGroupCategoriesDropdown({ userId: interaction.user.id, interaction });
        }
    }

    async offerWelcomeStageExecuteOnce({ client, nextStage = "precheck" }: { client: Client, nextStage?: OfferApplicationStage }) {
        const channel = client.channels.cache.get(OFFER_APPLY_CHANNEL_ID);
        if (!channel) {
            console.error('Channel: #offer-apply not found or not cached.');
            return;
        }

        if (!channel.isSendable()) {
            console.error('Channel: #offer-apply does not have permissions to send messages.');
            return;
        }

        const { embed, rows } = generateEmbed({
            data: {
                embed: {
                    color: EMBED_COLOR,
                    description: "You will fill out this application which has 4 primary stages. Click continue to start",
                    title: "Offer Application - Introduction"
                },
                actions: [
                    {
                        category: "buttons",
                        data: [
                            {
                                id: buttonKeys.offer.generate({ stage: nextStage, subKey: "stage" }),
                                type: "primary",
                                label: "📝 Apply for an Offer"
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

    /*####################################################################  */
    // BUTTON + PAGINATON HANDLERS =========================================
    /*####################################################################  */

    private async handleOfferPreCheckStage({ userId, interaction, remainderKey }: { remainderKey?: string, interaction: RepliableInteraction<CacheType>, userId: string }) {
        const currStage: OfferApplicationStage = "precheck";
        const nextStage: OfferApplicationStage = "venue";

        if (remainderKey === "stage") {
            let hasOfferApplicationSubmittedButUnchecked: boolean = true;   // asume and restrict

            if (!this.submittedUncheckedOfferUsers.has(userId)) {
                const cache = await this.redisService.getValue({
                    db: REDIS_DB_INDEX.OFFERS,
                    key: redisKeys.offerApplication.applied(userId)
                });

                if (!cache || cache !== APPLIED_OFFER_KEY_SECRET)
                    hasOfferApplicationSubmittedButUnchecked = false;
                else
                    this.submittedUncheckedOfferUsers.add(userId);
            }

            // process result check --
            if (hasOfferApplicationSubmittedButUnchecked) {
                interaction.reply({
                    content: "You have already applied for an offer that is under check. Once its complete, you can apply for more offer.",
                    flags: 64
                });
            }
            else {
                const cache = await this.redisService.getValue({
                    db: REDIS_DB_INDEX.OFFERS,
                    key: redisKeys.offerApplication.draft(userId)
                });

                // ASK USER IF THEY WANT TO CONTINUE THEIR DRAFT OR START FRESH --
                if (cache) {
                    const { embed, rows } = generateEmbed({
                        data: {
                            embed: {
                                color: EMBED_COLOR,
                                description: "You have unfinished offer saved as a draft from your past. Do you want to continue or start a fresh one?",
                                title: "Offer Application - Saved Draft Found"
                            },
                            actions: [
                                {
                                    category: "buttons",
                                    data: [
                                        {
                                            id: buttonKeys.offer.generate({ stage: nextStage, subKey: "stage/update" }),
                                            type: "primary",
                                            label: "Continue Saved Draft"
                                        },
                                        {
                                            id: buttonKeys.offer.generate({ stage: currStage, subKey: "invalidate" }),
                                            type: "neutral",
                                            label: `Start New`
                                        }
                                    ]
                                }
                            ]
                        }
                    })

                    interaction.reply({
                        embeds: [embed],
                        components: rows,
                        flags: 64
                    });
                }

                // GUARANTEED NEW APPLICANT --
                else return this.handleOfferDataVenueStage({ userId, interaction, remainderKey: "stage" });
            }
        }
        else if (remainderKey === "invalidate") {
            // clear every shred of data --
            this.appliedTiersSet.delete(userId);

            await Promise.allSettled([
                this.redisService.deleteValue({
                    db: REDIS_DB_INDEX.OFFERS,
                    key: redisKeys.offerApplication.draft(userId)
                }),
                this.redisService.deleteValue({
                    db: REDIS_DB_INDEX.OFFERS,
                    key: redisKeys.offerApplication.tierDraft(userId)
                })
            ]);

            return this.handleOfferDataVenueStage({ userId, interaction, remainderKey: "stage/update" });
        }
    }

    private async handleOfferDataVenueStage({ userId, interaction, remainderKey }: { remainderKey: string, interaction: RepliableInteraction<CacheType>, userId: string }) {
        const prevStage: OfferApplicationStage = "venue";
        const currStage: OfferApplicationStage = "venue";
        const nextStage: OfferApplicationStage = "timing";

        const KEYS = { stage: "stage", updateStage: "stage/update", venue: "venue", event: "event" };

        if (remainderKey === KEYS.stage || remainderKey === KEYS.updateStage) {
            const { embed, rows } = generateEmbed({
                data: {
                    embed: {
                        color: EMBED_COLOR,
                        description: "Enter Venue Details and Event Details through the button you see below. Once complete, click 'Save & Continue'",
                        title: "Offer Application - Basic Details"
                    },
                    actions: [
                        {
                            category: "buttons",
                            data: [
                                {
                                    id: buttonKeys.offer.generate({ stage: currStage, subKey: KEYS.venue }),
                                    type: "primary",
                                    label: "Enter Venue Details"
                                },
                                {
                                    id: buttonKeys.offer.generate({ stage: currStage, subKey: KEYS.event }),
                                    type: "primary",
                                    label: "Enter Event Details"
                                }
                            ]
                        },
                        {
                            category: "buttons",
                            data: [
                                {
                                    id: buttonKeys.offer.generate({ stage: prevStage, subKey: "backBtn" }),
                                    type: "success",
                                    disabled: true,
                                    label: "◀️  Back"
                                },
                                {
                                    id: buttonKeys.offer.generate({ stage: currStage, subKey: "disabled" }),
                                    type: "neutral",
                                    disabled: true,
                                    label: `1/3`
                                },
                                {
                                    id: buttonKeys.offer.generate({ stage: nextStage, subKey: "stage" }),
                                    type: "success",
                                    label: `Next  ▶️`
                                },
                                {
                                    id: buttonKeys.offer.generate({ stage: "quit", subKey: "confirm/1" }),
                                    type: "fail",
                                    emoji: EMOJI.BIN_BUTTON
                                }
                            ]
                        }
                    ]
                }
            })

            if (remainderKey === "stage")
                interaction.reply({
                    embeds: [embed],
                    components: rows,
                    flags: 64
                });
            else
                // @ts-ignore
                interaction.update({
                    embeds: [embed],
                    components: rows,
                    flags: 64
                });
        }

        // send modal ----- 
        else if (remainderKey === KEYS.venue) {
            const modal = generateModal({
                id: MODALS.OFFER_VENUE_DETAILS.customId,
                title: MODALS.OFFER_VENUE_DETAILS.title,
                fields: MODALS.OFFER_VENUE_DETAILS.fields
            });

            // @ts-ignore
            interaction.showModal(modal);
        }

        else if (remainderKey === KEYS.event) {
            const modal = generateModal({
                id: MODALS.OFFER_EVENT_DETAILS.customId,
                title: MODALS.OFFER_EVENT_DETAILS.title,
                fields: MODALS.OFFER_EVENT_DETAILS.fields
            });

            // @ts-ignore
            interaction.showModal(modal);
        }
    }

    private async handleOfferDataTimingStage({ userId, interaction, remainderKey }: { remainderKey?: string, interaction: RepliableInteraction<CacheType>, userId: string }) {
        const prevStage: OfferApplicationStage = "venue";
        const currStage: OfferApplicationStage = "timing";
        const nextStage: OfferApplicationStage = "pricing";

        const KEYS = { stage: "stage", details: "details" };

        if (remainderKey === KEYS.stage) {
            const { embed, rows } = generateEmbed({
                data: {
                    embed: {
                        color: EMBED_COLOR,
                        description: "Enter Timing Details. Once complete, click 'Next'",
                        title: "Offer Application - Timings"
                    },
                    actions: [
                        {
                            category: "buttons",
                            data: [
                                {
                                    id: buttonKeys.offer.generate({ stage: currStage, subKey: KEYS.details }),
                                    type: "primary",
                                    label: "Enter Start & End Details"
                                }
                            ]
                        },
                        {
                            category: "dropdown",
                            data: {
                                id: dropdownKeys.offer.generate({
                                    stage: "timing",
                                    subKey: SUBKEYS.TIMING.WEEKLY
                                }),
                                minValues: 1,
                                maxValues: 7,
                                placeholder: "Repeats weekly on (select all for everyday)",
                                options: (['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as Week[])
                                    .map((day) => ({ label: day, value: day }))
                            }
                        },
                        {
                            category: "dropdown",
                            data: {
                                id: dropdownKeys.offer.generate({
                                    stage: "timing",
                                    subKey: SUBKEYS.TIMING.MONTHLY
                                }),
                                minValues: 1,
                                maxValues: 12,
                                placeholder: "Repeats monthly on (select all for full year)",
                                options: ([
                                    'January', 'February', 'March', 'April', 'May', 'June',
                                    'July', 'August', 'September', 'October', 'November', 'December'
                                ] as Month[])
                                    .map((day) => ({ label: day, value: day }))
                            }
                        },
                        {
                            category: "buttons",
                            data: [
                                {
                                    id: buttonKeys.offer.generate({ stage: prevStage, subKey: "stage/update" }),
                                    type: "success",
                                    label: "◀️  Back"
                                },
                                {
                                    id: buttonKeys.offer.generate({ stage: currStage, subKey: "disabled" }),
                                    type: "neutral",
                                    disabled: true,
                                    label: `2/3`
                                },
                                {
                                    id: buttonKeys.offer.generate({ stage: nextStage, subKey: "stage" }),
                                    type: "success",
                                    label: `Next  ▶️`
                                },
                                {
                                    id: buttonKeys.offer.generate({ stage: "quit", subKey: "confirm/2" }),
                                    type: "fail",
                                    emoji: EMOJI.BIN_BUTTON
                                }
                            ]
                        }
                    ]
                }
            })

            // @ts-ignore
            interaction.update({
                embeds: [embed],
                components: rows,
                flags: 64
            });
        }

        // send modal -----
        else if (remainderKey === KEYS.details) {
            const modal = generateModal({
                id: MODALS.OFFER_TIMING_DETAILS.customId,
                title: MODALS.OFFER_TIMING_DETAILS.title,
                fields: MODALS.OFFER_TIMING_DETAILS.fields
            });

            // @ts-ignore
            interaction.showModal(modal);
        }
    }

    private async handleOfferDataPricingStage({ userId, interaction, remainderKey }: { remainderKey?: string, interaction: RepliableInteraction<CacheType>, userId: string }) {
        const prevStage: OfferApplicationStage = "timing";
        const currStage: OfferApplicationStage = "pricing";
        const nextStage: OfferApplicationStage = "summary";

        const KEYS = { stage: "stage", tiers: "tier", details: "details", reset: "reset" };

        if (remainderKey === KEYS.stage) {
            try {
                // get active groups + total tiers given by user ----------------
                let activeGroupCategories: ForumChannelGroupCategory[] = [];

                try {
                    activeGroupCategories = await this.getCachedActivityGroups();
                    if (activeGroupCategories.length === 0) throw new EmptyDropdownError(`❌ Categories dropdown has no values`);
                }
                catch (err) {
                    if (err instanceof EmptyDropdownError) console.error(`Empty activity group array error: ${err.message || err}`);
                }

                const activityGroupdropdown: ActionRowDropdowns[] = activeGroupCategories.length > 0
                    ? [
                        {
                            category: "dropdown",
                            data: {
                                id: dropdownKeys.offer.generate({
                                    stage: currStage,
                                    subKey: SUBKEYS.PRICING.GROUP_CATEGORIES
                                }),
                                options: activeGroupCategories.map(({ name, id }) => ({ label: name, value: id })),
                                placeholder: "Eligible activity groups(default is all)",
                                minValues: 1,
                                maxValues: Math.max(1, activeGroupCategories.length)
                            }
                        }
                    ]
                    : [];

                // parse tiers ----------------------
                const tiersCache = await this.redisService.getValue({
                    db: REDIS_DB_INDEX.OFFERS,
                    key: redisKeys.offerApplication.tierDraft(userId)
                });

                const tiers = tiersCache && !isNaN(parseInt(tiersCache)) ? parseInt(tiersCache) : 0;
                let disabeldPreTiers: { type: "success" | "fail" | "neutral" | "primary"; id: string; label?: string; emoji?: string; disabled?: boolean; }[] = [];
                if (tiers > 0) disabeldPreTiers.push({ id: "start-rebate", type: "neutral", disabled: true, label: "Rebate 1" });
                if (tiers > 2) disabeldPreTiers.push({ id: "...", type: "neutral", disabled: true, label: "..." });
                if (tiers > 1) disabeldPreTiers.push({ id: "end-rebate", type: "neutral", disabled: true, label: "Rebate " + tiers });

                const { embed, rows } = generateEmbed({
                    data: {
                        embed: {
                            color: EMBED_COLOR,
                            description: "Enter Pricing Details. Once complete, click 'Next'",
                            title: "Offer Application - Pricing Details"
                        },
                        actions: [
                            {
                                category: "buttons",
                                data: [
                                    {
                                        id: buttonKeys.offer.generate({ stage: currStage, subKey: KEYS.details }),
                                        type: "primary",
                                        label: "Enter Pricing Details"
                                    }
                                ]
                            },
                            {
                                category: "buttons",
                                data: [
                                    ...disabeldPreTiers,
                                    {
                                        id: buttonKeys.offer.generate({ stage: currStage, subKey: KEYS.tiers }),
                                        type: "primary",
                                        label: "Rebate " + (tiers + 1)
                                    },
                                    {
                                        id: buttonKeys.offer.generate({ stage: currStage, subKey: KEYS.reset }),
                                        type: "neutral",
                                        label: "🔄 Reset",
                                        disabled: tiers === 0
                                    }
                                ]
                            },
                            ...activityGroupdropdown,
                            {
                                category: "buttons",
                                data: [
                                    {
                                        id: buttonKeys.offer.generate({ stage: prevStage, subKey: "stage" }),
                                        type: "success",
                                        label: "◀️  Back"
                                    },
                                    {
                                        id: buttonKeys.offer.generate({ stage: currStage, subKey: "disabled" }),
                                        type: "neutral",
                                        disabled: true,
                                        label: `3/3`
                                    },
                                    {
                                        id: buttonKeys.offer.generate({ stage: nextStage, subKey: "stage" }),
                                        type: "success",
                                        label: `Complete  ▶️`
                                    },
                                    {
                                        id: buttonKeys.offer.generate({ stage: "quit", subKey: "confirm/3" }),
                                        type: "fail",
                                        emoji: EMOJI.BIN_BUTTON
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
                    flags: 64
                });
            }
            catch (err) {
                console.error(`❌ Error in pricing stage of offer application: ${err.message || err}`);
            }
        }


        // rebate tiers ----------
        else if (remainderKey === KEYS.tiers) {
            const modal = generateModal({
                id: MODALS.OFFER_PRICING_REBATE_TIERS.customId,
                title: MODALS.OFFER_PRICING_REBATE_TIERS.title,
                fields: MODALS.OFFER_PRICING_REBATE_TIERS.fields
            });

            // @ts-ignore
            interaction.showModal(modal);
        }


        // form details --------
        else if (remainderKey === KEYS.details) {
            const modal = generateModal({
                id: MODALS.OFFER_PRICING_DETAILS.customId,
                title: MODALS.OFFER_PRICING_DETAILS.title,
                fields: MODALS.OFFER_PRICING_DETAILS.fields
            });

            // @ts-ignore
            interaction.showModal(modal);
        }


        // reset button --------
        else if (remainderKey === KEYS.reset) {
            await this.resetRebateTiers(userId);
            return this.handleOfferDataPricingStage({ userId, interaction, remainderKey: "stage" });
        }
    }

    private async handleOfferDataSummaryStage({ userId, interaction, remainderKey }: { remainderKey?: string, interaction: RepliableInteraction<CacheType>, userId: string }) {
        const prevStage: OfferApplicationStage = "pricing";
        const currStage: OfferApplicationStage = "summary";

        if (remainderKey === "stage") {
            const { description, isSubmittable, thumbnail } = await this.getSummarizedOfferDataDraft(userId);

            const { embed, rows } = generateEmbed({
                data: {
                    embed: {
                        color: EMBED_COLOR,
                        title: "OFFER DETAILS SUMMARY",
                        description,
                        thumbnail
                    },
                    actions: [
                        {
                            category: "buttons",
                            data: [
                                {
                                    id: buttonKeys.offer.generate({ stage: prevStage, subKey: "stage" }),
                                    type: "success",
                                    label: "◀️  Back"
                                },
                                {
                                    id: buttonKeys.offer.generate({ stage: "summary", subKey: "submit" }),
                                    type: "success",
                                    disabled: !isSubmittable,
                                    label: `✅  Confirm & Submit`
                                },
                                {
                                    id: buttonKeys.offer.generate({ stage: "quit", subKey: "confirm/4" }),
                                    type: "fail",
                                    emoji: EMOJI.BIN_BUTTON
                                }
                            ]
                        }
                    ]
                }
            })

            // @ts-ignore
            interaction.update({
                embeds: [embed],
                components: rows,
                flags: 64
            });
        }
        else if (remainderKey === "submit") {
            this.appliedTiersSet.delete(userId);
            this.submittedUncheckedOfferUsers.add(userId);

            Promise.allSettled([
                // RESET ALL REDIS AND SET APPLICATION KEY --
                this.redisService.deleteValue({
                    db: REDIS_DB_INDEX.OFFERS,
                    key: redisKeys.offerApplication.tierDraft(userId)
                }),
                this.redisService.setValue({
                    db: REDIS_DB_INDEX.OFFERS,
                    key: redisKeys.offerApplication.applied(userId),
                    value: APPLIED_OFFER_KEY_SECRET
                }),

                // UPDATE EXPIRY TO INF --
                this.redisService.updateExpiry({
                    db: REDIS_DB_INDEX.OFFERS,
                    key: redisKeys.offerApplication.draft(userId),
                    expiry: -1
                }),

                // SEND TO KAFKA --
                this.kafkaService.produceMessage({
                    topic: "new-form",
                    key: "offer",
                    message: { redisKey: redisKeys.offerApplication.draft(userId) }
                })
            ]);

            // @ts-ignore
            interaction.update({
                content: `This offer application is submitted ✅. Next, the admins will process your reequest. You will be notified when its updated 🔔.`,
                components: [],
                embeds: [],
                flags: 64
            });
        }
    }

    private async handleOfferQuit({ userId, interaction, remainderKey }: { remainderKey?: string, interaction: RepliableInteraction<CacheType>, userId: string }) {
        if (remainderKey?.startsWith("confirm")) {
            const index = remainderKey.split("/")[1];
            const stage: OfferApplicationStage = index === "1" ? "venue" : index === "2" ? "timing" : index === "3" ? "pricing" : "summary";

            const { embed, rows } = generateEmbed({
                data: {
                    embed: {
                        color: "Red",
                        description: "Are you sure you want to delete the application? All progress will be lost.",
                        title: "Delete Offer Application - Confirm Action"
                    },
                    actions: [
                        {
                            category: "buttons",
                            data: [
                                {
                                    id: buttonKeys.offer.generate({ stage, subKey: "stage" + (stage === "venue" ? "/update" : "") }),
                                    type: "neutral",
                                    label: "◀️  Return to " + stage
                                },
                                {
                                    id: buttonKeys.offer.generate({ stage: "quit", subKey: "quit" }),
                                    type: "fail",
                                    label: `🗑️  Confirm delete`
                                }
                            ]
                        }
                    ]
                }
            })

            // @ts-ignore
            interaction.update({
                embeds: [embed],
                components: rows,
                flags: 64
            });
        }
        else if (remainderKey === "quit") {
            this.appliedTiersSet.delete(userId);

            const [res0, _] = await Promise.all([
                this.redisService.deleteValue({
                    db: REDIS_DB_INDEX.OFFERS,
                    key: redisKeys.offerApplication.draft(userId)
                }),
                this.redisService.deleteValue({
                    db: REDIS_DB_INDEX.OFFERS,
                    key: redisKeys.offerApplication.tierDraft(userId)
                })
            ]);

            // @ts-ignore
            interaction.update({
                content: res0
                    ? `Delete successful ✅. To apply again, click on on the 'Continue' ⬆️ button above`
                    : `There was nothing to delete. Click on on the 'Continue' ⬆️ button to apply for an offer`,
                embeds: [],
                components: [],
                flags: 64
            });
        }
    }


    /*####################################################################  */
    // MODALS HANDLERS =====================================
    /*####################################################################  */
    private async handleOfferVenueDetailsModal({ userId, interaction, inputFields }: { userId: string, interaction: ModalSubmitInteraction<CacheType>, inputFields: OfferVenueDetailsFields }) {
        const cache = await this.getCacheData(userId);

        let modifiedData: OfferCacheData;
        if (cache) {
            modifiedData = JSON.parse(cache) as OfferCacheData;
            modifiedData = {
                ...modifiedData,
                venue: {
                    ...modifiedData.venue,
                    details: inputFields, // <------
                }
            };
        }
        else {
            modifiedData = {
                venue: {
                    details: inputFields, // <------
                },
                event: { details: { description: "", image: "", name: "" } },
                timing: { details: { "end-date": "", "end-time": "", "max-occurences": "", "start-date": "", "start-time": "" }, monthly: [], weekly: [] },
                pricing: { details: { "min-amount-prpp": "", "other-info": "", "retail-price": "" }, tiers: [], categories: [] }
            };
        }

        const res = await this.putCacheData(userId, modifiedData);
        if (res) interaction.deferUpdate();
    }

    private async handleOfferEventDetailsModal({ userId, interaction, inputFields }: { userId: string, interaction: ModalSubmitInteraction<CacheType>, inputFields: OfferEventDetailsFields }) {
        const cache = await this.getCacheData(userId);

        const cleanInputs: OfferEventDetailsFields = {
            ...inputFields,
            description: inputFields.description.split(" ").slice(0, 40).join(" ")
        };

        let modifiedData: OfferCacheData;
        if (cache) {
            modifiedData = JSON.parse(cache) as OfferCacheData;
            modifiedData = {
                ...modifiedData,
                event: {
                    ...modifiedData.event,
                    details: cleanInputs, // <------
                }
            };
        }
        else {
            modifiedData = {
                venue: { details: { name: "", address: "", website: "" } },
                event: {
                    details: cleanInputs // <------
                },
                timing: { details: { "end-date": "", "end-time": "", "max-occurences": "", "start-date": "", "start-time": "" }, monthly: [], weekly: [] },
                pricing: { details: { "min-amount-prpp": "", "other-info": "", "retail-price": "" }, tiers: [], categories: [] }
            };
        }

        const res = await this.putCacheData(userId, modifiedData);
        if (res) interaction.deferUpdate();
    }

    private async handleTimingStartEndDetailsModal({ userId, interaction, inputFields }: { userId: string, interaction: ModalSubmitInteraction<CacheType>, inputFields: TimingStartEndDetailsFields }) {
        // check authenticity of data =============
        if (!valid24Hours(inputFields["start-time"]) || !valid24Hours(inputFields["end-time"])) return;

        const isFuture = isFutureDate({ defaultDate: inputFields["start-date"], futureDate: inputFields["end-date"] });
        const isPresent = isPresentDate({ defaultDate: inputFields["start-date"], futureDate: inputFields["end-date"] });

        if (!isFuture && !isPresent) return;
        if (isPresent && !isFutureHours({ defaultTime: inputFields["start-time"], futureTime: inputFields["end-time"] })) return;

        if (inputFields["max-occurences"]) {
            const occ = parseInt(inputFields["max-occurences"]);
            if (isNaN(occ) || occ < 1) return;
        }


        // authentic data here-after =============
        const cache = await this.getCacheData(userId);

        let modifiedData: OfferCacheData;
        if (cache) {
            modifiedData = JSON.parse(cache) as OfferCacheData;
            modifiedData = {
                ...modifiedData,
                timing: {
                    ...modifiedData.timing,
                    details: inputFields, // <------
                }
            };
        }
        else {
            modifiedData = {
                venue: { details: { name: "", address: "", website: "" } },
                event: { details: { description: "", image: "", name: "" } },
                timing: {
                    monthly: [], weekly: [],
                    details: inputFields, // <------
                },
                pricing: { details: { "min-amount-prpp": "", "other-info": "", "retail-price": "" }, tiers: [], categories: [] }
            };
        }

        const res = await this.putCacheData(userId, modifiedData);
        if (res) interaction.deferUpdate();
    }

    private async handlePricingDetailsModal({ userId, interaction, inputFields }: { userId: string, interaction: ModalSubmitInteraction<CacheType>, inputFields: OfferPricingDetailsFields }) {
        // check authenticity of data =============
        if (!inputFields["min-amount-prpp"] && !inputFields["other-info"] && !inputFields["retail-price"]) return;
        if (inputFields["min-amount-prpp"] && !isPositiveNumber(inputFields["min-amount-prpp"])) return;
        if (inputFields["retail-price"] && !isPositiveNumber(inputFields["retail-price"])) return;


        // authentic data here-after =============
        const cache = await this.getCacheData(userId);

        let modifiedData: OfferCacheData;
        if (cache) {
            modifiedData = JSON.parse(cache) as OfferCacheData;
            modifiedData = {
                ...modifiedData,
                pricing: {
                    ...modifiedData.pricing,
                    details: inputFields, // <------
                }
            };
        }
        else {
            modifiedData = {
                venue: { details: { address: "", name: "", website: "" } },
                event: { details: { description: "", image: "", name: "" } },
                timing: { details: { "end-date": "", "end-time": "", "max-occurences": "", "start-date": "", "start-time": "" }, monthly: [], weekly: [] },
                pricing: {
                    details: inputFields, // <------
                    tiers: [],
                    categories: []
                },
            };
        }

        const res = await this.putCacheData(userId, modifiedData);
        if (res) interaction.deferUpdate();
    }

    private async handlePricingRebateTiersModal({ userId, interaction, inputFields }: { userId: string, interaction: ModalSubmitInteraction<CacheType>, inputFields: OfferRebateTierFields }) {
        // check authenticity of data =============
        if (!isPositiveNumber(inputFields["min-total-purchases"]) || !isPositiveNumber(inputFields["rebate-percentage"]))
            return;

        const purchaseTier = parseInt(inputFields["min-total-purchases"]);
        if (this.appliedTiersSet.has(userId) && this.appliedTiersSet.get(userId)?.has(purchaseTier))
            return;       // ... return if that purchase tier is already given

        // authentic data here-after =============
        // UPDATE LOCAL TIERS MAP --
        const appliedTiers = this.appliedTiersSet.get(userId);
        const updatedTiers = appliedTiers ? appliedTiers.add(purchaseTier) : new Set<number>().add(purchaseTier);
        this.appliedTiersSet.set(userId, updatedTiers);

        // UPDATE REDIS APPLIED TIERS --
        const REDIS_TIERS_KEY = redisKeys.offerApplication.tierDraft(userId);
        const tiersCache = await this.redisService.getValue({
            db: REDIS_DB_INDEX.OFFERS,
            key: REDIS_TIERS_KEY
        });

        const tiersCount = tiersCache && isNumber(tiersCache) ? parseInt(tiersCache) : 0;
        const updatedTiersCache = tiersCount + 1;

        await this.redisService.setValue({
            db: REDIS_DB_INDEX.OFFERS,
            key: REDIS_TIERS_KEY,
            value: `${updatedTiersCache}`,
            expiry: DRAFT_DATA_TTL
        });

        // UPDATE REDIS OFFER DRAFT --
        const cache = await this.getCacheData(userId);

        let modifiedData: OfferCacheData;
        if (cache) {
            modifiedData = JSON.parse(cache) as OfferCacheData;
            modifiedData = {
                ...modifiedData,
                pricing: {
                    ...modifiedData.pricing,
                    tiers: [
                        ...modifiedData.pricing.tiers,
                        inputFields
                    ]
                }
            };
        }
        else {
            modifiedData = {
                venue: { details: { address: "", name: "", website: "" } },
                event: { details: { description: "", image: "", name: "" } },
                timing: { details: { "end-date": "", "end-time": "", "max-occurences": "", "start-date": "", "start-time": "" }, monthly: [], weekly: [] },
                pricing: {
                    details: { "min-amount-prpp": "", "other-info": "", "retail-price": "" },
                    categories: [],
                    tiers: [inputFields] // <------
                },
            };
        }

        const res = await this.putCacheData(userId, modifiedData);
        if (res) return this.handleOfferDataPricingStage({ userId, interaction, remainderKey: "stage" });
    }


    /*####################################################################  */
    // DROPDOWNS HANDLERS =====================================
    /*####################################################################  */
    private async handleTimingWeeklyDropdown({ userId, interaction }: { userId: string, interaction: StringSelectMenuInteraction<CacheType> }) {
        const days = interaction.values as Week[];
        const cache = await this.getCacheData(userId);

        let modifiedData: OfferCacheData;
        if (cache) {
            modifiedData = JSON.parse(cache) as OfferCacheData;
            modifiedData = {
                ...modifiedData,
                timing: {
                    ...modifiedData.timing,
                    weekly: days, // <------
                }
            };
        }
        else {
            modifiedData = {
                venue: {
                    details: { address: "", name: "", website: "" },
                },
                event: { details: { description: "", image: "", name: "" } },
                timing: {
                    details: { "end-date": "", "end-time": "", "max-occurences": "", "start-date": "", "start-time": "" },
                    monthly: [],
                    weekly: days // <------
                },
                pricing: { details: { "min-amount-prpp": "", "other-info": "", "retail-price": "" }, tiers: [], categories: [] },
            };
        }

        const res = await this.putCacheData(userId, modifiedData);
        if (res) interaction.deferUpdate();
    }

    private async handleTimingMonthlyDropdown({ userId, interaction }: { userId: string, interaction: StringSelectMenuInteraction<CacheType> }) {
        const months = interaction.values as Month[];
        const cache = await this.getCacheData(userId);

        let modifiedData: OfferCacheData;
        if (cache) {
            modifiedData = JSON.parse(cache) as OfferCacheData;
            modifiedData = {
                ...modifiedData,
                timing: {
                    ...modifiedData.timing,
                    monthly: months, // <------
                }
            };
        }
        else {
            modifiedData = {
                venue: {
                    details: { address: "", name: "", website: "" },
                },
                event: { details: { description: "", image: "", name: "" } },
                timing: {
                    details: { "end-date": "", "end-time": "", "max-occurences": "", "start-date": "", "start-time": "" },
                    weekly: [],
                    monthly: months // <------
                },
                pricing: { details: { "min-amount-prpp": "", "other-info": "", "retail-price": "" }, tiers: [], categories: [] },
            };
        }

        const res = await this.putCacheData(userId, modifiedData);
        if (res) interaction.deferUpdate();
    }

    private async handlePricingGroupCategoriesDropdown({ userId, interaction }: { userId: string, interaction: StringSelectMenuInteraction<CacheType> }) {
        const groupCategories = interaction.values;

        const cache = await this.getCacheData(userId);

        let modifiedData: OfferCacheData;
        if (cache) {
            modifiedData = JSON.parse(cache) as OfferCacheData;
            modifiedData = {
                ...modifiedData,
                pricing: {
                    ...modifiedData.pricing,
                    categories: groupCategories, // <------
                }
            };
        }
        else {
            modifiedData = {
                venue: { details: { address: "", name: "", website: "" } },
                event: { details: { description: "", image: "", name: "" } },
                timing: { details: { "end-date": "", "end-time": "", "max-occurences": "", "start-date": "", "start-time": "" }, monthly: [], weekly: [] },
                pricing: {
                    details: { "min-amount-prpp": "", "other-info": "", "retail-price": "" },
                    tiers: [],
                    categories: groupCategories // <------
                },
            };
        }

        const res = await this.putCacheData(userId, modifiedData);
        if (res) interaction.deferUpdate();
    }

    /*####################################################################  */
    // MISC =================================================================
    /*####################################################################  */
    private async getSummarizedOfferDataDraft(userId: string): Promise<{ thumbnail?: string, description: string, isSubmittable: boolean }> {
        const cache = await this.getCacheData(userId);
        if (cache) {
            const data: OfferCacheData = JSON.parse(cache);
            const isSubmittable: boolean =
                data.event.details.name.length > 0 &&
                data.event.details.description.length > 0 &&
                data.venue.details.name.length > 0 &&
                data.venue.details.address.length > 0 &&
                data.timing.details["start-date"].length > 0 &&
                data.timing.details["end-date"].length > 0 &&
                data.timing.details["start-time"].length > 0 &&
                data.timing.details["end-time"].length > 0 &&
                data.pricing.tiers.length > 0;

            const description = getOfferApplicationSummaryBeautified(data);

            return { description, isSubmittable, thumbnail: data.event.details.image || undefined };
        }
        else
            return {
                isSubmittable: false,
                description: `No data is submitted yet. \n Go back to continue submitting data`
            }
    }

    private async resetRebateTiers(userId: string) {
        // UPDATE LOCAL TIERS MAP --
        this.appliedTiersSet.delete(userId);

        // UPDATE REDIS APPLIED TIERS --
        await this.redisService.deleteValue({
            db: REDIS_DB_INDEX.OFFERS,
            key: redisKeys.offerApplication.tierDraft(userId)
        });

        // UPDATE REDIS OFFER DRAFT --
        const cache = await this.getCacheData(userId);

        if (cache) {
            let modifiedData: OfferCacheData = JSON.parse(cache) as OfferCacheData;
            modifiedData = {
                ...modifiedData,
                pricing: {
                    ...modifiedData.pricing,
                    tiers: []
                }
            };

            await this.putCacheData(userId, modifiedData);
        }
    }

    private async getCachedActivityGroups() {
        try {
            const cachedActivityGroups = await this.redisService.getValue({
                db: REDIS_DB_INDEX.DATA_SIZE,
                key: redisKeys.activityGroup.groups
            });

            if (!cachedActivityGroups) throw new EmptyDropdownError(`❌ Categories dropdown has no values`);

            const activityGroups = JSON.parse(cachedActivityGroups) as ForumChannelGroupCategory[];
            return activityGroups;
        }
        catch (err) {
            return [];
        }
    }

    /*####################################################################  */
    // REDIS OPERATIONS ===========================================================
    /*####################################################################  */
    private getCacheData = async (userId: string) => {
        const REDIS_KEY = redisKeys.offerApplication.draft(userId);
        const cache = await this.redisService.getValue({
            db: REDIS_DB_INDEX.OFFERS,
            key: REDIS_KEY
        });

        return cache;
    }

    private putCacheData = async (userId: string, data: OfferCacheData) => {
        const [res0, _] = await Promise.allSettled([
            this.redisService.setValue({
                db: REDIS_DB_INDEX.OFFERS,
                key: redisKeys.offerApplication.draft(userId),
                value: JSON.stringify(data),
                expiry: DRAFT_DATA_TTL
            }),
            this.redisService.updateExpiry({
                db: REDIS_DB_INDEX.OFFERS,
                key: redisKeys.offerApplication.tierDraft(userId),
                expiry: DRAFT_DATA_TTL
            })
        ]);

        return res0;
    }
}