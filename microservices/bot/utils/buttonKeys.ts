import { KafkaKey } from "constants/kafka";
import { AdminActionTypes } from "src/admins/types";
import { OfferApplicationStage } from "src/requests/offer/types";

const paginationGenerateKey = ({ index, type, misc }: { index: number, type: KafkaKey, misc: string }): string =>
    // key_index_:random:
    `pagination-${type}_${index}_${misc}`

const paginationBreakdownKey = (key: string) => {
    // key_index_:random:
    const keys = key.split("_");
    return {
        type: keys[0] as KafkaKey,
        index: Math.max(0, parseInt(keys[1]) || -1)
    };
}

// ---------------------------------------------

const acceptGenerateKey = ({ userId, type }: { userId: string, type: KafkaKey }): string =>
    // key_userID
    `accept-${type}_${userId}`

const acceptBreakdownKey = (key: string) => {
    // key_userID
    const keys = key.split("_");
    return {
        type: keys[0] as KafkaKey,
        userId: keys[1]
    };
}

// ---------------------------------------------

const declineGenerateKey = ({ userId, type }: { userId: string, type: KafkaKey }): string =>
    // key_userID
    `decline-${type}_${userId}`

const declineBreakdownKey = (key: string) => {
    // key_userID
    const keys = key.split("_");
    return {
        type: keys[0] as KafkaKey,
        userId: keys[1]
    };
}

// ---------------------------------------------

type ButtonTriggerType = "businessApplyModal";

const triggerGenerateKey = (key: ButtonTriggerType) =>
    // key
    `trigger-${key}`

const triggerBreakdownKey = (key: string) =>
    // key
    key as ButtonTriggerType;

// ---------------------------------------------

const offerGenerateKey = ({ subKey, stage }: { subKey: string, stage: OfferApplicationStage }) =>
    // stage_subkey
    `offer-${stage}_${subKey}`

const offerBreakdownKey = (key: string) => {
    // stage_subkey
    const keys = key.split("_");
    return {
        stage: keys[0] as OfferApplicationStage,
        remainder: keys[1]
    };
}

// ---------------------------------------------

const adminGenerateKey = ({ element, misc, stage, type }: { type: AdminActionTypes, stage: string, element: string, misc: string }) =>
    // type|stage_element_misc
    `admin-${type}|${stage}_${element}_${misc}`

const adminBreakdownKey = (key: string) => {
    // type|stage_element_misc
    const [type, remainder] = key.split("|");
    const keys = remainder.split("_");
    return {
        type: type as AdminActionTypes,
        stage: keys[0],
        element: keys[1],
        misc: keys[2]
    };
}


// EXPORTS =====================================

// keys of buttonKeys{} refer to `type DiscordButtonType`
export const buttonKeys = {
    pagination: {
        generate: paginationGenerateKey,
        breakdown: paginationBreakdownKey
    },

    accept: {
        generate: acceptGenerateKey,
        breakdown: acceptBreakdownKey
    },

    decline: {
        generate: declineGenerateKey,
        breakdown: declineBreakdownKey
    },

    trigger: {
        generate: triggerGenerateKey,
        breakdown: triggerBreakdownKey
    },

    offer: {
        generate: offerGenerateKey,
        breakdown: offerBreakdownKey
    },

    admin: {
        generate: adminGenerateKey,
        breakdown: adminBreakdownKey
    }
}

export const dropdownKeys = {
    offer: {
        generate: offerGenerateKey,
        breakdown: offerBreakdownKey
    },

    admin: {
        generate: adminGenerateKey,
        breakdown: adminBreakdownKey
    }
}