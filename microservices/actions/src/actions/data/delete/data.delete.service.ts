import { Injectable } from "@nestjs/common";
import { REDIS_DB_INDEX } from "constants/redis";
import { RoleType } from "constants/roles";
import { PostgresService } from "src/postgres/postgres.service";
import { RedisService } from "src/redis/redis.service";

@Injectable()
export class DataDeleteService {
    constructor(
        private postgresService: PostgresService,
        private redisService: RedisService
    ) { }

    async deleteRoleCleanUp({ type, userId }: { userId: string, type: RoleType }): Promise<boolean> {
        if (type === "business") {
            await Promise.allSettled([
                // REDIS -------------
                this.redisService.deleteValue({
                    db: REDIS_DB_INDEX.BUSINESS_OWNERS,
                    key: userId
                }),

                // POSTGRES ---------------
                this.postgresService.updatePostgresData({
                    table: "verifiedBusiness",
                    whereClause: { userId },
                    fields: { userId: null }
                }),

                // UPDATE COUNT --------------
                (async () => {
                    const currCount = await this.redisService.getValue({
                        db: REDIS_DB_INDEX.DATA_SIZE,
                        key: "business"
                    });

                    await this.redisService.setValue({
                        db: REDIS_DB_INDEX.DATA_SIZE,
                        key: "business",
                        value: currCount === null ? `0` : `${Math.max(0, parseInt(currCount) - 1)}`
                    });
                })(),

            ]);

            return true;
        }

        return false;
    }
}