import { Injectable, OnModuleInit } from "@nestjs/common";
import { KafkaMessage } from "kafkajs";
import { ApplicationQueue, BusinessApplication, OfferApplication, OfferKafkaValue } from "./types";
import { sendAdminNewApplicationUpdate } from "api/adminOnly";
import { KafkaKey } from "constants/kafka";
import { RedisService } from "src/redis/redis.service";
import { REDIS_DB_INDEX } from "constants/redis";
import { SUBMITTED_KEY } from "constants/misc";

@Injectable()
export class ApplicationsService implements OnModuleInit {
    private buffer: KafkaMessage[] = [];

    constructor(private redisService: RedisService) { }

    async onModuleInit() {
        setInterval(async () => {
            if (this.buffer.length > 0) {
                await this.processBatch(this.buffer);
                this.buffer = [];
            }
        }, 30_000);
    }

    async kafkaHandler(message: KafkaMessage) {
        this.buffer.push(message);
    }

    private async processBatch(messages: KafkaMessage[]) {
        let businessApplications: BusinessApplication[] = [];
        let offerApplications: OfferApplication[] = [];

        // filter based on application type ===============
        messages.forEach((msg) => {
            const key = msg.key?.toString() as KafkaKey;

            if (key === "business") {
                const newBusiness = JSON.parse(msg.value?.toString() || "") as BusinessApplication;
                businessApplications.push(newBusiness);
            }
            else if (key === "offer") {
                const newOffer = JSON.parse(msg.value?.toString() || "") as OfferKafkaValue;
                console.log(newOffer);
                if (newOffer) offerApplications.push(newOffer.redisKey); // dont read from redis as it just goes back to API
            }
            else {

            }
        });

        // send update to discord admin | no need to save application to postgres ===============
        if (businessApplications) {
            this.redisService.setValues({
                db: REDIS_DB_INDEX.BUSINESS_OWNERS,
                fields: businessApplications.map(({ user_id }) => ({
                    key: user_id,
                    value: SUBMITTED_KEY
                }))
            });

            sendAdminNewApplicationUpdate({ data: businessApplications, endpoint: "BUSINESS_APPLICATION" });
        }
        if (offerApplications) {
            sendAdminNewApplicationUpdate({ data: offerApplications, endpoint: "OFFER_APPLICATION" });
        }
    }

}