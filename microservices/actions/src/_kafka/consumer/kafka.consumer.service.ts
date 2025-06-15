import { Injectable, OnModuleInit } from '@nestjs/common';
import { KafkaMessage } from 'kafkajs';
import { KafkaTopic } from 'constants/kafka';
import { KafkaService } from '../kafka.service';
import { ApplicationsService } from 'src/actions/applications/applications.service';
import { DataCreateService } from 'src/actions/data/create/data.create.service';

@Injectable()
export class KafkaConsumerService implements OnModuleInit {
    private readonly consumerHandlers: Map<KafkaTopic, (message: KafkaMessage) => Promise<void>>;

    constructor(
        private readonly kafkaService: KafkaService,
        private readonly applicationsService: ApplicationsService,
        private readonly dataCreateService: DataCreateService,
    ) {
        this.consumerHandlers = new Map<KafkaTopic, (message: KafkaMessage) => Promise<void>>();
    }

    async onModuleInit() {
        // CONSUMER ==========================
        const consumer = await this.kafkaService.createConsumer();
        const consumerList: KafkaTopic[] = [
            "new-form", "data-create", "data-delete", "data-update"
        ];

        await consumer.subscribe({ topics: consumerList, fromBeginning: false });

        // CONSUMER TOPIC HANDLERS ==========================
        const consumerHandlerList: {
            topic: KafkaTopic,
            handler: (message: KafkaMessage) => Promise<void>
        }[] = [
                { topic: "new-form", handler: this.applicationsService.kafkaHandler.bind(this.applicationsService) },
                { topic: "data-create", handler: this.dataCreateService.kafkaHandler.bind(this.dataCreateService) },
            ];

        consumerHandlerList.forEach(({ topic, handler }) => {
            this.consumerHandlers.set(topic, handler);
        });

        // CONSUMER SUBSCRIBE ==========================
        await consumer.run({
            eachMessage: async ({ message, topic }: { message: KafkaMessage, topic: string }) => {
                const currTopic = topic as KafkaTopic;

                const handler = this.consumerHandlers.get(currTopic);
                if (handler) await handler(message);
                else console.log(`Unknown topic : ${topic} | ${message.value?.toString()}`)
            },
        });
    }

}
