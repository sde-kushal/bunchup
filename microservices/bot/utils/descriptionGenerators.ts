import { OfferCacheData } from "constants/localTypes";
import { getUsTime } from "./getDate";

export const getOfferApplicationSummaryBeautified = (data: OfferCacheData) => {
    const EMPTY_PLACEHOLDER = "_not provided, compulsory_";

    const description =
        `**🎉  EVENT**
- **Name**: ${data.event.details.name || EMPTY_PLACEHOLDER}
- **Description**: ${data.event.details.description || EMPTY_PLACEHOLDER}
- **Image**: ${data.event.details.image || EMPTY_PLACEHOLDER}

**🏟️  VENUE**
- **Name**: ${data.venue.details.name || EMPTY_PLACEHOLDER}
- **Address**: ${data.venue.details.address || EMPTY_PLACEHOLDER}
${data.venue.details.website.length ? `- **Website**: ${data.venue.details.website || EMPTY_PLACEHOLDER}` : ``}

**🕒  TIMINGS**
- **Start Date**: ${data.timing.details["start-date"] ? getUsTime(data.timing.details["start-date"], true) : EMPTY_PLACEHOLDER}
- **End Date**: ${data.timing.details["end-date"] ? getUsTime(data.timing.details["end-date"], true) : EMPTY_PLACEHOLDER}

- **Repeats on**: ${data.timing.weekly.map(x => `\`${x}\``).join(", ") || `\`Everyday\``}
- **Active months**: ${data.timing.monthly.map(x => `\`${x}\``).join(", ") || `\`Full duration\``}

- **Offer starts at**: ${data.timing.details["start-time"] ? (data.timing.details["start-time"] + " EST") : EMPTY_PLACEHOLDER}
- **Offer ends at**: ${data.timing.details["end-time"] ? (data.timing.details["end-time"] + " EST") : EMPTY_PLACEHOLDER}
${data.timing.details["max-occurences"].length ? `- **Per user daily receipt limit**: ${data.timing.details["end-time"]} EST` : ``}

**💲  PRICINGS**
${data.pricing.details["retail-price"].length ? `- **Standard Retail Price**: ${data.pricing.details["retail-price"]} USD` : ``}
${data.pricing.details["min-amount-prpp"].length ? `- **Min. amount per receipt per person**: ${data.pricing.details["min-amount-prpp"]} USD` : ``}
- **Eligible Activity Groups**: ${data.pricing.categories ? `${data.pricing.categories.length} selected` : `\`All categories\``}

- **Rebate Tiers**:
${data.pricing.tiers.map((tier) => `\`${tier["min-total-purchases"]}\` min. purchases ⮕ \`${tier["rebate-percentage"]}%\` rebate`).join("\n") || EMPTY_PLACEHOLDER}
`;

    return description;
}