import { Module } from "@nestjs/common"
import { BusinessService } from "./request.business.service";
import { RedisModule } from "src/_redis/redis.module";

@Module({
    imports: [
        RedisModule,
    ],
    providers: [BusinessService],
    exports: [BusinessService]
})
export class BusinessModule { }
