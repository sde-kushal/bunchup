import { Injectable, OnModuleInit } from "@nestjs/common";
import { KAFKA_BROKER } from "constants/env";
import { KafkaTopic } from "constants/kafka";
import { Consumer, Kafka, Producer } from "kafkajs";

@Injectable()
export class KafkaService implements OnModuleInit {
    private kafka: Kafka;
    private producer: Producer;
    private consumer: Consumer;

    constructor() {
        this.kafka = new Kafka({
            brokers: [KAFKA_BROKER]
        });

        this.producer = this.kafka.producer();
        this.consumer = this.kafka.consumer({ groupId: "actions-consumer" });
    }

    async onModuleInit() {
        await this.producer.connect();
        await this.consumer.connect();
    }

    async produceMessage(topic: KafkaTopic, message: any) {
        await this.producer.send({
            topic,
            messages: [{ value: JSON.stringify(message) }],
        });
    }

    async createConsumer(): Promise<Consumer> {
        return this.consumer;
    }
}
