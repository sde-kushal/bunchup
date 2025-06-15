export const redisKeys = {
    offerApplication: {
        draft: (userId: string) => `draft-${userId}`,
        tierDraft: (userId: string) => `draft-tiers-${userId}`,
        applied: (userId: string) => `application-${userId}`,
        adminDraft: (userId: string) => `draft-admin-${userId}`
    },

    activityGroup: {
        groups: `activity-groups`
    }
}