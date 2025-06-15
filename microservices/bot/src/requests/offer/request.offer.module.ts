import { Module } from "@nestjs/common"
import { OfferService } from "./request.offer.service";
import { RedisModule } from "src/_redis/redis.module";
import { KafkaModule } from "src/_kafka/kafka.module";

@Module({
    imports: [
        RedisModule,
        KafkaModule
    ],
    providers: [OfferService],
    exports: [OfferService]
})
export class OfferModule { }
