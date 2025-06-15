import { Prisma, VerifiedBusiness } from "@prisma/client"

export type PostgresCreateSchema =
    | {
        table: "verifiedBusiness",
        fields: Partial<VerifiedBusiness>[]
    }


export type PostgresUpdateSchema =
    | {
        table: "verifiedBusiness",
        whereClause: Prisma.VerifiedBusinessWhereUniqueInput,
        fields: Partial<VerifiedBusiness>
    }

