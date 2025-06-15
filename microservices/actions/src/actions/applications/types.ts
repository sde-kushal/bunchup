import { KafkaTopic } from "constants/kafka"

export type ApplicationQueue = {
    key: KafkaTopic,
    value: string
}

export type BusinessApplication = {
    name: string
    email: string
    company: string
    number: string
    user_id: string
    timestamp: string
}

export type OfferApplication = string
export type OfferKafkaValue = { redisKey: string }   // redis key reference (DB_INDEX: DB.OFFERS)