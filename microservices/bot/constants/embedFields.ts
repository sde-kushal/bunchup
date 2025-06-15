export type EmbedFields = {
    BusinessApplication:
    | "User"
    | "Contact Number"
    | "Company Name D/B/A"
    | "Contact Name"
    | "Contact Email",

    OfferVenueDetails:
    | "Venue Name"
    | "Venue Location Address"
    | "Venue Website Link",

    OfferEventDetails:
    | "Event Name"
    | "Event Description (max 40 words)"
    | "Event Image Thumbnail",

    OfferTimingDetails:
    | "Start date (YYYY-MM-DD format)"
    | "End date (YYYY-MM-DD format)"
    | "Start time (HH:MM format), in EST"
    | "End time (HH:MM format), in EST"
    | "Max occurences"

    OfferPricingDetails:
    | "Standard Retail Price (in USD)"
    | "Minimum amount(USD) per receipt per purchase"
    | "Any other info"

    OfferPricingRebateTiers:
    | "Minimum Total Purchases"
    | "Rebate Percentage (out of 100%)"

    AdminOnlyOfferApplicationDetails: "Offer Name"
    AdminOnlyForumCategoryCreate: "Activity Group Name"
};


export type EmbedFieldLabel =
    | EmbedFields["BusinessApplication"]
    | EmbedFields["OfferEventDetails"]
    | EmbedFields["OfferVenueDetails"]
    | EmbedFields["OfferTimingDetails"]
    | EmbedFields["OfferPricingDetails"]
    | EmbedFields["OfferPricingRebateTiers"]
    | EmbedFields["AdminOnlyForumCategoryCreate"]
    | EmbedFields["AdminOnlyOfferApplicationDetails"]
    | "user_id"
    | "timestamp"