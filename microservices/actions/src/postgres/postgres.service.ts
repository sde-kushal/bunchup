import { Injectable } from "@nestjs/common";
import { PostgresCreateSchema, PostgresUpdateSchema } from "./tables";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PostgresService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    // CREATE ===================
    async createPostgresData({ table, fields }: PostgresCreateSchema): Promise<boolean> {
        try {
            await this.prisma[table].createMany({
                // @ts-ignore
                data: fields,
                skipDuplicates: true
            });

            return true;
        }
        catch (err) {
            console.error(`ERR creating data in '${table}' table: ${err}`);
        }

        return false;
    }

    // UPDATE ===================
    async updatePostgresData({ fields, table, whereClause }: PostgresUpdateSchema) {
        try {
            await this.prisma[table].update({
                data: fields,
                where: whereClause
            });

            return true;
        }
        catch (err) {
            console.error(`ERR updating data in '${table}' table: ${err}`);
        }

        return false;
    }

    // DELETE ===================
    async deletePostgresData() {
    }

}