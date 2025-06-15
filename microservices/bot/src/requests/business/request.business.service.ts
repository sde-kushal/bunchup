import { Injectable } from "@nestjs/common";
import { EmbedFieldLabel } from "constants/embedFields";
import { KafkaKey } from "constants/kafka";
import { SUBMITTED_KEY } from "constants/misc";
import { MODALS } from "constants/modals";
import { REDIS_DB_INDEX } from "constants/redis";
import { CacheType, Interaction, ModalSubmitInteraction } from "discord.js";
import { KafkaService } from "src/_kafka/kafka.service";
import { RedisService } from "src/_redis/redis.service";
import { generateModal } from "utils/generateModal";
import { getDate } from "utils/getDate";
import { interactionDetails } from "utils/interactionDetails";


@Injectable()
export class BusinessService {
    constructor(
        private kafkaService: KafkaService,
        private redisService: RedisService
    ) { }

    async handleBusinessApplySlashCommand(interaction: Interaction) {
        const { user } = interactionDetails({
            details: {
                user: {
                    globalName: true,
                    username: true,
                    id: true,
                }
            },
            interaction
        });

        const userId = user?.id || "";

        // check this already exists or not
        const cache = await this.redisService.getValue({
            db: REDIS_DB_INDEX.BUSINESS_OWNERS,
            key: userId
        });

        // verified user...
        if (cache) {
            if (interaction.isRepliable())
                interaction.reply({
                    content: cache === SUBMITTED_KEY
                        ? `You have already applied for the verification. Admin updates will be shared with yopu shortly.`
                        : `You are already a registered business: '${cache}'.`,
                    flags: 64
                });
        }
        // non-verified user...
        else {
            const modal = generateModal({
                id: MODALS.APPLY_FOR_VERIFIED_BUSINESS.customId,
                title: MODALS.APPLY_FOR_VERIFIED_BUSINESS.title,
                fields: MODALS.APPLY_FOR_VERIFIED_BUSINESS.fields
            });

            // @ts-ignore
            interaction.showModal(modal);
        }
    }

    async handleBusinessModalSubmit(interaction: ModalSubmitInteraction<CacheType>) {
        let inputFields: Record<EmbedFieldLabel, string> =
            {} as Record<EmbedFieldLabel, string>;

        MODALS.APPLY_FOR_VERIFIED_BUSINESS.fields.forEach(({ id }) => {
            inputFields[id] = interaction.fields.getTextInputValue(id);
        });

        inputFields["user_id"] = interaction.user.id;
        inputFields["timestamp"] = getDate();

        await this.kafkaService.produceMessage({
            key: MODALS.APPLY_FOR_VERIFIED_BUSINESS.customId as KafkaKey,
            message: inputFields,
            topic: "new-form"
        });

        // @ts-ignore
        await interaction.reply({
            content: "Thank you, your request will be approved within 3-4 business days",
            flags: 64
        });
    }

}