import { Module } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { RedisModule } from "src/_redis/redis.module";
import { OfferModule } from "src/requests/offer/request.offer.module";

@Module({
    imports: [
        RedisModule,
        OfferModule
    ],
    providers: [AdminService],
    exports: [AdminService]
})
export class AdminModule { }
