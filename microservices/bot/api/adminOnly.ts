import { BUSINESS_DATA_LIMIT } from "constants/limits";
import { RoleType } from "constants/roles";

export const fetchRoleRemove = async ({ userId, roleType }: { userId: string, roleType: RoleType }) => {
    const endpoint = `http://localhost:5051/delete/role`;
    await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, type: roleType })
    });
}

export const fetchActiveVerifiedBusinesses = async ({ index, limit = BUSINESS_DATA_LIMIT }: { index: number, limit?: number }) => {
    const endpoint = `http://localhost:5051/read/business?index=${Math.max(0, index)}&limit=${Math.max(0, limit)}`;
    const res = await fetch(endpoint);
    const data = await res.json();
    return data as {
        userId: string | null;
        companyName: string;
        contactName: string;
        contactNumber: string;
        contactEmail: string;
        createdAt: Date;
    }[];
}

export const requestForumChannelCreate = async ({ data }: { data: { name: string, parentId: string, slowmode: number, threadRateLimit: number } }) => {
    try {
        const url = `http://localhost:5050/forum/new`;

        const res = await fetch(url, {
            method: "POST",
            body: JSON.stringify({
                ...data,
                categoryId: data.parentId
            }),
            headers: {
                "Content-Type": "application/json"
            }
        });

        const result = await res.json();
        return result;
    }
    catch (err) {
        console.error(`Cannot fetch: ${err}`);
    }
}