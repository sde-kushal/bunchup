import { Injectable, OnModuleInit } from "@nestjs/common";
import { KAFKA_BROKER } from "constants/env";
import { KAFKA_TOPICS, KafkaKey, KafkaTopic } from "constants/kafka";
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
        this.consumer = this.kafka.consumer({ groupId: "discord-consumer" });
    }

    async onModuleInit() {
        await this.registerTopicsFromAdmin();
        await this.producer.connect();
        await this.consumer.connect();
    }

    async produceMessage({ key, message, topic }: { topic: KafkaTopic, key: KafkaKey, message: any }) {
        await this.producer.send({
            topic,
            messages: [{ key, value: JSON.stringify(message) }],
        });
    }

    async createConsumer(): Promise<Consumer> {
        return this.consumer;
    }

    async registerTopicsFromAdmin() {
        
        const topicList = KAFKA_TOPICS.map((topic) => ({
            topic,
            numPartitions: 1,
            replicationFactor: 1
        }));

        const admin = this.kafka.admin();
        await admin.connect();
        await admin.createTopics({
            topics: topicList,
            waitForLeaders: true,
        });
        await admin.disconnect();
    }
}
