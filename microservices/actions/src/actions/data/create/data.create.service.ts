import { Injectable, OnModuleInit } from "@nestjs/common";
import { KafkaKey } from "constants/kafka";
import { KafkaMessage } from "kafkajs";
import { NewBusinessData } from "../types";
import { PostgresService } from "src/postgres/postgres.service";
import { AirtableService } from "src/airtable/airtable.service";
import { getUsTime } from "utils/getDate";
import { RedisService } from "src/redis/redis.service";
import { REDIS_DB_INDEX } from "constants/redis";

@Injectable()
export class DataCreateService implements OnModuleInit {
    private buffer: KafkaMessage[] = [];
    private airtableService: AirtableService;

    constructor(
        private postgresService: PostgresService,
        private redisService: RedisService
    ) {
        this.airtableService = new AirtableService();
    }

    async onModuleInit() {
        setInterval(async () => {
            if (this.buffer.length > 0) {
                await this.processBatch(this.buffer);
                this.buffer = [];
            }
        }, 15_000);
    }

    async kafkaHandler(message: KafkaMessage) {
        this.buffer.push(message);
    }

    private async processBatch(messages: KafkaMessage[]) {
        let businessList: NewBusinessData[] = [];
        let offerList = [];
        let memberList = [];

        // filter based on application type ===============
        messages.forEach((msg) => {
            const key = msg.key?.toString() as KafkaKey;

            if (key === "business") {
                const data: NewBusinessData = JSON.parse(msg.value?.toString() || "");
                businessList.push(data);
            }
            else if (key === "offer") {

            }
            else { }
        });

        // save to postgres + send to airtable ===============
        if (businessList) await this.saveBusinessData({ data: businessList });
        if (offerList) await this.saveOffersData({ data: offerList });
        if (memberList) await this.saveMembersData({ data: memberList });

    }

    private async saveBusinessData({ data }: { data: NewBusinessData[] }) {
        await Promise.allSettled([
            // POSTGRES ------------
            this.postgresService.createPostgresData({
                table: "verifiedBusiness",
                fields: data.map((x) => ({
                    companyName: x["Company Name D/B/A"],
                    contactEmail: x["Contact Email"],
                    userId: x.User,
                    contactNumber: x["Contact Number"],
                    contactName: x["Contact Name"]
                }))
            }),

            // REDIS ------------
            this.redisService.setValues({
                db: REDIS_DB_INDEX.BUSINESS_OWNERS,
                fields: data.map((x) => ({
                    key: x.User,
                    value: x["Company Name D/B/A"]
                }))
            }),

            // UPDATE COUNT --------------
            (async () => {
                const currCount = await this.redisService.getValue({
                    db: REDIS_DB_INDEX.DATA_SIZE,
                    key: "business"
                });

                await this.redisService.setValue({
                    db: REDIS_DB_INDEX.DATA_SIZE,
                    key: "business",
                    value: currCount === null ? `1` : `${Math.max(0, parseInt(currCount) + 1)}`
                });
            })(),
        ]);
    }


    private async saveOffersData({ data }: { data: NewBusinessData[] }) {
    }

    private async saveMembersData({ data }: { data: NewBusinessData[] }) {
    }
}