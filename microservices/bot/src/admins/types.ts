export type AdminActionTypes =
    | "offer"
    | "forumCategory"
    | "activeBusinesses"

export type AdminActionStages = {
    offer: "plugin" | "start"
}