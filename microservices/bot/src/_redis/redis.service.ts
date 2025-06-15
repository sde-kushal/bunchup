import { Injectable, OnModuleInit } from "@nestjs/common";
import { REDIS_URL } from "constants/env";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit {
    private redis: Map<number, Redis> = new Map();

    async onModuleInit() {
        for (let i = 0; i < 16; i += 1) {
            const client = new Redis(REDIS_URL, { db: i });
            this.redis.set(i, client);
        }
    }

    async getValue({ key, db }: { key: string, db: number }): Promise<string | null> {
        if (db < 0 || db > 15)
            return null;
        return this.redis.get(db)!.get(key);
    }

    async setValue({ key, value, db, expiry }: { key: string, value: string, db: number, expiry?: number }): Promise<boolean> {
        if (db < 0 || db > 15) return false;

        try {
            if (expiry !== undefined && expiry > 0)
                await this.redis.get(db)!.setex(key, expiry, value);
            else
                await this.redis.get(db)!.set(key, value);
            return true;
        }
        catch (err) { }
        return false;
    }

    async setValues({ fields, db, expiry }: { fields: { key: string, value: string }[], db: number, expiry?: number }): Promise<boolean> {
        if (db < 0 || db > 15) return false;

        try {
            if (expiry !== undefined && expiry > 0) {
                const pipeline = this.redis.get(db)!.pipeline();
                for (let i = 0; i < fields.length; i += 1)
                    pipeline.set(fields[i].key, fields[i].value, 'EX', expiry);
                await pipeline.exec();
            }
            else {
                const data = fields.flatMap(({ key, value }) => [key, value]);
                await this.redis.get(db)!.mset(...data);
            }
            return true;
        }
        catch (err) { }
        return false;
    }

    async deleteValue({ db, key }: { key: string, db: number }): Promise<boolean> {
        if (db < 0 || db > 15)
            return false;
        const res = await this.redis.get(db)!.del(key);
        return res === 1 ? true : false;
    }

    async updateExpiry({ db, key, expiry }: { key: string, db: number, expiry: number }): Promise<boolean> {
        if (db < 0 || db > 15)
            return false;
        const exists = await this.redis.get(db)!.exists(key);
        if (exists === 0) return false;

        const res = expiry === -1
            ? await this.redis.get(db)!.persist(key)
            : await this.redis.get(db)!.expire(key, expiry);

        return res === 1 ? true : false;
    }
}