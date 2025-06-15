import { Module } from "@nestjs/common";
import { DataDeleteController } from "./data.delete.controller";
import { DataDeleteService } from "./data.delete.service";
import { PostgresModule } from "src/postgres/postgres.module";
import { RedisModule } from "src/redis/redis.module";

@Module({
    imports: [
            PostgresModule,
            RedisModule
        ],
    controllers: [DataDeleteController],
    providers: [DataDeleteService],
    exports: [DataDeleteService]
})
export class DataDeleteModule { }