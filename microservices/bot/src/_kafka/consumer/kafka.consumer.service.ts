import { Injectable, OnModuleInit } from '@nestjs/common';
import { KafkaMessage } from 'kafkajs';
import { setInterval } from 'timers';
import { KafkaTopic } from 'constants/kafka';
import { KafkaService } from '../kafka.service';

@Injectable()
export class KafkaConsumerService implements OnModuleInit {
    private buffer: KafkaMessage[] = [];

    constructor(private readonly kafkaService: KafkaService) { }

    async onModuleInit() {
        const consumer = await this.kafkaService.createConsumer();
        const consumerList: KafkaTopic[] = [
            "discord-notification"
        ];

        await consumer.subscribe({ topics: consumerList, fromBeginning: false });

        await consumer.run({
            eachMessage: async ({ message, topic }: { message: KafkaMessage, topic: string }) => {
                const currTopic = topic as KafkaTopic;

                if (currTopic === "discord-notification")
                    this.buffer.push(message);
                else console.log(`${topic} | ${message.value?.toString()}`)
            },
        });

        // Process buffer every 30 seconds
        setInterval(async () => {
            if (this.buffer.length > 0) {
                await this.processBatch(this.buffer);
                this.buffer = []; // clear buffer
            }
        }, 30_000);
    }

    private async processBatch(messages: KafkaMessage[]) {
        const formatted = messages.map(msg => ({
            key: msg.key?.toString(),
            value: msg.value?.toString(),
        }));
        console.log(formatted);
        // await this.announcementsService.sendToPrivateChannel(formatted);
    }
}
