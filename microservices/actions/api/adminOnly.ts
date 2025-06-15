import { DISCORD_CHANNEL_ID, DISCORD_ENDPOINT } from "constants/env";

export const sendAdminNewApplicationUpdate = async ({ data, endpoint }: {
    data: any[],
    endpoint: "BUSINESS_APPLICATION" | "OFFER_APPLICATION"
}) => {
    try {
        const query = `type=${endpoint === "OFFER_APPLICATION" ? "offer" : "business"}`;
        const url = `${DISCORD_ENDPOINT}/notification/announcement/${DISCORD_CHANNEL_ID[endpoint]}?${query}`;

        await fetch(url, {
            method: "POST",
            body: JSON.stringify(data),
            headers: {
                "Content-Type": "application/json"
            }
        });
    }
    catch (err) {
        console.error(`Cannot fetch: ${err}`);
    }
}