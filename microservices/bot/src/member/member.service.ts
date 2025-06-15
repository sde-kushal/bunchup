import { Injectable } from "@nestjs/common";
import { fetchRoleRemove } from "api/adminOnly";
import { SUBMITTED_KEY } from "constants/misc";
import { REDIS_DB_INDEX } from "constants/redis";
import { GuildMember, PartialGuildMember } from "discord.js";
import { RedisService } from "src/_redis/redis.service";


@Injectable()
export class MemberService {
    constructor(private redisService: RedisService) { }

    async memberExits(member: GuildMember | PartialGuildMember) {
        const userId = member.user.id;

        // ### CHECK IF VERIFIED BUSINESS OWNER ###
        const cache = await this.redisService.getValue({
            db: REDIS_DB_INDEX.BUSINESS_OWNERS,
            key: userId
        });

        if (cache) {
            if (cache === SUBMITTED_KEY) {
                // remove this key as well
                await this.redisService.deleteValue({
                    db: REDIS_DB_INDEX.BUSINESS_OWNERS,
                    key: userId
                });

                return;
            }

            // postgres and redis both needs to be deleted
            fetchRoleRemove({
                roleType: "business",
                userId
            });
    
            // UPDATE ADMIN ABOUT IT ---------
            
        }
    
    
    
    }
}