// OFFER APPLICATIONS ===================================
export type Month = 'January' | 'February' | 'March' | 'April' | 'May' | 'June' | 'July' | 'August' | 'September' | 'October' | 'November' | 'December';
export type Week = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export type OfferVenueDetailsFields = { name: string, address: string, website: string };
export type OfferEventDetailsFields = { name: string, image: string, description: string };
export type TimingStartEndDetailsFields = { "start-date": string, "end-date": string, "start-time": string, "end-time": string, "max-occurences": string };
export type OfferPricingDetailsFields = { "retail-price": string, "min-amount-prpp": string, "other-info": string };
export type OfferRebateTierFields = { "min-total-purchases": string, "rebate-percentage": string };


export type OfferCacheData = {
    venue: {
        details: OfferVenueDetailsFields
    }
    event: {
        details: OfferEventDetailsFields
    }
    timing: {
        details: TimingStartEndDetailsFields
        weekly: Week[]
        monthly: Month[]
    }
    pricing: {
        details: OfferPricingDetailsFields
        tiers: OfferRebateTierFields[]
        categories: string[]
    }
}
