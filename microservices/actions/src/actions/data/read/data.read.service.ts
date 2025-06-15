import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { RedisService } from "src/redis/redis.service";

@Injectable()
export class DataReadService {
    private prisma: PrismaClient;

    constructor(private redisService: RedisService) {
        this.prisma = new PrismaClient();
    }


    async readBusinessData({ index, limit }: { index: number, limit: number }) {
        try {
            const data = await this.prisma.verifiedBusiness.findMany({
                orderBy: { createdAt: "desc" },
                skip: index * limit,
                take: limit,
                select: {
                    userId: true,
                    createdAt: true,
                    contactNumber: true,
                    contactEmail: true,
                    contactName: true,
                    companyName: true
                }
            });

            return data;
        }
        catch (err) {
            console.error(`Failed to read postgres for verified business: ${err}`);
        }

        return [];
    }
}