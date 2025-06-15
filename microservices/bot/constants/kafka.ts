export type KafkaTopic =
    | "new-form"
    | "discord-notification"

    // database related -> also goes to airtable
    | "data-create"
    | "data-update"
    | "data-delete"


export type KafkaKey =
    | "business"
    | "offer"


export const KAFKA_TOPICS: KafkaTopic[] = [
    "new-form", 
    "discord-notification",
    "data-create",
    "data-delete",
    "data-update"
];