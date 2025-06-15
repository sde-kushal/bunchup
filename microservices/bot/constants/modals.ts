import { EmbedFieldLabel } from "./embedFields";

export type ModalIds =
    | "business"
    | "offer-event" | "offer-venue" | "offer-timing" | "offer-pricing" | "offer-rebate"
    | "admin-forumCategory-create" | "admin-offer-details";

type ModalInputs = {
    title: string;
    customId: ModalIds;
    fields: {
        type: "text";
        label: EmbedFieldLabel;
        id: string;
        required?: boolean;
        style?: "short" | "para";
    }[];
};

export type ModalType =
    | "APPLY_FOR_VERIFIED_BUSINESS"
    | "OFFER_VENUE_DETAILS"
    | "OFFER_EVENT_DETAILS"
    | "OFFER_TIMING_DETAILS"
    | "OFFER_PRICING_DETAILS"
    | "OFFER_PRICING_REBATE_TIERS"
    | "ADMIN_ONLY_OFFER_APPLICATION_DETAILS"
    | "ADMIN_ONLY_FORUM_CATEGORY_CREATE"

export const MODALS: Record<ModalType, ModalInputs> = {
    // verified business ----------------------
    APPLY_FOR_VERIFIED_BUSINESS: {
        title: "Apply for verified business",
        customId: "business",
        fields: [
            {
                type: "text",
                label: "Contact Name",
                id: "name",
            },
            {
                type: "text",
                label: "Contact Email",
                id: "email",
            },
            {
                type: "text",
                label: "Contact Number",
                id: "number",
            },
            {
                type: "text",
                label: "Company Name D/B/A",
                id: "company",
            }
        ]
    },

    // offer applications ----------------------
    OFFER_EVENT_DETAILS: {
        title: "Event Details",
        customId: "offer-event",
        fields: [
            {
                type: "text",
                label: "Event Name",
                id: "name",
            },
            {
                type: "text",
                label: "Event Image Thumbnail",
                id: "image",
            },
            {
                type: "text",
                label: "Event Description (max 40 words)",
                id: "description",
                style: "para"
            }
        ]
    },

    OFFER_VENUE_DETAILS: {
        customId: "offer-venue",
        title: "Venue Details",
        fields: [
            {
                type: "text",
                id: "name",
                label: "Venue Name"
            },
            {
                type: "text",
                id: "address",
                label: "Venue Location Address"
            },
            {
                type: "text",
                id: "website",
                label: "Venue Website Link",
                required: false
            }
        ]
    },

    OFFER_TIMING_DETAILS: {
        customId: "offer-timing",
        title: "Start and End Timing Details",
        fields: [
            {
                type: "text",
                id: "start-date",
                label: "Start date (YYYY-MM-DD format)"
            },
            {
                type: "text",
                id: "end-date",
                label: "End date (YYYY-MM-DD format)"
            },
            {
                type: "text",
                id: "start-time",
                label: "Start time (HH:MM format), in EST"
            },
            {
                type: "text",
                id: "end-time",
                label: "End time (HH:MM format), in EST"
            },
            {
                type: "text",
                id: "max-occurences",
                label: "Max occurences",
                required: false
            }
        ]
    },

    OFFER_PRICING_DETAILS: {
        customId: "offer-pricing",
        title: "More Pricing Details",
        fields: [
            {
                id: "retail-price",
                label: "Standard Retail Price (in USD)",
                type: "text",
                required: false
            },
            {
                id: "min-amount-prpp",
                label: "Minimum amount(USD) per receipt per purchase",
                type: "text",
                required: false
            },
            {
                id: "other-info",
                label: "Any other info",
                type: "text",
                style: "para",
                required: false
            }
        ]
    },

    OFFER_PRICING_REBATE_TIERS: {
        customId: "offer-rebate",
        title: "Rebate Tier Details",
        fields: [
            {
                id: "min-total-purchases",
                label: "Minimum Total Purchases",
                type: "text"
            },
            {
                id: "rebate-percentage",
                label: "Rebate Percentage (out of 100%)",
                type: "text"
            }
        ]
    },

    ADMIN_ONLY_FORUM_CATEGORY_CREATE: {
        title: "Forum Category",
        customId: "admin-forumCategory-create",
        fields: [
            {
                type: "text",
                label: "Activity Group Name",
                required: true,
                id: "category-name"
            }
        ]
    },

    ADMIN_ONLY_OFFER_APPLICATION_DETAILS: {
        title: "Channel Details",
        customId: "admin-offer-details",
        fields: [
            {
                type: "text",
                label: "Offer Name",
                required: true,
                id: "offer-name"
            }
        ]
    },
}