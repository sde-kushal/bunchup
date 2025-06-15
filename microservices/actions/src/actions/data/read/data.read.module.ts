import { Module } from "@nestjs/common";
import { DataReadService } from "./data.read.service";
import { RedisModule } from "src/redis/redis.module";
import { DataReadController } from "./data.read.controller";

@Module({
    imports: [
        RedisModule
    ],
    providers: [DataReadService],
    exports: [DataReadService],
    controllers: [DataReadController],
})
export class DataReadModule { }